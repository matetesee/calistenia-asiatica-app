// Contenido estatico de la app: programa, recetas, bonos y logros.
// Todo vive en un solo objeto global para mantener la app simple (sin build step).

const CATEGORIES = [
  {
    id: "activacion",
    name: "Activación Total",
    minutes: 15,
    icon: "\u{1F338}", // cherry blossom
    focus: "Cuerpo completo · activación de fibras profundas",
    youtubeId: "9HVdz5S3LSQ",
    instructor: "Jéssica Martín Moreno",
  },
  {
    id: "tonificacion",
    name: "Tonificación y Definición",
    minutes: 12,
    icon: "\u{2728}", // sparkles
    focus: "Brazos y espalda · sin pesas",
    youtubeId: "rlSeGlAEAFw",
    instructor: "Patry Jordan · GymVirtual",
  },
  {
    id: "cardio",
    name: "Cardio Fluido",
    minutes: 15,
    icon: "\u{1F343}", // leaf
    focus: "Bajo impacto · sin saltos",
    youtubeId: "WNz9C_vyIB0",
    instructor: "Sientete Joven",
  },
  {
    id: "core",
    name: "Core y Abdomen Plano",
    minutes: 10,
    icon: "\u{1F525}",
    focus: "Abdomen · postura",
    youtubeId: "Pvxj-1dgVk0",
    instructor: "Patry Jordan · GymVirtual",
  },
  {
    id: "piernas",
    name: "Piernas y Glúteos Firmes",
    minutes: 12,
    icon: "\u{1F339}", // rose
    focus: "Tren inferior · sin peso y sin saltos",
    youtubeId: "ItMcmDCxD6A",
    instructor: "NatyGloss Gym",
  },
  {
    id: "funcional",
    name: "Fuerza Funcional",
    minutes: 15,
    icon: "\u{1F31F}",
    focus: "Cuerpo completo · sin equipamiento",
    youtubeId: "fjQHymlBex8",
    instructor: "Dalú Fitness",
  },
  {
    id: "recuperacion",
    name: "Recuperación y Alivio Articular",
    minutes: 12,
    icon: "\u{1F343}",
    focus: "Estiramientos · movilidad",
    youtubeId: "K_8PuY5m1LI",
    instructor: "Anabel Otero",
  },
];

const PHASES = [
  {
    id: 1,
    name: "Activación",
    weeks: [1, 2, 3],
    tagline: "Despertá tus fibras profundas y construí la base de tu nueva fuerza.",
  },
  {
    id: 2,
    name: "Transformación",
    weeks: [4, 5, 6],
    tagline: "Subí la intensidad y sentí cómo tu cuerpo empieza a cambiar de verdad.",
  },
  {
    id: 3,
    name: "Plenitud",
    weeks: [7, 8, 9],
    tagline: "Consolidá tu transformación y llegá a tu versión más firme y plena.",
  },
];

// Genera los 63 dias (9 semanas x 7 categorias) a partir de CATEGORIES + PHASES.
function buildProgramDays() {
  const days = [];
  let dayNumber = 1;
  for (const phase of PHASES) {
    for (const week of phase.weeks) {
      for (const cat of CATEGORIES) {
        days.push({
          day: dayNumber,
          week,
          phaseId: phase.id,
          categoryId: cat.id,
        });
        dayNumber++;
      }
    }
  }
  return days;
}

const PROGRAM_DAYS = buildProgramDays();
const TOTAL_DAYS = PROGRAM_DAYS.length; // 63

const BADGES = [
  { id: "primer-paso", icon: "\u{1F338}", name: "Primer Paso", desc: "Completaste tu primer día.", check: (s) => s.completedDays.length >= 1 },
  { id: "primera-semana", icon: "\u{1F949}", name: "Primera Semana", desc: "7 días completados.", check: (s) => s.completedDays.length >= 7 },
  { id: "racha-fuego", icon: "\u{1F525}", name: "Racha de Fuego", desc: "5 días seguidos entrenando.", check: (s) => s.bestStreak >= 5 },
  { id: "fase-1", icon: "\u{1F33F}", name: "Fase 1 Superada", desc: "Completaste Activación (21 días).", check: (s) => s.completedDays.length >= 21 },
  { id: "mitad-camino", icon: "\u{1F948}", name: "Mitad del Camino", desc: "32 de 63 días completados.", check: (s) => s.completedDays.length >= 32 },
  { id: "foto-transformacion", icon: "\u{1F4F8}", name: "Transformación Registrada", desc: "Subiste tu primera foto de progreso.", check: (s) => s.photos.length >= 1 },
  { id: "constancia-oro", icon: "\u{1F48E}", name: "Constancia de Oro", desc: "14 días seguidos entrenando.", check: (s) => s.bestStreak >= 14 },
  { id: "transformacion-lograda", icon: "\u{1F3C6}", name: "Transformación Lograda", desc: "Completaste el programa entero.", check: (s) => s.completedDays.length >= TOTAL_DAYS },
];

