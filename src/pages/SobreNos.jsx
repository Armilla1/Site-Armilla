import React, { useState } from 'react';
import './SobreNos.css';

const team = [
  {
    name: 'Breno Bueno',
    role: 'Fullstack Developer',
    emoji: '💻',
    color: 'cyan',
    linkedin: 'https://www.linkedin.com/in/breno-bueno-mesquita-7b30551b5/',
    github: 'https://github.com/1BrenoBM',
  },
  {
    name: 'Bruna Lopes',
    role: 'Product Owner',
    emoji: '🎯',
    color: 'purple',
    linkedin: 'https://www.linkedin.com/in/brunalopessm/',
    github: 'https://github.com/BrunaLopessm',
  },
  {
    name: 'Cainan Santos',
    role: 'Scrum Master',
    emoji: '🔄',
    color: 'blue',
    linkedin: 'https://www.linkedin.com/in/cainandossantos/',
    github: 'https://github.com/Cainan-dos-Santos',
  },
  {
    name: 'Giovanna Karoline',
    role: 'Back-end Developer',
    emoji: '⚙️',
    color: 'pink',
    linkedin: 'https://www.linkedin.com/in/giovanna-karolline',
    github: 'https://github.com/GiovannaKarolline',
  },
  {
    name: 'Grazielly Pereira',
    role: 'Marketing',
    emoji: '📣',
    color: 'cyan',
    linkedin: 'https://www.linkedin.com/in/grazielly-de-oliveira-pereira-842073387/',
    github: 'https://github.com/GraziellyOlpe',
  },
  {
    name: 'Gustavo Neves',
    role: 'Financeiro',
    emoji: '💰',
    color: 'purple',
    linkedin: 'https://www.linkedin.com/in/gustavo-henrique-martins-neves/',
    github: 'https://github.com/AqueeleGu',
  },
  {
    name: 'Samuel Pacheco',
    role: 'Back-end Developer',
    emoji: '🛠️',
    color: 'blue',
    linkedin: 'https://www.linkedin.com/in/samuel-pacheco-falc%C3%A3o-rodrigues-14b162237/',
    github: 'https://github.com/styuu-1',
  },
];

const specs = [
  { icon: '📡', label: 'Conectividade', value: 'GPS + Rede Celular', desc: 'Localização precisa sem depender do celular da criança' },
  { icon: '💧', label: 'Resistência', value: 'À prova d\'água', desc: 'Pode molhar, pode brincar — a pulseira aguenta tudo' },
  { icon: '🔋', label: 'Bateria', value: 'Longa duração', desc: 'Dias de uso contínuo com uma única carga' },
  { icon: '🎨', label: 'Design', value: 'Colorido & leve', desc: 'As crianças amam usar — confortável e divertido' },
  { icon: '📳', label: 'Vibração', value: 'Alerta háptico', desc: 'A criança recebe confirmação tátil ao entrar em área segura' },
  { icon: '🔗', label: 'Pareamento', value: 'Via Bluetooth', desc: 'Conexão rápida e simples com o aplicativo Armilla' },
];

