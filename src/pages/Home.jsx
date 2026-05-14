import React from 'react';
import Navbar from '../components/Navbar/Navbar.jsx';
import Hero from '../components/Hero/Hero.jsx';
import AboutProduct from '../components/AboutProduct/AboutProduct.jsx';
import Community from '../components/Community/Community.jsx';
import Benefits from '../components/Benefits/Benefits.jsx';
import Plans from '../components/Plans/Plans.jsx';
import Milla from '../components/Milla/Milla.jsx';
import Essence from '../components/Essence/Essence.jsx';
import Footer from '../components/Footer/Footer.jsx';

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <AboutProduct />
      <Community />
      <Benefits />
      <Plans />
      <Milla />
      <Essence />
      <Footer />
    </>
  );
};

export default Home;
