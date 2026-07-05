// =============================================================================
// ARMILLA SEGURA — Controller de Histórico de Movimentação
// Arquivo: HistoricoController.cs
// LOCALIZAÇÃO: Armilla_Backend/Controllers/HistoricoController.cs
// =============================================================================
// CONECTA COM:
//   - app.Localizacoes (já existia em armilla_database.sql desde o início —
//     é a mesma tabela onde IngestaoController e SimulacaoController gravam
//     cada ponto de GPS recebido. Esse endpoint só LÊ o que já vinha sendo
//     gravado; nada novo precisou ser criado no banco pra isso, só faltava
//     o endpoint).
//   - Frontend: Dashboard.jsx → aba "Histórico" (o seletor de criança+data
//     já existia na tela, mas era só um placeholder sem chamar nada).
// =============================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace Armilla.Backend.Controllers;

[ApiController]
[Route("api/historico")]
[Authorize]
[EnableRateLimiting("Geral")]
public class HistoricoController : ControllerBase
{
    private readonly IConfiguration _config;

    public HistoricoController(IConfiguration config)
    {
        _config = config;
    }

    private Guid ResponsavelIdAtual() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token sem identificador de usuário."));

    // =========================================================================
    // GET /api/historico?criancaId={id}&data=2026-06-21
    // Retorna todos os pontos de GPS daquele dia, em ordem cronológica —
    // o frontend desenha isso como uma polyline (trajeto) no mapa.
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Obter([FromQuery] Guid criancaId, [FromQuery] DateOnly data)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Confirma posse da criança (anti-IDOR) e descobre a pulseira dela.
        // Uma criança pode já ter trocado de pulseira no passado — por isso
        // pegamos TODAS as pulseiras já vinculadas a ela, não só a atual,
        // pra não perder histórico de uma pulseira antiga.
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandTimeout = 10;
        cmdValida.CommandText = @"
            SELECT p.Id FROM app.Pulseiras p
            INNER JOIN app.Criancas c ON c.Id = p.CriancaId
            WHERE p.CriancaId = @CriancaId AND c.ResponsavelId = @ResponsavelId";
        cmdValida.Parameters.Add("@CriancaId",    System.Data.SqlDbType.UniqueIdentifier).Value = criancaId;
        cmdValida.Parameters.Add("@ResponsavelId",System.Data.SqlDbType.UniqueIdentifier).Value = responsavelId;

        var pulseiraIds = new List<Guid>();
        await using (var reader = await cmdValida.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
                pulseiraIds.Add(reader.GetGuid(0));
        }

        if (pulseiraIds.Count == 0)
            return Ok(new { pontos = Array.Empty<object>(), distanciaTotalMetros = 0.0 });

        var inicio = data.ToDateTime(TimeOnly.MinValue);
        var fim    = data.ToDateTime(TimeOnly.MaxValue);

        await using var cmd = conn.CreateCommand();
        cmd.CommandTimeout = 15;
        cmd.CommandText = @"
            SELECT Latitude, Longitude, Precisao, RegistradoEm
            FROM app.Localizacoes
            WHERE PulseiraId IN ({0}) AND RegistradoEm BETWEEN @Inicio AND @Fim
            ORDER BY RegistradoEm ASC";

        // Monta a lista de pulseiras dinamicamente como parâmetros nomeados
        // (em vez de concatenar os GUIDs direto na string, que abriria
        // espaço pra SQL injection) — cada Id vira um parâmetro @P0, @P1...
        var nomesParametros = new List<string>();
        for (int i = 0; i < pulseiraIds.Count; i++)
        {
            var nome = $"@P{i}";
            nomesParametros.Add(nome);
            cmd.Parameters.Add(nome, System.Data.SqlDbType.UniqueIdentifier).Value = pulseiraIds[i];
        }
        cmd.CommandText = string.Format(cmd.CommandText, string.Join(",", nomesParametros));
        cmd.Parameters.Add("@Inicio", System.Data.SqlDbType.DateTime2).Value = inicio;
        cmd.Parameters.Add("@Fim",    System.Data.SqlDbType.DateTime2).Value = fim;

        var pontos = new List<(double Lat, double Lng, DateTime Em)>();
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                pontos.Add((
                    reader.GetDouble(0),
                    reader.GetDouble(1),
                    reader.GetDateTime(3)
                ));
            }
        }

        // Calcula a distância total percorrida (soma de Haversine entre
        // pontos consecutivos) — informação simples que ajuda a entender o
        // dia, sem precisar de nenhuma lógica nova: é a mesma fórmula já
        // usada na verificação de zona segura, só repetida em C# em vez de
        // SQL porque aqui já temos os pontos em memória.
        double distanciaTotal = 0;
        for (int i = 1; i < pontos.Count; i++)
        {
            distanciaTotal += DistanciaMetros(pontos[i - 1].Lat, pontos[i - 1].Lng, pontos[i].Lat, pontos[i].Lng);
        }

        return Ok(new
        {
            pontos = pontos.Select(p => new { lat = p.Lat, lng = p.Lng, registradoEm = p.Em }),
            distanciaTotalMetros = Math.Round(distanciaTotal, 1),
        });
    }

    // Fórmula de Haversine — mesma usada em LocalizacaoProcessor, só em C#
    private static double DistanciaMetros(double lat1, double lng1, double lat2, double lng2)
    {
        const double raioTerraMetros = 6371000;
        var dLat = DegToRad(lat2 - lat1);
        var dLng = DegToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegToRad(lat1)) * Math.Cos(DegToRad(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(Math.Max(0, 1 - a)));
        return raioTerraMetros * c;
    }

    private static double DegToRad(double graus) => graus * Math.PI / 180.0;
}
