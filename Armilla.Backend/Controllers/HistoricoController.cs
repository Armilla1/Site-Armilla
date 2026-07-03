// =============================================================================
// ARMILLA SEGURA â€” Controller de HistÃ³rico de MovimentaÃ§Ã£o
// Arquivo: HistoricoController.cs
// LOCALIZAÃ‡ÃƒO: Armilla_Backend/Controllers/HistoricoController.cs
// =============================================================================
// CONECTA COM:
//   - app.Localizacoes (jÃ¡ existia em armilla_database.sql desde o inÃ­cio â€”
//     Ã© a mesma tabela onde IngestaoController e SimulacaoController gravam
//     cada ponto de GPS recebido. Esse endpoint sÃ³ LÃŠ o que jÃ¡ vinha sendo
//     gravado; nada novo precisou ser criado no banco pra isso, sÃ³ faltava
//     o endpoint).
//   - Frontend: Dashboard.jsx â†’ aba "HistÃ³rico" (o seletor de crianÃ§a+data
//     jÃ¡ existia na tela, mas era sÃ³ um placeholder sem chamar nada).
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
            ?? throw new InvalidOperationException("Token sem identificador de usuÃ¡rio."));

    // =========================================================================
    // GET /api/historico?criancaId={id}&data=2026-06-21
    // Retorna todos os pontos de GPS daquele dia, em ordem cronolÃ³gica â€”
    // o frontend desenha isso como uma polyline (trajeto) no mapa.
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> Obter([FromQuery] Guid criancaId, [FromQuery] DateOnly data)
    {
        var responsavelId = ResponsavelIdAtual();
        var connectionString = _config.GetConnectionString("ArmillaDB")!;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        // Confirma posse da crianÃ§a (anti-IDOR) e descobre a pulseira dela.
        // Uma crianÃ§a pode jÃ¡ ter trocado de pulseira no passado â€” por isso
        // pegamos TODAS as pulseiras jÃ¡ vinculadas a ela, nÃ£o sÃ³ a atual,
        // pra nÃ£o perder histÃ³rico de uma pulseira antiga.
        await using var cmdValida = conn.CreateCommand();
        cmdValida.CommandText = @"
            SELECT p.Id FROM app.Pulseiras p
            INNER JOIN app.Criancas c ON c.Id = p.CriancaId
            WHERE p.CriancaId = @CriancaId AND c.ResponsavelId = @ResponsavelId";
        cmdValida.Parameters.AddWithValue("@CriancaId", criancaId);
        cmdValida.Parameters.AddWithValue("@ResponsavelId", responsavelId);

        var pulseiraIds = new List<Guid>();
        await using (var reader = await cmdValida.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
                pulseiraIds.Add(reader.GetGuid(0));
        }

        if (pulseiraIds.Count == 0)
            return Ok(new { pontos = Array.Empty<object>(), distanciaTotalMetros = 0.0 });

        var inicio = data.ToDateTime(TimeOnly.MinValue);
        var fim = data.ToDateTime(TimeOnly.MaxValue);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT Latitude, Longitude, Precisao, RegistradoEm
            FROM app.Localizacoes
            WHERE PulseiraId IN ({0}) AND RegistradoEm BETWEEN @Inicio AND @Fim
            ORDER BY RegistradoEm ASC";

        // Monta a lista de pulseiras dinamicamente como parÃ¢metros nomeados
        // (em vez de concatenar os GUIDs direto na string, que abriria
        // espaÃ§o pra SQL injection) â€” cada Id vira um parÃ¢metro @P0, @P1...
        var nomesParametros = new List<string>();
        for (int i = 0; i < pulseiraIds.Count; i++)
        {
            var nome = $"@P{i}";
            nomesParametros.Add(nome);
            cmd.Parameters.AddWithValue(nome, pulseiraIds[i]);
        }
        cmd.CommandText = string.Format(cmd.CommandText, string.Join(",", nomesParametros));
        cmd.Parameters.AddWithValue("@Inicio", inicio);
        cmd.Parameters.AddWithValue("@Fim", fim);

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

        // Calcula a distÃ¢ncia total percorrida (soma de Haversine entre
        // pontos consecutivos) â€” informaÃ§Ã£o simples que ajuda a entender o
        // dia, sem precisar de nenhuma lÃ³gica nova: Ã© a mesma fÃ³rmula jÃ¡
        // usada na verificaÃ§Ã£o de zona segura, sÃ³ repetida em C# em vez de
        // SQL porque aqui jÃ¡ temos os pontos em memÃ³ria.
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

    // FÃ³rmula de Haversine â€” mesma usada em LocalizacaoProcessor, sÃ³ em C#
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

