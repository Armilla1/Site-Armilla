import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <p className="footer__tagline">Fique atualizado</p>

        <div className="footer__grid">
          <div className="footer__col">
            <h4 className="footer__col-title">Produtos</h4>
            <ul className="footer__links">
              <li><a href="#informacoes" className="footer__link">Pulseira</a></li>
              <li><a href="#aplicativo" className="footer__link">Aplicativo</a></li>
              <li><a href="#comprar" className="footer__link">Planos</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Redes Sociais</h4>
            <ul className="footer__links">
              <li><a href="#" className="footer__link">Instagram</a></li>
              <li><a href="#" className="footer__link">LinkedIn</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Dúvidas</h4>
            <ul className="footer__links">
              <li><a href="#" className="footer__link">Suporte</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Sobre</h4>
            <ul className="footer__links">
              <li><a href="#sobre" className="footer__link">Sobre nós</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Armilla. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
