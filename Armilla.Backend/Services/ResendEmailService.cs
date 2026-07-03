// =============================================================================
// ARMILLA SEGURA — Serviço de envio de e-mail via Resend
// Arquivo: ResendEmailService.cs
// LOCALIZAÇÃO: Armilla_Backend/Services/ResendEmailService.cs
// =============================================================================
// POR QUE ISSO EXISTE:
//   Você pediu pra trocar o SMTP genérico (EmailService.cs, que usa
//   System.Net.Mail) pelo Resend (resend.com) — uma API HTTP, mais simples
//   de configurar que SMTP e sem precisar de "senha de app" do Gmail.
//
// COMO FUNCIONA:
//   Implementa a MESMA interface IEmailService que o EmailService.cs (SMTP)
//   já implementava. Isso significa que AuthController e ConfirmacaoController
//   não precisam mudar NADA — eles continuam recebendo IEmailService por
//   injeção de dependência, sem saber (nem precisar saber) se por trás é
//   SMTP ou Resend. A troca acontece em UM lugar só: Program.cs decide qual
//   implementação registrar, lendo a chave "Email:Provider" do appsettings.
//
// CONFIGURAÇÃO NECESSÁRIA em appsettings.Development.json:
//   "Email": { "Provider": "Resend" },
//   "Resend": {
//     "ApiKey": "re_xxxxxxxxxxxxxxxxxxxxxxxx",
//     "RemetenteEmail": "naoresponda@seudominio.com",
//     "RemetenteNome": "Armilla Segura"
//   }
//
//   Pra voltar pro SMTP, basta trocar "Email:Provider" pra "Smtp" (ou
//   remover a chave inteira — o padrão é SMTP se não especificado).
//
// IMPORTANTE SOBRE O REMETENTE:
//   O Resend exige que o domínio do RemetenteEmail esteja verificado na
//   sua conta Resend (Settings → Domains). Enquanto isso não for feito,
//   o Resend só permite mandar e-mails para o e-mail cadastrado na sua
//   própria conta (modo sandbox) — útil pra testar antes de configurar
//   um domínio de verdade.
// =============================================================================

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Armilla.Backend.Services;

public class ResendEmailService : IEmailService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<ResendEmailService> _logger;

    private const string ResendApiUrl = "https://api.resend.com/emails";

    public ResendEmailService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<ResendEmailService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task EnviarCodigoConfirmacaoAsync(string destinatario, string nomeCompleto, string codigo)
    {
        var corpo = $@"
            <div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0014; border-radius: 16px;'>
                <h2 style='color: #fff;'>Olá, {nomeCompleto}!</h2>
                <p style='color: rgba(255,255,255,0.7); line-height: 1.6;'>
                    Use o código abaixo para confirmar seu e-mail na Armilla:
                </p>
                <div style='background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;'>
                    <span style='font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #fff;'>{codigo}</span>
                </div>
                <p style='color: rgba(255,255,255,0.5); font-size: 13px;'>
                    Este código expira em 15 minutos. Se você não solicitou isso, ignore este e-mail.
                </p>
            </div>";

        await EnviarAsync(destinatario, "Confirme seu e-mail — Armilla", corpo);
    }

    public async Task EnviarChaveRecuperacaoAsync(string destinatario, string nomeCompleto, string chave)
    {
        var corpo = $@"
            <div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0014; border-radius: 16px;'>
                <h2 style='color: #fff;'>Olá, {nomeCompleto}!</h2>
                <p style='color: rgba(255,255,255,0.7); line-height: 1.6;'>
                    Recebemos uma solicitação para redefinir sua senha. Use a chave abaixo:
                </p>
                <div style='background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;'>
                    <span style='font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #fff;'>{chave}</span>
                </div>
                <p style='color: rgba(255,255,255,0.5); font-size: 13px;'>
                    Esta chave expira em 15 minutos. Se você não solicitou isso, sua conta continua segura — apenas ignore este e-mail.
                </p>
            </div>";

        await EnviarAsync(destinatario, "Recuperação de senha — Armilla", corpo);
    }

    public async Task EnviarAlertaEmergenciaAsync(string destinatario, string nomeCrianca, string descricaoAlerta)
    {
        var corpo = $@"
            <div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0014; border-radius: 16px; border-left: 4px solid #f59e0b;'>
                <h2 style='color: #fff;'>Alerta sobre {nomeCrianca}</h2>
                <p style='color: rgba(255,255,255,0.8); line-height: 1.6;'>{descricaoAlerta}</p>
                <p style='color: rgba(255,255,255,0.5); font-size: 13px;'>
                    Abra o aplicativo Armilla para ver mais detalhes e a localização no mapa.
                </p>
            </div>";

        await EnviarAsync(destinatario, $"Alerta — {nomeCrianca}", corpo);
    }

    private async Task EnviarAsync(string destinatario, string assunto, string corpoHtml)
    {
        var apiKey = _config["Resend:ApiKey"]
            ?? throw new InvalidOperationException("Resend:ApiKey não configurado.");
        var remetenteEmail = _config["Resend:RemetenteEmail"] ?? "naoresponda@armilla.app";
        var remetenteNome = _config["Resend:RemetenteNome"] ?? "Armilla Segura";

        var cliente = _httpClientFactory.CreateClient();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new
        {
            from = $"{remetenteNome} <{remetenteEmail}>",
            to = new[] { destinatario },
            subject = assunto,
            html = corpoHtml,
        };

        try
        {
            var resposta = await cliente.PostAsJsonAsync(ResendApiUrl, payload);

            if (!resposta.IsSuccessStatusCode)
            {
                var corpoErro = await resposta.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Resend retornou {Status} ao enviar e-mail para {Destinatario}: {Corpo}",
                    resposta.StatusCode, MascararEmail(destinatario), corpoErro);
                throw new InvalidOperationException($"Resend falhou com status {resposta.StatusCode}.");
            }

            _logger.LogInformation("E-mail enviado via Resend para {Destinatario}", MascararEmail(destinatario));
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            _logger.LogError(ex, "Falha ao enviar e-mail via Resend para {Destinatario}", MascararEmail(destinatario));
            throw;
        }
    }

    private static string MascararEmail(string email)
    {
        if (string.IsNullOrEmpty(email)) return "***";
        var partes = email.Split('@');
        if (partes.Length != 2) return "***";
        var nome = partes[0];
        var mascara = nome.Length <= 2 ? new string('*', nome.Length) : nome[..2] + new string('*', nome.Length - 2);
        return $"{mascara}@{partes[1]}";
    }
}
