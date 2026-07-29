const $ = id => document.getElementById(id);
const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rand = n => Math.random() * n;
const artMiraIzquierda = type => type.mirar !== 'derecha';
const pickWeighted = (items, roll = Math.random()) => {
  let acc = 0;
  for (const item of items) {
    acc += item.prob;
    if (roll <= acc) return item;
  }
  return items.at(-1);
};

const pickMutation = (suerte = 0) => {
  if (!suerte) return pickWeighted(MUTACIONES_WIP);
  const normal = MUTACIONES_WIP.find(m => m.id === 'normal');
  const sumRaras = MUTACIONES_WIP.reduce((s, m) => s + (m.id === 'normal' ? 0 : m.prob), 0);
  const robado = Math.min(normal.prob, suerte);
  const ajustadas = MUTACIONES_WIP.map(m => m.id === 'normal'
    ? { ...m, prob: m.prob - robado }
    : { ...m, prob: m.prob + robado * (m.prob / sumRaras) });
  return pickWeighted(ajustadas);
};

const state = {
  money: 0,
  island: null,
  patience: 100,
  canaNivel: 0,
  ceboNivel: 0,
  mochilaNivel: 0,
  backpack: [],
  logros: [],
  historiaVista: false,
  casaNivel: 1,
  stats: {
    totalPeces: 0,
    dineroTotal: 0,
    especies: [],
    mutaciones: [],
    nerviosAcero: false,
    mochilaLlena: false,
    islaMaxAlcanzada: 0,
    capturasPorEspecie: {},
    capturasMutacionRara: 0
  }
};

const MUTACIONES_RARAS_CASA = ['oro', 'arcoiris', 'cosmico'];

const curDif = () => ({ ...DIFICULTAD, ...(game.island ? game.island.dificultad : {}) });
const equipoActual = () => ({
  cana: EQUIPO_CANAS[state.canaNivel] || EQUIPO_CANAS[0],
  cebo: EQUIPO_CEBOS[state.ceboNivel] || EQUIPO_CEBOS[0],
  mochila: EQUIPO_MOCHILAS[state.mochilaNivel] || EQUIPO_MOCHILAS[0]
});
const mochilaMax = () => DIFICULTAD.pesoMaximoMochila + equipoActual().mochila.cap;

const AUDIO = { ctx: null, master: null, muted: false, cigarraTimer: null, aveTimer: null };

function initAudio() {
  if (AUDIO.ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AUDIO.ctx = new Ctx();
  AUDIO.master = AUDIO.ctx.createGain();
  AUDIO.master.gain.value = AUDIO.muted ? 0 : .35;
  AUDIO.master.connect(AUDIO.ctx.destination);
  startRiverNoise();
  scheduleCigarras();
  scheduleAvesita();
}

function startRiverNoise() {
  const ctx = AUDIO.ctx;
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + .02 * white) / 1.02;
    data[i] = lastOut * 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 850;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = .07;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  const gain = ctx.createGain();
  gain.gain.value = .55;
  noise.connect(filter).connect(gain).connect(AUDIO.master);
  noise.start();
}

function cigarraChirp() {
  const ctx = AUDIO.ctx;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 3600 + rand(1000);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(.05, t0 + .01);
  gain.gain.exponentialRampToValueAtTime(.001, t0 + .12);
  osc.connect(gain).connect(AUDIO.master);
  osc.start(t0);
  osc.stop(t0 + .15);
}

function avesita() {
  const ctx = AUDIO.ctx;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const base = 700 + rand(500);
  osc.frequency.setValueAtTime(base, t0);
  osc.frequency.exponentialRampToValueAtTime(base * .6, t0 + .18);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(.06, t0 + .02);
  gain.gain.exponentialRampToValueAtTime(.001, t0 + .22);
  osc.connect(gain).connect(AUDIO.master);
  osc.start(t0);
  osc.stop(t0 + .25);
}

function scheduleCigarras() {
  clearTimeout(AUDIO.cigarraTimer);
  const next = 400 + rand(2200);
  AUDIO.cigarraTimer = setTimeout(() => {
    if (!AUDIO.muted) { cigarraChirp(); if (Math.random() < .5) setTimeout(cigarraChirp, 80); }
    scheduleCigarras();
  }, next);
}

function scheduleAvesita() {
  clearTimeout(AUDIO.aveTimer);
  const next = 2500 + rand(5000);
  AUDIO.aveTimer = setTimeout(() => {
    if (!AUDIO.muted) avesita();
    scheduleAvesita();
  }, next);
}

function splash(bright = true) {
  if (!AUDIO.ctx || AUDIO.muted) return;
  const ctx = AUDIO.ctx;
  const t0 = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * .25);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = bright ? 1500 : 500;
  filter.Q.value = .8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(bright ? .35 : .2, t0);
  gain.gain.exponentialRampToValueAtTime(.001, t0 + (bright ? .3 : .18));
  src.connect(filter).connect(gain).connect(AUDIO.master);
  src.start(t0);
}

function toggleMute() {
  if (!AUDIO.ctx) initAudio();
  AUDIO.muted = !AUDIO.muted;
  if (AUDIO.master) AUDIO.master.gain.value = AUDIO.muted ? 0 : .35;
  document.querySelectorAll('.btn-sound').forEach(b => b.textContent = AUDIO.muted ? '🔇' : '🔊');
}

const SAVE_KEY = 'pescador_casanare_save_v1';

function storageDisponible() {
  try {
    const k = '__test__' + SAVE_KEY;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}

function buildSaveData() {
  return {
    money: state.money,
    canaNivel: state.canaNivel,
    ceboNivel: state.ceboNivel,
    mochilaNivel: state.mochilaNivel,
    unlocked: DATA_ISLAS.filter(i => i.desc).map(i => i.id),
    backpack: state.backpack,
    logros: state.logros,
    stats: state.stats,
    historiaVista: state.historiaVista,
    casaNivel: state.casaNivel
  };
}

function applySaveData(data) {
  state.money = Number(data.money) || 0;
  state.canaNivel = Number(data.canaNivel) || 0;
  state.ceboNivel = Number(data.ceboNivel) || 0;
  state.mochilaNivel = Number(data.mochilaNivel) || 0;
  (data.unlocked || []).forEach(id => {
    const isla = DATA_ISLAS.find(i => i.id === id);
    if (isla) isla.desc = true;
  });
  if (Array.isArray(data.backpack)) state.backpack = data.backpack;
  if (Array.isArray(data.logros)) state.logros = data.logros;
  state.historiaVista = !!data.historiaVista;
  state.casaNivel = Math.max(1, Number(data.casaNivel) || 1);
  if (data.stats && typeof data.stats === 'object') {
    state.stats = {
      totalPeces: Number(data.stats.totalPeces) || 0,
      dineroTotal: Number(data.stats.dineroTotal) || 0,
      especies: Array.isArray(data.stats.especies) ? data.stats.especies : [],
      mutaciones: Array.isArray(data.stats.mutaciones) ? data.stats.mutaciones : [],
      nerviosAcero: !!data.stats.nerviosAcero,
      mochilaLlena: !!data.stats.mochilaLlena,
      islaMaxAlcanzada: Number(data.stats.islaMaxAlcanzada) || 0,
      capturasPorEspecie: (data.stats.capturasPorEspecie && typeof data.stats.capturasPorEspecie === 'object') ? data.stats.capturasPorEspecie : {},
      capturasMutacionRara: Number(data.stats.capturasMutacionRara) || 0
    };
  }
}

let STORAGE_OK = true;

function saveGame() {
  if (!STORAGE_OK) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData())); }
  catch (e) { console.warn('No se pudo guardar el progreso:', e); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    applySaveData(JSON.parse(raw));
  } catch (e) { console.warn('No se pudo leer el progreso guardado:', e); }
}

