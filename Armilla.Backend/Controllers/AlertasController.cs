// =============================================================================
// ARMILLA SEGURA — Controller de Alertas
// Arquivo: AlertasController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/AlertasController.cs
// =============================================================================
// CONECTA COM:
//   - app.Alertas (armilla_adicional.sql)
//   - Frontend: Dashboard.jsx → aba "Alertas" → marcarLido()
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/alertas")]
[Authorize]
[EnableRateLimiting("Geral")]
public class AlertasController : ControllerBase
{
    private readonly IConfiguration _config;

    public AlertasController(IConfiguration config)
    {
        _config = config;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/alertas?apenasNaoLidos=true
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] bool apenasNaoLidos = true)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT a.Id, a.TipoAlerta, a.Descricao, a.Severidade, a.Latitude, a.Longitude,
                   a.Lido, a.CriadoEm, c.NomeCompleto
            FROM app.Alertas a
            INNER JOIN app.Criancas c ON c.Id = a.CriancaId
            WHERE c.ResponsavelId = @ResponsavelId
              AND (@ApenasNaoLidos = 0 OR a.Lido = 0)
            ORDER BY a.CriadoEm DESC";
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@ApenasNaoLidos", apenasNaoLidos);

        var lista = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lista.Add(new
            {
                id = reader.GetInt64(0),
                tipoAlerta = reader.GetString(1),
                descricao = reader.GetString(2),
                severidade = reader.GetString(3),
                latitude = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                longitude = reader.IsDBNull(5) ? (double?)null : reader.GetDouble(5),
                lido = reader.GetBoolean(6),
                criadoEm = reader.GetDateTime(7),
                nomeCrianca = reader.GetString(8),
            });
        }

        return Ok(lista);
    }

    // =========================================================================
    // POST /api/alertas/{id}/lido
    // =========================================================================
    [HttpPost("{id:long}/lido")]
    public async Task<IActionResult> MarcarLido(long id)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE a SET a.Lido = 1, a.LidoEm = SYSUTCDATETIME(), a.LidoPorId = @ResponsavelId
            FROM app.Alertas a
            INNER JOIN app.Criancas c ON c.Id = a.CriancaId
            WHERE a.Id = @Id AND c.ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Alerta não encontrado." });

        return Ok(new { Mensagem = "Alerta marcado como lido." });
    }
}
