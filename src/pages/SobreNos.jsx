import React from 'react';
import './SobreNos.css';
import Footer from '../components/Footer/Footer.jsx';

const teamMembers = [
  { name: 'Bruna Lopes',       role: 'Product Owner',  photo: '/assets/team/bruna.png',    color: 'purple' },
  { name: 'Cainan Aparecido',  role: 'Scrum Master',   photo: '/assets/team/cainan.png',   color: 'blue'   },
  { name: 'Gustavo Henrique',  role: 'Financeiro',     photo: '/assets/team/gustavo.png',  color: 'blue'   },
  { name: 'Grazielly Oliveira',role: 'Marketing',      photo: '/assets/team/grazielly.png',color: 'purple' },
  { name: 'Giovanna Karolline',role: 'Desenvolvedora', photo: '/assets/team/giovanna.png', color: 'purple' },
  { name: 'Samuel Pacheco',    role: 'Desenvolvedor',  photo: '/assets/team/samuel.png',   color: 'blue'   },
  { name: 'Breno Bueno',       role: 'Desenvolvedor',  photo: '/assets/team/breno.png',    color: 'purple' },
  { name: 'Milla',             role: 'Mascote',        photo: '/assets/team/milla.png',    color: 'blue'   },
];

const SobreNos = ({ onNavigate }) => {
  return (
    <div className="sobre">

      {/* ── Seção 1: Hero ── */}
      <section className="sobre__hero">
        <div className="sobre__hero-overlay" />
        <div className="sobre__hero-content">
          <h1 className="sobre__hero-title">Sobre Nós</h1>
        </div>
        <div className="sobre__hero-brand">
          <img
            src="/assets/armilla-logo.png"
            alt="Logo Armilla"
            className="sobre__hero-logo"
          />
          <span className="sobre__hero-brand-name">ARMILLA</span>
          <p className="sobre__hero-slogan">
            Proteção em cada passo, sossego em cada aventura.
          </p>
        </div>
      </section>

      {/* ── Seção 2: Origem ── */}
      <section className="sobre__origem">
        <h2 className="sobre__origem-title">Origem</h2>

        <div className="sobre__origem-body">
          {/* Bloco 1: problema */}
          <div className="sobre__origem-problem">
            <p>
              A violência no Brasil, especialmente em cidades como São Paulo,
              ainda afeta muitas crianças, com casos de sequestro, assédio e abuso.
            </p>
          </div>

          {/* Bloco 2: solução + imagem */}
          <div className="sobre__origem-solution">
            <div className="sobre__origem-solution-text">
              <p>
                Por isso, surge o projeto Armilla, um bracelete inteligente que
                aumenta a segurança infantil com localização por GPS e alerta de
                emergência via SMS para os responsáveis.
              </p>
            </div>
            <div className="sobre__origem-solution-image">
              <img
                src="/assets/kids-bracelet.png"
                alt="Crianças usando a pulseira inteligente Armilla"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Seção 3: Time ── */}
      <section className="sobre__time">
        <h2 className="sobre__time-title">Quem está por trás?</h2>

        <div className="sobre__time-grid">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className={`sobre__member sobre__member--${member.color}`}
            >
              <div className="sobre__member-photo-wrap">
                <img
                  src={member.photo}
                  alt={member.name}
                  className="sobre__member-photo"
                />
              </div>
              <div className="sobre__member-info">
                <span className="sobre__member-name">{member.name}</span>
                <span className="sobre__member-role">{member.role}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Seção 4: CTA ── */}
      <section className="sobre__cta">
        <p className="sobre__cta-text">
          Saiba mais sobre a{' '}
          <span className="sobre__cta-highlight">PulseSafe</span>
        </p>
        <button
          className="sobre__cta-btn"
          onClick={() => onNavigate('informacoes')}
        >
          Saiba Mais
        </button>
      </section>

      <Footer />

    </div>
  );
};

export default SobreNos;