// --- Recetas: infusiones y tes asiaticos quema-grasa (bono "Te Asiatico Anticelulite") ---
const RECIPE_TAGS = {
  energia: { label: "Energía", icon: "\u{26A1}" },
  "pre-entreno": { label: "Pre-entreno", icon: "\u{1F3CB}\u{FE0F}" },
  recuperacion: { label: "Recuperación", icon: "\u{1F9CA}" },
  digestivo: { label: "Digestivo", icon: "\u{1F343}" },
  termogenico: { label: "Termogénico Fuerte", icon: "\u{1F525}" },
};

const RECIPES = [
  { id: "te-verde-jengibre", name: "Té Verde con Jengibre", tag: "termogenico",
    ingredients: ["1 taza de té verde recién hecho", "3 rodajas finas de jengibre fresco", "Unas gotas de limón"],
    preparation: "Herví el agua, agregá el jengibre y dejá infusionar 5 minutos junto con el té verde. Colá y agregá el limón antes de tomarlo." },
  { id: "te-verde-limon-menta", name: "Té Verde con Limón y Menta", tag: "energia",
    ingredients: ["1 taza de té verde", "Jugo de medio limón", "5 hojas de menta fresca"],
    preparation: "Preparás el té verde normal, agregás las hojas de menta mientras aún está caliente y sumás el limón al final. Ideal para arrancar el día." },
  { id: "te-oolong-clasico", name: "Té Oolong Clásico", tag: "termogenico",
    ingredients: ["1 cucharadita de hojas de té oolong", "250 ml de agua a 90°C"],
    preparation: "Dejá infusionar las hojas 3-4 minutos, no más para que no amargue. Podés reutilizar las mismas hojas hasta 2 veces más." },
  { id: "te-jengibre-curcuma", name: "Té de Jengibre y Cúrcuma", tag: "termogenico",
    ingredients: ["2 rodajas de jengibre fresco", "1/2 cucharadita de cúrcuma en polvo", "Una pizca de pimienta negra", "250 ml de agua"],
    preparation: "Herví el agua con el jengibre 5 minutos, agregá la cúrcuma y la pimienta (ayuda a absorberla mejor) y dejá reposar 2 minutos más antes de colar." },
  { id: "te-hibisco-frio", name: "Té de Hibisco Frío", tag: "energia",
    ingredients: ["2 cucharadas de flor de hibisco seca", "500 ml de agua", "Hielo", "Endulzante a gusto"],
    preparation: "Infusioná el hibisco en agua caliente 8 minutos, dejá enfriar, colá y serví con hielo. Refrescante y con un color rosado precioso." },
  { id: "te-crisantemo", name: "Té de Crisantemo", tag: "recuperacion",
    ingredients: ["1 cucharada de flores de crisantemo secas", "250 ml de agua caliente", "Miel opcional"],
    preparation: "Infusioná las flores 5 minutos en agua caliente (no hirviendo). Es un clásico de la medicina tradicional china para relajar después de entrenar." },
  { id: "te-loto-miel", name: "Té de Hoja de Loto y Miel", tag: "recuperacion",
    ingredients: ["1 bolsita o cucharadita de hoja de loto", "250 ml de agua caliente", "1 cucharadita de miel"],
    preparation: "Infusioná la hoja de loto 6-8 minutos, colá y agregá la miel cuando esté tibio (no hirviendo, para no perder sus propiedades)." },
  { id: "te-verde-canela", name: "Té Verde con Canela", tag: "pre-entreno",
    ingredients: ["1 taza de té verde", "1 rama de canela o 1/2 cucharadita en polvo"],
    preparation: "Agregá la canela al agua mientras hierve, apagá el fuego, sumá el té verde y dejá reposar 3 minutos. Tomalo 20-30 minutos antes de entrenar." },
  { id: "te-diente-leon", name: "Té de Diente de León", tag: "digestivo",
    ingredients: ["1 cucharadita de raíz de diente de león", "250 ml de agua"],
    preparation: "Herví el agua con la raíz 5 minutos a fuego bajo, colá y tomalo después de las comidas más pesadas." },
  { id: "matcha-almendras", name: "Matcha con Leche de Almendras", tag: "energia",
    ingredients: ["1/2 cucharadita de matcha en polvo", "200 ml de leche de almendras tibia", "Endulzante a gusto"],
    preparation: "Batí el matcha con un poco de agua caliente hasta que no queden grumos, agregá la leche de almendras tibia y mezclá bien." },
  { id: "oolong-jengibre-limon", name: "Té Oolong con Jengibre y Limón", tag: "termogenico",
    ingredients: ["1 cucharadita de té oolong", "2 rodajas de jengibre", "Jugo de medio limón"],
    preparation: "Infusioná el oolong con el jengibre 4 minutos, colá y agregá el limón. Tomalo tibio, no hirviendo." },
  { id: "te-verde-menta-pepino", name: "Té Verde con Menta y Pepino", tag: "recuperacion",
    ingredients: ["1 taza de té verde frío", "5 hojas de menta", "3 rodajas de pepino"],
    preparation: "Preparás el té verde, lo dejás enfriar, agregás la menta y el pepino y lo dejás reposar en la heladera 20 minutos antes de tomarlo." },
  { id: "te-jazmin", name: "Té de Jazmín", tag: "recuperacion",
    ingredients: ["1 cucharadita de té de jazmín", "250 ml de agua a 80°C"],
    preparation: "Infusioná 3 minutos en agua no hirviendo (el jazmín se quema fácil). Perfecto para la noche, antes de dormir." },
  { id: "pu-erh", name: "Té Rojo Pu-erh", tag: "termogenico",
    ingredients: ["1 cucharadita de té pu-erh", "250 ml de agua hirviendo"],
    preparation: "Lavá rápido las hojas con agua caliente y descartá ese primer agua. Volvé a infusionar 3-4 minutos. Es el té tradicional chino más usado para la digestión de grasas." },
  { id: "te-verde-canela-manzana", name: "Té Verde con Canela y Manzana", tag: "digestivo",
    ingredients: ["1 taza de té verde", "3 rodajas de manzana", "1 rama de canela"],
    preparation: "Hervís el agua con la canela y la manzana 5 minutos, apagás, agregás el té verde y dejás reposar 3 minutos más." },
  { id: "te-jengibre-miel", name: "Té de Jengibre con Miel", tag: "pre-entreno",
    ingredients: ["3 rodajas de jengibre fresco", "250 ml de agua", "1 cucharadita de miel"],
    preparation: "Herví el jengibre 6 minutos, dejá entibiar un poco y agregá la miel (para que no pierda propiedades con el agua hirviendo)." },
  { id: "te-verde-helado-menta", name: "Té Verde Helado con Menta", tag: "energia",
    ingredients: ["1 taza de té verde", "Hojas de menta fresca", "Hielo"],
    preparation: "Preparás el té verde bien cargado, lo dejás enfriar, agregás la menta y lo servís con mucho hielo." },
  { id: "curcuma-pimienta", name: "Té de Cúrcuma y Pimienta Negra", tag: "termogenico",
    ingredients: ["1/2 cucharadita de cúrcuma", "Una pizca de pimienta negra molida", "250 ml de agua", "Un chorrito de leche de coco (opcional)"],
    preparation: "Herví el agua con la cúrcuma y la pimienta 5 minutos. La pimienta es clave: multiplica la absorción de la cúrcuma. Agregá la leche de coco al final si querés una versión más cremosa." },
];

