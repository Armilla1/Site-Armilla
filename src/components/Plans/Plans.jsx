import React from 'react';
import './Plans.css';

const plans = [
  {
    name: 'Gratuito',
    price: 'Gratuito',
    isFree: true,
    features: [
      'Localização em tempo real',
      '1 rota segura',
      '1 responsável conectado',
      'Histórico das últimas 24h',
      'Alertas básicos: Saída da rota, Chegada ao destino, Status da pulseira',
    ],
    cta: 'Inicie Aqui',
    recommended: false,
  },
  {
    name: 'Plus',
    price: 'R$24,90/mês',
    isFree: false,
    features: [
      'Rotas seguras ilimitadas',
      'Múltiplas áreas seguras',
      'Histórico de 7–30 dias',
      'Até 3 responsáveis',
      'Notificações em tempo real prioritárias',
      'Alertas completos: Atraso, Parada incomum, Bateria baixa, Pulseira removida',
    ],
    cta: 'Assine Agora',
    recommended: true,
  },
  {
    name: 'Pro',
    price: 'R$49,90/mês',
    isFree: false,
    features: [
      'Histórico ilimitado',
      'Checkpoints no trajeto',
      'Sugestão de rotas',
      'Rotinas automáticas',
      'Responsáveis ilimitados',
      'Dashboard completo',
      'Suporte prioritário',
    ],
    cta: 'Atualize para Pro',
    recommended: false,
  },
];

const Plans = () => {
  return (
    <section className="plans" id="comprar">
      <div className="plans__container">
        <h2 className="plans__title">Planos de assinatura</h2>

        <div className="plans__grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`plans__card ${plan.recommended ? 'plans__card--recommended' : ''}`}
            >
              <div className="plans__card-header">
                <h3 className="plans__plan-name">{plan.name}</h3>
                <div className={`plans__price ${plan.isFree ? 'plans__price--free' : ''}`}>
                  {plan.price}
                </div>
              </div>

              <ul className="plans__features">
                {plan.features.map((f) => (
                  <li key={f} className="plans__feature">
                    <span className="plans__feature-dot">•</span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.recommended && (
                <div className="plans__badge">Recomendado 🔥</div>
              )}

              <button className={`plans__cta ${plan.recommended ? 'plans__cta--recommended' : ''}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Plans;
