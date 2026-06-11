import React from 'react';
import './AboutProduct.css';
import pulseSafeCores from "../../assets/pulseSafeCores.png"
import pulseSafeCores2 from "../../assets/pulseSafeCores2.png"
import pulseSafeBraco from "../../assets/pulsesafeBraco.png"
import menina1 from "../../assets/menina1.png"
import meninoNina from "../../assets/meninoNina.png"

const AboutProduct = (props) => {
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
            
            {props.currentPage === "home" && 
            <>
            <div className="about__card-label">Diversas Cores</div>
            <img src={pulseSafeCores} alt=""/>
            </>
            }
            {props.currentPage === "informacoes" && <img src={pulseSafeCores} alt=""/>}
          </div>

          <div className="about__card about__card--small">
            {props.currentPage === "home" && 
            <>
            <div className="about__card-label">GPS integrado</div>
            <img src={pulseSafeCores2} alt=""/>
            </>
            }
            {props.currentPage === "informacoes" && <img src={menina1} alt=""/>}
            
          </div>

          <div className="about__card about__card--small">
            {props.currentPage === "home" && 
            <>
            <div className="about__card-label">Design Confortável</div>
            <img src={pulseSafeBraco} alt=""/>
            </>
            }
            {props.currentPage === "informacoes" && <img src={meninoNina} alt=""/>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutProduct;
