import React from 'react';
import Hero from '../components/Hero/Hero.jsx';
import AboutProduct from '../components/AboutProduct/AboutProduct.jsx';
import Community from '../components/Community/Community.jsx';
import Benefits from '../components/Benefits/Benefits.jsx';
import Plans from '../components/Plans/Plans.jsx';
import Milla from '../components/Milla/Milla.jsx';
import Essence from '../components/Essence/Essence.jsx';
import Footer from '../components/Footer/Footer.jsx';

const Home = ( props ) => {
  return (
    <>
      <Hero currentPage={props.currentPage}/>
      <AboutProduct currentPage={props.currentPage} onNavigate={props.onNavigate}/>
      <Community />
      <Benefits currentPage={props.currentPage} onNavigate={props.onNavigate}/>
      <Plans />
      <Milla />
      <Essence currentPage={props.currentPage} onNavigate={props.onNavigate}/>
      <Footer />
    </>
  );
};

export default Home;
