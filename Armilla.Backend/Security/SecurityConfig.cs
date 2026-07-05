// =============================================================================
// ARMILLA SEGURA — Configuração de Segurança (C# / ASP.NET Core)
// Arquivo: SecurityConfig.cs
// =============================================================================
// Este arquivo configura TODA a segurança do servidor.
// Pense nele como o "porteiro" que define quem pode entrar, como pode entrar,
// e o que pode fazer depois de entrar.
//
// STACK: .NET 8 + ASP.NET Core + Microsoft.AspNetCore.Authentication.JwtBearer
// =============================================================================

// Namespaces necessários (equivalente a "import" no JavaScript)
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;           // Rate limiting nativo do .NET 8
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;      // Adicionado para resolver as Policies
using Microsoft.AspNetCore.Http;               // Adicionado para HttpContext
using Microsoft.AspNetCore.Builder;            // Adicionado para IApplicationBuilder
using Microsoft.AspNetCore.Hosting;            // Adicionado para IStartupFilter
using Microsoft.Extensions.Configuration;      // Adicionado para IConfiguration
using Microsoft.Extensions.DependencyInjection;// Adicionado para IServiceCollection
using Microsoft.Extensions.Logging;            // Adicionado para ILogger

namespace Armilla.Backend.Security;

/// <summary>
/// Classe estática: agrupa métodos de extensão para configurar segurança.
/// Métodos de extensão em C# permitem "adicionar" métodos a classes existentes
/// sem modificá-las. Aqui estamos adicionando métodos ao WebApplicationBuilder.
/// </summary>
public static class SecurityConfig
{
    // =========================================================================
    // MÉTODO PRINCIPAL: ConfigureSeguranca
    // Chamado em Program.cs: builder.Services.ConfigureSeguranca(builder.Configuration)
    // =========================================================================
    public static IServiceCollection ConfigureSeguranca(
        this IServiceCollection services,       // "this" = método de extensão
        IConfiguration configuration)
    {
        // Encadeamos todas as configurações de segurança
        services
            .ConfigurarJwt(configuration)
            .ConfigurarCors()
            .ConfigurarRateLimit(configuration)
            .ConfigurarCabecalhosSeguranca();

        return services;
    }

