// =============================================================================
// ARMILLA SEGURA — Controller de Crianças
// Arquivo: CriancasController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/CriancasController.cs
// =============================================================================
// CONECTA COM:
//   - app.Criancas (armilla_database.sql, ampliada em armilla_adicional.sql)
//   - app.DadosMedicos (armilla_adicional.sql) — dados sensíveis LGPD
//   - app.FotosPerfil (armilla_adicional.sql)
//   - Frontend: Dashboard.jsx → ModalCadastroCrianca
//
// SEGURANÇA — PROTEÇÃO CONTRA IDOR (Insecure Direct Object Reference):
//   Toda consulta/alteração filtra SEMPRE por ResponsavelId = usuário logado.
//   Isso impede que o Responsável A acesse ou edite a criança do Responsável B
//   mesmo que ele descubra ou adivinhe o GUID da criança na URL.
//
// LGPD — DADOS MÉDICOS:
//   Dados médicos só podem ser criados/alterados se ConsentimentoLGPD=1 na
//   criança correspondente. O endpoint de dados médicos verifica isso antes
//   de gravar qualquer informação sensível de saúde.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/criancas")]
[Authorize]
[EnableRateLimiting("Geral")]
public class CriancasController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<CriancasController> _logger;

    public CriancasController(IConfiguration config, ILogger<CriancasController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/criancas
    // Lista todas as crianças do responsável autenticado
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        var lista = new List<object>();

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT c.Id, c.NomeCompleto, c.Apelido, c.DataNascimento, c.Genero,
                   c.EscolaNome, c.FotoUrl, c.ConsentimentoLGPD,
                   p.Id AS PulseiraId, p.StatusConexao, p.NivelBateria, p.UltimaComunicacao
            FROM app.Criancas c
            LEFT JOIN app.Pulseiras p ON p.CriancaId = c.Id AND p.Ativa = 1
            WHERE c.ResponsavelId = @ResponsavelId AND c.Ativo = 1
            ORDER BY c.CriadoEm ASC";
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lista.Add(new
            {
                id = reader.GetGuid(0),
                nomeCompleto = reader.GetString(1),
                apelido = reader.IsDBNull(2) ? null : reader.GetString(2),
                dataNascimento = reader.GetDateTime(3),
                genero = reader.IsDBNull(4) ? null : reader.GetString(4),
                escolaNome = reader.IsDBNull(5) ? null : reader.GetString(5),
                fotoUrl = reader.IsDBNull(6) ? null : reader.GetString(6),
                consentimentoLGPD = reader.GetBoolean(7),
                pulseiraId = reader.IsDBNull(8) ? (Guid?)null : reader.GetGuid(8),
                statusConexao = reader.IsDBNull(9) ? null : reader.GetString(9),
                nivelBateria = reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10),
                ultimaComunicacao = reader.IsDBNull(11) ? (DateTime?)null : reader.GetDateTime(11),
            });
        }

        return Ok(lista);
    }

    // =========================================================================
    // POST /api/criancas
    // Cadastra nova criança vinculada ao responsável autenticado
    // =========================================================================
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastroCriancaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (!dto.ConsentimentoLGPD)
            return BadRequest(new { Erro = "O consentimento LGPD é obrigatório para cadastrar uma criança." });

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO app.Criancas
                (ResponsavelId, NomeCompleto, Apelido, DataNascimento, Genero,
                 EscolaNome, ConsentimentoLGPD, ConsentimentoEm)
            OUTPUT INSERTED.Id, INSERTED.CriadoEm
            VALUES
                (@ResponsavelId, @Nome, @Apelido, @Nascimento, @Genero,
                 @Escola, @Consentimento, SYSUTCDATETIME())";

        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@Nome", dto.NomeCompleto);
        cmd.Parameters.AddWithValue("@Apelido", (object?)dto.Apelido ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Nascimento", dto.DataNascimento);
        cmd.Parameters.AddWithValue("@Genero", (object?)dto.Genero ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Escola", (object?)dto.EscolaNome ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Consentimento", dto.ConsentimentoLGPD);

        Guid novoId = Guid.Empty;
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            novoId = reader.GetGuid(0);

        _logger.LogInformation("Criança cadastrada: {Id} por responsável {ResponsavelId}", novoId, responsavelId);

        return StatusCode(201, new
        {
            id = novoId,
            nomeCompleto = dto.NomeCompleto,
            apelido = dto.Apelido,
            dataNascimento = dto.DataNascimento,
            genero = dto.Genero,
            escolaNome = dto.EscolaNome,
            consentimentoLGPD = dto.ConsentimentoLGPD,
            fotoUrl = (string?)null,
            pulseiraId = (Guid?)null,
            statusConexao = (string?)null,
            nivelBateria = (int?)null,
        });
    }

    // =========================================================================
    // PUT /api/criancas/{id}
    // Atualiza dados de uma criança — SEMPRE valida ResponsavelId (anti-IDOR)
    // =========================================================================
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] AtualizarCriancaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE app.Criancas
            SET NomeCompleto = @Nome, Apelido = @Apelido, Genero = @Genero,
                EscolaNome = @Escola, AtualizadoEm = SYSUTCDATETIME()
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId AND Ativo = 1";

        cmd.Parameters.AddWithValue("@Nome", dto.NomeCompleto);
        cmd.Parameters.AddWithValue("@Apelido", (object?)dto.Apelido ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Genero", (object?)dto.Genero ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Escola", (object?)dto.EscolaNome ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhasAfetadas = await cmd.ExecuteNonQueryAsync();

        // linhasAfetadas == 0 → ou a criança não existe, ou pertence a outro responsável
        // Em ambos os casos retornamos 404 (não 403) para não revelar a existência do recurso
        if (linhasAfetadas == 0)
            return NotFound(new { Erro = "Criança não encontrada." });

        return Ok(new { Mensagem = "Dados atualizados com sucesso." });
    }

    // =========================================================================
    // DELETE /api/criancas/{id}
    // Soft delete — marca Ativo=0 em vez de remover (preserva histórico LGPD)
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
            UPDATE app.Criancas SET Ativo = 0, AtualizadoEm = SYSUTCDATETIME()
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var linhasAfetadas = await cmd.ExecuteNonQueryAsync();
        if (linhasAfetadas == 0)
            return NotFound(new { Erro = "Criança não encontrada." });

        return Ok(new { Mensagem = "Criança removida com sucesso." });
    }

    // =========================================================================
    // POST /api/criancas/{id}/medico
    // Cria/atualiza dados médicos — exige ConsentimentoLGPD=1 na criança
    // =========================================================================
    [HttpPost("{id:guid}/medico")]
    public async Task<IActionResult> SalvarDadosMedicos(Guid id, [FromBody] DadosMedicosDto dto)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // PASSO 1: valida que a criança pertence ao responsável E tem consentimento LGPD
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandText = @"
            SELECT ConsentimentoLGPD FROM app.Criancas
            WHERE Id = @Id AND ResponsavelId = @ResponsavelId AND Ativo = 1";
        cmdValida.Parameters.AddWithValue("@Id", id);
        cmdValida.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        var consentimento = await cmdValida.ExecuteScalarAsync();

        if (consentimento == null)
            return NotFound(new { Erro = "Criança não encontrada." });

        if (consentimento is bool b && !b)
            return BadRequest(new { Erro = "É necessário registrar o consentimento LGPD da criança antes de adicionar dados médicos sensíveis." });

        // PASSO 2: upsert (insere se não existe, atualiza se já existe — 1 registro por criança)
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            MERGE app.DadosMedicos AS destino
            USING (SELECT @CriancaId AS CriancaId) AS origem
            ON destino.CriancaId = origem.CriancaId
            WHEN MATCHED THEN
                UPDATE SET
                    TipoSanguineo = @TipoSanguineo, Peso = @Peso, Altura = @Altura,
                    PlanoDeSaude = @PlanoDeSaude, AlergiasDescricao = @Alergias,
                    MedicamentosUso = @Medicamentos, CondicoesEspeciais = @Condicoes,
                    ObservacoesUrgencia = @Observacoes, AtualizadoEm = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (CriancaId, TipoSanguineo, Peso, Altura, PlanoDeSaude,
                        AlergiasDescricao, MedicamentosUso, CondicoesEspeciais,
                        ObservacoesUrgencia, ConsentimentoResponsavelId, FinalidadeColeta)
                VALUES (@CriancaId, @TipoSanguineo, @Peso, @Altura, @PlanoDeSaude,
                        @Alergias, @Medicamentos, @Condicoes, @Observacoes,
                        @ResponsavelId, 'Segurança e atendimento de emergência à criança');";

        cmd.Parameters.AddWithValue("@CriancaId", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@TipoSanguineo", (object?)dto.TipoSanguineo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Peso", (object?)dto.Peso ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Altura", (object?)dto.Altura ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@PlanoDeSaude", (object?)dto.PlanoDeSaude ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Alergias", (object?)dto.AlergiasDescricao ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Medicamentos", (object?)dto.MedicamentosUso ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Condicoes", (object?)dto.CondicoesEspeciais ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Observacoes", (object?)dto.ObservacoesUrgencia ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();

        return Ok(new { Mensagem = "Dados médicos salvos com sucesso." });
    }

    // =========================================================================
    // GET /api/criancas/{id}/medico
    // Retorna dados médicos — apenas o responsável pode ler
    // =========================================================================
    [HttpGet("{id:guid}/medico")]
    public async Task<IActionResult> ObterDadosMedicos(Guid id)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT dm.TipoSanguineo, dm.Peso, dm.Altura, dm.PlanoDeSaude,
                   dm.AlergiasDescricao, dm.MedicamentosUso, dm.CondicoesEspeciais,
                   dm.ObservacoesUrgencia
            FROM app.DadosMedicos dm
            INNER JOIN app.Criancas c ON c.Id = dm.CriancaId
            WHERE dm.CriancaId = @Id AND c.ResponsavelId = @ResponsavelId";
        cmd.Parameters.AddWithValue("@Id", id);
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return Ok(new { existe = false });

        return Ok(new
        {
            existe = true,
            tipoSanguineo = reader.IsDBNull(0) ? null : reader.GetString(0),
            peso = reader.IsDBNull(1) ? (decimal?)null : reader.GetDecimal(1),
            altura = reader.IsDBNull(2) ? (decimal?)null : reader.GetDecimal(2),
            planoDeSaude = reader.IsDBNull(3) ? null : reader.GetString(3),
            alergiasDescricao = reader.IsDBNull(4) ? null : reader.GetString(4),
            medicamentosUso = reader.IsDBNull(5) ? null : reader.GetString(5),
            condicoesEspeciais = reader.IsDBNull(6) ? null : reader.GetString(6),
            observacoesUrgencia = reader.IsDBNull(7) ? null : reader.GetString(7),
        });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record CadastroCriancaDto
{
    [Required, MinLength(2), MaxLength(200)]
    public required string NomeCompleto { get; init; }

    [MaxLength(100)]
    public string? Apelido { get; init; }

    [Required]
    public required DateTime DataNascimento { get; init; }

    [MaxLength(20)]
    public string? Genero { get; init; }

    [MaxLength(200)]
    public string? EscolaNome { get; init; }

    [Required]
    public required bool ConsentimentoLGPD { get; init; }
}

public record AtualizarCriancaDto
{
    [Required, MinLength(2), MaxLength(200)]
    public required string NomeCompleto { get; init; }

    [MaxLength(100)]
    public string? Apelido { get; init; }

    [MaxLength(20)]
    public string? Genero { get; init; }

    [MaxLength(200)]
    public string? EscolaNome { get; init; }
}

public record DadosMedicosDto
{
    [MaxLength(5)]
    public string? TipoSanguineo { get; init; }

    public decimal? Peso { get; init; }
    public decimal? Altura { get; init; }

    [MaxLength(200)]
    public string? PlanoDeSaude { get; init; }

    [MaxLength(1000)]
    public string? AlergiasDescricao { get; init; }

    [MaxLength(1000)]
    public string? MedicamentosUso { get; init; }

    [MaxLength(1000)]
    public string? CondicoesEspeciais { get; init; }

    [MaxLength(1000)]
    public string? ObservacoesUrgencia { get; init; }
}
