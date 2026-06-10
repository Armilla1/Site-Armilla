import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

export const AccessibilityProvider = ({ children }) => {
  // 'default' | 'dark' | 'light'
  const [contrastMode, setContrastMode] = useState(() => load('a11y_contrast', 'default'));
  // 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  const [colorMode,    setColorMode]    = useState(() => load('a11y_color',    'normal'));
  // false = padrão, true = +25%
  const [fontLarge,    setFontLarge]    = useState(() => load('a11y_font',     false));
  const [panelOpen,    setPanelOpen]    = useState(false);

  // ── Contrast: aplica classes no <html> ──────────────────────
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('contrast-dark', 'contrast-light');
    if (contrastMode === 'dark')  html.classList.add('contrast-dark');
    if (contrastMode === 'light') html.classList.add('contrast-light');
    localStorage.setItem('a11y_contrast', JSON.stringify(contrastMode));
  }, [contrastMode]);

  // ── Daltonismo: aplica classe no <html> mas NUNCA no botão ──
  // O filter é aplicado via CSS em body > *:not(.a11y-trigger):not(.a11y-panel)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('color-protanopia', 'color-deuteranopia', 'color-tritanopia');
    if (colorMode !== 'normal') html.classList.add(`color-${colorMode}`);
    localStorage.setItem('a11y_color', JSON.stringify(colorMode));
  }, [colorMode]);

  // ── Fonte ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('text-large', fontLarge);
    localStorage.setItem('a11y_font', JSON.stringify(fontLarge));
  }, [fontLarge]);

  return (
    <AccessibilityContext.Provider value={{
      contrastMode, setContrastMode,
      colorMode,    setColorMode,
      fontLarge,    setFontLarge,
      panelOpen,    setPanelOpen,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility precisa estar dentro do AccessibilityProvider');
  return ctx;
};
