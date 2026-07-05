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
    // Retorna: responsável, crianças (com pulseira e última localização),
    //          alertas não lidos, zonas seguras.
    //
    // CORREÇÃO N+1 (rev. anterior abria 1 query extra por criança com pulseira):
    //   Agora a última localização de todas as pulseiras é carregada em uma
    //   única query com ROW_NUMBER() OVER (PARTITION BY PulseiraId), antes
    //   totalizando N+1 round-trips ao banco; agora sempre 2 (SP + 1 query).
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Obter()
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // ── Stored Procedure: retorna 4 result sets ──────────────────────────
        await using var cmd = new SqlCommand("app.sp_ObterDashboardResponsavel", conn)
        {
            CommandType    = System.Data.CommandType.StoredProcedure,
            CommandTimeout = 30   // SP faz vários JOINs — 30s é razoável
        };
        // Tipo explícito evita AddWithValue inferir SqlDbType errado para
        // UniqueIdentifier e poluir o plan cache do SQL Server.
        cmd.Parameters.Add("@ResponsavelId", System.Data.SqlDbType.UniqueIdentifier).Value = responsavelId;

        object? responsavel = null;
        var alertas = new List<object>();
        var zonas   = new List<object>();

        await using var reader = await cmd.ExecuteReaderAsync();

        // Result set 1: dados do responsável
        if (await reader.ReadAsync())
        {
            responsavel = new
            {
                id              = reader.GetGuid(0),
                nomeCompleto    = reader.GetString(1),
                email           = reader.GetString(2),
                telefone        = reader.IsDBNull(3) ? null : reader.GetString(3),
                fotoUrl         = reader.IsDBNull(4) ? null : reader.GetString(4),
                emailConfirmado = reader.GetBoolean(5),
                idade           = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                criadoEm        = reader.GetDateTime(7),
                ultimoLoginEm   = reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8),
            };
        }

        // Result set 2: crianças com status de pulseira
        // Usar um record tipado (em vez de dynamic) garante que qualquer erro
        // de nome de propriedade seja pego em tempo de compilação.
        await reader.NextResultAsync();
        var criancasBrutas = new List<CriancaDashboardDto>();
        while (await reader.ReadAsync())
        {
            criancasBrutas.Add(new CriancaDashboardDto(
                Id:                reader.GetGuid(0),
                NomeCompleto:      reader.GetString(1),
                Apelido:           reader.IsDBNull(2)  ? null : reader.GetString(2),
                DataNascimento:    reader.GetDateTime(3),
                FotoUrl:           reader.IsDBNull(4)  ? null : reader.GetString(4),
                Genero:            reader.IsDBNull(5)  ? null : reader.GetString(5),
                EscolaNome:        reader.IsDBNull(6)  ? null : reader.GetString(6),
                ConsentimentoLGPD: reader.GetBoolean(7),
                PulseiraId:        reader.IsDBNull(8)  ? (Guid?)null : reader.GetGuid(8),
                StatusConexao:     reader.IsDBNull(9)  ? null : reader.GetString(9),
                NivelBateria:      reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10),
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
                id          = reader.GetInt64(0),
                tipoAlerta  = reader.GetString(1),
                descricao   = reader.GetString(2),
                severidade  = reader.GetString(3),
                latitude    = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                longitude   = reader.IsDBNull(5) ? (double?)null : reader.GetDouble(5),
                criadoEm    = reader.GetDateTime(6),
                nomeCrianca = reader.GetString(7),
                lido        = false,
            });
        }

        // Result set 4: zonas seguras completas de todas as crianças
        await reader.NextResultAsync();
        while (await reader.ReadAsync())
        {
            zonas.Add(new
            {
                id         = reader.GetGuid(0),
                criancaId  = reader.GetGuid(1),
                nome       = reader.GetString(2),
                tipo       = reader.GetString(3),
                latitude   = reader.IsDBNull(4) ? (double?)null : reader.GetDouble(4),
                longitude  = reader.IsDBNull(5) ? (double?)null : reader.GetDouble(5),
                raioMetros = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                cor        = reader.GetString(7),
            });
        }

        // Fechamos o reader antes de emitir o próximo comando na mesma conexão.
        await reader.CloseAsync();

        // ── CORREÇÃO N+1 ─────────────────────────────────────────────────────
        // Versão anterior: 1 SELECT TOP 1 por criança com pulseira (loop N+1).
        // Versão atual:    1 única query com ROW_NUMBER() PARTITION BY PulseiraId,
        //                  independente do número de crianças/pulseiras.
        //
        // A subquery numera cada linha dentro de cada pulseira (mais recente = 1).
        // O SELECT externo filtra rn = 1, entregando apenas a última por pulseira.
        // ─────────────────────────────────────────────────────────────────────
        var pulseiraIds = criancasBrutas
            .Where(c => c.PulseiraId != null)
            .Select(c => c.PulseiraId!.Value)
            .ToHashSet();

        // Dicionário PulseiraId → última localização (carregado de uma só vez)
        var ultimasLocalizacoes = new Dictionary<Guid, (double Lat, double Lng, DateTime Em)>();

        if (pulseiraIds.Count > 0)
        {
            // Monta parâmetros nomeados @P0, @P1… para o IN clause.
            // Nunca concatenamos GUIDs diretamente na string SQL (SQL Injection).
            await using var cmdLoc = conn.CreateCommand();
            cmdLoc.CommandTimeout = 15;

            var nomes = new List<string>();
            foreach (var (pid, idx) in pulseiraIds.Select((p, i) => (p, i)))
            {
                var nome = $"@P{idx}";
                nomes.Add(nome);
                cmdLoc.Parameters.Add(nome, System.Data.SqlDbType.UniqueIdentifier).Value = pid;
            }

            cmdLoc.CommandText = $@"
                SELECT PulseiraId, Latitude, Longitude, RegistradoEm
                FROM (
                    SELECT PulseiraId, Latitude, Longitude, RegistradoEm,
                           ROW_NUMBER() OVER (PARTITION BY PulseiraId ORDER BY RegistradoEm DESC) AS rn
                    FROM app.Localizacoes
                    WHERE PulseiraId IN ({string.Join(",", nomes)})
                ) ranked
                WHERE rn = 1";

            await using var readerLoc = await cmdLoc.ExecuteReaderAsync();
            while (await readerLoc.ReadAsync())
            {
                ultimasLocalizacoes[readerLoc.GetGuid(0)] = (
                    readerLoc.GetDouble(1),
                    readerLoc.GetDouble(2),
                    readerLoc.GetDateTime(3)
                );
            }
        }

        // Monta resposta cruzando crianças com localização pré-carregada (O(1) lookup)
        var criancasComLocalizacao = criancasBrutas.Select(c =>
        {
            object? ultimaLoc = null;
            if (c.PulseiraId != null && ultimasLocalizacoes.TryGetValue(c.PulseiraId.Value, out var loc))
            {
                ultimaLoc = new
                {
                    lat         = loc.Lat,
                    lng         = loc.Lng,
                    capturadoEm = loc.Em,
                };
            }

            return (object)new
            {
                id                = c.Id,
                nomeCompleto      = c.NomeCompleto,
                apelido           = c.Apelido,
                dataNascimento    = c.DataNascimento,
                fotoUrl           = c.FotoUrl,
                genero            = c.Genero,
                escolaNome        = c.EscolaNome,
                consentimentoLGPD = c.ConsentimentoLGPD,
                pulseiraId        = c.PulseiraId,
                statusConexao     = c.StatusConexao,
                nivelBateria      = c.NivelBateria,
                ultimaComunicacao = c.UltimaComunicacao,
                codigoDispositivo = c.CodigoDispositivo,
                ultimaLocalizacao = ultimaLoc,
            };
        }).ToList();

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
