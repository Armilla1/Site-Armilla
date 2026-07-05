

-- ==========================================
-- TABELAS FALTANTES DE SEGURANÇA
-- ==========================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LoginTentativas' AND schema_id = SCHEMA_ID('security'))
BEGIN
    CREATE TABLE security.LoginTentativas (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        ResponsavelId UNIQUEIDENTIFIER NULL,
        Sucesso BIT NOT NULL,
        EnderecoIP NVARCHAR(45) NULL,
        UserAgent NVARCHAR(500) NULL,
        DataHora DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TokensConfirmacao' AND schema_id = SCHEMA_ID('app'))
BEGIN
    CREATE TABLE app.TokensConfirmacao (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ResponsavelId UNIQUEIDENTIFIER NOT NULL REFERENCES app.Responsaveis(Id),
        TokenHash NVARCHAR(255) NOT NULL,
        Tipo NVARCHAR(50) NOT NULL,
        ExpiraEm DATETIME2 NOT NULL,
        Utilizado BIT NOT NULL DEFAULT 0,
        UtilizadoEm DATETIME2 NULL,
        CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ==========================================
-- STORED PROCEDURES DE AUTENTICAÇÃO
-- ==========================================

-- 1. security.sp_CriarResponsavel
CREATE OR ALTER PROCEDURE security.sp_CriarResponsavel
    @NomeCompleto NVARCHAR(255),
    @Email NVARCHAR(255),
    @SenhaHash NVARCHAR(255),
    @SenhaSalt NVARCHAR(255),
    @Telefone NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (SELECT 1 FROM app.Responsaveis WHERE Email = @Email)
    BEGIN
        SELECT 'EMAIL_DUPLICADO' AS Status, NULL AS NovoId;
        RETURN;
    END

    DECLARE @NovoId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO app.Responsaveis (Id, NomeCompleto, Email, SenhaHash, SenhaSalt, Telefone, ContaAtiva, EmailConfirmado)
    VALUES (@NovoId, @NomeCompleto, @Email, @SenhaHash, @SenhaSalt, @Telefone, 1, 0);

    SELECT 'CRIADO' AS Status, @NovoId AS NovoId;
END;
GO

-- 2. security.sp_AutenticarResponsavel
CREATE OR ALTER PROCEDURE security.sp_AutenticarResponsavel
    @Email NVARCHAR(320),
    @EnderecoIP NVARCHAR(45),
    @UserAgent NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RespId UNIQUEIDENTIFIER;
    DECLARE @Hash NVARCHAR(255);
    DECLARE @Salt NVARCHAR(255);
    DECLARE @ContaAtiva BIT;
    
    SELECT @RespId = Id, @Hash = SenhaHash, @Salt = SenhaSalt, @ContaAtiva = ContaAtiva
    FROM app.Responsaveis
    WHERE Email = @Email;

    IF @RespId IS NULL
    BEGIN
        SELECT 'NAO_ENCONTRADO' AS Status, NULL AS ResponsavelId, NULL AS SenhaHash, NULL AS SenhaSalt;
        RETURN;
    END
    
    IF @ContaAtiva = 0
    BEGIN
        SELECT 'CONTA_BLOQUEADA' AS Status, @RespId AS ResponsavelId, @Hash AS SenhaHash, @Salt AS SenhaSalt;
        RETURN;
    END
    
    SELECT 'PERMITIDO' AS Status, @RespId AS ResponsavelId, @Hash AS SenhaHash, @Salt AS SenhaSalt;
END;
GO

-- 3. security.sp_RegistrarResultadoLogin
CREATE OR ALTER PROCEDURE security.sp_RegistrarResultadoLogin
    @ResponsavelId UNIQUEIDENTIFIER,
    @Sucesso BIT,
    @EnderecoIP NVARCHAR(45),
    @UserAgent NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO security.LoginTentativas (ResponsavelId, Sucesso, EnderecoIP, UserAgent, DataHora)
    VALUES (@ResponsavelId, @Sucesso, @EnderecoIP, @UserAgent, SYSUTCDATETIME());
    
    IF @Sucesso = 1
    BEGIN
        UPDATE app.Responsaveis SET UltimoLoginEm = SYSUTCDATETIME() WHERE Id = @ResponsavelId;
    END
END;
GO

-- 4. app.sp_CriarTokenConfirmacaoEmail
CREATE OR ALTER PROCEDURE app.sp_CriarTokenConfirmacaoEmail
    @ResponsavelId UNIQUEIDENTIFIER,
    @TokenHash NVARCHAR(255),
    @Tipo NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO app.TokensConfirmacao (ResponsavelId, TokenHash, Tipo, ExpiraEm)
    VALUES (@ResponsavelId, @TokenHash, @Tipo, DATEADD(minute, 30, SYSUTCDATETIME()));
END;
GO

-- 5. app.sp_ValidarTokenConfirmacaoEmail
CREATE OR ALTER PROCEDURE app.sp_ValidarTokenConfirmacaoEmail
    @ResponsavelId UNIQUEIDENTIFIER,
    @TokenHash NVARCHAR(255),
    @Tipo NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TokenId UNIQUEIDENTIFIER;
    
    SELECT @TokenId = Id
    FROM app.TokensConfirmacao
    WHERE ResponsavelId = @ResponsavelId 
      AND TokenHash = @TokenHash
      AND Tipo = @Tipo
      AND Utilizado = 0
      AND ExpiraEm > SYSUTCDATETIME();
      
    IF @TokenId IS NOT NULL
    BEGIN
        UPDATE app.TokensConfirmacao SET Utilizado = 1, UtilizadoEm = SYSUTCDATETIME() WHERE Id = @TokenId;
        UPDATE app.Responsaveis SET EmailConfirmado = 1 WHERE Id = @ResponsavelId;
        SELECT 'TOKEN_VALIDADO' AS Status;
    END
    ELSE
    BEGIN
        SELECT 'TOKEN_INVALIDO' AS Status;
    END
END;
GO
