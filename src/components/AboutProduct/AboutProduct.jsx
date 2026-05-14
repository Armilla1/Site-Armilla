import React from 'react';
import './AboutProduct.css';

const AboutProduct = () => {
  return (
    <section className="about" id="informacoes">
      <div className="about__container">
        <h2 className="about__title">Sobre Nosso Produto</h2>
        <p className="about__subtitle">mais segurança para seu filho</p>

        <a href="#comprar" className="about__btn">
          Comprar Agora →
        </a>

        <div className="about__grid">
          <div className="about__card about__card--large">
            <div className="about__card-label">GPS integrado</div>
            <div className="about__watches">
              <div className="about__watch about__watch--beige">
                <div className="about__watch-screen" />
                <div className="about__watch-band-t" />
                <div className="about__watch-band-b" />
              </div>
              <div className="about__watch about__watch--purple">
                <div className="about__watch-screen" />
                <div className="about__watch-band-t" />
                <div className="about__watch-band-b" />
              </div>
              <div className="about__watch about__watch--dark">
                <div className="about__watch-screen" />
                <div className="about__watch-band-t" />
                <div className="about__watch-band-b" />
              </div>
            </div>
          </div>

          <div className="about__card about__card--small">
            <div className="about__card-label">Design Confortável</div>
            <div className="about__wrist">
              <div className="about__wrist-arm" />
              <div className="about__wrist-watch">
                <div className="about__watch about__watch--nude">
                  <div className="about__watch-screen" />
                </div>
              </div>
            </div>
          </div>

          <div className="about__card about__card--small">
            <div className="about__card-label">Diversas Cores</div>
            <div className="about__colors-grid">
              <div className="about__watch about__watch--blue"><div className="about__watch-screen" /></div>
              <div className="about__watch about__watch--yellow"><div className="about__watch-screen" /></div>
              <div className="about__watch about__watch--gray"><div className="about__watch-screen" /></div>
              <div className="about__watch about__watch--teal"><div className="about__watch-screen" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutProduct;