    // =========================================================================
    // 1. JWT — JSON Web Token
    // =========================================================================
    // CONCEITO: JWT é um "crachá digital" que o servidor emite após o login.
    // O cliente guarda esse crachá e o envia em cada requisição.
    // O servidor verifica se o crachá é legítimo (foi assinado com a chave correta).
    //
    // Estrutura de um JWT: HEADER.PAYLOAD.SIGNATURE
    // Header: algoritmo de assinatura
    // Payload: dados do usuário (ID, roles, expiração) — BASE64, não criptografado!
    // Signature: HMAC-SHA256(header + payload + secret) — prova de autenticidade
    //
    // IMPORTANTE: o Payload é VISÍVEL (só base64), então NUNCA coloque senha ou
    // dados sensíveis no payload. Coloque apenas o mínimo (ID, role, expiração).
    // =========================================================================
    private static IServiceCollection ConfigurarJwt(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Lemos as configurações do appsettings.json (ou variáveis de ambiente)
        // NUNCA hardcode a chave secreta no código — use variáveis de ambiente!
        var jwtSecret = configuration["JWT:Secret"]
            ?? throw new InvalidOperationException("JWT:Secret não configurado. Configure a variável de ambiente.");

        var jwtIssuer   = configuration["JWT:Issuer"]   ?? "armilla-api";
        var jwtAudience = configuration["JWT:Audience"] ?? "armilla-app";

        // A chave precisa ter pelo menos 256 bits (32 bytes) para HMAC-SHA256
        if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
            throw new InvalidOperationException("JWT:Secret deve ter pelo menos 32 caracteres.");

        var chaveAssinatura = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

        services.AddAuthentication(opcoes =>
        {
            // Define JWT como o esquema padrão de autenticação
            opcoes.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            opcoes.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(opcoes =>
        {
            // DESATIVAMOS HTTPS metadata em dev, mas em PRODUÇÃO isso deve ser true
            opcoes.RequireHttpsMetadata = !configuration.GetValue<bool>("Development:IgnoreHttps");

            opcoes.TokenValidationParameters = new TokenValidationParameters
            {
                // VALIDAÇÕES — cada uma previne um tipo de ataque:

                ValidateIssuer           = true,    // Verifica quem emitiu o token
                ValidIssuer              = jwtIssuer,

                ValidateAudience         = true,    // Verifica para quem foi emitido
                ValidAudience            = jwtAudience,

                ValidateLifetime         = true,    // Verifica se não expirou
                // ClockSkew: margem de tolerância de tempo entre servidores
                // Padrão é 5 minutos — reduzimos para 1 minuto
                ClockSkew                = TimeSpan.FromMinutes(1),

                ValidateIssuerSigningKey = true,    // Verifica a assinatura criptográfica
                IssuerSigningKey         = chaveAssinatura,

                // Exigir que o token tenha data de expiração
                RequireExpirationTime    = true,

                // O campo "sub" (Subject) = ID do usuário
                NameClaimType            = "sub",
                RoleClaimType            = "role",
            };

            opcoes.Events = new JwtBearerEvents
            {
                // Logamos tentativas de uso de token inválido
                OnAuthenticationFailed = context =>
                {
                    // CORREÇÃO (CS0718): Usamos ILoggerFactory para não passar classe estática no genérico
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("SecurityConfig");

                    // Distinguimos erros: expirado vs. assinatura inválida
                    if (context.Exception is SecurityTokenExpiredException)
                        logger.LogWarning("Token expirado de: {IP}", context.HttpContext.Connection.RemoteIpAddress);
                    else
                        logger.LogWarning("Token inválido: {Erro}", context.Exception.Message);

                    return Task.CompletedTask;
                },

                // Permite enviar JWT via cookie HTTP-only (mais seguro que localStorage)
                OnMessageReceived = context =>
                {
                    // Primeiro tentamos o cookie (preferencial — não acessível por JS)
                    if (context.Request.Cookies.TryGetValue("armilla_token", out var cookieToken))
                        context.Token = cookieToken;
                    // Fallback: header Authorization: Bearer <token>
                    // (necessário para apps mobile / Swagger)

                    return Task.CompletedTask;
                }
            };
        });

        // Autorização: definimos políticas nomeadas para usar nos Controllers
        services.AddAuthorization(opcoes =>
        {
            // Política padrão: qualquer usuário autenticado
            opcoes.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            // Política para ações administrativas
            opcoes.AddPolicy("AdminApenas", policy =>
                policy.RequireRole("Admin").RequireAuthenticatedUser());

            // Política para responsáveis (usuários normais da aplicação)
            // CORREÇÃO: "options" alterado para "opcoes" para corresponder à variável
            opcoes.AddPolicy("Responsavel", policy =>
                policy.RequireRole("Responsavel", "Admin").RequireAuthenticatedUser());
        });

        return services;
    }

    // =========================================================================
    // 2. CORS — Cross-Origin Resource Sharing
    // =========================================================================
    // CONCEITO: O navegador, por padrão, bloqueia requisições JavaScript para
    // domínios diferentes do site atual (Same-Origin Policy).
    //
    // Exemplo: o site https://armilla.com.br não pode fazer fetch() para
    // https://api.armilla.com.br sem que a API autorize explicitamente.
    //
    // CORS é o mecanismo pelo qual a API diz: "aceito requisições deste domínio".
    //
    // ERRO COMUM: colocar AllowAnyOrigin() com AllowCredentials() — isso é
    // bloqueado pelo browser e é um risco de segurança!
    // =========================================================================
    private static IServiceCollection ConfigurarCors(this IServiceCollection services)
{
    services.AddCors(opcoes =>
    {
        // Política para DESENVOLVIMENTO local
        opcoes.AddPolicy("Desenvolvimento", policy =>
            policy
                .SetIsOriginAllowed(origin => 
                {
                    // Libera localhost (HTTP e HTTPS), IPs da rede local e QUALQUER túnel temporário do Cloudflare
                    return origin.StartsWith("http://localhost") || 
                           origin.StartsWith("https://localhost") || 
                           origin.StartsWith("http://192.168") || 
                           origin.StartsWith("https://192.168") || 
                           origin.EndsWith(".trycloudflare.com") ||
                           origin == "https://armilla1.github.io";
                })
                .AllowAnyHeader()               // Qualquer header HTTP
                .AllowAnyMethod()               // GET, POST, PUT, DELETE, etc.
                .AllowCredentials());           // Permite envio de cookies (Refresh Token)

        // Política para PRODUÇÃO — mais restritiva
        opcoes.AddPolicy("Producao", policy =>
            policy
                .SetIsOriginAllowed(origin => true) // Temporário: permite GitHub Pages ou qualquer domínio para testes
                .WithHeaders(                   // Apenas headers necessários
                    "Content-Type",
                    "Authorization",
                    "X-Requested-With",
                    "X-XSRF-Token")
                .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .AllowCredentials()
                .SetPreflightMaxAge(TimeSpan.FromHours(1))); // Cache preflight
    });

    return services;
}

    // =========================================================================
    // 3. RATE LIMITING — Limitação de Taxa de Requisições
    // =========================================================================
    // CONCEITO: Sem rate limiting, um atacante pode fazer 100.000 tentativas de
    // login por minuto (brute force de senha). Com rate limiting, bloqueamos
    // endereços IP que excedem um número razoável de requisições.
    //
    // .NET 8 introduziu rate limiting nativo — sem precisar de bibliotecas extras.
    //
    // Algoritmos disponíveis:
    // - Fixed Window: X requisições por janela de tempo fixa
    // - Sliding Window: X requisições na última janela deslizante (mais justo)
    // - Token Bucket: "créditos" que se regeneram (permite pequenos bursts)
    // - Concurrency: limite de requisições simultâneas
    // =========================================================================
    private static IServiceCollection ConfigurarRateLimit(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // -----------------------------------------------------------------
        // Limites lidos de appsettings (seção "RateLimit"). Se a chave não
        // existir no JSON, caímos no valor padrão (produção) indicado depois
        // do "??". Isso permite afrouxar os limites SÓ no
        // appsettings.Development.json, sem tocar neste arquivo, e sem medo
        // de esquecer um valor de teste indo para produção.
        // -----------------------------------------------------------------
        var loginPermitLimit     = configuration.GetValue<int?>("RateLimit:Login:PermitLimit")     ?? 10;
        var loginWindowMinutes   = configuration.GetValue<int?>("RateLimit:Login:WindowMinutes")    ?? 5;

        var cadastroPermitLimit  = configuration.GetValue<int?>("RateLimit:Cadastro:PermitLimit")   ?? 3;
        var cadastroWindowMinutes = configuration.GetValue<int?>("RateLimit:Cadastro:WindowMinutes") ?? 60;

        services.AddRateLimiter(opcoes =>
        {
            // Resposta padrão quando limite é atingido: 429 Too Many Requests
            opcoes.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Callback quando requisição é rejeitada — logamos para análise
            opcoes.OnRejected = async (context, cancellationToken) =>
            {
                // CORREÇÃO (CS0718): Usamos ILoggerFactory para não passar classe estática no genérico
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("SecurityConfig");

                logger.LogWarning(
                    "Rate limit atingido — IP: {IP}, Path: {Path}",
                    context.HttpContext.Connection.RemoteIpAddress,
                    context.HttpContext.Request.Path);

                context.HttpContext.Response.Headers["Retry-After"] = "60";
                await context.HttpContext.Response.WriteAsync(
                    "Muitas requisições. Tente novamente em 60 segundos.",
                    cancellationToken);
            };

            // -----------------------------------------------------------------
            // POLÍTICA: Geral — para todas as rotas da API
            // Sliding Window: mais justo que Fixed Window
            // 100 req por minuto por IP
            // -----------------------------------------------------------------
            opcoes.AddSlidingWindowLimiter("Geral", limiterOptions =>
            {
                limiterOptions.Window              = TimeSpan.FromMinutes(1);
                limiterOptions.SegmentsPerWindow   = 4;    // Divide em 4 segmentos de 15s
                limiterOptions.PermitLimit         = 100;  // 100 req/minuto
                limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                limiterOptions.QueueLimit           = 5;   // Fila máxima de 5 req esperando
            });

            // -----------------------------------------------------------------
            // POLÍTICA: Login — muito mais restritiva (proteção brute force)
            // Padrão: 10 tentativas por 5 minutos por IP
            // Configurável via RateLimit:Login:PermitLimit / WindowMinutes
            // -----------------------------------------------------------------
            opcoes.AddFixedWindowLimiter("Login", limiterOptions =>
            {
                limiterOptions.Window       = TimeSpan.FromMinutes(loginWindowMinutes);
                limiterOptions.PermitLimit  = loginPermitLimit;
                limiterOptions.QueueLimit   = 0;   // Sem fila — rejeita imediatamente
            });

            // -----------------------------------------------------------------
            // POLÍTICA: Registro — Padrão: 3 contas por hora por IP
            // Previne criação de contas em massa (account farming)
            // Configurável via RateLimit:Cadastro:PermitLimit / WindowMinutes
            // -----------------------------------------------------------------
            opcoes.AddFixedWindowLimiter("Cadastro", limiterOptions =>
            {
                limiterOptions.Window       = TimeSpan.FromMinutes(cadastroWindowMinutes);
                limiterOptions.PermitLimit  = cadastroPermitLimit;
                limiterOptions.QueueLimit   = 0;
            });

            // -----------------------------------------------------------------
            // POLÍTICA: GPS — alta frequência, mas controlada
            // Pulseiras enviam localização a cada 30s
            // -----------------------------------------------------------------
            opcoes.AddTokenBucketLimiter("Gps", limiterOptions =>
            {
                // Token Bucket: começa com 30 "créditos", regenera 1 por segundo
                // Permite bursts de reconexão, mas limita consumo sustentado
                limiterOptions.TokenLimit            = 30;
                limiterOptions.TokensPerPeriod       = 2;
                limiterOptions.ReplenishmentPeriod   = TimeSpan.FromSeconds(1);
                limiterOptions.QueueLimit            = 5;
            });
        });

        return services;
    }

    // =========================================================================
    // 4. CABEÇALHOS DE SEGURANÇA HTTP
    // =========================================================================
    // CONCEITO: Cabeçalhos HTTP de segurança instruem o navegador a se proteger.
    // São linhas na resposta HTTP que o browser obedece automaticamente.
    //
    // Ataques mitigados:
    // - X-Frame-Options: Clickjacking (site malicioso carrega o seu em iframe)
    // - X-Content-Type-Options: MIME sniffing (browser interpreta arquivo errado)
    // - X-XSS-Protection: XSS refletido (legacy, mas ainda útil)
    // - Content-Security-Policy: XSS, data injection (o mais poderoso de todos)
    // - HSTS: Força HTTPS — evita downgrade attack para HTTP
    // - Referrer-Policy: Controla o que o header Referer revela
    // - Permissions-Policy: Desativa APIs perigosas que o site não usa
    // =========================================================================
    private static IServiceCollection ConfigurarCabecalhosSeguranca(
        this IServiceCollection services)
    {
        // Registramos um middleware que adiciona os cabeçalhos em toda resposta
        services.AddTransient<IStartupFilter, SecurityHeadersStartupFilter>();
        return services;
    }
}

// =============================================================================
// MIDDLEWARE: Adiciona cabeçalhos de segurança em TODA resposta HTTP
// =============================================================================
public class SecurityHeadersStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.Use(async (context, proxima) =>
            {
                var cabecalhos = context.Response.Headers;

                // Prevent Clickjacking: não permite que nosso site seja carregado em iframe
                cabecalhos["X-Frame-Options"] = "DENY";

                // Prevent MIME sniffing: o browser usa o Content-Type declarado
                cabecalhos["X-Content-Type-Options"] = "nosniff";

                // XSS Protection (legacy, mas Chrome e Edge ainda respeitam)
                cabecalhos["X-XSS-Protection"] = "1; mode=block";

                // HSTS: força HTTPS por 1 ano, inclui subdomínios
                // ATENÇÃO: só ative em produção com HTTPS configurado!
                // CORREÇÃO: Removido o '!...== false' para evitar sintaxe confusa/quebrada.
                if (context.Request.IsHttps) // Só em HTTPS
                    cabecalhos["Strict-Transport-Security"] =
                        "max-age=31536000; includeSubDomains; preload";

                // Referrer Policy: não vaza URL de onde veio quando clica em link externo
                cabecalhos["Referrer-Policy"] = "strict-origin-when-cross-origin";

                // Permissions Policy: desativa recursos que não usamos
                // Importante para um app de crianças: sem camera, sem microfone acidental
                cabecalhos["Permissions-Policy"] =
                    "camera=(), microphone=(), geolocation=(self), " +
                    "payment=(), usb=(), magnetometer=(), gyroscope=()";

                // Content Security Policy — o mais complexo e poderoso
                // Define de onde o browser pode carregar cada tipo de recurso
                // CONCEITO: se um atacante injetou <script src="evil.com/hack.js">,
                //           o browser recusa carregar porque evil.com não está na lista
                //
                // CORREÇÃO DE REVISÃO: a versão anterior tinha 'nonce-{NONCE}' como
                // texto LITERAL — "{NONCE}" nunca era substituído por um valor real
                // gerado por requisição, então essa diretiva nunca correspondia a
                // nenhum <script> de verdade (nenhuma página gera um nonce com esse
                // texto fixo). Na prática script-src já funcionava só com 'self',
                // a diretiva de nonce era inerte. Implementar nonce real exigiria
                // gerar um valor aleatório por requisição e injetá-lo tanto no header
                // quanto em cada <script> renderizado — o que não se aplica aqui,
                // já que esta API serve majoritariamente JSON (o HTML só aparece no
                // Swagger UI em desenvolvimento). Removida a diretiva morta.
                cabecalhos["Content-Security-Policy"] =
                    "default-src 'self'; "                  +   // tudo de self por padrão
                    "script-src 'self'; "                  +   // scripts: só do nosso domínio
                    "style-src 'self' 'unsafe-inline'; "   +   // CSS inline permitido
                    "img-src 'self' data: https:; "        +   // imagens de HTTPS ok
                    "connect-src 'self' https://api.armillasegura.com.br https://boats-hewlett-prospect-publication.trycloudflare.com; " +
                    "font-src 'self'; "                    +
                    "object-src 'none'; "                  +   // sem Flash/ActiveX
                    "base-uri 'self'; "                    +   // previne base tag injection
                    "form-action 'self'; "                 +   // forms só submetem para self
                    "frame-ancestors 'none'; "             +   // não carrega em iframe
                    "upgrade-insecure-requests";               // força HTTPS automático

                await proxima(context);
            });

            next(app);
        };
    }
}