function resetGame() {
  if (!confirm('¿Borrar todo tu progreso guardado? Esto no se puede deshacer.')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {  }
  location.reload();
}

function descargarPartida() {
  const blob = new Blob([JSON.stringify(buildSaveData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pescador_casanare_partida.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function cargarPartidaDesdeArchivo(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applySaveData(JSON.parse(reader.result));
      saveGame();
      renderShop();
      renderMap();
      alert('¡Partida cargada!');
    } catch (e) {
      alert('Ese archivo no es una partida válida de Pescador del Casanare.');
    }
  };
  reader.readAsText(file);
}

const ui = {
  money: $('map-dinero'),
  islandName: $('hud-island-name'),
  tripWeight: $('hud-trip-money'),
  maxWeight: $('hud-mochila-max'),
  timer: $('hud-timer'),
  patienceBar: $('patience-display'),
  backpackCount: $('map-backpack-count'),
  map: $('islands-map'),
  tooltip: $('island-tooltip'),
  mapWrap: $('map-wrap'),
  canvas: $('gameCanvas'),
  fightPanel: $('fight-panel'),
  fightBar: $('fight-progress-bar'),
  fightTimer: $('fight-time-bar'),
  fightLabel: $('fight-label'),
  modals: {
    shop: $('shop-modal'),
    encyclopedia: $('encyclopedia-modal'),
    backpack: $('backpack-modal'),
    tutorial: $('tutorial-modal'),
    logros: $('logros-modal'),
    historia: $('historia-modal'),
    casa: $('casa-modal'),
    casaReaccion: $('casa-reaccion-modal')
  },
  logrosBadge: $('map-logros-count'),
  logrosList: $('logros-list'),
  logroToastContainer: $('logro-toast-container'),
  casaBadge: $('map-casa-nivel'),
  casaBody: $('casa-modal-body'),
  historiaBody: $('historia-modal-body'),
  btnHistoria: $('btn-play'),
  homeBg: $('home-bg'),
  homeCasaNombre: $('home-casa-nombre'),
  homeCasaNivel: $('home-casa-nivel-badge'),
  homeBtnMejorar: $('btn-home-mejorar')
};

const MAP_SHAPES = {
  1: { cx: 150, cy: 105, color: '#9ccc4f', decor: 'palmera', path: 'M 55,95 C 35,70 38,35 75,18 C 105,4 145,2 175,15 C 205,28 235,45 230,80 C 226,108 210,135 175,145 C 145,154 110,150 80,138 C 58,129 62,112 55,95 Z' },
  2: { cx: 430, cy: 145, color: '#a9b86a', decor: 'canoa', path: 'M 372,140 C 368,115 382,95 408,90 C 430,86 455,92 472,108 C 488,123 498,140 488,158 C 478,175 455,185 428,182 C 405,180 385,172 376,158 C 370,150 374,148 372,140 Z' },
  3: { cx: 250, cy: 315, color: '#8bc34a', decor: 'roca', path: 'M 176,316 C 162,284 174,250 212,236 C 248,223 304,225 338,248 C 366,267 374,304 356,332 C 338,360 296,382 248,380 C 210,378 182,356 176,316 Z' },
  4: { cx: 590, cy: 315, color: '#93a852', decor: 'ceiba', path: 'M 515,312 C 502,282 516,246 548,230 C 584,212 638,220 668,244 C 696,267 704,306 690,334 C 674,365 634,387 586,388 C 548,388 524,360 515,312 Z' },
  5: { cx: 685, cy: 105, color: '#c2b280', decor: 'junco', path: 'M 626,105 C 620,84 628,58 650,46 C 676,31 712,34 734,48 C 756,62 764,90 756,112 C 748,132 726,148 698,151 C 668,154 636,136 626,105 Z' }
};

const DECOR = {
  palmera: (x, y) => `<rect x="${x - 3}" y="${y - 4}" width="6" height="28" rx="3" fill="#8d6e63"/><path d="M ${x},${y - 6} C ${x - 22},${y - 28} ${x - 34},${y - 16} ${x - 10},${y - 2}" fill="none" stroke="#2ecc71" stroke-width="5" stroke-linecap="round"/><path d="M ${x},${y - 8} C ${x + 22},${y - 28} ${x + 34},${y - 16} ${x + 10},${y - 2}" fill="none" stroke="#27ae60" stroke-width="5" stroke-linecap="round"/><path d="M ${x},${y - 10} C ${x - 6},${y - 34} ${x + 6},${y - 34} ${x},${y - 8}" fill="none" stroke="#58d68d" stroke-width="5" stroke-linecap="round"/>`,
  canoa: (x, y) => `<path d="M ${x - 22},${y + 6} Q ${x},${y + 20} ${x + 22},${y + 6} L ${x + 17},${y - 2} Q ${x},${y + 6} ${x - 17},${y - 2} Z" fill="#8d5a2b" stroke="#5d3a1a" stroke-width="2.5" stroke-linejoin="round"/><line x1="${x - 20}" y1="${y - 2}" x2="${x + 20}" y2="${y - 2}" stroke="#a8703c" stroke-width="2"/><line x1="${x + 10}" y1="${y - 20}" x2="${x + 22}" y2="${y + 2}" stroke="#6d4c30" stroke-width="3" stroke-linecap="round"/><ellipse cx="${x + 22}" cy="${y - 21}" rx="5" ry="2.5" fill="#6d4c30" transform="rotate(-30 ${x + 22} ${y - 21})"/>`,
  roca: (x, y) => `<path d="M ${x - 16},${y + 14} Q ${x - 20},${y - 6} ${x - 4},${y - 12} Q ${x + 14},${y - 16} ${x + 16},${y} Q ${x + 18},${y + 12} ${x},${y + 14} Z" fill="#9e9e9e" stroke="#616161" stroke-width="2.5" stroke-linejoin="round"/><path d="M ${x - 8},${y - 2} Q ${x},${y - 6} ${x + 8},${y - 2}" stroke="#757575" stroke-width="1.5" fill="none"/>`,
  ceiba: (x, y) => `<path d="M ${x - 5},${y + 18} L ${x - 8},${y - 4} L ${x + 8},${y - 4} L ${x + 5},${y + 18} Z" fill="#6d4c30" stroke="#4a3520" stroke-width="2"/><circle cx="${x}" cy="${y - 22}" r="26" fill="#4a7c3f" stroke="#33552c" stroke-width="2.5"/><circle cx="${x - 16}" cy="${y - 12}" r="14" fill="#558b4f" stroke="#33552c" stroke-width="2"/><circle cx="${x + 16}" cy="${y - 14}" r="15" fill="#5fa056" stroke="#33552c" stroke-width="2"/>`,
  junco: (x, y) => `<path d="M ${x - 16},${y + 16} Q ${x - 22},${y - 14} ${x - 14},${y - 36}" stroke="#6ab04c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x - 6},${y + 16} Q ${x - 8},${y - 20} ${x - 2},${y - 44}" stroke="#82c46c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x + 4},${y + 16} Q ${x + 2},${y - 18} ${x + 8},${y - 40}" stroke="#6ab04c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x + 14},${y + 16} Q ${x + 18},${y - 12} ${x + 16},${y - 32}" stroke="#82c46c" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="${x - 14}" cy="${y - 38}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x - 2}" cy="${y - 46}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x + 8}" cy="${y - 42}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x + 16}" cy="${y - 34}" rx="2.5" ry="6" fill="#8d6e30"/>`
};

const game = {
  ctx: ui.canvas.getContext('2d'),
  island: null,
  fishes: [], particles: [], bubbles: [], labels: [],
  mouseX: 400, mouseY: 240, cursorX: 400,
  animId: null, patienceTimer: null, tripTimer: null, timeLeft: 0,
  images: {},
  fight: null 
};

const getImage = src => game.images[src] || (game.images[src] = Object.assign(new Image(), { src }));
const currentWeight = () => state.backpack.reduce((sum, fish) => sum + fish.weight, 0);
const fishPrice = fish => Math.round(fish.value * fish.sizeMult * fish.mutation.mult * (DATA_ISLAS.find(i => i.id === fish.islandId)?.multVenta ?? 1));
const backpackValue = () => state.backpack.reduce((sum, fish) => sum + fishPrice(fish), 0);
const fishThumb = (fish, locked) => locked ? '❓' : fish.img ? `<img src="${fish.img}" alt="${fish.n}">` : (fish.emoji || '🐟');
const setScreen = id => document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
const toggleModal = (name, show) => ui.modals[name].style.display = show ? 'flex' : 'none';

function updateHUD() {
  ui.money.textContent = state.money;
  ui.backpackCount.textContent = state.backpack.length;
  ui.tripWeight.textContent = currentWeight().toFixed(1);
  ui.maxWeight.textContent = mochilaMax();
  if (ui.logrosBadge) ui.logrosBadge.textContent = `${state.logros.length}/${LOGROS.length}`;
  if (ui.casaBadge) ui.casaBadge.textContent = `${state.casaNivel}/${CASA_NIVEL_MAX}`;
  if (typeof renderHome === 'function') renderHome();
  if (typeof renderShop === 'function') renderShop();
  saveGame();
}

function checkLogros() {
  LOGROS.forEach(logro => {
    if (state.logros.includes(logro.id)) return;
    if (logro.check(state)) unlockLogro(logro);
  });
}

function unlockLogro(logro) {
  state.logros.push(logro.id);
  saveGame();
  updateHUD();
  showLogroToast(logro);
  if (ui.modals.logros && ui.modals.logros.style.display === 'flex') renderLogros();
}

function showLogroToast(logro) {
  if (!ui.logroToastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'logro-toast';
  toast.innerHTML = `
    <span class="logro-toast-icono">${logro.icono}</span>
    <div class="logro-toast-texto">
      <div class="logro-toast-titulo">🏅 ¡Logro desbloqueado!</div>
      <div class="logro-toast-nombre">${logro.nombre}</div>
    </div>
  `;
  ui.logroToastContainer.appendChild(toast);
  splash(true);
  setTimeout(() => toast.classList.add('salir'), 3600);
  setTimeout(() => toast.remove(), 4200);
}

function renderLogros() {
  if (!ui.logrosList) return;
  ui.logrosList.innerHTML = LOGROS.map(logro => {
    const conseguido = state.logros.includes(logro.id);
    return `
      <div class="logro-entry ${conseguido ? 'conseguido' : 'bloqueado'}">
        <div class="logro-entry-icono">${conseguido ? logro.icono : '🔒'}</div>
        <div class="logro-entry-info">
          <h4>${conseguido ? logro.nombre : '???'}</h4>
          <p>${conseguido ? logro.desc : 'Todavía no lo has desbloqueado.'}</p>
        </div>
      </div>
    `;
  }).join('');
}

let historiaSlideActual = 0;

function abrirHistoria() {
  initAudio();
  if (state.historiaVista) return irACasa();
  historiaSlideActual = 0;
  renderHistoriaSlide();
  toggleModal('historia', true);
}

function renderHistoriaSlide() {
  const slide = HISTORIA_INTRO[historiaSlideActual];
  const esUltima = historiaSlideActual === HISTORIA_INTRO.length - 1;
  ui.historiaBody.innerHTML = `
    <div class="historia-dots">${HISTORIA_INTRO.map((_, i) => `<span class="historia-dot ${i === historiaSlideActual ? 'activo' : ''}"></span>`).join('')}</div>
    <h3 class="historia-slide-titulo">${slide.titulo}</h3>
    <p class="historia-slide-texto">${slide.texto}</p>
    <div class="historia-slide-botones">
      ${esUltima ? '' : '<button class="btn btn-back" id="btn-historia-saltar">Saltar</button>'}
      <button class="btn btn-play-grande btn-historia-siguiente" id="btn-historia-siguiente">${esUltima ? '¡A pescar! 🎣' : 'Siguiente'}</button>
    </div>
  `;
  $('btn-historia-siguiente').onclick = () => {
    if (esUltima) return terminarIntroHistoria();
    historiaSlideActual++;
    renderHistoriaSlide();
  };
  const btnSaltar = $('btn-historia-saltar');
  if (btnSaltar) btnSaltar.onclick = terminarIntroHistoria;
}

function terminarIntroHistoria() {
  state.historiaVista = true;
  saveGame();
  toggleModal('historia', false);
  irACasa();
}

function irAlMapa() {
  setScreen('map-screen');
  renderMap();
}

const encyclopediaIslaCompleta = islaId => {
  const isla = DATA_ISLAS.find(i => i.id === islaId);
  return !!isla && isla.peces.every(f => state.stats.especies.includes(f.n));
};

const CASA_NIVEL_MAX = 5;
const CASA_NOMBRE_INICIAL = 'Techo de Zinc';
const nombreCasaNivel = nivel => nivel <= 1 ? CASA_NOMBRE_INICIAL : (CASA_MEJORAS.find(m => m.id === nivel)?.nombre || '');
const siguienteMejoraCasa = nivelActual => CASA_MEJORAS.find(m => m.id === nivelActual + 1);

const casaImagenUrl = nivel => `fotos/casa/casa${Math.max(1, Math.min(5, nivel))}.jpg`;

function renderHome() {
  const nombreActual = nombreCasaNivel(state.casaNivel);
  if (ui.homeBg) ui.homeBg.style.backgroundImage = `url('${casaImagenUrl(state.casaNivel)}')`;
  if (ui.homeCasaNombre) ui.homeCasaNombre.textContent = `🏠 ${nombreActual}`;
  if (ui.homeCasaNivel) ui.homeCasaNivel.textContent = `Nivel ${state.casaNivel}/${CASA_NIVEL_MAX}`;
  if (ui.homeBtnMejorar) ui.homeBtnMejorar.style.display = state.casaNivel >= CASA_NIVEL_MAX ? 'none' : '';
}

function irACasa() {
  setScreen('home-screen');
  renderHome();
}

function cumpleRequisitosCasa(mejora) {
  const r = mejora.requisitos;
  const especiesOk = r.especies.every(e => (state.stats.capturasPorEspecie[e.n] || 0) >= e.cantidad);
  const mutacionOk = state.stats.capturasMutacionRara >= r.mutacionRaraCant;
  const dineroOk = state.money >= r.dinero;
  const enciclopediaOk = encyclopediaIslaCompleta(r.enciclopediaIsla);
  return especiesOk && mutacionOk && dineroOk && enciclopediaOk;
}

function renderCasa() {
  if (!ui.casaBody) return;
  const nivelActual = state.casaNivel;
  const nombreActual = nombreCasaNivel(nivelActual);

  if (nivelActual >= CASA_NIVEL_MAX) {
    ui.casaBody.innerHTML = `
      <div class="casa-preview"><img src="${casaImagenUrl(nivelActual)}" class="casa-foto" alt="Casa nivel ${nivelActual}"></div>
      <h3 class="casa-nombre-actual">🏠 ${nombreActual}</h3>
      <div class="casa-final-banner">🎉 ¡Historia completada! Sacaste a tu familia adelante, río a río.</div>
    `;
    return;
  }

  const mejora = siguienteMejoraCasa(nivelActual);
  const r = mejora.requisitos;
  const isla = DATA_ISLAS.find(i => i.id === r.enciclopediaIsla);
  const listaReq = [
    ...r.especies.map(e => {
      const tengo = Math.min(state.stats.capturasPorEspecie[e.n] || 0, e.cantidad);
      return `<li class="${tengo >= e.cantidad ? 'ok' : ''}">🐟 ${e.n}: ${tengo}/${e.cantidad}</li>`;
    }),
    `<li class="${state.stats.capturasMutacionRara >= r.mutacionRaraCant ? 'ok' : ''}">🏆 Peces raros (Oro/Arcoíris/Cósmico): ${Math.min(state.stats.capturasMutacionRara, r.mutacionRaraCant)}/${r.mutacionRaraCant}</li>`,
    `<li class="${state.money >= r.dinero ? 'ok' : ''}">💵 Dinero disponible: $${state.money}/${r.dinero}</li>`,
    `<li class="${encyclopediaIslaCompleta(r.enciclopediaIsla) ? 'ok' : ''}">📖 Enciclopedia de ${isla ? isla.nombre : ''} completa</li>`
  ].join('');

  const lista = cumpleRequisitosCasa(mejora);
  ui.casaBody.innerHTML = `
    <div class="casa-preview"><img src="${casaImagenUrl(nivelActual)}" class="casa-foto" alt="Casa nivel ${nivelActual}"></div>
    <h3 class="casa-nombre-actual">🏠 ${nombreActual}</h3>
    <p class="casa-dialogo">${mejora.dialogoAntes}</p>
    <h4 class="casa-siguiente-titulo">Siguiente: ${mejora.nombre}</h4>
    <ul class="casa-requisitos">${listaReq}</ul>
    <button class="btn btn-play-grande" id="btn-mejorar-casa" ${lista ? '' : 'disabled'}>🔨 Mejorar Casa</button>
  `;
  const btn = $('btn-mejorar-casa');
  if (btn) btn.onclick = () => mejorarCasa(mejora);
}

function mejorarCasa(mejora) {
  if (!cumpleRequisitosCasa(mejora)) return;
  state.money -= mejora.requisitos.dinero;
  state.casaNivel = mejora.id;
  checkLogros();
  updateHUD();
  mostrarReaccionCasa(mejora);
  renderCasa();
}

function mostrarReaccionCasa(mejora) {
  if (!ui.modals.casaReaccion) return;
  toggleModal('casa', false);
  const esFinal = mejora.id === CASA_NIVEL_MAX;
  $('casa-reaccion-titulo').textContent = esFinal ? '🎉 ¡Historia completada!' : `🏠 ${mejora.nombre}`;
  $('casa-reaccion-texto').textContent = mejora.dialogoDespues;
  $('casa-reaccion-svg').innerHTML = `<img src="${casaImagenUrl(mejora.id)}" class="casa-foto" alt="Casa nivel ${mejora.id}">`;
  $('btn-close-casa-reaccion').textContent = esFinal ? 'Cerrar' : 'Seguir pescando';
  toggleModal('casaReaccion', true);
}

function setPatience(delta = 0) {
  state.patience = clamp(state.patience + delta, 0, 100);
  ui.patienceBar.style.width = `${state.patience}%`;
  ui.patienceBar.style.background = state.patience > 60 ? '#27ae60' : state.patience > 30 ? '#f39c12' : '#e74c3c';
  if (state.patience) return;
  endTrip('😤 ¡Perdiste la paciencia!\nVuelves al puerto con lo que llevas en la mochila.');
}

function sellFish(index) {
  const precio = fishPrice(state.backpack[index]);
  state.money += precio;
  state.stats.dineroTotal += precio;
  state.backpack.splice(index, 1);
  checkLogros();
  renderBackpack();
  renderMap();
}

function sellAll() {
  if (!state.backpack.length) return;
  const valor = backpackValue();
  state.money += valor;
  state.stats.dineroTotal += valor;
  state.backpack = [];
  checkLogros();
  renderBackpack();
  renderMap();
}

function renderBackpack() {
  const list = $('backpack-list');
  const weight = currentWeight();
  const max = mochilaMax();
  const pct = Math.min(100, weight / max * 100);
  $('backpack-weight-bar').style.cssText = `width:${pct}%;background:${pct > 90 ? 'linear-gradient(90deg,#c0392b,#e74c3c)' : pct > 70 ? 'linear-gradient(90deg,#d35400,#f39c12)' : 'linear-gradient(90deg,#6d4c30,#a87c4f)'}`;
  $('backpack-weight-label').textContent = `${weight.toFixed(1)} / ${max} kg`;
  $('backpack-total-value').textContent = `$${backpackValue()}`;
  list.innerHTML = state.backpack.length ? '' : '<div class="backpack-empty">Tu mochila está vacía. ¡Ve a pescar algo! 🎣</div>';

  state.backpack.forEach((fish, i) => {
    const filtro = fish.mutation.filtro ? `filter:${fish.mutation.filtro};` : '';
    const claseArcoiris = fish.mutation.arcoiris ? 'filtro-arcoiris' : '';
    const brillo = fish.mutation.especial ? `box-shadow:0 0 14px ${fish.mutation.color};` : '';
    list.insertAdjacentHTML('beforeend', `
      <div class="backpack-entry">
        <div class="backpack-entry-thumb" style="background:${fish.color}33;${brillo}">${fish.img ? `<img class="${claseArcoiris}" src="${fish.img}" alt="${fish.n}" style="${filtro}">` : `<span class="${claseArcoiris}" style="${filtro}">${fish.emoji || '🐟'}</span>`}</div>
        <div class="backpack-entry-info">
          <h4>${fish.n} <span class="mutacion-tag" data-mutacion="${fish.mutation.id}" style="background:${fish.mutation.tagBg || fish.mutation.color}">${fish.mutation.nombre}</span></h4>
          <p>${fish.weight.toFixed(1)} kg · x${fish.sizeMult.toFixed(2)} tamaño</p>
        </div>
        <div class="backpack-entry-value">$${fishPrice(fish)}</div>
        <div class="backpack-entry-actions"><button class="btn btn-sell-one" data-index="${i}">Vender</button></div>
      </div>
    `);
  });

  list.querySelectorAll('[data-index]').forEach(btn => btn.onclick = () => sellFish(+btn.dataset.index));
  updateHUD();
}

function tooltip(html, x, y, sticky = false) {
  const box = ui.mapWrap.getBoundingClientRect();
  ui.tooltip.style.left = `${x - box.left}px`;
  ui.tooltip.style.top = `${y - box.top}px`;
  ui.tooltip.innerHTML = html;
  ui.tooltip.classList.add('show');
  if (!sticky) return;
  setTimeout(() => ui.tooltip.classList.remove('show'), 1200);
}

function renderMap() {
  updateHUD();
  ui.map.innerHTML = '';

  const jungle = svg('g');
  jungle.setAttribute('opacity', '.35');
  const arbolitos = [
    [40, 30, 22], [770, 40, 26], [20, 220, 20], [800, 180, 24], [30, 400, 24],
    [790, 400, 22], [400, 30, 18], [350, 440, 20], [700, 440, 18], [120, 440, 16],
    [640, 60, 16], [90, 150, 14], [760, 300, 18], [15, 320, 16]
  ];
  arbolitos.forEach(([x, y, r]) => {
    const g = svg('g');
    g.innerHTML = `<circle cx="${x}" cy="${y}" r="${r}" fill="#2e5c33"/><circle cx="${x - r * .4}" cy="${y - r * .3}" r="${r * .6}" fill="#3a6f3f"/>`;
    jungle.appendChild(g);
  });
  ui.map.appendChild(jungle);

  const waypoints = DATA_ISLAS.map(i => MAP_SHAPES[i.id]).filter(Boolean);
  let riverPath = `M ${waypoints[0].cx},${waypoints[0].cy}`;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2 - 34;
    riverPath += ` Q ${mx},${my} ${b.cx},${b.cy}`;
  }
  const riverGroup = svg('g');
  riverGroup.innerHTML = `
    <path d="${riverPath}" stroke="#0d4f6e" stroke-width="78" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <path d="${riverPath}" stroke="#1a7aa8" stroke-width="64" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${riverPath}" stroke="#3fa9d6" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="1 22" opacity=".55"/>
  `;
  ui.map.appendChild(riverGroup);

  const corriente = svg('g');
  corriente.setAttribute('opacity', '.16');
  [-16, 16].forEach(offset => {
    const wave = svg('path');
    let d = `M ${waypoints[0].cx},${waypoints[0].cy + offset}`;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i], b = waypoints[i + 1];
      const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2 - 34 + offset;
      d += ` Q ${mx},${my} ${b.cx},${b.cy + offset}`;
    }
    Object.entries({ d, stroke: '#fff', 'stroke-width': '2', fill: 'none' }).forEach(([k, v]) => wave.setAttribute(k, v));
    corriente.appendChild(wave);
  });
  ui.map.appendChild(corriente);

  [[290, 70, 1], [500, 175, -1], [180, 280, 1], [640, 260, -1], [400, 355, 1]].forEach(([x, y, dir]) => {
    const fish = svg('g');
    fish.setAttribute('transform', `translate(${x},${y}) scale(${dir * .9},.9)`);
    fish.setAttribute('opacity', '.5');
    fish.innerHTML = '<ellipse cx="0" cy="0" rx="9" ry="5" fill="#a8d8ea"/><path d="M -9,0 L -15,-5 L -15,5 Z" fill="#a8d8ea"/>';
    ui.map.appendChild(fish);
  });

  DATA_ISLAS.forEach((island, idx) => {
    const shape = MAP_SHAPES[island.id];
    if (!shape) return;
    const locked = !island.desc;
    const group = svg('g');
    group.setAttribute('class', `island-group ${locked ? 'locked' : ''}`);
    group.innerHTML = `
      <ellipse cx="${shape.cx}" cy="${shape.cy + 38}" rx="70" ry="12" fill="rgba(0,0,0,.25)"/>
      <path class="island-shape" d="${shape.path}" fill="${shape.color}" stroke="#5d4522" stroke-width="3" stroke-linejoin="round"/>
      ${!locked && shape.decor ? `<g class="island-decor">${DECOR[shape.decor](shape.cx, shape.cy - 8)}</g>` : ''}
      <text x="${shape.cx}" y="${shape.cy + 2}" class="island-label" font-size="15">${island.nombre}</text>
      <text x="${shape.cx}" y="${shape.cy + 20}" class="island-sublabel" font-size="12" fill="${locked ? '#f1c40f' : '#d4f8d4'}">${locked ? `🔒 $${island.costo}` : '⚓ Zarpar'}</text>
      <circle class="island-order" cx="${shape.cx - 48}" cy="${shape.cy - 44}" r="14"/>
      <text x="${shape.cx - 48}" y="${shape.cy - 39}" class="island-order-label" font-size="13">${idx + 1}</text>
    `;

    const fishList = island.peces.map(f => f.n).join(', ');
    const minasInfo = island.minas ? `<br>💣 <span style="color:#ff7043">Minas navales: ${island.minas}</span>` : '';
    group.onmousemove = e => tooltip(locked ? `<b>${island.nombre}</b><br>${fishList}${minasInfo}<br><span class="precio">Desbloquear: $${island.costo}</span>` : `<b>${island.nombre}</b><br>${fishList}${minasInfo}`, e.clientX, e.clientY);
    group.onmouseleave = () => ui.tooltip.classList.remove('show');
    group.onclick = () => {
      if (island.desc) return openIslandGrabSequence(island.id);
      if (state.money < island.costo) return tooltip('<b style="color:#e74c3c">¡No tienes suficiente dinero!</b>', ui.mapWrap.getBoundingClientRect().left + shape.cx, ui.mapWrap.getBoundingClientRect().top + shape.cy, true);
      state.money -= island.costo;
      island.desc = true;
      checkLogros();
      ui.tooltip.classList.remove('show');
      renderMap();
    };
    ui.map.appendChild(group);
  });
}

function renderEncyclopedia() {
  const list = $('encyclopedia-list');
  list.innerHTML = '';
  DATA_ISLAS.forEach(island => {
    const wrapper = document.createElement('div');
    wrapper.className = 'encyclopedia-island-group';
    wrapper.innerHTML = `<div class="encyclopedia-island-title">${island.nombre}${island.desc ? '' : ' 🔒'}</div>`;

    island.peces.forEach(fish => {
      const locked = !island.desc;
      const entry = document.createElement('div');
      entry.className = `fish-entry ${locked ? 'locked' : ''}`;

      entry.innerHTML = `
        <div class="fish-entry-row" ${locked ? '' : 'role="button" tabindex="0"'}>
          <div class="fish-entry-thumb" style="background:${locked ? 'rgba(255,255,255,.05)' : `${fish.color}33`}">${fishThumb(fish, locked)}</div>
          <div class="fish-entry-info">${locked ? `<h4>???</h4><p>Desbloquea ${island.nombre} para descubrirlo</p>` : `<h4>${fish.n}</h4><p>Velocidad ${fish.vel.toFixed(1)} · Probabilidad ${(fish.prob * 100).toFixed(0)}%</p>`}</div>
          <div class="fish-entry-value">${locked ? '—' : `$${fish.valor}`}</div>
          ${locked ? '' : '<div class="fish-entry-chevron">▾</div>'}
        </div>
        ${locked ? '' : `
        <div class="fish-entry-details">
          <p class="fish-entry-dato">🐟 ${fish.dato || 'Todavía no se sabe mucho sobre esta especie.'}</p>
          <div class="fish-entry-stats-grid">
            <span>⚖️ Peso aprox. ${fish.peso} kg</span>
            <span>📏 Tamaño ${fish.tam}</span>
            <span>⚡ Velocidad ${fish.vel.toFixed(1)}</span>
            <span>🎲 Probabilidad ${(fish.prob * 100).toFixed(0)}%</span>
            <span>💰 Valor base $${fish.valor}</span>
            <span>📍 ${island.nombre}</span>
          </div>
        </div>`}
      `;
      wrapper.appendChild(entry);
    });
    list.appendChild(wrapper);
  });
}

$('encyclopedia-list').addEventListener('click', e => {
  const row = e.target.closest('.fish-entry-row[role="button"]');
  if (!row) return;
  row.closest('.fish-entry').classList.toggle('expanded');
});
$('encyclopedia-list').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.fish-entry-row[role="button"]');
  if (!row) return;
  e.preventDefault();
  row.closest('.fish-entry').classList.toggle('expanded');
});