const SobreNos = ({ onNavigate }) => {
  const [activeSpec, setActiveSpec] = useState(null);

  return (
    <div className="sobre">

      {/* ── HERO ── */}
      <section className="sobre__hero">
        <div className="sobre__hero-bg">
          <div className="sobre__hero-orb sobre__hero-orb--1" />
          <div className="sobre__hero-orb sobre__hero-orb--2" />
          <div className="sobre__hero-orb sobre__hero-orb--3" />
          <div className="sobre__hero-grid" />
        </div>
        <div className="sobre__hero-content">
          <div className="sobre__hero-badge">
            <span className="sobre__hero-badge-dot" />
            Conheça a Armilla
          </div>
          <h1 className="sobre__hero-title">
            Tecnologia a serviço<br />
            <span className="sobre__hero-gradient">da segurança infantil</span>
          </h1>
          <p className="sobre__hero-sub">
            A Armilla nasceu de uma ideia simples: toda criança merece ser protegida
            com tecnologia de verdade. Uma pulseira inteligente conectada a um app
            que coloca a tranquilidade dos pais na palma da mão.
          </p>
          <div className="sobre__hero-ctas">
            <button
              className="sobre__hero-cta sobre__hero-cta--primary"
              onClick={() => onNavigate && onNavigate('comprar')}
            >
              🛒 Comprar pulseira
            </button>
            <button
              className="sobre__hero-cta sobre__hero-cta--secondary"
              onClick={() => onNavigate && onNavigate('aplicativo')}
            >
              📱 Ver aplicativo
            </button>
          </div>
        </div>

        {/* Pulseira visual */}
        <div className="sobre__hero-visual">
          <div className="sobre__bracelet-wrap">
            <div className="sobre__bracelet-glow" />
            <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="sobre__bracelet-svg">
              <circle cx="130" cy="130" r="110" stroke="url(#sbGrad1)" strokeWidth="22" strokeLinecap="round" fill="none" strokeDasharray="570 120"/>
              <circle cx="130" cy="130" r="110" stroke="url(#sbGrad2)" strokeWidth="8" fill="none" strokeDasharray="260 570" strokeDashoffset="150"/>
              <circle cx="130" cy="130" r="50" fill="url(#sbCenter)"/>
              <circle cx="130" cy="130" r="32" fill="rgba(255,255,255,0.06)"/>
              <path d="M130 108 C122 108 117 115 117 130 C117 142 122 146 126 147 C126 143 127.5 139 130 137 C132.5 139 134 143 134 147 C138 146 143 142 143 130 C143 115 138 108 130 108Z" fill="url(#sbIcon)"/>
              <circle cx="130" cy="164" r="6" fill="url(#sbDot)" opacity="0.9"/>
              <defs>
                <linearGradient id="sbGrad1" x1="0" y1="0" x2="260" y2="260" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#A121C5"/>
                  <stop offset="0.5" stopColor="#7F6AE1"/>
                  <stop offset="1" stopColor="#19A7FF"/>
                </linearGradient>
                <linearGradient id="sbGrad2" x1="260" y1="0" x2="0" y2="260" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#19A7FF" stopOpacity="0.9"/>
                  <stop offset="1" stopColor="#CAA3F9" stopOpacity="0.5"/>
                </linearGradient>
                <radialGradient id="sbCenter" cx="50%" cy="35%" r="65%" gradientUnits="objectBoundingBox">
                  <stop stopColor="#1a0035"/>
                  <stop offset="1" stopColor="#0a0014"/>
                </radialGradient>
                <linearGradient id="sbIcon" x1="117" y1="108" x2="143" y2="147" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#CAA3F9"/>
                  <stop offset="1" stopColor="#66C3E7"/>
                </linearGradient>
                <linearGradient id="sbDot" x1="124" y1="158" x2="136" y2="170" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#19A7FF"/>
                  <stop offset="1" stopColor="#A121C5"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="sobre__bracelet-pulse" />
            <div className="sobre__bracelet-pulse sobre__bracelet-pulse--2" />
          </div>

          {/* Floating badges */}
          <div className="sobre__float-badge sobre__float-badge--1">📍 GPS ativo</div>
          <div className="sobre__float-badge sobre__float-badge--2">🛡️ Área segura</div>
          <div className="sobre__float-badge sobre__float-badge--3">🔋 87%</div>
        </div>
      </section>

      {/* ── MISSÃO ── */}
      <section className="sobre__mission">
        <div className="sobre__mission-inner">
          <div className="sobre__mission-text">
            <span className="sobre__eyebrow">Nossa missão</span>
            <h2 className="sobre__section-title">
              Por que a Armilla<br />existe?
            </h2>
            <p className="sobre__mission-desc">
              Crianças merecem liberdade para explorar o mundo — e pais merecem
              a paz de saber que seus filhos estão seguros. A Armilla une esses
              dois mundos com uma pulseira inteligente que monitora em tempo real,
              envia alertas instantâneos e nunca deixa você sem informação.
            </p>
            <p className="sobre__mission-desc">
              Nosso produto foi desenvolvido por estudantes apaixonados por
              tecnologia e segurança, com foco em acessibilidade, design intuitivo
              e proteção real — não só no papel.
            </p>
            <div className="sobre__mission-stats">
              <div className="sobre__stat">
                <span className="sobre__stat-num">24/7</span>
                <span className="sobre__stat-label">Monitoramento</span>
              </div>
              <div className="sobre__stat">
                <span className="sobre__stat-num">&lt;3s</span>
                <span className="sobre__stat-label">Tempo de alerta</span>
              </div>
              <div className="sobre__stat">
                <span className="sobre__stat-num">100%</span>
                <span className="sobre__stat-label">Foco em segurança</span>
              </div>
            </div>
          </div>

          <div className="sobre__mission-visual">
            <div className="sobre__milla-card">
              <div className="sobre__milla-glow" />
              <div className="sobre__milla-emoji">🐦</div>
              <h3 className="sobre__milla-name">MILLA</h3>
              <p className="sobre__milla-desc">
                Nossa pombinha guardiã monitora a localização da criança
                em tempo real e envia avisos imediatos sempre que algo sair
                do esperado — saída de área segura, rota diferente, bateria
                baixa e muito mais.
              </p>
              <div className="sobre__milla-tags">
                <span>Tempo real</span>
                <span>Alertas</span>
                <span>Rotas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULSEIRA ── */}
      <section className="sobre__produto">
        <div className="sobre__produto-bg">
          <div className="sobre__produto-orb" />
        </div>
        <div className="sobre__produto-inner">
          <div className="sobre__produto-header">
            <span className="sobre__eyebrow sobre__eyebrow--light">A pulseira</span>
            <h2 className="sobre__section-title sobre__section-title--white">
              Hardware pensado<br />para crianças
            </h2>
            <p className="sobre__produto-sub">
              Compacta, resistente e divertida. A pulseira Armilla foi
              desenhada para ser confortável no pulso infantil e poderosa
              o suficiente para tranquilizar qualquer responsável.
            </p>
          </div>

          <div className="sobre__specs-grid">
            {specs.map((s, i) => (
              <div
                key={i}
                className={`sobre__spec-card ${activeSpec === i ? 'sobre__spec-card--active' : ''}`}
                onClick={() => setActiveSpec(activeSpec === i ? null : i)}
              >
                <div className="sobre__spec-icon">{s.icon}</div>
                <div className="sobre__spec-label">{s.label}</div>
                <div className="sobre__spec-value">{s.value}</div>
                {activeSpec === i && (
                  <div className="sobre__spec-desc">{s.desc}</div>
                )}
              </div>
            ))}
          </div>

          <div className="sobre__produto-cta">
            <span className="sobre__produto-price">R$199,90</span>
            <button
              className="sobre__produto-btn"
              onClick={() => onNavigate && onNavigate('pagamento')}
            >
              Comprar agora
            </button>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="sobre__como">
        <div className="sobre__como-inner">
          <span className="sobre__eyebrow">Como funciona</span>
          <h2 className="sobre__section-title">Do pulso da criança<br />ao seu celular</h2>

          <div className="sobre__como-flow">
            <div className="sobre__como-step">
              <div className="sobre__como-num">01</div>
              <div className="sobre__como-icon">⌚</div>
              <h3>Pulseira no pulso</h3>
              <p>A criança usa a pulseira Armilla, que capta a localização via GPS e rede celular de forma contínua.</p>
            </div>
            <div className="sobre__como-arrow">→</div>
            <div className="sobre__como-step">
              <div className="sobre__como-num">02</div>
              <div className="sobre__como-icon">📡</div>
              <h3>Dados em tempo real</h3>
              <p>As informações são transmitidas instantaneamente para os servidores da Armilla com segurança.</p>
            </div>
            <div className="sobre__como-arrow">→</div>
            <div className="sobre__como-step">
              <div className="sobre__como-num">03</div>
              <div className="sobre__como-icon">📱</div>
              <h3>App notifica você</h3>
              <p>Você recebe o mapa ao vivo e alertas inteligentes direto no celular, em menos de 3 segundos.</p>
            </div>
            <div className="sobre__como-arrow">→</div>
            <div className="sobre__como-step">
              <div className="sobre__como-num">04</div>
              <div className="sobre__como-icon">🛡️</div>
              <h3>Família protegida</h3>
              <p>Você reage rápido quando importa. Rotas seguras, áreas definidas, tranquilidade garantida.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── EQUIPE ── */}
      <section className="sobre__equipe">
        <div className="sobre__equipe-bg">
          <div className="sobre__equipe-orb sobre__equipe-orb--1" />
          <div className="sobre__equipe-orb sobre__equipe-orb--2" />
        </div>
        <div className="sobre__equipe-inner">
          <span className="sobre__eyebrow sobre__eyebrow--light">Quem fez</span>
          <h2 className="sobre__section-title sobre__section-title--white">
            O time por trás<br />da Armilla
          </h2>
          <p className="sobre__equipe-sub">
            Estudantes movidos por propósito — construindo tecnologia que protege
            famílias e transforma a forma como pais acompanham seus filhos.
          </p>

          <div className="sobre__equipe-grid">
            {team.map((member, i) => (
              <div key={i} className={`sobre__member-card sobre__member-card--${member.color}`}>
                <div className="sobre__member-avatar">
                  <span className="sobre__member-emoji">{member.emoji}</span>
                </div>
                <div className="sobre__member-info">
                  <h3 className="sobre__member-name">{member.name}</h3>
                  <p className="sobre__member-role">{member.role}</p>
                </div>
                <div className="sobre__member-links">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sobre__member-link sobre__member-link--linkedin"
                    aria-label={`LinkedIn de ${member.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sobre__member-link sobre__member-link--github"
                    aria-label={`GitHub de ${member.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="sobre__cta-final">
        <div className="sobre__cta-content">
          <div className="sobre__cta-milla">🐦</div>
          <h2 className="sobre__cta-title">
            Pronto para proteger<br />
            <span>quem você ama?</span>
          </h2>
          <p className="sobre__cta-sub">
            Comece com o plano gratuito ou adquira a pulseira já.
            A Milla está pronta para cuidar da sua família.
          </p>
          <div className="sobre__cta-btns">
            <button
              className="sobre__cta-btn-primary"
              onClick={() => onNavigate && onNavigate('comprar')}
            >
              Ver planos
            </button>
            <button
              className="sobre__cta-btn-secondary"
              onClick={() => onNavigate && onNavigate('aplicativo')}
            >
              Conhecer o app
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SobreNos;
