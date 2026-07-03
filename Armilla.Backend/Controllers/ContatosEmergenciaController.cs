// =============================================================================
// ARMILLA SEGURA — Controller de Contatos de Emergência
// Arquivo: ContatosEmergenciaController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/ContatosEmergenciaController.cs
// =============================================================================
// CONECTA COM:
//   - app.ContatosEmergencia (já existia em armilla_adicional.sql, seção B.8 —
//     só faltava este controller, o botão "Adicionar" no Dashboard era um
//     placeholder que não chamava nada)
//   - Frontend: Dashboard.jsx → aba/painel "Emergência"
//
// O QUE ESTE CONTROLLER FAZ:
//   Gerencia a lista de contatos de emergência PESSOAIS do responsável
//   (avó, vizinho, escola, etc.) — diferente dos números fixos de
//   Polícia/SAMU/Bombeiro, que são constantes nacionais (190/192/193) e
//   não dependem de banco de dados, só de um link "tel:" no frontend.
//
//   TipoContato aceita: PESSOAL, POLICIA, BOMBEIRO, SAMU, HOSPITAL, ESCOLA.
//   Os 3 primeiros tipos (POLICIA/BOMBEIRO/SAMU) também podem ser cadastrados
//   aqui se o responsável quiser substituir pelo número da delegacia/posto
//   mais próximo de casa, em vez do 190/192/193 nacional — por isso o campo
//   existe na tabela, mesmo que o Dashboard normalmente mostre os 3 fixos
//   nacionais separadamente.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using Armilla.Backend.Validacao;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/contatos")]
[Authorize]
[EnableRateLimiting("Geral")]
public class ContatosEmergenciaController : ControllerBase
{
    // Mesma lista que existe como comentário na coluna TipoContato do SQL.
    // Mantida aqui em código pra validar a entrada antes de ela chegar no
    // banco — o CHECK constraint do SQL não impõe esses valores (a coluna
    // é NVARCHAR livre), então a validação de verdade é aqui no C#.
    private static readonly HashSet<string> TiposValidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "PESSOAL", "POLICIA", "BOMBEIRO", "SAMU", "HOSPITAL", "ESCOLA"
    };

    private readonly IConfiguration _config;
    private readonly ILogger<ContatosEmergenciaController> _logger;

    public ContatosEmergenciaController(IConfiguration config, ILogger<ContatosEmergenciaController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/contatos
    // Lista todos os contatos ativos do responsável, do mais prioritário
    // pro menos prioritário (Prioridade 1 = primeiro a ligar)
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT Id, Nome, Relacao, Telefone, TipoContato, Prioridade, CriadoEm
            FROM app.ContatosEmergencia
            WHERE ResponsavelId = @ResponsavelId AND Ativo = 1
            ORDER BY Prioridade ASC, CriadoEm ASC";
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var lista = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lista.Add(new
            {
                id = reader.GetGuid(0),
                nome = reader.GetString(1),
                relacao = reader.IsDBNull(2) ? null : reader.GetString(2),
                telefone = reader.GetString(3),
                tipoContato = reader.GetString(4),
                prioridade = reader.GetInt16(5),
                criadoEm = reader.GetDateTime(6),
            });
        }

        return Ok(lista);
    }

    // =========================================================================
    // POST /api/contatos
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarContatoEmergenciaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (!TiposValidos.Contains(dto.TipoContato))
        {
            ModelState.AddModelError(nameof(dto.TipoContato),
                "Tipo deve ser um de: " + string.Join(", ", TiposValidos));
            return ValidationProblem(ModelState);
        }

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO app.ContatosEmergencia
                (ResponsavelId, Nome, Relacao, Telefone, TipoContato, Prioridade)
            OUTPUT INSERTED.Id, INSERTED.CriadoEm
            VALUES
                (@ResponsavelId, @Nome, @Relacao, @Telefone, @TipoContato, @Prioridade)";
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@Nome", dto.Nome);
        cmd.Parameters.AddWithValue("@Relacao", (object?)dto.Relacao ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Telefone", dto.Telefone);
        cmd.Parameters.AddWithValue("@TipoContato", dto.TipoContato.ToUpperInvariant());
        cmd.Parameters.AddWithValue("@Prioridade", dto.Prioridade ?? 1);

        Guid novoId;
        DateTime criadoEm;
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            await reader.ReadAsync();
            novoId = reader.GetGuid(0);
            criadoEm = reader.GetDateTime(1);
        }

        _logger.LogInformation("Contato de emergência {Id} criado para responsável {ResponsavelId}", novoId, responsavelId);

        return StatusCode(201, new
        {
            id = novoId,
            nome = dto.Nome,
            relacao = dto.Relacao,
            telefone = dto.Telefone,
            tipoContato = dto.TipoContato.ToUpperInvariant(),
            prioridade = dto.Prioridade ?? 1,
            criadoEm,
        });
    }

    // =========================================================================
    // PUT /api/contatos/{id}
    // =========================================================================
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarContatoEmergenciaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (!TiposValidos.Contains(dto.TipoContato))
        {
            ModelState.AddModelError(nameof(dto.TipoContato),
                "Tipo deve ser um de: " + string.Join(", ", TiposValidos));
            return ValidationProblem(ModelState);
        }

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE app.ContatosEmergencia
            SET Nome = @Nome, Relacao = @Relacao, Telefone = @Telefone,
                TipoContato = @TipoContato, Prioridade = @Prioridade
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId AND Ativo = 1";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@Nome", dto.Nome);
        cmd.Parameters.AddWithValue("@Relacao", (object?)dto.Relacao ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Telefone", dto.Telefone);
        cmd.Parameters.AddWithValue("@TipoContato", dto.TipoContato.ToUpperInvariant());
        cmd.Parameters.AddWithValue("@Prioridade", dto.Prioridade ?? 1);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Contato não encontrado." });

        return Ok(new { Mensagem = "Contato atualizado com sucesso." });
    }

    // =========================================================================
    // DELETE /api/contatos/{id}
    // Soft delete — segue o mesmo padrão usado em Zonas e Pulseiras
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
            UPDATE app.ContatosEmergencia SET Ativo = 0
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Contato não encontrado." });

        return Ok(new { Mensagem = "Contato removido com sucesso." });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record CriarContatoEmergenciaDto
{
    [Required, MinLength(2), MaxLength(200)]
    public required string Nome { get; init; }

    [MaxLength(100)]
    public string? Relacao { get; init; }

    [Required, TelefoneBrasileiro, MaxLength(20)]
    public required string Telefone { get; init; }

    [Required, MaxLength(30)]
    public required string TipoContato { get; init; }

    [Range(1, 10)]
    public short? Prioridade { get; init; }
}

public record AtualizarContatoEmergenciaDto
{
    [Required, MinLength(2), MaxLength(200)]
    public required string Nome { get; init; }

    [MaxLength(100)]
    public string? Relacao { get; init; }

    [Required, TelefoneBrasileiro, MaxLength(20)]
    public required string Telefone { get; init; }

    [Required, MaxLength(30)]
    public required string TipoContato { get; init; }

    [Range(1, 10)]
    public short? Prioridade { get; init; }
}
