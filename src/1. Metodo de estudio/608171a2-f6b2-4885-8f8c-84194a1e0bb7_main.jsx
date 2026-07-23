import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// ---------------------------------------------------------------------------
// Red de seguridad: si algo falla al interpretar o dibujar el resultado de
// Gemini (formato inesperado, campo faltante, etc.), React por defecto
// "desmonta" toda la app y deja la pantalla en blanco. Este ErrorBoundary
// atrapa ese error y muestra un aviso en su lugar, sin tirar abajo el resto
// de la sala de estudio (el botón de volver, la barra lateral, etc. siguen
// funcionando).
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, message: '' } }
  static getDerivedStateFromError(error) { return { hasError: true, message: error?.message || 'Ocurrió un error inesperado.' } }
  componentDidCatch(error, info) { console.error('Lúmina atrapó un error al renderizar:', error, info) }
  render() {
    if (this.state.hasError) {
      return typeof this.props.fallback === 'function' ? this.props.fallback(this.state.message) : this.props.fallback;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Prompts estrictos: le piden a Gemini un bloque de código JS "limpio" con
// una constante (datosMapa / datosCornell / bancoPreguntas / PREGUNTAS).
// Esa constante se interpreta con parseStrictOutput() y se dibuja NATIVA en
// esta misma página (ver MapaView, CornellView, FlashcardsView, TestView,
// más abajo). No hace falta ningún archivo .html aparte: todo vive acá.
// ---------------------------------------------------------------------------
const PROMPT_MAPA = `Actuá como un experto en pedagogía, síntesis de información y arquitectura de datos. Tu objetivo es convertir el texto que te voy a dar en un mapa conceptual extremadamente completo y jerarquizado.

Analizá el texto en profundidad: ideas principales, matices, relaciones causa-efecto, clasificaciones y detalles relevantes. Organizá todo en un objeto JavaScript (datosMapa) con la estructura anidada nombre/hijos.

Reglas estrictas:
1. Exhaustividad: no omitas información importante. Si el texto es denso, desglosalo en tantos niveles como haga falta para que sea una herramienta de estudio total, cubriendo el documento completo (no solo el principio).
2. Longitud de los nodos: cada "nombre" debe ser corto y visual (idealmente 3 a 12 palabras). Si un concepto necesita más desarrollo, creá un hijo con el detalle en vez de alargar el nombre del padre.
3. Texto plano únicamente: no uses HTML, markdown, negritas ni asteriscos dentro de los "nombre". Solo texto simple.
4. Sintaxis: el código debe ser JavaScript 100% válido, con comillas internas escapadas (\\") y todas las llaves/corchetes balanceados.
5. Formato de entrega: devolvé ÚNICAMENTE el bloque de código del objeto datosMapa, en texto plano, sin bloques \`\`\` de markdown, sin introducciones ni explicaciones.

Estructura requerida:

const datosMapa = {
    nombre: "Título principal",
    hijos: [
        {
            nombre: "Categoría/Idea Principal",
            hijos: [
                {
                    nombre: "Subcategoría o concepto clave",
                    hijos: [{ nombre: "Detalle, ejemplo o explicación específica" }]
                }
            ]
        }
    ]
};`

const PROMPT_CORNELL = `Actuá como un profesor experto en técnicas de estudio y en la metodología de Apuntes Cornell. Tu objetivo es procesar la información que te voy a dar y transformarla en un resumen completo, estructurado y exhaustivo, sin dejar ningún dato importante afuera y sin inventar información que no esté en el texto original.

Entregá ÚNICAMENTE el código JavaScript de la constante datosCornell, respetando esta estructura:

const datosCornell = {
    tituloPagina: "Método Cornell",
    subtitulo: "[Título general del tema]",
    asignatura: "[Materia a la que pertenece]",
    fecha: "[Fecha o época del tema, ej: 2024 o S. XIX]",
    stickers: [
        { emoji: "[Emoji representativo 1]", top: "8px", left: "6%", rot: "-12deg" },
        { emoji: "[Emoji representativo 2]", top: "14px", right: "6%", rot: "10deg" }
    ],
    tintes: ["#FFF6E8", "#EAF6F3", "#F3EEFB"],
    hojas: [
        {
            titulo: "[Subtema 1 - sé específico]",
            ideasClave: ["[Pregunta o concepto 1]", "[Pregunta o concepto 2]"],
            notas: [
                "[Nota detallada. Usá <b>...</b> para resaltar datos, fechas o conceptos clave en naranja.]"
            ],
            resumen: ["[Síntesis de esta hoja en 1 o 2 oraciones integradoras.]"]
        }
        // Agregá tantas hojas como haga falta para cubrir TODO el tema, sin omitir nada.
    ]
};

REGLAS ESTRICTAS:
1. Sé exhaustivo: dividí el tema en tantas "hojas" como sean necesarias (mínimo 3 o 4 para un tema con desarrollo medio; más si el material es extenso).
2. En notas, es OBLIGATORIO usar <b>...</b> alrededor de las palabras clave, fechas y datos duros.
3. En ideasClave, formulá preguntas cortas o palabras disparadoras que se correspondan 1 a 1 con las notas.
4. Si no encontrás emojis claramente relacionados con el tema, elegí los más neutros/genéricos posibles antes que forzar algo que no tenga sentido (ej: 📖 y 📝).
5. Fidelidad: usá solamente la información del texto que te paso. No completes con conocimiento general si no está en la fuente.
6. Sintaxis: JavaScript válido, comillas internas escapadas, sin comas colgantes.
7. Entregable: SOLO el código JavaScript, en texto plano, sin bloques \`\`\` de markdown, sin explicaciones antes o después.`

const PROMPT_FLASHCARDS = `Actuá como un extractor de datos preciso. Tu única tarea es leer el texto de estudio, apuntes o documento adjunto que te voy a proporcionar y transformarlo en un array de objetos de JavaScript llamado 'bancoPreguntas'.

Reglas estrictas:
1. Extraé las ideas principales en formato Pregunta y Respuesta. No hay límite fijo de cantidad: generá tantas como hagan falta para cubrir TODO el documento de punta a punta, sin dejar secciones sin representar.
2. Formato de salida exacto:
const bancoPreguntas = [
    { p: "¿Pregunta extraída?", r: "Respuesta textual y literal extraída del documento." }
];
3. Las respuestas deben ser extensas, completas y 100% fieles al texto original, copiadas de forma literal (no resumas, no simplifiques, no agregues información que no esté en el texto).
4. Las preguntas NUNCA deben incluir numeración, aunque el texto original esté numerado (ej: si el original dice "5. ¿Qué es...?", vos escribís "¿Qué es...?"). Revisá cada pregunta antes de entregar para confirmar que no quedó ningún número al principio.
5. No repitas el mismo concepto en dos preguntas distintas.
6. Devolvé ÚNICAMENTE el bloque de código de la constante 'bancoPreguntas', en texto plano, SIN usar bloques de markdown con \`\`\` (nada de comillas triples). No agregues introducciones, saludos, comentarios ni explicaciones antes o después.`

const PROMPT_TEST = `Sos un profesor experto creando un examen de práctica. Leé estos apuntes con atención y creá la mayor cantidad posible de preguntas de opción múltiple, cubriendo TODOS los conceptos, definiciones, fechas, nombres, procesos y datos que aparezcan. No omitas nada importante y no repitas el mismo concepto en dos preguntas distintas.

Devolveme únicamente esto, en texto plano y sin bloques \`\`\` de markdown, sin texto antes ni después:
const PREGUNTAS = [
  { t: "¿Pregunta?", ops: ["Opción A", "Opción correcta*", "Opción C", "Opción D"], info: "Explicación breve usando las palabras de los apuntes." },
];

Reglas estrictas:
1. La opción correcta lleva * pegado al final, sin espacio.
2. Exactamente 4 opciones por pregunta.
3. Las opciones incorrectas deben ser plausibles (mismo tipo de dato, época o categoría que la correcta), nunca obvias ni absurdas.
4. Todas las opciones de una misma pregunta deben tener una extensión similar entre sí, para que la correcta no se note por ser más larga o más detallada que el resto.
5. "info" debe explicar con las palabras de los apuntes, sin inventar ni agregar datos que no estén en el texto.
6. Variá el tipo de pregunta: definiciones, ejemplos, comparaciones, fechas, causas, consecuencias.
7. Comillas internas escapadas correctamente (\\") para que el JavaScript sea válido.
8. Solo el código JavaScript, nada más.`

// Métodos cuya salida debe ser código JS "puro" que se interpreta y se
// dibuja nativo en esta página (ver parseStrictOutput y las vistas de más
// abajo). No generan ni necesitan ningún archivo .html.
const STRICT_METHODS = ['mind', 'cornell', 'spaced', 'recall']
// Nombre de la constante que cada método espera encontrar en el código que
// devuelve Gemini, y si esa constante debe ser una lista o un objeto.
const VAR_NAMES = {
  mind: 'datosMapa',
  cornell: 'datosCornell',
  spaced: 'bancoPreguntas',
  recall: 'PREGUNTAS'
}
const EXPECTED_SHAPE = { mind: 'object', cornell: 'object', spaced: 'array', recall: 'array' }

// Array de métodos con su configuración de Prompts para Gemini.
// mind / cornell / spaced / recall usan los prompts estrictos de arriba
// porque se dibujan nativos en la sala de estudio.
const methods = [
  ['mind', 'Mapa mental', 'Conecta las ideas que importan', '✦', PROMPT_MAPA],
  ['cornell', 'Cornell', 'Anota, relaciona y sintetiza', '▤', PROMPT_CORNELL],
  ['feynman', 'Feynman', 'Explica hasta entender de verdad', '◌', 'Explica los conceptos más complejos de este material utilizando la Técnica Feynman. Usa un lenguaje extremadamente sencillo, claro y directo, como si le estuvieras enseñando a un niño de 10 años. Evita tecnicismos innecesarios e incluye analogías cotidianas.'],
  ['recall', 'Active Recall', 'Practica recordar sin mirar', '↶', PROMPT_TEST],
  ['spaced', 'Spaced Repetition', 'Repasa justo a tiempo', '◒', PROMPT_FLASHCARDS],
  ['sq3r', 'SQ3R', 'Lee con una ruta clara', '⌁', 'Guía al estudiante a través del método SQ3R adaptado a este texto. Proporciona: 1) Una inspección rápida (Survey), 2) Preguntas críticas que debe hacerse al leer (Question), e indica cómo debe estructurar su lectura activa, recitación y revisión posterior.'],
  ['blurting', 'Blurting', 'Vacía lo que recuerdas', '≈', 'Actúa como un evaluador formativo. Proporciona una lista con los núcleos temáticos esenciales que el estudiante obligatoriamente debe recordar de este material, sirviendo como una plantilla de verificación para su sesión de vaciado de memoria.'],
  ['resumir', 'Resumir', 'Crea una síntesis clara del material', '❖', 'Crea una síntesis ejecutiva, analítica, clara y perfectamente ordenada de las ideas principales y secundarias del material. Utiliza subtítulos limpios y viñetas para que sea altamente legible.'],
  ['subrayar', 'Subrayar', 'Extrae los puntos críticos del material', '✎', 'Extrae únicamente los datos más críticos, cifras, definiciones clave y tesis fundamentales del material. Preséntalo estrictamente en formato de lista compacta, omitiendo explicaciones secundarias.']
]

// Emojis disponibles para el "bosque" del Pomodoro estilo Forest.
const TREE_TYPES = ['🌲', '🌳', '🪴', '🌵', '🌿']

// ---------------------------------------------------------------------------
// Proveedores de IA soportados y sus modelos disponibles. Agregar un
// proveedor nuevo implica: 1) sumarlo acá con su placeholder/link de ayuda,
// 2) sumar sus modelos en AI_MODELS, 3) sumar su rama en callAI().
// ---------------------------------------------------------------------------
const AI_PROVIDERS = [
  { id: 'gemini', label: 'Gemini', sub: 'Google', placeholder: 'AIza...', helpUrl: 'https://aistudio.google.com/api-keys', helpLabel: 'Créala en Google AI Studio.' },
  { id: 'openai', label: 'ChatGPT', sub: 'OpenAI', placeholder: 'sk-...', helpUrl: 'https://platform.openai.com/api-keys', helpLabel: 'Créala en OpenAI Platform.' },
  { id: 'anthropic', label: 'Claude', sub: 'Anthropic', placeholder: 'sk-ant-...', helpUrl: 'https://console.anthropic.com/settings/keys', helpLabel: 'Créala en Anthropic Console.' },
  { id: 'openai_compatible', label: 'Otro modelo', sub: 'Compatible con la API de OpenAI', placeholder: 'sk-...', helpUrl: '', helpLabel: '' },
]

const AI_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — rápido' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — más potente' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini — rápido' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — rápido' },
    { id: 'claude-opus-4-1', label: 'Claude Opus 4.1 — más potente' },
  ],
  openai_compatible: [],
}

