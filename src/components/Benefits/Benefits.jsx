import React from 'react';
import './Benefits.css';
import menina2 from "../../assets/menina2.png"
import menino1 from "../../assets/menino1.png"

const safetyBenefits = [
  'Mais segurança para crianças',
  'Tranquilidade para pais e responsáveis',
  'Botão de emergência',
  'Prevenção de situações perigosas',
  'Tecnologia acessível e fácil de usar',
  'Promoção da autonomia com segurança',
];

const comfortBenefits = [
  'Conforto no uso diário',
  'Material resistente e seguro',
  'Design simples e intuitivo',
  'Ajuste adaptável ao pulso',
  'Visual moderno e amigável',
  'Discrição e leveza',
];

const Benefits = () => {
  return (
    <section className="benefits">
      <div className="benefits__container">
        <h2 className="benefits__title">Benefícios da Pulseira</h2>

        <div className="benefits__cards">
          <div className="benefits__card benefits__card--left">
            <div className="benefits__image-placeholder benefits__image--child">
              <div className="benefits__img-circle">
                <img src={menina2} alt="" />
              </div>
            </div>
            <ul className="benefits__list">
              {safetyBenefits.map((b) => (
                <li key={b} className="benefits__item">
                  <span className="benefits__bullet">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="benefits__card benefits__card--right">
            <ul className="benefits__list">
              {comfortBenefits.map((b) => (
                <li key={b} className="benefits__item">
                  <span className="benefits__bullet">•</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="benefits__image-placeholder benefits__image--kid">
              <div className="benefits__img-circle">
                <img src={menino1} alt="" />
              </div>
            </div>
          </div>
        </div>

        <a href="#informacoes" className="benefits__btn">Saiba Mais</a>
      </div>
    </section>
  );
};

export default Benefits;