// --- Bonos de "Tu Plan" (calcados de las promesas del quiz) ---
const BONUSES = [
  {
    id: "recetas",
    kind: "PDF interactivo",
    title: "Té Asiático Anticelulite",
    desc: "Biblioteca interactiva de infusiones quema-grasa",
    view: "recetas",
  },
  {
    id: "plan-progreso",
    kind: "Interactivo",
    title: "Plan de Progreso",
    desc: "Herramienta de seguimiento de peso y medidas",
    view: "plan-progreso",
  },
  {
    id: "recuperacion",
    kind: "Interactivo",
    title: "Protocolo de Recuperación y Alivio Articular",
    desc: "Recomendaciones según tu estado físico",
    view: "recuperacion",
  },
  {
    id: "tracker-constancia",
    kind: "Tracker",
    title: "Tracker de Constancia",
    desc: "Registro diario de hábitos por fecha real",
    view: "tracker",
  },
  {
    id: "alimentacion",
    kind: "Interactivo",
    title: "Cronograma de Alimentación Inteligente",
    desc: "Horarios y combinaciones para acelerar tu metabolismo",
    view: "alimentacion",
  },
  {
    id: "reinicio-72h",
    kind: "Interactivo",
    title: "Protocolo Reinicio 72H",
    desc: "Reset hormonal y de descanso en 3 días",
    view: "reinicio",
  },
];

window.CALISTENIA_DATA = {
  CATEGORIES,
  PHASES,
  PROGRAM_DAYS,
  TOTAL_DAYS,
  BADGES,
  RECIPES,
  RECIPE_TAGS,
  BONUSES,
};
