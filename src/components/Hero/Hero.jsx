import React from 'react';
import './Hero.css';
import comercialPulseSafe from "../../assets/comercialPulseSafe.png"
import logoENome from "../../assets/ArmillaFundoEscuro.png"

const Hero = (props) => {
  return (
    <>
    {console.log(`${props.currentPage}`)}
    { (props.currentPage === "home" || props.currentPage === "comprar")  &&
      <section className="hero" id="home">
        <div className="hero__bg">
          <div className="hero__grid" />
          <div className="hero__glow hero__glow--1" />
          <div className="hero__glow hero__glow--2" />
          <div className="hero__circuit">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`hero__circuit-line hero__circuit-line--${i + 1}`} />
            ))}
          </div>
        </div>

        <div className="hero__container">
          <div className="hero__content">
            <div className="hero__logo-block">
              <img src={logoENome} alt="" />
            </div>

            <h1 className="hero__title">
              A pulseira que traz<br />
              mais <span className="hero__title-highlight">segurança</span><br />
              para sua criança
            </h1>

            <a href="#informacoes" className="hero__btn">
              Saiba Mais
            </a>
          </div>

          <div className="hero__visual">
            <img src={comercialPulseSafe} alt="" />
            {/*<div className="hero__watch-wrapper">
              <div className="hero__watch-glow" />
              <div className="hero__watch">
                <div className="hero__watch-body">
                  <div className="hero__watch-screen" />
                  <div className="hero__watch-band hero__watch-band--top" />
                  <div className="hero__watch-band hero__watch-band--bottom" />
                  <div className="hero__watch-sensor" />
                </div>
              </div>
              <div className="hero__pin">
                <svg viewBox="0 0 24 32" fill="none">
                  <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#a855f7"/>
                  <circle cx="12" cy="12" r="5" fill="white"/>
                </svg>
              </div>
            </div>*/}
          </div>
        </div>
      </section>
    }

    { props.currentPage === "aplicativo" &&
      <section className="app-hero">
        <div className="app-hero__bg">
          <div className="app-hero__orb app-hero__orb--1" />
          <div className="app-hero__orb app-hero__orb--2" />
          <div className="app-hero__orb app-hero__orb--3" />
          <div className="app-hero__grid" />
        </div>

        <div className="app-hero__content">
          <div className="app-hero__badge">
            <span className="app-hero__badge-dot" />
            Aplicativo disponível agora
          </div>
          <h1 className="app-hero__title">
            O app que coloca<br />
            <span className="app-hero__gradient">seu filho no mapa</span>
          </h1>
          <p className="app-hero__sub">
            Monitoramento em tempo real, alertas inteligentes e rotas seguras — tudo na palma da sua mão. A Armilla transforma seu smartphone no guardião do seu filho.
          </p>
          <div className="app-hero__ctas">
            <button className="app-hero__cta app-hero__cta--primary" onClick={() => onNavigate && onNavigate('register')}>
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3l4 4H6l4-4zm0 10l-4-4h8l-4 4z" fill="currentColor"/>
              </svg>
              Criar conta grátis
            </button>
            <button className="app-hero__cta app-hero__cta--secondary">
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <rect x="5" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="10" cy="15.5" r="0.75" fill="currentColor"/>
              </svg>
              Baixar para iOS
            </button>
            <button className="app-hero__cta app-hero__cta--secondary">
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M3 17L10 3l7 14H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Baixar para Android
            </button>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="app-hero__mockup">
          <div className="app-hero__phone">
            <div className="app-hero__phone-notch" />
            <div className="app-hero__phone-screen">
              <div className="app-hero__phone-ui">
                <div className="app-phone-bar">
                  <span className="app-phone-bar__label">📍 Davi está seguro</span>
                  <span className="app-phone-bar__status">●</span>
                </div>
                <div className="app-phone-map">
                  <div className="app-phone-map__grid" />
                  <div className="app-phone-map__road app-phone-map__road--h" />
                  <div className="app-phone-map__road app-phone-map__road--v" />
                  <div className="app-phone-map__road app-phone-map__road--d" />
                  <div className="app-phone-map__pin">
                    <div className="app-phone-map__pin-dot" />
                    <div className="app-phone-map__pin-pulse" />
                  </div>
                  <div className="app-phone-map__zone" />
                </div>
                <div className="app-phone-alerts">
                  <div className="app-phone-alert app-phone-alert--green">
                    <span>✓</span> Dentro da área segura
                  </div>
                  <div className="app-phone-alert app-phone-alert--blue">
                    <span>🔋</span> Bateria 87%
                  </div>
                </div>
              </div>
            </div>
            <div className="app-hero__phone-home-btn" />
          </div>
          <div className="app-hero__phone-glow" />
        </div>
      </section>
    }
    </>
  );
};

export default Hero;