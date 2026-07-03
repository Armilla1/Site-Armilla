// =============================================================================
// ARMILLA SEGURA — Serviço de envio de e-mail
// Arquivo: EmailService.cs
// LOCALIZAÇÃO: Armilla_Backend/Services/EmailService.cs
// =============================================================================
// CONTEXTO (resposta à pergunta "já tem SMTP configurado?"):
// Você confirmou que NÃO havia serviço de e-mail configurado. Este arquivo
// cria a estrutura completa usando SMTP padrão (System.Net.Mail), que é
// 100% funcional com qualquer provedor SMTP — Gmail, Outlook, SendGrid,
// Amazon SES, Mailtrap (para testes), etc.
//
// PARA FUNCIONAR DE VERDADE, você precisa de:
//   1. Uma conta SMTP (veja sugestões abaixo)
//   2. Preencher as configurações em appsettings.Development.json (seção "Smtp")
//
// SUGESTÕES DE PROVEDOR SMTP (gratuitos para começar):
//   - Gmail SMTP: smtp.gmail.com, porta 587, requer "Senha de App" (não a senha normal)
//   - Mailtrap.io: ótimo para TESTAR sem enviar e-mails reais (sandbox)
//   - Brevo (ex-Sendinblue): plano gratuito com 300 e-mails/dia
//   - Resend.com: API moderna, fácil de configurar, plano gratuito
//
// Se quiser, no lugar do SMTP genérico abaixo, posso integrar uma API HTTP
// (como Resend ou Brevo) em vez de SMTP — me diga qual prefere usar e eu
// adapto este arquivo.
// =============================================================================

using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;

namespace Armilla.Backend.Services;

public interface IEmailService
{
    Task EnviarCodigoConfirmacaoAsync(string destinatario, string nomeCompleto, string codigo);
    Task EnviarChaveRecuperacaoAsync(string destinatario, string nomeCompleto, string chave);
    Task EnviarAlertaEmergenciaAsync(string destinatario, string nomeCrianca, string descricaoAlerta);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    // -------------------------------------------------------------------------
    // Configurações lidas de appsettings.Development.json → seção "Smtp"
    // Exemplo de configuração necessária (adicione ao appsettings.Development.json):
    //
    //   "Smtp": {
    //     "Host": "smtp.gmail.com",
    //     "Port": 587,
    //     "Usuario": "seuapp@gmail.com",
    //     "Senha": "sua-senha-de-app-de-16-digitos",
    //     "RemetenteNome": "Armilla Segura",
    //     "RemetenteEmail": "seuapp@gmail.com",
    //     "UsarSsl": true
    //   }
    // -------------------------------------------------------------------------
    private SmtpClient CriarCliente()
    {
        var host   = _config["Smtp:Host"]   ?? throw new InvalidOperationException("Smtp:Host não configurado.");
        var porta  = int.Parse(_config["Smtp:Port"] ?? "587");
        var usuario = _config["Smtp:Usuario"] ?? throw new InvalidOperationException("Smtp:Usuario não configurado.");
        var senha   = _config["Smtp:Senha"]   ?? throw new InvalidOperationException("Smtp:Senha não configurado.");
        var usarSsl = bool.Parse(_config["Smtp:UsarSsl"] ?? "true");

        return new SmtpClient(host, porta)
        {
            Credentials = new NetworkCredential(usuario, senha),
            EnableSsl   = usarSsl,
        };
    }

    public async Task EnviarCodigoConfirmacaoAsync(string destinatario, string nomeCompleto, string codigo)
    {
        var remetenteEmail = _config["Smtp:RemetenteEmail"] ?? "naoresponda@armilla.app";
        var remetenteNome  = _config["Smtp:RemetenteNome"]  ?? "Armilla Segura";

        var assunto = "Confirme seu e-mail — Armilla";
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

        await EnviarAsync(destinatario, assunto, corpo, remetenteEmail, remetenteNome);
    }

    public async Task EnviarChaveRecuperacaoAsync(string destinatario, string nomeCompleto, string chave)
    {
        var remetenteEmail = _config["Smtp:RemetenteEmail"] ?? "naoresponda@armilla.app";
        var remetenteNome  = _config["Smtp:RemetenteNome"]  ?? "Armilla Segura";

        var assunto = "Recuperação de senha — Armilla";
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

        await EnviarAsync(destinatario, assunto, corpo, remetenteEmail, remetenteNome);
    }

    public async Task EnviarAlertaEmergenciaAsync(string destinatario, string nomeCrianca, string descricaoAlerta)
    {
        var remetenteEmail = _config["Smtp:RemetenteEmail"] ?? "naoresponda@armilla.app";
        var remetenteNome  = _config["Smtp:RemetenteNome"]  ?? "Armilla Segura";

        var assunto = $"Alerta — {nomeCrianca}";
        var corpo = $@"
            <div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0014; border-radius: 16px; border-left: 4px solid #f59e0b;'>
                <h2 style='color: #fff;'>Alerta sobre {nomeCrianca}</h2>
                <p style='color: rgba(255,255,255,0.8); line-height: 1.6;'>{descricaoAlerta}</p>
                <p style='color: rgba(255,255,255,0.5); font-size: 13px;'>
                    Abra o aplicativo Armilla para ver mais detalhes e a localização no mapa.
                </p>
            </div>";

        await EnviarAsync(destinatario, assunto, corpo, remetenteEmail, remetenteNome);
    }

    private async Task EnviarAsync(string destinatario, string assunto, string corpoHtml, string remetenteEmail, string remetenteNome)
    {
        try
        {
            using var cliente = CriarCliente();
            using var mensagem = new MailMessage
            {
                From       = new MailAddress(remetenteEmail, remetenteNome),
                Subject    = assunto,
                Body       = corpoHtml,
                IsBodyHtml = true,
            };
            mensagem.To.Add(destinatario);

            await cliente.SendMailAsync(mensagem);
            _logger.LogInformation("E-mail enviado com sucesso para {Destinatario}", MascararEmail(destinatario));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao enviar e-mail para {Destinatario}", MascararEmail(destinatario));
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

    // -------------------------------------------------------------------------
    // GERADOR DE CÓDIGO NUMÉRICO (6 dígitos) — usado na confirmação de e-mail
    // GERADOR DE CHAVE ALFANUMÉRICA (5 chars) — usado na recuperação de senha
    // Ambos usam RandomNumberGenerator criptográfico, não Random comum,
    // para que o código não seja previsível.
    // -------------------------------------------------------------------------
    public static string GerarCodigoNumerico(int digitos = 6)
    {
        var max = (int)Math.Pow(10, digitos);
        var numero = RandomNumberGenerator.GetInt32(0, max);
        return numero.ToString(new string('0', digitos));
    }

    public static string GerarChaveAlfanumerica(int tamanho = 5)
    {
        const string caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 para evitar confusão visual
        var sb = new StringBuilder();
        for (int i = 0; i < tamanho; i++)
        {
            sb.Append(caracteres[RandomNumberGenerator.GetInt32(0, caracteres.Length)]);
        }
        return sb.ToString();
    }

    public static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
