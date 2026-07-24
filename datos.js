// Valores base compartidos (equipo, no cambian por isla)
// --- Tienda: cada categoría tiene varios niveles. Comprar un nivel más alto
// reemplaza al anterior (no hay que comprarlos todos en orden, pero cuesta
// el precio completo de ese nivel).
// NERF: precios subidos y capacidades reducidas para que el equipo también
// cueste esfuerzo real, no un trámite de un par de viajes.
//
// EFECTOS REALES DE LA CAÑA (rol: aguante y perdón del pulso, no de puntería):
//   fallo     -> se resta directo a la penalización de paciencia cuando fallas un clic.
//   paciencia -> bonus extra de paciencia cada vez que sacas un pez.
//   aguante   -> % que reduce el drenaje pasivo de paciencia (el "tic" de cada isla).
//                Una caña con buen aguante te deja quedarte más tiempo en el agua
//                aunque no estés pescando perfecto.
const EQUIPO_CANAS = [{
  nombre: "Vara de Guadua",
  desc: "La que trajiste de tu casa. Ni perdona fallos ni te da calma extra: pura muñeca tuya.",
  costo: 0,
  fallo: 0,
  paciencia: 0,
  aguante: 0
}, {
  nombre: "Caña de Fibra de Vidrio",
  desc: "Flexible de verdad: absorbe el tirón cuando fallas, te regala un respiro al sacar cada pez y aguanta un poco más de tiempo con el brazo firme antes de que la paciencia se te vaya al piso.",
  costo: 260,
  fallo: 1,
  paciencia: .4,
  aguante: .12
}, {
  nombre: "Caña de Grafito Importada",
  desc: "Liviana y sensible: los fallos casi no duelen, cada captura te calma bastante más, y el material aguanta jornadas largas sin que se te agote la paciencia tan rápido.",
  costo: 850,
  fallo: 2,
  paciencia: .9,
  aguante: .25
}, {
  nombre: "Caña Profesional del Llano",
  desc: "La que usan los que ganan los torneos de Yopal: perdona los fallos como si nada, cada pez que sacas te da un subidón de calma enorme, y el aguante es tal que la paciencia casi no se drena sola mientras esperas el próximo pique.",
  costo: 1950,
  fallo: 3.2,
  paciencia: 1.6,
  aguante: .4
}];

// EFECTOS REALES DEL CEBO (rol: puntería y suerte, no de aguante):
//   mult   -> agranda el área real de enganche del pez (más fácil hacerle clic).
//   suerte -> % de probabilidad que le "roba" a la mutación Normal y reparte entre
//             las mutaciones raras, en proporción a su rareza. Con buena carnada
//             no solo pescas más fácil: lo que sacas también vale más.
const EQUIPO_CEBOS = [{
  nombre: "Anzuelo Pelado",
  desc: "Sin carnada. El área de enganche es la del anzuelo solo, y lo que caiga cae por pura suerte de la naturaleza.",
  costo: 0,
  mult: 1,
  suerte: 0
}, {
  nombre: "Lombriz de Tierra",
  desc: "Agranda un poco el área de enganche y, de paso, atrae con algo más de frecuencia a los ejemplares fuera de lo común.",
  costo: 40,
  mult: 1.15,
  suerte: .03
}, {
  nombre: "Camarón de Caño",
  desc: "Los peces se acercan más rápido y con más ganas: área de enganche notablemente más grande, y ya empieza a notarse que cae más seguido algo grande o brillante.",
  costo: 145,
  mult: 1.28,
  suerte: .07
}, {
  nombre: "Carnada Secreta del Abuelo",
  desc: "Nadie sabe qué lleva. Funciona sospechosamente bien: el área de enganche es enorme y parece llamar justo a los peces más raros, grandes y valiosos del agua.",
  costo: 330,
  mult: 1.45,
  suerte: .14
}];

