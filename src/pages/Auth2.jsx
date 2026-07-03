// =============================================================================
// Auth.jsx — Página de autenticação do Armilla
// LOCALIZAÇÃO: src/pages/Auth.jsx
//
// FLUXO COMPLETO:
//   [input onChange] → handleChange() → atualiza estado `form`
//   [botão onClick]  → handleLogin() ou handleCadastro()
//                   → fetch() → POST para a API C# (AuthController.cs)
//                   → sucesso: salva token, navega | erro: exibe mensagem
//
// ARQUIVOS BACKEND RELACIONADOS:
//   AuthController.cs            → rotas POST /api/auth/login e /api/auth/cadastro
//   SecurityConfig.cs            → JWT, CORS com AllowCredentials(), RateLimit
//   Program.cs                   → pipeline de middlewares (CORS → Auth → Controllers)
//   appsettings.Development.json → connection string, JWT secret, IgnoreHttps
//   armilla_database.sql         → tabelas app.Responsaveis, security.RefreshTokens
// =============================================================================

import { useState } from "react";
import { API_URL } from "../config/api.jsx";
import MillaImg from "../assets/MillaSemFundo.png";
import "./Auth.css";

// =============================================================================
// COMPONENTE PRINCIPAL
// Props recebidas de App.jsx:
//   onNavigate  (func)   → navega entre páginas
//   initialMode (string) → 'login' | 'register' | 'forgot'
// =============================================================================
const Auth = ({ onNavigate, initialMode = "login" }) => {

  // ── MODO ATIVO DO FORMULÁRIO ──────────────────────────────────────────────
  const [mode, setMode] = useState(initialMode);

  // ── VISIBILIDADE DA SENHA ─────────────────────────────────────────────────
  const [showPass, setShowPass] = useState(false);

  // ── ESTADO DO FORMULÁRIO ──────────────────────────────────────────────────
  // Todos os inputs são "controlados": o React é a fonte da verdade.
  // Cada campo mapeia 1:1 com o que o backend espera:
  //
  //   form.name     → CadastroDto.NomeCompleto  (banco: app.Responsaveis.NomeCompleto)
  //   form.email    → LoginDto.Email / CadastroDto.Email  (banco: app.Responsaveis.Email)
  //   form.password → LoginDto.Senha / CadastroDto.Senha  (banco: app.Responsaveis.SenhaHash — após BCrypt)
  //   form.confirm  → APENAS frontend, para validar antes de enviar. Nunca vai ao servidor.
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  // ── FEEDBACK VISUAL (erro ou sucesso) ────────────────────────────────────
  const [feedback, setFeedback] = useState({ tipo: "", msg: "" });

  // ── LOADING: desabilita botão durante a requisição ────────────────────────
  const [loading, setLoading] = useState(false);

  // ── handleChange: atualiza o estado a cada tecla digitada ────────────────
  // e.target.name  → qual campo (name, email, password, confirm)
  // e.target.value → o que foi digitado
  // O spread `...form` preserva os outros campos ao atualizar só um
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Troca de modo e limpa mensagens ──────────────────────────────────────
  const trocarModo = (novoModo) => {
    setMode(novoModo);
    setFeedback({ tipo: "", msg: "" });
  };

  // ==========================================================================
  // handleLogin — dispara ao clicar em "Entrar na minha conta"
  //
  // LEITURA DOS CAMPOS:
  //   form.email    → input[name="email"]    no bloco LOGIN
  //   form.password → input[name="password"] no bloco LOGIN
  //
  // DESTINO: POST /api/auth/login  (AuthController.cs → Login())
  //
  // CORPO ENVIADO (LoginDto no C#):
  //   { "Email": "...", "Senha": "..." }
  //
  // RESPOSTA DE SUCESSO (200):
  //   { accessToken, expiresIn: 900, nomeCompleto, email }
  //   + cookie HTTP-only "armilla_refresh" (30 dias) setado pelo browser automaticamente
  //
  // O accessToken é salvo no sessionStorage para usar em rotas protegidas.
  // ==========================================================================
  const handleLogin = async () => {
    setFeedback({ tipo: "", msg: "" });

    if (!form.email || !form.password) {
      setFeedback({ tipo: "erro", msg: "Preencha e-mail e senha." });
      return;
    }

    setLoading(true);
    try {
      // ── fetch para o backend ──────────────────────────────────────────────
      // credentials: "include" → obrigatório para o browser aceitar/enviar
      //              o cookie HTTP-only do Refresh Token.
      //              Funciona porque SecurityConfig.cs usa .AllowCredentials()
      //              junto com .WithOrigins() específico.
      const resposta = await fetch(`${API_URL}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",     // ← essencial para cookies HTTP-only
        body: JSON.stringify({
          Email: form.email,        // → LoginDto.Email no C#
          Senha: form.password,     // → LoginDto.Senha no C# (verificado com BCrypt)
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        // 401 → "Email ou senha inválidos."
        // 429 → "Conta temporariamente bloqueada..."
        // 500 → "Erro interno."
        throw new Error(dados.erro || dados.Erro || "Erro ao fazer login.");
      }

      // ── Sucesso: salva token e redireciona ───────────────────────────────
      // dados.accessToken  → JWT de 15 minutos, usado em requisições autenticadas
      // dados.nomeCompleto → nome para exibir na UI
      // dados.email        → email confirmado
      // O Refresh Token chegou como cookie HTTP-only — o browser já o guardou.
      sessionStorage.setItem("armilla_token", dados.accessToken);
      sessionStorage.setItem("armilla_usuario", JSON.stringify({
        nome:  dados.nomeCompleto,
        email: dados.email,
        emailConfirmado: dados.emailConfirmado ?? false,
      }));

      setFeedback({ tipo: "sucesso", msg: `Bem-vindo, ${dados.nomeCompleto}!` });
      // CORREÇÃO: login agora navega para "dashboard" (tela única do usuário)
      // em vez de "home". O dashboard é onde o responsável cadastra crianças,
      // conecta a pulseira, vê o mapa real e gerencia o perfil.
      setTimeout(() => onNavigate && onNavigate("dashboard"), 900);

    } catch (err) {
      setFeedback({ tipo: "erro", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // handleCadastro — dispara ao clicar em "Criar minha conta grátis"
  //
  // LEITURA DOS CAMPOS:
  //   form.name     → input[name="name"]     no bloco REGISTER
  //   form.email    → input[name="email"]    no bloco REGISTER
  //   form.password → input[name="password"] no bloco REGISTER
  //   form.confirm  → input[name="confirm"]  no bloco REGISTER (só validação local)
  //
  // DESTINO: POST /api/auth/cadastro  (AuthController.cs → Cadastro())
  //
  // CORPO ENVIADO (CadastroDto no C#):
  //   { "NomeCompleto": "...", "Email": "...", "Senha": "...", "Telefone": null }
  //
  // O backend faz:
  //   1. BCrypt.HashPassword(dto.Senha) — a senha nunca chega ao banco pura
  //   2. sp_CriarResponsavel() — insere em app.Responsaveis
  //
  // RESPOSTAS:
  //   201 Created  → conta criada → redireciona para login
  //   409 Conflict → email duplicado
  //   400 Bad Req  → falha de validação ([Required], [EmailAddress], regex de senha)
  // ==========================================================================
  const handleCadastro = async () => {
    setFeedback({ tipo: "", msg: "" });

    if (!form.name || !form.email || !form.password || !form.confirm) {
      setFeedback({ tipo: "erro", msg: "Preencha todos os campos." });
      return;
    }
    if (form.password !== form.confirm) {
      setFeedback({ tipo: "erro", msg: "As senhas não coincidem." });
      return;
    }

    // Mesma regex que CadastroDto.Senha no C#:
    // Exige: maiúscula, minúscula, número e símbolo (@$!%*?&)
    const senhaValida = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(form.password);
    if (!senhaValida) {
      setFeedback({
        tipo: "erro",
        msg: "Senha precisa ter maiúscula, minúscula, número e símbolo. Ex: Armilla@1",
      });
      return;
    }

    setLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/api/auth/cadastro`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Cadastro não precisa de credentials (não tem cookie ainda)
        body: JSON.stringify({
          NomeCompleto: form.name,      // → CadastroDto.NomeCompleto → app.Responsaveis.NomeCompleto
          Email:        form.email,     // → CadastroDto.Email → normalizado ToLowerInvariant() → app.Responsaveis.Email
          Senha:        form.password,  // → CadastroDto.Senha → BCrypt.HashPassword() → app.Responsaveis.SenhaHash
          Telefone:     null,           // → CadastroDto.Telefone (opcional, sem campo no form ainda)
        }),
      });

      const dados = await resposta.json();

      if (resposta.status === 409) {
        throw new Error("Este e-mail já está cadastrado. Tente fazer login.");
      }
      if (!resposta.ok) {
        // 400: validação do C# falhou (ex: senha fraca, email inválido)
        // O .NET retorna { title, errors } no formato ProblemDetails
        throw new Error(dados.title || dados.Erro || "Erro ao criar conta.");
      }

      // 201 Created — dados.mensagem = "Conta criada com sucesso."
      setFeedback({ tipo: "sucesso", msg: "Conta criada! Redirecionando para o login..." });
      setForm({ name: "", email: "", password: "", confirm: "" });
      setTimeout(() => trocarModo("login"), 1500);

    } catch (err) {
      setFeedback({ tipo: "erro", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // handleEsqueciSenha — dispara ao clicar em "Enviar link de recuperação"
  // CAMPO LIDO: form.email → input[name="email"] no bloco FORGOT
  // DESTINO FUTURO: POST /api/auth/esqueci-senha { Email: form.email }
  // Por ora: navega direto para chave-de-recuperacao (comportamento original)
  // ==========================================================================
  const handleEsqueciSenha = async () => {
    if (!form.email) {
      setFeedback({ tipo: "erro", msg: "Digite seu e-mail antes de continuar." });
      return;
    }

    setLoading(true);
    setFeedback({ tipo: "", msg: "" });
    try {
      // CONEXÃO REAL: POST /api/auth/esqueci-senha (ConfirmacaoController.cs)
      await fetch(`${API_URL}/api/auth/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: form.email }),
      });
      // Resposta é sempre genérica por segurança — navegamos independente
      // de o e-mail existir ou não (evita enumeração de contas).
      onNavigate && onNavigate("chave-de-recuperacao", { userEmail: form.email });
    } catch (err) {
      setFeedback({ tipo: "erro", msg: "Não foi possível processar o pedido. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // RENDERIZAÇÃO
  // ==========================================================================
  return (
    <div className="auth">

      {/* Fundo decorativo */}
      <div className="auth__bg">
        <div className="auth__orb auth__orb--1" />
        <div className="auth__orb auth__orb--2" />
        <div className="auth__orb auth__orb--3" />
        <div className="auth__grid-pattern" />
      </div>

      {/* Botão voltar ao site */}
      <button className="auth__back" onClick={() => onNavigate && onNavigate("home")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar ao site
      </button>

      {/* Card central */}
      <div className="auth__card">

        {/* Logo */}
        <div className="auth__logo" role="button" tabIndex={0}
          onClick={() => onNavigate && onNavigate("home")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate && onNavigate("home")}>
          <div className="auth__logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" stroke="url(#aLogoGrad)" strokeWidth="2" />
              <path d="M20 8C14 8 10 13 10 20C10 25 13 28 17 29C17 26 18 23 20 21C22 23 23 26 23 29C27 28 30 25 30 20C30 13 26 8 20 8Z"
                fill="url(#aLogoGrad2)" />
              <defs>
                <linearGradient id="aLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a855f7" /><stop offset="1" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient id="aLogoGrad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c084fc" /><stop offset="1" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="auth__logo-text">ARMILLA</span>
        </div>

        {/* Abas Login / Cadastrar (ocultas no modo forgot) */}
        {mode !== "forgot" && (
          <div className="auth__tabs">
            <button
              className={`auth__tab ${mode === "login" ? "auth__tab--active" : ""}`}
              onClick={() => trocarModo("login")}>
              Entrar
            </button>
            <button
              className={`auth__tab ${mode === "register" ? "auth__tab--active" : ""}`}
              onClick={() => trocarModo("register")}>
              Cadastrar
            </button>
          </div>
        )}

        {/* ── FEEDBACK (erro / sucesso) ────────────────────────────────────── */}
        {feedback.msg && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "12px",
            fontSize: "14px",
            background: feedback.tipo === "erro" ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)",
            color:      feedback.tipo === "erro" ? "#f87171" : "#4ade80",
            border:    `1px solid ${feedback.tipo === "erro" ? "#f8717133" : "#4ade8033"}`,
          }}>
            {feedback.msg}
          </div>
        )}

        {/* ================================================================== */}
        {/* FORMULÁRIO: LOGIN                                                   */}
        {/* Campos capturados: form.email, form.password                        */}
        {/* Botão: handleLogin() → POST /api/auth/login                         */}
        {/* ================================================================== */}
        {mode === "login" && (
          <div className="auth__form-wrap">
            <div className="auth__form-header">
              <h2 className="auth__form-title">Bem-vindo de volta!</h2>
              <p className="auth__form-sub">Acesse sua conta para continuar protegendo sua família.</p>
            </div>

            {/* E-mail (Login)
                name="email"   → handleChange atualiza form.email
                value={form.email} → React controla o valor
                Enviado como: LoginDto.Email no C# */}
            <div className="auth__field">
              <label className="auth__label">E-mail</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14l-7 7L3 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <rect x="3" y="5" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  className="auth__input"
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Senha (Login)
                name="password"   → handleChange atualiza form.password
                value={form.password} → React controla o valor
                Enviado como: LoginDto.Senha no C# (BCrypt.Verify no backend) */}
            <div className="auth__field">
              <div className="auth__label-row">
                <label className="auth__label">Senha</label>
                <button className="auth__forgot-link" onClick={() => trocarModo("forgot")}>
                  Esqueci minha senha
                </button>
              </div>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  className="auth__input"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button className="auth__toggle-pass" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M3 3l14 14M8.5 8.6A3 3 0 0011.4 11.5M6 6.3C4.5 7.3 3.2 8.5 2 10c2 3 4.7 5 8 5 1.4 0 2.7-.4 3.8-1M11 4.1C10 4 9.5 4 9 4 5.7 4 3 6 1 10"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M1 10c2-4 4.7-6 8-6s6 2 8 6c-2 4-4.7 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* BOTÃO LOGIN → chama handleLogin() que lê form.email e form.password */}
            <button className="auth__submit" onClick={handleLogin} disabled={loading}>
              {loading
                ? <span>Entrando...</span>
                : <><span>Entrar na minha conta</span>
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg></>
              }
            </button>

            <div className="auth__divider"><span>ou continue com</span></div>

            <div className="auth__social">
              <button className="auth__social-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button className="auth__social-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>

            <p className="auth__switch">
              Não tem uma conta?{" "}
              <button className="auth__switch-link" onClick={() => trocarModo("register")}>
                Cadastre-se grátis
              </button>
            </p>
          </div>
        )}

        {/* ================================================================== */}
        {/* FORMULÁRIO: CADASTRO                                                */}
        {/* Campos capturados: form.name, form.email, form.password             */}
        {/* form.confirm: apenas validação local, NÃO vai ao servidor           */}
        {/* Botão: handleCadastro() → POST /api/auth/cadastro                  */}
        {/* ================================================================== */}
        {mode === "register" && (
          <div className="auth__form-wrap">
            <div className="auth__form-header">
              <h2 className="auth__form-title">Crie sua conta</h2>
              <p className="auth__form-sub">Comece a proteger sua família hoje mesmo. É grátis!</p>
            </div>

            {/* Nome Completo
                name="name"   → handleChange atualiza form.name
                Enviado como: CadastroDto.NomeCompleto
                Salvo em:     app.Responsaveis.NomeCompleto (NVARCHAR 200) */}
            <div className="auth__field">
              <label className="auth__label">Nome completo</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  className="auth__input"
                  type="text"
                  name="name"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>

            {/* E-mail (Cadastro)
                name="email"   → handleChange atualiza form.email
                Enviado como:  CadastroDto.Email → normalizado ToLowerInvariant()
                Salvo em:      app.Responsaveis.Email (UNIQUE INDEX) */}
            <div className="auth__field">
              <label className="auth__label">E-mail</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14l-7 7L3 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <rect x="3" y="5" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  className="auth__input"
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Senha (Cadastro)
                name="password"   → handleChange atualiza form.password
                Enviado como:     CadastroDto.Senha
                Backend faz:      BCrypt.HashPassword(dto.Senha, workFactor:12)
                Salvo em:         app.Responsaveis.SenhaHash (a senha pura NUNCA é armazenada)
                Validação regex:  mesma do C# — maiúscula + minúscula + número + símbolo */}
            <div className="auth__field">
              <label className="auth__label">Senha</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  className="auth__input"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Ex: Armilla@1"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button className="auth__toggle-pass" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M1 10c2-4 4.7-6 8-6s6 2 8 6c-2 4-4.7 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Confirmar Senha
                name="confirm"   → handleChange atualiza form.confirm
                APENAS validação local em handleCadastro()
                NÃO é enviado ao backend (CadastroDto não tem este campo) */}
            <div className="auth__field">
              <label className="auth__label">Confirmar senha</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  className="auth__input"
                  type="password"
                  name="confirm"
                  placeholder="Repita sua senha"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="auth__terms">
              <input type="checkbox" id="terms" className="auth__checkbox" />
              <label htmlFor="terms" className="auth__terms-label">
                Concordo com os{" "}
                <span className="auth__terms-link">Termos de Uso</span> e a{" "}
                <span className="auth__terms-link">Política de Privacidade</span>
              </label>
            </div>

            {/* BOTÃO CADASTRO → chama handleCadastro() que lê form.name, email, password */}
            <button className="auth__submit" onClick={handleCadastro} disabled={loading}>
              {loading
                ? <span>Criando conta...</span>
                : <><span>Criar minha conta grátis</span>
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg></>
              }
            </button>

            <div className="auth__divider"><span>ou cadastre-se com</span></div>

            <div className="auth__social">
              <button className="auth__social-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button className="auth__social-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>

            <p className="auth__switch">
              Já tem uma conta?{" "}
              <button className="auth__switch-link" onClick={() => trocarModo("login")}>
                Entrar agora
              </button>
            </p>
          </div>
        )}

        {/* ================================================================== */}
        {/* FORMULÁRIO: ESQUECI A SENHA                                         */}
        {/* Campo capturado: form.email                                         */}
        {/* Botão: handleEsqueciSenha() → navega para chave-de-recuperacao      */}
        {/* ================================================================== */}
        {mode === "forgot" && (
          <div className="auth__form-wrap">
            <button className="auth__back-mode" onClick={() => trocarModo("login")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Voltar ao login
            </button>
            <div className="auth__form-header">
              <div className="auth__forgot-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="8" cy="15" r="4" stroke="#a855f7" strokeWidth="1.8"/>
                  <path d="M11 12l8-8M16 4l3 3M19 7l2 2" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="auth__form-title">Esqueceu a senha?</h2>
              <p className="auth__form-sub">
                Sem problema! Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            {/* E-mail (Esqueci a Senha)
                Mesmo campo form.email compartilhado entre os 3 formulários
                Será enviado para POST /api/auth/esqueci-senha quando implementado */}
            <div className="auth__field">
              <label className="auth__label">E-mail cadastrado</label>
              <div className="auth__input-wrap">
                <svg className="auth__input-icon" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14l-7 7L3 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <rect x="3" y="5" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  className="auth__input"
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <button className="auth__submit" onClick={handleEsqueciSenha} disabled={loading}>
              <span>Enviar link de recuperação</span>
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

      </div>

      {/* Painel lateral decorativo (desktop) */}
      <div className="auth__panel">
        <div className="auth__panel-content">
          <div className="auth__panel-shield">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 6v6c0 5.25 4 9.5 9 10 5-0.5 9-4.75 9-10V6l-9-4z" stroke="url(#shieldGrad)" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="url(#shieldGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3 className="auth__panel-title">Segurança que você pode sentir</h3>
          <p className="auth__panel-text">
            Monitore, proteja e acompanhe seu filho em tempo real — onde você estiver.
          </p>
          <div className="auth__panel-stats">
            <div className="auth__panel-stat">
              <span className="auth__panel-stat-num">23.970</span>
              <span className="auth__panel-stat-label">Crianças desaparecidas/ano no Brasil</span>
            </div>
            <div className="auth__panel-stat">
              <span className="auth__panel-stat-num">100%</span>
              <span className="auth__panel-stat-label">dos pais querem acompanhar a rota dos filhos</span>
            </div>
            <div className="auth__panel-stat">
              <span className="auth__panel-stat-num">R$150</span>
              <span className="auth__panel-stat-label">pulseira inteligente com GPS</span>
            </div>
          </div>
          <div className="auth__panel-pigeon">
            <div className="auth__panel-pigeon-circle">
              <img src={MillaImg} alt="Milla, mascote da Armilla" className="auth__panel-pigeon-img" />
            </div>
            <p className="auth__panel-pigeon-text">Conheça a Milla, nossa pombinha guardiã!</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Auth;
