import React, { useState, useEffect } from 'react';
import './Navbar.css';
import logo from "../../assets/logoArmilla.png"

const Navbar = ({ onNavigate, currentPage }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home',        page: 'home',        href: '#home' },
    { label: 'Informações', page: 'informacoes', href: null },
    { label: 'Sobre nós',   page: 'sobre-nos',   href: null },
    { label: 'Comprar',     page: 'comprar',     href: null },
    { label: 'Aplicativo',  page: 'aplicativo',  href: null },
  ];

  const handleLinkClick = (link) => {
    setMenuOpen(false);
    if (onNavigate) onNavigate(link.page);
  };

  const isActive = (link) => currentPage === link.page && link.page !== 'home';

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        <a href="#home" className="navbar__logo" onClick={() => onNavigate && onNavigate('home')}>
          <img src={logo} alt="" />
          <span className="navbar__logo-text">ARMILLA</span>
        </a>

        <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href || undefined}
                className={`navbar__link ${isActive(link) ? 'navbar__link--active' : ''}`}
                onClick={() => handleLinkClick(link)}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="navbar__auth-mobile-item">
            <button className="navbar__btn navbar__btn--login" onClick={() => { setMenuOpen(false); onNavigate && onNavigate('login'); }}>Entrar</button>
          </li>
          <li className="navbar__auth-mobile-item">
            <button className="navbar__btn navbar__btn--signup" onClick={() => { setMenuOpen(false); onNavigate && onNavigate('register'); }}>Cadastrar</button>
          </li>
        </ul>

        <div className="navbar__auth">
          <button className="navbar__btn navbar__btn--login" onClick={() => onNavigate && onNavigate('login')}>Entrar</button>
          <button className="navbar__btn navbar__btn--signup" onClick={() => onNavigate && onNavigate('register')}>Cadastrar</button>
        </div>

        <button
          className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