const EQUIPO_MOCHILAS = [{
  nombre: "Mochila de Fique",
  desc: "La de siempre. 34 kg de capacidad.",
  costo: 0,
  cap: 0
}, {
  nombre: "Mochila Reforzada",
  desc: "+14 kg de capacidad extra.",
  costo: 300,
  cap: 14
}, {
  nombre: "Alforja de Cuero Llanero",
  desc: "+36 kg de capacidad extra.",
  costo: 950,
  cap: 36
}, {
  nombre: "Cava Isotérmica del Río",
  desc: "+68 kg de capacidad extra, y mantiene el pescado fresco.",
  costo: 2200,
  cap: 68
}];

// NERF 2: capacidad base bajada otra vez, de 40kg a 34kg. Con el equipo tope
// llegas a 102kg (antes 125kg), así que la mochila sigue siendo el techo real
// del juego, no un detalle cosmético.
const DIFICULTAD = {
  pesoMaximoMochila: 34
};

// Mutaciones: entre más rara, más multiplica el precio de venta del pez.
// NERF 2: las mutaciones buenas ahora son bastante más difíciles de sacar
// (más peso en "Normal", menos en todo lo demás) y se agregó el 🏆 Pez de
// Oro: rarísimo, con un filtro dorado real sobre la foto del pez (se ve en
// la mochila) y paga el doble de lo que vale el pez base.
//
// "color"  -> color sólido válido para el canvas (etiqueta "+Pez" al atrapar).
// "tagBg"  -> opcional, gradiente CSS solo para el fondo de la etiqueta en la
//             mochila (HTML normal, ahí sí acepta gradientes).
// "filtro" -> opcional, filtro CSS real (sepia/saturate/hue-rotate/etc.) que se
//             aplica a la FOTO del pez en la mochila, para que se vea dorado,
//             fantasmal o cósmico de verdad y no solo de nombre.
// "especial" -> opcional, si es true el festejo al atraparlo es más grande
//               (más partículas, brillo alrededor de la miniatura, nombre de
//               la mutación flotando en pantalla).
const MUTACIONES_WIP = [{
  id: "normal",
  nombre: "Normal",
  prob: .684,
  mult: 1,
  color: "#b0bec5"
}, {
  id: "grande",
  nombre: "Grandote",
  prob: .14,
  mult: 1.6,
  color: "#4caf50"
}, {
  id: "brillante",
  nombre: "Brillante",
  prob: .07,
  mult: 2.2,
  color: "#ffd54f"
}, {
  id: "albino",
  nombre: "Albino",
  prob: .035,
  mult: 3,
  color: "#eceff1"
}, {
  id: "fantasma",
  nombre: "👻 Fantasma del Caño",
  prob: .025,
  mult: 3.6,
  color: "#dff9fb",
  filtro: "grayscale(.3) brightness(1.3) opacity(.7)"
}, {
  id: "legendario",
  nombre: "★ Legendario",
  prob: .015,
  mult: 5,
  color: "#ffb300"
}, {
  id: "oro",
  nombre: "🏆 Pez de Oro",
  prob: .010,
  mult: 2,
  color: "#ffd700",
  filtro: "sepia(1) saturate(6) hue-rotate(-15deg) brightness(1.2) contrast(1.05)",
  especial: true
}, {
  id: "arcoiris",
  nombre: "🌈 Dorado Arcoíris",
  prob: .02,
  mult: 8,
  color: "#ff9f43",
  tagBg: "linear-gradient(90deg,#ff5252,#ffb300,#ffee58,#66bb6a,#42a5f5,#ab47bc)",
  arcoiris: true,
  especial: true
}, {
  id: "cosmico",
  nombre: "☄️ Pez Cósmico",
  prob: .001,
  mult: 15,
  color: "#c77dff",
  tagBg: "linear-gradient(135deg,#1a0033,#4b0082,#8e2de2,#fbc2eb)",
  filtro: "saturate(2.5) hue-rotate(230deg) brightness(1.1) contrast(1.2)",
  especial: true
}, ];

