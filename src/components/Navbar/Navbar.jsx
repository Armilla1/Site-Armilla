import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Informações', href: '#informacoes' },
    { label: 'Sobre nós', href: '#sobre' },
    { label: 'Comprar', href: '#comprar' },
    { label: 'Aplicativo', href: '#aplicativo' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        <a href="#home" className="navbar__logo">
          <div className="navbar__logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" stroke="url(#logoGrad)" strokeWidth="2"/>
              <path d="M20 8C14 8 10 13 10 20C10 25 13 28 17 29C17 26 18 23 20 21C22 23 23 26 23 29C27 28 30 25 30 20C30 13 26 8 20 8Z" fill="url(#logoGrad2)"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a855f7"/>
                  <stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
                <linearGradient id="logoGrad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c084fc"/>
                  <stop offset="1" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="navbar__logo-text">ARMILLA</span>
        </a>

        <ul className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="navbar__link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