function startTrip(id) {
  game.island = DATA_ISLAS.find(i => i.id === id);
  state.island = game.island;
  state.patience = 100;
  game.timeLeft = curDif().tiempoLimiteViaje;
  game.tripMinaHit = false; 
  ui.islandName.textContent = game.island.nombre;
  ui.timer.textContent = `⏱️ ${game.timeLeft}s`;
  ui.timer.classList.remove('timer-urgente');

  state.stats.islaMaxAlcanzada = Math.max(state.stats.islaMaxAlcanzada, game.island.id);
  checkLogros();

  updateHUD();
  setPatience();
  setScreen('fishing-screen');
  startPatienceDrain();
  startTripTimer();
  initFishingScene();
}

function endTrip(message = '') {
  if (game.island && game.island.minas > 0 && !game.tripMinaHit) {
    state.stats.nerviosAcero = true;
    checkLogros();
  }

  cancelAnimationFrame(game.animId);
  clearInterval(game.patienceTimer);
  clearInterval(game.tripTimer);
  game.animId = game.island = null;
  game.fight = null;
  if (ui.fightPanel) ui.fightPanel.style.display = 'none';
  if (message) alert(message);
  setScreen('map-screen');
  renderMap();
}

function startTripTimer() {
  clearInterval(game.tripTimer);
  game.tripTimer = setInterval(() => {
    game.timeLeft -= 1;
    ui.timer.textContent = `⏱️ ${game.timeLeft}s`;
    ui.timer.classList.toggle('timer-urgente', game.timeLeft <= 15);
    if (game.timeLeft <= 0) endTrip('⏱️ ¡Se acabó el tiempo!\nVuelves al puerto con lo que llevas en la mochila.');
  }, 1000);
}

