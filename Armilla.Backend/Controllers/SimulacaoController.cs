// =============================================================================
// ARMILLA SEGURA — Controller de Simulação
// Arquivo: SimulacaoController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/SimulacaoController.cs
// =============================================================================
// PROPÓSITO:
//   Permite ao responsável testar o sistema completo de ponta a ponta sem
//   precisar de uma pulseira física de verdade. Não é uma simulação "de
//   mentirinha" só no frontend — cada chamada aqui passa pelo MESMO
//   processamento real que a pulseira física dispara (Services/
//   LocalizacaoProcessor.cs): grava em app.Localizacoes, atualiza bateria/
//   status da pulseira, verifica zonas seguras e cria alertas de verdade
//   em app.Alertas se a criança "saísse" de uma zona ou a bateria simulada
//   ficasse baixa.
//
// DIFERENÇA EM RELAÇÃO AO IngestaoController:
//   IngestaoController é chamado pela PULSEIRA FÍSICA, sem login de
//   usuário, autenticado por um token gravado no hardware (ver comentário
//   completo lá). Este controller é chamado pelo NAVEGADOR do responsável
//   já logado (JWT normal, [Authorize]) — por isso a validação aqui é
//   "essa criança pertence a você e tem uma pulseira vinculada?" em vez de
//   "esse token de dispositivo é válido?".
//
// REQUISITO: a criança precisa já ter uma pulseira conectada (mesmo que
//   nunca tenha recebido um sinal real ainda) — afinal toda localização
//   fica amarrada a uma PulseiraId no banco, é assim que a tabela
//   app.Localizacoes funciona desde o desenho original.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/simulacao")]
[Authorize]
[EnableRateLimiting("Geral")]
public class SimulacaoController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<SimulacaoController> _logger;

    public SimulacaoController(IConfiguration config, ILogger<SimulacaoController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // POST /api/simulacao/ping
    // O frontend chama isso repetidamente (ex: a cada 1.5s) enquanto a
    // simulação está "andando", interpolando pontos entre origem e destino.
    // =========================================================================
    [HttpPost("ping")]
    public async Task<IActionResult> Ping([FromBody] SimulacaoPingDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Anti-IDOR: a criança precisa pertencer ao responsável autenticado,
        // E precisa ter uma pulseira ativa vinculada (não dá pra simular
        // localização de uma criança sem pulseira — não existiria onde
        // gravar o PulseiraId em app.Localizacoes).
        await using var cmdBusca = conn.CreateCommand();
        cmdBusca.CommandText = @"
            SELECT p.Id
            FROM app.Criancas c
            INNER JOIN app.Pulseiras p ON p.CriancaId = c.Id AND p.Ativa = 1
            WHERE c.Id = @CriancaId AND c.ResponsavelId = @ResponsavelId AND c.Ativo = 1";
        cmdBusca.Parameters.AddWithValue("@CriancaId", dto.CriancaId);
        cmdBusca.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        var pulseiraIdObj = await cmdBusca.ExecuteScalarAsync();

        if (pulseiraIdObj == null)
        {
            return BadRequest(new
            {
                Erro = "Essa criança não tem uma pulseira conectada. Conecte uma pulseira (pode ser com um código de teste) antes de simular."
            });
        }

        var pulseiraId = (Guid)pulseiraIdObj;

        await Services.LocalizacaoProcessor.ProcessarAsync(
            conn, pulseiraId, dto.CriancaId,
            dto.Latitude, dto.Longitude, dto.NivelBateria, precisaoMetros: 5,
            _logger);

        _logger.LogInformation("Simulação: ping registrado para criança {CriancaId}", dto.CriancaId);

        return Ok(new
        {
            mensagem = "Ponto simulado registrado.",
            latitude = dto.Latitude,
            longitude = dto.Longitude,
            nivelBateria = dto.NivelBateria,
        });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record SimulacaoPingDto
{
    [Required]
    public required Guid CriancaId { get; init; }

    [Required, Range(-90, 90)]
    public required double Latitude { get; init; }

    [Required, Range(-180, 180)]
    public required double Longitude { get; init; }

    [Required, Range(0, 100)]
    public required int NivelBateria { get; init; }
}
