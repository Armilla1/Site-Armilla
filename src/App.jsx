import React, { useState } from 'react';
import './index.css';
import Home from './pages/Home';
import Comprar from './pages/Comprar.jsx';
import Auth from './pages/Auth.jsx';
import Aplicativo from './pages/Aplicativo.jsx';
import Navbar from './components/Navbar/Navbar.jsx';

function App() {
  const [page, setPage] = useState('home');
  const [authMode, setAuthMode] = useState('login');

  const handleNavigate = (dest, mode) => {
    if (dest === 'login' || dest === 'register') {
      setAuthMode(dest);
      setPage('auth');
    } else {
      setPage(dest);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showNavbar = page !== 'auth';

  return (
    <>
      {showNavbar && <Navbar onNavigate={handleNavigate} currentPage={page} />}
      {page === 'home'       && <Home />}
      {page === 'comprar'    && <Comprar />}
      {page === 'aplicativo' && <Aplicativo onNavigate={handleNavigate} />}
      {page === 'auth'       && <Auth onNavigate={handleNavigate} initialMode={authMode} />}
    </>
  );
}

export default App;
