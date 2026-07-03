// =============================================================================
// ARMILLA SEGURA — Controller de Dashboard
// Arquivo: DashboardController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/DashboardController.cs
// =============================================================================
// CONECTA COM:
//   - app.sp_ObterDashboardResponsavel (armilla_adicional.sql)
//   - Frontend: Dashboard.jsx → useEffect inicial (apiFetch('/api/dashboard'))
//
// PROPÓSITO:
//   Esta é A rota que alimenta a "tela única do usuário" pedida. Em vez do
//   frontend fazer 4-5 chamadas separadas (responsável, crianças, alertas,
//   zonas), uma única chamada aqui retorna tudo de uma vez, lendo da stored
//   procedure app.sp_ObterDashboardResponsavel — que já faz todos os JOINs
//   necessários no banco, de forma mais eficiente que múltiplas idas e
//   voltas entre C# e SQL Server.
//
//   Isso também simplifica a segurança: como o ID do responsável vem do JWT
//   (não da URL ou do body), é impossível um usuário pedir o dashboard de
//   outra pessoa.
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
[EnableRateLimiting("Geral")]
public class DashboardController : ControllerBase
{
    private readonly IConfiguration _config;

    public DashboardController(IConfiguration config)
    {
        _config = config;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/dashboard
    // Retorna: responsável, crianças (com pulseira), alertas não lidos, zonas
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Obter()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("app.sp_ObterDashboardResponsavel", conn)
        {
            CommandType = System.Data.CommandType.StoredProcedure
        };
        cmd.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        object? responsavel = null;
        var alertas = new List<object>();
        var zonas = new List<object>();

        await using var reader = await cmd.ExecuteReaderAsync();

        // Result set 1: dados do responsável
        if (await reader.ReadAsync())
        {
            responsavel = new
            {
                id = reader.GetGuid(0),
                nomeCompleto = reader.GetString(1),
                email = reader.GetString(2),
                telefone = reader.IsDBNull(3) ? null : reader.GetString(3),
                fotoUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                emailConfirmado = reader.GetBoolean(5),
                idade = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                criadoEm = reader.GetDateTime(7),
                ultimoLoginEm = reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8),
            };
        }

