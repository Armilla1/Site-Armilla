

-- Schemas
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'app') EXEC('CREATE SCHEMA app');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit') EXEC('CREATE SCHEMA audit');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'security') EXEC('CREATE SCHEMA security');
GO

-- 1. app.Responsaveis
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Responsaveis' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.Responsaveis (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        NomeCompleto NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        SenhaHash NVARCHAR(255) NOT NULL,
        SenhaSalt NVARCHAR(255) NULL,
        Telefone NVARCHAR(20) NULL,
        FotoUrl NVARCHAR(500) NULL,
        EmailConfirmado BIT NOT NULL DEFAULT 0,
        Idade INT NULL,
        ContaAtiva BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        AtualizadoEm DATETIME2 NULL,
        UltimoLoginEm DATETIME2 NULL
    );
END
GO

-- 2. app.RecuperacaoSenha
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RecuperacaoSenha' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.RecuperacaoSenha (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        TokenHash NVARCHAR(255) NOT NULL,
        TokenExpiraEm DATETIME2 NOT NULL,
        EnderecoIPSolicitante NVARCHAR(50) NULL,
        Utilizado BIT NOT NULL DEFAULT 0,
        UtilizadoEm DATETIME2 NULL
    );
END
GO

-- 3. app.FotosPerfil
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FotosPerfil' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.FotosPerfil (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        NomeArquivo NVARCHAR(255) NOT NULL,
        ContentType NVARCHAR(100) NOT NULL,
        UrlPublica NVARCHAR(500) NOT NULL
    );
END
GO

-- 4. app.Criancas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Criancas' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.Criancas (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        NomeCompleto NVARCHAR(255) NOT NULL,
        Apelido NVARCHAR(100) NULL,
        DataNascimento DATE NOT NULL,
        FotoUrl NVARCHAR(500) NULL,
        Genero NVARCHAR(50) NULL,
        EscolaNome NVARCHAR(255) NULL,
        ConsentimentoLGPD BIT NOT NULL DEFAULT 1,
        ConsentimentoEm DATETIME2 NULL,
        Ativo BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        AtualizadoEm DATETIME2 NULL
    );
END
GO

-- 5. app.DadosMedicos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DadosMedicos' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.DadosMedicos (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CriancaId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Criancas(Id),
        TipoSanguineo NVARCHAR(5) NULL,
        Peso DECIMAL(5,2) NULL,
        Altura DECIMAL(5,2) NULL,
        PlanoDeSaude NVARCHAR(255) NULL,
        AlergiasDescricao NVARCHAR(MAX) NULL,
        MedicamentosUso NVARCHAR(MAX) NULL,
        CondicoesEspeciais NVARCHAR(MAX) NULL,
        ObservacoesUrgencia NVARCHAR(MAX) NULL,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        AtualizadoEm DATETIME2 NULL
    );
END
GO

-- 6. app.Pulseiras
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Pulseiras' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.Pulseiras (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CriancaId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Criancas(Id),
        CodigoDispositivo NVARCHAR(100) NOT NULL UNIQUE,
        TokenDispositivo NVARCHAR(255) NULL,
        ModeloPulseira NVARCHAR(100) NULL,
        StatusConexao NVARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
        NivelBateria INT NULL,
        UltimaComunicacao DATETIME2 NULL,
        Ativa BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 7. app.Localizacoes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Localizacoes' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.Localizacoes (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        PulseiraId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Pulseiras(Id),
        Latitude FLOAT NOT NULL,
        Longitude FLOAT NOT NULL,
        Precisao FLOAT NULL,
        RegistradoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 8. app.ZonasSeguras
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ZonasSeguras' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.ZonasSeguras (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CriancaId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Criancas(Id),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        Nome NVARCHAR(200) NOT NULL,
        Tipo NVARCHAR(50) NOT NULL DEFAULT 'CIRCULO',
        Latitude FLOAT NOT NULL,
        Longitude FLOAT NOT NULL,
        RaioMetros FLOAT NOT NULL,
        Cor NVARCHAR(20) NULL,
        Ativa BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 9. app.RotasSeguras
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RotasSeguras' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.RotasSeguras (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CriancaId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Criancas(Id),
        Nome NVARCHAR(200) NOT NULL,
        DescricaoRota NVARCHAR(MAX) NULL,
        Tipo NVARCHAR(50) NULL,
        OrigemLat FLOAT NOT NULL,
        OrigemLng FLOAT NOT NULL,
        OrigemNome NVARCHAR(200) NULL,
        DestinoLat FLOAT NOT NULL,
        DestinoLng FLOAT NOT NULL,
        DestinoNome NVARCHAR(200) NULL,
        PontosIntermediarios NVARCHAR(MAX) NULL,
        ToleranciaMetros FLOAT NOT NULL DEFAULT 100,
        Ativa BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 10. app.ContatosEmergencia
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ContatosEmergencia' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.ContatosEmergencia (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        Nome NVARCHAR(200) NOT NULL,
        Relacao NVARCHAR(100) NULL,
        Telefone NVARCHAR(20) NOT NULL,
        TipoContato NVARCHAR(30) NOT NULL,
        Prioridade SMALLINT NOT NULL DEFAULT 1,
        Ativo BIT NOT NULL DEFAULT 1,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        AtualizadoEm DATETIME2 NULL
    );
