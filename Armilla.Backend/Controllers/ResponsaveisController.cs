// =============================================================================
// ARMILLA SEGURA — Controller de Responsáveis (Perfil do usuário)
// Arquivo: ResponsaveisController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/ResponsaveisController.cs
// =============================================================================
// CONECTA COM:
//   - app.Responsaveis (campos Idade, FotoUrl adicionados em armilla_adicional.sql)
//   - app.FotosPerfil (armilla_adicional.sql)
//   - Frontend: Dashboard.jsx → PainelPerfil
//
// REGRA DE NEGÓCIO (conforme pedido do usuário):
//   "a do email não mudará a não ser que passe pelo fator de confirmação
//    novamente, mas que seja possível alterar nome, idade do pai/mãe,
//    bateria e conectividade"
//
//   → Este controller permite alterar: NomeCompleto, Telefone, Idade, Foto.
//   → NÃO permite alterar e-mail aqui (ver TrocarEmailController abaixo,
//     que exige nova confirmação).
//   → "Bateria e conectividade" são campos de app.Pulseiras, não de
//     app.Responsaveis — esses são gerenciados por PulseirasController.cs
//     e atualizados automaticamente pela própria pulseira via
//     IngestaoController.cs. Não fazem sentido como edição manual do
//     perfil do responsável, mas o Dashboard.jsx exibe esses dados em
//     tempo real vindos do card de cada criança.
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
[Route("api/responsaveis")]
[Authorize]
[EnableRateLimiting("Geral")]
public class ResponsaveisController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<ResponsaveisController> _logger;

    public ResponsaveisController(IConfiguration config, ILogger<ResponsaveisController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // PUT /api/responsaveis/perfil
    // Atualiza nome, telefone e idade. NÃO altera e-mail.
    // =========================================================================
    [HttpPut("perfil")]
    public async Task<IActionResult> AtualizarPerfil([FromBody] AtualizarPerfilDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE app.Responsaveis
            SET NomeCompleto = @Nome, Telefone = @Telefone, Idade = @Idade,
                AtualizadoEm = SYSUTCDATETIME()
            WHERE Id = @Id AND ContaAtiva = 1";

        cmd.Parameters.AddWithValue("@Nome", dto.NomeCompleto);
        cmd.Parameters.AddWithValue("@Telefone", (object?)dto.Telefone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Idade", (object?)dto.Idade ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Id", responsavelId);

        var linhas = await cmd.ExecuteNonQueryAsync();
        if (linhas == 0)
            return NotFound(new { Erro = "Conta não encontrada." });

        _logger.LogInformation("Perfil atualizado para responsável {Id}", responsavelId);

        return Ok(new { Mensagem = "Perfil atualizado com sucesso." });
    }

    // =========================================================================
    // GET /api/responsaveis/perfil
    // Retorna os dados atuais do perfil (usado em telas de edição)
    // =========================================================================
    [HttpGet("perfil")]
    public async Task<IActionResult> ObterPerfil()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT NomeCompleto, Email, Telefone, Idade, FotoUrl, EmailConfirmado
            FROM app.Responsaveis WHERE Id = @Id AND ContaAtiva = 1";
        cmd.Parameters.AddWithValue("@Id", responsavelId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound(new { Erro = "Conta não encontrada." });

        return Ok(new
        {
            nomeCompleto = reader.GetString(0),
            email = reader.GetString(1),
            telefone = reader.IsDBNull(2) ? null : reader.GetString(2),
            idade = reader.IsDBNull(3) ? (int?)null : reader.GetInt32(3),
            fotoUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
            emailConfirmado = reader.GetBoolean(5),
        });
    }

    // =========================================================================
    // PUT /api/responsaveis/foto
    // Atualiza a URL da foto de perfil (upload físico deve ser feito antes,
    // via serviço de storage — ver nota abaixo)
    //
    // NOTA SOBRE UPLOAD DE ARQUIVOS:
    //   Este endpoint recebe apenas a URL final da foto, não o arquivo
    //   binário. Em produção, o fluxo correto é:
    //     1. Frontend faz upload da imagem para um storage (Azure Blob,
    //        S3, Cloudinary, etc.) usando uma URL pré-assinada.
    //     2. Frontend recebe a URL pública da imagem.
    //     3. Frontend chama este endpoint com essa URL para salvá-la no perfil.
    //   Isso evita que o ASP.NET Core precise lidar com arquivos grandes
    //   diretamente, e separa a responsabilidade de armazenamento de mídia.
    //   Se quiser, posso integrar um storage específico (Azure/AWS/Cloudinary)
    //   — me diga qual prefere usar e eu adapto este endpoint.
    // =========================================================================
    [HttpPut("foto")]
    public async Task<IActionResult> AtualizarFoto([FromBody] AtualizarFotoDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        await using var cmdAtualiza = conn.CreateCommand();
        cmdAtualiza.CommandText = @"
            UPDATE app.Responsaveis SET FotoUrl = @Url, AtualizadoEm = SYSUTCDATETIME()
            WHERE Id = @Id";
        cmdAtualiza.Parameters.AddWithValue("@Url", dto.UrlPublica);
        cmdAtualiza.Parameters.AddWithValue("@Id", responsavelId);
        await cmdAtualiza.ExecuteNonQueryAsync();

        await using var cmdRegistra = conn.CreateCommand();
        cmdRegistra.CommandText = @"
            INSERT INTO app.FotosPerfil (ResponsavelId, NomeArquivo, ContentType, UrlPublica)
            VALUES (@ResponsavelId, @Nome, @ContentType, @Url)";
        cmdRegistra.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmdRegistra.Parameters.AddWithValue("@Nome", dto.NomeArquivo);
        cmdRegistra.Parameters.AddWithValue("@ContentType", dto.ContentType ?? "image/jpeg");
        cmdRegistra.Parameters.AddWithValue("@Url", dto.UrlPublica);
        await cmdRegistra.ExecuteNonQueryAsync();

        return Ok(new { Mensagem = "Foto atualizada com sucesso.", fotoUrl = dto.UrlPublica });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record AtualizarPerfilDto
{
    [Required, MinLength(3), MaxLength(200)]
    public required string NomeCompleto { get; init; }

    [TelefoneBrasileiro, MaxLength(20)]
    public string? Telefone { get; init; }

    [Range(18, 110)]
    public int? Idade { get; init; }
}

public record AtualizarFotoDto
{
    [Required, MaxLength(255)]
    public required string NomeArquivo { get; init; }

    public string? ContentType { get; init; }

    [Required, MaxLength(500)]
    public required string UrlPublica { get; init; }
}
