import React from 'react';
import './Milla.css';
import MillaImage from "../../assets/MillaSemFundo.png"

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
              <img src={MillaImage} alt="" />
            </div>
            <div className="milla__bird-glow" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Milla;