END
GO

-- 11. app.DispositivosConectados
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DispositivosConectados' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.DispositivosConectados (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        PulseiraId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Pulseiras(Id),
        Latitude FLOAT NULL,
        Longitude FLOAT NULL,
        IP NVARCHAR(50) NULL,
        UserAgent NVARCHAR(MAX) NULL,
        ConectadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 12. app.Alertas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Alertas' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.Alertas (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        CriancaId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Criancas(Id),
        TipoAlerta NVARCHAR(100) NOT NULL,
        Descricao NVARCHAR(MAX) NOT NULL,
        Severidade NVARCHAR(50) NOT NULL,
        Latitude FLOAT NULL,
        Longitude FLOAT NULL,
        Lido BIT NOT NULL DEFAULT 0,
        LidoEm DATETIME2 NULL,
        LidoPorId UNIQUEIDENTIFIER NULL,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 13. audit.LogAcoes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LogAcoes' AND schema_id = SCHEMA_ID('audit'))
BEGIN
    CREATE TABLE audit.LogAcoes (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        ResponsavelId UNIQUEIDENTIFIER NULL,
        Acao NVARCHAR(255) NOT NULL,
        EnderecoIP NVARCHAR(50) NULL,
        UserAgent NVARCHAR(MAX) NULL,
        Sucesso BIT NOT NULL,
        MensagemErro NVARCHAR(MAX) NULL,
        Detalhes NVARCHAR(MAX) NULL,
        DataHora DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 14. security.RefreshTokens
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefreshTokens' AND schema_id = SCHEMA_ID('security'))
BEGIN
    CREATE TABLE security.RefreshTokens (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        TokenHash NVARCHAR(255) NOT NULL,
        DispositivoInfo NVARCHAR(MAX) NULL,
        ExpiraEm DATETIME2 NOT NULL,
        Revogado BIT NOT NULL DEFAULT 0,
        RevogadoEm DATETIME2 NULL,
        MotivoRevogacao NVARCHAR(255) NULL,
        SubstituidoPorToken NVARCHAR(255) NULL,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ==========================================
-- Stored Procedures
-- ==========================================

CREATE OR ALTER PROCEDURE app.sp_ObterDashboardResponsavel
    @ResponsavelId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- 1: Responsavel
    SELECT Id, NomeCompleto, Email, Telefone, FotoUrl, EmailConfirmado, Idade, CriadoEm, UltimoLoginEm
    FROM app.Responsaveis
    WHERE Id = @ResponsavelId;

    -- 2: Crianças e pulseiras
    SELECT 
        c.Id, c.NomeCompleto, c.Apelido, c.DataNascimento, c.FotoUrl, c.Genero, c.EscolaNome, c.ConsentimentoLGPD,
        p.Id AS PulseiraId, p.StatusConexao, p.NivelBateria, p.UltimaComunicacao, p.CodigoDispositivo
    FROM app.Criancas c
    LEFT JOIN app.Pulseiras p ON p.CriancaId = c.Id AND p.Ativa = 1
    WHERE c.ResponsavelId = @ResponsavelId AND c.Ativo = 1;

    -- 3: Alertas nao lidos
    SELECT 
        a.Id, a.TipoAlerta, a.Descricao, a.Severidade, a.Latitude, a.Longitude, a.CriadoEm, c.NomeCompleto AS NomeCrianca
    FROM app.Alertas a
    INNER JOIN app.Criancas c ON c.Id = a.CriancaId
    WHERE c.ResponsavelId = @ResponsavelId AND a.Lido = 0
    ORDER BY a.CriadoEm DESC;

    -- 4: Zonas seguras
    SELECT 
        z.Id, z.CriancaId, z.Nome, z.Tipo, z.Latitude, z.Longitude, z.RaioMetros, z.Cor, z.CriadoEm
    FROM app.ZonasSeguras z
    INNER JOIN app.Criancas c ON c.Id = z.CriancaId
    WHERE c.ResponsavelId = @ResponsavelId AND z.Ativa = 1;
END;
GO
