import React, { useState } from 'react';
import './index.css';
import Home from './pages/Home';
import Comprar from './pages/Comprar.jsx';
import Auth from './pages/Auth.jsx';
import Aplicativo from './pages/Aplicativo.jsx';
import Navbar from './components/Navbar/Navbar.jsx';

function App() {
  const [page, setPage] = useState("home");
  const [authMode, setAuthMode] = useState('login');

  const handleNavigate = (pagina) => {
    if (pagina === 'login' || pagina === 'register') {
      setAuthMode(pagina);
      setPage('auth');
    } else {
      setPage(pagina);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showNavbar = page !== 'auth';

  return (
    <>
      {console.log(`${page}`)}
      {showNavbar && <Navbar currentPage={page} onNavigate={handleNavigate} />}
      {page === 'home'       && <Home currentPage={page}/>}
      {page === 'comprar'    && <Comprar currentPage={page} onNavigate={handleNavigate}/>}
      {page === 'aplicativo' && <Aplicativo currentPage={page} onNavigate={handleNavigate} />}
      {page === 'auth'       && <Auth onNavigate={handleNavigate} initialMode={authMode} />}
    </>
  );
}

export default App;
