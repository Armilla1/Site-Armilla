import React, { useState } from 'react';
import './Comprar.css';
import white from "../assets/pulsesafe-branco.png"
import black from  "../assets/pulsesafe-preto.png"
import pink from "../assets/pulsesafe-rosa.png"
import blue from "../assets/pulsesafe-azul.png"
import purple from "../assets/pulsesafe-roxo.png"
import yellow from "../assets/pulsesafe-amarelo.png"

const colorImages = {
  white, black, pink, blue, purple, yellow
};

const plans = [
  {
    name: 'Gratuito',
    price: null,
    priceLabel: 'Gratuito',
    isFree: true,
    tagline: 'Comece sem custo',
    features: [
      { text: 'Localização em tempo real', included: true },
      { text: '1 rota segura', included: true },
      { text: '1 responsável conectado', included: true },
      { text: 'Histórico das últimas 24h', included: true },
      { text: 'Alertas básicos: Saída da rota, Chegada ao destino, Status da pulseira', included: true },
      { text: 'Múltiplas rotas e áreas seguras', included: false },
      { text: 'Responsáveis ilimitados', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    cta: 'Inicie Agora',
    color: 'cyan',
    recommended: false,
  },
  {
    name: 'Plus',
    price: 24.90,
    priceLabel: 'R$24,90',
    period: '/mês',
    isFree: false,
    tagline: 'Mais proteção, mais tranquilidade',
    features: [
      { text: 'Rotas seguras ilimitadas', included: true },
      { text: 'Múltiplas áreas seguras', included: true },
      { text: 'Histórico de 7–30 dias', included: true },
      { text: 'Até 3 responsáveis conectados', included: true },
      { text: 'Notificações em tempo real prioritárias', included: true },
      { text: 'Alertas completos: Atraso, Parada incomum, Bateria baixa, Pulseira removida', included: true },
      { text: 'Dashboard completo', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    cta: 'Assine Agora',
    color: 'purple',
    recommended: true,
  },
  {
    name: 'Pro',
    price: 49.90,
    priceLabel: 'R$49,90',
    period: '/mês',
    isFree: false,
    tagline: 'Controle total para sua família',
    features: [
      { text: 'Histórico ilimitado', included: true },
      { text: 'Checkpoints personalizados no trajeto', included: true },
      { text: 'Sugestão inteligente de rotas', included: true },
      { text: 'Rotinas automáticas', included: true },
      { text: 'Responsáveis ilimitados', included: true },
      { text: 'Dashboard completo com relatórios', included: true },
      { text: 'Notificações em tempo real prioritárias', included: true },
      { text: 'Suporte prioritário 24/7', included: true },
    ],
    cta: 'Assinar Pro',
    color: 'blue',
    recommended: false,
  },
];

const faqs = [
  {
    q: 'A pulseira é vendida separadamente?',
    a: 'Sim! A pulseira Armilla é vendida por R$199,90 e funciona com qualquer plano, incluindo o Gratuito. Ela é compacta, colorida e resistente à água — perfeita para crianças.',
  },
  {
    q: 'Posso cancelar minha assinatura a qualquer momento?',
    a: 'Sim, sem fidelidade. Você pode cancelar ou fazer downgrade para o plano Gratuito a qualquer momento diretamente pelo aplicativo.',
  },
  {
    q: 'Como funciona o monitoramento em tempo real?',
    a: 'A pulseira usa GPS + rede celular para enviar a localização da criança continuamente. Os responsáveis recebem atualizações e alertas instantâneos pelo aplicativo Armilla.',
  },
  {
    q: 'A Armilla funciona sem internet no celular da criança?',
    a: 'Sim! A pulseira tem conectividade própria — não depende do celular da criança. Basta estar na área de cobertura de rede.',
  },
];

const Comprar = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [productColor, setProductColor] = useState('purple');
  const [productQty, setProductQty]     = useState(1);

  return (
    <div className="comprar">
      {/* Pulseira Banner */}
    <section className="comprar__product">
      <div className="comprar__product-inner">

        {/* Imagem */}
        <div className="comprar__product-image-wrap">
          {/*}<img
            src="/assets/pulsesafe-bracelets.png"
            alt="Pulseira inteligente PulseSafe em várias cores"
            className="comprar__product-image"
          />{*/}
          <img
          src={colorImages[productColor]}
          alt="Pulseira inteligente PulseSafe"
          className="comprar__product-image"
          />
        </div>

        {/* Detalhes */}
        <div className="comprar__product-text">
          <h2 className="comprar__product-title">
            <span className="comprar__">
              Pulseira inteligente PulseSafe
            </span>
          </h2>

          <div className="comprar__product-price-row">
            <span className="comprar__product-price">
              R${(150 * productQty).toFixed(2).replace(".", ",")}
            </span>

            <div className="comprar__product-colors-wrap">
              <span className="comprar__product-colors-label">Cores</span>
              <div className="comprar__product-colors">
                {[
                  { id: "white",  hex: "#E8E8F0", label: "Branco"  },
                  { id: "black",  hex: "#2D2D3A", label: "Preto"   },
                  { id: "pink",   hex: "#F4A7B9", label: "Rosa"    },
                  { id: "blue",   hex: "#4B9FE1", label: "Azul"    },
                  { id: "purple", hex: "#5B2D8E", label: "Roxo"    },
                  { id: "yellow", hex: "#D4B84A", label: "Amarelo" },
                ].map((color) => (
                  <button
                    key={color.id}
                    className={`comprar__color-btn ${productColor === color.id ? "comprar__color-btn--active" : ""}`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={color.label}
                    title={color.label}
                    onClick={() => setProductColor(color.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="comprar__product-qty-wrap">
            <label className="comprar__product-qty-label">Quantidade</label>
            <div className="comprar__product-qty-select-wrap">
              <select
                className="comprar__product-qty-select"
                value={productQty}
                onChange={(e) => setProductQty(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="comprar__product-btn">Comprar</button>
        </div>

      </div>
    </section>

      {/* Hero */}
      <section className="comprar__hero">
        <div className="comprar__hero-bg">
          <div className="comprar__hero-orb comprar__hero-orb--1" />
          <div className="comprar__hero-orb comprar__hero-orb--2" />
          <div className="comprar__hero-orb comprar__hero-orb--3" />
        </div>
        <div className="comprar__hero-content">
          <div className="comprar__hero-badge">🛡️ Segurança para sua família</div>
          <h1 className="comprar__hero-title">
            Escolha o plano<br />
            <span className="comprar__hero-gradient">ideal para você</span>
          </h1>
          <p className="comprar__hero-sub">
            Monitore, proteja e acompanhe seu filho onde estiver.<br />
            Comece grátis e faça upgrade quando quiser.
          </p>

          <div className="comprar__billing-toggle">
            <button
              className={`comprar__billing-btn ${billing === 'monthly' ? 'active' : ''}`}
              onClick={() => setBilling('monthly')}
            >
              Mensal
            </button>
            <button
              className={`comprar__billing-btn ${billing === 'annual' ? 'active' : ''}`}
              onClick={() => setBilling('annual')}
            >
              Anual <span className="comprar__billing-save">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="comprar__plans">
        <div className="comprar__plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`comprar__card comprar__card--${plan.color} ${plan.recommended ? 'comprar__card--recommended' : ''}`}
            >
              {plan.recommended && (
                <div className="comprar__recommended-badge">⭐ Mais Popular</div>
              )}

              <div className="comprar__card-top">
                <h3 className="comprar__card-name">{plan.name}</h3>
                <p className="comprar__card-tagline">{plan.tagline}</p>

                <div className="comprar__card-price">
                  {plan.isFree ? (
                    <span className="comprar__price-free">Gratuito</span>
                  ) : (
                    <>
                      <span className="comprar__price-value">
                        {billing === 'annual'
                          ? `R$${(plan.price * 0.8).toFixed(2).replace('.', ',')}`
                          : plan.priceLabel.replace('.', ',')}
                      </span>
                      <span className="comprar__price-period">{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="comprar__features">
                {plan.features.map((f, i) => (
                  <li key={i} className={`comprar__feature ${!f.included ? 'comprar__feature--disabled' : ''}`}>
                    <span className="comprar__feature-icon">
                      {f.included ? '✓' : '✕'}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              <button className={`comprar__cta comprar__cta--${plan.color}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Pulseira Banner */}
      <section className="comprar__product">
        <div className="comprar__product-inner">
          <div className="comprar__product-text">
            <div className="comprar__product-badge">Hardware</div>
            <h2 className="comprar__product-title">
              A pulseira inteligente<br />
              <span>Armilla</span>
            </h2>
            <p className="comprar__product-desc">
              Tecnologia GPS + rede celular em um design colorido e resistente. 
              Confortável para crianças, poderosa para pais. Compatível com todos os planos.
            </p>
            <ul className="comprar__product-specs">
              <li>📍 GPS em tempo real</li>
              <li>💧 Resistente à água</li>
              <li>🔋 Bateria de longa duração</li>
              <li>🎨 Design colorido e divertido</li>
            </ul>
            <div className="comprar__product-price-row">
              <span className="comprar__product-price">R$199,90</span>
              <button className="comprar__product-btn">Comprar Pulseira</button>
            </div>
            <p className="comprar__product-note">Disponível também no Mercado Livre e Shopee</p>
          </div>
          <div className="comprar__product-visual">
            <div className="comprar__product-glow" />
            <div className="comprar__product-mockup">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="comprar__wristband-svg">
                <circle cx="100" cy="100" r="85" stroke="url(#wGrad)" strokeWidth="18" strokeLinecap="round" fill="none" strokeDasharray="440 100"/>
                <circle cx="100" cy="100" r="85" stroke="url(#wGrad2)" strokeWidth="6" strokeLinecap="round" fill="none" strokeDasharray="200 440" strokeDashoffset="120"/>
                <circle cx="100" cy="100" r="38" fill="url(#wCenter)"/>
                <circle cx="100" cy="100" r="24" fill="rgba(255,255,255,0.12)"/>
                <path d="M100 82 C94 82 90 87 90 100 C90 110 94 113 97 114 C97 111 98 108 100 106 C102 108 103 111 103 114 C106 113 110 110 110 100 C110 87 106 82 100 82Z" fill="url(#wIcon)"/>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a855f7"/>
                    <stop offset="0.5" stopColor="#7b2fff"/>
                    <stop offset="1" stopColor="#38bdf8"/>
                  </linearGradient>
                  <linearGradient id="wGrad2" x1="200" y1="0" x2="0" y2="200" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" stopOpacity="0.8"/>
                    <stop offset="1" stopColor="#a855f7" stopOpacity="0.4"/>
                  </linearGradient>
                  <radialGradient id="wCenter" cx="50%" cy="40%" r="60%" gradientUnits="objectBoundingBox">
                    <stop stopColor="#1a0035"/>
                    <stop offset="1" stopColor="#0d0020"/>
                  </radialGradient>
                  <linearGradient id="wIcon" x1="90" y1="82" x2="110" y2="114" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c084fc"/>
                    <stop offset="1" stopColor="#60a5fa"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="comprar__product-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="comprar__testimonials">
        <h2 className="comprar__section-title">O que nossos clientes dizem</h2>
        <div className="comprar__testimonials-grid">
          {[
            { name: 'Tatiane L.', role: 'Mãe de 1 filho', text: 'Finalmente consigo acompanhar o Davi no caminho da escola sem precisar ligar a cada 5 minutos. Que alívio!', stars: 5 },
            { name: 'Marcos R.', role: 'Pai de 2 filhos', text: 'O alerta de bateria baixa me salvou várias vezes. Aplicativo é super fácil de usar.', stars: 5 },
            { name: 'Carla M.', role: 'Mãe de 3 filhos', text: 'Assino o plano Pro e vale cada centavo. Ter o dashboard completo e sugestão de rotas é incrível.', stars: 5 },
          ].map((t, i) => (
            <div key={i} className="comprar__testimonial-card">
              <div className="comprar__testimonial-stars">{'★'.repeat(t.stars)}</div>
              <p className="comprar__testimonial-text">"{t.text}"</p>
              <div className="comprar__testimonial-author">
                <div className="comprar__testimonial-avatar">{t.name[0]}</div>
                <div>
                  <div className="comprar__testimonial-name">{t.name}</div>
                  <div className="comprar__testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="comprar__faq">
        <div className="comprar__faq-inner">
          <h2 className="comprar__section-title">Dúvidas frequentes</h2>
          <div className="comprar__faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`comprar__faq-item ${openFaq === i ? 'comprar__faq-item--open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="comprar__faq-question">
                  <span>{faq.q}</span>
                  <span className="comprar__faq-icon">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div className="comprar__faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="comprar__cta-section">
        <div className="comprar__cta-bg">
          <div className="comprar__cta-orb" />
        </div>
        <div className="comprar__cta-content">
          <h2 className="comprar__cta-title">Pronto para proteger quem você ama?</h2>
          <p className="comprar__cta-sub">Comece grátis hoje. Sem cartão de crédito necessário.</p>
          <div className="comprar__cta-btns">
            <button className="comprar__cta-btn-primary">Começar Gratuitamente</button>
            <button className="comprar__cta-btn-secondary">Falar com a Equipe</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Comprar;