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

const DIFICULTAD = {
  pesoMaximoMochila: 34
};

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

const DATA_ISLAS = [{
  id: 1,
  nombre: "Ciénaga del Tinije",
  desc: true,
  costo: 0,
  fondo: "#1a6b8a",
  fotoFondo: "fotos/fondo_rio_selva.jpg",
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
    prob: .32,
    dato: "No es un pez: es lo más común que sale cuando el anzuelo va sin carnada de verdad. Todo pescador de caño se ha llevado esta sorpresa alguna vez."
  }, {
    n: "Bocachico",
    img: "fotos/pescadonormal.png",
    valor: 2,
    vel: 2.2,
    tam: 20,
    peso: 2,
    color: "#64b5f6",
    prob: .40,
    dato: "Uno de los peces más importantes de los ríos colombianos: viaja en grandes cardúmenes durante la 'subienda' y raspa algas y materia orgánica del fondo con su boca en forma de ventosa."
  }, {
    n: "Caribe",
    img: "fotos/pezquedamiedo.png",
    valor: 4,
    vel: 3.2,
    tam: 22,
    peso: 3,
    color: "#ef5350",
    prob: .21,
    dato: "Pariente cercano de la piraña, con mandíbula corta y dientes triangulares muy afilados. Anda en cardumen y es bastante más precavido de lo que la fama le tiene."
  }, {
    n: "Bagre Valentón",
    img: "fotos/tiburonballena.png",
    valor: 11,
    vel: 1.1,
    tam: 36,
    peso: 12,
    color: "#5c6bc0",
    prob: .07,
    dato: "Uno de los bagres más grandes de los ríos suramericanos: puede pasar años migrando cientos de kilómetros entre el nacimiento y la desembocadura de la cuenca."
  }, ]
}, {
  id: 2,
  nombre: "Río Cravo Sur",
  desc: false,
  costo: 600,
  fondo: "#0d4f6e",
  fotoFondo: "fotos/fondo_rio_montanas.jpg",
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
    prob: .34,
    dato: "Pez pequeño y muy común en caños y ciénagas llaneras. Se mueve en grupos y suele ser de los primeros peces que aprende a reconocer un niño que pesca en el río."
  }, {
    n: "Yamú",
    img: "fotos/yamu.png",
    valor: 5,
    vel: 4,
    tam: 22,
    peso: 3,
    color: "#22a6b3",
    prob: .29,
    dato: "Pariente cercano del dorado, con dientes fuertes: es omnívoro y en época de creciente aprovecha para comer frutas y semillas caídas de los árboles de la orilla."
  }, {
    n: "Curito",
    img: "fotos/curito.png",
    valor: 7,
    vel: 1.4,
    tam: 26,
    peso: 4,
    color: "#78e08f",
    prob: .20,
    dato: "Bagre acorazado por placas óseas en la piel. Puede tomar aire directamente en la superficie y aguantar un buen rato fuera del agua si el caño se seca."
  }, {
    n: "Blanquillo",
    img: "fotos/blanquillo.png",
    valor: 13,
    vel: 2.4,
    tam: 30,
    peso: 7,
    color: "#535c68",
    prob: .12,
    dato: "Bagre de hocico alargado y aplanado, ideal para hurgar el fondo del río en busca de camarones y peces pequeños escondidos en el sedimento."
  }, {
    n: "Nicuro",
    img: "fotos/nicuro.png",
    valor: 19,
    vel: 1.8,
    tam: 26,
    peso: 5,
    color: "#8e44ad",
    prob: .05,
    dato: "Bagre pequeño con largas barbillas sensoriales y espinas en las aletas que pueden dar un pinchazo bastante doloroso si se agarra mal."
  }, ]
}, {
  id: 3,
  nombre: "Río Pauto",
  desc: false,
  costo: 1600,
  fondo: "#0a1a2e",
  fotoFondo: "fotos/fondo_rio_canoa.jpg",
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
    prob: .30,
    dato: "Pez plateado de cardumen, rápido y nervioso. Se mueve en grupos grandes cerca de la superficie, lo que lo hace presa fácil de peces más grandes."
  }, {
    n: "Picuda",
    img: "fotos/picuda.png",
    valor: 9,
    vel: 4.4,
    tam: 26,
    peso: 4,
    color: "#74b9ff",
    prob: .27,
    dato: "Depredador esbelto de dientes afilados que caza al acecho, dando arrancones cortos y veloces para sorprender a peces más pequeños."
  }, {
    n: "Cachama Negra",
    img: "fotos/cachama_negra.png",
    valor: 13,
    vel: 1.6,
    tam: 24,
    peso: 5,
    color: "#fd79a8",
    prob: .22,
    dato: "Pariente del temido caribe pero de dieta mucho más tranquila: come sobre todo frutas, semillas y nueces que caen al agua desde los árboles de la ribera."
  }, {
    n: "Bagre Amarillo",
    img: "fotos/bagre_amarillo.png",
    valor: 22,
    vel: 3.2,
    tam: 33,
    peso: 13,
    color: "#636e72",
    prob: .14,
    dato: "Bagre de piel lisa y sin escamas; se guía principalmente por el olfato y el tacto de sus barbillas para cazar de noche en aguas turbias."
  }, {
    n: "Dorado del Pauto",
    img: "fotos/dorado_pauto.png",
    valor: 36,
    vel: 5.2,
    tam: 35,
    peso: 16,
    color: "#a29bfe",
    prob: .07,
    dato: "Pez dorado muy peleador, famoso entre los pescadores deportivos por los saltos que da fuera del agua en cuanto siente el anzuelo."
  }, ]
}, {
  id: 4,
  nombre: "Río Meta",
  desc: false,
  costo: 3800,
  fondo: "#1c0a00",
  fotoFondo: "fotos/fondo_rio_selva.jpg",
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
    prob: .29,
    dato: "Raya de agua dulce que se entierra en la arena del fondo. Tiene un aguijón en la cola, así que en aguas bajas hay que caminar arrastrando los pies para no pisarla sin querer."
  }, {
    n: "Bagre Bocón",
    img: "fotos/bagre_bocon.png",
    valor: 13,
    vel: 2.1,
    tam: 22,
    peso: 4,
    color: "#e17055",
    prob: .26,
    dato: "Bagre de boca ancha, capaz de tragarse presas casi tan grandes como su propia cabeza."
  }, {
    n: "Tucunaré",
    img: "fotos/tucunare.png",
    valor: 23,
    vel: 3.4,
    tam: 32,
    peso: 10,
    color: "#00b894",
    prob: .24,
    dato: "También llamado pavón: un cíclido depredador con una mancha en la cola que imita un ojo, para confundir a sus presas sobre hacia dónde va a atacar."
  }, {
    n: "Dorado del Meta",
    img: "fotos/dorado_meta.png",
    valor: 40,
    vel: 1.7,
    tam: 27,
    peso: 7,
    color: "#ffeaa7",
    prob: .14,
    dato: "Variante del dorado que habita las aguas más rápidas del río Meta: entre más fuerte la corriente, más músculo y pelea tiene este pez."
  }, {
    n: "Valentón Gigante",
    img: "fotos/valenton_gigante.png",
    valor: 72,
    vel: 1.1,
    tam: 45,
    peso: 26,
    color: "#6c5ce7",
    prob: .07,
    dato: "La versión más grande y vieja del bagre valentón. Un ejemplar así de grande tarda muchísimos años en crecer y cada vez es más difícil de encontrar."
  }, ]
}, {
  id: 5,
  nombre: "Bocas del Casanare",
  desc: false,
  costo: 8000,
  fondo: "#050c14",
  fotoFondo: "fotos/fondo_rio_montanas.jpg",
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
    prob: .30,
    dato: "Pez migratorio que remonta el río contra la corriente para desovar, en un viaje que puede tomarle semanas enteras."
  }, {
    n: "Bagre Piraíba",
    img: "fotos/bagre_piraiba.png",
    valor: 28,
    vel: 2.6,
    tam: 35,
    peso: 15,
    color: "#4b4b6a",
    prob: .27,
    dato: "Uno de los bagres de agua dulce más grandes del mundo. Los ejemplares viejos pueden llegar a pesar tanto como una persona adulta."
  }, {
    n: "Raya Guacamaya",
    img: "fotos/raya_guacamaya.png",
    valor: 45,
    vel: 2,
    tam: 30,
    peso: 9,
    color: "#e84393",
    prob: .22,
    dato: "Raya de río con un patrón de manchas muy vistoso, parecido al plumaje de una guacamaya, que la hace fácil de reconocer entre las demás rayas."
  }, {
    n: "Payara Gigante",
    img: "fotos/payara_gigante.png",
    valor: 72,
    vel: 5.6,
    tam: 33,
    peso: 12,
    color: "#dfe6e9",
    prob: .14,
    dato: "Conocida como 'pez vampiro' por dos colmillos enormes en la mandíbula inferior, tan largos que atraviesan una vaina especial del hocico al cerrar la boca."
  }, {
    n: "Pirarucú",
    img: "fotos/pirarucu.png",
    valor: 132,
    vel: 1,
    tam: 53,
    peso: 32,
    color: "#0984e3",
    prob: .07,
    dato: "Uno de los peces de agua dulce más grandes del mundo. No respira solo por branquias: debe subir a la superficie a tomar aire cada pocos minutos, o se ahoga."
  }, ]
}];

