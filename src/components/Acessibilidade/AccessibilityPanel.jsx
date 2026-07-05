import React, { useEffect, useRef } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import './Accessibility.css';

const COLOR_MODES = [
  { value: 'normal',       label: 'Padrão',       desc: 'Cores originais do site' },
  { value: 'protanopia',   label: 'Protanopia',   desc: 'Dificuldade com vermelho' },
  { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Dificuldade com verde' },
  { value: 'tritanopia',   label: 'Tritanopia',   desc: 'Dificuldade com azul' },
];

const CONTRAST_MODES = [
  { value: 'dark',    label: 'Modo Escuro', desc: 'Para sensibilidade à luz' },
  { value: 'light',   label: 'Modo Claro',  desc: 'Clareia ambientes escuros' },
  { value: 'default', label: 'Padrão',      desc: 'Visual original' },
];

const AccessibilityPanel = () => {
  const {
    contrastMode, setContrastMode,
    colorMode,    setColorMode,
    fontLarge,    setFontLarge,
    panelOpen,    setPanelOpen,
  } = useAccessibility();

  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  // ESC fecha painel
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setPanelOpen(false); btnRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelOpen, setPanelOpen]);

  // Foca no primeiro elemento ao abrir
  useEffect(() => {
    if (panelOpen) {
      setTimeout(() => {
        panelRef.current?.querySelector('button')?.focus();
      }, 60);
    }
  }, [panelOpen]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!panelOpen) return;
    const onClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) { setPanelOpen(false); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [panelOpen, setPanelOpen]);

  // Leitura por voz
  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(
      document.getElementById('main-content')?.innerText?.slice(0, 2000) ||
      document.body.innerText.slice(0, 2000)
    );
    utt.lang = 'pt-BR';
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  };
  const stopSpeak = () => window.speechSynthesis?.cancel();

  return (
    <>
      {/* ── Botão flutuante — NUNCA afetado por filtros ── */}
      <button
        ref={btnRef}
        className="a11y-trigger"
        onClick={() => setPanelOpen(p => !p)}
        aria-expanded={panelOpen}
        aria-controls="a11y-panel"
        aria-label="Abrir painel de acessibilidade"
        title="Acessibilidade"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="4.5" r="1.5" fill="currentColor"/>
          <path d="M7 8h10M12 8v8M9 22v-5M15 22v-5"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span>Acessibilidade</span>
      </button>

      {/* ── Painel — NUNCA afetado por filtros ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          id="a11y-panel"
          className="a11y-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Painel de acessibilidade"
        >
          {/* Cabeçalho */}
          <div className="a11y-panel__header">
            <h2 className="a11y-panel__title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="4.5" r="1.5" fill="currentColor"/>
                <path d="M7 8h10M12 8v8M9 22v-5M15 22v-5"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Acessibilidade
            </h2>
            <button
              className="a11y-panel__close"
              onClick={() => setPanelOpen(false)}
              aria-label="Fechar painel"
            >✕</button>
          </div>

          {/* ── 1. CONTRASTE ── */}
          <section className="a11y-section" aria-labelledby="a11y-contrast-title">
            <h3 id="a11y-contrast-title" className="a11y-section__title">Contraste</h3>
            <div className="a11y-contrast-btns" role="group" aria-label="Modos de contraste">
              {CONTRAST_MODES.map(m => (
                <button
                  key={m.value}
                  className={`a11y-contrast-btn ${contrastMode === m.value ? 'a11y-contrast-btn--active' : ''}`}
                  onClick={() => setContrastMode(m.value)}
                  aria-pressed={contrastMode === m.value}
                  aria-label={`${m.label} — ${m.desc}`}
                  title={m.desc}
                >
                  <span className="a11y-contrast-btn__label">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="a11y-hint" aria-live="polite">
              Ativo: <strong>
                {CONTRAST_MODES.find(m => m.value === contrastMode)?.label}
              </strong>
            </p>
          </section>
 
          {/* ── 2. DALTONISMO ── */}
          <section className="a11y-section" aria-labelledby="a11y-color-title">
            <h3 id="a11y-color-title" className="a11y-section__title">Daltonismo</h3>
            <div className="a11y-color-options" role="radiogroup" aria-labelledby="a11y-color-title">
              {COLOR_MODES.map(m => (
                <label
                  key={m.value}
                  className={`a11y-color-option ${colorMode === m.value ? 'a11y-color-option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="colorMode"
                    value={m.value}
                    checked={colorMode === m.value}
                    onChange={() => setColorMode(m.value)}
                    className="a11y-sr-only"
                  />
                  <span className="a11y-color-option__left">
                    <span className="a11y-color-option__label">{m.label}</span>
                  </span>
                  <span className="a11y-color-option__desc">{m.desc}</span>
                  {colorMode === m.value && (
                    <span className="a11y-color-option__check" aria-hidden="true">✓</span>
                  )}
                </label>
              ))}
            </div>
          </section>
 
          {/* ── 3. TEXTO ── */}
          <section className="a11y-section" aria-labelledby="a11y-font-title">
            <h3 id="a11y-font-title" className="a11y-section__title">Tamanho do texto</h3>
            <div className="a11y-font-btns" role="group" aria-label="Tamanho do texto">
              <button
                className={`a11y-font-btn ${!fontLarge ? 'a11y-font-btn--active' : ''}`}
                onClick={() => setFontLarge(false)}
                aria-pressed={!fontLarge}
                aria-label="Texto no tamanho padrão"
              >
                <span className="a11y-font-btn__icon">Aa</span>
                Texto Padrão
              </button>
              <button
                className={`a11y-font-btn ${fontLarge ? 'a11y-font-btn--active' : ''}`}
                onClick={() => setFontLarge(true)}
                aria-pressed={fontLarge}
                aria-label="Aumentar texto em 25 por cento"
              >
                <span className="a11y-font-btn__icon a11y-font-btn__icon--big">Aa</span>
                Texto Grande
              </button>
            </div>
            <p className="a11y-hint" aria-live="polite">
              {fontLarge ? 'Texto aumentado em 25%' : 'Tamanho padrão ativo'}
            </p>
          </section>
 
          {/* ── 4. VOZ ── */}
          <section className="a11y-section" aria-labelledby="a11y-tts-title">
            <h3 id="a11y-tts-title" className="a11y-section__title">Leitura por voz</h3>
            <div className="a11y-tts-btns">
              <button
                className="a11y-tts-btn"
                onClick={speak}
                aria-label="Ler o conteúdo da página em voz alta"
              >Ouvir página</button>
              <button
                className="a11y-tts-btn a11y-tts-btn--stop"
                onClick={stopSpeak}
                aria-label="Parar leitura por voz"
              >Parar</button>
            </div>
          </section>
 
          <p className="a11y-panel__note">Preferências salvas automaticamente</p>
        </div>
      )}
    </>
  );
};

export default AccessibilityPanel;
