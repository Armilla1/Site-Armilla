// =============================================================================
// ARMILLA SEGURA — Controller de Confirmação de E-mail e Recuperação de Senha
// Arquivo: ConfirmacaoController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/ConfirmacaoController.cs
// =============================================================================
// CONECTA COM:
//   - app.ConfirmacaoEmail (sql/armilla_adicional.sql)
//   - app.RecuperacaoSenha (sql/armilla_adicional.sql)
//   - sp_CriarTokenConfirmacaoEmail / sp_ValidarTokenConfirmacaoEmail
//   - Services/EmailService.cs (envio real do e-mail)
//   - Frontend: Dashboard.jsx → ModalConfirmacaoEmail
//   - Frontend: ChaveDeRecuperacao.jsx (já existente, fluxo de senha esquecida)
//
// FLUXO DE CONFIRMAÇÃO DE E-MAIL (ao cadastrar):
//   1. AuthController.Cadastro() cria a conta (EmailConfirmado = 0 por padrão)
//   2. Front chama POST /api/auth/reenviar-confirmacao (ou já dispara após cadastro)
//   3. Backend gera código de 6 dígitos, salva hash em app.ConfirmacaoEmail
//   4. Backend envia e-mail via EmailService
//   5. Usuário digita o código no ModalConfirmacaoEmail
//   6. POST /api/auth/confirmar-email → valida e marca EmailConfirmado=1
//
// FLUXO DE RECUPERAÇÃO DE SENHA (esqueci minha senha):
//   1. Auth.jsx → handleEsqueciSenha() → POST /api/auth/esqueci-senha { Email }
//   2. Backend gera chave de 5 caracteres, salva hash em app.RecuperacaoSenha
//   3. ChaveDeRecuperacao.jsx → usuário digita a chave
//   4. POST /api/auth/validar-chave-recuperacao → retorna um token de sessão temporário
//   5. NovaSenha.jsx → usuário define nova senha
//   6. POST /api/auth/redefinir-senha → troca o hash da senha no banco
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Armilla.Backend.Services;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class ConfirmacaoController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;
    private readonly ILogger<ConfirmacaoController> _logger;

    public ConfirmacaoController(IConfiguration config, IEmailService emailService, ILogger<ConfirmacaoController> logger)
    {
        _config = config;
        _emailService = emailService;
        _logger = logger;
    }

    private Guid ResponsavelIdAtual()
    {
        // O JwtService grava o ID do responsável no claim NameIdentifier (ver SecurityConfig.cs)
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário.");
        return Guid.Parse(idStr);
    }

    // =========================================================================
    // POST /api/auth/reenviar-confirmacao
    // Gera um novo código de 6 dígitos e envia por e-mail.
    // Requer estar autenticado (o usuário já fez login, mas e-mail não confirmado)
    // =========================================================================
    [HttpPost("reenviar-confirmacao")]
    [Authorize]
    [EnableRateLimiting("Geral")]
    public async Task<IActionResult> ReenviarConfirmacao()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        string? nome = null, email = null;
        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT NomeCompleto, Email FROM app.Responsaveis WHERE Id=@Id";
            cmd.Parameters.AddWithValue("@Id", responsavelId);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                nome = reader.GetString(0);
                email = reader.GetString(1);
            }
        }

        if (email == null)
            return NotFound(new { Erro = "Usuário não encontrado." });

        var codigo = EmailService.GerarCodigoNumerico(6);
        var hash   = EmailService.HashToken(codigo);

        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();
            await using var cmd = new SqlCommand("app.sp_CriarTokenConfirmacaoEmail", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
            cmd.Parameters.AddWithValue("@TokenHash", hash);
            cmd.Parameters.AddWithValue("@Tipo", "CONFIRMACAO_CADASTRO");
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            await _emailService.EnviarCodigoConfirmacaoAsync(email, nome!, codigo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao enviar e-mail de confirmação para responsável {Id}", responsavelId);
            return StatusCode(500, new { Erro = "Não foi possível enviar o e-mail. Verifique a configuração SMTP em appsettings.Development.json (seção Smtp) e tente novamente." });
        }

        return Ok(new { Mensagem = "Código enviado para o seu e-mail." });
    }

    // =========================================================================
    // POST /api/auth/confirmar-email
    // Valida o código de 6 dígitos digitado pelo usuário
    // =========================================================================
    [HttpPost("confirmar-email")]
    [Authorize]
    [EnableRateLimiting("Geral")]
    public async Task<IActionResult> ConfirmarEmail([FromBody] ConfirmarEmailDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var responsavelId = ResponsavelIdAtual();
        var hash = EmailService.HashToken(dto.Codigo);
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("app.sp_ValidarTokenConfirmacaoEmail", conn)
        {
            CommandType = System.Data.CommandType.StoredProcedure
        };
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);
        cmd.Parameters.AddWithValue("@TokenHash", hash);
        cmd.Parameters.AddWithValue("@Tipo", "CONFIRMACAO_CADASTRO");

        string? status = null;
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            status = reader["Status"]?.ToString();

        if (status != "TOKEN_VALIDADO")
            return BadRequest(new { Erro = "Código inválido ou expirado. Solicite um novo código." });

        return Ok(new { Mensagem = "E-mail confirmado com sucesso." });
    }

    // =========================================================================
    // POST /api/auth/esqueci-senha
    // Gera chave de 5 caracteres e envia por e-mail (fluxo público, sem login)
    // =========================================================================
    [HttpPost("esqueci-senha")]
    [AllowAnonymous]
    [EnableRateLimiting("Cadastro")]
    public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var connectionString = _config.GetConnectionString("ArmillaDB")!;
        Guid? responsavelId = null;
        string? nome = null;

        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT Id, NomeCompleto FROM app.Responsaveis WHERE Email=@Email AND ContaAtiva=1";
            cmd.Parameters.AddWithValue("@Email", dto.Email.ToLowerInvariant());
            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                responsavelId = reader.GetGuid(0);
                nome = reader.GetString(1);
            }
        }

        // Resposta SEMPRE genérica — não revela se o e-mail existe (mesma lógica do AuthController)
        if (responsavelId == null)
        {
            return Ok(new { Mensagem = "Se este e-mail estiver cadastrado, você receberá uma chave de recuperação." });
        }

        var chave = EmailService.GerarChaveAlfanumerica(5);
        var hash  = EmailService.HashToken(chave);
        var ip    = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";

        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                UPDATE app.RecuperacaoSenha SET Utilizado=1
                WHERE ResponsavelId=@Id AND Utilizado=0;

                INSERT INTO app.RecuperacaoSenha (ResponsavelId, TokenHash, TokenExpiraEm, EnderecoIPSolicitante)
                VALUES (@Id, @Hash, DATEADD(MINUTE, 15, SYSUTCDATETIME()), @IP);";
            cmd.Parameters.AddWithValue("@Id", responsavelId);
            cmd.Parameters.AddWithValue("@Hash", hash);
            cmd.Parameters.AddWithValue("@IP", ip);
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            await _emailService.EnviarChaveRecuperacaoAsync(dto.Email, nome!, chave);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao enviar e-mail de recuperação");
            // Não revelamos a falha de envio ao cliente por segurança (evita enumeração)
        }

        return Ok(new { Mensagem = "Se este e-mail estiver cadastrado, você receberá uma chave de recuperação." });
    }

    // =========================================================================
    // POST /api/auth/validar-chave-recuperacao
    // Valida a chave de 5 caracteres digitada em ChaveDeRecuperacao.jsx
    // Retorna um token de sessão temporário para autorizar a troca de senha
    //
    // CORREÇÃO DE SEGURANÇA (encontrada em revisão):
    // A versão anterior gerava o SessionToken como `Guid.NewGuid() + "." + responsavelId`
    // e NUNCA validava esse Guid contra nada — o GUID era puramente decorativo.
    // Isso permitia, em tese, montar manualmente um SessionToken trocando o
    // responsavelId por outro Guid válido (desde que o atacante também tivesse
    // uma chave de recuperação válida para ESSE outro responsável, o que reduz
    // bastante o impacto, mas o desenho não tinha nenhuma garantia criptográfica
    // de integridade — qualquer string nesse formato era aceita sem checagem).
    //
    // CORREÇÃO: agora geramos um token aleatório de 32 bytes, salvamos o HASH
    // dele no mesmo registro de app.RecuperacaoSenha (coluna SessionTokenHash),
    // com expiração própria de 10 minutos. RedefinirSenha só aceita se o hash
    // do SessionToken recebido bater com o que está gravado no banco — ou seja,
    // o valor passa a ser opaco e verificável, não apenas "parseável".
    // =========================================================================
    [HttpPost("validar-chave-recuperacao")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
    public async Task<IActionResult> ValidarChaveRecuperacao([FromBody] ValidarChaveDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var hash = EmailService.HashToken(dto.Chave.ToUpperInvariant());
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        // Gera o session token ANTES de tocar no banco — assim, se a chave for
        // válida, gravamos o hash dele no mesmo UPDATE (uma única ida ao banco).
        var sessionTokenBytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        var sessionToken = Convert.ToBase64String(sessionTokenBytes);
        var sessionTokenHash = EmailService.HashToken(sessionToken);

        Guid? registroId = null;
        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();

            await using var cmdBusca = conn.CreateCommand();
            cmdBusca.CommandText = @"
                SELECT Id FROM app.RecuperacaoSenha
                WHERE TokenHash=@Hash AND Utilizado=0 AND TokenExpiraEm > SYSUTCDATETIME()";
            cmdBusca.Parameters.AddWithValue("@Hash", hash);
            var resultado = await cmdBusca.ExecuteScalarAsync();
            if (resultado != null) registroId = (Guid)resultado;

            if (registroId == null)
                return BadRequest(new { Erro = "Chave inválida ou expirada." });

            // Grava o SessionToken vinculado a este registro específico —
            // a chave original (TokenHash) continua intacta e só é marcada
            // como "Utilizado" de fato em RedefinirSenha, não aqui.
            await using var cmdGrava = conn.CreateCommand();
            cmdGrava.CommandText = @"
                UPDATE app.RecuperacaoSenha
                SET SessionTokenHash = @SessionHash,
                    SessionTokenExpiraEm = DATEADD(MINUTE, 10, SYSUTCDATETIME())
                WHERE Id = @Id";
            cmdGrava.Parameters.AddWithValue("@SessionHash", sessionTokenHash);
            cmdGrava.Parameters.AddWithValue("@Id", registroId);
            await cmdGrava.ExecuteNonQueryAsync();
        }

        return Ok(new { SessionToken = sessionToken, Mensagem = "Chave validada com sucesso." });
    }

    // =========================================================================
    // POST /api/auth/redefinir-senha
    // Define a nova senha após validar a chave de recuperação
    //
    // CORREÇÃO DE SEGURANÇA: agora valida o SessionToken pelo HASH gravado no
    // banco (ver ValidarChaveRecuperacao acima), não mais por um Guid não
    // verificado embutido no próprio token. O responsavelId é obtido a partir
    // do registro encontrado no banco — nunca é extraído ou confiado a partir
    // de algo que o cliente enviou.
    // =========================================================================
    [HttpPost("redefinir-senha")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var sessionTokenHash = EmailService.HashToken(dto.SessionToken);
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using (var conn = new SqlConnection(connectionString))
        {
            await conn.OpenAsync();

            Guid? registroId = null;
            Guid? responsavelId = null;

            await using (var cmdValida = conn.CreateCommand())
            {
                cmdValida.CommandText = @"
                    SELECT Id, ResponsavelId FROM app.RecuperacaoSenha
                    WHERE SessionTokenHash = @SessionHash
                      AND Utilizado = 0
                      AND SessionTokenExpiraEm > SYSUTCDATETIME()";
                cmdValida.Parameters.AddWithValue("@SessionHash", sessionTokenHash);
                await using var reader = await cmdValida.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    registroId = reader.GetGuid(0);
                    responsavelId = reader.GetGuid(1);
                }
            }

            if (registroId == null || responsavelId == null)
                return BadRequest(new { Erro = "Sessão de redefinição inválida ou expirada. Reinicie o processo de recuperação." });

            var senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha, workFactor: 12, enhancedEntropy: true);
            // CORREÇÃO: o salt BCrypt está embutido nos primeiros 29 chars do hash.
            // RedefinirSenha precisa atualizar os DOIS campos — antes só atualizava
            // SenhaHash, deixando SenhaSalt do hash antigo, tornando a coluna
            // inconsistente (o salt não correspondia mais ao hash vigente).
            var senhaSalt = senhaHash[..29];

            await using var cmdUpdate = conn.CreateCommand();
            cmdUpdate.CommandText = @"
                UPDATE app.Responsaveis
                SET SenhaHash     = @Hash,
                    SenhaSalt     = @Salt,
                    AtualizadoEm  = SYSUTCDATETIME()
                WHERE Id = @RespId;

                UPDATE app.RecuperacaoSenha SET Utilizado=1, UtilizadoEm=SYSUTCDATETIME()
                WHERE Id=@RegistroId;

                UPDATE security.RefreshTokens SET Revogado=1, RevogadoEm=SYSUTCDATETIME(), MotivoRevogacao='TROCA_SENHA'
                WHERE ResponsavelId=@RespId AND Revogado=0;";
            cmdUpdate.Parameters.Add("@RespId",     System.Data.SqlDbType.UniqueIdentifier).Value = responsavelId.Value;
            cmdUpdate.Parameters.Add("@RegistroId", System.Data.SqlDbType.UniqueIdentifier).Value = registroId.Value;
            cmdUpdate.Parameters.Add("@Hash",       System.Data.SqlDbType.NVarChar, 255).Value = senhaHash;
            cmdUpdate.Parameters.Add("@Salt",       System.Data.SqlDbType.NVarChar, 60).Value  = senhaSalt;
            await cmdUpdate.ExecuteNonQueryAsync();

        }

        return Ok(new { Mensagem = "Senha redefinida com sucesso. Faça login com sua nova senha." });
    }
}

// =============================================================================
// DTOs
// =============================================================================

public record ConfirmarEmailDto
{
    [Required]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Código deve ter 6 dígitos")]
    public required string Codigo { get; init; }
}

public record EsqueciSenhaDto
{
    [Required]
    [EmailAddress]
    public required string Email { get; init; }
}

public record ValidarChaveDto
{
    [Required]
    [StringLength(5, MinimumLength = 5, ErrorMessage = "Chave deve ter 5 caracteres")]
    public required string Chave { get; init; }
}

public record RedefinirSenhaDto
{
    [Required]
    public required string SessionToken { get; init; }

    // O campo "Chave" foi removido nesta correção de segurança: a validação
    // de RedefinirSenha agora depende exclusivamente do hash do SessionToken
    // gravado no banco por ValidarChaveRecuperacao — exigir a chave de novo
    // aqui não acrescentava segurança real (ela já foi consumida/verificada
    // na etapa anterior) e só duplicava estado no frontend sem necessidade.

    [Required]
    [MinLength(8, ErrorMessage = "Use pelo menos 8 caracteres")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
        ErrorMessage = "Senha precisa ter maiúscula, minúscula, número e símbolo")]
    public required string NovaSenha { get; init; }
}
