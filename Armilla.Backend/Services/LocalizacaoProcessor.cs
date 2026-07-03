// =============================================================================
// ARMILLA SEGURA — Processador compartilhado de Localização
// Arquivo: LocalizacaoProcessor.cs
// LOCALIZAÇÃO: Armilla_Backend/Services/LocalizacaoProcessor.cs
// =============================================================================
// POR QUE ISSO EXISTE:
//   Tanto o IngestaoController (pulseira física, via rede celular) quanto o
//   SimulacaoController (responsável testando o sistema pelo navegador)
//   precisam fazer EXATAMENTE a mesma coisa depois de receber uma
//   coordenada: gravar no histórico, atualizar bateria/status, checar se a
//   criança saiu de alguma zona segura, e disparar alerta se precisar.
//
//   Antes essa lógica só existia dentro do IngestaoController. Em vez de
//   copiar e colar tudo de novo no SimulacaoController (o que criaria dois
//   lugares pra manter o mesmo cálculo de distância — e um deles
//   inevitavelmente ficaria desatualizado quando um dos dois fosse
//   corrigido no futuro), ela foi extraída pra aqui. Os dois controllers
//   chamam o mesmo método.
//
// O QUE NÃO MUDOU:
//   A fórmula de Haversine (cálculo de distância) e a lógica de zona/bateria
//   são exatamente as mesmas que já existiam e já foram revisadas antes —
//   só foram movidas de lugar, não alteradas.
// =============================================================================

using Microsoft.Data.SqlClient;

namespace Armilla.Backend.Services;

