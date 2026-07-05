import React from 'react';
import './Aplicativo.css';

import firstImage from '../assets/appImage/firstImage.png'
import step1Image from '../assets/comercialPulseSafe.png';
import step2Image from '../assets/appImage/appcell3.png';
import step3Image from '../assets/appImage/appcell4.png';
import step4Image from '../assets/appImage/appcell5.png';
import googleButton from '../assets/appImage/googleplay.png'

import Footer from '../components/Footer/Footer.jsx'

const steps = [
  {
    number: '1',
    title: 'Coloque a',
    highlight: 'Pulseira',
    text: 'A pulseira é leve, confortável e fácil de usar',
    image: step1Image,
  },
  {
    number: '2',
    title: 'Conecte ao',
    highlight: 'App',
    text: 'Sincronize a pulseira com o aplicativo de forma simples',
    image: step2Image,
  },
  {
    number: '3',
    title: 'Escolha a',
    highlight: 'rota',
    text: 'Defina o ponto de partida do seu filho',
    image: step3Image,
  },
  {
    number: '4',
    title: 'Acompanhe',
    highlight: 'ao vivo',
    text: 'Acompanhe seu filho pra onde quer que ele vá',
    image: step4Image,
  },
];

const Aplicativo = ({ onNavigate }) => {
  return (
    <div className="aplicativo">

      {/* ── Seção 1: Hero / Download ── */}
      <section className="aplicativo__hero">
        <div className="aplicativo__hero-text">
          <span className="aplicativo__hero-badge">Tecnologia que protege</span>

          <h2 className="aplicativo__hero-title">
            Segurança e conectividade<br />
            <span className="aplicativo__hero-title-highlight">no seu pulso</span>
          </h2>

          <p className="aplicativo__hero-desc">
            A pulseira inteligente que monitora, localiza e protege quem você
            ama em tempo real.
          </p>

          <a href="#como-usar" className="aplicativo__hero-btn">
            Como usar?
          </a>

          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('app_area'); }}
            className="aplicativo__hero-playstore"
          >
            <img
              src={googleButton}
              alt="Acessar aplicativo"
            />
          </a>
        </div>

        <div className="aplicativo__hero-visual">
          <img
            src={firstImage}
            alt="Pulseira PulseSafe ao lado do app Armilla no celular"
            className="aplicativo__hero-image"
          />
        </div>
      </section>

      {/* ── Seção 2: Como usar ── */}
      <section id="como-usar" className="aplicativo__howto">
        <div className="aplicativo__howto-banner">
          <h2 className="aplicativo__howto-banner-title">Como usar</h2>
        </div>

        <div className="aplicativo__howto-steps">
          {steps.map((step) => (
            <div key={step.number} className="aplicativo__step">
              <div className="aplicativo__step-text">
                <h2 className="aplicativo__step-title">
                  <span className="aplicativo__step-number">{step.number}</span>
                  {step.title}{' '}
                  <span className="aplicativo__step-highlight">
                    {step.highlight}
                  </span>
                </h2>
                <p className="aplicativo__step-desc">{step.text}</p>
              </div>

              <div className="aplicativo__step-visual">
                <img
                  src={step.image}
                  alt={`Passo ${step.number}: ${step.title} ${step.highlight}`}
                  className="aplicativo__step-image"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="aplicativo__howto-cta">
          <button
            className="aplicativo__howto-btn"
            onClick={() => onNavigate('app_area')}
          >
            Baixe agora
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Aplicativo;
