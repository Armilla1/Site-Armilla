import React, { useState, useRef } from 'react';
import './ChaveDeRecuperacao.css';

// ─────────────────────────────────────────────────────────────────────────────
// ChaveDeRecuperacao
//
// FLUXO ESPERADO:
//   1. O usuário recebe um código (chave) de recuperação por e-mail.
//   2. Ele digita os dígitos nos campos abaixo.
//   3. Ao clicar em "Continuar", a chave é validada.
//   4. Em caso de sucesso, navega para a página NovaSenha.
//
// INTEGRAÇÃO NECESSÁRIA (marque com TODO):
//   - TODO: Substitua `handleSubmit` pela chamada real à sua API de validação
//     de token. Exemplo: POST /api/auth/verify-recovery-key { token: keyValue }
//   - TODO: Substitua `handleResend` pela chamada real de reenvio do código.
//     Exemplo: POST /api/auth/resend-recovery-key { email: userEmail }
//   - TODO: Passe o e-mail do usuário via prop `userEmail` para exibição e reenvio.
//
// PROPS:
//   onNavigate  (func)   – função de navegação do App.jsx
//   userEmail   (string) – e-mail mascarado para exibição (ex: "j***@gmail.com")
//                          TODO: passar do contexto/estado de autenticação
// ─────────────────────────────────────────────────────────────────────────────

const KEY_LENGTH = 5; // TODO: ajuste para o tamanho real da chave enviada por e-mail

const ChaveDeRecuperacao = ({ onNavigate, userEmail = 'seu e-mail' }) => {
  // Array de dígitos da chave (um campo por dígito)
  const [digits, setDigits] = useState(Array(KEY_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs para focar o próximo campo automaticamente
  const inputRefs = useRef([]);

  // ── Manipula digitação em cada campo ──────────────────────────────────────
  const handleDigitChange = (index, value) => {
    // Aceita apenas 1 caractere alfanumérico por campo
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();

    const updated = [...digits];
    updated[index] = sanitized;
    setDigits(updated);
    setError('');

    // Avança automaticamente para o próximo campo
    if (sanitized && index < KEY_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // ── Permite apagar e voltar ao campo anterior ─────────────────────────────
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Suporte a colar (paste) toda a chave de uma vez ───────────────────────
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, KEY_LENGTH);

    const updated = Array(KEY_LENGTH).fill('');
    [...pasted].forEach((char, i) => { updated[i] = char; });
    setDigits(updated);

    // Foca o último campo preenchido ou o próximo vazio
    const nextIndex = Math.min(pasted.length, KEY_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  // ── Validação e envio ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const keyValue = digits.join('');

    if (keyValue.length < KEY_LENGTH) {
      setError('Preencha todos os campos da chave antes de continuar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: substitua o trecho abaixo pela chamada real à sua API.
      // Exemplo:
      //   const response = await fetch('/api/auth/verify-recovery-key', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ token: keyValue }),
      //   });
      //   if (!response.ok) throw new Error('Chave inválida ou expirada.');
      //   const { sessionToken } = await response.json();
      //   // Salve sessionToken para autorizar a troca de senha na próxima tela

      // ── Simulação (REMOVER na integração real) ────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // ─────────────────────────────────────────────────────────────────────

      // Navega para a página de nova senha
      // TODO: passe o sessionToken como parâmetro se necessário
      onNavigate && onNavigate('nova-senha');

    } catch (err) {
      setError(err.message || 'Chave inválida ou expirada. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reenvio da chave ──────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      // TODO: substitua pelo endpoint real de reenvio.
      // Exemplo:
      //   await fetch('/api/auth/resend-recovery-key', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ email: userEmail }),
      //   });

      // Inicia cooldown de 60 segundos
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);

      setError('');
    } catch {
      setError('Não foi possível reenviar a chave. Tente novamente.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="recovery-key">
      {/* Fundo animado – mesmo padrão do Auth */}
      <div className="recovery-key__bg">
        <div className="recovery-key__orb recovery-key__orb--1" />
        <div className="recovery-key__orb recovery-key__orb--2" />
        <div className="recovery-key__orb recovery-key__orb--3" />
        <div className="recovery-key__grid" />
      </div>

      {/* Botão voltar ao login */}
      <button
        className="recovery-key__back"
        onClick={() => onNavigate && onNavigate('login')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Voltar ao login
      </button>

      {/* Card central */}
      <div className="recovery-key__card">
        {/* Logo */}
        <div
          className="recovery-key__logo"
          onClick={() => onNavigate && onNavigate('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('home')}
        >
          <div className="recovery-key__logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" stroke="url(#rk-logo-grad)" strokeWidth="2"/>
              <path
                d="M20 8C14 8 10 13 10 20C10 25 13 28 17 29C17 26 18 23 20 21C22 23 23 26 23 29C27 28 30 25 30 20C30 13 26 8 20 8Z"
                fill="url(#rk-logo-grad2)"
              />
              <defs>
                <linearGradient id="rk-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
                <linearGradient id="rk-logo-grad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c084fc"/><stop offset="1" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="recovery-key__logo-text">ARMILLA</span>
        </div>

        {/* Ícone + cabeçalho */}
        <div className="recovery-key__header">
          <div className="recovery-key__icon-wrap">
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <circle cx="24" cy="24" r="23" stroke="url(#rk-icon-grad)" strokeWidth="2"/>
              <path d="M24 14a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="url(#rk-icon-grad)"/>
              <path d="M17 33c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="url(#rk-icon-grad)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="rk-icon-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 className="recovery-key__title">Insira a chave de recuperação</h2>
          <p className="recovery-key__subtitle">
            {/* TODO: exibir o e-mail mascarado do usuário (passado via prop) */}
            Enviamos uma chave de {KEY_LENGTH} caracteres para <strong>{userEmail}</strong>.
            Verifique sua caixa de entrada e spam.
          </p>
        </div>

        {/* Campos de dígitos */}
        <div className="recovery-key__digits" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              className={`recovery-key__digit ${digit ? 'recovery-key__digit--filled' : ''}`}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`Dígito ${index + 1} da chave`}
            />
          ))}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="recovery-key__error" role="alert">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <circle cx="10" cy="10" r="9" stroke="#f87171" strokeWidth="1.5"/>
              <path d="M10 6v5M10 13v1" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Botão principal */}
        <button
          className={`recovery-key__submit ${loading ? 'recovery-key__submit--loading' : ''}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="recovery-key__spinner" />
              Verificando…
            </>
          ) : (
            <>
              <span>Continuar</span>
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>

        {/* Reenvio da chave */}
        <p className="recovery-key__resend">
          Não recebeu a chave?{' '}
          <button
            className={`recovery-key__resend-btn ${resendCooldown > 0 ? 'recovery-key__resend-btn--disabled' : ''}`}
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar agora'}
          </button>
        </p>
      </div>

      {/* Painel lateral decorativo – idêntico ao Auth */}
      <div className="recovery-key__panel">
        <div className="recovery-key__panel-content">
          <div className="recovery-key__panel-icon">🔐</div>
          <h3 className="recovery-key__panel-title">Sua segurança em primeiro lugar</h3>
          <p className="recovery-key__panel-text">
            A chave de recuperação garante que apenas você possa redefinir o acesso à sua conta Armilla.
          </p>
          <ul className="recovery-key__panel-tips">
            <li>✅ Verifique a pasta de spam</li>
            <li>✅ A chave expira em 15 minutos</li>
            <li>✅ Cada chave é de uso único</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChaveDeRecuperacao;
