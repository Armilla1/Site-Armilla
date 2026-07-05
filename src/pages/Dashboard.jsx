import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://armilla.runasp.net';

// =============================================================================
// CONSTANTES DE EMERGÊNCIA
// Números fixos nacionais — não precisam de banco de dados
// =============================================================================
const EMERGENCIA = [
  { label: 'Polícia', numero: '190', cor: '#3b82f6', icone: 'policia' },
  { label: 'SAMU',    numero: '192', cor: '#ef4444', icone: 'samu'    },
  { label: 'Bombeiro',numero: '193', cor: '#f97316', icone: 'bombeiro'},
];

// =============================================================================
// UTILITÁRIOS
// =============================================================================
const getToken = () => sessionStorage.getItem('armilla_token');
const getUser  = () => {
  try { return JSON.parse(sessionStorage.getItem('armilla_usuario') || '{}'); }
  catch { return {}; }
};

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // CORREÇÃO DE REVISÃO: o Error lançado aqui não tinha a propriedade
    // ".status". O App.jsx escuta o evento global "unhandledrejection" e lê
    // event.reason.status para decidir qual tela de erro mostrar automaticamente
    // (ver mapStatusParaTipo em CatalogoErros.jsx). Sem anexar .status no erro,
    // qualquer chamada de apiFetch que falhasse SEM try/catch local nunca
    // acionava o catálogo de erros — o handler global simplesmente não tinha
    // como saber se era um 401, 404, 500, etc. Agora o status HTTP fica
    // disponível tanto para quem captura o erro localmente (err.message)
    // quanto para o handler global (err.status).
    const erro = new Error(err.Erro || err.erro || `Erro ${res.status}`);
    erro.status = res.status;
    throw erro;
  }
  return res.json();
}

// Calcula idade em anos
function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function statusBateria(nivel) {
  if (nivel === null || nivel === undefined) return { cor: '#6b7280', texto: 'Desconhecido' };
  if (nivel > 60) return { cor: '#22c55e', texto: `${nivel}%` };
  if (nivel > 20) return { cor: '#f59e0b', texto: `${nivel}%` };
  return { cor: '#ef4444', texto: `${nivel}% — Baixa!` };
}

// =============================================================================
// COMPONENTE: ÍCONES (sem emoji, apenas SVG/CSS)
// =============================================================================
const Icon = ({ name, size = 20, color = 'currentColor' }) => {
  const s = { width: size, height: size, flexShrink: 0 };
  const icons = {
    policia: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L8 6H4v4l-2 2 2 2v4h4l4 4 4-4h4v-4l2-2-2-2V6h-4L12 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    samu: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8"/>
        <path d="M8 12h8M12 8v8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 6V4a1 1 0 011-1h8a1 1 0 011 1v2" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    bombeiro: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 6 6 10 8 14c-2-1-3-3-3-5C3 14 5 20 12 22c7-2 9-8 7-13-1 2-2 3-4 3 2-4 1-8-3-10z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    mapa: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M9 3v15M15 6v15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    pin: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="1.8"/>
        <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    alerta: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 20h20L12 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M12 9v5M12 16.5v.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    crianca: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    pulseira: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="9" width="14" height="6" rx="3" stroke={color} strokeWidth="1.8"/>
        <path d="M8 9V7a4 4 0 018 0v2M8 15v2a4 4 0 008 0v-2" stroke={color} strokeWidth="1.8"/>
        <circle cx="12" cy="12" r="1.5" fill={color}/>
      </svg>
    ),
    bateria: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="16" height="10" rx="2" stroke={color} strokeWidth="1.8"/>
        <path d="M18 10v4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="4" y="9" width="8" height="6" rx="1" fill={color} opacity="0.5"/>
      </svg>
    ),
    wifi: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="20" r="1" fill={color}/>
      </svg>
    ),
    editar: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    mais: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    fechar: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    check: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    foto: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8"/>
        <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    sair: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    zona: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" strokeDasharray="4 2"/>
        <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    historico: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M3 3v5h5M12 7v5l4 2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    medico: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    bluetooth: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    contatos: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    acessibilidade: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="4.5" r="1.5" fill={color}/>
        <path d="M7 8h10M12 8v8M9 22v-5M15 22v-5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      </svg>
    ),
    email: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.8"/>
        <path d="M2 7l10 7 10-7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    configurar: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    olho: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.8"/>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
    olhoFechado: (
      <svg style={s} viewBox="0 0 24 24" fill="none">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[name] || <span style={{ ...s, display: 'inline-block' }} />;
};

// =============================================================================
// NOTA DE CORREÇÃO (revisão de código):
// Esta versão do Dashboard tinha um componente PainelAcessibilidade próprio,
// totalmente duplicado em relação ao AccessibilityContext.jsx +
// AccessibilityPanel.jsx já existentes no resto do site. Isso causava DOIS
// problemas reais, visíveis ao usuário:
//
//   1. Dois botões flutuantes "Acessibilidade" sobrepostos no canto da tela
//      ao mesmo tempo (o painel global do App.jsx + este daqui).
//   2. Duas chaves de localStorage diferentes ("a11y_contraste" aqui vs.
//      "armilla_a11y_contraste" no Context) controlando o MESMO atributo
//      data-contraste na tag <html> — qual delas "ganhava" dependia da
//      ordem de execução dos useEffect, então a preferência do usuário
//      podia parecer não salvar, ou resetar ao trocar de página.
//
// CORREÇÃO: o Dashboard agora importa e usa o AccessibilityPanel real
// (mesmo componente usado em Home, SobreNos, etc.), garantindo uma única
// fonte de verdade para o estado de acessibilidade em todo o site.
// =============================================================================

// =============================================================================
// COMPONENTE: MODAL GENÉRICO
// =============================================================================
const Modal = ({ titulo, onFechar, children }) => (
  <div className="modal-overlay" onClick={onFechar}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3 className="modal-titulo">{titulo}</h3>
        <button className="modal-fechar" onClick={onFechar}><Icon name="fechar" size={18} /></button>
      </div>
      <div className="modal-corpo">{children}</div>
    </div>
  </div>
);

