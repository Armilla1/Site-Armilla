// =============================================================================
// ARMILLA SEGURA — Controller de Autenticação
// Arquivo: AuthController.cs
// =============================================================================
// Controller em MVC/API = "porta de entrada" para as rotas HTTP.
// Este controller gerencia: login, logout, renovação de sessão, cadastro.
//
// Fluxo completo de autenticação:
// 1. Cliente faz POST /auth/login com email + senha
// 2. Verificamos email no banco (via Stored Procedure)
// 3. Verificamos senha com BCrypt
// 4. Emitimos Access Token (JWT, 15min) + Refresh Token (cookie, 30 dias)
// 5. Cliente usa Access Token nas próximas requisições
// 6. Quando Access Token expira, cliente chama POST /auth/refresh
// 7. Logout revoga o Refresh Token no banco
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using BCrypt.Net;   // NuGet: BCrypt.Net-Next
using System.ComponentModel.DataAnnotations;
using Armilla.Backend.Security;

namespace Armilla.Backend.Controllers;

/// <summary>
/// Prefixo da rota: todas as rotas aqui serão /api/auth/...
/// [ApiController] ativa validações automáticas do ModelState
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // Injeção de dependência — recebemos tudo que precisamos pelo construtor
    // Isso facilita testes unitários (podemos injetar mocks)
    private readonly IConfiguration      _config;
    private readonly JwtService          _jwtService;
    private readonly Services.IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IConfiguration          config,
        JwtService              jwtService,
        Services.IEmailService  emailService,
        ILogger<AuthController> logger)
    {
        _config     = config;
        _jwtService = jwtService;
        _emailService = emailService;
        _logger     = logger;
    }

    // -------------------------------------------------------------------------
    // CORREÇÃO DE REVISÃO: o cookie do Refresh Token estava com Secure = true
    // fixo em todos os ambientes. O atributo Secure faz o NAVEGADOR recusar
    // salvar/enviar o cookie em qualquer conexão que não seja HTTPS — e o
    // profile "http" do launchSettings.json (usado em desenvolvimento local)
    // roda em http://localhost:5016, sem HTTPS. Resultado prático: o login
    // parecia funcionar (o Access Token volta no corpo da resposta), mas o
    // cookie do Refresh Token nunca era salvo pelo navegador, e qualquer
    // tentativa de POST /api/auth/refresh falhava — a sessão "caía" sempre
    // que o Access Token expirasse (15 minutos).
    //
    // Mesma lógica de "Development:IgnoreHttps" já usada em SecurityConfig.cs
    // para RequireHttpsMetadata: em produção (sem essa chave configurada),
    // o cookie continua exigindo HTTPS normalmente.
    // -------------------------------------------------------------------------
    private bool CookieSeguro() => !_config.GetValue<bool>("Development:IgnoreHttps");

    // =========================================================================
    // POST /api/auth/login
    // =========================================================================
    // [EnableRateLimiting]: aplica a política "Login" do SecurityConfig.cs
    // = máximo 10 tentativas por 5 minutos por IP
    // =========================================================================
    [HttpPost("login")]
    [EnableRateLimiting("Login")]
    [AllowAnonymous]    // Rota pública — qualquer um pode tentar fazer login
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // Stopwatch para medir tempo de resposta (útil para detectar timing attacks)
        var sw = System.Diagnostics.Stopwatch.StartNew();

        // O IP do cliente — importante para logs e rate limiting por IP
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
        var userAgent = Request.Headers["User-Agent"].ToString();

        _logger.LogInformation("Tentativa de login — Email: {Email}, IP: {IP}", 
            // Mascaramos o email no log para não expor dado pessoal
            MascararEmail(dto.Email), ip);

        try
        {
            // -----------------------------------------------------------------
            // PASSO 1: Buscar usuário no banco via Stored Procedure
            // -----------------------------------------------------------------
            // Usamos SqlConnection diretamente aqui para chamar a SP.
            // Em projetos maiores, isole isso em um Repository/Service.
            var connectionString = _config.GetConnectionString("ArmillaDB")
                ?? throw new InvalidOperationException("Connection string não configurada.");

            Guid?   responsavelId   = null;
            string? senhaHashBanco  = null;
            string? senhaSaltBanco  = null;
            string? statusBanco     = null;

            await using (var conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();

                await using var cmd = new SqlCommand("security.sp_AutenticarResponsavel", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };

                // PARAMETRIZAÇÃO — proteção contra SQL Injection
                // Nunca faríamos: "SELECT * FROM ... WHERE Email = '" + dto.Email + "'"
                // O SqlParameter separa dados do SQL — o banco trata como dado puro
                cmd.Parameters.AddWithValue("@Email",       dto.Email);
                cmd.Parameters.AddWithValue("@EnderecoIP",  ip);
                cmd.Parameters.AddWithValue("@UserAgent",   userAgent);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    statusBanco     = reader["Status"]?.ToString();
                    var idStr       = reader["ResponsavelId"]?.ToString();
                    responsavelId   = idStr != null ? Guid.Parse(idStr) : null;
                    senhaHashBanco  = reader["SenhaHash"]?.ToString();
                    senhaSaltBanco  = reader["SenhaSalt"]?.ToString();
                }
            }

            // -----------------------------------------------------------------
            // PASSO 2: Verificar se conta está bloqueada
            // -----------------------------------------------------------------
            if (statusBanco == "CONTA_BLOQUEADA")
            {
                // CONCEITO "Constant Time Response":
                // Mesmo para conta bloqueada, esperamos um tempo fixo antes de responder.
                // Por quê? Sem isso, um atacante pode medir o tempo e saber se o email existe.
                await EsperarTempoFixo(sw);

                return StatusCode(429, new
                {
                    Erro    = "Conta temporariamente bloqueada por excesso de tentativas.",
                    Dica    = "Aguarde 15 minutos ou redefina sua senha."
                });
            }

            // -----------------------------------------------------------------
            // PASSO 3: Verificar se email existe
            // -----------------------------------------------------------------
            if (responsavelId == null || senhaHashBanco == null)
            {
                // CONCEITO "User Enumeration Prevention":
                // Não informamos se o email existe ou não.
                // A mensagem é IDÊNTICA ao "senha errada" — isso impede que atacantes
                // descubram quais emails estão cadastrados fazendo muitas tentativas.

                await EsperarTempoFixo(sw);

                // Registramos a tentativa com o email (que não existe)
                await RegistrarLogFalhaAsync(ip, userAgent, "EMAIL_NAO_ENCONTRADO", dto.Email);

                return Unauthorized(new { Erro = "Email ou senha inválidos." });
            }

            // -----------------------------------------------------------------
            // PASSO 4: Verificar senha com BCrypt
            // -----------------------------------------------------------------
            // CONCEITO BCRYPT:
            // BCrypt é um algoritmo de hash especialmente projetado para senhas.
            // Diferente de MD5/SHA, ele é INTENCIONALMENTE lento (work factor).
            // Isso torna brute force inviável — para testar 1 milhão de senhas
            // levaria anos, não segundos.
            //
            // BCrypt.Verify compara a senha fornecida com o hash armazenado.
            // O salt está embutido no hash, mas também guardamos separado por redundância.
            bool senhaCorreta;
            try
            {
                // Esta operação leva ~100-300ms propositalmente (work factor 12)
                senhaCorreta = BCrypt.Net.BCrypt.Verify(dto.Senha, senhaHashBanco, enhancedEntropy: true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao verificar BCrypt para {Id}", responsavelId);
                senhaCorreta = false;
            }

            // -----------------------------------------------------------------
            // PASSO 5: Registrar resultado no banco (atualiza tentativas)
            // -----------------------------------------------------------------
            await RegistrarResultadoLoginAsync(responsavelId.Value, senhaCorreta, ip, userAgent);

            if (!senhaCorreta)
            {
                // Mesma mensagem genérica — não revelamos que o email existe
                await EsperarTempoFixo(sw);
                return Unauthorized(new { Erro = "Email ou senha inválidos." });
            }

            // -----------------------------------------------------------------
            // PASSO 6: Login bem-sucedido — emitir tokens
            // -----------------------------------------------------------------

            // Buscamos dados completos do usuário para o token
            var (nomeCompleto, email, role, emailConfirmado) = await BuscarDadosResponsavelAsync(responsavelId.Value);

            // Access Token: curto prazo, enviado no corpo da resposta
            var accessToken = _jwtService.GerarAccessToken(responsavelId.Value, email, role);

            // Refresh Token: longo prazo, enviado como cookie HTTP-only
            var (refreshToken, refreshTokenHash) = _jwtService.GerarRefreshToken();
            await SalvarRefreshTokenAsync(responsavelId.Value, refreshTokenHash, ip, userAgent);

            // CONCEITO Cookie HTTP-Only:
            // Ao enviar o Refresh Token como cookie com HttpOnly=true,
            // o JavaScript da página NÃO PODE acessá-lo.
            // Isso mitiga roubo de token por XSS — mesmo se um atacante injetar JS,
            // não consegue roubar o Refresh Token.
            Response.Cookies.Append("armilla_refresh", refreshToken, new CookieOptions
            {
                HttpOnly  = true,       // JS não acessa
                Secure    = CookieSeguro(), // HTTPS obrigatório em produção; liberado em dev local sem HTTPS
                SameSite  = SameSiteMode.Strict,  // Não envia em cross-site requests (CSRF protection)
                Expires   = DateTimeOffset.UtcNow.AddDays(30),
                Path      = "/api/auth" // Cookie só vai para rotas de auth
            });

            _logger.LogInformation(
                "Login bem-sucedido — Responsável: {Id}, IP: {IP}",
                responsavelId, ip);

            return Ok(new LoginResponseDto
            {
                AccessToken = accessToken,
                ExpiresIn   = 900,  // 15 minutos em segundos
                NomeCompleto = nomeCompleto,
                Email       = email,
                EmailConfirmado = emailConfirmado
            });
        }
        catch (Exception ex)
        {
            // Nunca retornamos detalhes da exceção para o cliente — é informação demais
            _logger.LogError(ex, "Erro interno no login");
            return StatusCode(500, new { Erro = "Erro interno. Tente novamente." });
        }
    }

    // =========================================================================
    // POST /api/auth/cadastro
    // =========================================================================
    [HttpPost("cadastro")]
    [EnableRateLimiting("Cadastro")]
    [AllowAnonymous]
    public async Task<IActionResult> Cadastro([FromBody] CadastroDto dto)
    {
        // ModelState.IsValid verifica as DataAnnotations do DTO automaticamente
        // (ex: [Required], [EmailAddress], [MinLength])
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";

        // -----------------------------------------------------------------
        // HASH DA SENHA com BCrypt
        // -----------------------------------------------------------------
        // NUNCA armazenamos a senha em texto puro.
        // WorkFactor 12 = a operação demora ~250ms — inviabiliza brute force
        //
        // Por que BCrypt e não SHA256?
        // SHA256 de "123456" é sempre o mesmo hash em todo computador do mundo.
        // Isso permite "Rainbow Tables" — tabelas pré-calculadas de hashes.
        //
        // BCrypt gera um SALT aleatório para cada senha, então o hash de "123456"
        // de um usuário é diferente do hash de "123456" de outro usuário.
        // Isso inviabiliza Rainbow Tables.
        var senhaHash = BCrypt.Net.BCrypt.HashPassword(
            dto.Senha,
            workFactor: 12,         // Custo computacional — quanto maior, mais lento e seguro
            enhancedEntropy: true   // Usa SHA-384 internamente para senhas > 72 chars
        );

        // Extraímos o salt do hash BCrypt (ele está embutido nos primeiros 29 chars)
        var senhaSalt = senhaHash[..29];

        // -----------------------------------------------------------------
        // Inserir no banco via Stored Procedure
        // -----------------------------------------------------------------
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("security.sp_CriarResponsavel", conn)
        {
            CommandType = System.Data.CommandType.StoredProcedure
        };

        cmd.Parameters.AddWithValue("@NomeCompleto",  dto.NomeCompleto);
        cmd.Parameters.AddWithValue("@Email",         dto.Email.ToLowerInvariant()); // Normalizamos email
        cmd.Parameters.AddWithValue("@SenhaHash",     senhaHash);
        cmd.Parameters.AddWithValue("@SenhaSalt",     senhaSalt);
        cmd.Parameters.AddWithValue("@Telefone",      (object?)dto.Telefone ?? DBNull.Value);

        string? status    = null;
        Guid?   novoId    = null;

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            status = reader["Status"]?.ToString();
            var idStr = reader["NovoId"]?.ToString();
            novoId = idStr != null ? Guid.Parse(idStr) : null;
        }

        return status switch
        {
            "CRIADO"          => await FinalizarCadastroComEmailAsync(novoId!.Value, dto.NomeCompleto, dto.Email),
            "EMAIL_DUPLICADO" => Conflict(new { Erro = "Este email já está cadastrado." }),
            _                 => StatusCode(500, new { Erro = "Erro ao criar conta." })
        };
    }

    /// <summary>
    /// Após criar a conta com sucesso, gera e envia o código de confirmação
    /// de e-mail automaticamente — o usuário não precisa pedir manualmente
    /// na primeira vez (PODE pedir reenvio depois via /reenviar-confirmacao).
    /// </summary>
    private async Task<IActionResult> FinalizarCadastroComEmailAsync(Guid novoId, string nomeCompleto, string email)
    {
        try
        {
            var codigo = Services.EmailService.GerarCodigoNumerico(6);
            var hash   = Services.EmailService.HashToken(codigo);

            var connectionString = _config.GetConnectionString("ArmillaDB")!;
            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand("app.sp_CriarTokenConfirmacaoEmail", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@ResponsavelId", novoId);
            cmd.Parameters.AddWithValue("@TokenHash", hash);
            cmd.Parameters.AddWithValue("@Tipo", "CONFIRMACAO_CADASTRO");
            await cmd.ExecuteNonQueryAsync();

            await _emailService.EnviarCodigoConfirmacaoAsync(email, nomeCompleto, codigo);
        }
        catch (Exception ex)
        {
            // Não falha o cadastro se o e-mail não puder ser enviado agora —
            // o usuário pode pedir reenvio depois de logar (botão "Reenviar código"
            // no ModalConfirmacaoEmail do Dashboard).
            _logger.LogError(ex, "Conta {Id} criada, mas falha ao enviar e-mail de confirmação inicial.", novoId);
        }

        return StatusCode(201, new { Mensagem = "Conta criada com sucesso. Verifique seu e-mail para confirmar.", Id = novoId });
    }

    // =========================================================================
    // POST /api/auth/refresh
    // Renova o Access Token usando o Refresh Token do cookie
    // =========================================================================
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh()
    {
        // Lemos o Refresh Token do cookie HTTP-only
        if (!Request.Cookies.TryGetValue("armilla_refresh", out var refreshToken))
            return Unauthorized(new { Erro = "Nenhum refresh token encontrado." });

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";

        // Calculamos o hash para comparar com o banco
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(refreshToken)));

        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Buscamos o refresh token válido no banco
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT rt.ResponsavelId, r.Email, r.NomeCompleto, 'Responsavel' AS Role
            FROM security.RefreshTokens rt
            INNER JOIN app.Responsaveis r ON r.Id = rt.ResponsavelId
            WHERE rt.TokenHash = @Hash
              AND rt.Revogado = 0
              AND rt.ExpiraEm > SYSUTCDATETIME()
              AND r.ContaAtiva = 1";

        cmd.Parameters.AddWithValue("@Hash", tokenHash);

        Guid?   responsavelId   = null;
        string? email           = null;
        string? nomeCompleto    = null;
        string? role            = null;

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            responsavelId   = reader.GetGuid(0);
            email           = reader.GetString(1);
            nomeCompleto    = reader.GetString(2);
            role            = reader.GetString(3);
        }

        if (responsavelId == null)
        {
            // Token inválido ou expirado — invalidamos o cookie
            Response.Cookies.Delete("armilla_refresh");
            _logger.LogWarning("Refresh token inválido de IP: {IP}", ip);
            return Unauthorized(new { Erro = "Sessão expirada. Faça login novamente." });
        }

        // Rotação de Refresh Token: revogamos o token atual e emitimos um novo
        // CONCEITO: Refresh Token Rotation previne reuso de token vazado.
        // Se um atacante roubou o token e tenta usá-lo depois do usuário legítimo já o renovar,
        // o token já foi revogado e o atacante recebe 401.
        await RevogarRefreshTokenAsync(tokenHash, conn, "ROTACAO");

        var novoAccessToken = _jwtService.GerarAccessToken(responsavelId.Value, email!, role!);
        var (novoRefreshToken, novoRefreshHash) = _jwtService.GerarRefreshToken();
        await SalvarRefreshTokenAsync(responsavelId.Value, novoRefreshHash, ip, Request.Headers["User-Agent"].ToString());

        Response.Cookies.Append("armilla_refresh", novoRefreshToken, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = CookieSeguro(),
            SameSite  = SameSiteMode.Strict,
            Expires   = DateTimeOffset.UtcNow.AddDays(30),
            Path      = "/api/auth"
        });

        return Ok(new { AccessToken = novoAccessToken, ExpiresIn = 900 });
    }

    // =========================================================================
    // POST /api/auth/logout
    // =========================================================================
    [HttpPost("logout")]
    [Authorize]  // Exige autenticação — usuário precisa estar logado
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue("armilla_refresh", out var refreshToken))
        {
            var tokenHash = Convert.ToBase64String(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(refreshToken)));

            var connectionString = _config.GetConnectionString("ArmillaDB")!;
            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync();
            await RevogarRefreshTokenAsync(tokenHash, conn, "LOGOUT");
        }

        // Remove o cookie do cliente
        Response.Cookies.Delete("armilla_refresh", new CookieOptions
        {
            Secure   = CookieSeguro(),
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Path     = "/api/auth"
        });

        return Ok(new { Mensagem = "Logout realizado com sucesso." });
    }

    // =========================================================================
    // MÉTODOS PRIVADOS AUXILIARES
    // =========================================================================

    /// <summary>
    /// Garante tempo mínimo de resposta para prevenir timing attacks.
    /// Mesmo que o processo seja rápido (email não encontrado),
    /// esperamos o tempo equivalente ao de uma verificação completa.
    /// </summary>
    private static async Task EsperarTempoFixo(System.Diagnostics.Stopwatch sw)
    {
        const int TEMPO_MINIMO_MS = 300; // Mesmo tempo que BCrypt.Verify leva
        var tempoDecorrido = (int)sw.ElapsedMilliseconds;
        if (tempoDecorrido < TEMPO_MINIMO_MS)
            await Task.Delay(TEMPO_MINIMO_MS - tempoDecorrido);
    }

    /// <summary>Registra tentativa falha de login sem ID de usuário conhecido</summary>
    private async Task RegistrarLogFalhaAsync(string ip, string userAgent, string motivo, string emailTentativa)
    {
        try
        {
            var connectionString = _config.GetConnectionString("ArmillaDB")!;
            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO audit.LogAcoes (Acao, EnderecoIP, UserAgent, Sucesso, MensagemErro, Detalhes)
                VALUES ('LOGIN_FALHA', @IP, @UA, 0, @Motivo, @Detalhes)";
            cmd.Parameters.AddWithValue("@IP",      ip);
            cmd.Parameters.AddWithValue("@UA",      userAgent);
            cmd.Parameters.AddWithValue("@Motivo",  motivo);
            cmd.Parameters.AddWithValue("@Detalhes", $"{{\"email_tentativa\":\"{MascararEmail(emailTentativa)}\"}}");
            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao registrar log de falha");
        }
    }

    private async Task RegistrarResultadoLoginAsync(Guid responsavelId, bool sucesso, string ip, string userAgent)
    {
        var connectionString = _config.GetConnectionString("ArmillaDB")!;
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("security.sp_RegistrarResultadoLogin", conn)
        {
            CommandType = System.Data.CommandType.StoredProcedure
        };
        cmd.Parameters.AddWithValue("@ResponsavelId",  responsavelId);
        cmd.Parameters.AddWithValue("@Sucesso",         sucesso ? 1 : 0);
        cmd.Parameters.AddWithValue("@EnderecoIP",      ip);
        cmd.Parameters.AddWithValue("@UserAgent",       userAgent);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<(string Nome, string Email, string Role, bool EmailConfirmado)> BuscarDadosResponsavelAsync(Guid responsavelId)
    {
        var connectionString = _config.GetConnectionString("ArmillaDB")!;
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT NomeCompleto, Email, EmailConfirmado FROM app.Responsaveis WHERE Id = @Id";
        cmd.Parameters.AddWithValue("@Id", responsavelId);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (reader.GetString(0), reader.GetString(1), "Responsavel", reader.GetBoolean(2));
    }

    private async Task SalvarRefreshTokenAsync(Guid responsavelId, string hash, string ip, string userAgent)
    {
        var connectionString = _config.GetConnectionString("ArmillaDB")!;
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO security.RefreshTokens (ResponsavelId, TokenHash, DispositivoInfo, ExpiraEm)
            VALUES (@RId, @Hash, @Dev, DATEADD(DAY, 30, SYSUTCDATETIME()))";
        cmd.Parameters.AddWithValue("@RId",  responsavelId);
        cmd.Parameters.AddWithValue("@Hash", hash);
        cmd.Parameters.AddWithValue("@Dev",  $"{userAgent}|{ip}");
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task RevogarRefreshTokenAsync(string hash, SqlConnection conn, string motivo)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE security.RefreshTokens 
            SET Revogado=1, RevogadoEm=SYSUTCDATETIME(), MotivoRevogacao=@Motivo
            WHERE TokenHash=@Hash";
        cmd.Parameters.AddWithValue("@Hash",   hash);
        cmd.Parameters.AddWithValue("@Motivo", motivo);
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>Mascarar email nos logs: jo**@exemplo.com</summary>
    private static string MascararEmail(string email)
    {
        if (string.IsNullOrEmpty(email)) return "***";
        var partes = email.Split('@');
        if (partes.Length != 2) return "***";
        var nome = partes[0];
        var mascara = nome.Length <= 2
            ? new string('*', nome.Length)
            : nome[..2] + new string('*', nome.Length - 2);
        return $"{mascara}@{partes[1]}";
    }
}

// =============================================================================
// DTOs — Data Transfer Objects
// São classes simples que definem o formato dos dados de entrada/saída
// As DataAnnotations validam automaticamente quando [ApiController] está ativo
// =============================================================================

/// <summary>Corpo da requisição POST /auth/login</summary>
public record LoginDto
{
    [Required(ErrorMessage = "Email é obrigatório")]
    [EmailAddress(ErrorMessage = "Email inválido")]
    [MaxLength(320)]
    public required string Email { get; init; }

    [Required(ErrorMessage = "Senha é obrigatória")]
    [MinLength(8, ErrorMessage = "Senha deve ter pelo menos 8 caracteres")]
    [MaxLength(128, ErrorMessage = "Senha muito longa")]
    public required string Senha { get; init; }
}

/// <summary>Corpo da requisição POST /auth/cadastro</summary>
public record CadastroDto
{
    [Required]
    [MinLength(3)]
    [MaxLength(200)]
    public required string NomeCompleto { get; init; }

    [Required]
    [EmailAddress]
    [MaxLength(320)]
    public required string Email { get; init; }

    [Required]
    [MinLength(8, ErrorMessage = "Use pelo menos 8 caracteres")]
    [MaxLength(128)]
    // Regex para senha forte: maiúscula, minúscula, número, símbolo
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
        ErrorMessage = "Senha precisa ter maiúscula, minúscula, número e símbolo")]
    public required string Senha { get; init; }

    [Phone]
    [MaxLength(20)]
    public string? Telefone { get; init; }
}

/// <summary>Resposta do login bem-sucedido</summary>
public record LoginResponseDto
{
    public required string AccessToken  { get; init; }
    public required int    ExpiresIn    { get; init; }
    public required string NomeCompleto { get; init; }
    public required string Email        { get; init; }
    public required bool   EmailConfirmado { get; init; }
    // Refresh Token NÃO aparece no body — vai apenas no cookie HTTP-only
}