function startPatienceDrain() {
  clearInterval(game.patienceTimer);
  const d = curDif();
  const aguante = equipoActual().cana.aguante || 0;
  const decaimiento = d.decaimientoPaciencia * (1 - aguante);
  game.patienceTimer = setInterval(() => setPatience(-decaimiento), d.tickPaciencia);
}

function initFishingScene() {
  game.fishes = Array.from({ length: 8 + Math.floor(rand(5)) }, () => createFish(pickWeighted(game.island.peces)));
  game.minas = Array.from({ length: game.island.minas || 0 }, createMina);
  game.particles = [];
  game.labels = [];
  game.explosions = [];
  game.shake = 0;
  game.fight = null; 
  if (ui.fightPanel) ui.fightPanel.style.display = 'none';
  game.bubbles = Array.from({ length: 30 }, () => ({ x: rand(ui.canvas.width), y: rand(ui.canvas.height), r: 2 + rand(5), vel: .3 + rand(.7), alpha: .1 + rand(.3) }));
  game.cursorX = 400;

  ui.canvas.onmousemove = e => {
    const r = ui.canvas.getBoundingClientRect();
    game.mouseX = (e.clientX - r.left) * ui.canvas.width / r.width;
    game.mouseY = (e.clientY - r.top) * ui.canvas.height / r.height;
  };
  ui.canvas.onclick = e => {
    const r = ui.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * ui.canvas.width / r.width;
    const y = (e.clientY - r.top) * ui.canvas.height / r.height;
    if (clickMina(x, y)) return;
    clickFish(x, y);
  };

  cancelAnimationFrame(game.animId);
  loop();
}