// =============================================================================
// COMPONENTE: MAPA LEAFLET (OpenStreetMap — sem chave de API)
// CONEXÃO: app.Localizacoes (lat/lng) + app.ZonasSeguras (círculos no mapa)
// =============================================================================
const MapaLeaflet = ({ criancas, zonas }) => {
  const mapaRef = useRef(null);
  const instanciaRef = useRef(null);
  const marcadoresRef = useRef({});
  const zonasRef = useRef([]);

  useEffect(() => {
    let cancelado = false;

    // CORREÇÃO DE REVISÃO: a versão anterior injetava um novo <script> do
    // Leaflet no <head> toda vez que este componente montava, sem checar se
    // ele já tinha sido carregado antes. Em um SPA, isso acontece sempre que
    // o usuário sai do Dashboard e volta — e o segundo carregamento do script
    // do Leaflet, somado à falta de um mapa.remove() no cleanup, lançava a
    // exceção "Map container is already initialized" e/ou deixava a instância
    // antiga presa em memória (vazamento). A correção abaixo:
    //   1. Reaproveita o Leaflet já carregado (window.L) se existir.
    //   2. Usa um atributo data-leaflet-loading no <script> para nunca
    //      injetar o mesmo <script> duas vezes em paralelo.
    //   3. Remove a instância do mapa no cleanup do useEffect, garantindo
    //      que remontar o componente sempre comece do zero corretamente.
    function inicializarMapa() {
      if (cancelado || instanciaRef.current || !mapaRef.current) return;
      const L = window.L;
      if (!L) return;

      const mapa = L.map(mapaRef.current, { zoomControl: true, attributionControl: true })
        .setView([-23.5505, -46.6333], 13); // São Paulo como padrão

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);

      instanciaRef.current = mapa;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => { if (!cancelado) mapa.setView([pos.coords.latitude, pos.coords.longitude], 15); },
          () => {}
        );
      }
    }

    if (window.L) {
      // Leaflet já foi carregado em uma montagem anterior deste componente
      // (ex: usuário saiu do Dashboard e voltou) — reaproveita sem rebaixar
      // outro <script>.
      inicializarMapa();
    } else if (!document.querySelector('script[data-leaflet-loading]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.setAttribute('data-leaflet-loading', 'true');
      script.onload = () => {
        script.removeAttribute('data-leaflet-loading');
        inicializarMapa();
      };
      document.head.appendChild(script);
    } else {
      // Outro componente já está no meio do carregamento do script — espera
      // o evento "load" dele em vez de competir por outra tag <script>.
      const scriptExistente = document.querySelector('script[data-leaflet-loading]');
      scriptExistente?.addEventListener('load', inicializarMapa);
    }

    return () => {
      cancelado = true;
      if (instanciaRef.current) {
        instanciaRef.current.remove();
        instanciaRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!instanciaRef.current || !L) return;

    // Limpa marcadores antigos
    Object.values(marcadoresRef.current).forEach(m => m.remove());
    marcadoresRef.current = {};

    // Adiciona marcadores de crianças
    criancas.forEach(c => {
      if (!c.ultimaLocalizacao) return;
      const { lat, lng } = c.ultimaLocalizacao;
      const icone = L.divIcon({
        className: '',
        html: `<div class="mapa-marcador ${c.statusConexao === 'ONLINE' ? 'online' : 'offline'}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const m = L.marker([lat, lng], { icon: icone })
        .addTo(instanciaRef.current)
        .bindPopup(`<b>${c.nomeCompleto}</b><br>Última atualização: agora`);
      marcadoresRef.current[c.id] = m;
    });
  }, [criancas]);

  useEffect(() => {
    const L = window.L;
    if (!instanciaRef.current || !L) return;

    // Limpa zonas anteriores
    zonasRef.current.forEach(z => z.remove());
    zonasRef.current = [];

    // Desenha zonas seguras
    zonas.forEach(z => {
      if (z.tipo === 'CIRCULO' && z.latitude && z.longitude) {
        const circulo = L.circle([z.latitude, z.longitude], {
          radius: z.raioMetros || 200,
          color: z.cor || '#a855f7',
          fillColor: z.cor || '#a855f7',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(instanciaRef.current).bindPopup(`Zona segura: ${z.nome}`);
        zonasRef.current.push(circulo);
      }
    });
  }, [zonas]);

  return (
    <div className="mapa-container">
      <div ref={mapaRef} className="mapa-leaflet" id="mapa-leaflet" />
      <div className="mapa-legenda">
        <div className="mapa-legenda-item">
          <span className="mapa-dot online" />
          Online
        </div>
        <div className="mapa-legenda-item">
          <span className="mapa-dot offline" />
          Offline
        </div>
        <div className="mapa-legenda-item">
          <span className="mapa-dot zona" />
          Zona segura
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: MODAL CADASTRO DE CRIANÇA
// CONEXÃO: POST /api/criancas → app.Criancas
// =============================================================================
const ModalCadastroCrianca = ({ onFechar, onSalvar }) => {
  const [form, setForm] = useState({
    nomeCompleto: '', apelido: '', dataNascimento: '', genero: '',
    escolaNome: '', consentimentoLGPD: false,
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [etapa, setEtapa] = useState(1); // 1=dados, 2=médico, 3=confirmação

  const [medico, setMedico] = useState({
    tipoSanguineo: '', peso: '', altura: '', planoDeSaude: '',
    alergias: '', medicamentos: '', condicoes: '', observacoes: '',
  });

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErro('Foto deve ter menos de 5 MB.'); return; }
    setFoto(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const salvar = async () => {
    if (!form.nomeCompleto || !form.dataNascimento) {
      setErro('Nome e data de nascimento são obrigatórios.'); return;
    }
    if (!form.consentimentoLGPD) {
      setErro('O consentimento LGPD é obrigatório para cadastrar a criança.'); return;
    }
    setLoading(true); setErro('');
    try {
      const payload = {
        NomeCompleto: form.nomeCompleto, Apelido: form.apelido,
        DataNascimento: form.dataNascimento, Genero: form.genero,
        EscolaNome: form.escolaNome, ConsentimentoLGPD: form.consentimentoLGPD,
      };
      const criancaRes = await apiFetch('/api/criancas', { method: 'POST', body: JSON.stringify(payload) });

      // Se houver dados médicos, envia também
      if (medico.tipoSanguineo || medico.alergias || medico.condicoes) {
        await apiFetch(`/api/criancas/${criancaRes.id}/medico`, {
          method: 'POST',
          body: JSON.stringify({
            TipoSanguineo: medico.tipoSanguineo,
            // CORREÇÃO DE REVISÃO: peso/altura vinham do <input type="number">
            // como string (ex: "12.5"), mas o backend espera decimal? no DTO
            // C#. O System.Text.Json rejeita strings numéricas para campos
            // decimal por padrão, então enviar "12.5" sem converter fazia
            // este POST falhar sempre que o responsável preenchesse peso ou
            // altura, com um erro 400 pouco claro. Number(...) converte para
            // número de fato antes do JSON.stringify, e o fallback para null
            // cobre tanto string vazia quanto valores não numéricos digitados.
            Peso: medico.peso ? Number(medico.peso) : null,
            Altura: medico.altura ? Number(medico.altura) : null,
            PlanoDeSaude: medico.planoDeSaude,
            AlergiasDescricao: medico.alergias, MedicamentosUso: medico.medicamentos,
            CondicoesEspeciais: medico.condicoes, ObservacoesUrgencia: medico.observacoes,
          }),
        });
      }
      onSalvar(criancaRes);
    } catch(e) { setErro(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal titulo="Cadastrar criança" onFechar={onFechar}>
      <div className="modal-etapas">
        {[1,2,3].map(n => (
          <div key={n} className={`etapa-dot ${etapa >= n ? 'ativa' : ''} ${etapa > n ? 'concluida' : ''}`}>
            {etapa > n ? <Icon name="check" size={12} color="white" /> : n}
          </div>
        ))}
      </div>

      {etapa === 1 && (
        <div className="form-grade">
          <div className="form-foto-upload">
            <div className="foto-preview" onClick={() => document.getElementById('foto-crianca').click()}>
              {fotoPreview
                ? <img src={fotoPreview} alt="Foto" className="foto-img" />
                : <div className="foto-placeholder"><Icon name="foto" size={32} color="rgba(255,255,255,0.3)" /></div>
              }
              <div className="foto-overlay"><Icon name="foto" size={16} color="white" /><span>Foto</span></div>
            </div>
            <input id="foto-crianca" type="file" accept="image/*" onChange={handleFoto} style={{display:'none'}} />
            <span className="foto-dica">Clique para adicionar foto (máx. 5 MB)</span>
          </div>

          <div className="form-campo">
            <label>Nome completo</label>
            <input type="text" placeholder="Nome da criança" value={form.nomeCompleto}
              onChange={e => setForm(p => ({...p, nomeCompleto: e.target.value}))} />
          </div>
          <div className="form-campo">
            <label>Apelido (opcional)</label>
            <input type="text" placeholder="Como a criança é chamada" value={form.apelido}
              onChange={e => setForm(p => ({...p, apelido: e.target.value}))} />
          </div>
          <div className="form-campo">
            <label>Data de nascimento</label>
            <input type="date" value={form.dataNascimento}
              onChange={e => setForm(p => ({...p, dataNascimento: e.target.value}))} />
          </div>
          <div className="form-campo">
            <label>Gênero</label>
            <select value={form.genero} onChange={e => setForm(p => ({...p, genero: e.target.value}))}>
              <option value="">Prefiro não informar</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
            </select>
          </div>
          <div className="form-campo">
            <label>Nome da escola (opcional)</label>
            <input type="text" placeholder="Escola Municipal..." value={form.escolaNome}
              onChange={e => setForm(p => ({...p, escolaNome: e.target.value}))} />
          </div>

          <div className="form-lgpd">
            <label className="lgpd-label">
              <input type="checkbox" checked={form.consentimentoLGPD}
                onChange={e => setForm(p => ({...p, consentimentoLGPD: e.target.checked}))} />
              <span>
                Consinto com a coleta e tratamento dos dados desta criança para fins de segurança e monitoramento,
                conforme a <strong>LGPD (Lei 13.709/2018)</strong>. Os dados serão usados exclusivamente para
                proteção e localização em emergências.
              </span>
            </label>
          </div>

          {erro && <div className="form-erro">{erro}</div>}
          <div className="form-acoes">
            <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
            <button className="btn-primario" onClick={() => { if (!form.nomeCompleto || !form.dataNascimento) { setErro('Preencha nome e data de nascimento.'); return; } setErro(''); setEtapa(2); }}>
              Próximo
            </button>
          </div>
        </div>
      )}

      {etapa === 2 && (
        <div className="form-grade">
          <div className="form-aviso-lgpd">
            <Icon name="medico" size={16} color="#a855f7" />
            <span>Dados médicos são sensíveis pela LGPD. Use apenas o necessário para emergências.</span>
          </div>
          <div className="form-linha">
            <div className="form-campo">
              <label>Tipo sanguíneo</label>
              <select value={medico.tipoSanguineo} onChange={e => setMedico(p => ({...p, tipoSanguineo: e.target.value}))}>
                <option value="">Não informado</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-campo">
              <label>Plano de saúde</label>
              <input type="text" placeholder="Unimed, Bradesco..." value={medico.planoDeSaude}
                onChange={e => setMedico(p => ({...p, planoDeSaude: e.target.value}))} />
            </div>
          </div>
          <div className="form-campo">
            <label>Alergias (use vírgulas para separar)</label>
            <textarea placeholder="Amendoim, penicilina, látex..." value={medico.alergias}
              onChange={e => setMedico(p => ({...p, alergias: e.target.value}))} rows={2} />
          </div>
          <div className="form-campo">
            <label>Medicamentos em uso</label>
            <textarea placeholder="Ritalina 10mg, insulina..." value={medico.medicamentos}
              onChange={e => setMedico(p => ({...p, medicamentos: e.target.value}))} rows={2} />
          </div>
          <div className="form-campo">
            <label>Condições especiais</label>
            <textarea placeholder="Autismo, epilepsia, diabetes..." value={medico.condicoes}
              onChange={e => setMedico(p => ({...p, condicoes: e.target.value}))} rows={2} />
          </div>
          <div className="form-campo">
            <label>O que fazer numa emergência</label>
            <textarea placeholder="Em caso de convulsão, não imobilize..." value={medico.observacoes}
              onChange={e => setMedico(p => ({...p, observacoes: e.target.value}))} rows={2} />
          </div>
          <div className="form-acoes">
            <button className="btn-secundario" onClick={() => setEtapa(1)}>Voltar</button>
            <button className="btn-primario" onClick={() => setEtapa(3)}>Próximo</button>
          </div>
        </div>
      )}

      {etapa === 3 && (
        <div className="form-grade">
          <div className="resumo-cadastro">
            <div className="resumo-linha"><strong>Nome:</strong> {form.nomeCompleto}</div>
            {form.apelido && <div className="resumo-linha"><strong>Apelido:</strong> {form.apelido}</div>}
            <div className="resumo-linha"><strong>Nascimento:</strong> {new Date(form.dataNascimento).toLocaleDateString('pt-BR')}</div>
            {form.escolaNome && <div className="resumo-linha"><strong>Escola:</strong> {form.escolaNome}</div>}
            {medico.alergias && <div className="resumo-linha resumo-alerta"><Icon name="alerta" size={14} color="#f59e0b" /><strong>Alergias:</strong> {medico.alergias}</div>}
            {medico.condicoes && <div className="resumo-linha resumo-alerta"><Icon name="medico" size={14} color="#a855f7" /><strong>Condições:</strong> {medico.condicoes}</div>}
          </div>
          {erro && <div className="form-erro">{erro}</div>}
          <div className="form-acoes">
            <button className="btn-secundario" onClick={() => setEtapa(2)}>Voltar</button>
            <button className="btn-primario" onClick={salvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar cadastro'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// =============================================================================
// COMPONENTE: MODAL CONFIRMAÇÃO DE E-MAIL
// CONEXÃO: POST /api/auth/confirmar-email → app.ConfirmacaoEmail
// =============================================================================
const ModalConfirmacaoEmail = ({ email, onFechar, onConfirmado }) => {
  const [codigo, setCodigo] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [reenviar, setReenviar] = useState(0);
  const refs = useRef([]);

  const handleDigito = (i, v) => {
    const val = v.replace(/\D/g,'').slice(-1);
    const novo = [...codigo]; novo[i] = val; setCodigo(novo);
    if (val && i < 5) refs.current[i+1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) refs.current[i-1]?.focus();
  };

  const confirmar = async () => {
    const c = codigo.join('');
    if (c.length < 6) { setErro('Preencha todos os 6 dígitos.'); return; }
    setLoading(true); setErro('');
    try {
      await apiFetch('/api/auth/confirmar-email', {
        method: 'POST',
        body: JSON.stringify({ Codigo: c }),
      });
      onConfirmado();
    } catch(e) { setErro(e.message); } finally { setLoading(false); }
  };

  const iniciarReenvio = async () => {
    if (reenviar > 0) return;
    try {
      await apiFetch('/api/auth/reenviar-confirmacao', { method: 'POST' });
      setReenviar(60);
      const t = setInterval(() => setReenviar(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
    } catch(e) { setErro(e.message); }
  };

  return (
    <Modal titulo="Confirmar e-mail" onFechar={onFechar}>
      <div className="form-grade centrado">
        <div className="conf-email-icone"><Icon name="email" size={40} color="#a855f7" /></div>
        <p className="conf-email-texto">
          Enviamos um código de 6 dígitos para <strong>{email}</strong>.
          Verifique sua caixa de entrada e spam.
        </p>
        <div className="conf-digitos">
          {codigo.map((d, i) => (
            <input key={i} ref={el => refs.current[i] = el} className={`conf-digito ${d?'preenchido':''}`}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigito(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)} />
          ))}
        </div>
        <p className="conf-dica">O código expira em 15 minutos e é de uso único.</p>
        {erro && <div className="form-erro">{erro}</div>}
        <button className="btn-primario largura-total" onClick={confirmar} disabled={loading}>
          {loading ? 'Verificando...' : 'Confirmar e-mail'}
        </button>
        <button className={`btn-link ${reenviar>0?'desabilitado':''}`} onClick={iniciarReenvio} disabled={reenviar>0}>
          {reenviar > 0 ? `Reenviar em ${reenviar}s` : 'Reenviar código'}
        </button>
      </div>
    </Modal>
  );
};

// =============================================================================
// COMPONENTE: MODAL CONECTAR PULSEIRA/DISPOSITIVO
// CONEXÃO: POST /api/pulseiras/conectar → app.Pulseiras + app.DispositivosConectados
// LÓGICA: Bluetooth Web API (funciona em Chrome/Edge com HTTPS)
// =============================================================================
const ModalConectarPulseira = ({ criancaId, nomeCrianca, onFechar, onConectado }) => {
  const [etapa, setEtapa] = useState('inicio'); // inicio | buscando | encontrado | conectando | sucesso | erro
  const [selecionado, setSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [manualCodigo, setManualCodigo] = useState('');

  const buscarBluetooth = async () => {
    setEtapa('buscando'); setErro('');
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth não disponível neste navegador. Use Chrome ou Edge com HTTPS.');
      }
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'PulseSafe' }, { namePrefix: 'Armilla' }],
        optionalServices: ['battery_service', 'device_information'],
      });
      // NOTA IMPORTANTE: device.id é um identificador interno gerado pelo
      // próprio navegador para esta sessão de pareamento Bluetooth — não é
      // o código real gravado no firmware da pulseira (o mesmo que ela usa
      // para se identificar via rede celular em /api/ingestao/localizacao).
      // Por isso ele NUNCA é usado como CodigoDispositivo. O Bluetooth aqui
      // serve só para confirmar visualmente que a pulseira certa está por
      // perto (pelo nome anunciado) — o código impresso na pulseira ainda
      // precisa ser digitado para o vínculo ser feito com o valor correto.
      setSelecionado({ nome: device.name });
      setEtapa('encontrado');
    } catch(e) {
      if (e.name === 'NotFoundError') { setErro('Nenhuma pulseira encontrada. Verifique se está ligada e próxima.'); }
      else { setErro(e.message); }
      setEtapa('erro');
    }
  };

  const vincular = async () => {
    if (!manualCodigo) { setErro('Informe o código impresso na pulseira para concluir o vínculo.'); return; }
    setLoading(true); setErro('');
    try {
      const res = await apiFetch('/api/pulseiras/conectar', {
        method: 'POST',
        body: JSON.stringify({ CriancaId: criancaId, CodigoDispositivo: manualCodigo, NomeDispositivo: selecionado?.nome }),
      });
      setEtapa('sucesso');
      setTimeout(() => onConectado(res), 1500);
    } catch(e) { setErro(e.message); setEtapa('erro'); } finally { setLoading(false); }
  };

  return (
    <Modal titulo={`Conectar pulseira — ${nomeCrianca}`} onFechar={onFechar}>
      <div className="form-grade centrado">
        {etapa === 'inicio' && (
          <>
            <div className="bluetooth-icone"><Icon name="bluetooth" size={48} color="#a855f7" /></div>
            <p className="conf-email-texto">
              Ligue a pulseira PulseSafe e mantenha-a a menos de 1 metro do seu dispositivo.
            </p>
            <button className="btn-primario largura-total" onClick={buscarBluetooth}>
              Buscar via Bluetooth
            </button>
            <div className="separador"><span>ou insira o código manualmente</span></div>
            <div className="form-campo">
              <label>Código do dispositivo (impresso na pulseira)</label>
              <input type="text" placeholder="Ex: PS-2024-XXXX" value={manualCodigo}
                onChange={e => setManualCodigo(e.target.value.toUpperCase())} />
            </div>
            {manualCodigo && (
              <button className="btn-primario largura-total" onClick={vincular} disabled={loading}>
                {loading ? 'Vinculando...' : 'Vincular manualmente'}
              </button>
            )}
          </>
        )}

        {etapa === 'buscando' && (
          <div className="estado-bluetooth">
            <div className="bluetooth-animacao">
              <div className="bt-anel bt-anel-1" /><div className="bt-anel bt-anel-2" /><div className="bt-anel bt-anel-3" />
              <div className="bt-centro"><Icon name="bluetooth" size={24} color="#a855f7" /></div>
            </div>
            <p>Buscando pulseiras PulseSafe...</p>
          </div>
        )}

        {etapa === 'encontrado' && selecionado && (
          <>
            <div className="dispositivo-card">
              <Icon name="pulseira" size={32} color="#a855f7" />
              <div><strong>{selecionado.nome}</strong><br /><small>Pulseira encontrada por perto</small></div>
            </div>
            <p className="conf-email-texto">
              Para concluir, digite o código impresso na etiqueta da pulseira — ele garante que o vínculo
              continue funcionando mesmo quando ela estiver longe do seu celular, usando a rede do chip.
            </p>
            <div className="form-campo">
              <label>Código do dispositivo (impresso na pulseira)</label>
              <input type="text" placeholder="Ex: PS-2024-XXXX" value={manualCodigo}
                onChange={e => setManualCodigo(e.target.value.toUpperCase())} />
            </div>
            <button className="btn-primario largura-total" onClick={vincular} disabled={loading || !manualCodigo}>
              {loading ? 'Vinculando...' : 'Vincular esta pulseira'}
            </button>
          </>
        )}

        {etapa === 'sucesso' && (
          <div className="estado-sucesso">
            <div className="sucesso-icone"><Icon name="check" size={32} color="white" /></div>
            <p>Pulseira vinculada com sucesso!</p>
          </div>
        )}

        {etapa === 'erro' && (
          <>
            {erro && <div className="form-erro">{erro}</div>}
            <button className="btn-secundario" onClick={() => setEtapa('inicio')}>Tentar novamente</button>
          </>
        )}
      </div>
    </Modal>
  );
};

// =============================================================================
// COMPONENTE: PAINEL PERFIL (edição do responsável)
// CONEXÃO: PUT /api/responsaveis/perfil → app.Responsaveis
// Regra: e-mail só muda com confirmação; demais campos são livres
// =============================================================================
const PainelPerfil = ({ usuario, onAtualizar, onFechar }) => {
  const [form, setForm] = useState({
    nomeCompleto: usuario.nomeCompleto || '',
    telefone: usuario.telefone || '',
    idade: usuario.idade || '',
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(usuario.fotoUrl || null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFoto(f); setFotoPreview(URL.createObjectURL(f));
  };

  const salvar = async () => {
    setLoading(true); setErro(''); setSucesso(false);
    try {
      await apiFetch('/api/responsaveis/perfil', {
        method: 'PUT',
        body: JSON.stringify({
          NomeCompleto: form.nomeCompleto,
          Telefone: form.telefone || null,
          Idade: form.idade ? parseInt(form.idade) : null,
        }),
      });
      setSucesso(true);
      onAtualizar({ ...usuario, ...form });
      setTimeout(() => setSucesso(false), 2000);
    } catch(e) { setErro(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="painel-perfil">
      <div className="perfil-avatar-wrap">
        <div className="perfil-avatar" onClick={() => document.getElementById('foto-perfil-input').click()}>
          {fotoPreview
            ? <img src={fotoPreview} alt="Foto de perfil" />
            : <Icon name="crianca" size={40} color="rgba(255,255,255,0.4)" />
          }
          <div className="perfil-avatar-overlay"><Icon name="foto" size={16} color="white" /></div>
        </div>
        <input id="foto-perfil-input" type="file" accept="image/*" onChange={handleFoto} style={{display:'none'}} />
        <div className="perfil-nome-email">
          <strong>{form.nomeCompleto || 'Usuário'}</strong>
          <span>{usuario.email}</span>
          {!usuario.emailConfirmado && (
            <span className="badge-nao-confirmado">E-mail não confirmado</span>
          )}
        </div>
      </div>

      <div className="form-grade">
        <div className="form-campo">
          <label>Nome completo</label>
          <input type="text" value={form.nomeCompleto} onChange={e => setForm(p => ({...p, nomeCompleto: e.target.value}))} />
        </div>
        <div className="form-campo">
          <label>Telefone</label>
          <input type="tel" placeholder="(11) 99999-9999" value={form.telefone}
            onChange={e => setForm(p => ({...p, telefone: e.target.value}))} />
        </div>
        <div className="form-campo">
          <label>Idade</label>
          <input type="number" min="18" max="99" value={form.idade}
            onChange={e => setForm(p => ({...p, idade: e.target.value}))} />
        </div>

        <div className="form-campo">
          <label>E-mail (para alterar, confirme novamente)</label>
          <input type="email" value={usuario.email} disabled className="campo-desabilitado"
            title="Para alterar o e-mail, acesse Configurações > Segurança" />
        </div>

        {erro && <div className="form-erro">{erro}</div>}
        {sucesso && <div className="form-sucesso"><Icon name="check" size={16} color="#22c55e" /> Perfil atualizado!</div>}

        <div className="form-acoes">
          <button className="btn-secundario" onClick={onFechar}>Fechar</button>
          <button className="btn-primario" onClick={salvar} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: PAINEL ZONAS SEGURAS
// CONEXÃO: GET/POST/DELETE /api/zonas → app.ZonasSeguras
// =============================================================================
const PainelZonas = ({ criancaId, nomeCrianca }) => {
  const [zonas, setZonas] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: '', latitude: '', longitude: '', raio: 200, cor: '#a855f7' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    apiFetch(`/api/zonas?criancaId=${criancaId}`)
      .then(setZonas).catch(() => {});
  }, [criancaId]);

  const salvar = async () => {
    if (!form.nome || !form.latitude || !form.longitude) { setErro('Preencha todos os campos.'); return; }
    setLoading(true); setErro('');
    try {
      const nova = await apiFetch('/api/zonas', {
        method: 'POST',
        body: JSON.stringify({
          CriancaId: criancaId, Nome: form.nome, Tipo: 'CIRCULO',
          Latitude: parseFloat(form.latitude), Longitude: parseFloat(form.longitude),
          RaioMetros: parseInt(form.raio), Cor: form.cor,
        }),
      });
      setZonas(p => [...p, nova]);
      setMostrarForm(false);
      setForm({ nome: '', latitude: '', longitude: '', raio: 200, cor: '#a855f7' });
    } catch(e) { setErro(e.message); } finally { setLoading(false); }
  };

  const remover = async (id) => {
    try {
      await apiFetch(`/api/zonas/${id}`, { method: 'DELETE' });
      setZonas(p => p.filter(z => z.id !== id));
    } catch(e) { setErro(e.message); }
  };

  const usarLocalizacaoAtual = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(p => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
    }, () => setErro('Não foi possível obter a localização.'));
  };

  return (
    <div className="painel-zonas">
      <div className="painel-cabecalho">
        <h4>Zonas seguras — {nomeCrianca}</h4>
        <button className="btn-primario btn-pequeno" onClick={() => setMostrarForm(v => !v)}>
          <Icon name="mais" size={14} color="white" /> Nova zona
        </button>
      </div>

      {mostrarForm && (
        <div className="form-grade form-zona">
          <div className="form-campo">
            <label>Nome da zona</label>
            <input type="text" placeholder="Casa, Escola, Avós..." value={form.nome}
              onChange={e => setForm(p => ({...p, nome: e.target.value}))} />
          </div>
          <div className="form-linha">
            <div className="form-campo">
              <label>Latitude</label>
              <input type="number" step="0.000001" value={form.latitude}
                onChange={e => setForm(p => ({...p, latitude: e.target.value}))} />
            </div>
            <div className="form-campo">
              <label>Longitude</label>
              <input type="number" step="0.000001" value={form.longitude}
                onChange={e => setForm(p => ({...p, longitude: e.target.value}))} />
            </div>
          </div>
          <button className="btn-link" onClick={usarLocalizacaoAtual}>
            <Icon name="pin" size={14} /> Usar minha localização atual
          </button>
          <div className="form-linha">
            <div className="form-campo">
              <label>Raio (metros)</label>
              <input type="range" min="50" max="2000" step="50" value={form.raio}
                onChange={e => setForm(p => ({...p, raio: e.target.value}))} />
              <small>{form.raio}m</small>
            </div>
            <div className="form-campo">
              <label>Cor</label>
              <input type="color" value={form.cor} onChange={e => setForm(p => ({...p, cor: e.target.value}))} />
            </div>
          </div>
          {erro && <div className="form-erro">{erro}</div>}
          <div className="form-acoes">
            <button className="btn-secundario" onClick={() => setMostrarForm(false)}>Cancelar</button>
            <button className="btn-primario" onClick={salvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Adicionar zona'}
            </button>
          </div>
        </div>
      )}

      <div className="lista-zonas">
        {zonas.length === 0 && <p className="lista-vazia">Nenhuma zona segura cadastrada.</p>}
        {zonas.map(z => (
          <div key={z.id} className="zona-item">
            <div className="zona-cor" style={{ backgroundColor: z.cor }} />
            <div className="zona-info">
              <strong>{z.nome}</strong>
              <span>{z.raioMetros}m de raio</span>
            </div>
            <button className="btn-icone" onClick={() => remover(z.id)} title="Remover zona">
              <Icon name="fechar" size={14} color="#ef4444" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: MODAL ADICIONAR CONTATO DE EMERGÊNCIA
// CONEXÃO: POST /api/contatos → app.ContatosEmergencia
// CORREÇÃO DE REVISÃO: o botão "Adicionar" da aba Contatos tinha
// onClick={() => {}} — um placeholder que nunca chamava nada, por isso
// "não acontecia nada" ao tentar cadastrar um contato. A tabela
// app.ContatosEmergencia já existia no banco, só faltava este modal e o
// controller (ContatosEmergenciaController.cs).
// =============================================================================
const TIPOS_CONTATO = [
  { value: 'PESSOAL',  label: 'Pessoal (família, vizinho...)' },
  { value: 'HOSPITAL', label: 'Hospital / clínica' },
  { value: 'ESCOLA',   label: 'Escola' },
  { value: 'POLICIA',  label: 'Delegacia específica' },
  { value: 'BOMBEIRO', label: 'Corpo de bombeiros local' },
  { value: 'SAMU',     label: 'Posto de saúde / SAMU local' },
];

const ModalContatoEmergencia = ({ onFechar, onSalvar }) => {
  const [form, setForm] = useState({ nome: '', relacao: '', telefone: '', tipoContato: 'PESSOAL', prioridade: 1 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!form.nome || !form.telefone) { setErro('Nome e telefone são obrigatórios.'); return; }
    setLoading(true); setErro('');
    try {
      const novo = await apiFetch('/api/contatos', {
        method: 'POST',
        body: JSON.stringify({
          Nome: form.nome,
          Relacao: form.relacao || null,
          Telefone: form.telefone,
          TipoContato: form.tipoContato,
          Prioridade: parseInt(form.prioridade, 10) || 1,
        }),
      });
      onSalvar(novo);
    } catch(e) { setErro(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal titulo="Adicionar contato de emergência" onFechar={onFechar}>
      <div className="form-grade">
        <div className="form-campo">
          <label>Nome</label>
          <input type="text" placeholder="Nome do contato" value={form.nome}
            onChange={e => setForm(p => ({...p, nome: e.target.value}))} />
        </div>
        <div className="form-campo">
          <label>Relação (opcional)</label>
          <input type="text" placeholder="Avó, vizinho, pediatra..." value={form.relacao}
            onChange={e => setForm(p => ({...p, relacao: e.target.value}))} />
        </div>
        <div className="form-campo">
          <label>Telefone</label>
          <input type="tel" placeholder="(11) 99999-9999" value={form.telefone}
            onChange={e => setForm(p => ({...p, telefone: e.target.value}))} />
        </div>
        <div className="form-linha">
          <div className="form-campo">
            <label>Tipo</label>
            <select value={form.tipoContato} onChange={e => setForm(p => ({...p, tipoContato: e.target.value}))}>
              {TIPOS_CONTATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-campo">
            <label>Prioridade</label>
            <input type="number" min="1" max="10" value={form.prioridade}
              onChange={e => setForm(p => ({...p, prioridade: e.target.value}))} />
          </div>
        </div>
        {erro && <div className="form-erro">{erro}</div>}
        <div className="form-acoes">
          <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-primario" onClick={salvar} disabled={loading}>
            {loading ? 'Salvando...' : 'Adicionar contato'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL: DASHBOARD
// =============================================================================
const Dashboard = ({ onNavegar }) => {
  const usuario = getUser();
  const [aba, setAba] = useState('mapa'); // mapa | criancas | alertas | historico | contatos | perfil
  const [criancas, setCriancas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [loadingDash, setLoadingDash] = useState(true);

  // Modais
  const [modalCadastroCrianca, setModalCadastroCrianca] = useState(false);
  const [modalConfEmail, setModalConfEmail] = useState(!usuario.emailConfirmado);
  const [modalPulseira, setModalPulseira] = useState(null); // { criancaId, nome }
  const [modalContato, setModalContato] = useState(false);
  const [editarCrianca, setEditarCrianca] = useState(null);
  const [painelPerfil, setPainelPerfil] = useState(false);
  const [criancaZonas, setCriancaZonas] = useState(null);

  const [dadosUsuario, setDadosUsuario] = useState({
    nomeCompleto: usuario.nome || 'Usuário',
    email: usuario.email || '',
    emailConfirmado: false,
    fotoUrl: null,
    telefone: '',
    idade: null,
  });

  // Carrega dados do dashboard
  useEffect(() => {
    if (!getToken()) { onNavegar && onNavegar('login'); return; }

    apiFetch('/api/dashboard')
      .then(data => {
        if (data.responsavel) setDadosUsuario(data.responsavel);
        if (data.criancas)   setCriancas(data.criancas);
        if (data.alertas)    setAlertas(data.alertas);
        // CORREÇÃO DE REVISÃO: o backend agora retorna data.zonas como um
        // array plano de zonas completas (id, criancaId, nome, tipo,
        // latitude, longitude, raioMetros, cor) — não mais agrupado por
        // criança. O .flatMap(z => z.zonas || []) anterior sempre resultava
        // em um array vazio, porque nenhum item de data.zonas tinha de fato
        // uma propriedade .zonas; o backend só devolvia uma contagem
        // (criancaId, totalZonas). Por isso o mapa nunca desenhava os
        // círculos das zonas seguras já cadastradas ao abrir o Dashboard.
        if (data.zonas) setZonas(data.zonas);
      })
      .catch(() => {})
      .finally(() => setLoadingDash(false));
  }, []);

  // Carrega contatos de emergência só quando a aba é aberta (evita chamada
  // desnecessária a cada carregamento do dashboard)
  useEffect(() => {
    if (aba !== 'contatos') return;
    apiFetch('/api/contatos').then(setContatos).catch(() => {});
  }, [aba]);

  // Marca alerta como lido
  const marcarLido = async (id) => {
    try {
      await apiFetch(`/api/alertas/${id}/lido`, { method: 'POST' });
      setAlertas(p => p.filter(a => a.id !== id));
    } catch {}
  };

  const removerContato = async (id) => {
    try {
      await apiFetch(`/api/contatos/${id}`, { method: 'DELETE' });
      setContatos(p => p.filter(c => c.id !== id));
    } catch {}
  };

  const logout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    sessionStorage.clear();
    onNavegar && onNavegar('home');
  };

  const alertasNaoLidos = alertas.filter(a => !a.lido).length;

  return (
    <div className="dashboard" id="conteudo-principal">
      {/* ── BARRA LATERAL ── */}
      <nav className="sidebar">
        <div className="sidebar-logo" onClick={() => onNavegar && onNavegar('home')}>
          <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
            <circle cx="20" cy="20" r="19" stroke="url(#dash-grad)" strokeWidth="2"/>
            <path d="M20 8C14 8 10 13 10 20C10 25 13 28 17 29C17 26 18 23 20 21C22 23 23 26 23 29C27 28 30 25 30 20C30 13 26 8 20 8Z" fill="url(#dash-grad2)"/>
            <defs>
              <linearGradient id="dash-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a855f7"/><stop offset="1" stopColor="#38bdf8"/>
              </linearGradient>
              <linearGradient id="dash-grad2" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c084fc"/><stop offset="1" stopColor="#60a5fa"/>
              </linearGradient>
            </defs>
          </svg>
          <span>ARMILLA</span>
        </div>

        {/* Perfil rápido */}
        <div className="sidebar-perfil" onClick={() => setPainelPerfil(v => !v)}>
          <div className="sidebar-avatar">
            {dadosUsuario.fotoUrl
              ? <img src={dadosUsuario.fotoUrl} alt="Foto" />
              : <Icon name="crianca" size={22} color="rgba(255,255,255,0.5)" />
            }
          </div>
          <div className="sidebar-usuario">
            <span className="sidebar-nome">{dadosUsuario.nomeCompleto}</span>
            <span className="sidebar-email">{dadosUsuario.email}</span>
          </div>
          <Icon name="editar" size={14} color="rgba(255,255,255,0.3)" />
        </div>

        {/* Navegação */}
        <div className="sidebar-nav">
          {[
            { id: 'mapa',      icone: 'mapa',       label: 'Mapa em tempo real' },
            { id: 'criancas',  icone: 'crianca',    label: 'Crianças', badge: criancas.length },
            { id: 'alertas',   icone: 'alerta',     label: 'Alertas', badge: alertasNaoLidos },
            { id: 'historico', icone: 'historico',  label: 'Histórico' },
            { id: 'contatos',  icone: 'contatos',   label: 'Contatos emergência' },
            { id: 'perfil',    icone: 'configurar', label: 'Configurações' },
          ].map(item => (
            <button key={item.id} className={`sidebar-item ${aba === item.id ? 'ativo' : ''}`}
              onClick={() => setAba(item.id)}>
              <Icon name={item.icone} size={18} color={aba === item.id ? '#a855f7' : 'rgba(255,255,255,0.5)'} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* Botões emergência */}
        <div className="sidebar-emergencia">
          <span className="emergencia-titulo">Emergência</span>
          {EMERGENCIA.map(e => (
            <a key={e.numero} href={`tel:${e.numero}`} className="btn-emergencia" style={{ '--cor': e.cor }}>
              <Icon name={e.icone} size={16} color={e.cor} />
              <span>{e.label}</span>
              <strong>{e.numero}</strong>
            </a>
          ))}
        </div>

        <button className="sidebar-sair" onClick={logout}>
          <Icon name="sair" size={16} color="#ef4444" />
          <span>Sair</span>
        </button>
      </nav>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="dashboard-main">
        {/* Cabeçalho */}
        <header className="dash-header">
          <div className="dash-header-titulo">
            <h1>
              {aba === 'mapa'      && 'Mapa em tempo real'}
              {aba === 'criancas'  && 'Crianças cadastradas'}
              {aba === 'alertas'   && 'Central de alertas'}
              {aba === 'historico' && 'Histórico de rotas'}
              {aba === 'contatos'  && 'Contatos de emergência'}
              {aba === 'perfil'    && 'Configurações da conta'}
            </h1>
            {!dadosUsuario.emailConfirmado && (
              <div className="aviso-email" onClick={() => setModalConfEmail(true)}>
                <Icon name="email" size={14} color="#f59e0b" />
                Confirme seu e-mail
              </div>
            )}
          </div>

          <div className="dash-header-acoes">
            {alertasNaoLidos > 0 && (
              <button className="badge-alerta-btn" onClick={() => setAba('alertas')}>
                <Icon name="alerta" size={16} color="#f59e0b" />
                {alertasNaoLidos} alerta{alertasNaoLidos > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </header>

        {/* ── ABA: MAPA ── */}
        {aba === 'mapa' && (
          <div className="conteudo-mapa">
            <div className="mapa-status-cards">
              {criancas.length === 0 ? (
                <div className="mapa-sem-criancas">
                  <Icon name="crianca" size={48} color="rgba(255,255,255,0.15)" />
                  <p>Cadastre uma criança e conecte a pulseira para ver o mapa.</p>
                  <button className="btn-primario" onClick={() => setModalCadastroCrianca(true)}>
                    <Icon name="mais" size={16} color="white" /> Cadastrar criança
                  </button>
                </div>
              ) : (
                criancas.map(c => (
                  <div key={c.id} className={`status-card ${c.statusConexao === 'ONLINE' ? 'online' : 'offline'}`}>
                    <div className="status-card-avatar">
                      {c.fotoUrl ? <img src={c.fotoUrl} alt={c.nomeCompleto} /> : <Icon name="crianca" size={24} color="rgba(255,255,255,0.5)" />}
                    </div>
                    <div className="status-card-info">
                      <strong>{c.apelido || c.nomeCompleto}</strong>
                      <span className={`conn-status ${c.statusConexao?.toLowerCase()}`}>{c.statusConexao || 'Sem pulseira'}</span>
                    </div>
                    <div className="status-card-bateria" title={`Bateria: ${statusBateria(c.nivelBateria).texto}`}>
                      <Icon name="bateria" size={16} color={statusBateria(c.nivelBateria).cor} />
                      <span style={{ color: statusBateria(c.nivelBateria).cor }}>{statusBateria(c.nivelBateria).texto}</span>
                    </div>
                    {!c.pulseiraId && (
                      <button className="btn-conectar-mini" onClick={() => setModalPulseira({ criancaId: c.id, nome: c.nomeCompleto })}>
                        <Icon name="bluetooth" size={14} color="#a855f7" /> Conectar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <MapaLeaflet criancas={criancas} zonas={zonas} />
          </div>
        )}

        {/* ── ABA: CRIANÇAS ── */}
        {aba === 'criancas' && (
          <div className="conteudo-padrao">
            <div className="aba-acoes">
              <button className="btn-primario" onClick={() => setModalCadastroCrianca(true)}>
                <Icon name="mais" size={16} color="white" /> Cadastrar criança
              </button>
            </div>
            {loadingDash && <div className="loading-dash">Carregando...</div>}
            {!loadingDash && criancas.length === 0 && (
              <div className="lista-vazia-grande">
                <Icon name="crianca" size={64} color="rgba(255,255,255,0.1)" />
                <h3>Nenhuma criança cadastrada</h3>
                <p>Cadastre uma criança para começar a monitorar.</p>
              </div>
            )}
            <div className="grade-criancas">
              {criancas.map(c => (
                <div key={c.id} className="card-crianca">
                  <div className="card-crianca-foto">
                    {c.fotoUrl ? <img src={c.fotoUrl} alt={c.nomeCompleto} /> : <Icon name="crianca" size={32} color="rgba(255,255,255,0.3)" />}
                    <span className={`status-bolinha ${c.statusConexao === 'ONLINE' ? 'online' : 'offline'}`} />
                  </div>
                  <div className="card-crianca-dados">
                    <h4>{c.nomeCompleto}</h4>
                    {c.apelido && <span className="apelido">"{c.apelido}"</span>}
                    <span>{calcularIdade(c.dataNascimento)} anos</span>
                    {c.escolaNome && <span><Icon name="pin" size={12} /> {c.escolaNome}</span>}
                  </div>
                  <div className="card-crianca-pulseira">
                    {c.pulseiraId ? (
                      <div className="pulseira-status">
                        <Icon name="pulseira" size={16} color="#22c55e" />
                        <span style={{ color: '#22c55e' }}>Conectada</span>
                        <div className="bateria-info">
                          <Icon name="bateria" size={14} color={statusBateria(c.nivelBateria).cor} />
                          <span style={{ color: statusBateria(c.nivelBateria).cor }}>{statusBateria(c.nivelBateria).texto}</span>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-conectar" onClick={() => setModalPulseira({ criancaId: c.id, nome: c.nomeCompleto })}>
                        <Icon name="bluetooth" size={14} color="white" /> Conectar pulseira
                      </button>
                    )}
                  </div>
                  <div className="card-crianca-acoes">
                    <button className="btn-icone" title="Editar" onClick={() => setEditarCrianca(c)}>
                      <Icon name="editar" size={16} color="#a855f7" />
                    </button>
                    <button className="btn-icone" title="Zonas seguras" onClick={() => setCriancaZonas({ id: c.id, nome: c.nomeCompleto })}>
                      <Icon name="zona" size={16} color="#38bdf8" />
                    </button>
                    <button className="btn-icone" title="Ver no mapa" onClick={() => setAba('mapa')}>
                      <Icon name="mapa" size={16} color="#22c55e" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {criancaZonas && (
              <Modal titulo={`Zonas seguras — ${criancaZonas.nome}`} onFechar={() => setCriancaZonas(null)}>
                <PainelZonas criancaId={criancaZonas.id} nomeCrianca={criancaZonas.nome} />
              </Modal>
            )}
          </div>
        )}

        {/* ── ABA: ALERTAS ── */}
        {aba === 'alertas' && (
          <div className="conteudo-padrao">
            {alertas.length === 0 ? (
              <div className="lista-vazia-grande">
                <Icon name="check" size={64} color="rgba(34,197,94,0.2)" />
                <h3>Tudo tranquilo!</h3>
                <p>Nenhum alerta pendente no momento.</p>
              </div>
            ) : (
              <div className="lista-alertas">
                {alertas.map(a => (
                  <div key={a.id} className={`alerta-item severidade-${a.severidade?.toLowerCase()}`}>
                    <div className="alerta-icone"><Icon name="alerta" size={20} color={
                      a.severidade === 'CRITICO' ? '#ef4444' :
                      a.severidade === 'ALTO'    ? '#f97316' :
                      a.severidade === 'MEDIO'   ? '#f59e0b' : '#6b7280'
                    } /></div>
                    <div className="alerta-info">
                      <strong>{a.nomeCrianca}</strong>
                      <span>{a.descricao}</span>
                      <small>{new Date(a.criadoEm).toLocaleString('pt-BR')}</small>
                    </div>
                    {a.latitude && (
                      <button className="btn-link" onClick={() => setAba('mapa')}>
                        <Icon name="pin" size={14} /> Ver no mapa
                      </button>
                    )}
                    <button className="btn-icone" onClick={() => marcarLido(a.id)} title="Marcar como lido">
                      <Icon name="check" size={16} color="#22c55e" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: HISTÓRICO ── */}
        {aba === 'historico' && (
          <div className="conteudo-padrao">
            <div className="historico-filtros">
              <select className="select-crianca">
                <option value="">Todas as crianças</option>
                {criancas.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
              </select>
              <input type="date" className="input-data" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="historico-info">
              <Icon name="historico" size={48} color="rgba(255,255,255,0.1)" />
              <p>Selecione uma criança e data para ver o histórico de rotas no mapa.</p>
              <p className="texto-pequeno">Os dados são armazenados por até 1 ano (política LGPD).</p>
            </div>
          </div>
        )}

        {/* ── ABA: CONTATOS DE EMERGÊNCIA ── */}
        {aba === 'contatos' && (
          <div className="conteudo-padrao">
            <div className="contatos-fixos">
              <h3>Emergências nacionais</h3>
              <div className="grade-contatos-fixos">
                {EMERGENCIA.map(e => (
                  <a key={e.numero} href={`tel:${e.numero}`} className="contato-fixo-card" style={{ '--cor': e.cor }}>
                    <div className="contato-fixo-icone"><Icon name={e.icone} size={32} color={e.cor} /></div>
                    <strong>{e.label}</strong>
                    <span className="contato-numero">{e.numero}</span>
                    <span className="contato-chamar">Ligar agora</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="contatos-pessoais">
              <div className="painel-cabecalho">
                <h3>Contatos pessoais</h3>
                <button className="btn-primario btn-pequeno" onClick={() => setModalContato(true)}>
                  <Icon name="mais" size={14} color="white" /> Adicionar
                </button>
              </div>
              {contatos.length === 0 ? (
                <p className="lista-vazia">Adicione familiares, médicos e outros contatos de confiança.</p>
              ) : (
                <div className="lista-zonas">
                  {contatos.map(c => (
                    <div key={c.id} className="zona-item">
                      <div className="zona-cor" style={{ backgroundColor: '#a855f7' }} />
                      <div className="zona-info">
                        <strong>{c.nome}{c.relacao ? ` — ${c.relacao}` : ''}</strong>
                        <span>{c.telefone}</span>
                      </div>
                      <a className="btn-icone" href={`tel:${c.telefone.replace(/\D/g, '')}`} title="Ligar">
                        <Icon name="contatos" size={14} color="#22c55e" />
                      </a>
                      <button className="btn-icone" onClick={() => removerContato(c.id)} title="Remover contato">
                        <Icon name="fechar" size={14} color="#ef4444" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA: PERFIL / CONFIGURAÇÕES ── */}
        {aba === 'perfil' && (
          <div className="conteudo-padrao">
            <PainelPerfil usuario={dadosUsuario} onAtualizar={setDadosUsuario} onFechar={() => setAba('mapa')} />
          </div>
        )}
      </main>

      {/* ── PAINEL DE PERFIL LATERAL (overlay) ── */}
      {painelPerfil && (
        <div className="perfil-overlay" onClick={() => setPainelPerfil(false)}>
          <div className="perfil-drawer" onClick={e => e.stopPropagation()}>
            <PainelPerfil usuario={dadosUsuario} onAtualizar={u => { setDadosUsuario(u); setPainelPerfil(false); }} onFechar={() => setPainelPerfil(false)} />
          </div>
        </div>
      )}

      {/* ── MODAIS ── */}
      {modalCadastroCrianca && (
        <ModalCadastroCrianca
          onFechar={() => setModalCadastroCrianca(false)}
          onSalvar={nova => { setCriancas(p => [...p, nova]); setModalCadastroCrianca(false); }}
        />
      )}
      {modalConfEmail && (
        <ModalConfirmacaoEmail
          email={dadosUsuario.email}
          onFechar={() => setModalConfEmail(false)}
          onConfirmado={() => { setDadosUsuario(p => ({...p, emailConfirmado: true})); setModalConfEmail(false); }}
        />
      )}
      {modalPulseira && (
        <ModalConectarPulseira
          criancaId={modalPulseira.criancaId}
          nomeCrianca={modalPulseira.nome}
          onFechar={() => setModalPulseira(null)}
          onConectado={pulseira => {
            setCriancas(p => p.map(c => c.id === modalPulseira.criancaId ? { ...c, pulseiraId: pulseira.id, statusConexao: 'OFFLINE' } : c));
            setModalPulseira(null);
          }}
        />
      )}
      {modalContato && (
        <ModalContatoEmergencia
          onFechar={() => setModalContato(false)}
          onSalvar={novo => { setContatos(p => [...p, novo]); setModalContato(false); }}
        />
      )}

      {/* Painel de acessibilidade é renderizado globalmente pelo App.jsx
          (dentro do AccessibilityProvider), então não é repetido aqui. */}
    </div>
  );
};

export default Dashboard;
