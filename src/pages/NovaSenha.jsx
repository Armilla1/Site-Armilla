import React, { useState } from 'react';
import './NovaSenha.css';

// ─────────────────────────────────────────────────────────────────────────────
// NovaSenha
//
// FLUXO ESPERADO:
//   1. Chegou aqui vindo de ChaveDeRecuperacao (chave já validada).
//   2. O usuário digita a nova senha e a confirma.
//   3. Ao clicar em "Mudar senha", a nova senha é registrada no banco de dados.
//   4. Redireciona para o login com mensagem de sucesso.
//
// INTEGRAÇÃO NECESSÁRIA (marque com TODO):
//   - TODO: Substitua `handleSubmit` pela chamada real à sua API de redefinição
//     de senha. Exemplo: POST /api/auth/reset-password
//     Corpo: { sessionToken, newPassword }
//     Obs: sessionToken deve ser passado via prop `recoveryToken`, gerado
//     pela API na etapa anterior (ChaveDeRecuperacao) e repassado pelo App.jsx.
//
//   - TODO: Ajuste as regras de validação de senha em `validatePassword`
//     de acordo com as políticas do seu sistema.
//
// PROPS:
//   onNavigate     (func)   – função de navegação do App.jsx
//   recoveryToken  (string) – token de sessão gerado ao validar a chave
//                            TODO: passar do estado do App.jsx / contexto global
// ─────────────────────────────────────────────────────────────────────────────