const TAM_ESCALA = () => (ui.canvas.width / 800) * 1.5;
const RES_ESCALA = () => ui.canvas.width / 800;

function createFish(type) {
  const leftToRight = Math.random() < .5;
  const scale = .85 + rand(.3);
  const esc = TAM_ESCALA();
  const size = type.tam * scale * esc;
  const cebo = equipoActual().cebo.mult;
  return {
    type, dir: leftToRight ? 1 : -1, scale,
    x: leftToRight ? -type.tam * esc : ui.canvas.width + type.tam * esc,
    y: 80 + rand(ui.canvas.height - 120),
    vel: type.vel * (.8 + rand(.4)) * curDif().multiplicadorVelocidad * RES_ESCALA(),
    oscY: rand(Math.PI * 2), chaos: rand(Math.PI * 2), chaosVel: .06 + rand(.08), caught: false,
    hitW: (type.img ? size * 2.4 : size * 2.2) * .72 * cebo,
    hitH: (type.img ? size * 1.6 : size) * .85 * cebo,
    fuerza: clamp(Math.round((type.tam - 14) / 8), 1, 6)
  };
}

function createMina() {
  const w = ui.canvas.width, h = ui.canvas.height;
  return {
    x: 130 + rand(Math.max(40, w - 220)),
    y: 90 + rand(Math.max(40, h - 170)),
    r: (16 + rand(6)) * TAM_ESCALA() / 1.5,
    bob: rand(Math.PI * 2)
  };
}

function clickMina(x, y) {
  for (let i = 0; i < game.minas.length; i++) {
    const mina = game.minas[i];
    const dy = y - (mina.drawY ?? mina.y);
    if ((x - mina.x) ** 2 + dy ** 2 <= (mina.r + 8) ** 2) return explotarMina(mina), true;
  }
  return false;
}

function crearExplosion(x, y) {
  game.explosions.push({ x, y, life: 26, maxLife: 26 });
  game.shake = 14;
}

function updateExplosions() {
  const { ctx } = game;
  for (let i = game.explosions.length - 1; i >= 0; i--) {
    const ex = game.explosions[i];
    const p = 1 - ex.life / ex.maxLife; 
    if (p < .35) {
      ctx.save();
      ctx.globalAlpha = 1 - p / .35;
      const flash = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, 130);
      flash.addColorStop(0, '#fff8e1');
      flash.addColorStop(.4, '#ffb74d');
      flash.addColorStop(1, 'rgba(255,87,34,0)');
      ctx.fillStyle = flash;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, 130, 0, 7); ctx.fill();
      ctx.restore();
    }
    const radio = 10 + p * 150;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = '#ffccbc';
    ctx.lineWidth = 6 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, radio, 0, 7); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.max(0, .6 - p * .6);
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, radio * .7, 0, 7); ctx.stroke();
    ctx.restore();

    ex.life--;
    if (ex.life <= 0) game.explosions.splice(i, 1);
  }
}

function boom() {
  if (!AUDIO.ctx || AUDIO.muted) return;
  const ctx = AUDIO.ctx;
  const t0 = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * .6);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) ** 1.5;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, t0);
  filter.frequency.exponentialRampToValueAtTime(80, t0 + .5);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(.9, t0);
  gain.gain.exponentialRampToValueAtTime(.001, t0 + .6);
  src.connect(filter).connect(gain).connect(AUDIO.master);
  src.start(t0);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(35, t0 + .35);
  oscGain.gain.setValueAtTime(.6, t0);
  oscGain.gain.exponentialRampToValueAtTime(.001, t0 + .4);
  osc.connect(oscGain).connect(AUDIO.master);
  osc.start(t0);
  osc.stop(t0 + .4);
}

function explotarMina(mina) {
  game.tripMinaHit = true;
  const habiaAlgo = state.backpack.length > 0;
  state.backpack = [];
  setPatience(-28);
  crearExplosion(mina.x, mina.drawY ?? mina.y);
  burst(mina.x, mina.drawY ?? mina.y, '#ff7043', 22);
  burst(mina.x, mina.drawY ?? mina.y, '#ffca28', 14);
  burst(mina.x, mina.drawY ?? mina.y, '#2d2d2d', 18);
  addLabel('💥 ¡MINA NAVAL!', mina.x, (mina.drawY ?? mina.y) - 24, '#ff5252');
  addLabel(habiaAlgo ? 'Perdiste TODO lo de la mochila' : 'Menos mal que no llevabas nada', mina.x, (mina.drawY ?? mina.y) + 8, '#ffab91');
  boom();
  splash(false);
  renderBackpack();

  const idx = game.minas.indexOf(mina);
  if (idx >= 0) game.minas.splice(idx, 1);
  setTimeout(() => { if (game.island) game.minas.push(createMina()); }, 2600);
}

function updateMinas(t) {
  const { ctx } = game;
  game.minas.forEach(mina => {
    mina.drawY = mina.y + Math.sin(t * 1.3 + mina.bob) * 4;
    ctx.save();
    ctx.translate(mina.x, mina.drawY);
    ctx.beginPath(); ctx.arc(0, 0, mina.r, 0, 7);
    ctx.fillStyle = '#1c1c1c'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * mina.r * .55, Math.sin(ang) * mina.r * .55, mina.r * .15, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * Math.PI * 2 + .3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * mina.r, Math.sin(ang) * mina.r);
      ctx.lineTo(Math.cos(ang) * (mina.r + 9), Math.sin(ang) * (mina.r + 9));
      ctx.stroke();
    }
    const blink = (Math.sin(t * 6) + 1) / 2;
    ctx.beginPath(); ctx.arc(0, -mina.r * .15, mina.r * .22, 0, 7);
    ctx.fillStyle = `rgba(231,76,60,${.5 + blink * .5})`;
    ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 8 + blink * 8;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  });
}