const TOTAL_ESPECIES = DATA_ISLAS.reduce((n, isla) => n + isla.peces.length, 0);

const LOGROS = [{
  id: "primer_pez",
  nombre: "Primer Lance",
  desc: "Atrapa tu primer pez.",
  icono: "🎣",
  check: s => s.stats.totalPeces >= 1
}, {
  id: "pescador_50",
  nombre: "Pescador Constante",
  desc: "Atrapa 50 peces en total.",
  icono: "🐟",
  check: s => s.stats.totalPeces >= 50
}, {
  id: "pescador_200",
  nombre: "Maestro Pescador",
  desc: "Atrapa 200 peces en total.",
  icono: "🐋",
  check: s => s.stats.totalPeces >= 200
}, {
  id: "todas_islas",
  nombre: "Explorador del Casanare",
  desc: "Desbloquea las 5 islas del mapa.",
  icono: "🗺️",
  check: s => DATA_ISLAS.every(isla => isla.desc)
}, {
  id: "enciclopedia_completa",
  nombre: "Enciclopedia Completa",
  desc: "Descubre las " + TOTAL_ESPECIES + " especies de peces del juego.",
  icono: "📖",
  check: s => s.stats.especies.length >= TOTAL_ESPECIES
}, {
  id: "pez_oro",
  nombre: "Toque de Midas",
  desc: "Consigue tu primer 🏆 Pez de Oro.",
  icono: "🏆",
  check: s => s.stats.mutaciones.includes("oro")
}, {
  id: "arcoiris",
  nombre: "Cazador de Arcoíris",
  desc: "Consigue un 🌈 Dorado Arcoíris.",
  icono: "🌈",
  check: s => s.stats.mutaciones.includes("arcoiris")
}, {
  id: "cosmico",
  nombre: "Viajero Cósmico",
  desc: "Consigue un ☄️ Pez Cósmico.",
  icono: "☄️",
  check: s => s.stats.mutaciones.includes("cosmico")
}, {
  id: "legendario",
  nombre: "Pescador Legendario",
  desc: "Consigue un ★ pez Legendario.",
  icono: "★",
  check: s => s.stats.mutaciones.includes("legendario")
}, {
  id: "nervios_acero",
  nombre: "Nervios de Acero",
  desc: "Termina un viaje en una isla con minas navales sin detonar ninguna.",
  icono: "💣",
  check: s => s.stats.nerviosAcero === true
}, {
  id: "mochila_llena",
  nombre: "Mochila al Tope",
  desc: "Llena la mochila al máximo de peso en un solo viaje.",
  icono: "🎒",
  check: s => s.stats.mochilaLlena === true
}, {
  id: "cuenta_gorda",
  nombre: "Cuenta Gorda",
  desc: "Gana $10.000 acumulados vendiendo pescado.",
  icono: "💰",
  check: s => s.stats.dineroTotal >= 10000
}, {
  id: "equipo_pro",
  nombre: "Equipo Profesional",
  desc: "Consigue el equipo de nivel tope en caña, cebo y mochila.",
  icono: "🛠️",
  check: s => s.canaNivel === EQUIPO_CANAS.length - 1 &&
              s.ceboNivel === EQUIPO_CEBOS.length - 1 &&
              s.mochilaNivel === EQUIPO_MOCHILAS.length - 1
}, {
  id: "viaje_completo",
  nombre: "Las Bocas del Casanare",
  desc: "Llega a pescar en Bocas del Casanare, el último tramo del río.",
  icono: "🌊",
  check: s => s.stats.islaMaxAlcanzada >= 5
}, {
  id: "casa_completa",
  nombre: "La Casa de los Sueños",
  desc: "Termina de mejorar la casa por completo. Fin de la historia.",
  icono: "🏠",
  check: s => s.casaNivel >= 5
}];

