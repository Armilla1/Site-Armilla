import React, { useState } from 'react';
import './Aplicativo.css';
import Hero from '../components/Hero/Hero.jsx';
import Footer from '../components/Footer/Footer.jsx';

const screens = [
  {
    icon: '🗺️',
    title: 'Mapa em Tempo Real',
    desc: 'Acompanhe exatamente onde seu filho está agora, com atualização contínua no mapa.',
  },
  {
    icon: '🛡️',
    title: 'Áreas Seguras',
    desc: 'Defina zonas seguras como escola, casa e avós. Receba alerta se a criança sair.',
  },
  {
    icon: '🔔',
    title: 'Alertas Inteligentes',
    desc: 'Notificações de atraso, parada incomum, bateria baixa e pulseira removida.',
  },
  {
    icon: '📍',
    title: 'Rotas Seguras',
    desc: 'Cadastre trajetos do dia a dia e monitore se a criança seguiu o caminho correto.',
  },
  {
    icon: '👥',
    title: 'Múltiplos Responsáveis',
    desc: 'Pai, mãe, avós — todos conectados e recebendo alertas ao mesmo tempo.',
  },
  {
    icon: '📊',
    title: 'Histórico Completo',
    desc: 'Reveja todos os trajetos, alertas e localizações dos últimos dias ou meses.',
  },
];

const steps = [
  { num: '01', title: 'Baixe o app', desc: 'Disponível para iOS e Android, de graça.' },
  { num: '02', title: 'Cadastre-se', desc: 'Crie sua conta em menos de 2 minutos.' },
  { num: '03', title: 'Conecte a pulseira', desc: 'Pareie via Bluetooth rapidamente.' },
  { num: '04', title: 'Comece a proteger', desc: 'Seu filho já está sendo monitorado!' },
];

const Aplicativo = ( props ) => {
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <div className="app-page">

      {/* ── HERO ── */}
      <Hero currentPage={props.currentPage}/>

      {/* ── VIDEO ── */}
      <section className="app-video">
        <div className="app-video__inner">
          <div className="app-video__text">
            <span className="app-video__eyebrow">Veja em ação</span>
            <h2 className="app-video__title">
              Uma demo vale<br />mais que mil palavras
            </h2>
            <p className="app-video__desc">
              Assista ao protótipo do aplicativo Armilla funcionando. Veja o mapa em tempo real, as telas de alerta, o cadastro de rotas e muito mais — direto do nosso Figma animado.
            </p>
            <div className="app-video__features">
              {['Mapa ao vivo', 'Cadastro de rota', 'Alertas push', 'Painel do responsável'].map((f) => (
                <div key={f} className="app-video__feature">
                  <span className="app-video__feature-check">✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="app-video__player-wrap">
            <div className="app-video__player">
              {!videoPlaying ? (
                <div className="app-video__thumbnail" onClick={() => setVideoPlaying(true)}>
                  <div className="app-video__thumb-bg" />
                  <div className="app-video__thumb-overlay">
                    <div className="app-video__play-btn">
                      <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                        <path d="M8 5v14l11-7L8 5z"/>
                      </svg>
                    </div>
                    <span className="app-video__thumb-label">Ver demonstração</span>
                  </div>
                  <div className="app-video__thumb-phone-icon">📱</div>
                </div>
              ) : (
                <iframe
                  className="app-video__iframe"
                  src="https://www.youtube.com/embed/LFGqgSGfyjE?autoplay=1&rel=0&modestbranding=1"
                  title="Armilla App Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <div className="app-video__player-glow" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="app-features">
        <div className="app-features__inner">
          <div className="app-features__header">
            <span className="app-features__eyebrow">Funcionalidades</span>
            <h2 className="app-features__title">Tudo que você precisa<br />para proteger sua família</h2>
          </div>
          <div className="app-features__grid">
            {screens.map((s, i) => (
              <div key={i} className="app-features__card">
                <div className="app-features__icon">{s.icon}</div>
                <h3 className="app-features__card-title">{s.title}</h3>
                <p className="app-features__card-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="app-steps">
        <div className="app-steps__bg">
          <div className="app-steps__orb" />
        </div>
        <div className="app-steps__inner">
          <div className="app-steps__header">
            <span className="app-steps__eyebrow">Como começar</span>
            <h2 className="app-steps__title">Proteja seu filho<br />em 4 passos simples</h2>
          </div>
          <div className="app-steps__list">
            {steps.map((s, i) => (
              <div key={i} className="app-steps__item">
                <div className="app-steps__num">{s.num}</div>
                {i < steps.length - 1 && <div className="app-steps__connector" />}
                <div className="app-steps__text">
                  <h3 className="app-steps__item-title">{s.title}</h3>
                  <p className="app-steps__item-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CTA ── */}
      <section className="app-download">
        <div className="app-download__inner">
          <div className="app-download__milla">🐦</div>
          <h2 className="app-download__title">
            Comece hoje mesmo<br />
            <span>é 100% gratuito</span>
          </h2>
          <p className="app-download__sub">Baixe o aplicativo, crie sua conta e conecte a pulseira. Seu filho vai adorar a pombinha Milla!</p>
          <div className="app-download__btns">
            <button className="app-download__store-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div>
                <span className="app-download__store-label">Download na</span>
                <span className="app-download__store-name">App Store</span>
              </div>
            </button>
            <button className="app-download__store-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
              </svg>
              <div>
                <span className="app-download__store-label">Disponível no</span>
                <span className="app-download__store-name">Google Play</span>
              </div>
            </button>
          </div>
          <button
            className="app-download__signup"
            onClick={() => onNavigate && onNavigate('register')}
          >
            Ou crie sua conta pelo site →
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Aplicativo;