function clickFish(x, y) {
  if (game.fight) return handleTiron(x, y);

  for (let i = game.fishes.length - 1; i >= 0; i--) {
    const fish = game.fishes[i];
    if (!fish.caught && ((x - fish.x) ** 2 / fish.hitW ** 2 + (y - fish.y) ** 2 / fish.hitH ** 2) <= 1) return hookFish(fish, i);
  }
  setPatience(-Math.max(2, curDif().penalizacionFallo - equipoActual().cana.fallo));
  addLabel('¡Fallaste!', x, y, '#e74c3c');
  splash(false);
}

function hookFish(fish, index) {
  const need = fish.fuerza;
  game.fight = {
    fish, index,
    need,
    progress: 0,
    maxTime: 1.1 + need * 0.85,
    timeLeft: 1.1 + need * 0.85
  };
  if (ui.fightPanel) ui.fightPanel.style.display = 'flex';
  if (ui.fightLabel) ui.fightLabel.textContent = need > 3 ? `¡${fish.type.n} enorme! ¡Jala fuerte!` : `¡Picó un ${fish.type.n}!`;
  updateFightBar();
  addLabel(need > 3 ? '¡ALGO ENORME PICÓ!' : '¡Picó!', fish.x, fish.y - 22, '#f1c40f');
  splash(false);
}

function handleTiron(x, y) {
  const { fish } = game.fight;
  const dentro = (x - fish.x) ** 2 / fish.hitW ** 2 + (y - fish.y) ** 2 / fish.hitH ** 2 <= 1.4;
  if (dentro) {
    game.fight.progress++;
    burst(fish.x, fish.y, '#74b9ff', 6);
    splash(true);
    if (game.fight.progress >= game.fight.need) return resolverForcejeo(true);
  } else {
    game.fight.timeLeft = Math.max(0, game.fight.timeLeft - 0.6);
    addLabel('¡Se resbaló!', x, y, '#e74c3c');
    splash(false);
  }
  updateFightBar();
}

function updateFightBar() {
  if (!game.fight || !ui.fightBar) return;
  const pct = clamp((game.fight.progress / game.fight.need) * 100, 0, 100);
  ui.fightBar.style.width = `${pct}%`;
}

function updateFightState(t) {
  if (!game.fight) return;
  const f = game.fight;

  f.timeLeft -= 1 / 60;
  if (f.timeLeft <= 0) return resolverForcejeo(false);

  f.fish.x += Math.sin(t * 14) * 1.4;
  f.fish.y += Math.cos(t * 11) * 1.1;
  f.fish.bank = Math.sin(t * 14) * .3;

  if (ui.fightTimer) {
    const pct = clamp((f.timeLeft / f.maxTime) * 100, 0, 100);
    ui.fightTimer.style.width = `${pct}%`;
  }
}

function drawFightLine() {
  if (!game.fight) return;
  const { ctx } = game;
  const f = game.fight;
  const puntaCana = { x: 96, y: ui.canvas.height - 60 };
  ctx.save();
  ctx.strokeStyle = 'rgba(230,230,230,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(puntaCana.x, puntaCana.y);
  ctx.lineTo(f.fish.x, f.fish.y);
  ctx.stroke();
  ctx.restore();
}

function resolverForcejeo(ganado) {
  const { fish, index } = game.fight;
  game.fight = null;
  if (ui.fightPanel) ui.fightPanel.style.display = 'none';

  if (ganado) return catchFish(fish, index);

  addLabel('¡Se escapó!', fish.x, fish.y, '#e74c3c');
  burst(fish.x, fish.y, '#95a5a6', 10);
  splash(false);
  setPatience(-Math.max(3, curDif().penalizacionFallo * .6));
  game.fishes.splice(index, 1);
  setTimeout(() => game.island && game.fishes.push(createFish(pickWeighted(game.island.peces))), 1200);
}

function catchFish(fish, index) {
  const sizeMult = .7 + rand(.7);
  const weight = fish.type.peso * sizeMult;
  const mutation = pickMutation(equipoActual().cebo.suerte || 0);
  if (currentWeight() + weight > mochilaMax()) return addLabel('¡Mochila llena!', fish.x, fish.y, '#e74c3c'), setPatience(-3);

  fish.caught = true;
  state.backpack.push({ n: fish.type.n, value: fish.type.valor, img: fish.type.img, emoji: fish.type.emoji, color: fish.type.color, islandId: game.island.id, sizeMult, weight, mutation });

  state.stats.totalPeces++;
  if (!state.stats.especies.includes(fish.type.n)) state.stats.especies.push(fish.type.n);
  if (!state.stats.mutaciones.includes(mutation.id)) state.stats.mutaciones.push(mutation.id);
  state.stats.capturasPorEspecie[fish.type.n] = (state.stats.capturasPorEspecie[fish.type.n] || 0) + 1;
  if (MUTACIONES_RARAS_CASA.includes(mutation.id)) state.stats.capturasMutacionRara++;
  if (currentWeight() >= mochilaMax() - 0.05) state.stats.mochilaLlena = true;
  checkLogros();

  updateHUD();
  setPatience(curDif().bonusAtrapar + equipoActual().cana.paciencia);
  if (mutation.especial) {
    burst(fish.x, fish.y, mutation.color, 30);
    addLabel(mutation.nombre, fish.x, fish.y - 26, mutation.color);
  } else {
    burst(fish.x, fish.y, fish.type.color, 14);
  }
  addLabel(`+${fish.type.n}`, fish.x, fish.y, mutation.color);
  splash(true);

  setTimeout(() => {
    game.fishes.splice(index, 1);
    setTimeout(() => game.island && game.fishes.push(createFish(pickWeighted(game.island.peces))), 1500);
  }, 400);
}

function loop() {
  game.animId = requestAnimationFrame(loop);
  const { ctx } = game;
  const w = ui.canvas.width, h = ui.canvas.height, t = Date.now() / 1000;

  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
    game.shake *= .85;
    if (game.shake < .5) game.shake = 0;
  }

  drawFondoIsla(w, h, t);

  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.moveTo(0, 48);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, 48 + Math.sin(x / 40 + t * 2) * 5);
  ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.fill();

  game.bubbles.forEach(b => { b.y -= b.vel; if (b.y < -10) b.y = h + 10; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.strokeStyle = `rgba(255,255,255,${b.alpha})`; ctx.stroke(); });
  drawFisher(t, h);
  drawCrosshair();
  updateFightState(t); 
  updateFishes(w);
  drawFightLine(); 
  updateMinas(t);
  updateExplosions();
  updateParticles();
  updateLabels();
  ctx.restore();
}

function drawFondoIsla(w, h, t) {
  const { ctx } = game;
  const foto = game.island.fotoFondo ? getImage(game.island.fotoFondo) : null;

  if (foto && foto.complete && foto.naturalWidth > 0) {
    const escala = Math.max(w / foto.naturalWidth, h / foto.naturalHeight);
    const dw = foto.naturalWidth * escala, dh = foto.naturalHeight * escala;
    ctx.drawImage(foto, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.fillStyle = `${game.island.fondo}55`; 
    ctx.fillRect(0, 0, w, h);
  } else {
    const top = lighten(game.island.fondo, 30);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, top); bg.addColorStop(1, game.island.fondo);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  }
}

function updateFishes(w) {
  const erratico = curDif().erratico;
  const evasionRadio = 65 + erratico * 55;
  const evasionFuerza = 1.8 + erratico * 3.2;
  game.fishes.forEach(fish => {
    if (fish.caught) return;

    if (game.fight && game.fight.fish === fish) return drawFish(fish);

    fish.oscY += .04;
    fish.chaos += fish.chaosVel;
    fish.x += fish.vel * fish.dir * (1 + Math.sin(fish.chaos) * erratico);
    const vy = Math.cos(fish.oscY) * (.5 + erratico * 1.5);
    fish.y += vy;

    const dx = fish.x - game.mouseX, dy2 = fish.y - game.mouseY;
    const dist = Math.hypot(dx, dy2);
    if (dist > 0.001 && dist < evasionRadio) {
      const fuerza = (1 - dist / evasionRadio) * evasionFuerza;
      fish.x += (dx / dist) * fuerza;
      fish.y += (dy2 / dist) * fuerza;
    }

    fish.y = clamp(fish.y, 60, ui.canvas.height - 60);
    fish.bank = clamp(vy * 0.16, -.4, .4);
    fish.squash = 1 + Math.sin(fish.oscY) * .05;
    if (fish.x > w + 60) fish.x = -60;
    if (fish.x < -60) fish.x = w + 60;
    drawFish(fish);
  });
}

function updateParticles() {
  const { ctx } = game;
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += .2; p.life -= 1;
    if (p.life <= 0) { game.particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life / 40; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = p.color; ctx.fill(); ctx.globalAlpha = 1;
  }
}