const providerInfo = (id) => AI_PROVIDERS.find(p => p.id === id) || AI_PROVIDERS[0]

// Función para convertir archivos a Base64 para Gemini
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result.split(',')[1])
  reader.onerror = error => reject(error)
})

// Limpia envoltorios típicos que Gemini a veces agrega pese a las
// instrucciones (comillas, bloques ```js ... ```, saludos residuales).
const cleanAIOutput = (text) => {
  if (!text) return text
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim()
  cleaned = cleaned.replace(/^[`'"]+/, '').replace(/[`'"]+$/, '').trim()
  return cleaned
}

// ---------------------------------------------------------------------------
// Biblioteca persistente (IndexedDB). Los materiales que subís (con su
// contenido en base64) quedan guardados acá, así que sobreviven a un F5,
// cerrar la pestaña o reiniciar el navegador — como los "sources" de
// NotebookLM. localStorage no alcanza para PDFs en base64 (límite ~5MB),
// por eso se usa IndexedDB.
// ---------------------------------------------------------------------------
const LIBRARY_DB = 'lumina-library', LIBRARY_STORE = 'materials'

function openLibraryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LIBRARY_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(LIBRARY_STORE)) {
        req.result.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadMaterialsFromLibrary() {
  const db = await openLibraryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readonly');
    const req = tx.objectStore(LIBRARY_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function saveMaterialToLibrary(material) {
  const db = await openLibraryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    tx.objectStore(LIBRARY_STORE).put(material);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function deleteMaterialFromLibrary(id) {
  const db = await openLibraryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    tx.objectStore(LIBRARY_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function App() {
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('lumina-streak') || '0'));
  const [forest, setForest] = useState(() => { try { return JSON.parse(localStorage.getItem('lumina-forest') || '[]') } catch { return [] } });
  const [active, setActive] = useState('mind'), [room, setRoom] = useState(false), [tab, setTab] = useState('Inicio')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lumina-gemini-key') || '')
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('lumina-ai-provider') || 'gemini')
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('lumina-ai-model') || AI_MODELS.gemini[0].id)
  const [aiBaseUrl, setAiBaseUrl] = useState(() => localStorage.getItem('lumina-ai-base-url') || '')
  const [keyInput, setKeyInput] = useState(apiKey), [keyOpen, setKeyOpen] = useState(false), [notice, setNotice] = useState('')
  const [providerInput, setProviderInput] = useState(aiProvider)
  const [modelInput, setModelInput] = useState(aiModel)
  const [baseUrlInput, setBaseUrlInput] = useState(aiBaseUrl)
  // Materias (carpetas/"cuadernos") y cuál está abierta ahora mismo en la
  // Biblioteca. materiaId=null significa "mostrando el selector de
  // materias", no una materia en particular.
  const [materias, setMaterias] = useState([])
  const [materiaId, setMateriaId] = useState(null)
  const [materiaModalOpen, setMateriaModalOpen] = useState(false)
  const [materiaToRename, setMateriaToRename] = useState(null)
  const [studyPickerOpen, setStudyPickerOpen] = useState(false)
  const [pendingMethod, setPendingMethod] = useState(null)
  const [materials, setMaterials] = useState([]), [activeMaterial, setActiveMaterial] = useState(null)
  const [previewMaterial, setPreviewMaterial] = useState(null)
  // Configuración del ciclo Pomodoro. Defaults recomendados para foco
  // profundo sin llegar al burnout: 45 min de trabajo, 10 de descanso
  // corto, 25 de descanso largo cada 4 sesiones (punto medio entre el
  // Pomodoro clásico 25/5 y la regla 52/17).
  const [studyMinutes, setStudyMinutes] = useState(() => parseInt(localStorage.getItem('lumina-study-minutes') || '45'))
  const [shortBreakMinutes, setShortBreakMinutes] = useState(() => parseInt(localStorage.getItem('lumina-short-break') || '10'))
  const [longBreakMinutes, setLongBreakMinutes] = useState(() => parseInt(localStorage.getItem('lumina-long-break') || '25'))
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(() => parseInt(localStorage.getItem('lumina-sessions-until-long') || '4'))
  // Fase actual del ciclo: 'focus' | 'short' | 'long'.
  const [phase, setPhase] = useState('focus')
  const [completedFocusSessions, setCompletedFocusSessions] = useState(() => parseInt(localStorage.getItem('lumina-completed-sessions') || '0'))
  const [seconds, setSeconds] = useState(() => parseInt(localStorage.getItem('lumina-study-minutes') || '45') * 60)
  const [running, setRunning] = useState(false), [aiResult, setAiResult] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [previewVersion, setPreviewVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInput, setSettingsInput] = useState({ study: studyMinutes, short: shortBreakMinutes, long: longBreakMinutes, cycle: sessionsUntilLongBreak })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 750px)').matches : false)

  // ---------------------------------------------------------------------
  // Modo Claro / Oscuro. Prioridad al elegir el valor inicial:
  //   1) preferencia ya guardada por el usuario en este navegador
  //   2) si nunca la definió, el modo que tenga activado su sistema
  //      operativo (prefers-color-scheme)
  //   3) 'light' como último fallback
  // Se aplica escribiendo data-theme="dark"/"light" en <html>, que es lo
  // que leen las variables CSS de styles.css.
  // ---------------------------------------------------------------------
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('lumina-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('lumina-theme', theme) } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const resultCacheKey = (material, methodId) => `lumina-result-${material.id}-${methodId}`
  const previewCacheKey = (material, methodId) => `lumina-preview-${material.id}-${methodId}`

  const materiasKey = () => `lumina-materias`
  const currentMateriaKey = () => `lumina-current-materia`
  const activeMaterialKey = (mid) => `lumina-active-material-id-${mid}`

  // Al abrir la app, recupera las materias guardadas y cuál era la última
  // abierta (si había alguna).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(materiasKey()) || '[]');
      setMaterias(saved);
    } catch { setMaterias([]) }
    setMateriaId(localStorage.getItem(currentMateriaKey()) || null);
  }, []);

  // Abre/cierra una materia y recuerda la elección para la próxima visita.
  const chooseMateria = (id) => {
    setMateriaId(id);
    try {
      if (id) localStorage.setItem(currentMateriaKey(), id);
      else localStorage.removeItem(currentMateriaKey());
    } catch {}
  }

  const createMateria = (nombre) => {
    const id = Math.random().toString(36).substr(2, 9);
    const next = [...materias, { id, nombre }];
    setMaterias(next);
    try { localStorage.setItem(materiasKey(), JSON.stringify(next)) } catch {}
    chooseMateria(id);
  }

  const renameMateria = (id, nombre) => {
    const next = materias.map(m => m.id === id ? { ...m, nombre } : m);
    setMaterias(next);
    try { localStorage.setItem(materiasKey(), JSON.stringify(next)) } catch {}
  }

  // Elimina una materia junto con TODOS sus cuadernos (IndexedDB) y los
  // resultados de Gemini que se hubieran guardado para ellos, para no
  // dejar basura huérfana. Si era la materia abierta, vuelve al selector.
  const deleteMateria = async (id) => {
    const nombre = materias.find(m => m.id === id)?.nombre || 'esta materia';
    if (!window.confirm(`¿Eliminar "${nombre}" junto con todos sus cuadernos? Esta acción no se puede deshacer.`)) return;
    try {
      const stored = await loadMaterialsFromLibrary();
      const toDelete = stored.filter(m => m.materiaId === id);
      await Promise.all(toDelete.map(m => deleteMaterialFromLibrary(m.id).catch(() => {})));
      toDelete.forEach(m => {
        methods.forEach(meth => {
          try { localStorage.removeItem(resultCacheKey(m, meth[0])) } catch {}
          try { localStorage.removeItem(previewCacheKey(m, meth[0])) } catch {}
        });
      });
    } catch {}
    const next = materias.filter(m => m.id !== id);
    setMaterias(next);
    try {
      localStorage.setItem(materiasKey(), JSON.stringify(next));
      localStorage.removeItem(activeMaterialKey(id));
    } catch {}
    if (materiaId === id) chooseMateria(null);
  }

  // La biblioteca completa (IndexedDB) guarda los materiales de TODAS las
  // materias en un único store; acá se filtra para que cada materia solo
  // muestre sus propios cuadernos, sin mezclarse con otras materias.
  useEffect(() => {
    (async () => {
      if (!materiaId) { setMaterials([]); setActiveMaterial(null); return; }
      try {
        const stored = await loadMaterialsFromLibrary();
        const scoped = stored.filter(m => m.materiaId === materiaId);
        setMaterials(scoped);
        const lastId = localStorage.getItem(activeMaterialKey(materiaId));
        const found = scoped.find(m => m.id === lastId);
        setActiveMaterial(found || (scoped.length ? scoped[scoped.length - 1] : null));
      } catch {}
    })();
  }, [materiaId]);

  // Marca un material como activo y recuerda cuál era, para restaurarlo
  // en la próxima visita a esta materia.
  const chooseMaterial = (m) => {
    setActiveMaterial(m);
    try { localStorage.setItem(activeMaterialKey(materiaId), m.id) } catch {}
  }

  // Detecta el cambio entre escritorio y celular para decidir si la
  // navegación filtra secciones (PC) o si todo se renderiza en una sola
  // página vertical continua (mobile SPA).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 750px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler) }
  }, []);

  // Minutos y etiqueta correspondientes a la fase activa del ciclo.
  const phaseMinutes = phase === 'focus' ? studyMinutes : phase === 'short' ? shortBreakMinutes : longBreakMinutes
  const totalSeconds = phaseMinutes * 60
  const phaseLabel = phase === 'focus' ? 'Enfoque' : phase === 'short' ? 'Descanso corto' : 'Descanso largo'

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds(s => {
        if (s > 1) return s - 1;

        setRunning(false);

        if (phase === 'focus') {
          // Se completó un bloque de foco: suma racha, planta un árbol y
          // decide si toca descanso corto o largo según el ciclo configurado.
          setNotice('¡Sesión de enfoque completada! Tu bosque ha crecido 🌱');

          const newStreak = streak + 1;
          setStreak(newStreak);
          localStorage.setItem('lumina-streak', newStreak);

          const randomTree = TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)];
          const newForest = [...forest, randomTree];
          setForest(newForest);
          localStorage.setItem('lumina-forest', JSON.stringify(newForest));

          const newCompleted = completedFocusSessions + 1;
          setCompletedFocusSessions(newCompleted);
          localStorage.setItem('lumina-completed-sessions', newCompleted);

          const nextPhase = (newCompleted % sessionsUntilLongBreak === 0) ? 'long' : 'short';
          setPhase(nextPhase);
          return (nextPhase === 'long' ? longBreakMinutes : shortBreakMinutes) * 60;
        } else {
          // Se completó un descanso: vuelve a foco.
          setNotice(phase === 'long' ? 'Descanso largo terminado. ¿Lista para el próximo bloque de enfoque?' : 'Descanso corto terminado. Cuando quieras, retomá el enfoque.');
          setPhase('focus');
          return studyMinutes * 60;
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, streak, forest, phase, studyMinutes, shortBreakMinutes, longBreakMinutes, sessionsUntilLongBreak, completedFocusSessions]);

  // ---------------------------------------------------------------------
  // Detección de abandono durante el Pomodoro: si la sesión está corriendo
  // y el usuario cambia de pestaña o minimiza la ventana, se da una
  // tolerancia de 20 segundos. Si no vuelve dentro de ese tiempo, el
  // temporizador se reinicia (vuelve al comienzo de la fase actual y se
  // pausa), perdiendo el progreso de esa sesión.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let abandonTimeout = null;
    const handleVisibility = () => {
      if (document.hidden) {
        if (running) {
          abandonTimeout = setTimeout(() => {
            setRunning(false);
            setSeconds(totalSeconds);
            setNotice('Abandonaste la sesión por más de 20 segundos. El temporizador se reinició.');
          }, 20000);
        }
      } else if (abandonTimeout) {
        clearTimeout(abandonTimeout);
        abandonTimeout = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (abandonTimeout) clearTimeout(abandonTimeout);
    };
  }, [running, totalSeconds]);

  useEffect(() => { if (notice) { const id=setTimeout(()=>setNotice(''), 3500); return ()=>clearTimeout(id) } }, [notice])

  const time = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`
  const current = methods.find(m=>m[0]===active), progress = useMemo(()=>Math.round((totalSeconds-seconds)/totalSeconds*100),[seconds, totalSeconds])

  // Decodifica un adjunto de texto (.txt/.md) guardado en base64 a texto plano UTF-8.
  const decodeTextMaterial = (material) => {
    try { return decodeURIComponent(escape(atob(material.data))) } catch { return '' }
  }

  // Punto único de llamada a cualquiera de los 4 proveedores de IA. Cada
  // rama arma el request en el formato que ese proveedor espera y devuelve
  // siempre un string plano con la respuesta.
  const callAI = async ({ provider, model, key, promptText, material, baseUrl }) => {
    const cleanKey = key.replace(/[^\x20-\x7E]/g, '').trim();

    if (provider === 'gemini') {
      const parts = [{ text: promptText }];
      if (material?.data) parts.push({ inlineData: { mimeType: material.mimeType, data: material.data } });
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'No pudimos conectar con Gemini.');
      return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || 'Gemini no devolvió una respuesta. Prueba de nuevo.'
    }

    if (provider === 'anthropic') {
      const content = [{ type: 'text', text: promptText }];
      if (material?.data) {
        if ((material.mimeType || '').includes('pdf')) {
          content.push({ type: 'document', source: { type: 'base64', media_type: material.mimeType, data: material.data } });
        } else {
          content.push({ type: 'text', text: decodeTextMaterial(material) });
        }
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'No pudimos conectar con Claude.');
      return (data.content || []).map(p => p.text || '').join('') || 'Claude no devolvió una respuesta. Prueba de nuevo.'
    }

    // 'openai' y 'openai_compatible' comparten el formato Chat Completions.
    const isPdf = material?.data && (material.mimeType || '').includes('pdf');
    if (isPdf) throw new Error('Este proveedor no admite PDFs directamente. Usá Gemini o Claude para materiales en PDF, o subí el contenido como .txt/.md.');
    const userContent = [{ type: 'text', text: promptText }];
    if (material?.data) userContent.push({ type: 'text', text: decodeTextMaterial(material) });
    const endpoint = provider === 'openai_compatible'
      ? `${(baseUrl || '').replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cleanKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: userContent }] })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'No pudimos conectar con el modelo.');
    return data.choices?.[0]?.message?.content || 'El modelo no devolvió una respuesta. Prueba de nuevo.'
  }

  const saveKey = async () => {
    const key = keyInput.replace(/[^\x20-\x7E]/g, '').trim();
    const provider = providerInput;
    const model = provider === 'openai_compatible' ? (modelInput || '').trim() : modelInput;
    const label = providerInfo(provider).label;
    if (key.length < 10) return setNotice(`Revisa tu API Key: ${label} entrega una clave más larga.`);
    if (provider === 'openai_compatible' && !(baseUrlInput || '').trim()) return setNotice('Ingresá la URL base de la API para este proveedor.');
    if (provider === 'openai_compatible' && !model) return setNotice('Ingresá el nombre del modelo que querés usar.');
    setNotice(`Validando tu API Key con ${label}…`);
    try {
      await callAI({ provider, model, key, promptText: 'Responde únicamente: conexión lista', baseUrl: baseUrlInput });
      localStorage.setItem('lumina-gemini-key', key);
      localStorage.setItem('lumina-ai-provider', provider);
      localStorage.setItem('lumina-ai-model', model);
      localStorage.setItem('lumina-ai-base-url', baseUrlInput || '');
      setApiKey(key); setAiProvider(provider); setAiModel(model); setAiBaseUrl(baseUrlInput || '');
      setKeyOpen(false);
      setNotice(`${label} conectado y tu API Key se guardó en este navegador.`)
    } catch(error) { setNotice(`No pudimos validar la clave: ${error.message}`) }
  }

  // Interpreta el bloque "const NOMBRE = {...}" que devuelve Gemini y
  // devuelve directamente el objeto JS, sin depender de ningún archivo
  // externo. Esto es lo que permite mostrar el resultado nativamente en
  // React (mapa mental, Cornell, flashcards, test) y que funcione igual
  // en celular que en PC, sin descargar ni reemplazar nada.
  const parseStrictOutput = (methodId, code) => {
    const varName = VAR_NAMES[methodId];
    try {
      const fn = new Function(`'use strict'; ${code}\nreturn ${varName};`);
      const data = fn();
      if (data == null) throw new Error(`el código no define "${varName}"`);
      const shape = EXPECTED_SHAPE[methodId];
      if (shape === 'array' && !Array.isArray(data)) throw new Error(`"${varName}" debería ser una lista y Gemini devolvió otra cosa`);
      if (shape === 'object' && (Array.isArray(data) || typeof data !== 'object')) throw new Error(`"${varName}" debería ser un objeto y Gemini devolvió otra cosa`);
      return data;
    } catch (error) {
      throw new Error(`no pudimos interpretar el código (${error.message})`);
    }
  }

  const removeMaterial = (m) => {
    setMaterials(p => p.filter(x => x.id !== m.id));
    deleteMaterialFromLibrary(m.id).catch(() => {});
    if (activeMaterial?.id === m.id) {
      setActiveMaterial(null);
      try { localStorage.removeItem(activeMaterialKey(materiaId)) } catch {}
    }
  }

  const addMaterial = async (e) => {
    const fs = [...e.target.files];
    if (!fs.length) return;
    if (!materiaId) { setNotice('Abre o crea una materia antes de agregar material.'); e.target.value = ''; return; }
    setNotice('Procesando archivo para la IA...');

    try {
      const newMaterials = await Promise.all(fs.map(async (f) => {
        const base64 = await fileToBase64(f);
        return {
          id: Math.random().toString(36).substr(2, 9),
          materiaId: materiaId,
          name: f.name,
          size: `${Math.max(1, Math.round(f.size/1024))} KB`,
          type: f.type.includes('pdf') ? 'PDF' : 'NOTA',
          mimeType: f.type || 'text/plain',
          data: base64
        }
      }));
      setMaterials(p => [...p, ...newMaterials]);
      try { await Promise.all(newMaterials.map(m => saveMaterialToLibrary(m))) } catch {}
      chooseMaterial(newMaterials[newMaterials.length - 1]);
      setNotice('Material agregado y listo para usarse con la IA.');
    } catch (error) {
      setNotice('Hubo un error al procesar el archivo.');
    }
    e.target.value = '';
  }

  const generate = async (methodOverride) => {
    const m = methodOverride || current;
    const label = providerInfo(aiProvider).label;
    if (!apiKey) return setNotice('Primero conectá tu IA (API Key).');
    if (!activeMaterial) return setNotice(materials.length > 0 ? 'Selecciona un archivo de tu biblioteca antes de analizar.' : 'Agrega un archivo a tu biblioteca antes de analizar.');

    setAiResult('');
    setPreviewData(null);
    setPreviewError('');
    setLoading(true);
    setNotice(`${label} está analizando tu material...`);
    try {
      const promptBase = m[4] || `Eres un tutor experto...`;
      const strict = STRICT_METHODS.includes(m[0]);
      const promptFinal = strict
        ? `${promptBase}\n\nIMPORTANTE: tu respuesta debe ser EXCLUSIVAMENTE el bloque de código JavaScript solicitado, sin comillas envolventes, sin bloques de markdown (nada de \`\`\`), sin introducciones ni explicaciones antes o después. Usa como base estricta este documento: "${activeMaterial.name}".`
        : `${promptBase} Usa como base estricta este documento: "${activeMaterial.name}".`;

      const output = cleanAIOutput(await callAI({ provider: aiProvider, model: aiModel, key: apiKey, promptText: promptFinal, material: activeMaterial, baseUrl: aiBaseUrl }));
      setAiResult(output);
      try { localStorage.setItem(resultCacheKey(activeMaterial, m[0]), output) } catch {}

      if (strict) {
        try {
          const data = parseStrictOutput(m[0], output);
          setPreviewData(data);
          setPreviewVersion(v => v + 1);
          try { localStorage.setItem(previewCacheKey(activeMaterial, m[0]), JSON.stringify(data)) } catch {}
          setNotice(`${label} armó tu ${m[1]}. Ya lo podés usar acá abajo.`);
        } catch (error) {
          setPreviewError(error.message);
          setNotice(`${label} generó el contenido, pero no pudimos interpretarlo (${error.message}). Podés descargar el código y revisarlo.`);
        }
      } else {
        setNotice(`${label} preparó una propuesta para tu sesión.`);
      }
    } catch(error) { setNotice(`${label} no pudo responder: ${error.message}`) }
    finally { setLoading(false) }
  }

  // Si ya existe un resultado guardado para este material + método, lo
  // muestra directamente (incluida la vista ya interpretada si aplica)
  // en vez de volver a llamar a Gemini desde cero.
  const loadOrGenerate = (methodOverride) => {
    const m = methodOverride || current;
    const cached = activeMaterial ? localStorage.getItem(resultCacheKey(activeMaterial, m[0])) : null;
    if (cached) {
      setAiResult(cached);
      const cachedPreview = (STRICT_METHODS.includes(m[0]) && activeMaterial) ? localStorage.getItem(previewCacheKey(activeMaterial, m[0])) : null;
      try { setPreviewData(cachedPreview ? JSON.parse(cachedPreview) : null) } catch { setPreviewData(null) }
      setPreviewVersion(v => v + 1);
      setPreviewError('');
      setNotice('Mostrando el resultado ya generado para este método. Usa "Regenerar" si querés uno nuevo.');
    } else {
      generate(m);
    }
  }

  // Punto de entrada al espacio de estudio: en vez de asumir el cuaderno
  // que haya quedado activo de una visita anterior, siempre abre el
  // selector para que el usuario elija (o confirme) con qué materia y
  // cuaderno va a estudiar este método.
  const openStudy = (methodOverride) => {
    setPendingMethod(methodOverride || null);
    setStudyPickerOpen(true);
  }

  // Se llama desde el selector una vez que hay un cuaderno elegido:
  // recién ahí se fija el método (si vino de una tarjeta específica) y
  // se abre la sala de estudio.
  const beginStudy = () => {
    if (!activeMaterial) { setNotice('Elige un cuaderno para empezar.'); return; }
    if (pendingMethod) setActive(pendingMethod[0]);
    setStudyPickerOpen(false);
    setRoom(true);
    loadOrGenerate(pendingMethod || current);
  }

  // Al cambiar de material dentro de la sala de estudio, muestra el
  // resultado ya guardado para ese material + método (si existe) en vez
  // de arrastrar el resultado del material anterior.
  const selectMaterialForStudy = (m) => {
    chooseMaterial(m);
    const cached = localStorage.getItem(resultCacheKey(m, current[0]));
    setAiResult(cached || '');
    const cachedPreview = STRICT_METHODS.includes(current[0]) ? localStorage.getItem(previewCacheKey(m, current[0])) : null;
    try { setPreviewData(cachedPreview ? JSON.parse(cachedPreview) : null) } catch { setPreviewData(null) }
    setPreviewVersion(v => v + 1);
    setPreviewError('');
  }

  const saveSettings = () => {
    const study = Math.max(1, Math.min(180, parseInt(settingsInput.study) || 45));
    const short = Math.max(1, Math.min(60, parseInt(settingsInput.short) || 10));
    const long = Math.max(1, Math.min(90, parseInt(settingsInput.long) || 25));
    const cycle = Math.max(1, Math.min(12, parseInt(settingsInput.cycle) || 4));

    setStudyMinutes(study); localStorage.setItem('lumina-study-minutes', study);
    setShortBreakMinutes(short); localStorage.setItem('lumina-short-break', short);
    setLongBreakMinutes(long); localStorage.setItem('lumina-long-break', long);
    setSessionsUntilLongBreak(cycle); localStorage.setItem('lumina-sessions-until-long', cycle);

    // Si no hay una sesión corriendo, refleja el nuevo tiempo de la fase activa.
    if (!running) {
      const mins = phase === 'focus' ? study : phase === 'short' ? short : long;
      setSeconds(mins * 60);
    }
    setSettingsOpen(false);
    setNotice(`Ciclo configurado: ${study} min enfoque · ${short} min descanso corto · ${long} min descanso largo cada ${cycle} sesiones.`);
  }

  // En mobile todo se renderiza en una sola página vertical (SPA); en
  // escritorio, la barra lateral filtra qué sección se muestra.
  const showSection = (name) => isMobile || tab === name;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="logo"><i>✦</i><span>LÚMINA<small>ESTUDIO CONSCIENTE</small></span></a>
      <nav>
        {['Inicio','Biblioteca','Progreso'].map(x => 
          <button onClick={() => setTab(x)} className={tab===x ? 'nav-item selected' : 'nav-item'} key={x}>
            <span>{x==='Inicio' ? '⌂' : x==='Biblioteca' ? '▤' : '◔'}</span>{x}
          </button>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="quote">“Aprender no es acumular; es hacer conexiones.”</div>
      </div>
    </aside>
    
    <main>
      <header>
        <div>
          <p className="eyebrow">SESIÓN DE ESTUDIO</p>
          <h1>Hola, Estudiante <span>✦</span></h1>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado'}
            onClick={toggleTheme}
          >
            <span className="theme-toggle-icon sun">☀</span>
            <span className="theme-toggle-icon moon">☾</span>
            <span className="theme-toggle-knob"/>
          </button>
          <button className={apiKey ? 'key-button connected' : 'key-button'} onClick={() => { setProviderInput(aiProvider); setModelInput(aiModel); setBaseUrlInput(aiBaseUrl); setKeyOpen(true) }} title={apiKey ? `${providerInfo(aiProvider).label} conectado` : 'Conectar IA'}>
            <i>{apiKey ? '✓' : '◇'}</i><span className="key-button-label">{apiKey ? `${providerInfo(aiProvider).label} conectado` : 'Conectar IA'}</span>
          </button>
        </div>
      </header>

      {showSection('Inicio') && (
        <div id="inicio-section">
          <section className="focus-card">
            <div className="focus-copy">
              <p className="eyebrow">SESIÓN DE HOY</p>
              <h2>Un pequeño paso,<br/><em>una idea más clara.</em></h2>
              <p>Elige un método, abre tu material y dedica este momento a conectar lo que estás aprendiendo.</p>
              <button className="primary" onClick={() => openStudy()}>Comenzar a estudiar <span>→</span></button>
            </div>
            <div className="orbital-notes">
              <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
              <div className="note note-a">✦<small>recordar</small></div>
              <div className="note note-b">⌁<small>conectar</small></div>
              <div className="note note-c">◌<small>comprender</small></div>
              <div className="central-star">✦</div>
            </div>
          </section>
          
          <section className="methods-section">
            <div className="section-heading">
              <div><p className="eyebrow">TU FORMA DE APRENDER</p><h2>Elige cómo quieres estudiar</h2></div>
            </div>
            <div className="method-grid" id="method-grid">
              {methods.map(m => 
                <button className={active===m[0] ? 'method-card active' : 'method-card'} onClick={() => openStudy(m)} key={m[0]}>
                  <i>{m[3]}</i><strong>{m[1]}</strong><span>{m[2]}</span>{active===m[0] && <b>Elegido</b>}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {showSection('Biblioteca') && (
        <section className="lower-grid" id="biblioteca-section" style={{ gridTemplateColumns: '1fr', marginTop: isMobile ? '38px' : 0 }}>
          <article className="materials-card">
            {!materiaId ? (
              <>
                <div className="card-head">
                  <div><p className="eyebrow">BIBLIOTECA</p><h3>Tus materias</h3></div>
                </div>
                <div className="method-grid" style={{marginTop:'18px'}}>
                  {materias.map(mat =>
                    <div className="method-card" onClick={() => chooseMateria(mat.id)} key={mat.id} style={{cursor:'pointer'}}>
                      <div style={{position:'absolute', top:8, right:8, display:'flex', gap:2}}>
                        <button title="Renombrar materia" onClick={(e) => { e.stopPropagation(); setMateriaToRename(mat.id); setMateriaModalOpen(true) }} style={{background:'none', border:'none', color:'var(--muted)', padding:4, cursor:'pointer', fontSize:12}}>✎</button>
                        <button title="Eliminar materia" onClick={(e) => { e.stopPropagation(); deleteMateria(mat.id) }} style={{background:'none', border:'none', color:'var(--danger)', padding:4, cursor:'pointer', fontSize:12}}>🗑</button>
                      </div>
                      <i>▤</i><strong>{mat.nombre}</strong><span>Ver cuadernos de esta materia</span>
                    </div>
                  )}
                  <button className="method-card" onClick={() => { setMateriaToRename(null); setMateriaModalOpen(true) }}>
                    <i>+</i><strong>Nueva materia</strong><span>Crea una carpeta para organizar tus cuadernos</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="card-head">
                  <div>
                    <button className="back" onClick={() => chooseMateria(null)}>← Materias</button>
                    <p className="eyebrow" style={{marginTop:'12px'}}>BIBLIOTECA · {materias.find(m=>m.id===materiaId)?.nombre?.toUpperCase()}</p>
                    <h3>Tu material de estudio</h3>
                  </div>
                  <label className="upload-link">+ Agregar<input type="file" accept=".pdf,.txt,.md" multiple onChange={addMaterial}/></label>
                </div>
                <div className="material-list">
                  {materials.length ? materials.map((m,i) => 
                    <div className="material" key={i} onClick={() => chooseMaterial(m)} onDoubleClick={() => setPreviewMaterial(m)} title="Doble clic para ver una vista previa" style={{cursor:'pointer', outline: activeMaterial?.id===m.id ? '2px solid #cdc4f2' : 'none', borderRadius: activeMaterial?.id===m.id ? '8px' : 0}}>
                      <i>{m.type==='PDF' ? 'PDF' : 'TXT'}</i>
                      <span><b>{m.name}</b><small>{m.type} · {m.size}{activeMaterial?.id===m.id ? ' · Seleccionado' : ''}</small></span>
                      <button onClick={(e) => { e.stopPropagation(); removeMaterial(m) }}>⋯</button>
                    </div>
                  ) : (
                    <div className="empty-material">
                      <span>⌁</span>
                      <div><b>Esta materia está lista</b><p>Agrega un PDF o un apunte para empezar a trabajar con él.</p></div>
                      <label className="secondary-mini">Agregar material<input type="file" accept=".pdf,.txt,.md" multiple onChange={addMaterial}/></label>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        </section>
      )}

      {showSection('Progreso') && (
        <section className="lower-grid" id="progreso-section" style={{ gridTemplateColumns: '1fr', marginTop: '38px' }}>
          <article className="timer-card">
            <div className="card-head">
              <div><p className="eyebrow">POMODORO</p><h3>Ritmo de enfoque</h3></div>
              <button className="settings" onClick={() => { setSettingsInput({ study: studyMinutes, short: shortBreakMinutes, long: longBreakMinutes, cycle: sessionsUntilLongBreak }); setSettingsOpen(true) }}>⚙</button>
            </div>
            <div className="timer">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52"/>
                <circle className="timer-progress" cx="60" cy="60" r="52" style={{strokeDashoffset:327-(327*progress/100)}}/>
              </svg>
              <div><b>{time}</b><span>{phaseLabel}{running ? '' : ' · en pausa'}</span></div>
            </div>
            <p style={{textAlign:'center', fontSize:'11px', color:'var(--muted)', fontWeight:600, marginTop:'2px'}}>
              Sesión {(completedFocusSessions % sessionsUntilLongBreak) + (phase === 'focus' ? 1 : 0)} de {sessionsUntilLongBreak} antes del descanso largo
            </p>
            <div className="timer-actions">
              <button onClick={() => { setRunning(!running); setNotice(running ? 'Pausa activada.' : (phase === 'focus' ? 'Sesión de enfoque iniciada.' : 'Descanso iniciado.')) }}>
                {running ? 'Pausar' : phase === 'focus' ? 'Iniciar enfoque' : 'Iniciar descanso'}
              </button>
              <button onClick={() => { setSeconds(totalSeconds); setRunning(false) }}>↺</button>
            </div>
            <PomodoroTodo/>
          </article>

          <article className="materials-card">
            <div className="card-head">
              <div><p className="eyebrow">TU BOSQUE</p><h3>{forest.length} {forest.length===1 ? 'planta cultivada' : 'plantas cultivadas'}</h3></div>
              <span style={{fontSize:'11px', color:'var(--muted)', fontWeight:600}}>Racha: {streak} 🔥</span>
            </div>
            {forest.length ? (
              <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginTop:'18px'}}>
                {forest.map((tree,i) => (
                  <span key={i} style={{fontSize:'26px', background:'var(--bg-hover)', borderRadius:'10px', width:'46px', height:'46px', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--line-soft)'}}>{tree}</span>
                ))}
              </div>
            ) : (
              <div className="empty-material" style={{marginTop:'18px'}}>
                <span>🌱</span>
                <div><b>Tu bosque está vacío</b><p>Completa una sesión de enfoque para plantar tu primer árbol.</p></div>
              </div>
            )}
          </article>
        </section>
      )}
    </main>

    {room && 
      <StudyRoom 
        method={current} apiKey={apiKey} providerLabel={providerInfo(aiProvider).label} aiResult={aiResult} previewData={previewData} previewError={previewError} previewVersion={previewVersion} loading={loading}
        materials={materials} activeMaterial={activeMaterial} onSelectMaterial={selectMaterialForStudy}
        onAddMaterial={addMaterial} onRemoveMaterial={removeMaterial} onPreviewMaterial={setPreviewMaterial}
        onClose={() => setRoom(false)} onGenerate={() => generate(current)}
      />
    } 
    {previewMaterial && <MaterialPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)}/>}
    {keyOpen && (
      <KeyModal
        value={keyInput} setValue={setKeyInput}
        provider={providerInput} setProvider={setProviderInput}
        model={modelInput} setModel={setModelInput}
        baseUrl={baseUrlInput} setBaseUrl={setBaseUrlInput}
        onSave={saveKey} onClose={() => setKeyOpen(false)}
      />
    )}
    {settingsOpen && <SettingsModal value={settingsInput} setValue={setSettingsInput} onSave={saveSettings} onClose={() => setSettingsOpen(false)}/>}
    {studyPickerOpen && (
      <StudyPickerModal
        materias={materias} materiaId={materiaId} materials={materials} activeMaterial={activeMaterial}
        onChooseMateria={chooseMateria} onChooseMaterial={chooseMaterial}
        onAddMaterial={addMaterial} onRemoveMaterial={removeMaterial} onPreviewMaterial={setPreviewMaterial}
        onCreateMateria={() => { setMateriaToRename(null); setMateriaModalOpen(true) }}
        onConfirm={beginStudy} onClose={() => setStudyPickerOpen(false)}
      />
    )}
    {materiaModalOpen && (
      <MateriaModal
        mode={materiaToRename ? 'rename' : 'create'}
        initialName={materiaToRename ? (materias.find(m=>m.id===materiaToRename)?.nombre || '') : ''}
        onSubmit={(nombre) => materiaToRename ? renameMateria(materiaToRename, nombre) : createMateria(nombre)}
        onClose={() => { setMateriaModalOpen(false); setMateriaToRename(null) }}
      />
    )}
    {notice && <div className="toast">✦ {notice}</div>}
  </div>
}

function StudyPickerModal({materias,materiaId,materials,activeMaterial,onChooseMateria,onChooseMaterial,onAddMaterial,onRemoveMaterial,onPreviewMaterial,onCreateMateria,onConfirm,onClose}){
  return (
    <div className="modal-backdrop">
      <section style={{width:'min(620px,100%)', maxHeight:'86vh', overflow:'auto', background:'var(--bg-elevated)', borderRadius:20, padding:'32px 34px', position:'relative', boxShadow:'var(--shadow-modal)'}}>
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow">{materiaId ? 'ELEGÍ EL CUADERNO' : 'ELEGÍ LA MATERIA'}</p>
        <h2 style={{font:"600 22px 'Playfair Display'", margin:'0 0 6px'}}>{materiaId ? 'Elige el cuaderno con el que vas a estudiar' : '¿Qué materia vas a estudiar?'}</h2>
        <p style={{fontSize:12, color:'var(--muted)', marginBottom:20}}>{materiaId ? 'Puedes agregar más material si hace falta.' : 'Elige una materia para ver sus cuadernos, o crea una nueva.'}</p>

        {!materiaId ? (
          <div className="method-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
            {materias.map(mat =>
              <button className="method-card" onClick={() => onChooseMateria(mat.id)} key={mat.id}>
                <i>▤</i><strong>{mat.nombre}</strong><span>Ver cuadernos</span>
              </button>
            )}
            <button className="method-card" onClick={onCreateMateria}>
              <i>+</i><strong>Nueva materia</strong><span>Crea una carpeta nueva</span>
            </button>
          </div>
        ) : (
          <>
            <button className="back" onClick={() => onChooseMateria(null)} style={{marginBottom:14}}>← Cambiar de materia</button>
            <div className="material-list">
              {materials.length ? materials.map((m,i) =>
                <div className="material" key={i} onClick={() => onChooseMaterial(m)} onDoubleClick={() => onPreviewMaterial(m)} title="Doble clic para ver una vista previa" style={{cursor:'pointer', outline: activeMaterial?.id===m.id ? '2px solid #cdc4f2' : 'none', borderRadius: activeMaterial?.id===m.id ? '8px' : 0}}>
                  <i>{m.type==='PDF' ? 'PDF' : 'TXT'}</i>
                  <span><b>{m.name}</b><small>{m.type} · {m.size}{activeMaterial?.id===m.id ? ' · Seleccionado' : ''}</small></span>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveMaterial(m) }}>⋯</button>
                </div>
              ) : (
                <div className="empty-material">
                  <span>⌁</span>
                  <div><b>Esta materia está lista</b><p>Agrega un PDF o un apunte para empezar.</p></div>
                </div>
              )}
            </div>
            <label className="upload-link study-add-btn" style={{marginTop:14}}>+ Agregar material<input type="file" accept=".pdf,.txt,.md" multiple onChange={onAddMaterial}/></label>
            <button className="primary wide" style={{marginTop:20, opacity: activeMaterial ? 1 : .5, cursor: activeMaterial ? 'pointer' : 'not-allowed'}} disabled={!activeMaterial} onClick={onConfirm}>Comenzar a estudiar →</button>
          </>
        )}
      </section>
    </div>
  )
}

function MateriaModal({mode,initialName,onSubmit,onClose}){
  const [name, setName] = useState(initialName || '')
  const submit = () => { const n = name.trim(); if (n) { onSubmit(n); onClose() } }
  return (
    <div className="modal-backdrop">
      <section className="key-modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="modal-icon">▤</span>
        <p className="eyebrow">{mode==='rename' ? 'RENOMBRAR MATERIA' : 'NUEVA MATERIA'}</p>
        {mode==='rename'
          ? <h2>Cambia el nombre<br/><em>de esta materia</em></h2>
          : <h2>Crea una carpeta<br/><em>para tus cuadernos</em></h2>}
        <p>{mode==='rename' ? 'Los cuadernos que ya subiste se mantienen igual, solo cambia el nombre.' : 'Cada materia guarda su propio material: lo que subas acá no se mezclará con el de otras materias.'}</p>
        <label>Nombre de la materia<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Historia, Anatomía..." autoFocus onKeyDown={e => e.key==='Enter' && submit()}/></label>
        <button className="primary wide" onClick={submit}>{mode==='rename' ? 'Guardar nombre →' : 'Crear materia →'}</button>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lista de tareas del Pomodoro: para organizar qué se va a hacer durante la
// sesión de estudio. Se guarda en localStorage, independiente de las
// materias/cuadernos (es una lista simple de "para hoy").
// ---------------------------------------------------------------------------
function PomodoroTodo(){
  const [todos, setTodos] = useState(() => { try { return JSON.parse(localStorage.getItem('lumina-pomodoro-todos') || '[]') } catch { return [] } });
  const [text, setText] = useState('');

  const persist = (next) => { setTodos(next); try { localStorage.setItem('lumina-pomodoro-todos', JSON.stringify(next)) } catch {} }

  const addTodo = () => {
    const t = text.trim();
    if (!t) return;
    persist([...todos, { id: Math.random().toString(36).substr(2, 9), text: t, done: false }]);
    setText('');
  }
  const toggleTodo = (id) => persist(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTodo = (id) => persist(todos.filter(t => t.id !== id));
  const pendingCount = todos.filter(t => !t.done).length;

  return (
    <div style={{marginTop:20, paddingTop:18, borderTop:'1px solid var(--line-soft)'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <p className="eyebrow" style={{margin:0}}>TAREAS DE ESTA SESIÓN</p>
        {todos.length > 0 && <span style={{fontSize:11, color:'var(--muted)', fontWeight:600}}>{pendingCount} pendiente{pendingCount===1 ? '' : 's'}</span>}
      </div>
      <div style={{display:'flex', gap:8}}>
        <input
          value={text} onChange={e=>setText(e.target.value)} onKeyDown={e => e.key==='Enter' && addTodo()}
          placeholder="Agregar una tarea…"
          style={{flex:1, border:'1px solid var(--line-soft)', borderRadius:8, padding:'9px 11px', background:'var(--bg-surface-alt)', color:'var(--ink)', fontSize:12, outlineColor:'var(--violet)'}}
        />
        <button onClick={addTodo} style={{background:'var(--bg-soft)', color:'var(--violet)', borderRadius:8, padding:'9px 13px', fontSize:12, fontWeight:600}}>+</button>
      </div>
      {todos.length > 0 ? (
        <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:12, maxHeight:180, overflow:'auto'}}>
          {todos.map(t => (
            <div key={t.id} style={{display:'flex', alignItems:'center', gap:9, padding:'7px 2px'}}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{width:14, height:14, flexShrink:0, accentColor: 'var(--violet)'}}/>
              <span style={{flex:1, fontSize:12, color: t.done ? 'var(--muted)' : 'var(--ink)', textDecoration: t.done ? 'line-through' : 'none'}}>{t.text}</span>
              <button onClick={() => removeTodo(t.id)} title="Eliminar tarea" style={{background:'none', color:'var(--muted)', fontSize:14, padding:2, lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{fontSize:11, color:'var(--muted)', marginTop:10}}>Agrega lo que quieras lograr durante este bloque de enfoque.</p>
      )}
    </div>
  )
}

function KeyModal({value,setValue,provider,setProvider,model,setModel,baseUrl,setBaseUrl,onSave,onClose}){
  const info = providerInfo(provider);
  const models = AI_MODELS[provider] || [];
  const isCustom = provider === 'openai_compatible';

  // Al cambiar de proveedor, si el modelo actual no pertenece a ese
  // proveedor, se para en el primero de su catálogo (o vacío si es "Otro").
  const onProviderChange = (id) => {
    setProvider(id);
    const list = AI_MODELS[id] || [];
    if (id === 'openai_compatible') { setModel(''); return }
    if (!list.find(x => x.id === model)) setModel(list[0]?.id || '');
  }

  return (
    <div className="modal-backdrop">
      <section className="key-modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="modal-icon">◇</span>
        <p className="eyebrow">CONFIGURACIÓN PERSONAL</p>
        <h2>Conecta tu propia<br/><em>IA con tu API Key</em></h2>
        <p>La clave se guarda únicamente en el almacenamiento de este navegador. Nunca la enviamos a un servidor.</p>

        <label>Proveedor de IA
          <select value={provider} onChange={e=>onProviderChange(e.target.value)} style={{width:'100%', marginTop:6, border:'1px solid var(--line-soft)', borderRadius:8, padding:12, background:'var(--bg-surface-alt)', color:'var(--ink)'}}>
            {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.sub}</option>)}
          </select>
        </label>

        {isCustom ? (
          <>
            <label>URL base de la API (compatible con OpenAI)<input value={baseUrl} placeholder="https://api.ejemplo.com/v1" onChange={e=>setBaseUrl(e.target.value)}/></label>
            <label>Nombre del modelo<input value={model} placeholder="ej: llama-3.1-70b" onChange={e=>setModel(e.target.value)}/></label>
          </>
        ) : (
          <label>Versión del modelo
            <select value={model} onChange={e=>setModel(e.target.value)} style={{width:'100%', marginTop:6, border:'1px solid var(--line-soft)', borderRadius:8, padding:12, background:'var(--bg-surface-alt)', color:'var(--ink)'}}>
              {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        )}

        <label>API Key de {info.label}<input type="password" value={value} placeholder={info.placeholder} onChange={e=>setValue(e.target.value)} autoFocus/></label>
        <button className="primary wide" onClick={onSave}>Guardar y validar →</button>
        {info.helpUrl && <small>¿No tienes una clave? <a href={info.helpUrl} target="_blank" rel="noopener noreferrer" style={{color: 'var(--violet)', textDecoration: 'underline'}}>{info.helpLabel}</a></small>}
      </section>
    </div>
  )
}

function SettingsModal({value,setValue,onSave,onClose}){
  const update = (field) => (e) => setValue(v => ({ ...v, [field]: e.target.value }))
  return (
    <div className="modal-backdrop">
      <section className="key-modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="modal-icon">⚙</span>
        <p className="eyebrow">AJUSTES DE ENFOQUE</p>
        <h2>Personaliza tu<br/><em>ciclo Pomodoro</em></h2>
        <p>Configura la duración de cada bloque de enfoque y de descanso.</p>
        <label>Minutos de enfoque<input type="number" min="1" max="180" value={value.study} onChange={update('study')} autoFocus/></label>
        <label>Minutos de descanso corto<input type="number" min="1" max="60" value={value.short} onChange={update('short')}/></label>
        <label>Minutos de descanso largo<input type="number" min="1" max="90" value={value.long} onChange={update('long')}/></label>
        <label>Sesiones de enfoque antes del descanso largo<input type="number" min="1" max="12" value={value.cycle} onChange={update('cycle')}/></label>
        <button className="primary wide" onClick={onSave}>Guardar ajustes →</button>
        <small>Se aplica a partir de tu próxima sesión sin interrumpir un enfoque en curso.</small>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vista previa de un material (PDF o texto) al hacer doble clic sobre él,
// tanto en Biblioteca como en el selector de la sala de estudio.
// ---------------------------------------------------------------------------
// Convierte un string base64 a Uint8Array (lo que espera pdf.js), sin pasar
// por un data: URL ni por un iframe.
function base64ABytes(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// Carga pdf.js (mozilla/pdf.js) una sola vez desde cdnjs y deja listo el
// worker. Se comparte entre todas las instancias de PdfPreview que se abran
// durante la sesión.
let pdfjsCargaPromise = null;
function cargarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsCargaPromise) return pdfjsCargaPromise;
  pdfjsCargaPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('No se pudo cargar el lector de PDF.'));
    document.head.appendChild(script);
  });
  return pdfjsCargaPromise;
}

// ---------------------------------------------------------------------------
// Vista previa de PDF SIN iframe: en vez de meter un data: URL dentro de un
// <iframe> (que en Safari iOS y en varios WebView de Android suele quedar en
// blanco o tirar error con archivos grandes), esto dibuja cada página del
// PDF como una imagen en un <canvas> usando pdf.js. Funciona igual en
// celular que en PC y no depende del visor de PDF nativo del navegador.
// ---------------------------------------------------------------------------
function PdfPreview({ data, nombre }) {
  const contenedorRef = useRef(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error

  useEffect(() => {
    let cancelado = false;
    setEstado('cargando');
    cargarPdfJs()
      .then((pdfjsLib) => pdfjsLib.getDocument({ data: base64ABytes(data) }).promise)
      .then(async (pdf) => {
        const contenedor = contenedorRef.current;
        if (cancelado || !contenedor) return;
        contenedor.innerHTML = '';
        const anchoDisponible = contenedor.clientWidth || 600;
        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelado) return;
          const page = await pdf.getPage(n);
          const escalaBase = anchoDisponible / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: Math.min(2.2, Math.max(0.5, escalaBase)) });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'display:block;width:100%;height:auto;margin:0 0 12px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.12)';
          contenedor.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
        if (!cancelado) setEstado('listo');
      })
      .catch((err) => {
        console.error('Error al mostrar la vista previa del PDF:', err);
        if (!cancelado) setEstado('error');
      });
    return () => { cancelado = true };
  }, [data]);

  if (estado === 'error') {
    return (
      <div style={{padding:'22px 16px', textAlign:'center'}}>
        <b style={{color:'var(--danger)', fontSize:13}}>No pudimos mostrar la vista previa de {nombre}.</b>
        <p style={{fontSize:11.5, color:'var(--muted)', margin:'6px 0 0'}}>Descargalo desde tu biblioteca para abrirlo con otra app.</p>
      </div>
    )
  }

  return (
    <div>
      {estado === 'cargando' && <p style={{padding:16, margin:0, fontSize:12, color:'var(--muted)'}}>Cargando vista previa…</p>}
      <div ref={contenedorRef} style={{padding: estado==='listo' ? 14 : 0}}/>
    </div>
  )
}

function MaterialPreviewModal({material,onClose}){
  const isPdf = (material.mimeType || '').includes('pdf');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isPdf) return;
    try { setText(decodeURIComponent(escape(atob(material.data)))) }
    catch { setText('No pudimos leer el contenido de este archivo.') }
  }, [material, isPdf]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        style={{width:'min(760px,100%)', height:'min(80vh,720px)', background:'var(--bg-elevated)', borderRadius:20, padding:'26px 28px', position:'relative', boxShadow:'var(--shadow-modal)', display:'flex', flexDirection:'column'}}
        onClick={e => e.stopPropagation()}
      >
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow" style={{margin:0}}>VISTA PREVIA</p>
        <h2 style={{font:"600 18px 'Playfair Display'", margin:'4px 0 14px', paddingRight:30}}>{material.name}</h2>
        <div style={{flex:1, minHeight:0, overflow:'auto', border:'1px solid var(--line-soft)', borderRadius:12, background:'var(--bg-surface-alt)'}}>
          {isPdf
            ? <PdfPreview data={material.data} nombre={material.name}/>
            : <pre style={{margin:0, padding:16, whiteSpace:'pre-wrap', wordBreak:'break-word', fontSize:12.5, lineHeight:1.6, color:'var(--ink)', fontFamily:'inherit'}}>{text}</pre>}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vistas nativas en React para los métodos "estrictos". En vez de bajar y
// reemplazar un .html, el objeto que devuelve Gemini (ya interpretado con
// parseStrictOutput) se renderiza directamente acá — funciona igual en
// celular que en PC, sin tocar ningún archivo.
// ---------------------------------------------------------------------------
const mezclar = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Deja pasar únicamente <b>...</b> (para resaltar datos clave) y saca
// cualquier otra etiqueta del texto que llega de Gemini.
const soloNegrita = (html) => String(html ?? '').replace(/<(?!\/?b\b)[^>]*>/gi, '');

// Mide la posición de un elemento relativa a un contenedor usando
// offsetLeft/offsetTop (no getBoundingClientRect, que se ve afectado por
// scroll/transform) — igual que hacía el Mapa_Sinoptico.html original.
function posicionRelativa(el, contenedor) {
  let x = 0, y = 0, actual = el;
  while (actual && actual !== contenedor) {
    x += actual.offsetLeft;
    y += actual.offsetTop;
    actual = actual.offsetParent;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

function MapaRama({ nodo, nivel, id, registrarRef }) {
  if (!nodo) return null;
  return (
    <div className="mm-nivel">
      <div ref={(el) => registrarRef(id, el)} className={`mm-nodo ${nivel === 0 ? 'raiz' : `mm-c${nivel % 10}`}`}>
        {nodo.nombre}
      </div>
      {nodo.hijos && nodo.hijos.length > 0 && (
        <div className="mm-hijos">
          {nodo.hijos.map((hijo, i) => (
            <MapaRama nodo={hijo} nivel={nivel + 1} id={`${id}-${i}`} registrarRef={registrarRef} key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function MapaView({ datos }) {
  const contenedorRef = useRef(null);
  const scrollRef = useRef(null);
  const svgRef = useRef(null);
  const nodosRef = useRef({});
  const [lineas, setLineas] = useState([]);

  const registrarRef = (id, el) => { if (el) nodosRef.current[id] = el; else delete nodosRef.current[id]; };

  // Lista de conexiones padre→hijo calculada a partir de los datos (no del
  // DOM), para saber qué nodos hay que unir con una línea.
  const enlaces = useMemo(() => {
    const acc = [];
    const recorrer = (nodo, id, parentId) => {
      if (!nodo) return;
      if (parentId) acc.push({ id, parentId });
      (nodo.hijos || []).forEach((h, i) => recorrer(h, `${id}-${i}`, id));
    };
    recorrer(datos, 'r', null);
    return acc;
  }, [datos]);

  useEffect(() => {
    function dibujar() {
      const contenedor = contenedorRef.current, svg = svgRef.current;
      if (!contenedor || !svg) return;
      svg.setAttribute('width', contenedor.scrollWidth);
      svg.setAttribute('height', contenedor.scrollHeight);
      const nuevasLineas = [];
      enlaces.forEach(({ id, parentId }) => {
        const padreEl = nodosRef.current[parentId], hijoEl = nodosRef.current[id];
        if (!padreEl || !hijoEl) return;
        const p = posicionRelativa(padreEl, contenedor), c = posicionRelativa(hijoEl, contenedor);
        const startX = p.x + p.width, startY = p.y + p.height / 2;
        const endX = c.x, endY = c.y + c.height / 2;
        nuevasLineas.push(`M ${startX} ${startY} C ${startX + 46} ${startY}, ${endX - 46} ${endY}, ${endX} ${endY}`);
      });
      setLineas(nuevasLineas);
    }
    dibujar();
    const raf = requestAnimationFrame(dibujar);
    window.addEventListener('resize', dibujar);
    let cancelado = false;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelado) dibujar(); });
    return () => { cancelado = true; cancelAnimationFrame(raf); window.removeEventListener('resize', dibujar); };
  }, [enlaces]);

  // -------------------------------------------------------------------
  // Antes el centrado se hacía con "justify-content:center" en .mm-scroll,
  // pero eso tiene un bug conocido de CSS: cuando el contenido centrado es
  // más ancho que el contenedor, la mitad que sobresale queda inalcanzable
  // con scroll (no se puede llegar al borde izquierdo real). Por eso ahora
  // .mm-container se deja alineado normal (sin centrado por CSS) y acá se
  // centra la posición inicial moviendo scrollLeft manualmente: el rango de
  // scroll queda 0..(scrollWidth-clientWidth) completo y accesible.
  // -------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const centrar = () => { el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2); };
    const raf = requestAnimationFrame(centrar);
    return () => cancelAnimationFrame(raf);
  }, [datos]);

  if (!datos) return null;

  return (
    <div className="mm-scroll" ref={scrollRef}>
      <div className="mm-container" ref={contenedorRef}>
        <svg className="mm-svg" ref={svgRef}>
          {lineas.map((d, i) => <path key={i} d={d} fill="none" stroke="#a89bdc" strokeWidth="2.5" />)}
        </svg>
        <div className="mm-nodos">
          <MapaRama nodo={datos} nivel={0} id="r" registrarRef={registrarRef} />
        </div>
      </div>
    </div>
  )
}

function CornellView({ datos }) {
  if (!datos) return null;
  return (
    <div>
      <div className="cn-header">
        {(datos.stickers || []).map((s, i) => (
          <span key={i} className="cn-sticker" style={{ top: s.top || '0px', left: s.left, right: s.right, transform: `rotate(${s.rot || '0deg'})` }}>{s.emoji}</span>
        ))}
        <h2>{datos.tituloPagina}</h2>
        <p className="cn-sub">{datos.subtitulo}</p>
      </div>
      {(datos.hojas || []).map((h, i) => {
        if (!h) return null;
        const tintes = (datos.tintes && datos.tintes.length) ? datos.tintes : ['#FFF6E8'];
        const tinte = tintes[i % tintes.length];
        return (
          <div key={i} className="cn-hoja">
            <div className="cn-fila-enc">
              <div className="cn-campo">
                <span className="cn-etiqueta">Título</span>
                <span className="cn-valor">{h.titulo}</span>
                <span className="cn-etiqueta" style={{ marginTop: 6 }}>Asignatura</span>
                <span className="cn-valor">{h.asignatura || datos.asignatura || ''}</span>
              </div>
              <div className="cn-campo">
                <span className="cn-etiqueta">Fecha</span>
                <span className="cn-valor">{h.fecha || datos.fecha || ''}</span>
                <span className="cn-etiqueta" style={{ marginTop: 6 }}>Hoja N°</span>
                <span className="cn-valor">{i + 1}</span>
              </div>
            </div>
            <div className="cn-cuerpo">
              <div className="cn-col cn-col-ideas">
                <p className="cn-titulo-col">Ideas clave</p>
                <ul>{(h.ideasClave || []).map((x, j) => <li key={j}>{x}</li>)}</ul>
              </div>
              <div className="cn-col">
                <p className="cn-titulo-col">Notas de la clase</p>
                <ul>{(h.notas || []).map((x, j) => <li key={j} dangerouslySetInnerHTML={{ __html: soloNegrita(x) }} />)}</ul>
              </div>
            </div>
            <div className="cn-fila-resumen" style={{ background: tinte }}>
              <p className="cn-titulo-resumen">{h.resumenTitulo || 'Resumen'}</p>
              <ul>{(h.resumen || []).map((x, j) => <li key={j} dangerouslySetInnerHTML={{ __html: soloNegrita(x) }} />)}</ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FlashcardsView({ banco }) {
  const [mazo, setMazo] = useState(() => mezclar(banco));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [bien, setBien] = useState(0);
  const [mal, setMal] = useState(0);
  const [errores, setErrores] = useState([]);
  const [fase, setFase] = useState(1);
  const [historial, setHistorial] = useState([]);

  if (!banco || !banco.length) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>La IA no devolvió tarjetas para este material.</p>

  if (!mazo.length) {
    return (
      <div className="fc-done">
        <b>🎉 ¡Completaste el mazo!</b>
        <div style={{ marginTop: 14 }}>
          <button className="fc-main" onClick={() => { setMazo(mezclar(banco)); setIdx(0); setBien(0); setMal(0); setErrores([]); setFase(1); setFlipped(false); setHistorial([]); }}>
            Repasar de nuevo
          </button>
        </div>
      </div>
    )
  }

  const card = mazo[idx];

  const calificar = (ok) => {
    setHistorial(h => [...h, { card, idx, ok, mazoAntes: mazo }]);
    let nuevosErrores = errores;
    if (ok) setBien(b => b + 1);
    else {
      setMal(m => m + 1);
      nuevosErrores = errores.some(c => c.p === card.p) ? errores : [...errores, card];
      setErrores(nuevosErrores);
    }
    const restante = mazo.filter((_, i) => i !== idx);
    setFlipped(false);
    if (restante.length === 0) {
      if (nuevosErrores.length > 0) {
        setMazo(mezclar(nuevosErrores)); setErrores([]); setFase(2);
      } else {
        setMazo([]);
      }
      setIdx(0);
    } else {
      setMazo(restante);
      setIdx(i => i >= restante.length ? 0 : i);
    }
  }

  const siguiente = () => { setFlipped(false); setIdx(i => (i + 1) % mazo.length) }
  const atras = () => {
    if (!historial.length) return;
    const ultima = historial[historial.length - 1];
    setHistorial(h => h.slice(0, -1));
    if (ultima.ok) setBien(b => Math.max(0, b - 1));
    else { setMal(m => Math.max(0, m - 1)); setErrores(e => e.filter(c => c.p !== ultima.card.p)); }
    setMazo(ultima.mazoAntes);
    setIdx(ultima.idx);
    setFlipped(false);
  }

  return (
    <div className="fc-wrap">
      <span className={`fc-banner${fase === 2 ? ' fase2' : ''}`}>{fase === 1 ? 'FASE 1 · VUELTA COMPLETA' : 'FASE 2 · REPASO DE ERRORES'}</span>
      <div className="fc-dash">
        <div>Tarjeta: <b>{idx + 1}</b>/<b>{mazo.length}</b></div>
        <div style={{ color: 'var(--success)' }}>Bien: <b>{bien}</b></div>
        <div style={{ color: 'var(--danger)' }}>Mal: <b>{mal}</b></div>
      </div>
      <div className="fc-container">
        <div className={`fc-card${flipped ? ' volteada' : ''}`} onClick={() => setFlipped(f => !f)}>
          <div className="fc-face front">
            <div className="fc-texto">{card.p}</div>
            <div className="fc-badge">PREGUNTA</div>
          </div>
          <div className="fc-face back">
            <div className="fc-texto">{card.r}</div>
            <div className="fc-badge">RESPUESTA</div>
          </div>
        </div>
      </div>
      <div className="fc-nav">
        <button onClick={atras} disabled={!historial.length}>⬅ Atrás</button>
        <button className="fc-main" onClick={() => setFlipped(f => !f)}>Voltear</button>
        <button onClick={siguiente}>Siguiente ➡</button>
      </div>
      <div className={`fc-eval${flipped ? ' visible' : ''}`}>
        <button className="fc-btn-mal" onClick={() => calificar(false)}>✗ Estaba Mal</button>
        <button className="fc-btn-bien" onClick={() => calificar(true)}>✓ Estaba Bien</button>
      </div>
    </div>
  )
}

function TestView({ preguntas: preguntasCrudas }) {
  const [preguntas] = useState(() => mezclar(preguntasCrudas || []).map(p => ({
    ...p,
    ops: mezclar((p.ops || []).map(o => ({ texto: o.replace('*', ''), correcta: o.includes('*') })))
  })));
  const [respuestas, setRespuestas] = useState({});
  const [mostrar, setMostrar] = useState(false);

  if (!preguntas.length) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>La IA no devolvió preguntas para este material.</p>

  const elegir = (qi, oi) => { if (!mostrar) setRespuestas(r => ({ ...r, [qi]: oi })) }
  const correctas = preguntas.filter((p, qi) => respuestas[qi] !== undefined && p.ops[respuestas[qi]].correcta).length;
  const letras = ['A', 'B', 'C', 'D'];

  return (
    <div>
      {preguntas.map((p, qi) => (
        <div key={qi} className={`qz-card${mostrar ? ' qz-bloqueado' : ''}`}>
          <div className="qz-texto"><span className="qz-num">{qi + 1}.</span>{String(p.t || '').replace(/^\d+\.\s*/, '')}</div>
          <div className="qz-opciones">
            {p.ops.map((op, oi) => {
              const elegida = respuestas[qi] === oi;
              let clase = 'qz-op';
              if (mostrar) { if (op.correcta) clase += ' ok'; else if (elegida) clase += ' bad'; }
              else if (elegida) clase += ' sel';
              return (
                <div key={oi} className={clase} onClick={() => elegir(qi, oi)}>
                  <span className="qz-letra">{letras[oi]}</span>
                  <span>{op.texto}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {!mostrar ? (
        <div className="qz-btnwrap">
          <button onClick={() => setMostrar(true)} disabled={Object.keys(respuestas).length < preguntas.length}>Ver resultados ➡</button>
        </div>
      ) : (
        <div className="qz-resumen">
          <div className="qz-resumen-head">
            <h3>Resumen de repaso</h3>
            <span className="qz-score">{correctas} de {preguntas.length} correctas · {Math.round(correctas / preguntas.length * 100)}%</span>
          </div>
          {preguntas.map((p, qi) => {
            const elegida = respuestas[qi];
            const esCorrecta = elegida !== undefined && p.ops[elegida].correcta;
            const correctaIdx = p.ops.findIndex(o => o.correcta);
            return (
              <div key={qi} className={`qz-item ${esCorrecta ? 'ok' : 'mal'}`}>
                <div className="qz-item-top">
                  <span className="qz-item-estado">{esCorrecta ? 'Correcto' : 'Incorrecto'}</span>
                  <span className="qz-item-label">Pregunta {qi + 1}</span>
                </div>
                <div className="qz-item-pregunta">{String(p.t || '').replace(/^\d+\.\s*/, '')}</div>
                {!esCorrecta && elegida !== undefined && <div className="qz-item-elegida">Tu respuesta: {p.ops[elegida].texto}</div>}
                {correctaIdx > -1 && <div className="qz-item-correcta">Respuesta correcta: {p.ops[correctaIdx].texto}</div>}
                {p.info && <div className="qz-item-info">{p.info}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StudyRoom({method,apiKey,providerLabel,aiResult,previewData,previewError,previewVersion,loading,materials,activeMaterial,onSelectMaterial,onAddMaterial,onRemoveMaterial,onPreviewMaterial,onClose,onGenerate}){
  const [answer,setAnswer]=useState(false),[notes,setNotes]=useState('');
  const [removingId, setRemovingId] = useState(null);
  const writing=['feynman','blurting','cornell','resumir','subrayar'].includes(method[0]);
  const strict = STRICT_METHODS.includes(method[0]);

  // ---------------------------------------------------------------------
  // Pantalla completa para la propuesta de Gemini (mapa mental, Cornell,
  // flashcards, test...). Usa la Fullscreen API nativa del navegador sobre
  // el propio <section className="ai-result">, así que no hace falta
  // duplicar ningún componente: al entrar en fullscreen el CSS
  // (.ai-result:fullscreen) simplemente lo agranda a toda la pantalla.
  // ---------------------------------------------------------------------
  const aiResultRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Muchos navegadores móviles (Safari en iOS sobre todo, y algunos WebView
  // de Android) no implementan requestFullscreen() sobre elementos que no
  // sean <video>: ahí el botón de pantalla completa quedaba sin hacer nada.
  // Detectamos ese caso una sola vez y, si no hay soporte real, usamos un
  // fallback "de mentira" con position:fixed (clase .is-pseudo-fullscreen)
  // que logra el mismo resultado visual sin depender de la API nativa.
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const soportaFullscreenNativo = useMemo(() => {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Mientras el fallback está activo, bloqueamos el scroll del body para
  // que no "se mueva" el fondo detrás del panel fijo en pantalla completa.
  useEffect(() => {
    if (!pseudoFullscreen) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [pseudoFullscreen]);

  const toggleFullscreen = () => {
    const el = aiResultRef.current;
    if (!el) return;
    if (!soportaFullscreenNativo) {
      setPseudoFullscreen(p => !p);
      return;
    }
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  }

  const fullscreenActivo = isFullscreen || pseudoFullscreen;

  // Antes de sacar el material de la lista, lo deja "flotar" 280ms con la
  // animación de eliminación para que no desaparezca de golpe.
  const handleRemove = (m) => {
    if (removingId) return;
    setRemovingId(m.id);
    setTimeout(() => { onRemoveMaterial(m); setRemovingId(null) }, 280);
  }

  const downloadResult = () => {
    // Ya no depende de ningún archivo externo: esto solo guarda el bloque
    // de código que devolvió Gemini, por si alguien lo quiere revisar o
    // pegarlo a mano en su HTML de siempre. No hace falta para usar la app.
    if (!aiResult) return;
    const blob = new Blob([aiResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${method[1]}${activeMaterial ? '-' + activeMaterial.name.replace(/\.[^/.]+$/, '') : ''}.${strict ? 'js' : 'txt'}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  return (
    <div className="study-overlay" onClick={onClose}>
      <section className="study-room" onClick={(e) => e.stopPropagation()}>
        <header className="study-head">
          <button className="back" onClick={onClose}>← Volver al panel</button>
          <div><span>{method[3]}</span><b>{method[1]}</b></div>
          <button
            className="ai-action"
            onClick={onGenerate}
            disabled={loading || (apiKey && !activeMaterial)}
          >
            ✦ {loading ? 'Analizando…' : !apiKey ? 'Conectar IA' : !activeMaterial ? 'Selecciona un archivo' : aiResult ? `Regenerar con ${providerLabel}` : `Analizar con ${providerLabel}`}
          </button>
        </header>
        <div className="study-body">
          <aside className="study-side">
            <p className="eyebrow" style={{margin:0}}>MATERIAL ACTIVO</p>
            {materials.length === 0 ? (
              <div className="empty-source">▤<b>Aún no elegiste un material</b><span>Agrega un PDF o un apunte con el botón de abajo.</span></div>
            ) : (
              <div className="material-selector" style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px'}}>
                {materials.map(m => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMaterial(m)}
                    onDoubleClick={() => onPreviewMaterial(m)}
                    title="Doble clic para ver una vista previa"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px', textAlign: 'left', borderRadius: '8px', border: '1px solid var(--line)',
                      background: activeMaterial?.id === m.id ? 'var(--bg-soft)' : 'var(--bg-surface)', cursor: 'pointer',
                      color: 'var(--ink)', fontSize: '11px', fontWeight: activeMaterial?.id === m.id ? '600' : '400',
                      opacity: removingId === m.id ? 0 : 1,
                      transform: removingId === m.id ? 'scale(0.82) translateX(18px)' : 'scale(1) translateX(0)',
                      maxHeight: removingId === m.id ? '0px' : '60px',
                      marginBottom: removingId === m.id ? '-10px' : '0px',
                      overflow: 'hidden',
                      transition: 'opacity 0.28s ease, transform 0.28s ease, max-height 0.28s ease, margin 0.28s ease'
                    }}
                  >
                    <span style={{flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                      <i>{m.type === 'PDF' ? '📄 ' : '📝 '}</i> {m.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(m) }}
                      title="Eliminar material"
                      disabled={removingId === m.id}
                      className="study-material-remove"
                      style={{
                        flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--danger)',
                        cursor: 'pointer', padding: '5px', lineHeight: 1, display: 'flex', alignItems: 'center',
                        animation: removingId === m.id ? 'trash-shake 0.28s ease' : 'none'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        <path d="M10 11v6"/>
                        <path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="upload-link study-add-btn" style={{fontSize:'10px', marginTop:'16px'}}>+ Agregar<input type="file" accept=".pdf,.txt,.md" multiple onChange={onAddMaterial}/></label>
            <style>{'@keyframes trash-shake{0%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}100%{transform:rotate(0)}}'}</style>
          </aside>
          <article className="canvas">
            <p className="eyebrow">{method[1].toUpperCase()}</p>
            <h2>{method[0]==='mind' ? 'Organiza las ideas de tu tema.' : method[0]==='recall' ? 'Pon a prueba la memoria antes de mirar.' : method[0]==='sq3r' ? 'Lee con preguntas que orientan tu atención.' : method[0]==='resumir' ? 'Convierte tu material en una síntesis clara.' : method[0]==='subrayar' ? 'Identifica lo esencial de tu material.' : 'Convierte lo que estudias en conocimiento propio.'}</h2>

            {loading && (
              <section className="ai-result" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{
                  display:'inline-block', width:'14px', height:'14px', borderRadius:'50%',
                  border:'2px solid var(--success-border)', borderTopColor:'var(--success)', animation:'spin 0.8s linear infinite'
                }}/>
                <b>{providerLabel} está preparando tu {method[1].toLowerCase()}…</b>
                <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
              </section>
            )}

            {!loading && aiResult && (
              <section className={`ai-result${pseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`} ref={aiResultRef}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <b>✦ Propuesta de {providerLabel}</b>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button
                      onClick={toggleFullscreen}
                      title={fullscreenActivo ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
                      style={{
                        color:'var(--violet)', background:'var(--bg-surface)', border:'1px solid var(--line-soft)', borderRadius:'7px',
                        padding:'5px 9px', fontSize:'10px', fontWeight:600, cursor:'pointer'
                      }}
                    >{fullscreenActivo ? '⤡ Salir' : '⛶ Pantalla completa'}</button>
                    <button
                      onClick={downloadResult}
                      style={{
                        color:'var(--success)', background:'var(--bg-surface)', border:'1px solid var(--success-border)', borderRadius:'7px',
                        padding:'5px 9px', fontSize:'10px', fontWeight:600, cursor:'pointer'
                      }}
                    >⬇ Descargar código</button>
                  </div>
                </div>

                {strict && previewData && (
                  <div style={{marginTop:14}}>
                    <ErrorBoundary
                      key={previewVersion}
                      fallback={(msg) => (
                        <div style={{padding:'22px 16px', textAlign:'center', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:12}}>
                          <b style={{color:'var(--danger)', fontSize:13}}>No pudimos mostrar esta vista.</b>
                          <p style={{fontSize:11.5, color:'var(--muted)', margin:'6px 0 0'}}>El contenido que devolvió la IA no tenía el formato esperado. Descargá el código de arriba y revisalo, o generá el contenido de nuevo.</p>
                        </div>
                      )}
                    >
                      {method[0]==='mind' && <MapaView datos={previewData} />}
                      {method[0]==='cornell' && <CornellView datos={previewData} />}
                      {method[0]==='spaced' && <FlashcardsView banco={previewData} />}
                      {method[0]==='recall' && <TestView preguntas={previewData} />}
                    </ErrorBoundary>
                  </div>
                )}

                {strict && !previewData && (
                  <p style={{margin:'6px 0 0', fontSize:'10px', color:'var(--danger)', fontWeight:600}}>
                    No pudimos interpretar el resultado automáticamente{previewError ? `: ${previewError}` : ''}. Descargá el código de abajo y revisalo, o regenerá con {providerLabel}.
                  </p>
                )}

                {!strict && (
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '10px', lineHeight: '1.5' }}>{aiResult}</div>
                )}
              </section>
            )}
            
            {method[0]==='mind' && !previewData && <div className="mind-map"><div className="mind-node root">Idea Central</div><div className="mind-node n1">Concepto 1</div><div className="mind-node n2">Concepto 2</div><div className="mind-node n3">Concepto 3</div><button className="add-node">+ Añadir idea</button></div>}
            {method[0]==='recall' && !previewData && <div className="flashcard"><small>ESTUDIO · TARJETA 1/1</small><h3>{answer ? 'Usa tu material de la izquierda para extraer respuestas.' : '¿Qué recuerdas sobre el material principal?'}</h3><button onClick={()=>setAnswer(!answer)}>{answer ? 'Ocultar respuesta' : 'Mostrar respuesta'}</button><div><button>Difícil</button><button>La recordé</button></div></div>}
            {writing && <div className="writing-space"><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Empieza a explicar con tus propias palabras lo que leíste del material seleccionado…"/><button className="primary" onClick={onGenerate}>Analizar texto y notas con {providerLabel} →</button></div>}
            {method[0]==='sq3r' && <div className="steps">{['Explorar','Preguntar','Leer','Recitar','Repasar'].map((s,i) => <button className={i===0 ? 'step current' : 'step'} key={s}><i>{i+1}</i><span><b>{s}</b><small>{i===0 ? 'Observa los títulos y estructura del material.' : 'Disponible al completar el paso anterior.'}</small></span></button>)}</div>}
            {method[0]==='spaced' && !previewData && <div className="leitner">{['Hoy','En 2 días','En 5 días','Dominadas'].map((x,i) => <div key={x}><b>{[6,4,2,12][i]}</b><span>{x}</span></div>)}</div>}
          </article>
        </div>
      </section>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallback={() => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:10, fontFamily:'sans-serif', textAlign:'center', padding:20 }}>
      <b style={{ fontSize:16, color:'#303249' }}>Algo salió mal.</b>
      <p style={{ fontSize:13, color:'#88859c', maxWidth:340 }}>Recargá la página para volver a intentarlo. Tu biblioteca y tu progreso quedaron guardados.</p>
      <button onClick={() => location.reload()} style={{ background:'#7766c9', color:'#fff', border:'none', padding:'9px 20px', borderRadius:8, fontWeight:600, cursor:'pointer' }}>Recargar</button>
    </div>
  )}>
    <App />
  </ErrorBoundary>
)