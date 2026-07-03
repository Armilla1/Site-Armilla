// =============================================================================
// ARMILLA SEGURA — Controller de Pulseiras (PulseSafe)
// Arquivo: PulseirasController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/PulseirasController.cs
// =============================================================================
// CONECTA COM:
//   - app.Pulseiras (já existente em armilla_database.sql)
//   - app.DispositivosConectados (armilla_adicional.sql)
//   - app.Localizacoes (já existente — para receber GPS do dispositivo)
//   - Frontend: Dashboard.jsx → ModalConectarPulseira
//
// LÓGICA DE CONECTIVIDADE EXPLICADA (pedido do usuário: "lógica entendível"):
//
//   CAMADA 1 — Hardware físico (ESP32-C3 + SIM800L + GPS, conforme o manual
//   técnico): a pulseira em si não fala com este backend diretamente todo o
//   tempo. Ela manda dados por:
//     (a) Bluetooth Low Energy (BLE) quando está perto do celular do
//         responsável — usado no PAREAMENTO inicial (vincular o código da
//         pulseira à criança) e para sincronização rápida de bateria/status.
//     (b) Rede celular (SIM800L = chip GSM/2G) quando está longe do celular
//         — usada para enviar coordenadas GPS periodicamente direto para a
//         API, sem depender de Bluetooth.
//
//   CAMADA 2 — Este backend (ASP.NET Core): expõe DOIS tipos de rota:
//     (a) Rotas autenticadas com JWT (este controller) — usadas pelo APP do
//         responsável para conectar/gerenciar a pulseira.
//     (b) Uma rota especial de "ingestão" (IngestaoController, ver abaixo)
//         que a PRÓPRIA pulseira chama via HTTP simples (sem JWT de usuário,
//         autenticada por um token de dispositivo fixo), para mandar GPS e
//         bateria perto na rede celular.
//
//   CAMADA 3 — Frontend (Dashboard.jsx): consome os dados já processados via
//   GET /api/dashboard, e dispara POST /api/pulseiras/conectar quando o
//   responsável aperta "Conectar" no modal (usando a Web Bluetooth API do
//   navegador, que já está implementada no componente ModalConectarPulseira).
//
//   RESUMO DO FLUXO PASSO A PASSO:
//     1. Responsável compra a pulseira física → ela já vem com um
//        CodigoDispositivo único impresso (ex: PS-2024-A1B2).
//     2. No Dashboard, o responsável clica "Conectar pulseira" → app tenta
//        Bluetooth (navigator.bluetooth) OU permite digitar o código manual.
//     3. POST /api/pulseiras/conectar associa esse código a uma Criança
//        específica do Responsável autenticado (grava em app.Pulseiras).
//     4. A partir daí, a pulseira (via rede celular) chama periodicamente
//        POST /api/ingestao/localizacao enviando lat/lng/bateria — SEM
//        precisar do app aberto, porque ela tem conexão celular própria.
//     5. O Dashboard consulta /api/dashboard a cada carregamento e mostra
//        a última localização e bateria conhecidas no mapa Leaflet.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/pulseiras")]
[Authorize]
[EnableRateLimiting("Geral")]
public class PulseirasController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<PulseirasController> _logger;

    public PulseirasController(IConfiguration config, ILogger<PulseirasController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // POST /api/pulseiras/conectar
    // Vincula uma pulseira (por código de dispositivo) a uma criança
    // =========================================================================
    [HttpPost("conectar")]
    public async Task<IActionResult> Conectar([FromBody] ConectarPulseiraDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // PASSO 1: confirma que a criança pertence ao responsável (anti-IDOR)
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandText = @"
            SELECT 1 FROM app.Criancas WHERE Id = @CriancaId AND ResponsavelId = @ResponsavelId AND Ativo = 1";
        cmdValida.Parameters.AddWithValue("@CriancaId", dto.CriancaId);
        cmdValida.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        var criancaExiste = await cmdValida.ExecuteScalarAsync();

        if (criancaExiste == null)
            return NotFound(new { Erro = "Criança não encontrada." });

        // PASSO 2: verifica se o código de dispositivo já está em uso por outra criança
        await using var cmdCodigo = conn.CreateCommand();
        cmdCodigo.CommandText = @"
            SELECT Id, CriancaId FROM app.Pulseiras WHERE CodigoDispositivo = @Codigo AND Ativa = 1";
        cmdCodigo.Parameters.AddWithValue("@Codigo", dto.CodigoDispositivo);

        Guid? pulseiraExistenteId = null;
        Guid? criancaVinculadaId = null;
        await using (var reader = await cmdCodigo.ExecuteReaderAsync())
        {
            if (await reader.ReadAsync())
            {
                pulseiraExistenteId = reader.GetGuid(0);
                criancaVinculadaId = reader.GetGuid(1);
            }
        }

        if (pulseiraExistenteId != null && criancaVinculadaId != dto.CriancaId)
        {
            return Conflict(new { Erro = "Este código de pulseira já está vinculado a outra criança." });
        }

        Guid pulseiraId;
        string? tokenBruto = null; // só é preenchido quando a pulseira é NOVA

        if (pulseiraExistenteId != null)
        {
            // Pulseira já vinculada a esta mesma criança — apenas atualiza o nome do dispositivo
            // O TokenDispositivo já existe desde a primeira vez que essa pulseira foi
            // cadastrada (ver bloco "else" abaixo) — não precisa gerar de novo.
            pulseiraId = pulseiraExistenteId.Value;
            await using var cmdAtualiza = conn.CreateCommand();
            cmdAtualiza.CommandText = @"
                UPDATE app.Pulseiras SET StatusConexao = 'OFFLINE' WHERE Id = @Id";
            cmdAtualiza.Parameters.AddWithValue("@Id", pulseiraId);
            await cmdAtualiza.ExecuteNonQueryAsync();
        }
        else
        {
            // CORREÇÃO DE REVISÃO: a coluna app.Pulseiras.TokenDispositivo é
            // NOT NULL (ver armilla_database.sql, comentário original: "a
            // pulseira se identifica com este token ao enviar dados de GPS").
            // O INSERT anterior não preenchia essa coluna — o banco rejeitava
            // TODA tentativa de cadastrar uma pulseira nova com erro de
            // violação de NOT NULL, antes mesmo de chegar no passo 3.
            //
            // Corrigido implementando o que o schema original já previa: cada
            // pulseira recebe seu PRÓPRIO token aleatório (32 bytes, gerado
            // com RandomNumberGenerator — o mesmo gerador criptográfico já
            // usado em EmailService para códigos de confirmação). Só o HASH
            // (SHA-256) é gravado no banco — igual ao padrão já usado para
            // tokens de confirmação de e-mail e recuperação de senha. O valor
            // BRUTO só existe nesta resposta, uma única vez: é isso que vai
            // gravado no firmware do ESP32-C3 como X-Device-Token.
            //
            // Isso é mais seguro que um token fixo único pra todas as
            // pulseiras: se uma pulseira física for roubada/clonada, só o
            // token DELA é comprometido — as demais continuam seguras.
            var tokenBytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
            tokenBruto = Convert.ToBase64String(tokenBytes);
            var tokenHash = Services.EmailService.HashToken(tokenBruto);

            await using var cmdInsere = conn.CreateCommand();
            cmdInsere.CommandText = @"
                INSERT INTO app.Pulseiras (CriancaId, CodigoDispositivo, TokenDispositivo, ModeloPulseira, StatusConexao)
                OUTPUT INSERTED.Id
                VALUES (@CriancaId, @Codigo, @TokenHash, 'PulseSafe v1', 'OFFLINE')";
            cmdInsere.Parameters.AddWithValue("@CriancaId", dto.CriancaId);
            cmdInsere.Parameters.AddWithValue("@Codigo", dto.CodigoDispositivo);
            cmdInsere.Parameters.AddWithValue("@TokenHash", tokenHash);
            pulseiraId = (Guid)(await cmdInsere.ExecuteScalarAsync())!;
        }

        // PASSO 3: registra o dispositivo celular do responsável usado para o pareamento
        await using var cmdDispositivo = conn.CreateCommand();
        cmdDispositivo.CommandText = @"
            INSERT INTO app.DispositivosConectados
                (PulseiraId, ResponsavelId, NomeDispositivo, TipoConexao, UltimaConexaoEm)
            VALUES
                (@PulseiraId, @ResponsavelId, @NomeDispositivo, 'BLUETOOTH', SYSUTCDATETIME())";
        cmdDispositivo.Parameters.AddWithValue("@PulseiraId", pulseiraId);
        cmdDispositivo.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmdDispositivo.Parameters.AddWithValue("@NomeDispositivo", (object?)dto.NomeDispositivo ?? DBNull.Value);
        await cmdDispositivo.ExecuteNonQueryAsync();

        _logger.LogInformation("Pulseira {PulseiraId} conectada à criança {CriancaId}", pulseiraId, dto.CriancaId);

        return Ok(new
        {
            id = pulseiraId,
            criancaId = dto.CriancaId,
            codigoDispositivo = dto.CodigoDispositivo,
            statusConexao = "OFFLINE",
            // tokenDispositivo só vem preenchido quando a pulseira é cadastrada
            // PELA PRIMEIRA VEZ. Ele não pode ser recuperado depois — só o hash
            // fica salvo no banco. Se for null aqui, é porque essa pulseira já
            // tinha sido pareada antes e o token já está configurado no hardware.
            tokenDispositivo = tokenBruto,
            mensagem = tokenBruto != null
                ? "Pulseira vinculada com sucesso. Copie o token abaixo e grave no firmware do ESP32 — ele não será mostrado de novo."
                : "Pulseira vinculada com sucesso. Ela aparecerá como Online assim que enviar o primeiro sinal.",
        });
    }


    // =========================================================================
    // DELETE /api/pulseiras/{id}
    // Desconecta (desativa) uma pulseira
    // =========================================================================
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Desconectar(Guid id)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE app.Pulseiras SET Ativa = 0
            WHERE Id = @Id AND CriancaId IN (
                SELECT Id FROM app.Criancas WHERE ResponsavelId = @ResponsavelId
            )";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Pulseira não encontrada." });

        return Ok(new { Mensagem = "Pulseira desconectada." });
    }

    // =========================================================================
    // GET /api/pulseiras/{id}/status
    // Consulta rápida de status (usada para polling de bateria/conexão)
    // =========================================================================
    [HttpGet("{id:guid}/status")]
    public async Task<IActionResult> Status(Guid id)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT p.StatusConexao, p.NivelBateria, p.UltimaComunicacao
            FROM app.Pulseiras p
            INNER JOIN app.Criancas c ON c.Id = p.CriancaId
            WHERE p.Id = @Id AND c.ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound(new { Erro = "Pulseira não encontrada." });

        return Ok(new
        {
            statusConexao = reader.IsDBNull(0) ? null : reader.GetString(0),
            nivelBateria = reader.IsDBNull(1) ? (int?)null : reader.GetInt32(1),
            ultimaComunicacao = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2),
        });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record ConectarPulseiraDto
{
    [Required]
    public required Guid CriancaId { get; init; }

    [Required, MaxLength(100)]
    public required string CodigoDispositivo { get; init; }

    [MaxLength(200)]
    public string? NomeDispositivo { get; init; }
}