// Cada isla representa un cuerpo de agua real del departamento de Casanare
// (Llanos Orientales, Colombia). La dificultad sube isla a isla: los peces
// nadan más rápido y erráticos, la paciencia se agota antes, fallar cuesta
// más caro y el viaje da menos tiempo.
// NERF 2 (más difícil): velocidad, erraticidad, drenaje de paciencia y castigo
// por fallo subidos otra vez en las 5 islas; el bonus de paciencia al atrapar
// bajó; el tiempo de viaje se acortó más; y los costos de desbloqueo subieron
// bastante para que cada isla siga siendo un reto real de varios viajes.
const DATA_ISLAS = [{
  id: 1,
  nombre: "Ciénaga del Tinije",
  desc: true,
  costo: 0,
  fondo: "#1a6b8a",
  multVenta: 1,
  minas: 1,
  dificultad: {
    multiplicadorVelocidad: 1.30,
    erratico: 0.50,
    tickPaciencia: 1300,
    decaimientoPaciencia: 2.4,
    penalizacionFallo: 10,
    bonusAtrapar: 2.6,
    tiempoLimiteViaje: 78
  },
  peces: [{
    n: "Bota Vieja",
    img: "fotos/botarota.png",
    valor: 1,
    vel: 1,
    tam: 21,
    peso: 1,
    color: "#8d6e63",
    prob: .32
  }, {
    n: "Bocachico",
    img: "fotos/pescadonormal.png",
    valor: 2,
    vel: 2.2,
    tam: 20,
    peso: 2,
    color: "#64b5f6",
    prob: .40
  }, {
    n: "Caribe",
    img: "fotos/pezquedamiedo.png",
    valor: 4,
    vel: 3.2,
    tam: 22,
    peso: 3,
    color: "#ef5350",
    prob: .21
  }, {
    n: "Bagre Valentón",
    img: "fotos/tiburonballena.png",
    valor: 11,
    vel: 1.1,
    tam: 36,
    peso: 12,
    color: "#5c6bc0",
    prob: .07
  }, ]
}, {
  id: 2,
  nombre: "Río Cravo Sur",
  desc: false,
  costo: 600,
  fondo: "#0d4f6e",
  multVenta: .90,
  minas: 2,
  dificultad: {
    multiplicadorVelocidad: 1.65,
    erratico: 0.64,
    tickPaciencia: 1150,
    decaimientoPaciencia: 3.0,
    penalizacionFallo: 12,
    bonusAtrapar: 2.2,
    tiempoLimiteViaje: 68
  },
  peces: [{
    n: "Mojarra Amarilla",
    img: "fotos/mojarra_amarilla.png",
    valor: 3,
    vel: 3,
    tam: 15,
    peso: 1.5,
    color: "#6ab04c",
    prob: .34
  }, {
    n: "Yamú",
    img: "fotos/yamu.png",
    valor: 5,
    vel: 4,
    tam: 22,
    peso: 3,
    color: "#22a6b3",
    prob: .29
  }, {
    n: "Curito",
    img: "fotos/curito.png",
    valor: 7,
    vel: 1.4,
    tam: 26,
    peso: 4,
    color: "#78e08f",
    prob: .20
  }, {
    n: "Blanquillo",
    img: "fotos/blanquillo.png",
    valor: 13,
    vel: 2.4,
    tam: 30,
    peso: 7,
    color: "#535c68",
    prob: .12
  }, {
    n: "Nicuro",
    img: "fotos/nicuro.png",
    valor: 19,
    vel: 1.8,
    tam: 26,
    peso: 5,
    color: "#8e44ad",
    prob: .05
  }, ]
}, {
  id: 3,
  nombre: "Río Pauto",
  desc: false,
  costo: 1600,
  fondo: "#0a1a2e",
  multVenta: .78,
  minas: 3,
  dificultad: {
    multiplicadorVelocidad: 2.05,
    erratico: 0.78,
    tickPaciencia: 1000,
    decaimientoPaciencia: 3.6,
    penalizacionFallo: 14,
    bonusAtrapar: 1.8,
    tiempoLimiteViaje: 60
  },
  peces: [{
    n: "Sardinata",
    img: "fotos/sardinata.png",
    valor: 5,
    vel: 3.4,
    tam: 16,
    peso: 1.5,
    color: "#fdcb6e",
    prob: .30
  }, {
    n: "Picuda",
    img: "fotos/picuda.png",
    valor: 9,
    vel: 4.4,
    tam: 26,
    peso: 4,
    color: "#74b9ff",
    prob: .27
  }, {
    n: "Cachama Negra",
    img: "fotos/cachama_negra.png",
    valor: 13,
    vel: 1.6,
    tam: 24,
    peso: 5,
    color: "#fd79a8",
    prob: .22
  }, {
    n: "Bagre Amarillo",
    img: "fotos/bagre_amarillo.png",
    valor: 22,
    vel: 3.2,
    tam: 33,
    peso: 13,
    color: "#636e72",
    prob: .14
  }, {
    n: "Dorado del Pauto",
    img: "fotos/dorado_pauto.png",
    valor: 36,
    vel: 5.2,
    tam: 35,
    peso: 16,
    color: "#a29bfe",
    prob: .07
  }, ]
}, {
  id: 4,
  nombre: "Río Meta",
  desc: false,
  costo: 3800,
  fondo: "#1c0a00",
  multVenta: .65,
  minas: 4,
  dificultad: {
    multiplicadorVelocidad: 2.45,
    erratico: 0.9,
    tickPaciencia: 900,
    decaimientoPaciencia: 4.2,
    penalizacionFallo: 16,
    bonusAtrapar: 1.5,
    tiempoLimiteViaje: 52
  },
  peces: [{
    n: "Raya de Río",
    img: "fotos/raya_rio.png",
    valor: 8,
    vel: 3.2,
    tam: 28,
    peso: 5,
    color: "#2d3436",
    prob: .29
  }, {
    n: "Bagre Bocón",
    img: "fotos/bagre_bocon.png",
    valor: 13,
    vel: 2.1,
    tam: 22,
    peso: 4,
    color: "#e17055",
    prob: .26
  }, {
    n: "Tucunaré",
    img: "fotos/tucunare.png",
    valor: 23,
    vel: 3.4,
    tam: 32,
    peso: 10,
    color: "#00b894",
    prob: .24
  }, {
    n: "Dorado del Meta",
    img: "fotos/dorado_meta.png",
    valor: 40,
    vel: 1.7,
    tam: 27,
    peso: 7,
    color: "#ffeaa7",
    prob: .14
  }, {
    n: "Valentón Gigante",
    img: "fotos/valenton_gigante.png",
    valor: 72,
    vel: 1.1,
    tam: 45,
    peso: 26,
    color: "#6c5ce7",
    prob: .07
  }, ]
}, {
  id: 5,
  nombre: "Bocas del Casanare",
  desc: false,
  costo: 8000,
  fondo: "#050c14",
  multVenta: .52,
  minas: 5,
  dificultad: {
    multiplicadorVelocidad: 2.9,
    erratico: 1.05,
    tickPaciencia: 800,
    decaimientoPaciencia: 5.0,
    penalizacionFallo: 19,
    bonusAtrapar: 1.2,
    tiempoLimiteViaje: 45
  },
  peces: [{
    n: "Sábalo",
    img: "fotos/sabalo.png",
    valor: 12,
    vel: 3.6,
    tam: 20,
    peso: 3,
    color: "#81ecec",
    prob: .30
  }, {
    n: "Bagre Piraíba",
    img: "fotos/bagre_piraiba.png",
    valor: 28,
    vel: 2.6,
    tam: 35,
    peso: 15,
    color: "#4b4b6a",
    prob: .27
  }, {
    n: "Raya Guacamaya",
    img: "fotos/raya_guacamaya.png",
    valor: 45,
    vel: 2,
    tam: 30,
    peso: 9,
    color: "#e84393",
    prob: .22
  }, {
    n: "Payara Gigante",
    img: "fotos/payara_gigante.png",
    valor: 72,
    vel: 5.6,
    tam: 33,
    peso: 12,
    color: "#dfe6e9",
    prob: .14
  }, {
    n: "Pirarucú",
    img: "fotos/pirarucu.png",
    valor: 132,
    vel: 1,
    tam: 53,
    peso: 32,
    color: "#0984e3",
    prob: .07
  }, ]
}];
