import React from 'react';
import './Milla.css';

const Milla = () => {
  return (
    <section className="milla">
      <div className="milla__container">
        <div className="milla__content">
          <div className="milla__text">
            <h2 className="milla__title">
              Conheça a <span className="milla__title-highlight">MILLA</span>,<br />
              nossa pombinha guardiã!
            </h2>
            <p className="milla__description">
              A Milla monitora a localização da criança em tempo real através da
              pulseira inteligente, acompanhando cada passo com segurança e
              precisão. Sempre que algo diferente acontecer, como sair de uma
              área segura ou mudar de localização inesperadamente, ela envia
              avisos imediatos para os pais ou responsáveis.
            </p>
          </div>

          <div className="milla__mascot">
            <div className="milla__bird">
              {/* Dove SVG mascot */}
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body */}
                <ellipse cx="100" cy="120" rx="45" ry="40" fill="url(#birdBody)"/>
                {/* Head */}
                <circle cx="130" cy="80" r="28" fill="url(#birdHead)"/>
                {/* Eye */}
                <circle cx="138" cy="76" r="8" fill="white"/>
                <circle cx="140" cy="76" r="5" fill="#4a1d96"/>
                <circle cx="142" cy="74" r="2" fill="white"/>
                {/* Beak */}
                <path d="M155 82 L168 78 L155 86 Z" fill="#f59e0b"/>
                {/* Wing left */}
                <path d="M60 100 C30 80 20 110 40 130 C55 145 85 135 95 115Z" fill="url(#wingGrad)"/>
                {/* Wing right detail */}
                <path d="M75 105 C50 90 42 112 58 128" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none"/>
                {/* Tail */}
                <path d="M60 140 C40 155 30 165 50 160 C60 155 65 145 70 135Z" fill="url(#tailGrad)"/>
                <path d="M70 140 C55 158 48 170 65 163 C74 158 76 148 78 138Z" fill="url(#tailGrad2)"/>
                {/* GPS pin on chest */}
                <circle cx="100" cy="118" r="10" fill="#7c3aed"/>
                <path d="M100 108C96.7 108 94 110.7 94 114C94 118.5 100 124 100 124C100 124 106 118.5 106 114C106 110.7 103.3 108 100 108Z" fill="#a78bfa"/>
                <circle cx="100" cy="114" r="3" fill="white"/>
                {/* Blush */}
                <ellipse cx="120" cy="92" rx="7" ry="5" fill="rgba(244, 114, 182, 0.4)"/>
                <defs>
                  <linearGradient id="birdBody" x1="55" y1="80" x2="145" y2="160" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c4b5fd"/>
                    <stop offset="1" stopColor="#a78bfa"/>
                  </linearGradient>
                  <linearGradient id="birdHead" x1="102" y1="52" x2="158" y2="108" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ddd6fe"/>
                    <stop offset="1" stopColor="#c4b5fd"/>
                  </linearGradient>
                  <linearGradient id="wingGrad" x1="20" y1="80" x2="95" y2="145" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#93c5fd"/>
                    <stop offset="1" stopColor="#6d28d9"/>
                  </linearGradient>
                  <linearGradient id="tailGrad" x1="30" y1="135" x2="70" y2="165" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a78bfa"/>
                    <stop offset="1" stopColor="#7c3aed"/>
                  </linearGradient>
                  <linearGradient id="tailGrad2" x1="48" y1="138" x2="78" y2="170" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c4b5fd"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="milla__bird-glow" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Milla;
