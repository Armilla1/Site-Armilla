// =============================================================================
// Program.cs — Ponto de entrada do servidor ASP.NET Core
// LOCALIZAÇÃO: raiz do projeto backend (Armilla_Backend/)
//
// PROBLEMA CORRIGIDO 1: CORS duplicado
//   Antes havia duas políticas conflitantes: "ReactPolicy" (sem credentials)
//   e "Desenvolvimento" (com credentials). O browser bloqueava o cookie do
//   Refresh Token porque AllowCredentials() exige WithOrigins() específico,
//   não AllowAnyOrigin(). A política "ReactPolicy" foi removida — toda a
//   configuração de CORS agora vive em SecurityConfig.cs (ConfigurarCors).
//
// PROBLEMA CORRIGIDO 2: Ordem dos middlewares
//   UseCors() DEVE vir antes de UseAuthentication() e UseAuthorization().
//   Antes o código chamava UseCors("ReactPolicy") antes do build e depois
//   UseCors("Desenvolvimento") depois — duplicação desnecessária e perigosa.
//
// PROBLEMA CORRIGIDO 3: UseRateLimiter() após UseAuthorization()
//   O rate limiter deve ficar antes do MapControllers() mas depois do CORS.
// =============================================================================

using Armilla.Backend.Security;
using Armilla.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Registra os controllers (AuthController, etc.)
builder.Services.AddControllers();

// Swagger — interface visual para testar a API em /swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ConfigureSeguranca registra: JWT, CORS, RateLimit, Headers de segurança
// DEFINIDO EM: SecurityConfig.cs
// Lê configurações de: appsettings.Development.json (em dev)
builder.Services.ConfigureSeguranca(builder.Configuration);

// JwtService — gerador de tokens, injetado no AuthController
builder.Services.AddScoped<Armilla.Backend.Security.JwtService>();

// EmailService — envio de e-mails de confirmação e recuperação de senha
// CORREÇÃO DE REVISÃO: agora dá pra escolher entre SMTP (EmailService.cs,
// o que já existia) ou Resend (ResendEmailService.cs, API HTTP mais simples
// de configurar) sem mudar NADA em AuthController/ConfirmacaoController —
// os dois implementam a mesma interface IEmailService.
// Configuração: appsettings → "Email": { "Provider": "Resend" } (ou "Smtp",
// que é o padrão se a chave não existir, pra não quebrar quem já configurou
// o Mailtrap/Gmail/etc. antes desta mudança).
builder.Services.AddHttpClient(); // necessário para o ResendEmailService chamar a API HTTP do Resend

var provedorEmail = builder.Configuration["Email:Provider"] ?? "Smtp";
if (string.Equals(provedorEmail, "Resend", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IEmailService, ResendEmailService>();
}
else
{
    builder.Services.AddScoped<IEmailService, EmailService>();
}

// ─── NÃO adicione mais nenhuma política de CORS aqui ─────────────────────────
// A política "Desenvolvimento" em SecurityConfig.cs já tem:
//   .WithOrigins("http://localhost:5173")
//   .AllowCredentials()   ← necessário para o cookie do Refresh Token funcionar
// Adicionar outra política aqui conflita e quebra os cookies.
// ─────────────────────────────────────────────────────────────────────────────

var app = builder.Build();

// ── ORDEM DOS MIDDLEWARES IMPORTA ─────────────────────────────────────────────
// O ASP.NET Core processa requisições em pipeline. Cada middleware chama o próximo.
// A ordem errada pode fazer segurança ser ignorada ou CORS não funcionar.
// Ordem correta:
//   1. CORS         → antes de tudo, para o browser aceitar a requisição
//   2. Swagger      → só em dev
//   3. Auth/Authz   → autentica e autoriza
//   4. RateLimiter  → limita requisições (depois de autenticar, para poder logar)
//   5. Controllers  → executa o código do controller
// ─────────────────────────────────────────────────────────────────────────────

// 1. CORS — usa a política correta por ambiente
// "Desenvolvimento": localhost:5173 com AllowCredentials()
// "Producao":        domínio final sem wildcard
var ambiente = app.Environment.IsDevelopment() ? "Desenvolvimento" : "Producao";
app.UseCors(ambiente);

// 2. Swagger — apenas em desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(); // Interface gráfica em http://localhost:<porta>/swagger
}

// 3. Autenticação → lê o JWT do header Authorization: Bearer <token>
//    ou do cookie "armilla_token" (configurado em SecurityConfig.cs)
app.UseAuthentication();

// 4. Autorização → verifica se o usuário tem permissão para a rota ([Authorize], [AllowAnonymous])
app.UseAuthorization();

// 5. Rate Limiting → bloqueia IPs com excesso de requisições
//    Políticas: "Login" (10/5min), "Cadastro" (3/hora), "Geral" (100/min)
app.UseRateLimiter();

// 6. Mapeia as rotas para os controllers
//    AuthController → /api/auth/login, /api/auth/cadastro, /api/auth/refresh, /api/auth/logout
app.MapControllers();

app.Run();