function updateLabels() {
  const { ctx } = game;
  for (let i = game.labels.length - 1; i >= 0; i--) {
    const l = game.labels[i];
    l.y += l.vy; l.life -= 1;
    if (l.life <= 0) { game.labels.splice(i, 1); continue; }
    ctx.globalAlpha = l.life / 60; ctx.font = "bold 18px 'Segoe UI',sans-serif"; ctx.fillStyle = l.color; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(l.text, l.x, l.y); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
}

function drawCrosshair() {
  const { ctx } = game;
  game.cursorX += (game.mouseX - game.cursorX) * .12;
  ctx.save();
  ctx.strokeStyle = 'rgba(241,196,15,.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(game.cursorX, game.mouseY, 14, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(game.cursorX - 20, game.mouseY); ctx.lineTo(game.cursorX + 20, game.mouseY); ctx.moveTo(game.cursorX, game.mouseY - 20); ctx.lineTo(game.cursorX, game.mouseY + 20); ctx.stroke();
  ctx.restore();
}

function drawFisher(t, h) {
  const { ctx } = game;
  const mood = state.patience > 70 ? ['sonrisa', 0, '#27ae60'] : state.patience > 40 ? ['recta', 2, '#74b9ff'] : state.patience > 15 ? ['mueca', 8, '#f39c12', 1] : ['grito', 14, '#e74c3c', 1];
  const furious = state.patience <= 15;
  const shake = furious ? Math.sin(t * 18) * 2 : 0;
  const bob = Math.sin(t * (furious ? 6 : 1.6)) * (furious ? 1 : 2.5);
  ctx.save(); ctx.translate(70 + shake, h - 18 + bob);
  ctx.fillStyle = '#6d4c30'; ctx.fillRect(-34, 10, 68, 8);
  ctx.fillStyle = '#5a3d27'; for (let x = -30; x <= 26; x += 14) ctx.fillRect(x, 10, 4, 18);
  ctx.fillStyle = mood[2]; ctx.beginPath(); ctx.moveTo(-16, 10); ctx.quadraticCurveTo(-18, -28, 0, -30); ctx.quadraticCurveTo(18, -28, 16, 10); ctx.fill();
  const armAngle = -.3 - (furious ? .35 : state.patience <= 40 ? .15 : 0);
  ctx.save(); ctx.translate(10, -18); ctx.rotate(armAngle); ctx.fillStyle = '#e6b894'; ctx.fillRect(-3, 0, 6, 26); ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(46, -36); ctx.stroke(); ctx.restore();
  ctx.beginPath(); ctx.arc(0, -42, 13, 0, 7); ctx.fillStyle = '#e6b894'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -46, 13.5, Math.PI, 0); ctx.fillStyle = '#34495e'; ctx.fill(); ctx.fillRect(-13.5, -46, 27, 4);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -47 - mood[1] * .15); ctx.lineTo(-3, -45 - mood[1] * .4); ctx.moveTo(9, -47 - mood[1] * .15); ctx.lineTo(3, -45 - mood[1] * .4); ctx.stroke();
  if (furious) { ctx.beginPath(); ctx.moveTo(-8, -41); ctx.lineTo(-2, -41); ctx.moveTo(2, -41); ctx.lineTo(8, -41); ctx.stroke(); }
  else { ctx.fillStyle = '#2d2d2d'; ctx.beginPath(); ctx.arc(-5, -41, 1.8, 0, 7); ctx.arc(5, -41, 1.8, 0, 7); ctx.fill(); }
  ctx.beginPath();
  if (mood[0] === 'sonrisa') ctx.arc(0, -36, 5, .15 * Math.PI, .85 * Math.PI);
  else if (mood[0] === 'recta') { ctx.moveTo(-5, -35); ctx.lineTo(5, -35); }
  else if (mood[0] === 'mueca') { ctx.moveTo(-5, -33); ctx.lineTo(0, -36); ctx.lineTo(5, -33); }
  else { ctx.ellipse(0, -34, 4.5, 5, 0, 0, 7); ctx.fillStyle = '#5a1f1f'; ctx.fill(); }
  ctx.stroke();
  if (mood[3]) { drawDrop(13, -52 + Math.sin(t * 4) * 2, 4); if (furious) drawDrop(-14, -50 + Math.sin(t * 4 + 1) * 2, 3.5); }
  if (furious) for (let i = 0; i < 3; i++) { const x = -10 + i * 10, y = Math.sin(t * 6 + i) * 2; ctx.beginPath(); ctx.moveTo(x, -60 - y); ctx.lineTo(x + 4, -68 - y); ctx.strokeStyle = 'rgba(231,76,60,.8)'; ctx.stroke(); }
  ctx.restore();

  function drawDrop(x, y, size) {
    ctx.fillStyle = '#74b9ff'; ctx.beginPath(); ctx.moveTo(x, y - size); ctx.quadraticCurveTo(x + size * .8, y + size * .3, x, y + size); ctx.quadraticCurveTo(x - size * .8, y + size * .3, x, y - size); ctx.fill();
  }
}

function drawFish(fish) {
  const { ctx } = game;
  const size = fish.type.tam * fish.scale * TAM_ESCALA();
  const bank = fish.bank || 0;
  const squash = fish.squash || 1;
  const flip = fish.dir * (artMiraIzquierda(fish.type) ? -1 : 1);
  ctx.save(); ctx.translate(fish.x, fish.y); ctx.rotate(bank);
  if (fish.type.img) {
    const img = getImage(fish.type.img), w = size * 2.4, h = size * 1.6 * squash;
    ctx.scale(flip, 1);
    img.complete && img.naturalWidth > 0 ? ctx.drawImage(img, -w / 2, -h / 2, w, h) : (ctx.beginPath(), ctx.arc(0, 0, size * .7, 0, 7), ctx.fillStyle = fish.type.color, ctx.fill());
    ctx.scale(1 / flip, 1);
    drawFishLabel(fish.type.n, h / 2 + 13, Math.max(9, size * .38));
  } else {
    ctx.scale(flip, 1);
    const sy = size * .5 * squash;
    ctx.beginPath(); ctx.ellipse(0, 0, size, sy, 0, 0, 7); ctx.fillStyle = fish.type.color; ctx.shadowColor = fish.type.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-size * .8, 0); ctx.lineTo(-size * 1.4, -sy); ctx.lineTo(-size * 1.4, sy); ctx.fill();
    ctx.beginPath(); ctx.arc(size * .4, -size * .1, size * .12, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(size * .42, -size * .1, size * .07, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
    ctx.scale(1 / flip, 1);
    drawFishLabel(`${fish.type.emoji} ${fish.type.n}`, size * .85, Math.max(9, size * .45), false);
  }
  ctx.restore();
}

function drawFishLabel(text, y, size, shadow = true) {
  const { ctx } = game;
  ctx.font = `bold ${size}px 'Segoe UI',sans-serif`;
  ctx.fillStyle = shadow ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.85)';
  ctx.textAlign = 'center';
  if (shadow) { ctx.shadowColor = '#000'; ctx.shadowBlur = 3; }
  ctx.fillText(text, 0, y); ctx.shadowBlur = 0;
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) game.particles.push({ x, y, vx: (Math.random() - .5) * 6, vy: -(2 + rand(5)), life: 40, color, r: 3 + rand(4) });
}
function addLabel(text, x, y, color) { game.labels.push({ text, x, y, color, life: 60, vy: -1.5 }); }
function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.min(255, v + amount));
  return `rgb(${rgb.join(',')})`;
}

const lake = {
  screenId: 'lake-intro-screen',
  scene: $('lake-scene'),
  bubblesLayer: $('lake-bubbles'),
  ripplesLayer: $('lake-ripples'),
  prompt: $('lake-prompt'),
  battleOverlay: $('click-battle-overlay'),
  resultOverlay: $('battle-result-overlay'),
  bar: $('battle-bar'),
  timerLabel: $('battle-timer'),
  btnClick: $('btn-click-battle'),
  resultTitle: $('battle-result-title'),
  resultText: $('battle-result-text'),
  btnContinue: $('btn-battle-continue'),
  transitionOverlay: $('fishing-transition-overlay'),
  transitionDrops: $('transition-splash-drops'),
  transitionBanner: $('transition-banner'),
  bubbleTimer: null,
  battleActive: false,
  progress: 0,
  timeLeft: 5,
  battleTimer: null,
  pendingIslandId: null 
};

function openIslandGrabSequence(islandId) {
  const island = DATA_ISLAS.find(i => i.id === islandId);
  lake.pendingIslandId = islandId;
  lake.prompt.textContent = island ? `🎣 Haz clic en el agua para lanzar el anzuelo en ${island.nombre}` : '🎣 Haz clic en el agua';
  setScreen(lake.screenId); 
  startLakeBubbles();
}

function spawnBubble() {
  const b = document.createElement('div');
  const size = 6 + rand(20);
  b.className = 'lake-bubble';
  b.style.left = `${rand(100)}%`;
  b.style.width = `${size}px`;
  b.style.height = `${size}px`;
  b.style.setProperty('--drift', `${(Math.random() - .5) * 60}px`);
  b.style.animationDuration = `${3 + rand(3)}s`;
  lake.bubblesLayer.appendChild(b);
  setTimeout(() => b.remove(), 6200);
}