// Regras de força de senha (customize conforme sua política)
const PASSWORD_RULES = [
  { id: 'length',    label: 'Mínimo 8 caracteres',           test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'Pelo menos uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'number',    label: 'Pelo menos um número',           test: (p) => /\d/.test(p) },
  { id: 'special',  label: 'Pelo menos um caractere especial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// ── Calcula o nível de força de 0 a 4 ────────────────────────────────────────
const calcStrength = (password) =>
  PASSWORD_RULES.filter((rule) => rule.test(password)).length;

const STRENGTH_LABELS = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const STRENGTH_COLORS = ['', '#f87171', '#fb923c', '#facc15', '#4ade80'];

const NovaSenha = ({ onNavigate, recoveryToken = null }) => {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);

  const strength = calcStrength(password);

  // ── Validação local antes de enviar ──────────────────────────────────────
  const validatePassword = () => {
    if (!password) return 'Digite a nova senha.';
    if (strength < 2) return 'Sua senha é muito fraca. Siga as regras abaixo.';
    if (password !== confirm) return 'As senhas não coincidem.';
    return null;
  };

  // ── Envio ao backend ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: substitua o trecho abaixo pela chamada real à sua API.
      // Exemplo:
      //   const response = await fetch('/api/auth/reset-password', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       token: recoveryToken,   // token vindo da etapa anterior
      //       newPassword: password,
      //     }),
      //   });
      //   if (!response.ok) {
      //     const { message } = await response.json();
      //     throw new Error(message || 'Erro ao redefinir senha.');
      //   }

      // ── Simulação (REMOVER na integração real) ────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 1400));
      // ─────────────────────────────────────────────────────────────────────

      setSuccess(true);

      // Redireciona para o login após 2,5 segundos
      setTimeout(() => {
        onNavigate && onNavigate('login');
      }, 2500);

    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="new-password">
      {/* Fundo animado – mesmo padrão do Auth */}
      <div className="new-password__bg">
        <div className="new-password__orb new-password__orb--1" />
        <div className="new-password__orb new-password__orb--2" />
        <div className="new-password__orb new-password__orb--3" />
        <div className="new-password__grid" />
      </div>

      {/* Botão voltar */}
      <button
        className="new-password__back"
        onClick={() => onNavigate && onNavigate('chave-de-recuperacao')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Voltar
      </button>

      {/* Card central */}
      <div className="new-password__card">

        {/* Tela de sucesso */}
        {success ? (
          <div className="new-password__success">
            <div className="new-password__success-icon">✅</div>
            <h2 className="new-password__success-title">Senha alterada!</h2>
            <p className="new-password__success-text">
              Sua senha foi redefinida com sucesso. Redirecionando para o login…
            </p>
            <div className="new-password__success-loader" />
          </div>
        ) : (
          <>
            {/* Logo */}
            <div
              className="new-password__logo"
              onClick={() => onNavigate && onNavigate('home')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('home')}
            >
              <div className="new-password__logo-icon">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="19" stroke="url(#np-logo-grad)" strokeWidth="2"/>
                  <path
                    d="M20 8C14 8 10 13 10 20C10 25 13 28 17 29C17 26 18 23 20 21C22 23 23 26 23 29C27 28 30 25 30 20C30 13 26 8 20 8Z"
                    fill="url(#np-logo-grad2)"
                  />
                  <defs>
                    <linearGradient id="np-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
                    </linearGradient>
                    <linearGradient id="np-logo-grad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#c084fc"/><stop offset="1" stopColor="#60a5fa"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="new-password__logo-text">ARMILLA</span>
            </div>

            {/* Cabeçalho */}
            <div className="new-password__header">
              <div className="new-password__icon-wrap">
                <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                  <circle cx="24" cy="24" r="23" stroke="url(#np-icon-grad)" strokeWidth="2"/>
                  <rect x="14" y="22" width="20" height="14" rx="3" stroke="url(#np-icon-grad)" strokeWidth="2"/>
                  <path d="M18 22v-4a6 6 0 0 1 12 0v4" stroke="url(#np-icon-grad)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="24" cy="29" r="2" fill="url(#np-icon-grad)"/>
                  <defs>
                    <linearGradient id="np-icon-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="new-password__title">Crie sua nova senha</h2>
              <p className="new-password__subtitle">
                Escolha uma senha forte que você não use em outros serviços.
              </p>
            </div>

            {/* Campo: nova senha */}
            <div className="new-password__field">
              <label className="new-password__label">Senha nova</label>
              <div className="new-password__input-wrap">
                <svg className="new-password__input-icon" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  className="new-password__input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="new-password"
                />
                <button
                  className="new-password__toggle"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  type="button"
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M3 3l14 14M8.5 8.6A3 3 0 0011.4 11.5M6 6.3C4.5 7.3 3.2 8.5 2 10c2 3 4.7 5 8 5 1.4 0 2.7-.4 3.8-1M11 4.1C10 4 9.5 4 9 4 5.7 4 3 6 1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M1 10c2-4 4.7-6 8-6s6 2 8 6c-2 4-4.7 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Barra de força */}
              {password.length > 0 && (
                <div className="new-password__strength">
                  <div className="new-password__strength-bar">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="new-password__strength-seg"
                        style={{
                          background: strength >= level
                            ? STRENGTH_COLORS[strength]
                            : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="new-password__strength-label"
                    style={{ color: STRENGTH_COLORS[strength] }}
                  >
                    {STRENGTH_LABELS[strength]}
                  </span>
                </div>
              )}

              {/* Checklist de regras */}
              <ul className="new-password__rules">
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.id}
                    className={`new-password__rule ${rule.test(password) ? 'new-password__rule--ok' : ''}`}
                  >
                    <span className="new-password__rule-icon">
                      {rule.test(password) ? '✓' : '○'}
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Campo: confirmação de senha */}
            <div className="new-password__field">
              <label className="new-password__label">Confirmar senha</label>
              <div className="new-password__input-wrap">
                <svg className="new-password__input-icon" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  className={`new-password__input ${
                    confirm.length > 0
                      ? password === confirm
                        ? 'new-password__input--ok'
                        : 'new-password__input--err'
                      : ''
                  }`}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita sua senha"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  autoComplete="new-password"
                />
                <button
                  className="new-password__toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  type="button"
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M1 10c2-4 4.7-6 8-6s6 2 8 6c-2 4-4.7 6-8 6s-6-2-8-6z" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>

              {/* Feedback de correspondência */}
              {confirm.length > 0 && (
                <p className={`new-password__match ${password === confirm ? 'new-password__match--ok' : 'new-password__match--err'}`}>
                  {password === confirm ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                </p>
              )}
            </div>

            {/* Erro geral */}
            {error && (
              <div className="new-password__error" role="alert">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <circle cx="10" cy="10" r="9" stroke="#f87171" strokeWidth="1.5"/>
                  <path d="M10 6v5M10 13v1" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Botão enviar */}
            <button
              className={`new-password__submit ${loading ? 'new-password__submit--loading' : ''}`}
              onClick={handleSubmit}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <span className="new-password__spinner" />
                  Salvando…
                </>
              ) : (
                <>
                  <span>Mudar senha</span>
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Painel lateral decorativo */}
      <div className="new-password__panel">
        <div className="new-password__panel-content">
          <div className="new-password__panel-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="new-password__panel-title">Dicas para uma senha forte</h3>
          <p className="new-password__panel-text">
            Proteja sua conta com uma senha única e difícil de adivinhar.
          </p>
          <ul className="new-password__panel-tips">
            <li>
              <span className="new-password__panel-tip-num">01</span>
              <span>Use ao menos 8 caracteres misturando letras, números e símbolos</span>
            </li>
            <li>
              <span className="new-password__panel-tip-num">02</span>
              <span>Evite datas de nascimento, nomes e sequências óbvias como "12345"</span>
            </li>
            <li>
              <span className="new-password__panel-tip-num">03</span>
              <span>Não reutilize senhas de outros serviços</span>
            </li>
            <li>
              <span className="new-password__panel-tip-num">04</span>
              <span>Considere usar um gerenciador de senhas confiável</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NovaSenha;
