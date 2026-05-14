import React, { useState } from 'react';
import './Community.css';

const testimonials = [
  {
    name: 'Ana Silva',
    avatar: 'AS',
    rating: 5,
    text: 'Uma solução inovadora que traz mais segurança e tranquilidade para famílias no dia a dia.',
  },
  {
    name: 'Aline Souza',
    avatar: 'AL',
    rating: 5,
    text: 'Projeto inteligente e necessário, principalmente para a proteção de crianças em ambientes públicos.',
  },
  {
    name: 'Rogério Mendes',
    avatar: 'RM',
    rating: 5,
    text: 'A pulseira une tecnologia e cuidado de forma simples e eficiente.',
  },
  {
    name: 'Ana Carolina',
    avatar: 'AC',
    rating: 4,
    text: 'Ideia moderna que fortalece a sensação de segurança dos pais.',
  },
  {
    name: 'Lucas Ferreira',
    avatar: 'LF',
    rating: 5,
    text: 'Meu filho usa todos os dias. A tranquilidade que isso me traz não tem preço.',
  },
];

const Stars = ({ count }) => (
  <div className="community__stars">
    {[...Array(5)].map((_, i) => (
      <span key={i} className={`community__star ${i < count ? 'community__star--filled' : ''}`}>★</span>
    ))}
  </div>
);

const Community = () => {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1));

  const getVisible = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      visible.push(testimonials[(current + i) % testimonials.length]);
    }
    return visible;
  };

  return (
    <section className="community">
      <div className="community__container">
        <h2 className="community__title">Nossa comunidade</h2>

        <div className="community__track-wrapper">
          <div className="community__track">
            {getVisible().map((t, i) => (
              <div key={t.name + i} className={`community__card ${i === 1 ? 'community__card--featured' : ''}`}>
                <div className="community__card-header">
                  <div className="community__avatar">{t.avatar}</div>
                  <span className="community__name">{t.name}</span>
                </div>
                <Stars count={t.rating} />
                <p className="community__text">{t.text}</p>
              </div>
            ))}
          </div>

          <button className="community__nav community__nav--prev" onClick={prev} aria-label="Anterior">
            ←
          </button>
          <button className="community__nav community__nav--next" onClick={next} aria-label="Próximo">
            →
          </button>
        </div>

        <div className="community__dots">
          {testimonials.map((_, i) => (
            <button
              key={i}
              className={`community__dot ${i === current ? 'community__dot--active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Depoimento ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Community;