        // Result set 2: crianças com status de pulseira
        // CORREÇÃO DE REVISÃO: a versão anterior usava List<object> + dynamic no
        // loop abaixo. Isso compila, mas é frágil — qualquer erro de nome de
        // propriedade só aparece em tempo de execução (RuntimeBinderException),
        // não em tempo de compilação. Trocado por um record tipado interno.
        await reader.NextResultAsync();
        var criancasBrutas = new List<CriancaDashboardDto>();
        while (await reader.ReadAsync())
        {
            criancasBrutas.Add(new CriancaDashboardDto(
                Id: reader.GetGuid(0),
                NomeCompleto: reader.GetString(1),
                Apelido: reader.IsDBNull(2) ? null : reader.GetString(2),
                DataNascimento: reader.GetDateTime(3),
                FotoUrl: reader.IsDBNull(4) ? null : reader.GetString(4),
                Genero: reader.IsDBNull(5) ? null : reader.GetString(5),
                EscolaNome: reader.IsDBNull(6) ? null : reader.GetString(6),
                ConsentimentoLGPD: reader.GetBoolean(7),
                PulseiraId: reader.IsDBNull(8) ? (Guid?)null : reader.GetGuid(8),
                StatusConexao: reader.IsDBNull(9) ? null : reader.GetString(9),
                NivelBateria: reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10),
                UltimaComunicacao: reader.IsDBNull(11) ? (DateTime?)null : reader.GetDateTime(11),
                CodigoDispositivo: reader.IsDBNull(12) ? null : reader.GetString(12)
            ));
        }

        // Result set 3: alertas não lidos
        await reader.NextResultAsync();
        while (await reader.ReadAsync())
        {
            alertas.Add(new
            {
                id = reader.GetInt64(0),
                tipoAlerta = reader.GetString(1),
                descricao = reader.GetString(2),
                severidade = reader.GetString(3),
                latitude = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                longitude = reader.IsDBNull(5) ? (double?)null : reader.GetDouble(5),
                criadoEm = reader.GetDateTime(6),
                nomeCrianca = reader.GetString(7),
                lido = false,
            });
        }

        // Result set 4: zonas seguras completas de todas as crianças
        // CORREÇÃO DE REVISÃO: antes lia apenas (CriancaId, TotalZonas) — uma
        // contagem que o Dashboard.jsx não conseguia usar para desenhar nada
        // no mapa. Agora lê os dados completos (Id, CriancaId, Nome, Tipo,
        // Latitude, Longitude, RaioMetros, Cor) retornados pela stored
        // procedure corrigida, no formato que MapaLeaflet espera.
        await reader.NextResultAsync();
        while (await reader.ReadAsync())
        {
            zonas.Add(new
            {
                id = reader.GetGuid(0),
                criancaId = reader.GetGuid(1),
                nome = reader.GetString(2),
                tipo = reader.GetString(3),
                latitude = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                longitude = reader.IsDBNull(5) ? (double?)null : reader.GetDouble(5),
                raioMetros = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                cor = reader.GetString(7),
            });
        }

        await reader.CloseAsync();

        // Busca a última localização conhecida de cada pulseira (para o mapa)
        var criancasComLocalizacao = new List<object>();
        foreach (var c in criancasBrutas)
        {
            object? ultimaLoc = null;
            if (c.PulseiraId != null)
            {
                await using var cmdLoc = conn.CreateCommand();
                cmdLoc.CommandText = @"
                    SELECT TOP 1 Latitude, Longitude, RegistradoEm
                    FROM app.Localizacoes
                    WHERE PulseiraId = @PulseiraId
                    ORDER BY RegistradoEm DESC";
                cmdLoc.Parameters.AddWithValue("@PulseiraId", c.PulseiraId.Value);
                await using var readerLoc = await cmdLoc.ExecuteReaderAsync();
                if (await readerLoc.ReadAsync())
                {
                    ultimaLoc = new
                    {
                        lat = readerLoc.GetDouble(0),
                        lng = readerLoc.GetDouble(1),
                        capturadoEm = readerLoc.GetDateTime(2),
                    };
                }
            }

            criancasComLocalizacao.Add(new
            {
                id = c.Id,
                nomeCompleto = c.NomeCompleto,
                apelido = c.Apelido,
                dataNascimento = c.DataNascimento,
                fotoUrl = c.FotoUrl,
                genero = c.Genero,
                escolaNome = c.EscolaNome,
                consentimentoLGPD = c.ConsentimentoLGPD,
                pulseiraId = c.PulseiraId,
                statusConexao = c.StatusConexao,
                nivelBateria = c.NivelBateria,
                ultimaComunicacao = c.UltimaComunicacao,
                codigoDispositivo = c.CodigoDispositivo,
                ultimaLocalizacao = ultimaLoc,
            });
        }

        return Ok(new
        {
            responsavel,
            criancas = criancasComLocalizacao,
            alertas,
            zonas,
        });
    }
}

/// <summary>
/// Representa uma linha do result set 2 da stored procedure
/// app.sp_ObterDashboardResponsavel, antes de cruzar com a última localização.
/// Usar um record tipado (em vez de "dynamic") garante que qualquer erro de
/// nome de propriedade seja pego em tempo de compilação, não em produção.
/// </summary>
public record CriancaDashboardDto(
    Guid Id,
    string NomeCompleto,
    string? Apelido,
    DateTime DataNascimento,
    string? FotoUrl,
    string? Genero,
    string? EscolaNome,
    bool ConsentimentoLGPD,
    Guid? PulseiraId,
    string? StatusConexao,
    int? NivelBateria,
    DateTime? UltimaComunicacao,
    string? CodigoDispositivo
);
