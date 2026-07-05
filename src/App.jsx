import React, { useState } from 'react';
import './index.css';
import Home from './pages/Home';
import PulseSafe from './pages/PulseSafe.jsx';
import Comprar from './pages/Comprar.jsx';
import Auth from './pages/Auth.jsx';
import SobreNos from './pages/SobreNos.jsx'
import Aplicativo from './pages/Aplicativo.jsx';
import Navbar from './components/Navbar/Navbar.jsx';
import { AccessibilityProvider } from './context/AccessibilityContext';
import AccessibilityPanel from './components/Accessibility/AccessibilityPanel.jsx';
import ChaveDeRecuperacao from './pages/ChaveDeRecuperacao';
import NovaSenha from './pages/NovaSenha';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import Dashboard from './pages/Dashboard.jsx';

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
      {page === 'home'       && <Home currentPage={page} onNavigate={handleNavigate}/>}
      {page === 'informacoes'&& <PulseSafe currentPage={page} onNavigate={handleNavigate}/>}
      {page === 'sobre-nos'  && <SobreNos currentPage={page} onNavigate={handleNavigate}/>}
      {page === 'comprar'    && <Comprar currentPage={page} onNavigate={handleNavigate}/>}
      {page === 'aplicativo' && <Aplicativo currentPage={page} onNavigate={handleNavigate} />}
      {page === 'auth'       && <Auth onNavigate={handleNavigate} initialMode={authMode} />}
      {page === 'dashboard'  && <Dashboard onNavegar={handleNavigate} />}
      {page === 'chave-de-recuperacao' && (<ChaveDeRecuperacao onNavigate={handleNavigate} userEmail="teste@email.com" />)}
      {page === 'nova-senha' && (<NovaSenha onNavigate={handleNavigate}/>)}
      <ScrollToTop />
  
      <AccessibilityProvider>
        <AccessibilityPanel />
      </AccessibilityProvider>
      
      </>
  );
}

export default App;
