import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
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
            <div className="hero__logo-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="23" stroke="url(#hLogoGrad)" strokeWidth="2"/>
                <path d="M24 8C16 8 11 14 11 24C11 31 15 35 20 36C20 32 21.5 28 24 25C26.5 28 28 32 28 36C33 35 37 31 37 24C37 14 32 8 24 8Z" fill="url(#hLogoFill)"/>
                <defs>
                  <linearGradient id="hLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c084fc"/>
                    <stop offset="1" stopColor="#38bdf8"/>
                  </linearGradient>
                  <linearGradient id="hLogoFill" x1="11" y1="8" x2="37" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#d8b4fe"/>
                    <stop offset="1" stopColor="#7dd3fc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="hero__brand">ARMILLA</span>
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
          <div className="hero__watch-wrapper">
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
