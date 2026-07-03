// =============================================================================
// ARMILLA SEGURA — Controller de Rotas (Seguras e Bloqueadas)
// Arquivo: RotasController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/RotasController.cs
// =============================================================================
// CONECTA COM:
//   - app.RotasSeguras (armilla_adicional.sql) + coluna Tipo (armilla_incremental_2.sql)
//   - Frontend: Dashboard.jsx → mapa (desenha as rotas como polylines)
//
// "ROTAS SEGURAS", "BLOQUEADAS" E "SALVAS" — COMO ISSO FOI MODELADO:
//   Em vez de criar 3 tabelas diferentes, existe UMA tabela (RotasSeguras)
//   com uma coluna Tipo. "Rota salva" é simplesmente qualquer linha dessa
//   tabela — toda rota cadastrada já está salva por definição. O Tipo só
//   distingue o que o mapa deve fazer visualmente com ela:
//     - SEGURA:    desenhada em verde, é o caminho recomendado.
//     - BLOQUEADA: desenhada em vermelho, é um trecho que a criança não
//                  deve atravessar (rua perigosa, obra, etc.)
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/rotas")]
[Authorize]
[EnableRateLimiting("Geral")]
public class RotasController : ControllerBase
{
    private static readonly HashSet<string> TiposValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "SEGURA", "BLOQUEADA"
    };

    private readonly IConfiguration _config;

    public RotasController(IConfiguration config)
    {
        _config = config;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/rotas?criancaId={id}
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
            SELECT r.Id, r.Nome, r.DescricaoRota, r.Tipo,
                   r.OrigemLat, r.OrigemLng, r.OrigemNome,
                   r.DestinoLat, r.DestinoLng, r.DestinoNome,
                   r.PontosIntermediarios, r.ToleranciaMetros
            FROM app.RotasSeguras r
            INNER JOIN app.Criancas c ON c.Id = r.CriancaId
            WHERE r.CriancaId = @CriancaId AND c.ResponsavelId = @ResponsavelId AND r.Ativa = 1
            ORDER BY r.CriadoEm ASC";
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
                descricao = reader.IsDBNull(2) ? null : reader.GetString(2),
                tipo = reader.GetString(3),
                origemLat = reader.GetDouble(4),
                origemLng = reader.GetDouble(5),
                origemNome = reader.IsDBNull(6) ? null : reader.GetString(6),
                destinoLat = reader.GetDouble(7),
                destinoLng = reader.GetDouble(8),
                destinoNome = reader.IsDBNull(9) ? null : reader.GetString(9),
                pontosIntermediarios = reader.IsDBNull(10) ? null : reader.GetString(10),
                toleranciaMetros = reader.GetInt32(11),
            });
        }

        return Ok(lista);
    }

    // =========================================================================
    // POST /api/rotas
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarRotaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (!TiposValidos.Contains(dto.Tipo))
        {
            ModelState.AddModelError(nameof(dto.Tipo), "Tipo deve ser SEGURA ou BLOQUEADA.");
            return ValidationProblem(ModelState);
        }

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Confirma posse da criança (anti-IDOR) — mesmo padrão usado em
        // ZonasController e PulseirasController
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandText = "SELECT 1 FROM app.Criancas WHERE Id=@Id AND ResponsavelId=@RespId AND Ativo=1";
        cmdValida.Parameters.AddWithValue("@Id", dto.CriancaId);
        cmdValida.Parameters.AddWithValue("@RespId", responsavelId);
        if (await cmdValida.ExecuteScalarAsync() == null)
            return NotFound(new { Erro = "Criança não encontrada." });

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO app.RotasSeguras
                (CriancaId, Nome, DescricaoRota, Tipo, OrigemLat, OrigemLng, OrigemNome,
                 DestinoLat, DestinoLng, DestinoNome, PontosIntermediarios, ToleranciaMetros)
            OUTPUT INSERTED.Id
            VALUES
                (@CriancaId, @Nome, @Descricao, @Tipo, @OrigemLat, @OrigemLng, @OrigemNome,
                 @DestinoLat, @DestinoLng, @DestinoNome, @Pontos, @Tolerancia)";
        cmd.Parameters.AddWithValue("@CriancaId", dto.CriancaId);
        cmd.Parameters.AddWithValue("@Nome", dto.Nome);
        cmd.Parameters.AddWithValue("@Descricao", (object?)dto.Descricao ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Tipo", dto.Tipo.ToUpperInvariant());
        cmd.Parameters.AddWithValue("@OrigemLat", dto.OrigemLat);
        cmd.Parameters.AddWithValue("@OrigemLng", dto.OrigemLng);
        cmd.Parameters.AddWithValue("@OrigemNome", (object?)dto.OrigemNome ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@DestinoLat", dto.DestinoLat);
        cmd.Parameters.AddWithValue("@DestinoLng", dto.DestinoLng);
        cmd.Parameters.AddWithValue("@DestinoNome", (object?)dto.DestinoNome ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Pontos", (object?)dto.PontosIntermediarios ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Tolerancia", dto.ToleranciaMetros ?? 100);

        var novoId = (Guid)(await cmd.ExecuteScalarAsync())!;

        return StatusCode(201, new
        {
            id = novoId,
            nome = dto.Nome,
            descricao = dto.Descricao,
            tipo = dto.Tipo.ToUpperInvariant(),
            origemLat = dto.OrigemLat,
            origemLng = dto.OrigemLng,
            origemNome = dto.OrigemNome,
            destinoLat = dto.DestinoLat,
            destinoLng = dto.DestinoLng,
            destinoNome = dto.DestinoNome,
            pontosIntermediarios = dto.PontosIntermediarios,
            toleranciaMetros = dto.ToleranciaMetros ?? 100,
        });
    }

    // =========================================================================
    // DELETE /api/rotas/{id}
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
            UPDATE r SET r.Ativa = 0
            FROM app.RotasSeguras r
            INNER JOIN app.Criancas c ON c.Id = r.CriancaId
            WHERE r.Id = @Id AND c.ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Rota não encontrada." });

        return Ok(new { Mensagem = "Rota removida com sucesso." });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record CriarRotaDto
{
    [Required]
    public required Guid CriancaId { get; init; }

    [Required, MaxLength(100)]
    public required string Nome { get; init; }

    [MaxLength(500)]
    public string? Descricao { get; init; }

    [Required, MaxLength(20)]
    public required string Tipo { get; init; }

    [Required, Range(-90, 90)]
    public required double OrigemLat { get; init; }

    [Required, Range(-180, 180)]
    public required double OrigemLng { get; init; }

    [MaxLength(200)]
    public string? OrigemNome { get; init; }

    [Required, Range(-90, 90)]
    public required double DestinoLat { get; init; }

    [Required, Range(-180, 180)]
    public required double DestinoLng { get; init; }

    [MaxLength(200)]
    public string? DestinoNome { get; init; }

    // GeoJSON / JSON com pontos intermediários: [{"lat":...,"lng":...}, ...]
    // Opcional — se vazio, o mapa desenha só uma linha reta entre origem e destino.
    public string? PontosIntermediarios { get; init; }

    [Range(10, 1000)]
    public int? ToleranciaMetros { get; init; }
}