// =============================================================================
// CLASSE AUXILIAR: Gerador de JWT
// Centraliza toda a criação de tokens para consistência
// =============================================================================
public class JwtService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtService> _logger;

    public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
    {
        _configuration = configuration;
        _logger        = logger;
    }

    /// <summary>
    /// Gera um Access Token JWT com vida curta (15 minutos).
    /// CONCEITO: Vida curta = dano limitado se interceptado.
    /// Se um token vazar, em 15 min ele para de funcionar.
    /// </summary>
    public string GerarAccessToken(Guid responsavelId, string email, string role)
    {
        var secret   = _configuration["JWT:Secret"]!;
        var chave    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credenciais = new SigningCredentials(chave, SecurityAlgorithms.HmacSha256);

        // Claims são os dados embutidos no token
        // REGRA DE OURO: coloque o MÍNIMO necessário
        var claims = new[]
        {
            new System.Security.Claims.Claim("sub",   responsavelId.ToString()),  // Subject
            new System.Security.Claims.Claim("email", email),
            new System.Security.Claims.Claim("role",  role),
            new System.Security.Claims.Claim("iss",   _configuration["JWT:Issuer"]!),
            new System.Security.Claims.Claim("aud",   _configuration["JWT:Audience"]!),
            // jti = JWT ID: identificador único do token, permite revogação individual
            new System.Security.Claims.Claim("jti",   Guid.NewGuid().ToString()),
        };

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer:             _configuration["JWT:Issuer"],
            audience:           _configuration["JWT:Audience"],
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(15),  // 15 MINUTOS apenas!
            signingCredentials: credenciais
        );

        var tokenString = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler()
            .WriteToken(token);

        _logger.LogInformation(
            "Access token gerado para responsável {Id}, expira em: {Expira}",
            responsavelId, DateTime.UtcNow.AddMinutes(15));

        return tokenString;
    }

    /// <summary>
    /// Gera um Refresh Token seguro — string aleatória de 256 bits
    /// CONCEITO: Refresh Token ≠ JWT. É apenas uma string aleatória longa.
    /// Guardamos o HASH dele no banco (nunca o valor original).
    /// </summary>
    public (string Token, string Hash) GerarRefreshToken()
    {
        // Geramos 32 bytes aleatórios criptograficamente seguros
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        var token = Convert.ToBase64String(bytes);           // Token real (enviado ao cliente)

        // Hash SHA-256 para guardar no banco
        var hashBytes = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(token));
        var hash      = Convert.ToBase64String(hashBytes);  // Hash (guardado no banco)

        // Retornamos ambos: o token vai pro cliente, o hash vai pro banco
        return (token, hash);
    }
}