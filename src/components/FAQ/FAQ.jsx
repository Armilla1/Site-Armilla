import React, { useState } from 'react';
import './Essence.css';

const faqs = [
  {
    q: 'O que é a Armilla?',
    a: 'A Armilla é uma solução de segurança infantil que combina uma pulseira inteligente com GPS e um aplicativo mobile. Ela permite que pais e responsáveis acompanhem em tempo real a localização de seus filhos, recebam alertas de desvio de rota e definam áreas seguras.',
  },
  {
    q: 'Como funciona a pulseira Armilla?',
    a: 'A pulseira usa tecnologia GPS + rede celular para enviar a localização da criança continuamente ao aplicativo dos responsáveis. Ela não precisa do celular da criança — tem conectividade própria. É resistente à água, tem design colorido e bateria de longa duração.',
  },
  {
    q: 'Para quem a Armilla é indicada?',
    a: 'Para pais, mães e responsáveis que desejam mais segurança no dia a dia dos filhos — especialmente durante trajetos escolares, passeios ou qualquer situação em que a criança esteja fora da supervisão direta de um adulto.',
  },
  {
    q: 'Quais tipos de alertas a Armilla envia?',
    a: 'Dependendo do plano, a Armilla pode enviar alertas de: saída de rota, chegada ao destino, status da pulseira, bateria baixa, parada incomum, pulseira removida e atraso no trajeto. Os planos Plus e Pro têm alertas completos em tempo real.',
  },
  {
    q: 'A pulseira precisa de chip ou internet no celular da criança?',
    a: 'Não! A pulseira Armilla tem conectividade própria e não depende do celular da criança. Basta que esteja na área de cobertura de rede — o acompanhamento funciona de forma independente.',
  },
  {
    q: 'Onde posso comprar a pulseira?',
    a: 'A pulseira pode ser adquirida diretamente pelo nosso site por R$199,90, ou pelos marketplaces Mercado Livre e Shopee. Ela é compatível com todos os planos, inclusive o Gratuito.',
  },
];

const Essence = () => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section className="essence" id="sobre">
      <div className="essence__container">
        {/* FAQ */}
        <div className="essence__faq">
          <div className="essence__faq-header">
            <span className="essence__faq-eyebrow">Tire suas dúvidas</span>
            <h3 className="essence__faq-title">Perguntas Frequentes</h3>
            <p className="essence__faq-sub">Tudo que você precisa saber sobre o projeto Armilla</p>
          </div>

          <div className="essence__faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`essence__faq-item ${openFaq === i ? 'essence__faq-item--open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="essence__faq-question">
                  <div className="essence__faq-q-left">
                    <span className="essence__faq-num">0{i + 1}</span>
                    <span className="essence__faq-q-text">{faq.q}</span>
                  </div>
                  <span className="essence__faq-icon">
                    {openFaq === i ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </span>
                </div>
                <div className={`essence__faq-answer-wrap ${openFaq === i ? 'essence__faq-answer-wrap--open' : ''}`}>
                  <div className="essence__faq-answer">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Essence;