const HISTORIA_INTRO = [{
  titulo: "Ciénaga del Tinije",
  texto: "Ahí, río arriba de Yopal, vive un pescador con su familia en un rancho de palma que ya no aguanta otro invierno."
}, {
  titulo: "El legado del río",
  texto: "Desde que el papá del pescador dejó de salir a pescar estas aguas, las cosas no han sido fáciles: el techo se llueve, la nevera casi siempre está vacía."
}, {
  titulo: "Una idea en la cabeza",
  texto: "Pero el río sigue dando lo suyo a quien sabe esperar. Hoy sales a pescar con un solo propósito: sacar a tu familia adelante, un pez a la vez."
}, {
  titulo: "¿Cómo se juega?",
  texto: "Pesca, completa la enciclopedia de cada río y junta lo necesario para mejorar la casa. Cada mejora es un capítulo nuevo de la historia."
}];

const CASA_MEJORAS = [{
  id: 2,
  nombre: "Paredes de Bloque",
  rioId: 2,
  requisitos: { especies: [{ n: "Yamú", cantidad: 3 }], mutacionRaraCant: 1, dinero: 400, enciclopediaIsla: 2 },
  dialogoAntes: "El rancho aguanta bien el techo de zinc, pero las paredes de guadua siguen dejando entrar el viento y el frío de la madrugada.",
  dialogoDespues: "Las paredes de bloque ya están en pie. «Esto sí es una casa de verdad», dice tu hijo mayor, tocando el muro nuevo con la mano."
}, {
  id: 3,
  nombre: "Cocina y Agua Potable",
  rioId: 3,
  requisitos: { especies: [{ n: "Cachama Negra", cantidad: 3 }], mutacionRaraCant: 2, dinero: 1000, enciclopediaIsla: 3 },
  dialogoAntes: "Tu esposa sigue cocinando con leña y cargando agua del caño en baldes. Una cocina de verdad, con agua que llegue sola, les cambiaría la vida.",
  dialogoDespues: "El agua ya llega por tubería y hay una estufa de verdad en la cocina. «Ya no tengo que caminar hasta el caño con el sol picando», dice tu esposa, aliviada."
}, {
  id: 4,
  nombre: "Cuarto para los Niños",
  rioId: 4,
  requisitos: { especies: [{ n: "Tucunaré", cantidad: 3 }], mutacionRaraCant: 3, dinero: 2200, enciclopediaIsla: 4 },
  dialogoAntes: "Los niños siguen durmiendo todos juntos en el mismo cuarto que tú y tu esposa. Ya están grandes: necesitan su propio espacio.",
  dialogoDespues: "El segundo piso ya tiene su cuarto propio. «¡Al fin tenemos donde jugar sin que nos manden a dormir!», gritan los niños subiendo la escalera nueva."
}, {
  id: 5,
  nombre: "La Casa de los Sueños",
  rioId: 5,
  requisitos: { especies: [{ n: "Bagre Piraíba", cantidad: 3 }], mutacionRaraCant: 4, dinero: 4200, enciclopediaIsla: 5 },
  dialogoAntes: "Ya casi no queda nada del rancho de palma donde empezó todo. Solo falta un último esfuerzo, el más duro: llegar hasta las Bocas del Casanare.",
  dialogoDespues: "La casa quedó pintada, con jardín y cerca nueva. Toda la familia sale a verla desde afuera. «Tu papá estaría orgulloso», dice tu esposa. El viaje que empezó en la Ciénaga del Tinije por fin llegó a buen puerto."
}];
