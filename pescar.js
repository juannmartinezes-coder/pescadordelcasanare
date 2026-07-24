const $ = id => document.getElementById(id);
const svg = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rand = n => Math.random() * n;
// La mayoría de fotos de peces vienen dibujadas mirando hacia la IZQUIERDA por
// defecto. Si alguna imagen tuya mira hacia la derecha, agrégale la propiedad
// mirar: "derecha" a ese pez en datos.js y esta función lo compensa solita.
const artMiraIzquierda = type => type.mirar !== 'derecha';
const pickWeighted = (items, roll = Math.random()) => {
  let acc = 0;
  for (const item of items) {
    acc += item.prob;
    if (roll <= acc) return item;
  }
  return items.at(-1);
};

// La "suerte" del cebo le quita probabilidad a la mutación Normal y se la
// reparte a las mutaciones raras en proporción a su rareza original, así que
// una mejor carnada de verdad saca peces más grandes/valiosos con más frecuencia.
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
  backpack: []
};

// Dificultad efectiva: mezcla el equipo (fijo) con los parámetros propios
// de la isla en la que se está pescando.
const curDif = () => ({ ...DIFICULTAD, ...(game.island ? game.island.dificultad : {}) });
const equipoActual = () => ({
  cana: EQUIPO_CANAS[state.canaNivel] || EQUIPO_CANAS[0],
  cebo: EQUIPO_CEBOS[state.ceboNivel] || EQUIPO_CEBOS[0],
  mochila: EQUIPO_MOCHILAS[state.mochilaNivel] || EQUIPO_MOCHILAS[0]
});
const mochilaMax = () => DIFICULTAD.pesoMaximoMochila + equipoActual().mochila.cap;

// --- Ambiente sonoro del llano: agua corriendo + chicharras, generado con Web Audio ---
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
  // LFO lento que hace "respirar" el filtro para que el río no suene plano
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

// Segunda voz del monte (ave/rana grave) para variar el paisaje sonoro,
// que no sea siempre el mismo chirrido de chicharra.
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

// Chapoteo corto: se usa al atrapar un pez (alegre) y al fallar (seco/apagado).
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

// --- Progreso guardado en el navegador (localStorage) ---
const SAVE_KEY = 'pescador_casanare_save_v1';

// Algunos navegadores (sobre todo al abrir el juego con doble clic como
// archivo local, o en modo privado) bloquean localStorage sin avisar.
// Se comprueba una sola vez al arrancar para saber si toca avisarle al jugador.
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
    backpack: state.backpack
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
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada que borrar */ }
  location.reload();
}

// Respaldo 100% confiable que no depende del navegador: descarga la partida
// como archivo .json y la puede volver a cargar cuando quiera, en cualquier
// computador o navegador.
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
  modals: {
    shop: $('shop-modal'),
    encyclopedia: $('encyclopedia-modal'),
    backpack: $('backpack-modal'),
    tutorial: $('tutorial-modal')
  }
};

const MAP_SHAPES = {
  1: { cx: 150, cy: 105, color: '#9ccc4f', decor: 'palmera', path: 'M 55,95 C 35,70 38,35 75,18 C 105,4 145,2 175,15 C 205,28 235,45 230,80 C 226,108 210,135 175,145 C 145,154 110,150 80,138 C 58,129 62,112 55,95 Z' },
  2: { cx: 430, cy: 145, color: '#aed581', decor: 'coral', path: 'M 372,140 C 368,115 382,95 408,90 C 430,86 455,92 472,108 C 488,123 498,140 488,158 C 478,175 455,185 428,182 C 405,180 385,172 376,158 C 370,150 374,148 372,140 Z' },
  3: { cx: 250, cy: 315, color: '#8bc34a', decor: 'roca', path: 'M 176,316 C 162,284 174,250 212,236 C 248,223 304,225 338,248 C 366,267 374,304 356,332 C 338,360 296,382 248,380 C 210,378 182,356 176,316 Z' },
  4: { cx: 590, cy: 315, color: '#7cb342', decor: 'volcan', path: 'M 515,312 C 502,282 516,246 548,230 C 584,212 638,220 668,244 C 696,267 704,306 690,334 C 674,365 634,387 586,388 C 548,388 524,360 515,312 Z' },
  5: { cx: 685, cy: 105, color: '#bdbdbd', decor: 'junco', path: 'M 626,105 C 620,84 628,58 650,46 C 676,31 712,34 734,48 C 756,62 764,90 756,112 C 748,132 726,148 698,151 C 668,154 636,136 626,105 Z' }
};