public static class LocalizacaoProcessor
{
    // =========================================================================
    // Processa uma coordenada recebida: grava histórico, atualiza a pulseira,
    // verifica zonas seguras e dispara alertas quando necessário.
    //
    // PRESUME que pulseiraId/criancaId já foram validados pelo chamador
    // (cada controller tem sua própria forma de autenticar — token de
    // dispositivo no caso da pulseira real, JWT + anti-IDOR no caso da
    // simulação — então a validação de "quem pode mandar isso" não entra
    // aqui, só o que acontece DEPOIS que já se sabe que é legítimo).
    // =========================================================================
    public static async Task ProcessarAsync(
        SqlConnection conn,
        Guid pulseiraId,
        Guid criancaId,
        double latitude,
        double longitude,
        int nivelBateria,
        double? precisaoMetros,
        ILogger logger)
    {
        // PASSO 1: grava a localização no histórico
        await using (var cmdLoc = conn.CreateCommand())
        {
            cmdLoc.CommandText = @"
                INSERT INTO app.Localizacoes (PulseiraId, Latitude, Longitude, Precisao, RegistradoEm)
                VALUES (@PulseiraId, @Lat, @Lng, @Precisao, SYSUTCDATETIME())";
            cmdLoc.Parameters.AddWithValue("@PulseiraId", pulseiraId);
            cmdLoc.Parameters.AddWithValue("@Lat", latitude);
            cmdLoc.Parameters.AddWithValue("@Lng", longitude);
            cmdLoc.Parameters.AddWithValue("@Precisao", (object?)precisaoMetros ?? DBNull.Value);
            await cmdLoc.ExecuteNonQueryAsync();
        }

        // PASSO 2: atualiza status da pulseira (bateria, última comunicação, online)
        await using (var cmdStatus = conn.CreateCommand())
        {
            cmdStatus.CommandText = @"
                UPDATE app.Pulseiras
                SET NivelBateria = @Bateria, StatusConexao = 'ONLINE', UltimaComunicacao = SYSUTCDATETIME()
                WHERE Id = @Id";
            cmdStatus.Parameters.AddWithValue("@Bateria", nivelBateria);
            cmdStatus.Parameters.AddWithValue("@Id", pulseiraId);
            await cmdStatus.ExecuteNonQueryAsync();
        }

        // PASSO 3: verifica zonas seguras — se a criança tem zonas ativas e está
        // fora de TODAS elas, dispara um alerta de "saiu da zona segura"
        await using (var cmdZonas = conn.CreateCommand())
        {
            cmdZonas.CommandText = @"
                SELECT COUNT(*) FROM app.ZonasSeguras
                WHERE CriancaId = @CriancaId AND Ativa = 1 AND Tipo = 'CIRCULO'
                  AND (
                    6371000 * ACOS(
                        -- quando os dois pontos comparados são exatamente iguais
                        -- (ou quase), o produto interno do cosseno pode ultrapassar
                        -- 1.0 por erro de arredondamento de ponto flutuante. ACOS(x)
                        -- com x > 1 retorna NULL no SQL Server em vez de lançar erro
                        -- — CASE WHEN limita o argumento a no máximo 1.0 antes de
                        -- chamar ACOS, evitando falso alerta quando a criança está
                        -- exatamente no centro do círculo.
                        CASE
                            WHEN COS(RADIANS(@Lat)) * COS(RADIANS(Latitude)) *
                                 COS(RADIANS(Longitude) - RADIANS(@Lng)) +
                                 SIN(RADIANS(@Lat)) * SIN(RADIANS(Latitude)) > 1
                            THEN 1
                            ELSE COS(RADIANS(@Lat)) * COS(RADIANS(Latitude)) *
                                 COS(RADIANS(Longitude) - RADIANS(@Lng)) +
                                 SIN(RADIANS(@Lat)) * SIN(RADIANS(Latitude))
                        END
                    )
                  ) <= RaioMetros";
            cmdZonas.Parameters.AddWithValue("@CriancaId", criancaId);
            cmdZonas.Parameters.AddWithValue("@Lat", latitude);
            cmdZonas.Parameters.AddWithValue("@Lng", longitude);
            var dentroDeAlgumaZona = (int)(await cmdZonas.ExecuteScalarAsync())! > 0;

            await using (var cmdTotalZonas = conn.CreateCommand())
            {
                cmdTotalZonas.CommandText = @"
                    SELECT COUNT(*) FROM app.ZonasSeguras WHERE CriancaId = @CriancaId AND Ativa = 1";
                cmdTotalZonas.Parameters.AddWithValue("@CriancaId", criancaId);
                var totalZonas = (int)(await cmdTotalZonas.ExecuteScalarAsync())!;

                if (totalZonas > 0 && !dentroDeAlgumaZona)
                {
                    await using var cmdAlerta = new SqlCommand("app.sp_CriarAlerta", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };
                    cmdAlerta.Parameters.AddWithValue("@PulseiraId", pulseiraId);
                    cmdAlerta.Parameters.AddWithValue("@CriancaId", criancaId);
                    cmdAlerta.Parameters.AddWithValue("@TipoAlerta", "SAIU_ZONA_SEGURA");
                    cmdAlerta.Parameters.AddWithValue("@Descricao", "A criança saiu de todas as zonas seguras cadastradas.");
                    cmdAlerta.Parameters.AddWithValue("@Latitude", latitude);
                    cmdAlerta.Parameters.AddWithValue("@Longitude", longitude);
                    cmdAlerta.Parameters.AddWithValue("@Severidade", "ALTO");
                    await cmdAlerta.ExecuteNonQueryAsync();
                    logger.LogInformation("Alerta SAIU_ZONA_SEGURA criado para criança {CriancaId}", criancaId);
                }
            }
        }

        // PASSO 4: bateria crítica dispara alerta separado
        if (nivelBateria <= 15)
        {
            await using var cmdAlertaBateria = new SqlCommand("app.sp_CriarAlerta", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            cmdAlertaBateria.Parameters.AddWithValue("@PulseiraId", pulseiraId);
            cmdAlertaBateria.Parameters.AddWithValue("@CriancaId", criancaId);
            cmdAlertaBateria.Parameters.AddWithValue("@TipoAlerta", "BATERIA_BAIXA");
            cmdAlertaBateria.Parameters.AddWithValue("@Descricao", $"A pulseira está com {nivelBateria}% de bateria.");
            cmdAlertaBateria.Parameters.AddWithValue("@Latitude", latitude);
            cmdAlertaBateria.Parameters.AddWithValue("@Longitude", longitude);
            cmdAlertaBateria.Parameters.AddWithValue("@Severidade", nivelBateria <= 5 ? "CRITICO" : "MEDIO");
            await cmdAlertaBateria.ExecuteNonQueryAsync();
        }
    }
}
