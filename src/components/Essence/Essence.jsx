import React from 'react';
import './Essence.css';

const cards = [
  {
    title: 'MISSÃO',
    text: 'Proporcionar segurança e tranquilidade aos responsáveis por meio de soluções tecnológicas inteligentes, permitindo o acompanhamento e a proteção de crianças em momentos em que não há supervisão direta, promovendo cuidado, prevenção e bem-estar no dia a dia das famílias.',
  },
  {
    title: 'VISÃO',
    text: 'Auxiliar na segurança preventiva, desenvolvendo tecnologias acessíveis que fortaleçam a proteção infantil e contribuam para um ambiente mais seguro, conectado e confiável para famílias em todo o país.',
  },
  {
    title: 'VALORES',
    text: 'Guiando o desenvolvimento de soluções seguras, inclusivas e confiáveis, sempre priorizando o bem-estar das crianças e a confiança das famílias.',
    list: ['Acessibilidade', 'Ética', 'Transparência', 'Diversidade', 'Respeito'],
  },
];

const Essence = () => {
  return (
    <section className="essence" id="sobre">
      <div className="essence__container">
        <h2 className="essence__title">Nossa Essência</h2>

        <div className="essence__bg">
          <div className="essence__grid">
            {cards.map((card) => (
              <div key={card.title} className="essence__card">
                <h3 className="essence__card-title">{card.title}</h3>
                <p className="essence__card-text">{card.text}</p>
                {card.list && (
                  <ul className="essence__card-list">
                    {card.list.map((item) => (
                      <li key={item} className="essence__card-list-item">• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="essence__actions">
            <a href="#sobre" className="essence__btn">Sobre Nós</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Essence;
