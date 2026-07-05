import { useState } from 'react';
import './Auth.css';
import { API_URL } from "../config/api.jsx"
import Milla from '../assets/MillaSemFundo.png'
import logo from '../assets/logoArmilla.png'

const Auth = ({ onNavigate, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [feedback, setFeedback] = useState({ tipo: "", msg: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const trocarModo = (novoModo) => {
    setMode(novoModo);
    setFeedback({ tipo: "", msg: "" });
  };

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
  
        const contentType = resposta.headers.get("content-type");
        let dados = {};
        if (contentType && contentType.includes("application/json")) {
            dados = await resposta.json();
        } else if (!resposta.ok) {
            throw new Error("Erro de comunicação com o servidor (o banco de dados pode estar offline).");
        }
  
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
  
        const contentType = resposta.headers.get("content-type");
        let dados = {};
        if (contentType && contentType.includes("application/json")) {
            dados = await resposta.json();
        } else if (!resposta.ok) {
            throw new Error("Erro de comunicação com o servidor (o banco de dados pode estar offline).");
        }
  
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

  return (
    <div className="auth">
      {/* Background */}
      <div className="auth__bg">
        <div className="auth__orb auth__orb--1" />
        <div className="auth__orb auth__orb--2" />
        <div className="auth__orb auth__orb--3" />
        <div className="auth__grid-pattern" />
      </div>

      {/* Back link */}
      <button className="auth__back" onClick={() => onNavigate && onNavigate('home')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Voltar ao site
      </button>

      {/* Card central */}
      <div className="auth__card">
        {/* Logo */}
        <div className="auth__logo" onClick={() => onNavigate && onNavigate('home')}>
          <img src={logo} alt="" />
          <span className="auth__logo-text">ARMILLA</span>
        </div>

        {/* Mode tabs (only login/register) */}
        {mode !== 'forgot' && (
          <div className="auth__tabs">
            <button
              className={`auth__tab ${mode === 'login' ? 'auth__tab--active' : ''}`}
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              className={`auth__tab ${mode === 'register' ? 'auth__tab--active' : ''}`}
              onClick={() => setMode('register')}
            >
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

        {/* ── LOGIN ── */}
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
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button className="auth__social-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>

            <p className="auth__switch">
              Não tem uma conta?{' '}
              <button className="auth__switch-link" onClick={() => setMode('register')}>Cadastre-se grátis</button>
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
              Já tem uma conta?{' '}
              <button className="auth__switch-link" onClick={() => setMode('login')}>Entrar agora</button>
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

             {/* retirar o onclick nessa parte, feita para testes*/} 
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

      

      {/* Decorative side panel (desktop) */}
      <div className="auth__panel">
        <div className="auth__panel-content">
          <div className="auth__panel-shield">🛡️</div>
          <h3 className="auth__panel-title">Segurança que você pode sentir</h3>
          <p className="auth__panel-text">Monitore, proteja e acompanhe seu filho em tempo real — onde você estiver.</p>
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
              <span className="auth__panel-stat-num">R$150,00</span>
              <span className="auth__panel-stat-label">pulseira inteligente com GPS</span>
            </div>
          </div>
          <div className="auth__panel-pigeon">
            <div className="auth__panel-pigeon-circle">
              <img src={Milla} alt="Imagem da mascote Milla" className='auth__panel-image'/>
              {/*}
              <span style={{fontSize:'48px'}}>🐦</span>
              {*/}
            </div>
            <p className="auth__panel-pigeon-text">Conheça a Milla, nossa pombinha guardiã!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;