function startLakeBubbles() {
  clearInterval(lake.bubbleTimer);
  lake.bubbleTimer = setInterval(spawnBubble, 260);
  for (let i = 0; i < 6; i++) setTimeout(spawnBubble, i * 120);
}

function stopLakeBubbles() {
  clearInterval(lake.bubbleTimer);
  lake.bubblesLayer.innerHTML = '';
}

function spawnRipple(x, y) {
  const r = document.createElement('div');
  r.className = 'lake-ripple';
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  lake.ripplesLayer.appendChild(r);
  setTimeout(() => r.remove(), 950);
}

function startClickBattle() {
  lake.battleActive = true;
  lake.progress = 0;
  lake.timeLeft = 5;
  lake.bar.style.width = '0%';
  lake.timerLabel.textContent = `${lake.timeLeft.toFixed(1)}s`;
  lake.battleOverlay.style.display = 'flex';
  clearInterval(lake.battleTimer);
  lake.battleTimer = setInterval(() => {
    lake.timeLeft -= .1;
    lake.progress = clamp(lake.progress - .6, 0, 100);
    lake.bar.style.width = `${lake.progress}%`;
    lake.timerLabel.textContent = `${Math.max(0, lake.timeLeft).toFixed(1)}s`;
    if (lake.progress >= 100) return endClickBattle(true);
    if (lake.timeLeft <= 0) return endClickBattle(false);
  }, 100);
}

function handleBattleClick() {
  if (!lake.battleActive) return;
  lake.progress = clamp(lake.progress + 9, 0, 100);
  lake.bar.style.width = `${lake.progress}%`;
  splash(true);
  if (lake.progress >= 100) endClickBattle(true);
}

function endClickBattle(won) {
  if (!lake.battleActive) return;
  lake.battleActive = false;
  clearInterval(lake.battleTimer);
  lake.battleOverlay.style.display = 'none';

  if (won) {
    playFishingTransition(() => {
      stopLakeBubbles();
      startTrip(lake.pendingIslandId);
    });
    return;
  }

  lake.resultTitle.textContent = '¡Se soltó! 💦';
  lake.resultText.textContent = 'El pez peleó más fuerte que tú esta vez. Prueba otra vez en el agua.';
  lake.btnContinue.textContent = 'Intentar de nuevo';
  lake.resultOverlay.style.display = 'flex';
}

function playFishingTransition(onDone) {
  const overlay = lake.transitionOverlay;
  const drops = lake.transitionDrops;
  const banner = lake.transitionBanner;

  drops.innerHTML = '';
  const totalDrops = 20;
  for (let i = 0; i < totalDrops; i++) {
    const drop = document.createElement('div');
    drop.className = 'transition-drop';
    drop.style.setProperty('--angle', `${(360 / totalDrops) * i + rand(15)}deg`);
    drop.style.setProperty('--dist', `${60 + rand(200)}px`);
    drop.style.animationDelay = `${rand(90)}ms`;
    drops.appendChild(drop);
  }

  overlay.classList.add('active'); 
  splash(true);

  setTimeout(() => banner.classList.add('show'), 160);

  setTimeout(() => {
    banner.classList.remove('show');
    overlay.classList.remove('active');
    drops.innerHTML = '';
    onDone();
  }, 1350);
}

lake.scene.addEventListener('click', e => {
  if (lake.battleActive) return;
  const box = lake.scene.getBoundingClientRect();
  spawnRipple(e.clientX - box.left, e.clientY - box.top);
  splash(false);
  startClickBattle();
});
lake.btnClick.addEventListener('click', ev => { ev.stopPropagation(); handleBattleClick(); });
lake.resultOverlay.addEventListener('click', e => { if (e.target === lake.resultOverlay) e.stopPropagation(); });
lake.btnContinue.addEventListener('click', () => {
  lake.resultOverlay.style.display = 'none';
});

$('btn-play').onclick = abrirHistoria;
$('btn-tutorial').onclick = () => toggleModal('tutorial', true);
$('btn-close-tutorial').onclick = () => toggleModal('tutorial', false);
document.querySelectorAll('.btn-sound').forEach(btn => btn.onclick = toggleMute);
$('btn-open-shop').onclick = () => toggleModal('shop', true);
$('btn-close-shop').onclick = () => toggleModal('shop', false);
$('btn-open-encyclopedia').onclick = () => { renderEncyclopedia(); toggleModal('encyclopedia', true); };
$('btn-close-encyclopedia').onclick = () => toggleModal('encyclopedia', false);
$('btn-open-logros').onclick = () => { renderLogros(); toggleModal('logros', true); };
$('btn-close-logros').onclick = () => toggleModal('logros', false);
$('btn-open-casa').onclick = irACasa;
$('btn-close-casa').onclick = () => toggleModal('casa', false);
$('btn-close-casa-reaccion').onclick = () => { toggleModal('casaReaccion', false); irACasa(); };
$('btn-home-mejorar').onclick = () => { renderCasa(); toggleModal('casa', true); };
$('btn-home-pescar').onclick = irAlMapa;
$('btn-open-logros').onclick = () => { renderLogros(); toggleModal('logros', true); };
$('btn-close-logros').onclick = () => toggleModal('logros', false);
$('btn-open-backpack').onclick = () => { renderBackpack(); toggleModal('backpack', true); };
$('btn-close-backpack').onclick = () => toggleModal('backpack', false);
$('btn-sell-all').onclick = sellAll;
$('btn-leave').onclick = () => endTrip();

document.querySelector('.shop-tabs').onclick = e => {
  const tab = e.target.dataset.t;
  if (!tab) return;
  document.querySelectorAll('.shop-list').forEach(list => list.classList.toggle('active-list', list.id === tab));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active-tab', btn.dataset.t === tab));
};

const TIENDA_CATS = [
  { tab: 'tab-canas', arr: EQUIPO_CANAS, nivelKey: 'canaNivel' },
  { tab: 'tab-cebos', arr: EQUIPO_CEBOS, nivelKey: 'ceboNivel' },
  { tab: 'tab-mochilas', arr: EQUIPO_MOCHILAS, nivelKey: 'mochilaNivel' }
];

function comprarEquipo(nivelKey, index) {
  const cat = TIENDA_CATS.find(c => c.nivelKey === nivelKey);
  const item = cat.arr[index];
  if (index <= state[nivelKey] || state.money < item.costo) return;
  state.money -= item.costo;
  state[nivelKey] = index;
  checkLogros();
  updateHUD();
  renderShop();
}

function statsLine(nivelKey, item) {
  if (nivelKey === 'canaNivel') {
    return `🎣 Perdona fallo +${item.fallo} · 😌 Calma al atrapar +${item.paciencia} · 🕰️ Aguante +${Math.round(item.aguante * 100)}%`;
  }
  if (nivelKey === 'ceboNivel') {
    return `🎯 Precisión ×${item.mult.toFixed(2)} · 🍀 Suerte de mutación +${Math.round(item.suerte * 100)}%`;
  }
  if (nivelKey === 'mochilaNivel') {
    return `🎒 Capacidad +${item.cap} kg`;
  }
  return '';
}

function renderShop() {
  TIENDA_CATS.forEach(cat => {
    const list = $(cat.tab);
    if (!list) return;
    const actual = state[cat.nivelKey];
    list.innerHTML = cat.arr.map((item, i) => {
      const poseido = i <= actual;
      const boton = poseido
        ? `<button class="btn" disabled>${i === actual ? 'Equipado' : 'Ya tienes esto o mejor'}</button>`
        : `<button class="btn" data-nivel="${cat.nivelKey}" data-index="${i}" ${state.money < item.costo ? 'disabled' : ''}>$${item.costo}</button>`;
      const stats = statsLine(cat.nivelKey, item);
      return `<div class="shop-item"><div><h4>${item.nombre}</h4><p>${item.desc}</p>${stats ? `<p class="shop-stats">${stats}</p>` : ''}</div>${boton}</div>`;
    }).join('');
  });
}

$('shop-modal').addEventListener('click', e => {
  const btn = e.target.closest('button[data-nivel]');
  if (btn) comprarEquipo(btn.dataset.nivel, Number(btn.dataset.index));
});

STORAGE_OK = storageDisponible();
loadGame();
if (ui.btnHistoria) ui.btnHistoria.textContent = state.historiaVista ? '🎣 CONTINUAR HISTORIA' : '🎣 COMENZAR HISTORIA';
document.querySelectorAll('.btn-reset').forEach(btn => btn.onclick = resetGame);
document.querySelectorAll('.btn-download-save').forEach(btn => btn.onclick = descargarPartida);
document.querySelectorAll('.input-load-save').forEach(input => input.onchange = e => {
  if (e.target.files[0]) cargarPartidaDesdeArchivo(e.target.files[0]);
  e.target.value = '';
});
if (!STORAGE_OK) {
  const warn = document.createElement('div');
  warn.className = 'storage-warning';
  warn.innerHTML = '⚠️ Este navegador no deja guardar el progreso automáticamente. Usa <b>💾 Descargar partida</b> antes de cerrar, y <b>📂 Cargar partida</b> la próxima vez.';
  document.body.appendChild(warn);
}
renderShop();
renderMap();
