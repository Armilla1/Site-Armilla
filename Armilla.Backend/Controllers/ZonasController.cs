// =============================================================================
// ARMILLA SEGURA — Controller de Zonas Seguras
// Arquivo: ZonasController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/ZonasController.cs
// =============================================================================
// CONECTA COM:
//   - app.ZonasSeguras (armilla_adicional.sql)
//   - Frontend: Dashboard.jsx → PainelZonas
//   - IngestaoController.cs → usa estas zonas para calcular alertas de saída
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/zonas")]
[Authorize]
[EnableRateLimiting("Geral")]
public class ZonasController : ControllerBase
{
    private readonly IConfiguration _config;

    public ZonasController(IConfiguration config)
    {
        _config = config;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/zonas?criancaId={id}
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] Guid criancaId)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT z.Id, z.Nome, z.Tipo, z.Latitude, z.Longitude, z.RaioMetros, z.Cor
            FROM app.ZonasSeguras z
            INNER JOIN app.Criancas c ON c.Id = z.CriancaId
            WHERE z.CriancaId = @CriancaId AND c.ResponsavelId = @ResponsavelId AND z.Ativa = 1
            ORDER BY z.CriadoEm ASC";
        cmd.Parameters.AddWithValue("@CriancaId", criancaId);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var lista = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lista.Add(new
            {
                id = reader.GetGuid(0),
                nome = reader.GetString(1),
                tipo = reader.GetString(2),
                latitude = reader.IsDBNull(3) ? (double?)null : reader.GetDouble(3),
                longitude = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                raioMetros = reader.IsDBNull(5) ? (int?)null : reader.GetInt32(5),
                cor = reader.GetString(6),
            });
        }

        return Ok(lista);
    }

    // =========================================================================
    // POST /api/zonas
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarZonaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Confirma posse da criança (anti-IDOR)
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandText = "SELECT 1 FROM app.Criancas WHERE Id=@Id AND ResponsavelId=@RespId AND Ativo=1";
        cmdValida.Parameters.AddWithValue("@Id", dto.CriancaId);
        cmdValida.Parameters.AddWithValue("@RespId", responsavelId);
        if (await cmdValida.ExecuteScalarAsync() == null)
            return NotFound(new { Erro = "Criança não encontrada." });

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO app.ZonasSeguras
                (CriancaId, ResponsavelId, Nome, Tipo, Latitude, Longitude, RaioMetros, Cor)
            OUTPUT INSERTED.Id
            VALUES
                (@CriancaId, @ResponsavelId, @Nome, 'CIRCULO', @Lat, @Lng, @Raio, @Cor)";
        cmd.Parameters.AddWithValue("@CriancaId", dto.CriancaId);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@Nome", dto.Nome);
        cmd.Parameters.AddWithValue("@Lat", dto.Latitude);
        cmd.Parameters.AddWithValue("@Lng", dto.Longitude);
        cmd.Parameters.AddWithValue("@Raio", dto.RaioMetros);
        cmd.Parameters.AddWithValue("@Cor", dto.Cor ?? "#a855f7");

        var novoId = (Guid)(await cmd.ExecuteScalarAsync())!;

        return StatusCode(201, new
        {
            id = novoId,
            nome = dto.Nome,
            tipo = "CIRCULO",
            latitude = dto.Latitude,
            longitude = dto.Longitude,
            raioMetros = dto.RaioMetros,
            cor = dto.Cor ?? "#a855f7",
        });
    }

    // =========================================================================
    // DELETE /api/zonas/{id}
    // =========================================================================
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE app.ZonasSeguras SET Ativa = 0
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Zona não encontrada." });

        return Ok(new { Mensagem = "Zona removida com sucesso." });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record CriarZonaDto
{
    [Required]
    public required Guid CriancaId { get; init; }

    [Required, MaxLength(100)]
    public required string Nome { get; init; }

    [Required, Range(-90, 90)]
    public required double Latitude { get; init; }

    [Required, Range(-180, 180)]
    public required double Longitude { get; init; }

    [Required, Range(20, 5000)]
    public required int RaioMetros { get; init; }

    // CORREÇÃO DE REVISÃO: faltava validar o FORMATO da cor, só o tamanho
    // máximo estava limitado (MaxLength(7)). Sem essa regex, um valor como
    // "abcdefg" passava a validação e era salvo no banco, quebrando o estilo
    // inline do mapa no frontend (style={{ backgroundColor: z.cor }}) sem dar
    // nenhum erro visível — falha silenciosa. Não é uma falha de segurança
    // (o valor é sempre parametrizado, sem risco de injeção SQL), mas é uma
    // falha de robustez que vale corrigir aqui.
    [MaxLength(7)]
    [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Cor deve estar no formato hexadecimal, ex: #a855f7")]
    public string? Cor { get; init; }
}