const DECOR = {
  palmera: (x, y) => `<rect x="${x - 3}" y="${y - 4}" width="6" height="28" rx="3" fill="#8d6e63"/><path d="M ${x},${y - 6} C ${x - 22},${y - 28} ${x - 34},${y - 16} ${x - 10},${y - 2}" fill="none" stroke="#2ecc71" stroke-width="5" stroke-linecap="round"/><path d="M ${x},${y - 8} C ${x + 22},${y - 28} ${x + 34},${y - 16} ${x + 10},${y - 2}" fill="none" stroke="#27ae60" stroke-width="5" stroke-linecap="round"/><path d="M ${x},${y - 10} C ${x - 6},${y - 34} ${x + 6},${y - 34} ${x},${y - 8}" fill="none" stroke="#58d68d" stroke-width="5" stroke-linecap="round"/>`,
  coral: (x, y) => `<path d="M ${x - 14},${y + 16} Q ${x - 18},${y - 4} ${x - 12},${y - 18}" stroke="#ff7675" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x - 12},${y - 6} Q ${x - 24},${y - 10} ${x - 28},${y - 20}" stroke="#ff7675" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M ${x + 6},${y + 16} Q ${x + 4},${y - 2} ${x + 12},${y - 20}" stroke="#fd79a8" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x + 24},${y - 6} Q ${x + 32},${y - 10} ${x + 34},${y - 18}" stroke="#e84393" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${x - 18}" cy="${y + 14}" r="5" fill="#ff7675"/><circle cx="${x - 10}" cy="${y + 10}" r="3.5" fill="#fd79a8"/>`,
  roca: (x, y) => `<path d="M ${x - 16},${y + 14} Q ${x - 20},${y - 6} ${x - 4},${y - 12} Q ${x + 14},${y - 16} ${x + 16},${y} Q ${x + 18},${y + 12} ${x},${y + 14} Z" fill="#9e9e9e" stroke="#616161" stroke-width="2.5" stroke-linejoin="round"/><path d="M ${x - 8},${y - 2} Q ${x},${y - 6} ${x + 8},${y - 2}" stroke="#757575" stroke-width="1.5" fill="none"/>`,
  volcan: (x, y) => `<path d="M ${x - 26},${y + 20} L ${x - 6},${y - 26} L ${x + 6},${y - 26} L ${x + 26},${y + 20} Z" fill="#6d4c41" stroke="#4e342e" stroke-width="2.5" stroke-linejoin="round"/><path d="M ${x - 6},${y - 26} Q ${x},${y - 32} ${x + 6},${y - 26}" fill="#3e2723" stroke="#4e342e" stroke-width="2"/><path d="M ${x - 2},${y - 30} Q ${x + 4},${y - 40} ${x - 1},${y - 48}" stroke="#e74c3c" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/><path d="M ${x + 1},${y - 32} Q ${x + 8},${y - 42} ${x + 3},${y - 50}" stroke="#bdbdbd" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>`,
  junco: (x, y) => `<path d="M ${x - 16},${y + 16} Q ${x - 22},${y - 14} ${x - 14},${y - 36}" stroke="#6ab04c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x - 6},${y + 16} Q ${x - 8},${y - 20} ${x - 2},${y - 44}" stroke="#82c46c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x + 4},${y + 16} Q ${x + 2},${y - 18} ${x + 8},${y - 40}" stroke="#6ab04c" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${x + 14},${y + 16} Q ${x + 18},${y - 12} ${x + 16},${y - 32}" stroke="#82c46c" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="${x - 14}" cy="${y - 38}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x - 2}" cy="${y - 46}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x + 8}" cy="${y - 42}" rx="2.5" ry="6" fill="#8d6e30"/><ellipse cx="${x + 16}" cy="${y - 34}" rx="2.5" ry="6" fill="#8d6e30"/>`
};

