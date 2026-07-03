import "./pulsesafe.css";
import AppImage from "../assets/AppImage.png"
import Footer from "../components/Footer/Footer";
import AboutProduct from "../components/AboutProduct/AboutProduct.jsx";

const features = [
  {
    title: "Localização em tempo real",
    description:
      "Permite que os responsáveis acompanhem, em tempo real, a localização da criança pelo aplicativo, garantindo mais segurança e tranquilidade.",
  },
  {
    title: "Controle de rota segura",
    description:
      "Permite definir trajetos seguros para a criança, enviando alertas aos responsáveis caso ela saia da rota ou da área estabelecida, garantindo mais proteção e monitoramento contínuo.",
  },
  {
    title: "Emite alertas",
    description:
      "A PulseSafe envia alertas instantâneos aos responsáveis em situações importantes, como saída de área segura ou possíveis riscos, permitindo uma resposta rápida e aumentando a segurança da criança.",
  },
  {
    title: "Histórico de rotas",
    description:
      "Registra os trajetos percorridos pela criança, permitindo que os responsáveis visualizem o histórico de deslocamentos e acompanhem sua rotina com mais segurança.",
  },
];

export default function PulseSafe( props ) {
  return (
    <div>
      <AboutProduct currentPage={props.currentPage}/>

      {/* ── Seção: O que a PulseSafe faz ── */}
      <section className="ps-features">
        <h2 className="ps-features__title">O que a PulseSafe faz?</h2>
        <div className="ps-features__grid">
          {features.map((feature, index) => (
            <div key={index} className="ps-card">
              <h3 className="ps-card__title">{feature.title}</h3>
              <p className="ps-card__description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transição / Banner ── */}
      <section className="ps-banner">
        <p className="ps-banner__text">
          PulseSafe é para pais que querem proteger suas crianças
        </p>
      </section>

      {/* ── Seção: Nosso App ── */}
      <section className="ps-app">
        <h2 className="ps-app__title">Nosso App</h2>
        <img
          src= {AppImage}
          alt="Aplicativo Armilla"
          className="ps-app__image"
        />
        <p className="ps-app__description">
          O aplicativo Armilla é a plataforma que conecta os responsáveis à
          PulseSafe, permitindo acompanhar a localização da criança, receber
          alertas e visualizar informações importantes em tempo real.
        </p>
        <button
          className="ps-btn ps-btn--outline"
          onClick={() => props.onNavigate && props.onNavigate('aplicativo')}
        >
          Conheça nosso APP
        </button>
      </section>

      {/* ── Seção: CTA de compra ── */}
      <section className="ps-cta">
        <p className="ps-cta__text">
          Garanta já uma{" "}
          <span className="ps-cta__highlight">PulseSafe</span> para sua criança
        </p>
        <button className="ps-btn ps-btn--solid" onClick={() => props.onNavigate && props.onNavigate('comprar')}> 
          Comprar
        </button>
      </section>
      <Footer />
    </div>
  );
}
