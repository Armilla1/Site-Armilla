// =============================================================================
// ARMILLA SEGURA — Controller de Ingestão de Dados do Hardware
// Arquivo: IngestaoController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/IngestaoController.cs
// =============================================================================
// PROPÓSITO (resposta ao pedido "faça a conectividade funcionar... de forma
// entendível"):
//
// Este controller é DIFERENTE dos outros. Ele não é chamado pelo navegador
// do responsável — é chamado DIRETAMENTE pela pulseira física (o ESP32-C3 +
// SIM800L descritos no manual técnico), através da rede celular 2G/3G.
//
// Por isso ele NÃO usa [Authorize] com JWT de usuário (a pulseira não faz
// login como um humano). Em vez disso, usa um TOKEN POR DISPOSITIVO,
// gravado no firmware do ESP32 no momento do pareamento e validado aqui
// via header HTTP.
//
// CORREÇÃO DE REVISÃO (importante — muda o contrato com o firmware):
//   A versão anterior validava um único token FIXO, igual para todas as
//   pulseiras, configurado em appsettings (Hardware:TokenDispositivo).
//   Isso tinha um problema de segurança (uma pulseira clonada/vazada
//   comprometia TODAS as outras) e também não combinava com o que o
//   próprio banco já previa: app.Pulseiras.TokenDispositivo é uma coluna
//   NOT NULL pensada para um token ÚNICO POR PULSEIRA — coluna que o
//   PulseirasController.Conectar() não preenchia, e por isso TODA tentativa
//   de cadastrar uma pulseira nova quebrava com erro de banco antes mesmo
//   de chegar aqui.
//
//   Agora: cada pulseira recebe seu próprio token aleatório no momento do
//   pareamento (ver PulseirasController.cs), e a validação abaixo busca o
//   hash daquela pulseira específica pelo CodigoDispositivo recebido,
//   comparando em tempo constante — não existe mais um token "mestre"
//   compartilhado por appsettings.
//
// FLUXO HARDWARE → BACKEND → BANCO → FRONTEND:
//   1. O ESP32-C3 lê o módulo GPS (latitude/longitude) e a tensão da bateria.
//   2. O SIM800L abre uma conexão de dados celular (GPRS/2G).
//   3. O ESP32 monta um HTTP POST para este endpoint, com:
//        Header:  X-Device-Token: <token gerado no pareamento, gravado no firmware>
//        Body:    { "codigoDispositivo": "PS-2024-A1B2", "latitude": ..., "longitude": ..., "nivelBateria": 78 }
//   4. Este controller busca a pulseira pelo código, confirma o token DELA,
//      grava em app.Localizacoes e atualiza app.Pulseiras.NivelBateria.
//   5. Se a localização estiver fora de uma ZonaSegura ativa, ou a bateria
//      estiver muito baixa, dispara um Alerta (app.Alertas) — essa parte
//      vive em Services/LocalizacaoProcessor.cs, compartilhada com a
//      simulação (SimulacaoController.cs), pra não manter duas cópias do
//      mesmo cálculo de distância.
//   6. O app do responsável (Dashboard.jsx) lê esses dados via GET /api/dashboard
//      na próxima vez que abrir ou atualizar a página — o mapa Leaflet então
//      mostra a posição real mais recente.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/ingestao")]
[AllowAnonymous] // autenticado por token de dispositivo, não por JWT de usuário
[EnableRateLimiting("Gps")]
// O SecurityConfig.cs define uma política "Gps" (Token Bucket, 30 créditos,
// regenera 2/s) feita especificamente para pulseiras enviando localização
// periodicamente — diferente da "Geral" (100 req/min por IP, pensada para
// humanos navegando no app). Se duas ou mais pulseiras saírem pela mesma
// operadora de celular (NAT comum em redes 2G/3G), elas compartilham IP
// público; "Geral" as bloquearia mutuamente a cada poucos minutos de uso real.
public class IngestaoController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<IngestaoController> _logger;

    public IngestaoController(IConfiguration config, ILogger<IngestaoController> logger)
    {
        _config = config;
        _logger = logger;
    }

    // Comparação em tempo constante — evita timing attack na validação do token
    private static bool TokenBate(string recebido, string hashEsperado)
    {
        if (string.IsNullOrEmpty(recebido)) return false;
        var hashRecebido = Services.EmailService.HashToken(recebido);
        var bytesA = System.Text.Encoding.UTF8.GetBytes(hashRecebido);
        var bytesB = System.Text.Encoding.UTF8.GetBytes(hashEsperado);
        if (bytesA.Length != bytesB.Length) return false;
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }

    // =========================================================================
    // POST /api/ingestao/localizacao
    // Chamado pelo firmware do ESP32-C3 via rede celular (SIM800L)
    // =========================================================================
    [HttpPost("localizacao")]
    public async Task<IActionResult> ReceberLocalizacao([FromBody] IngestaoLocalizacaoDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // PASSO 1: localiza a pulseira pelo código de dispositivo E confirma
        // que o token recebido bate com o hash gravado para ESTA pulseira
        // específica (não existe mais token global — ver comentário no topo).
        Guid? pulseiraId = null;
        Guid? criancaId = null;
        string? tokenHashEsperado = null;
        await using (var cmdBusca = conn.CreateCommand())
        {
            cmdBusca.CommandText = @"
                SELECT Id, CriancaId, TokenDispositivo FROM app.Pulseiras
                WHERE CodigoDispositivo = @Codigo AND Ativa = 1";
            cmdBusca.Parameters.AddWithValue("@Codigo", dto.CodigoDispositivo);
            await using var reader = await cmdBusca.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                pulseiraId = reader.GetGuid(0);
                criancaId = reader.GetGuid(1);
                tokenHashEsperado = reader.GetString(2);
            }
        }

        // CORREÇÃO DE REVISÃO (segurança): se o dispositivo não existe OU o
        // token não bate, devolvemos a MESMA resposta genérica (401) nos dois
        // casos. Antes, código desconhecido devolvia 404 "Dispositivo não
        // cadastrado" enquanto token errado devolvia 401 — essa diferença
        // permitiria a um atacante descobrir, por tentativa e erro, quais
        // CodigoDispositivo existem de verdade no banco (enumeration attack).
        var tokenRecebido = Request.Headers["X-Device-Token"].ToString();
        if (pulseiraId == null || tokenHashEsperado == null || !TokenBate(tokenRecebido, tokenHashEsperado))
        {
            _logger.LogWarning("Ingestão recusada para código de dispositivo {Codigo}", dto.CodigoDispositivo);
            return Unauthorized(new { Erro = "Token de dispositivo inválido." });
        }

        // PASSO 2 em diante: gravar localização, atualizar status, checar
        // zonas seguras e disparar alertas — lógica compartilhada com a
        // simulação, ver Services/LocalizacaoProcessor.cs
        await Services.LocalizacaoProcessor.ProcessarAsync(
            conn, pulseiraId.Value, criancaId!.Value,
            dto.Latitude, dto.Longitude, dto.NivelBateria, dto.PrecisaoMetros,
            _logger);

        return Ok(new { Mensagem = "Localização recebida." });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record IngestaoLocalizacaoDto
{
    [Required, MaxLength(100)]
    public required string CodigoDispositivo { get; init; }

    [Required, Range(-90, 90)]
    public required double Latitude { get; init; }

    [Required, Range(-180, 180)]
    public required double Longitude { get; init; }

    [Required, Range(0, 100)]
    public required int NivelBateria { get; init; }

    public double? PrecisaoMetros { get; init; }
}