const game = {
  ctx: ui.canvas.getContext('2d'),
  island: null,
  fishes: [], particles: [], bubbles: [], labels: [],
  mouseX: 400, mouseY: 240, cursorX: 400,
  animId: null, patienceTimer: null, tripTimer: null, timeLeft: 0,
  images: {}
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
  if (typeof renderShop === 'function') renderShop();
  saveGame();
}

function setPatience(delta = 0) {
  state.patience = clamp(state.patience + delta, 0, 100);
  ui.patienceBar.style.width = `${state.patience}%`;
  ui.patienceBar.style.background = state.patience > 60 ? '#27ae60' : state.patience > 30 ? '#f39c12' : '#e74c3c';
  if (state.patience) return;
  endTrip('😤 ¡Perdiste la paciencia!\nVuelves al puerto con lo que llevas en la mochila.');
}

function sellFish(index) {
  state.money += fishPrice(state.backpack[index]);
  state.backpack.splice(index, 1);
  renderBackpack();
  renderMap();
}

function sellAll() {
  if (!state.backpack.length) return;
  state.money += backpackValue();
  state.backpack = [];
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

  const waves = svg('g');
  waves.setAttribute('opacity', '.18');
  for (let row = 0; row < 6; row++) {
    const y = 30 + row * 70 + (row % 2 ? 20 : 0);
    const wave = svg('path');
    let d = `M -20,${y}`;
    for (let x = 0; x <= 820; x += 40) d += ` Q ${x + 20},${y + (x / 40 % 2 ? -10 : 10)} ${x + 40},${y}`;
    Object.entries({ d, stroke: '#fff', 'stroke-width': '2', fill: 'none' }).forEach(([k, v]) => wave.setAttribute(k, v));
    waves.appendChild(wave);
  }
  ui.map.appendChild(waves);

  [[280, 60, 1], [555, 210, -1], [100, 250, 1], [740, 200, -1], [470, 380, 1], [600, 340, -1]].forEach(([x, y, dir]) => {
    const fish = svg('g');
    fish.setAttribute('transform', `translate(${x},${y}) scale(${dir * .9},.9)`);
    fish.setAttribute('opacity', '.5');
    fish.innerHTML = '<ellipse cx="0" cy="0" rx="9" ry="5" fill="#a8d8ea"/><path d="M -9,0 L -15,-5 L -15,5 Z" fill="#a8d8ea"/>';
    ui.map.appendChild(fish);
  });

  // Ruta punteada que conecta las islas en orden, para que el mar entre ellas
  // no se vea vacío y se entienda de un vistazo el camino de progresión.
  const route = svg('g');
  route.setAttribute('opacity', '.5');
  for (let i = 0; i < DATA_ISLAS.length - 1; i++) {
    const a = MAP_SHAPES[DATA_ISLAS[i].id], b = MAP_SHAPES[DATA_ISLAS[i + 1].id];
    if (!a || !b) continue;
    const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2 - 34;
    const path = svg('path');
    path.setAttribute('d', `M ${a.cx},${a.cy} Q ${mx},${my} ${b.cx},${b.cy}`);
    Object.entries({ stroke: '#eafaf0', 'stroke-width': '3', 'stroke-dasharray': '2 11', 'stroke-linecap': 'round', fill: 'none' }).forEach(([k, v]) => path.setAttribute(k, v));
    route.appendChild(path);
  }
  ui.map.appendChild(route);

  DATA_ISLAS.forEach((island, idx) => {
    const shape = MAP_SHAPES[island.id];
    if (!shape) return;
    const locked = !island.desc;
    const group = svg('g');
    group.setAttribute('class', `island-group ${locked ? 'locked' : ''}`);
    group.innerHTML = `
      <ellipse cx="${shape.cx}" cy="${shape.cy + 38}" rx="70" ry="12" fill="rgba(0,0,0,.25)"/>
      <path class="island-shape" d="${shape.path}" fill="${shape.color}" stroke="#33691e" stroke-width="3" stroke-linejoin="round"/>
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
      if (island.desc) return startTrip(island.id);
      if (state.money < island.costo) return tooltip('<b style="color:#e74c3c">¡No tienes suficiente dinero!</b>', ui.mapWrap.getBoundingClientRect().left + shape.cx, ui.mapWrap.getBoundingClientRect().top + shape.cy, true);
      state.money -= island.costo;
      island.desc = true;
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
      wrapper.insertAdjacentHTML('beforeend', `
        <div class="fish-entry ${locked ? 'locked' : ''}">
          <div class="fish-entry-thumb" style="background:${locked ? 'rgba(255,255,255,.05)' : `${fish.color}33`}">${fishThumb(fish, locked)}</div>
          <div class="fish-entry-info">${locked ? `<h4>???</h4><p>Desbloquea ${island.nombre} para descubrirlo</p>` : `<h4>${fish.n}</h4><p>Velocidad ${fish.vel.toFixed(1)} · Probabilidad ${(fish.prob * 100).toFixed(0)}%</p>`}</div>
          <div class="fish-entry-value">${locked ? '—' : `$${fish.valor}`}</div>
        </div>
      `);
    });
    list.appendChild(wrapper);
  });
}

function startTrip(id) {
  game.island = DATA_ISLAS.find(i => i.id === id);
  state.island = game.island;
  state.patience = 100;
  game.timeLeft = curDif().tiempoLimiteViaje;
  ui.islandName.textContent = game.island.nombre;
  ui.timer.textContent = `⏱️ ${game.timeLeft}s`;
  ui.timer.classList.remove('timer-urgente');
  updateHUD();
  setPatience();
  setScreen('fishing-screen');
  startPatienceDrain();
  startTripTimer();
  initFishingScene();
}

function endTrip(message = '') {
  cancelAnimationFrame(game.animId);
  clearInterval(game.patienceTimer);
  clearInterval(game.tripTimer);
  game.animId = game.island = null;
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
  // El "aguante" de la caña reduce el drenaje pasivo de paciencia en cada tic.
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

// Los peces se dibujan en tamaño de píxel fijo (type.tam). Si el canvas
// cambia de resolución, hay que escalar ese tamaño para que no se vean
// diminutos frente a un lienzo más grande. El *1.5 además los agranda
// bastante para que sean más fáciles de ver y de atrapar.
const TAM_ESCALA = () => (ui.canvas.width / 800) * 1.5;
// La velocidad también está en píxeles fijos: si no se escala igual que la
// resolución del canvas, un canvas más grande hace que el pez se vea/sienta
// más lento (recorre menos pantalla por segundo en proporción).
const RES_ESCALA = () => ui.canvas.width / 800;

function createFish(type) {
  const leftToRight = Math.random() < .5;
  const scale = .85 + rand(.3);
  const esc = TAM_ESCALA();
  const size = type.tam * scale * esc;
  // El cebo agranda el área de enganche según su nivel comprado.
  const cebo = equipoActual().cebo.mult;
  return {
    type, dir: leftToRight ? 1 : -1, scale,
    x: leftToRight ? -type.tam * esc : ui.canvas.width + type.tam * esc,
    y: 80 + rand(ui.canvas.height - 120),
    vel: type.vel * (.8 + rand(.4)) * curDif().multiplicadorVelocidad * RES_ESCALA(),
    oscY: rand(Math.PI * 2), chaos: rand(Math.PI * 2), chaosVel: .06 + rand(.08), caught: false,
    hitW: (type.img ? size * 2.4 : size * 2.2) * .72 * cebo,
    hitH: (type.img ? size * 1.6 : size) * .85 * cebo
  };
}

// --- MINAS NAVALES ---
// Cada isla trae más minas que la anterior (island.minas). Flotan meciéndose
// en un punto fijo del agua; si el jugador le hace clic por error, explota:
// pierde TODO lo que lleva cargado en la mochila en ese momento, más un
// buen golpe de paciencia. Tras estallar, esa mina desaparece y al rato
// aparece una nueva en otro punto para que la amenaza no se acabe nunca.
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
    const p = 1 - ex.life / ex.maxLife; // 0 -> 1 a lo largo de la vida
    // Destello blanco/anaranjado que se apaga rápido
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
    // Onda expansiva: un anillo que crece y se desvanece
    const radio = 10 + p * 150;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.strokeStyle = '#ffccbc';
    ctx.lineWidth = 6 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, radio, 0, 7); ctx.stroke();
    ctx.restore();
    // Anillo de humo, un poco más lento y detrás
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

// Estruendo grave y corto, con un "click" de percusión encima, para que la
// mina se sienta pesada al explotar (no solo un chapoteo más).
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
  for (let i = game.fishes.length - 1; i >= 0; i--) {
    const fish = game.fishes[i];
    if (!fish.caught && ((x - fish.x) ** 2 / fish.hitW ** 2 + (y - fish.y) ** 2 / fish.hitH ** 2) <= 1) return catchFish(fish, i);
  }
  setPatience(-Math.max(2, curDif().penalizacionFallo - equipoActual().cana.fallo));
  addLabel('¡Fallaste!', x, y, '#e74c3c');
  splash(false);
}

function catchFish(fish, index) {
  const sizeMult = .7 + rand(.7);
  const weight = fish.type.peso * sizeMult;
  const mutation = pickMutation(equipoActual().cebo.suerte || 0);
  if (currentWeight() + weight > mochilaMax()) return addLabel('¡Mochila llena!', fish.x, fish.y, '#e74c3c'), setPatience(-3);

  fish.caught = true;
  state.backpack.push({ n: fish.type.n, value: fish.type.valor, img: fish.type.img, emoji: fish.type.emoji, color: fish.type.color, islandId: game.island.id, sizeMult, weight, mutation });
  updateHUD();
  setPatience(curDif().bonusAtrapar + equipoActual().cana.paciencia);
  // Las mutaciones "especiales" (oro, arcoíris, cósmico) tienen un festejo más
  // grande: más partículas y del color propio de la mutación, más el nombre
  // de la mutación flotando aparte para que se note que cayó algo raro.
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

  const top = lighten(game.island.fondo, 30);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, top); bg.addColorStop(1, game.island.fondo);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.moveTo(0, 48);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, 48 + Math.sin(x / 40 + t * 2) * 5);
  ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.fill();

  game.bubbles.forEach(b => { b.y -= b.vel; if (b.y < -10) b.y = h + 10; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.strokeStyle = `rgba(255,255,255,${b.alpha})`; ctx.stroke(); });
  drawFisher(t, h);
  drawCrosshair();
  updateFishes(w);
  updateMinas(t);
  updateExplosions();
  updateParticles();
  updateLabels();
  ctx.restore();
}

function updateFishes(w) {
  const erratico = curDif().erratico;
  // Los peces huyen del cursor cuando se acerca demasiado: entre más difícil
  // la isla, más lejos lo detectan y más fuerte se alejan. Esto obliga a
  // anticipar el clic en vez de perseguir al pez con el mouse encima.
  const evasionRadio = 65 + erratico * 55;
  const evasionFuerza = 1.8 + erratico * 3.2;
  game.fishes.forEach(fish => {
    if (fish.caught) return;
    fish.oscY += .04;
    fish.chaos += fish.chaosVel;
    fish.x += fish.vel * fish.dir * (1 + Math.sin(fish.chaos) * erratico);
    // vy es la velocidad vertical real de este instante (derivada del seno de oscY):
    // usarla para inclinar y "respirar" el cuerpo hace que el nado se vea fluido
    // en vez de una imagen que solo se traslada en línea recta.
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
  // Si el arte mira a la izquierda por naturaleza, hay que voltearlo cuando
  // el pez nada hacia la derecha (y viceversa) para que la cara siempre
  // apunte hacia donde se está moviendo de verdad.
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

$('btn-play').onclick = () => { initAudio(); setScreen('map-screen'); renderMap(); };
$('btn-tutorial').onclick = () => toggleModal('tutorial', true);
$('btn-close-tutorial').onclick = () => toggleModal('tutorial', false);
document.querySelectorAll('.btn-sound').forEach(btn => btn.onclick = toggleMute);
$('btn-open-shop').onclick = () => toggleModal('shop', true);
$('btn-close-shop').onclick = () => toggleModal('shop', false);
$('btn-open-encyclopedia').onclick = () => { renderEncyclopedia(); toggleModal('encyclopedia', true); };
$('btn-close-encyclopedia').onclick = () => toggleModal('encyclopedia', false);
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
  updateHUD();
  renderShop();
}

// Traduce las propiedades crudas de cada ítem a una línea de stats legible,
// para que los efectos de caña/cebo/mochila se vean tan "verdaderos" como
// lo son en el código, y no se queden solo en la descripción de sabor.
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
