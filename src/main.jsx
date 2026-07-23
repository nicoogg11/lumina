import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

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

const PROMPT_MAPA = `Actuá como un experto en pedagogía, síntesis de información y arquitectura de datos. Tu objetivo es convertir el texto que te voy a dar en un mapa conceptual extremadamente completo y jerarquizado. Analizá el texto en profundidad: ideas principales, matices, relaciones causa-efecto, clasificaciones y detalles relevantes. Organizá todo en un objeto JavaScript (datosMapa) con la estructura anidada nombre/hijos. Reglas estrictas: Exhaustividad: no omitas información importante. Si el texto es denso, desglosalo en tantos niveles como haga falta para que sea una herramienta de estudio total, cubriendo el documento completo (no solo el principio). Longitud de los nodos: cada "nombre" debe ser corto y visual (idealmente 3 a 12 palabras). Si un concepto necesita más desarrollo, creá un hijo con el detalle en vez de alargar el nombre del padre. Texto plano únicamente: no uses HTML, markdown, negritas ni asteriscos dentro de los "nombre". Solo texto simple. Sintaxis: el código debe ser JavaScript 100% válido, con comillas internas escapadas (\") y todas las llaves/corchetes balanceados. Formato de entrega: devolvé ÚNICAMENTE el bloque de código del objeto datosMapa, en texto plano, sin bloques \`\`\` de markdown, sin introducciones ni explicaciones.
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

const PROMPT_CORNELL = `Actuá como un profesor experto en técnicas de estudio y en la metodología de Apuntes Cornell. Tu objetivo es procesar la información que te voy a dar y transformarla en un resumen completo, estructurado y exhaustivo, sin dejar ningún dato importante afuera y sin inventar información que no esté en el texto original. Entregá ÚNICAMENTE el código JavaScript de la constante datosCornell, respetando esta estructura: const datosCornell = { tituloPagina: "Método Cornell ", subtitulo: "[Título general del tema] ", asignatura: "[Materia a la que pertenece] ", fecha: "[Fecha o época del tema, ej: 2024 o S. XIX] ", stickers: [ { emoji: "[Emoji representativo 1] ", top: "8px ", left: "6% ", rot: "-12deg " }, { emoji: "[Emoji representativo 2] ", top: "14px ", right: "6% ", rot: "10deg " } ], tintes: [ "#FFF6E8 ", "#EAF6F3 ", "#F3EEFB "], hojas: [ { titulo: "[Subtema 1 - sé específico] ", ideasClave: [ "[Pregunta o concepto 1] ", "[Pregunta o concepto 2] "], notas: [ "[Nota detallada. Usá <b>...</b> para resaltar datos, fechas o conceptos clave en naranja.] " ], resumen: [ "[Síntesis de esta hoja en 1 o 2 oraciones integradoras.] "] } ] }; REGLAS ESTRICTAS: Sé exhaustivo: dividí el tema en tantas "hojas" como sean necesarias (mínimo 3 o 4 para un tema con desarrollo medio; más si el material es extenso). En notas, es OBLIGATORIO usar <b>...</b> alrededor de las palabras clave, fechas y datos duros. En ideasClave, formulá preguntas cortas o palabras disparadoras que se correspondan 1 a 1 con las notas. Si no encontrás emojis claramente relacionados con el tema, elegí los más neutros/genéricos posibles antes que forzar algo que no tenga sentido (ej: 📖 y 📝). Fidelidad: usá solamente la información del texto que te paso. No completes con conocimiento general si no está en la fuente. Sintaxis: JavaScript válido, comillas internas escapadas, sin comas colgantes. Entregable: SOLO el código JavaScript, en texto plano, sin bloques \`\`\` de markdown, sin explicaciones antes o después.`

const PROMPT_FLASHCARDS = `Actuá como un extractor de datos preciso. Tu única tarea es leer el texto de estudio, apuntes o documento adjunto que te voy a proporcionar y transformarlo en un array de objetos de JavaScript llamado 'bancoPreguntas'. Reglas estrictas: Extraé las ideas principales en formato Pregunta y Respuesta. No hay límite fijo de cantidad: generá tantas como hagan falta para cubrir TODO el documento de punta a punta, sin dejar secciones sin representar. Formato de salida exacto: const bancoPreguntas = [ { p: "¿Pregunta extraída?", r: "Respuesta textual y literal extraída del documento." } ]; Las respuestas deben ser extensas, completas y 100% fieles al texto original, copiadas de forma literal (no resumas, no simplifiques, no agregues información que no esté en el texto). Las preguntas NUNCA deben incluir numeración, aunque el texto original esté numerado (ej: si el original dice "5. ¿Qué es...?", vos escribís "¿Qué es...?"). Revisá cada pregunta antes de entregar para confirmar que no quedó ningún número al principio. No repitas el mismo concepto en dos preguntas distintas. Devolvé ÚNICAMENTE el bloque de código de la constante 'bancoPreguntas', en texto plano, SIN usar bloques de markdown con \`\`\` (nada de comillas triples). No agregues introducciones, saludos, comentarios ni explicaciones antes o después.`

const PROMPT_TEST = `Sos un profesor experto creando un examen de práctica. Leé estos apuntes con atención y creá la mayor cantidad posible de preguntas de opción múltiple, cubriendo TODOS los conceptos, definiciones, fechas, nombres, procesos y datos que aparezcan. No omitas nada importante y no repitas el mismo concepto en dos preguntas distintas. Devolveme únicamente esto, en texto plano y sin bloques \`\`\` de markdown, sin texto antes ni después:
const PREGUNTAS = [
{ t: "¿Pregunta? ", ops: [ "Opción A ", "Opción correcta* ", "Opción C ", "Opción D "], info: "Explicación breve usando las palabras de los apuntes. " },
];
Reglas estrictas:
La opción correcta lleva * pegado al final, sin espacio.
Exactamente 4 opciones por pregunta.
Las opciones incorrectas deben ser plausibles (mismo tipo de dato, época o categoría que la correcta), nunca obvias ni absurdas.
Todas las opciones de una misma pregunta deben tener una extensión similar entre sí, para que la correcta no se note por ser más larga o más detallada que el resto.
"info" debe explicar con las palabras de los apuntes, sin inventar ni agregar datos que no estén en el texto.
Variá el tipo de pregunta: definiciones, ejemplos, comparaciones, fechas, causas, consecuencias.
Comillas internas escapadas correctamente (") para que el JavaScript sea válido.
Solo el código JavaScript, nada más.`

const PROMPT_RECALL = `Actuá como un experto en la técnica de estudio Active Recall (recuperación activa). Tu tarea es leer el material que te voy a dar y transformarlo en un array de preguntas de autoevaluación libre, SIN opciones de respuesta, para que el estudiante intente recordar la respuesta de memoria antes de revelarla. Reglas estrictas: Generá tantas preguntas como hagan falta para cubrir TODO el material de punta a punta, sin dejar secciones sin representar. Las preguntas deben obligar a recuperar información de memoria (evitá preguntas de sí/no; priorizá "¿Qué es...?", "¿Por qué...?", "¿Cómo...?", "Explicá..."). Las respuestas deben ser completas, claras y 100% fieles al texto original, sin inventar información que no esté en el material. No repitas el mismo concepto en dos preguntas distintas. Formato de salida exacto: const preguntasRecall = [ { p: "¿Pregunta?", r: "Respuesta completa y fiel al material." } ]; Devolvé ÚNICAMENTE el bloque de código de la constante 'preguntasRecall', en texto plano, SIN usar bloques de markdown con \`\`\` (nada de comillas triples). No agregues introducciones, saludos, comentarios ni explicaciones antes o después.`

const PROMPT_BLURTING = `Actúa como un Tutor Académico Experto en Técnicas de Estudio Activo (Blurting / Active Recall).

Tu objetivo es procesar la información o tema que te proporcionaré y generar ÚNICAMENTE el bloque de código en JavaScript \`datosBlurting\` ajustado con las siguientes especificaciones:

REGLAS DE EXTRACCIÓN:
1. "subtitulo": Pon el tema o título del apunte/capítulo de forma concisa (ej: "Sistema Nervioso Central", "Revolución Industrial").
2. "tiempoMinutos": Calcula un tiempo óptimo de vaciado en minutos (entre 3 y 10 minutos dependiendo del volumen del material).
3. "conceptosClave": Extrae entre 8 y 15 conceptos indispensables.
   - Cada concepto debe ser muy breve (de 1 a 4 palabras máximo, ej: "Primera Junta", "Sinapsis química", "Ley de Ohm").
   - NO uses oraciones largas ni explicaciones, ya que se usan para la coincidencia exacta de texto en el sistema de corrección.

FORMATO DE SALIDA ESTRICTO:
Responde EXCLUSIVAMENTE con el bloque de código dentro de Javascript. No agregues introducciones, comentarios, explicaciones ni saludos antes o después del código.

const datosBlurting = {
    tituloPagina: "Blurting",
    subtitulo: "AQUÍ_EL_TÍTULO_DEL_TEMA",
    tiempoMinutos: AQUÍ_EL_TIEMPO_EN_NUMERO,
    conceptosClave: [
        "Concepto 1",
        "Concepto 2",
        "Concepto 3",
        "Concepto 4"
    ]
};`

const PROMPT_FEYNMAN = `Actúa como un profesor experto en el Método de Estudio Feynman. Tu objetivo es procesar el material adjunto y explicarlo de la forma más clara y sencilla posible, como si le enseñaras a alguien que no sabe nada del tema. Devolvé ÚNICAMENTE el código JavaScript de la constante FEYNMAN_DATA, respetando esta estructura exacta (podés usar **negritas** dentro de los textos para resaltar lo esencial, y anteponer "> " a paso4_analogia_y_resumen para presentarlo como una cita):
const FEYNMAN_DATA = {
  titulo: "Título del tema",
  materia: "Materia o área a la que pertenece",
  paso1_concepto: "Definición central y concisa del concepto, con **negritas** en los términos clave.",
  paso2_explicacion_simple: "Explicación detallada como si fuera para un niño de 10 años, con analogías cotidianas y evitando jerga compleja.",
  paso3_lagunas_y_puntos_clave: [
    { punto: "Punto crítico 1", explicacion: "Explicación clara del punto donde más se suele fallar o confundir, con **negritas** en lo esencial." },
    { punto: "Punto crítico 2", explicacion: "Explicación clara." }
  ],
  paso4_analogia_y_resumen: "> Una analogía sencilla de la vida cotidiana, seguida de un resumen final breve."
};
REGLAS ESTRICTAS: Sé fiel al material adjunto, no inventes datos que no estén en el texto. Generá tantos elementos en paso3_lagunas_y_puntos_clave como sean necesarios para cubrir los conceptos críticos del tema (mínimo 3). Usá comillas internas escapadas (\\") para que el JavaScript sea válido, sin comas colgantes. Entregá SOLO el código JavaScript, en texto plano, sin bloques de markdown con \`\`\` (nada de comillas triples), sin introducciones, saludos ni explicaciones antes o después.`

const PROMPT_TIMELINE = `Actúa como un profesor experto y creador de material didáctico. Necesito que me ayudes a estudiar el material adjunto mediante una línea de tiempo conectada, donde cada evento se relacione lógicamente con el siguiente para entender la causa y efecto en la historia o proceso.

Tengo una aplicación web que renderiza esta línea de tiempo automáticamente, por lo que necesito que tu respuesta sea ÚNICAMENTE un objeto de JavaScript válido con la siguiente estructura exacta:

const datosTimeline = {
    tituloPagina: "Línea de Tiempo",
    subtitulo: "[Escribe un subtítulo adecuado al tema del material]",
    eventos: [
        {
            fecha: "[Fecha o período del evento]",
            titulo: "[Nombre claro del evento o hito]",
            descripcion: "[Explicación concisa y clara de lo que ocurrió. Usa <b>concepto</b> para resaltar palabras clave]",
            conexion: "➡ [Explica cómo este evento se conecta o desencadena el siguiente paso en la historia]"
        }
    ]
};

Reglas estrictas que debes seguir:
1. La cronología debe ser estrictamente coherente y lógica de principio a fin, basada en el material.
2. El campo "conexion" en el último evento puede explicar el impacto final o cierre del proceso.
3. No incluyas explicaciones previas ni posteriores, devuelve solamente el código JavaScript.`

const PROMPT_TABLA = `Actúa como un profesor experto y creador de material didáctico. Necesito que me ayudes a estudiar el material adjunto mediante una tabla comparativa muy completa y precisa, extrayendo los elementos comparables que aparezcan en el documento.

Tengo una aplicación web que renderiza la tabla automáticamente, por lo que necesito que tu respuesta sea ÚNICAMENTE un objeto de JavaScript válido con la siguiente estructura exacta:

const datosTabla = {
    tituloPagina: "Tabla Comparativa",
    subtitulo: "[Escribe un subtítulo adecuado al tema del material]",
    entidades: ["[Entidad 1]", "[Entidad 2]"],
    filas: [
        {
            criterio: "[Nombre del primer criterio de comparación]",
            valores: [
                "[Información correspondiente a la Entidad 1]",
                "[Información correspondiente a la Entidad 2]"
            ]
        }
    ]
};

Reglas estrictas que debes seguir:
1. El array "valores" en cada fila DEBE tener exactamente la misma cantidad de elementos que el array "entidades".
2. La información debe ser concisa, directa y fácil de estudiar.
3. Usa la etiqueta <b>texto</b> para resaltar los conceptos clave más importantes, y si hay listas de elementos, sepáralos usando <br>• elemento.
4. No incluyas explicaciones previas ni posteriores, devuelve solamente el código JavaScript.`

const PROMPT_SINTESIS = `Actúa como un diseñador instruccional y docente experto en técnicas de estudio. Tu tarea es analizar el texto/apunte adjunto y convertirlo en el objeto de datos JavaScript \`datosSintesis\` respetando la técnica del Embudo (reducción progresiva por niveles de abstracción). REGLAS PARA CADA CAMPO DEL OBJETO: - \`tituloPagina\`: Mantener siempre el valor "Síntesis por Embudo". - \`subtitulo\`: Título corto y descriptivo del tema. - \`asignatura\`: Nombre de la materia, disciplina o tema general. - \`fecha\`: Época histórica, fecha, unidad académica o contexto del texto. - \`textoOrigen\`: El texto completo base que servirá de estudio (unificado en un solo párrafo claro). - \`capa1Ideal\`: Compresión del texto original al 50% aprox. Mantiene la coherencia pero elimina ejemplos secundarios, datos de relleno y adornos. - \`capa2Ideal\`: Un array de JavaScript con entre 3 y 5 ítems/puntos clave. Cada punto debe ser una frase ultra-corta con la idea principal de un bloque. - \`capa3Ideal\`: Una única oración contundente ("Elevator Pitch") que resuma la esencia total del tema. REQUISITO DE SALIDA: Devuelve ÚNICAMENTE el bloque de código JavaScript \`const datosSintesis = { ... };\` con la información rellenada, sin explicaciones previas ni posteriores, listo para copiar y reemplazar dentro del tag <script> del HTML. Texto/Material de estudio a procesar: Son los archivos que te envié`

const PROMPT_SQ3R = `Actuá como un experto en diseño instruccional, pedagogía de estudio activo y procesamiento de información.

A partir del texto o documento que te proporcionaré, analizá la información y generá estrictamente un objeto JavaScript (JSON) con la estructura exacta que se muestra abajo. No agregues texto adicional antes ni después del bloque JSON.

Estructura requerida:
{
    "tituloPagina": "Sesión de Estudio Activo",
    "tituloDocumento": "Título claro y conciso del tema o documento",
    "temaGeneral": "Un resumen profundo, estructurado y completo que explique el panorama general y el contexto clave del tema (ideal para la fase de Survey del método de estudio).",
    "secciones": [
        {
            "subtitulo": "Nombre del subtema o apartado clave",
            "preguntaGenerada": "Una pregunta de examen profunda y directa (en formato de pregunta abierta, ideal para Active Recall) que evalúe la comprensión de esta sección.",
            "texto": "El fragmento de texto original, limpio y directo, que corresponde a esta sección para usarlo como referencia de estudio y comparación."
        }
    ]
}

Instrucciones adicionales:
1. Dividí el texto en secciones lógicas (entre 3 y 5 secciones).
2. Asegurate de que las "preguntaGenerada" apunten a los conceptos más importantes que un profesor preguntaría en una prueba.
3. Mantené la estructura JSON válida (comillas dobles, comas bien colocadas, sin saltos de línea internos mal escapados).
Devolvé ÚNICAMENTE el JSON, en texto plano, sin bloques de markdown con \`\`\`, sin introducciones ni explicaciones antes o después.`

const PROMPT_SUBRAYADO = `Actúa como un Diseñador Instruccional experto en lectoescritura, síntesis académica y técnicas de subrayado jerárquico.

TU OBJETIVO:
A partir de un texto o tema que te proporcionaré, debes generar la estructura JavaScript del objeto \`datosSubrayado\` listo para ser integrado en una aplicación HTML interactiva.

REGLAS DE FORMATO Y ESTRUCTURA DE SALIDA:
Debes responder ÚNICAMENTE con el bloque de código JavaScript \`const datosSubrayado = { ... };\`.

El objeto debe tener las siguientes propiedades:
1. \`tituloPagina\`: "Subrayado Jerárquico Avanzado" (o adaptar si el nivel cambia).
2. \`subtitulo\`: El tema o título descriptivo de la lectura.
3. \`asignatura\`: Nombre de la materia o disciplina.
4. \`fecha\`: Contexto temporal, unidad o fecha relevante.
5. \`textoOrigen\`: El texto plano completo sin etiquetas HTML (1 o 2 párrafos con buena densidad conceptual).
6. \`textoSubrayadoIdealHTML\`: Una versión idéntica de \`textoOrigen\`, pero agregando etiquetas \`<mark class="hl-span hl-[CATEGORIA]">\` alrededor de las frases clave que deberían ser subrayadas en una lectura ideal.

REGLAS PARA EL SUBRAYADO IDEAL:
Utiliza de forma selectiva y equilibrada (resaltando entre el 15% y el 25% del texto total) las siguientes clases CSS:
- \`hl-concepto\` (🟣 Concepto / Definición principal)
- \`hl-dato\` (🟢 Dato exacto, Fecha, Cifra o Nombre de Autor)
- \`hl-causa\` (🟠 Causa, Consecuencia, Proceso o Alerta)
- \`hl-ejemplo\` (🔵 Ejemplo, Caso práctico o Aplicación)
- \`hl-kw\` (💖 Palabra Clave o Término técnico)
- \`hl-secundario\` (🟡 Idea Secundaria, Detalle relevante o Contexto)

EJEMPLO:
const datosSubrayado = {
    tituloPagina: "Subrayado Jerárquico Avanzado",
    subtitulo: "Los Caudillos y el Poder Provincial (1820)",
    asignatura: "Historia Argentina",
    fecha: "Década de 1820",
    textoOrigen: "En la década de 1820, los gobernadores caudillos ejercieron un rol político fundamental...",
    textoSubrayadoIdealHTML: \`En la <mark class="hl-span hl-dato">década de 1820</mark>, los <mark class="hl-span hl-kw">gobernadores caudillos</mark> ejercieron un <mark class="hl-span hl-concepto">rol político fundamental como máxima autoridad provincial</mark>...\`
};

Devolvé ÚNICAMENTE el bloque de código JavaScript, en texto plano, sin bloques de markdown, sin introducciones ni explicaciones antes o después.
POR FAVOR, GENERA EL OBJETO datosSubrayado PARA EL SIGUIENTE MATERIAL:
Los archivos que te envié`

const STRICT_METHODS = ['mind', 'cornell', 'spaced', 'recall', 'multiple', 'feynman', 'blurting', 'sintesis', 'sq3r', 'subrayado', 'timeline', 'tabla']
const VAR_NAMES = { mind: 'datosMapa', cornell: 'datosCornell', spaced: 'bancoPreguntas', recall: 'preguntasRecall', multiple: 'PREGUNTAS', feynman: 'FEYNMAN_DATA', blurting: 'datosBlurting', sintesis: 'datosSintesis', sq3r: 'datosSQ3R', subrayado: 'datosSubrayado', timeline: 'datosTimeline', tabla: 'datosTabla' }
const EXPECTED_SHAPE = { mind: 'object', cornell: 'object', spaced: 'array', recall: 'array', multiple: 'array', feynman: 'object', blurting: 'object', sintesis: 'object', sq3r: 'object', subrayado: 'object', timeline: 'object', tabla: 'object' }
const methods = [
  ['mind', 'Mapa Mental', 'Conecta las ideas que importan', '✦', PROMPT_MAPA],
  ['cornell', 'Cornell', 'Anota, relaciona y sintetiza', '▤', PROMPT_CORNELL],
  ['feynman', 'Feynman', 'Explica hasta entender de verdad', '◎', PROMPT_FEYNMAN],
  ['recall', 'Active Recall', 'Practica recordar sin mirar', '◉', PROMPT_RECALL],
  ['multiple', 'Opción Múltiple', 'Rendí un examen de opción múltiple', '⊞', PROMPT_TEST],
  ['spaced', 'Repetición Espaciada', 'Repasá justo a tiempo', '↻', PROMPT_FLASHCARDS],
  ['blurting', 'Blurting', 'Vaciá tu memoria y descubrí qué falta', '✎', PROMPT_BLURTING],
  ['sintesis', 'Síntesis Embudo', 'Reducí el texto capa por capa hasta la esencia', '⬡', PROMPT_SINTESIS],
  ['sq3r', 'SQ3R', 'Survey, Question, Read, Recite, Review', '⊟', PROMPT_SQ3R],
  ['subrayado', 'Subrayado Jerárquico', 'Jerarquizá las ideas subrayando por categorías', '▣', PROMPT_SUBRAYADO],
  ['timeline', 'Línea de Tiempo', 'Conecta eventos en orden cronológico', '⟶', PROMPT_TIMELINE],
  ['tabla', 'Tabla Comparativa', 'Compará conceptos lado a lado', '⊞', PROMPT_TABLA],
]
const TREE_TYPES = ['🌲', '🌳', '🪴', '🌵', '🌿']
const AI_PROVIDERS = [
  { id: 'gemini', label: 'Gemini', sub: 'Google', placeholder: 'AIza...', helpUrl: 'https://aistudio.google.com/api-keys', helpLabel: 'Créela en Google AI Studio.' },
  { id: 'openai', label: 'ChatGPT', sub: 'OpenAI', placeholder: 'sk-...', helpUrl: 'https://platform.openai.com/api-keys', helpLabel: 'Créala en OpenAI Platform.' },
  { id: 'anthropic', label: 'Claude', sub: 'Anthropic', placeholder: 'sk-ant-...', helpUrl: 'https://console.anthropic.com/settings/keys', helpLabel: 'Créala en Anthropic Console.' },
  { id: 'openai_compatible', label: 'IA Local', sub: 'LM Studio / Ollama / compatible OpenAI', placeholder: 'lm-studio', helpUrl: 'https://lmstudio.ai', helpLabel: 'Descargá LM Studio gratis.' },
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
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — recomendado' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — rápido' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6 — más potente' },
  ],
  openai_compatible: [],
}
const providerInfo = (id) => AI_PROVIDERS.find(p => p.id === id) || AI_PROVIDERS[0]
// Detecta, por el nombre del modelo, si es probable que sea un modelo local
// chico (1-4B de parámetros aprox.) que no tiene capacidad real para generar
// el formato estructurado (JSON/JS) que pide la app de forma confiable.
const detectSmallModelWarning = (modelId) => {
  if (!modelId) return null
  const id = modelId.toLowerCase()
  const sizeMatch = id.match(/(\d+(?:\.\d+)?)\s*b(?![a-z])/)
  const paramsB = sizeMatch ? parseFloat(sizeMatch[1]) : null
  const tinyKeyword = /(tiny|mini|nano|small|phi-?2|qwen.*0\.?5b|gemma.*2b)/.test(id)
  if ((paramsB !== null && paramsB <= 4) || tinyKeyword) {
    return `"${modelId}" parece ser un modelo chico (≈${paramsB ? paramsB + 'B' : '1-4B'} de parámetros). Estos modelos suelen fallar al generar el formato estructurado que necesita Lúmina. Para mejores resultados, probá con un modelo de 7B o más (ej: Qwen2.5 7B/14B, Llama 3.1 8B, Mistral 7B/Nemo).`
  }
  return null
}
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result.split(',')[1])
  reader.onerror = error => reject(error)
})
// Decodifica un string base64 (guardado desde un archivo subido) a texto plano.
// Usa TextDecoder en vez del viejo hack atob+escape+decodeURIComponent: ese hack
// tira una excepción entera (sin devolver nada) apenas encuentra una secuencia que
// no sea UTF-8 válido, lo que hace que .txt guardados con otra codificación (ANSI /
// Windows-1252, típico de Notepad viejo) se vean vacíos o truncados en la vista previa.
const decodeTextFromBase64 = (base64) => {
  if (!base64) return ''
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      // No era UTF-8 válido: probamos como Windows-1252/Latin1 para no perder el contenido.
      return new TextDecoder('windows-1252').decode(bytes)
    }
  } catch {
    return ''
  }
}
const cleanAIOutput = (text) => {
  if (!text) return text
  let cleaned = text.trim()
  // Remove chain-of-thought blocks (DeepSeek, Nemotron, QwQ style)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim()
  // If there's a fenced code block anywhere in the response, extract its content.
  // This handles cases where the AI adds preamble text before the ```javascript block.
  const fenceMatch = cleaned.match(/```[a-zA-Z0-9]*\r?\n?([\s\S]*?)\r?\n?```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  } else {
    // No fenced block found — strip any stray leading/trailing backtick lines
    cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim()
    cleaned = cleaned.replace(/^`+/, '').replace(/`+$/, '').trim()
  }
  // Normalize typographic/curly quotes that cause `"" is not a function` errors
  cleaned = cleaned.replace(/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'")
  return cleaned
}

// Extracts the first JS variable declaration from a string that may have preamble text.
const extractJSBlock = (code, varName) => {
  const declIndex = code.indexOf(`const ${varName}`)
  if (declIndex !== -1) return code.slice(declIndex)
  for (const kw of ['var ', 'let ']) {
    const idx = code.indexOf(`${kw}${varName}`)
    if (idx !== -1) return code.slice(idx)
  }
  const re = new RegExp(`${varName}\\s*=\\s*[\\[\\{]`)
  const m = re.exec(code)
  if (m) return `const ${code.slice(m.index)}`
  return code
}

// Normalizes alternative datosMapa formats that AI models sometimes generate.
// Strategy: eval the JS first (handles all valid JS syntax), then normalize the
// resulting object structure. Falls back to text-level fixes if eval fails.
const normalizeMindMapCode = (code) => {
  if (!code.includes('datosMapa')) return code

  // Recursive structure normalizer: handles these patterns:
  //   A) { nombre: "X", hijos: [...] }  — already correct, preserve
  //   B) { "Title": { hijos: [...] } }  — title-as-key
  //   C) { "Text": {} } or { "Text" }   — bare leaf (invalid JS handled below)
  const normObj = (node) => {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(normObj)
    if ('nombre' in node) {
      const out = { nombre: String(node.nombre) }
      if (Array.isArray(node.hijos) && node.hijos.length) out.hijos = node.hijos.map(normObj)
      return out
    }
    // title-as-key pattern: first key that isn't 'hijos' is the title
    const titleKey = Object.keys(node).find(k => k !== 'hijos')
    if (titleKey) {
      const inner = node[titleKey]
      const out = { nombre: titleKey }
      const hijosSrc = (inner && typeof inner === 'object' && Array.isArray(inner.hijos)) ? inner.hijos : null
      if (hijosSrc && hijosSrc.length) out.hijos = hijosSrc.map(normObj)
      else if (Array.isArray(inner) && inner.length) out.hijos = inner.map(normObj)
      return out
    }
    return node
  }

  // Step 1: try to eval the code as-is (or with minor text fixes) to get a live object
  const tryEvalNormalize = (src) => {
    try {
      // Strip pattern A: { "Text" } invalid shorthand → { nombre: "Text" }
      const patched = src.replace(/\{\s*(['"`])([^'"`\n]+)\1\s*\}/g,
        (_, _q, txt) => `{nombre: "${txt.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"}`)
      // eslint-disable-next-line no-new-func
      const fn = new Function(`${patched}\nreturn datosMapa;`)
      const obj = fn()
      if (!obj || typeof obj !== 'object') return null
      return `const datosMapa = ${JSON.stringify(normObj(obj), null, 2)};`
    } catch { return null }
  }

  // Step 2: text-level fallbacks — remove trailing commas, JS comments, then retry
  const tryTextFix = (src) => {
    let s = src
    // Remove single-line JS comments (avoid breaking URLs)
    s = s.replace(/([^:])\/\/[^\n]*/g, '$1')
    // Remove trailing commas before ] or }
    s = s.replace(/,(\s*[}\]])/g, '$1')
    return tryEvalNormalize(s)
  }

  return tryEvalNormalize(code) || tryTextFix(code) || code
}

const sanitizeJSCode = (code, varName) => {
  let s = code
  s = s.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  if (/^["'][\s\S]+["']$/.test(s.trim())) {
    try { s = JSON.parse(s.trim()) } catch { /* not a JSON string */ }
  }
  if (varName) s = extractJSBlock(s, varName)
  return s
}

// Intenta reparar codigo JS/JSON malformado que devuelven los modelos locales.
// Maneja: JSON puro sin declaracion const, reasoning_content mezclado,
// objetos sin key ({nombre: "X", {nombre: "Y"}}), brackets desbalanceados,
// trailing commas, y truncado por limite de tokens.
const repairJSCode = (raw, varName) => {
  if (!raw || !varName) return raw
  let s = raw.trim()

  // 1. Normalizar comillas tipograficas
  s = s.replace(/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'")

  // 2. Extraer bloque entre backticks si existe
  const fenceMatch = s.match(/```[a-zA-Z0-9]*\r?\n?([\s\S]*?)\r?\n?```/)
  if (fenceMatch) s = fenceMatch[1].trim()

  // 3. Extraer desde la declaracion de la variable
  s = extractJSBlock(s, varName)

  // 4. Remover trailing commas antes de } o ]
  s = s.replace(/,(?:\s*[}\]])/g, (m) => m.slice(1))

  // 5. Reparar patron tipico de modelos: objeto sin key dentro de otro objeto
  //    Ej: {"nombre":"X", {"nombre":"Y"}} -> {"nombre":"X", "hijos":[{"nombre":"Y"}]}
  //    Patron: , { sin una key antes
  s = s.replace(/,\s*\{(?="nombre")/g, ',"__extra__":{')

  // 6. Si es JSON puro (empieza con [ o {), wrapearlo como const varName = ...
  const trimmed = s.trim()
  if ((trimmed.startsWith('[') || trimmed.startsWith('{')) && !s.includes('const ')) {
    s = 'const ' + varName + ' = ' + trimmed
    if (!s.trimEnd().endsWith(';')) s += ';'
  }

  // 7. Intentar cerrar brackets desbalanceados (por truncado)
  const tryClose = (src) => {
    const stack = []
    let inStr = false, escape = false
    for (const ch of src) {
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"' && !escape) { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{' || ch === '[') stack.push(ch)
      else if ((ch === '}' || ch === ']') && stack.length) stack.pop()
    }
    let fixed = src.replace(/,\s*$/, '').trimEnd()
    // Si termina en string abierto, cerrar
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length
    if (quoteCount % 2 !== 0) fixed += '"'
    for (const open of [...stack].reverse()) fixed += open === '{' ? '}' : ']'
    if (!fixed.trimEnd().endsWith(';')) fixed = fixed.trimEnd() + ';'
    return fixed
  }

  // 8. Probar todas las variantes
  for (const candidate of [s, tryClose(s)]) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(candidate + '\nreturn ' + varName + ';')
      if (fn() != null) return candidate
    } catch {}
  }

  // 9. Ultimo recurso: intentar JSON.parse del contenido crudo y re-serializar
  try {
    const jsonStart = s.indexOf('{') !== -1 ? s.indexOf('{') : s.indexOf('[')
    if (jsonStart !== -1) {
      const jsonPart = s.slice(jsonStart)
      // Intentar parsear el JSON directamente (puede tener errores de sintaxis JS pero no JSON)
      const parsed = JSON.parse(jsonPart)
      const wrapped = 'const ' + varName + ' = ' + JSON.stringify(parsed) + ';'
      const fn = new Function(wrapped + '\nreturn ' + varName + ';')
      if (fn() != null) return wrapped
    }
  } catch {}

  return s
}
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

const PRIORIDADES = {
  normal: { label: 'Normal', xp: 10, color: 'success', icon: '●' },
  media:  { label: 'Media',  xp: 20, color: 'warn',   icon: '◆' },
  alta:   { label: 'Alta',   xp: 30, color: 'danger', icon: '★' }
}
const XP_POR_NIVEL = 100
const BONUS_ENFOQUE = 1.5

// Plantillas predefinidas de auto-to-do list para estudiantes.
// Cada plantilla agrega un set de tareas ya priorizadas; el usuario puede
// sumar sus propias tareas específicas después con el formulario normal.
const PLANTILLAS_TODO = [
  {
    id: 'examen',
    icon: '📘',
    label: 'Antes de un examen',
    tareas: [
      { text: 'Repasar el resumen general del tema', prioridad: 'alta' },
      { text: 'Resolver ejercicios o preguntas de práctica', prioridad: 'alta' },
      { text: 'Anotar y resolver mis dudas pendientes', prioridad: 'media' },
      { text: 'Preparar los materiales para el día del examen', prioridad: 'normal' },
    ]
  },
  {
    id: 'rutina',
    icon: '🗓️',
    label: 'Rutina de estudio diaria',
    tareas: [
      { text: 'Revisar los apuntes de la clase de hoy', prioridad: 'media' },
      { text: 'Hacer una sesión de repaso activo', prioridad: 'media' },
      { text: 'Dejar planificado qué voy a estudiar mañana', prioridad: 'normal' },
    ]
  },
  {
    id: 'entrega',
    icon: '📄',
    label: 'Entrega de trabajo práctico',
    tareas: [
      { text: 'Definir la consigna y estructura del trabajo', prioridad: 'alta' },
      { text: 'Redactar el primer borrador', prioridad: 'alta' },
      { text: 'Revisar formato, ortografía y citas', prioridad: 'media' },
      { text: 'Entregar antes de la fecha límite', prioridad: 'alta' },
    ]
  },
]

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
  const [localModels, setLocalModels] = useState([])
  const [localModelsFetching, setLocalModelsFetching] = useState(false)
  const [localModelsError, setLocalModelsError] = useState('')
  const [materias, setMaterias] = useState([])
  const [materiaId, setMateriaId] = useState(null)
  const [materiaModalOpen, setMateriaModalOpen] = useState(false)
  const [materiaToRename, setMateriaToRename] = useState(null)
  const [studyPickerOpen, setStudyPickerOpen] = useState(false)
  const [pendingMethod, setPendingMethod] = useState(null)
  const [materials, setMaterials] = useState([]), [activeMaterial, setActiveMaterial] = useState(null)
  const [previewMaterial, setPreviewMaterial] = useState(null)
  const [studyMinutes, setStudyMinutes] = useState(() => parseInt(localStorage.getItem('lumina-study-minutes') || '45'))
  const [shortBreakMinutes, setShortBreakMinutes] = useState(() => parseInt(localStorage.getItem('lumina-short-break') || '10'))
  const [longBreakMinutes, setLongBreakMinutes] = useState(() => parseInt(localStorage.getItem('lumina-long-break') || '25'))
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(() => parseInt(localStorage.getItem('lumina-sessions-until-long') || '4'))
  const [phase, setPhase] = useState('focus')
  const [completedFocusSessions, setCompletedFocusSessions] = useState(() => parseInt(localStorage.getItem('lumina-completed-sessions') || '0'))
  const [seconds, setSeconds] = useState(() => parseInt(localStorage.getItem('lumina-study-minutes') || '45') * 60)
  const [running, setRunning] = useState(false), [aiResult, setAiResult] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [previewVersion, setPreviewVersion] = useState(0)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsInput, setSettingsInput] = useState({ study: studyMinutes, short: shortBreakMinutes, long: longBreakMinutes, cycle: sessionsUntilLongBreak })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 750px)').matches : false)
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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(materiasKey()) || '[]');
      setMaterias(saved);
    } catch { setMaterias([]) }
    setMateriaId(localStorage.getItem(currentMateriaKey()) || null);
  }, []);

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

  const chooseMaterial = (m) => {
    setActiveMaterial(m);
    try { localStorage.setItem(activeMaterialKey(materiaId), m.id) } catch {}
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 750px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler)
    return () => { mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler) }
  }, []);

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
          setNotice(phase === 'long' ? 'Descanso largo terminado. ¿Lista para el próximo bloque de enfoque?' : 'Descanso corto terminado. Cuando quieras, retomá el enfoque.');
          setPhase('focus');
          return studyMinutes * 60;
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, streak, forest, phase, studyMinutes, shortBreakMinutes, longBreakMinutes, sessionsUntilLongBreak, completedFocusSessions]);

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

  useEffect(() => { if (notice) { const id = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(id) } }, [notice])
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const current = methods.find(m => m[0] === active), progress = useMemo(() => Math.round((totalSeconds - seconds) / totalSeconds * 100), [seconds, totalSeconds])
  
  const decodeTextMaterial = (material) => decodeTextFromBase64(material?.data)

  // ===========================================================================
  // 1. FUNCIÓN PARA EXTRAER TEXTO DE PDF (Debe ir ANTES de callAI)
  // ===========================================================================
  async function extraerTextoDePdf(base64Data) {
    try {
      console.log('📄 Extrayendo texto del PDF para enviar al modelo local/OpenAI...');
      const pdfjsLib = await cargarPdfJs();
      const loadingTask = pdfjsLib.getDocument({ data: base64ABytes(base64Data) });
      const pdf = await loadingTask.promise;
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textoPagina = textContent.items.map(item => item.str).join(' ');
        textoCompleto += `--- PÁGINA ${i} ---\n${textoPagina}\n\n`;
      }
      console.log(`✓ Texto extraído del PDF con éxito: ${pdf.numPages} páginas, ${textoCompleto.length} caracteres.`);
      const soloTexto = textoCompleto.replace(/--- PÁGINA \d+ ---/g, '').trim();
      if (soloTexto.length < 30) {
        throw new Error('El PDF no tiene texto que se pueda leer (probablemente es un escaneo o imagen sin OCR). Convertilo con una herramienta de OCR o pegá el contenido como .txt.');
      }
      return textoCompleto;
    } catch (err) {
      console.error('❌ Error al extraer texto del PDF:', err);
      throw new Error(`Error procesando el PDF: ${err.message}`);
    }
  }

  // ===========================================================================
  // 2. FUNCIÓN callAI COMPLETA CON SOPORTE PARA STREAMING (TIEMPO REAL)
  // ===========================================================================
  const callAI = async ({ provider, model, key, promptText, material, baseUrl, onChunk }) => {
    const cleanKey = (key || '').replace(/[^\x20-\x7E]/g, '').trim();
    
    // ------------------ GEMINI ------------------
    if (provider === 'gemini') {
      const parts = [{ text: promptText }];
      if (material?.data) parts.push({ inlineData: { mimeType: material.mimeType, data: material.data } });
      
      if (onChunk) {
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${cleanKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
          });
          if (!r.ok) {
            const errData = await r.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'No pudimos conectar con Gemini.');
          }
          const reader = r.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let fullText = '', buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
                  if (text) {
                    fullText += text;
                    onChunk(fullText);
                  }
                } catch {}
              }
            }
          }
          if (fullText) return fullText;
        } catch (e) {
          console.warn('Gemini stream falló, reintentando modo normal:', e.message);
        }
      }

      // Fallback sin streaming
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message || 'No pudimos conectar con Gemini.');
      return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'Gemini no devolvió una respuesta.';
    }
    
    // ------------------ ANTHROPIC ------------------
    if (provider === 'anthropic') {
      const content = [{ type: 'text', text: promptText }];
      if (material?.data) {
        if ((material.mimeType || '').includes('pdf')) {
          content.push({ type: 'document', source: { type: 'base64', media_type: material.mimeType, data: material.data } });
        } else {
          content.push({ type: 'text', text: decodeTextMaterial(material) });
        }
      }

      if (onChunk) {
        try {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': cleanKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({ model, max_tokens: 4096, stream: true, messages: [{ role: 'user', content }] })
          });
          if (!r.ok) {
            const errData = await r.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'No pudimos conectar con Claude.');
          }
          const reader = r.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let fullText = '', buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    fullText += parsed.delta.text;
                    onChunk(fullText);
                  }
                } catch {}
              }
            }
          }
          if (fullText) return fullText;
        } catch (e) {
          console.warn('Claude stream falló, reintentando modo normal:', e.message);
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
      return (data.content || []).map(p => p.text || '').join('') || 'Claude no devolvió una respuesta.';
    }

    // ------------------ OPENAI & OPENAI COMPATIBLE (LM Studio, etc.) ------------------
    const isPdf = material?.data && (material.mimeType || '').includes('pdf');
    let textoMaterial = '';
    
    if (material?.data) {
      if (isPdf) {
        textoMaterial = await extraerTextoDePdf(material.data);
      } else {
        textoMaterial = decodeTextMaterial(material);
      }
    }

    let endpoint = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'openai_compatible') {
      let rawUrl = (baseUrl || 'http://localhost:1234').trim().replace(/\/$/, '');
      if (rawUrl.endsWith('/chat/completions')) {
        endpoint = rawUrl;
      } else {
        if (!rawUrl.endsWith('/v1') && !rawUrl.includes('/v1/')) {
          rawUrl += '/v1';
        }
        endpoint = `${rawUrl}/chat/completions`;
      }
    }
    console.log(`🤖 Enviando solicitud a ${provider} (${endpoint}) con modelo: ${model || 'local-model'}`);

    const userContent = textoMaterial 
      ? `${promptText}\n\n--- MATERIAL DE ESTUDIO ---\n\n${textoMaterial}`
      : promptText;

    const payload = {
      model: model || 'local-model',
      temperature: 0.2,
      max_tokens: 8192,
      messages: [
        { 
          role: 'system', 
          content: 'Eres un asistente académico experto. Analiza el siguiente texto y responde según las instrucciones.' 
        },
        { 
          role: 'user', 
          content: userContent 
        }
      ]
    };

    if (onChunk) {
      try {
        const rStream = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${cleanKey || 'lm-studio'}`  
          },
          body: JSON.stringify({ ...payload, stream: true })
        });

        if (rStream.ok && rStream.body) {
          const reader = rStream.body.getReader();
          const decoder = new TextDecoder('utf-8');
          // fullText acumula SOLO el content real (nunca reasoning_content)
          let fullText = '', buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const delta = parsed.choices?.[0]?.delta || {};
                  // Solo acumular content. Ignorar reasoning_content completamente.
                  // Si el chunk tiene reasoning_content pero NO content, saltear.
                  // Si tiene ambos, solo tomar content.
                  if (delta.reasoning_content !== undefined && !delta.content) continue;
                  const chunk = delta.content || parsed.choices?.[0]?.text || '';
                  if (chunk) {
                    fullText += chunk;
                    onChunk(fullText);
                  }
                } catch {}
              }
            }
          }
          if (fullText) return fullText;
        }
      } catch (err) {
        console.warn('⚠ Stream en tiempo real falló, reintentando solicitud estándar:', err.message);
      }
    }

    // Solicitud directa sin streaming
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${cleanKey || 'lm-studio'}`  
      },
      body: JSON.stringify(payload)
    });
    
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Error (${r.status}): No pudimos conectar con el modelo local / OpenAI.`);
    const msg = data.choices?.[0]?.message || {};
    // Usar SOLO msg.content — nunca msg.reasoning_content (chain-of-thought de Nemotron/DeepSeek/QwQ)
    const finalContent = msg.content || '';
    return finalContent || 'El modelo no devolvió una respuesta. Prueba de nuevo.';
  }

  const fetchLocalModels = async () => {
    const rawUrl = (baseUrlInput || 'http://localhost:1234').trim().replace(/\/$/, '');
    const base = rawUrl.endsWith('/v1') || rawUrl.includes('/v1/') ? rawUrl.replace(/\/v1.*$/, '') : rawUrl;
    const modelsUrl = `${base}/v1/models`;
    setLocalModelsFetching(true);
    setLocalModelsError('');
    setLocalModels([]);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const cleanedKey = (keyInput || '').replace(/[^\x20-\x7E]/g, '').trim();
      if (cleanedKey) headers['Authorization'] = `Bearer ${cleanedKey}`;
      const res = await fetch(modelsUrl, { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ids = (data.data || []).map(m => m.id).filter(Boolean);
      if (!ids.length) throw new Error('No se encontraron modelos cargados en el servidor.');
      setLocalModels(ids);
      if (!modelInput || !ids.includes(modelInput)) setModelInput(ids[0]);
    } catch (err) {
      setLocalModelsError(`No se pudo conectar: ${err.message}`);
    } finally {
      setLocalModelsFetching(false);
    }
  }

  const saveKey = async () => {
    const key = keyInput.replace(/[^\x20-\x7E]/g, '').trim();
    const provider = providerInput;
    const model = provider === 'openai_compatible' ? (modelInput || '').trim() : modelInput;
    const label = providerInfo(provider).label;
    if (provider !== 'openai_compatible' && key.length < 10) return setNotice(`Revisa tu API Key: ${label} entrega una clave más larga.`);
    if (provider === 'openai_compatible' && !(baseUrlInput || '').trim()) return setNotice('Ingresá la URL del servidor (ej: http://localhost:1234).');
    if (provider === 'openai_compatible' && !model) return setNotice('Seleccioná o escribí el nombre del modelo que querés usar.');
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
    } catch (error) { setNotice(`No pudimos validar la clave: ${error.message}`) }
  }

  const parseStrictOutput = (methodId, code) => {
    const varName = VAR_NAMES[methodId];

    const tryEval = (src) => {
      // Replace curly/typographic quotes with straight quotes to avoid
      // runtime errors like `"" is not a function` from malformed AI output
      let sanitized = src
        .replace(/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"') // curly double quotes → "
        .replace(/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'"); // curly single quotes → '
      const fn = new Function(`${sanitized}\nreturn ${varName};`);
      const data = fn();
      if (data == null) throw new Error(`el código no define "${varName}"`);
      const shape = EXPECTED_SHAPE[methodId];
      if (shape === 'array' && !Array.isArray(data)) throw new Error(`"${varName}" debería ser una lista`);
      if (shape === 'object' && (Array.isArray(data) || typeof data !== 'object')) throw new Error(`"${varName}" debería ser un objeto`);
      return data;
    };

    const candidates = new Set();
    const addVariants = (c) => {
      if (!c || !c.trim()) return;
      candidates.add(c);
      candidates.add(normalizeMindMapCode(c));
      const extracted = extractJSBlock(c, varName);
      candidates.add(extracted);
      candidates.add(normalizeMindMapCode(extracted));
      const stripped = c.replace(/^```[a-zA-Z0-9]*\r?\n?/m, '').replace(/\r?\n?```\s*$/m, '').trim();
      candidates.add(stripped);
      candidates.add(normalizeMindMapCode(stripped));
      candidates.add(extractJSBlock(stripped, varName));
      candidates.add(normalizeMindMapCode(extractJSBlock(stripped, varName)));
    };
    addVariants(code);
    addVariants(sanitizeJSCode(code, varName));
    addVariants(repairJSCode(code, varName));
    addVariants(repairJSCode(sanitizeJSCode(code, varName), varName));

    let firstError = null;
    for (const candidate of candidates) {
      if (!candidate || !candidate.trim()) continue;
      try { return tryEval(candidate); } catch (err) { if (!firstError) firstError = err; }
    }
    throw new Error(`no pudimos interpretar el código (${firstError?.message ?? 'error desconocido'})`);
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
      const emptyFiles = [];
      const newMaterials = (await Promise.all(fs.map(async (f) => {
        if (f.size === 0) { emptyFiles.push(f.name); return null; }
        const base64 = await fileToBase64(f);
        const isPdf = f.type.includes('pdf') || /\.pdf$/i.test(f.name);
        // Para archivos de texto plano (.txt/.md) podemos chequear el contenido ya mismo.
        // Los PDF se revisan recién al extraer el texto (puede ser un escaneo sin OCR).
        if (!isPdf) {
          let plain = decodeTextFromBase64(base64)
          if (!plain.trim()) { emptyFiles.push(f.name); return null; }
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          materiaId: materiaId,
          name: f.name,
          size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
          type: isPdf ? 'PDF' : 'NOTA',
          mimeType: f.type || 'text/plain',
          data: base64
        }
      }))).filter(Boolean);
      if (newMaterials.length) {
        setMaterials(p => [...p, ...newMaterials]);
        try { await Promise.all(newMaterials.map(m => saveMaterialToLibrary(m))) } catch {}
        chooseMaterial(newMaterials[newMaterials.length - 1]);
      }
      if (emptyFiles.length) {
        setNotice(newMaterials.length
          ? `Algunos archivos están vacíos y no se agregaron: ${emptyFiles.join(', ')}.`
          : `El archivo "${emptyFiles.join(', ')}" está vacío o no se pudo leer. Probá con otro archivo.`);
      } else {
        setNotice('Material agregado y listo para usarse con la IA.');
      }
    } catch (error) {
      setNotice('Hubo un error al procesar el archivo.');
    }
    e.target.value = '';
  }

  const generate = async (methodOverride) => {
    const m = methodOverride || current;
    const label = providerInfo(aiProvider).label;
    if (!apiKey && aiProvider !== 'openai_compatible') return setNotice('Primero conectá tu IA (API Key).');
    if (!activeMaterial) return setNotice(materials.length > 0 ? 'Selecciona un archivo de tu biblioteca antes de analizar.' : 'Agrega un archivo a tu biblioteca antes de analizar.');
    setAiResult('');
    setStreamText('');
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
      
      const rawOutput = await callAI({
        provider: aiProvider,
        model: aiModel,
        key: apiKey,
        promptText: promptFinal,
        material: activeMaterial,
        baseUrl: aiBaseUrl,
        onChunk: (partialText) => setStreamText(partialText)
      });
      const output = cleanAIOutput(rawOutput);
      setAiResult(output);
      try { localStorage.setItem(resultCacheKey(activeMaterial, m[0]), output) } catch {}
      
      if (strict) {
        const tryParse = (src) => {
          try { return parseStrictOutput(m[0], src) } catch {}
          return null
        }
        let data = tryParse(output) || tryParse(rawOutput)

        // Auto-retry para modelos locales: si el parse falla, reintentamos con
        // un prompt simplificado que fuerza JSON puro y lo wrapeamos nosotros.
        if (!data && aiProvider === 'openai_compatible') {
          try {
            setNotice('El modelo no generó el formato correcto, reintentando...')
            const varName = VAR_NAMES[m[0]]
            const shape = EXPECTED_SHAPE[m[0]]
            const retryPrompt = `${m[4]}

IMPORTANTE CRÍTICO: devolvé ÚNICAMENTE el valor ${shape === 'array' ? 'de un array JSON' : 'de un objeto JSON'} sin ningún texto extra, sin bloques de markdown, sin la declaración "const ${varName} =", solo el ${shape === 'array' ? 'array' : 'objeto'} en sí. Empezá directamente con ${shape === 'array' ? '[' : '{'} y terminá con ${shape === 'array' ? ']' : '}'}. Usá como base estricta: "${activeMaterial.name}"`
            const retryRaw = await callAI({ provider: aiProvider, model: aiModel, key: apiKey, promptText: retryPrompt, material: activeMaterial, baseUrl: aiBaseUrl })
            const retryClean = cleanAIOutput(retryRaw)
            // Wrapear como const varName = <respuesta>;
            const wrapped = `const ${varName} = ${retryClean.trim().replace(/;$/, '')};`
            data = tryParse(wrapped) || tryParse(repairJSCode(wrapped, varName))
          } catch {}
        }

        if (data) {
          setPreviewData(data);
          setPreviewVersion(v => v + 1);
          try { localStorage.setItem(previewCacheKey(activeMaterial, m[0]), JSON.stringify(data)) } catch {}
          setNotice(`${label} armó tu ${m[1]}. Ya lo podés usar acá abajo.`);
        } else {
          const errMsg = 'el modelo no generó el formato esperado'
          setPreviewError(errMsg);
          setNotice(`No pudimos interpretar el resultado automáticamente: ${errMsg}. Descargá el código de abajo y revisalo, o regenerá con ${label}.`);
        }
      } else {
        setNotice(`${label} preparó una propuesta para tu sesión.`);
      }
    } catch (error) {
      setNotice(`${label} no pudo responder: ${error.message}`)
    } finally {
      setLoading(false);
      setStreamText('');
    }
  }

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

  const openStudy = (methodOverride) => {
    setPendingMethod(methodOverride || null);
    setStudyPickerOpen(true);
  }

  const beginStudy = () => {
    if (!activeMaterial) { setNotice('Elige un cuaderno para empezar.'); return; }
    if (pendingMethod) setActive(pendingMethod[0]);
    setStudyPickerOpen(false);
    setRoom(true);
    loadOrGenerate(pendingMethod || current);
  }

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
    if (!running) {
      const mins = phase === 'focus' ? study : phase === 'short' ? short : long;
      setSeconds(mins * 60);
    }
    setSettingsOpen(false);
    setNotice(`Ciclo configurado: ${study} min enfoque · ${short} min descanso corto · ${long} min descanso largo cada ${cycle} sesiones.`);
  }

  const showSection = (name) => isMobile || tab === name;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="logo"> <i>✦</i> <span>LÚMINA <small>ESTUDIO CONSCIENTE</small></span> </a>
        <nav>
          {['Inicio', 'Biblioteca', 'Progreso'].map(x =>
            <button onClick={() => setTab(x)} className={tab === x ? 'nav-item selected' : 'nav-item'} key={x}>
              <span>{x === 'Inicio' ? '⌂' : x === 'Biblioteca' ? '▤' : '◔'}</span>{x}
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
              <span className="theme-toggle-knob" />
            </button>
            <button className={apiKey ? 'key-button connected' : 'key-button'} onClick={() => { setProviderInput(aiProvider); setModelInput(aiModel); setBaseUrlInput(aiBaseUrl); setKeyOpen(true) }} title={apiKey ? `${providerInfo(aiProvider).label} conectado` : 'Conectar IA'}>
              <i>{apiKey ? '✓' : '◇'}</i> <span className="key-button-label">{apiKey ? `${providerInfo(aiProvider).label} conectado` : 'Conectar IA'}</span>
            </button>
          </div>
        </header>
        {showSection('Inicio') && (
          <div id="inicio-section">
            <section className="focus-card">
              <div className="focus-copy">
                <p className="eyebrow">SESIÓN DE HOY</p>
                <h2>Un pequeño paso, <br /><em>una idea más clara.</em></h2>
                <p>Elige un método, abre tu material y dedica este momento a conectar lo que estás aprendiendo.</p>
                <button className="primary" onClick={() => openStudy()}>Comenzar a estudiar <span>→</span></button>
              </div>
              <div className="orbital-notes">
                <div className="orbit orbit-one" /> <div className="orbit orbit-two" />
                <div className="note note-a">✦ <small>recordar</small></div>
                <div className="note note-b">⌁ <small>conectar</small></div>
                <div className="note note-c">◌ <small>comprender</small></div>
                <div className="central-star">✦</div>
              </div>
            </section>
            <section className="methods-section">
              <div className="section-heading">
                <div> <p className="eyebrow">TU FORMA DE APRENDER</p> <h2>Elige cómo quieres estudiar</h2> </div>
              </div>
              <div className="method-grid" id="method-grid">
                {methods.map(m =>
                  <button className={active === m[0] ? 'method-card active' : 'method-card'} onClick={() => openStudy(m)} key={m[0]}>
                    <i>{m[3]}</i> <strong>{m[1]}</strong> <span>{m[2]}</span>{active === m[0] && <b>Elegido</b>}
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
                    <div> <p className="eyebrow">BIBLIOTECA</p> <h3>Tus materias</h3> </div>
                  </div>
                  <div className="method-grid" style={{ marginTop: '18px' }}>
                    {materias.map(mat =>
                      <div className="method-card" onClick={() => chooseMateria(mat.id)} key={mat.id} style={{ cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 2 }}>
                          <button title="Renombrar materia" onClick={(e) => { e.stopPropagation(); setMateriaToRename(mat.id); setMateriaModalOpen(true) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, cursor: 'pointer', fontSize: 12 }}>✎</button>
                          <button title="Eliminar materia" onClick={(e) => { e.stopPropagation(); deleteMateria(mat.id) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: 4, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                        </div>
                        <i>▤</i> <strong>{mat.nombre}</strong> <span>Ver cuadernos de esta materia</span>
                      </div>
                    )}
                    <button className="method-card" onClick={() => { setMateriaToRename(null); setMateriaModalOpen(true) }}>
                      <i>+</i> <strong>Nueva materia</strong> <span>Crea una carpeta para organizar tus cuadernos</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-head">
                    <div>
                      <button className="back" onClick={() => chooseMateria(null)}>← Materias</button>
                      <p className="eyebrow" style={{ marginTop: '12px' }}>BIBLIOTECA · {materias.find(m => m.id === materiaId)?.nombre?.toUpperCase()}</p>
                      <h3>Tu material de estudio</h3>
                    </div>
                    <label className="upload-link">+ Agregar <input type="file" accept=".pdf,.txt,.md" multiple onChange={addMaterial} /></label>
                  </div>
                  <div className="material-list">
                    {materials.length ? materials.map((m, i) =>
                      <div className="material" key={i} onClick={() => chooseMaterial(m)} onDoubleClick={() => setPreviewMaterial(m)} title="Doble clic para ver una vista previa" style={{ cursor: 'pointer', outline: activeMaterial?.id === m.id ? '2px solid #cdc4f2' : 'none', borderRadius: activeMaterial?.id === m.id ? '8px' : 0 }}>
                        <i>{m.type === 'PDF' ? 'PDF' : 'TXT'}</i>
                        <span> <b>{m.name}</b> <small>{m.type} · {m.size}{activeMaterial?.id === m.id ? ' · Seleccionado' : ''}</small> </span>
                        <button onClick={(e) => { e.stopPropagation(); removeMaterial(m) }}>⋯</button>
                      </div>
                    ) : (
                      <div className="empty-material">
                        <span>⌁</span>
                        <div> <b>Esta materia está lista</b> <p>Agrega un PDF o un apunte para empezar a trabajar con él.</p> </div>
                        <label className="secondary-mini">Agregar material <input type="file" accept=".pdf,.txt,.md" multiple onChange={addMaterial} /></label>
                      </div>
                    )}
                  </div>
                </>
              )}
            </article>
          </section>
        )}
        {showSection('Progreso') && (
          <section id="progreso-section" style={{ marginTop: isMobile ? '38px' : 0 }}>
            <article className="progreso-unified-card">
              {/* ── Header del artículo unificado ── */}
              <div className="progreso-header">
                <div>
                  <p className="eyebrow">PROGRESO DE HOY</p>
                  <h3 style={{ font: "600 20px 'Playfair Display'", margin: 0 }}>
                    Tu sesión de enfoque
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {running && phase === 'focus' && (
                    <span className="progreso-focus-pill">🔥 Enfoque activo</span>
                  )}
                  <button className="settings" onClick={() => { setSettingsInput({ study: studyMinutes, short: shortBreakMinutes, long: longBreakMinutes, cycle: sessionsUntilLongBreak }); setSettingsOpen(true) }}>⚙</button>
                </div>
              </div>

              {/* ── Cuerpo: timer + todo ── */}
              <div className="progreso-body">

                {/* ── Panel izquierdo: Timer ── */}
                <div className="progreso-timer-col">
                  <p className="eyebrow" style={{ marginBottom: 8 }}>POMODORO</p>
                  <div className="timer">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" />
                      <circle className="timer-progress" cx="60" cy="60" r="52" style={{ strokeDashoffset: 327 - (327 * progress / 100) }} />
                    </svg>
                    <div> <b>{time}</b> <span>{phaseLabel}{running ? '' : ' · pausa'}</span> </div>
                  </div>
                  <p className="progreso-session-hint">
                    Sesión {(completedFocusSessions % sessionsUntilLongBreak) + (phase === 'focus' ? 1 : 0)} de {sessionsUntilLongBreak}
                  </p>
                  <div className="timer-actions">
                    <button onClick={() => { setRunning(!running); setNotice(running ? 'Pausa activada.' : (phase === 'focus' ? 'Sesión de enfoque iniciada.' : 'Descanso iniciado.')) }}>
                      {running ? 'Pausar' : phase === 'focus' ? 'Iniciar enfoque' : 'Iniciar descanso'}
                    </button>
                    <button onClick={() => { setSeconds(totalSeconds); setRunning(false) }}>↺</button>
                  </div>

                  {/* ── Bosque integrado debajo del timer ── */}
                  <div className="bosque-panel">
                    <div className="bosque-header">
                      <div>
                        <p className="eyebrow" style={{ marginBottom: 3 }}>TU BOSQUE</p>
                        <span className="bosque-count">
                          {forest.length === 0 ? 'Sin plantas aún' : `${forest.length} ${forest.length === 1 ? 'planta' : 'plantas'}`}
                        </span>
                      </div>
                      <div className="bosque-racha">
                        <span className="bosque-racha-num">{streak}</span>
                        <span className="bosque-racha-fire">🔥</span>
                        <span className="bosque-racha-label">racha</span>
                      </div>
                    </div>
                    {forest.length ? (
                      <div className="bosque-grid">
                        {forest.map((tree, i) => (
                          <span key={i} className="bosque-tree">{tree}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="bosque-empty">
                        <span className="bosque-empty-icon">🌱</span>
                        <div>
                          <b>Bosque vacío</b>
                          <p>Completá una sesión de enfoque para plantar tu primer árbol.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Panel derecho: To-Do ── */}
                <div className="progreso-todo-col">
                  <TodoList
                    focusActivo={running && phase === 'focus'}
                    onBonusArbol={() => {
                      const randomTree = TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)];
                      const newForest = [...forest, randomTree];
                      setForest(newForest);
                      try { localStorage.setItem('lumina-forest', JSON.stringify(newForest)) } catch {}
                    }}
                  />
                </div>

              </div>
            </article>
          </section>
        )}
      </main>
      {room &&
        <StudyRoom
          method={current} apiKey={apiKey} providerLabel={providerInfo(aiProvider).label} aiResult={aiResult} previewData={previewData} previewError={previewError} previewVersion={previewVersion} loading={loading} streamText={streamText}
          materials={materials} activeMaterial={activeMaterial} onSelectMaterial={selectMaterialForStudy}
          onAddMaterial={addMaterial} onRemoveMaterial={removeMaterial} onPreviewMaterial={setPreviewMaterial}
          onClose={() => setRoom(false)} onGenerate={() => generate(current)}
          callAI={callAI} aiProvider={aiProvider} aiModel={aiModel} aiBaseUrl={aiBaseUrl}
        />
      }
      {previewMaterial && <MaterialPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />}
      {keyOpen && (
        <KeyModal
          value={keyInput} setValue={setKeyInput}
          provider={providerInput} setProvider={setProviderInput}
          model={modelInput} setModel={setModelInput}
          baseUrl={baseUrlInput} setBaseUrl={setBaseUrlInput}
          localModels={localModels} localModelsFetching={localModelsFetching} localModelsError={localModelsError}
          onFetchLocalModels={fetchLocalModels}
          onSave={saveKey} onClose={() => setKeyOpen(false)}
        />
      )}
      {settingsOpen && <SettingsModal value={settingsInput} setValue={setSettingsInput} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />}
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
          initialName={materiaToRename ? (materias.find(m => m.id === materiaToRename)?.nombre || '') : ''}
          onSubmit={(nombre) => materiaToRename ? renameMateria(materiaToRename, nombre) : createMateria(nombre)}
          onClose={() => { setMateriaModalOpen(false); setMateriaToRename(null) }}
        />
      )}
      {notice && <div className="toast">✦ {notice}</div>}
    </div>
  )
}

// ===========================================================================
// TO-DO LIST COMPLETO
// ===========================================================================
function TodoList({ focusActivo = false, onBonusArbol }) {
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lumina-todos') || '[]') } catch { return [] }
  });
  const [xpTotal, setXpTotal] = useState(() => parseInt(localStorage.getItem('lumina-todo-xp') || '0'));
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState('normal');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [animandoId, setAnimandoId] = useState(null);
  const [plantillasOpen, setPlantillasOpen] = useState(false);
  
  const persist = (next) => {
    setTodos(next);
    try { localStorage.setItem('lumina-todos', JSON.stringify(next)) } catch {}
  }
  const persistXp = (v) => {
    setXpTotal(v);
    try { localStorage.setItem('lumina-todo-xp', String(v)) } catch {}
  }
  const nivel = Math.floor(xpTotal / XP_POR_NIVEL) + 1;
  const xpEnNivel = xpTotal % XP_POR_NIVEL;
  const progresoXp = (xpEnNivel / XP_POR_NIVEL) * 100;
  
  const agregarTarea = () => {
    const texto = nuevaTarea.trim();
    if (!texto) return;
    const nueva = {
      id: Math.random().toString(36).substr(2, 9),
      text: texto,
      prioridad: nuevaPrioridad,
      done: false,
      createdAt: Date.now()
    };
    persist([nueva, ...todos]);
    setNuevaTarea('');
  }

  const aplicarPlantilla = (plantilla) => {
    const nuevas = plantilla.tareas.map(t => ({
      id: Math.random().toString(36).substr(2, 9),
      text: t.text,
      prioridad: t.prioridad,
      done: false,
      createdAt: Date.now()
    }));
    persist([...nuevas, ...todos]);
    setPlantillasOpen(false);
    window.__luminaSetNotice?.(`${plantilla.icon} Se agregaron ${nuevas.length} tareas de "${plantilla.label}"`);
  }
  
  const toggleTarea = (id) => {
    const tarea = todos.find(t => t.id === id);
    if (!tarea) return;
    const nuevoEstado = !tarea.done;
    persist(todos.map(t => t.id === id ? { ...t, done: nuevoEstado } : t));
    if (nuevoEstado && !tarea.done) {
      const base = PRIORIDADES[tarea.prioridad]?.xp || 10;
      const xpGanado = focusActivo ? Math.round(base * BONUS_ENFOQUE) : base;
      const nuevoXp = xpTotal + xpGanado;
      persistXp(nuevoXp);
      const nuevoNivel = Math.floor(nuevoXp / XP_POR_NIVEL) + 1;
      if (nuevoNivel > nivel) {
        window.__luminaSetNotice?.(`🎉 ¡Subiste al Nivel ${nuevoNivel}! Tu bosque creció con un árbol extra.`);
        onBonusArbol?.();
      } else if (focusActivo) {
        window.__luminaSetNotice?.(`🔥 Bono de enfoque: +${xpGanado} XP`);
      }
    } else if (!nuevoEstado && tarea.done) {
      const base = PRIORIDADES[tarea.prioridad]?.xp || 10;
      const xpPerdido = focusActivo ? Math.round(base * BONUS_ENFOQUE) : base;
      persistXp(Math.max(0, xpTotal - xpPerdido));
    }
  }
  
  const eliminarTarea = (id) => {
    setAnimandoId(id);
    setTimeout(() => {
      persist(todos.filter(t => t.id !== id));
      setAnimandoId(null);
    }, 260);
  }
  
  const eliminarCompletadas = () => {
    const completadas = todos.filter(t => t.done);
    if (!completadas.length) return;
    persist(todos.filter(t => !t.done));
  }
  
  const tareasFiltradas = todos.filter(t => {
    if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false;
    if (filtroEstado === 'pendientes' && t.done) return false;
    if (filtroEstado === 'listas' && !t.done) return false;
    return true;
  });
  
  const pendientes = todos.filter(t => !t.done).length;
  const completadas = todos.filter(t => t.done).length;
  
  return (
    <div className="todo-card-inner">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">GESTOR DE TAREAS</p>
          <h3 style={{ font: "600 18px 'Playfair Display'", margin: 0 }}>To-Do List</h3>
        </div>
        <div className="todo-stats-mini">
          <span className="todo-stat pending">{pendientes} pendientes</span>
          <span className="todo-stat done">{completadas} listas</span>
        </div>
      </div>
      {focusActivo && (
        <div className="todo-focus-banner">
          🔥 Sesión de enfoque activa · las tareas que completes ahora valen +{Math.round((BONUS_ENFOQUE - 1) * 100)}% XP
        </div>
      )}
      <div className="todo-level">
        <div className="todo-level-head">
          <div className="todo-level-badge">
            <span className="todo-level-label">LVL</span>
            <span className="todo-level-num">{nivel}</span>
          </div>
          <div className="todo-level-info">
            <span className="todo-level-name">Nivel {nivel}</span>
            <span className="todo-level-xp">{xpEnNivel} / {XP_POR_NIVEL} XP</span>
          </div>
        </div>
        <div className="todo-xp-bar">
          <div className="todo-xp-fill" style={{ width: `${progresoXp}%` }} />
        </div>
      </div>
      <div className="todo-input-row">
        <input
          type="text"
          className="todo-input"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregarTarea()}
          placeholder="¿Qué quieres lograr hoy?"
        />
        <div className={`todo-prio-wrapper prio-${nuevaPrioridad}`}>
          <select
            className="todo-prio-select"
            value={nuevaPrioridad}
            onChange={(e) => setNuevaPrioridad(e.target.value)}
          >
            <option value="normal">● Normal</option>
            <option value="media">◆ Media</option>
            <option value="alta">★ Alta</option>
          </select>
        </div>
        <button className="todo-add-btn" onClick={agregarTarea} title="Agregar tarea">+</button>
      </div>
      <div className="todo-templates">
        <button className="todo-template-toggle" onClick={() => setPlantillasOpen(o => !o)}>
          ✦ Usar plantilla de estudiante {plantillasOpen ? '▴' : '▾'}
        </button>
        {plantillasOpen && (
          <div className="todo-template-menu">
            {PLANTILLAS_TODO.map(p => (
              <button key={p.id} className="todo-template-item" onClick={() => aplicarPlantilla(p)}>
                <span className="todo-template-icon">{p.icon}</span>
                <span className="todo-template-text">
                  <b>{p.label}</b>
                  <small>{p.tareas.length} tareas sugeridas</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="todo-filters">
        <div className="todo-filter-group">
          <span className="todo-filter-label">Prioridad</span>
          <div className="todo-filter-chips">
            {['todas', 'normal', 'media', 'alta'].map(p => (
              <button
                key={p}
                className={`todo-chip ${filtroPrioridad === p ? 'active' : ''} ${p !== 'todas' ? `prio-${p}` : ''}`}
                onClick={() => setFiltroPrioridad(p)}
              >
                {p === 'todas' ? 'Todas' : PRIORIDADES[p].icon + ' ' + PRIORIDADES[p].label}
              </button>
            ))}
          </div>
        </div>
        <div className="todo-filter-group">
          <span className="todo-filter-label">Estado</span>
          <div className="todo-filter-chips">
            {['todas', 'pendientes', 'listas'].map(e => (
              <button
                key={e}
                className={`todo-chip ${filtroEstado === e ? 'active' : ''}`}
                onClick={() => setFiltroEstado(e)}
              >
                {e === 'todas' ? 'Todas' : e === 'pendientes' ? 'Pendientes' : 'Listas'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="todo-list">
        {tareasFiltradas.length === 0 ? (
          <div className="todo-empty">
            <span>⌁</span>
            <div>
              <b>{todos.length === 0 ? 'Tu lista está vacía' : 'Sin resultados'}</b>
              <p>{todos.length === 0 ? 'Agrega tu primera tarea para empezar.' : 'Prueba con otros filtros.'}</p>
            </div>
          </div>
        ) : (
          tareasFiltradas.map(t => {
            const prio = PRIORIDADES[t.prioridad] || PRIORIDADES.normal;
            return (
              <div
                key={t.id}
                className={`todo-item prio-${t.prioridad} ${t.done ? 'done' : ''} ${animandoId === t.id ? 'removing' : ''}`}
              >
                <button
                  className={`todo-check ${prio.color}`}
                  onClick={() => toggleTarea(t.id)}
                  title={t.done ? 'Marcar como pendiente' : 'Marcar como completada'}
                >
                  {t.done ? '✓' : ''}
                </button>
                <div className="todo-item-content">
                  <span className="todo-item-text">{t.text}</span>
                  <span className={`todo-item-badge prio-${t.prioridad}`}>
                    {prio.icon} {prio.label} · +{prio.xp} XP
                  </span>
                </div>
                <button
                  className="todo-delete"
                  onClick={() => eliminarTarea(t.id)}
                  title="Eliminar tarea"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
      {completadas > 0 && (
        <button className="todo-clear-btn" onClick={eliminarCompletadas}>
          🗑 Eliminar completadas ({completadas})
        </button>
      )}
    </div>
  );
}

let setNoticeGlobal = () => {};
if (typeof window !== 'undefined') {
  window.__luminaSetNotice = (msg) => {
    window.dispatchEvent(new CustomEvent('lumina-notice', { detail: msg }));
  };
  setNoticeGlobal = (msg) => window.__luminaSetNotice?.(msg);
}
function useGlobalNotice(setter) {
  useEffect(() => {
    const handler = (e) => setter(e.detail);
    window.addEventListener('lumina-notice', handler);
    return () => window.removeEventListener('lumina-notice', handler);
  }, [setter]);
}

function StudyPickerModal({ materias, materiaId, materials, activeMaterial, onChooseMateria, onChooseMaterial, onAddMaterial, onRemoveMaterial, onPreviewMaterial, onCreateMateria, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop">
      <section style={{ width: 'min(620px,100%)', maxHeight: '86vh', overflow: 'auto', background: 'var(--bg-elevated)', borderRadius: 20, padding: '32px 34px', position: 'relative', boxShadow: 'var(--shadow-modal)' }}>
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow">{materiaId ? 'ELEGÍ EL CUADERNO' : 'ELEGÍ LA MATERIA'}</p>
        <h2 style={{ font: "600 22px 'Playfair Display'", margin: '0 0 6px' }}>{materiaId ? 'Elige el cuaderno con el que vas a estudiar' : '¿Qué materia vas a estudiar?'}</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>{materiaId ? 'Puedes agregar más material si hace falta.' : 'Elige una materia para ver sus cuadernos, o crea una nueva.'}</p>
        {!materiaId ? (
          <div className="method-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {materias.map(mat =>
              <button className="method-card" onClick={() => onChooseMateria(mat.id)} key={mat.id}>
                <i>▤</i> <strong>{mat.nombre}</strong> <span>Ver cuadernos</span>
              </button>
            )}
            <button className="method-card" onClick={onCreateMateria}>
              <i>+</i> <strong>Nueva materia</strong> <span>Crea una carpeta nueva</span>
            </button>
          </div>
        ) : (
          <>
            <button className="back" onClick={() => onChooseMateria(null)} style={{ marginBottom: 14 }}>← Cambiar de materia</button>
            <div className="material-list">
              {materials.length ? materials.map((m, i) =>
                <div className="material" key={i} onClick={() => onChooseMaterial(m)} onDoubleClick={() => onPreviewMaterial(m)} title="Doble clic para ver una vista previa" style={{ cursor: 'pointer', outline: activeMaterial?.id === m.id ? '2px solid #cdc4f2' : 'none', borderRadius: activeMaterial?.id === m.id ? '8px' : 0 }}>
                  <i>{m.type === 'PDF' ? 'PDF' : 'TXT'}</i>
                  <span> <b>{m.name}</b> <small>{m.type} · {m.size}{activeMaterial?.id === m.id ? ' · Seleccionado' : ''}</small> </span>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveMaterial(m) }}>⋯</button>
                </div>
              ) : (
                <div className="empty-material">
                  <span>⌁</span>
                  <div> <b>Esta materia está lista</b> <p>Agrega un PDF o un apunte para empezar.</p> </div>
                </div>
              )}
            </div>
            <label className="upload-link study-add-btn" style={{ marginTop: 14 }}>+ Agregar material <input type="file" accept=".pdf,.txt,.md" multiple onChange={onAddMaterial} /></label>
            <button className="primary wide" style={{ marginTop: 20, opacity: activeMaterial ? 1 : .5, cursor: activeMaterial ? 'pointer' : 'not-allowed' }} disabled={!activeMaterial} onClick={onConfirm}>Comenzar a estudiar →</button>
          </>
        )}
      </section>
    </div>
  )
}

function MateriaModal({ mode, initialName, onSubmit, onClose }) {
  const [name, setName] = useState(initialName || '')
  const submit = () => { const n = name.trim(); if (n) { onSubmit(n); onClose() } }
  return (
    <div className="modal-backdrop">
      <section className="key-modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="modal-icon">▤</span>
        <p className="eyebrow">{mode === 'rename' ? 'RENOMBRAR MATERIA' : 'NUEVA MATERIA'}</p>
        {mode === 'rename'
          ? <h2>Cambia el nombre <br /><em>de esta materia</em></h2>
          : <h2>Crea una carpeta <br /><em>para tus cuadernos</em></h2>}
        <p>{mode === 'rename' ? 'Los cuadernos que ya subiste se mantienen igual, solo cambia el nombre.' : 'Cada materia guarda su propio material: lo que subas acá no se mezclará con el de otras materias.'}</p>
        <label>Nombre de la materia <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Historia, Anatomía..." autoFocus onKeyDown={e => e.key === 'Enter' && submit()} /></label>
        <button className="primary wide" onClick={submit}>{mode === 'rename' ? 'Guardar nombre →' : 'Crear materia →'}</button>
      </section>
    </div>
  )
}

function KeyModal({ value, setValue, provider, setProvider, model, setModel, baseUrl, setBaseUrl, localModels, localModelsFetching, localModelsError, onFetchLocalModels, onSave, onClose }) {
  const info = providerInfo(provider);
  const models = AI_MODELS[provider] || [];
  const isCustom = provider === 'openai_compatible';
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
        <h2>Conecta tu propia <br /><em>IA con tu API Key</em></h2>
        <p>La clave se guarda únicamente en el almacenamiento de este navegador. Nunca la enviamos a un servidor.</p>
        <label>Proveedor de IA
          <select value={provider} onChange={e => onProviderChange(e.target.value)} style={{ width: '100%', marginTop: 6, border: '1px solid var(--line-soft)', borderRadius: 8, padding: 12, background: 'var(--bg-surface-alt)', color: 'var(--ink)' }}>
            {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.sub}</option>)}
          </select>
        </label>
        {isCustom ? (
          <>
            <label>URL del servidor (LM Studio / Ollama)
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  value={baseUrl}
                  placeholder="http://localhost:1234"
                  onChange={e => setBaseUrl(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={onFetchLocalModels}
                  disabled={localModelsFetching}
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line-soft)', borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 600, color: 'var(--violet)', whiteSpace: 'nowrap', cursor: localModelsFetching ? 'not-allowed' : 'pointer', opacity: localModelsFetching ? 0.6 : 1 }}
                >
                  {localModelsFetching ? '…' : '↻ Cargar modelos'}
                </button>
              </div>
            </label>
            {localModelsError && (
              <p style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 12px', margin: '0 0 4px' }}>
                {localModelsError}
              </p>
            )}
            <label>Modelo activo
              {localModels.length > 0 ? (
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{ width: '100%', marginTop: 6, border: '1px solid var(--line-soft)', borderRadius: 8, padding: 12, background: 'var(--bg-surface-alt)', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  {localModels.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              ) : (
                <input
                  value={model}
                  placeholder="Cargá los modelos con el botón, o escribí el nombre"
                  onChange={e => setModel(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </label>
            {detectSmallModelWarning(model) && (
              <p style={{ fontSize: 12, color: 'var(--warning, #a86b1c)', background: 'var(--warning-bg, #fdf3e2)', border: '1px solid var(--warning-border, #f0d8a8)', borderRadius: 8, padding: '8px 12px', margin: '0 0 4px', lineHeight: 1.5 }}>
                ⚠ {detectSmallModelWarning(model)}
              </p>
            )}
            <label>API Key (opcional — usa "lm-studio" si no configuraste una)
              <input type="text" value={value} placeholder="lm-studio" onChange={e => setValue(e.target.value)} style={{ marginTop: 6 }} />
            </label>
          </>
        ) : (
          <>
            <label>Versión del modelo
              <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', marginTop: 6, border: '1px solid var(--line-soft)', borderRadius: 8, padding: 12, background: 'var(--bg-surface-alt)', color: 'var(--ink)' }}>
                {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label>API Key de {info.label} <input type="password" value={value} placeholder={info.placeholder} onChange={e => setValue(e.target.value)} autoFocus /></label>
          </>
        )}
        <button className="primary wide" onClick={onSave}>Guardar y validar →</button>
        {info.helpUrl && <small>¿No tienes una cuenta? <a href={info.helpUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--violet)', textDecoration: 'underline' }}>{info.helpLabel}</a></small>}
      </section>
    </div>
  )
}

function SettingsModal({ value, setValue, onSave, onClose }) {
  const update = (field) => (e) => setValue(v => ({ ...v, [field]: e.target.value }))
  return (
    <div className="modal-backdrop">
      <section className="key-modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="modal-icon">⚙</span>
        <p className="eyebrow">AJUSTES DE ENFOQUE</p>
        <h2>Personaliza tu <br /><em>ciclo Pomodoro</em></h2>
        <p>Configura la duración de cada bloque de enfoque y de descanso.</p>
        <label>Minutos de enfoque <input type="number" min="1" max="180" value={value.study} onChange={update('study')} autoFocus /></label>
        <label>Minutos de descanso corto <input type="number" min="1" max="60" value={value.short} onChange={update('short')} /></label>
        <label>Minutos de descanso largo <input type="number" min="1" max="90" value={value.long} onChange={update('long')} /></label>
        <label>Sesiones de enfoque antes del descanso largo <input type="number" min="1" max="12" value={value.cycle} onChange={update('cycle')} /></label>
        <button className="primary wide" onClick={onSave}>Guardar ajustes →</button>
        <small>Se aplica a partir de tu próxima sesión sin interrumpir un enfoque en curso.</small>
      </section>
    </div>
  )
}

function base64ABytes(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// ===========================================================================
// 3. FUNCIÓN cargarPdfJs CON SOPORTE PARA ARCHIVOS LOCALES Y CDNs DE RESPALDO
// ===========================================================================
let pdfjsCargaPromise = null;

function cargarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsCargaPromise) return pdfjsCargaPromise;

  const FUENTES = [
    {
      nombre: 'Archivo local (/public/pdf.worker.min.js)',
      lib: '/pdf.min.js',
      worker: '/pdf.worker.min.js'
    },
    {
      nombre: 'Archivo local (/public/pdf.worker.js)',
      lib: '/pdf.min.js',
      worker: '/pdf.worker.js'
    },
    {
      nombre: 'jsDelivr CDN',
      lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.js',
      worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js'
    },
    {
      nombre: 'unpkg CDN',
      lib: 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.js',
      worker: 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js'
    },
    {
      nombre: 'cdnjs CDN',
      lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js'
    }
  ];

  pdfjsCargaPromise = (async () => {
    let ultimoError = null;
    for (const fuente of FUENTES) {
      try {
        await new Promise((resolve, reject) => {
          const scriptExistente = document.querySelector(`script[src="${fuente.lib}"]`);
          if (scriptExistente && window.pdfjsLib) {
            return resolve(scriptExistente);
          }

          const s = document.createElement('script');
          s.src = fuente.lib;
          s.onload = () => {
            // Verificar si window.pdfjsLib se definió realmente
            // (evita aceptar index.html con status 200 en Vite cuando el archivo no existe)
            if (window.pdfjsLib) {
              resolve(s);
            } else {
              reject(new Error(`El script ${fuente.lib} no definió window.pdfjsLib (archivo no encontrado o HTML devuelto).`));
            }
          };
          s.onerror = () => reject(new Error(`Fallo de red al cargar ${fuente.lib}`));
          document.head.appendChild(s);
        });

        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = fuente.worker;
          console.log(`✓ pdf.js cargado correctamente desde [${fuente.nombre}]:`, fuente.lib);
          return window.pdfjsLib;
        }
      } catch (err) {
        ultimoError = err;
        console.warn(`⚠ Carga fallida (${fuente.nombre}):`, err.message);
      }
    }

    pdfjsCargaPromise = null; // Permite reintentar si se agregan los archivos luego
    throw new Error('No se pudo descargar el lector de PDF desde los archivos locales (/public/pdf.min.js) ni desde ningún CDN. Coloca pdf.min.js y pdf.worker.min.js en la carpeta public de tu proyecto.');
  })();

  return pdfjsCargaPromise;
}

function PdfPreview({ data, nombre }) {
  const contenedorRef = useRef(null);
  const [estado, setEstado] = useState('cargando');
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
      <div style={{ padding: '22px 16px', textAlign: 'center' }}>
        <b style={{ color: 'var(--danger)', fontSize: 13 }}>No pudimos mostrar la vista previa de {nombre}.</b>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>Descargalo desde tu biblioteca para abrirlo con otra app.</p>
      </div>
    )
  }
  return (
    <div>
      {estado === 'cargando' && <p style={{ padding: 16, margin: 0, fontSize: 12, color: 'var(--muted)' }}>Cargando vista previa…</p>}
      <div ref={contenedorRef} style={{ padding: estado === 'listo' ? 14 : 0 }} />
    </div>
  )
}

function MaterialPreviewModal({ material, onClose, onReplace }) {
  const isPdf = (material.mimeType || '').includes('pdf');
  const [text, setText] = useState('');
  const [replacing, setReplacing] = useState(false);
  useEffect(() => {
    if (isPdf) return;
    setText(decodeTextFromBase64(material.data));
  }, [material, isPdf]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onReplace) return;
    setReplacing(true);
    try { await onReplace(material, file) } finally { setReplacing(false) }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        style={{ width: 'min(760px,100%)', height: 'min(80vh,720px)', background: 'var(--bg-elevated)', borderRadius: 20, padding: '26px 28px', position: 'relative', boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow" style={{ margin: 0 }}>VISTA PREVIA</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingRight: 30 }}>
          <div>
            <h2 style={{ font: "600 18px 'Playfair Display'", margin: '4px 0 4px' }}>{material.name}</h2>
            {!isPdf && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                {charCount.toLocaleString('es')} caracteres · {wordCount.toLocaleString('es')} palabras
                {charCount < 200 && ' — si tu archivo local tiene más contenido que esto, puede que hayas subido una versión vieja o incompleta. Reemplazalo abajo.'}
              </p>
            )}
          </div>
          {onReplace && (
            <label className="plain-link" style={{ whiteSpace: 'nowrap', cursor: replacing ? 'not-allowed' : 'pointer', opacity: replacing ? 0.6 : 1 }}>
              {replacing ? 'Actualizando…' : '🔄 Reemplazar archivo'}
              <input type="file" accept=".pdf,.txt,.md" onChange={handleReplaceFile} disabled={replacing} style={{ display: 'none' }} />
            </label>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--line-soft)', borderRadius: 12, background: 'var(--bg-surface-alt)', marginTop: 10 }}>
          {isPdf
            ? <PdfPreview data={material.data} nombre={material.name} />
            : text
              ? <pre style={{ margin: 0, padding: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink)', fontFamily: 'inherit' }}>{text}</pre>
              : <p style={{ padding: 16, margin: 0, fontSize: 12, color: 'var(--danger)' }}>No pudimos leer el contenido de este archivo. Probá reemplazarlo desde el botón de arriba.</p>}
        </div>
      </section>
    </div>
  )
}

const mezclar = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const soloNegrita = (html) => String(html ?? '').replace(/<(?!\/?b\b)[^>]*>/gi, '');

// ============================================================
// EXPORTACIÓN: PDF imprimible / Anki / documento imprimible
// ============================================================
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Abre una ventana con HTML listo para imprimir (el usuario elige "Guardar como PDF"
// en el diálogo de impresión del navegador). No depende de librerías externas.
function abrirVentanaImprimible(titulo, bodyHtml) {
  const win = window.open('', '_blank');
  if (!win) { alert('Tu navegador bloqueó la ventana emergente. Habilitala para poder exportar a PDF.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #222; padding: 32px; max-width: 800px; margin: 0 auto; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      h2 { font-size: 15px; color: #555; font-weight: 400; margin-top: 0; }
      ul { margin: 4px 0 10px 0; }
      li { margin-bottom: 4px; line-height: 1.5; }
      .hoja { page-break-inside: avoid; border: 1px solid #ccc; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; }
      .campo-titulo { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #7766c9; margin: 10px 0 4px; }
      .resumen { background: #f5f2fc; border-radius: 6px; padding: 8px 12px; margin-top: 8px; }
      b { color: #a86b1c; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>${bodyHtml}<script>window.onload = () => setTimeout(() => window.print(), 200);</script></body></html>`);
  win.document.close();
}

// Convierte el árbol nombre/hijos del mapa mental en una lista anidada imprimible.
function outlineHtmlDesdeMapa(nodo, nivel = 0) {
  if (!nodo) return '';
  const hijos = Array.isArray(nodo.hijos) ? nodo.hijos : [];
  const hijosHtml = hijos.length ? `<ul>${hijos.map(h => `<li>${outlineHtmlDesdeMapa(h, nivel + 1)}</li>`).join('')}</ul>` : '';
  return `${nivel === 0 ? `<h1>${escapeHtml(nodo.nombre)}</h1>` : escapeHtml(nodo.nombre)}${hijosHtml}`;
}
function exportarMapaAPDF(datos) {
  if (!datos) return;
  abrirVentanaImprimible(datos.nombre || 'Mapa mental', outlineHtmlDesdeMapa(datos));
}

// Documento imprimible del método Cornell.
function exportarCornellAPDF(datos) {
  if (!datos) return;
  const hojas = Array.isArray(datos.hojas) ? datos.hojas : datos.hojas ? [datos.hojas] : [];
  const hojasHtml = hojas.map((h, i) => {
    if (!h) return '';
    const ideas = toStrArr(h.ideasClave), notas = toStrArr(h.notas), resumen = toStrArr(h.resumen);
    return `<div class="hoja">
      <div class="campo-titulo">Hoja ${i + 1} — ${escapeHtml(h.titulo || '')}</div>
      <div style="font-size:12px;color:#777;">${escapeHtml(h.asignatura || datos.asignatura || '')} ${h.fecha || datos.fecha ? '· ' + escapeHtml(h.fecha || datos.fecha) : ''}</div>
      <div class="campo-titulo">Ideas clave</div>
      <ul>${ideas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <div class="campo-titulo">Notas</div>
      <ul>${notas.map(x => `<li>${soloNegrita(x)}</li>`).join('')}</ul>
      <div class="resumen"><b>${escapeHtml(h.resumenTitulo || 'Resumen')}:</b> ${resumen.map(x => soloNegrita(x)).join(' ')}</div>
    </div>`;
  }).join('');
  const body = `<h1>${escapeHtml(datos.tituloPagina || 'Método Cornell')}</h1><h2>${escapeHtml(datos.subtitulo || '')}</h2>${hojasHtml}`;
  abrirVentanaImprimible(datos.tituloPagina || 'Cornell', body);
}

// Exporta el banco de flashcards en formato .txt separado por tabs, que Anki
// importa directamente (Archivo > Importar, elegir "Campos separados por: Tab").
function exportarFlashcardsAnki(banco, nombre) {
  if (!Array.isArray(banco) || !banco.length) return;
  const lineas = banco.map(c => {
    const front = String(c.p ?? '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = String(c.r ?? '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    return `${front}\t${back}`;
  });
  const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${(nombre || 'flashcards').replace(/[^a-z0-9-_]+/gi, '_')}_anki.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function posicionRelativa(el, contenedor, zoom = 1) {
  const cRect = contenedor.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  return {
    x: (eRect.left - cRect.left) / zoom,
    y: (eRect.top  - cRect.top)  / zoom,
    width:  eRect.width  / zoom,
    height: eRect.height / zoom,
  };
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
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.3, MAX_ZOOM = 2.5, ZOOM_STEP = 0.15;

  const registrarRef = (id, el) => { if (el) nodosRef.current[id] = el; else delete nodosRef.current[id]; };
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
      const w = contenedor.scrollWidth;
      const h = contenedor.scrollHeight;
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const nuevasLineas = [];
      enlaces.forEach(({ id, parentId }) => {
        const padreEl = nodosRef.current[parentId], hijoEl = nodosRef.current[id];
        if (!padreEl || !hijoEl) return;
        const p = posicionRelativa(padreEl, contenedor, zoom);
        const c = posicionRelativa(hijoEl, contenedor, zoom);
        const startX = p.x + p.width, startY = p.y + p.height / 2;
        const endX = c.x, endY = c.y + c.height / 2;
        const cx = (endX - startX) * 0.45;
        nuevasLineas.push(`M ${startX} ${startY} C ${startX + cx} ${startY}, ${endX - cx} ${endY}, ${endX} ${endY}`);
      });
      setLineas(nuevasLineas);
    }
    dibujar();
    const raf = requestAnimationFrame(dibujar);
    const t = setTimeout(dibujar, 200);
    window.addEventListener('resize', dibujar);
    let cancelado = false;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelado) dibujar(); });
    return () => { cancelado = true; cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', dibujar); };
  }, [enlaces, zoom]);
  
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const centrar = () => { el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2); };
    const raf = requestAnimationFrame(centrar);
    return () => cancelAnimationFrame(raf);
  }, [datos]);

  // Zoom con rueda del mouse / trackpad (Ctrl+scroll o pinch)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parseFloat((z + delta).toFixed(2)))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  
  if (!datos) return null;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Controles de zoom */}
      <div className="mm-zoom-controls">
        <button className="mm-zoom-btn" onClick={() => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))))} title="Acercar">＋</button>
        <span className="mm-zoom-label" onClick={() => setZoom(1)} title="Restablecer zoom">{Math.round(zoom * 100)}%</span>
        <button className="mm-zoom-btn" onClick={() => setZoom(z => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))))} title="Alejar">－</button>
      </div>
      <div className="mm-scroll" ref={scrollRef}>
        <div
          className="mm-container"
          ref={contenedorRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <svg className="mm-svg" ref={svgRef}>
            {lineas.map((d, i) => <path key={i} d={d} fill="none" stroke="#a89bdc" strokeWidth="2.5" />)}
          </svg>
          <div className="mm-nodos">
            <MapaRama nodo={datos} nivel={0} id="r" registrarRef={registrarRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Coerces a value to an array of strings, handling the common case where
// the AI returns a plain string instead of a single-element array.
const toStrArr = (v) => {
  if (!v) return []
  if (Array.isArray(v)) return v.map(x => (x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x)))
  return [String(v)]
}

function CornellView({ datos }) {
  if (!datos) return null;
  const hojas = Array.isArray(datos.hojas) ? datos.hojas : datos.hojas ? [datos.hojas] : [];
  const stickers = Array.isArray(datos.stickers) ? datos.stickers : [];
  const tintesBase = Array.isArray(datos.tintes) && datos.tintes.length ? datos.tintes : ['var(--bg-soft)'];
  return (
    <div>
      <div className="cn-header">
        {stickers.map((s, i) => (
          <span key={i} className="cn-sticker" style={{ top: s.top || '0px', left: s.left, right: s.right, transform: `rotate(${s.rot || '0deg'})` }}>{s.emoji}</span>
        ))}
        <h2>{datos.tituloPagina}</h2>
        <p className="cn-sub">{datos.subtitulo}</p>
      </div>
      {hojas.map((h, i) => {
        if (!h) return null;
        const tinte = tintesBase[i % tintesBase.length];
        const tinteFinal = document.documentElement.getAttribute('data-theme') === 'dark' ? 'var(--bg-soft)' : tinte;
        const ideasClave = toStrArr(h.ideasClave);
        const notas = toStrArr(h.notas);
        const resumen = toStrArr(h.resumen);
        return (
          <div key={i} className="cn-hoja">
            <div className="cn-fila-enc">
              <div className="cn-campo">
                <span className="cn-etiqueta">Título</span>
                <span className="cn-valor">{h.titulo || ''}</span>
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
                <ul>{ideasClave.map((x, j) => <li key={j}>{x}</li>)}</ul>
              </div>
              <div className="cn-col">
                <p className="cn-titulo-col">Notas de la clase</p>
                <ul>{notas.map((x, j) => <li key={j} dangerouslySetInnerHTML={{ __html: soloNegrita(x) }} />)}</ul>
              </div>
            </div>
            <div className="cn-fila-resumen" style={{ background: tinteFinal }}>
              <p className="cn-titulo-resumen">{h.resumenTitulo || 'Resumen'}</p>
              <ul>{resumen.map((x, j) => <li key={j} dangerouslySetInnerHTML={{ __html: soloNegrita(x) }} />)}</ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const renderFeynmanMD = (text) => {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return raw.split(/\n\s*\n/).map(block => {
    const trimmed = block.trim();
    const isQuote = /^>\s?/.test(trimmed);
    const body = trimmed.replace(/^>\s?/, '');
    const html = esc(body)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return isQuote ? `<blockquote>${html}</blockquote>` : `<p>${html}</p>`;
  }).join('');
}

function FeynmanView({ datos }) {
  if (!datos) return null;
  const puntos = datos.paso3_lagunas_y_puntos_clave || [];
  return (
    <div className="fy-wrap">
      <div className="fy-header">
        <span className="fy-tag">{datos.materia}</span>
        <h2>{datos.titulo}</h2>
      </div>

      <div className="fy-card">
        <div className="fy-card-top"><span className="fy-step">PASO 1 · CONCEPTO CLAVE</span></div>
        <div className="fy-card-title">Concepto Central</div>
        <div className="fy-content" dangerouslySetInnerHTML={{ __html: renderFeynmanMD(datos.paso1_concepto) }} />
      </div>

      <div className="fy-card">
        <div className="fy-card-top"><span className="fy-step">PASO 2 · EXPLICACIÓN SENCILLA</span></div>
        <div className="fy-card-title">¿Cómo se lo explicarías a un niño?</div>
        <div className="fy-content" dangerouslySetInnerHTML={{ __html: renderFeynmanMD(datos.paso2_explicacion_simple) }} />
      </div>

      <div className="fy-card">
        <div className="fy-card-top"><span className="fy-step">PASO 3 · PUNTOS CRÍTICOS REFORZADOS</span></div>
        <div className="fy-card-title">Engranajes y Detalles Fundamentales</div>
        <div>
          {puntos.map((p, i) => (
            <div key={i} className="fy-keypoint">
              <div className="fy-keypoint-title">{p.punto}</div>
              <div className="fy-keypoint-desc" dangerouslySetInnerHTML={{ __html: renderFeynmanMD(p.explicacion) }} />
            </div>
          ))}
        </div>
      </div>

      <div className="fy-card fy-green">
        <div className="fy-card-top"><span className="fy-step">PASO 4 · SÍNTESIS Y ANALOGÍA</span></div>
        <div className="fy-card-title">Regla de Memoria</div>
        <div className="fy-content" dangerouslySetInnerHTML={{ __html: renderFeynmanMD(datos.paso4_analogia_y_resumen) }} />
      </div>
    </div>
  )
}

function SpacedRepetitionView({ banco }) {
  const STORAGE_KEY = 'lumina-sr-deck-v2';

  const initDeck = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // Verificar que el mazo guardado corresponde al mismo banco de preguntas
        const savedIds = saved.map(c => c.id).sort().join(',');
        const bancoIds = banco.map((_, i) => i + 1).sort().join(',');
        if (savedIds === bancoIds) return saved;
      }
    } catch {}
    return banco.map((c, i) => ({ id: i + 1, front: c.p, back: c.r, level: 0, dueDate: 0 }));
  };

  const [deck, setDeckState] = useState(initDeck);
  const [dueQueue, setDueQueue] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [showEval, setShowEval] = useState(false);

  const saveDeck = (d) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
  };

  const buildQueue = (d) => {
    const now = Date.now();
    return d.filter(c => c.dueDate <= now);
  };

  useEffect(() => {
    const q = buildQueue(deck);
    setDueQueue(q);
    setCurrentCard(q[0] || null);
    setFlipped(false);
    setShowEval(false);
  }, []);

  const now = Date.now();
  const newCount = deck.filter(c => c.level === 0).length;
  const dueCount = deck.filter(c => c.dueDate <= now && c.level > 0).length;
  const doneCount = deck.filter(c => c.dueDate > now).length;

  const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  deck.forEach(c => {
    if (c.level > 0) { const b = Math.min(c.level, 4); boxCounts[b]++; }
  });

  const handleFlip = () => {
    if (!currentCard) return;
    setFlipped(true);
    setShowEval(true);
  };

  const processFeedback = (quality) => {
    if (!currentCard) return;
    const nowTs = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let addDays = 0;
    const updated = { ...currentCard };
    if (updated.level === 0) updated.level = 1;

    switch (quality) {
      case 'again': updated.level = 1; addDays = 0; break;
      case 'hard':  addDays = 1; updated.level += 1; break;
      case 'good':  addDays = updated.level * 2; updated.level += 2; break;
      case 'easy':  addDays = updated.level * 4; updated.level += 3; break;
    }

    let newQueue = [...dueQueue];
    if (addDays === 0) {
      updated.dueDate = nowTs + 60 * 1000;
      newQueue = [...newQueue.slice(1), updated];
    } else {
      updated.dueDate = nowTs + addDays * ONE_DAY;
      newQueue = newQueue.slice(1);
    }

    const newDeck = deck.map(c => c.id === updated.id ? updated : c);
    saveDeck(newDeck);
    setDeckState(newDeck);
    setDueQueue(newQueue);

    setTimeout(() => {
      const next = newQueue[0] || null;
      setCurrentCard(next);
      setFlipped(false);
      setShowEval(false);
    }, 180);
  };

  const resetDeck = () => {
    const fresh = deck.map(c => ({ ...c, level: 0, dueDate: 0 }));
    saveDeck(fresh);
    setDeckState(fresh);
    const q = fresh;
    setDueQueue(q);
    setCurrentCard(q[0] || null);
    setFlipped(false);
    setShowEval(false);
  };

  const lvl = currentCard ? (currentCard.level === 0 ? 1 : currentCard.level) : 1;

  if (!banco || !banco.length) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>La IA no devolvió tarjetas para este material.</p>;

  return (
    <div className="fc-wrap">
      {/* Dashboard */}
      <div className="fc-dash">
        <div>Nuevas: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono, monospace', fontSize: 14, marginLeft: 5 }}>{newCount}</strong></div>
        <div>Para Repasar Hoy: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono, monospace', fontSize: 14, marginLeft: 5 }}>{dueCount}</strong></div>
        <div>Dominadas: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono, monospace', fontSize: 14, marginLeft: 5 }}>{doneCount}</strong></div>
      </div>

      {/* Tarjeta 3D */}
      <div className="fc-container">
        <div className={`fc-card${flipped ? ' volteada' : ''}`} onClick={handleFlip} style={{ cursor: currentCard ? 'pointer' : 'default' }}>
          <div className="fc-face front">
            <span className="fc-badge">Anverso (Pregunta)</span>
            <div className="fc-texto">
              {currentCard
                ? currentCard.front
                : <span style={{ color: 'var(--success)', fontSize: 38, display: 'block', marginBottom: 10 }}>✔<br /><span style={{ fontSize: 16, color: 'var(--ink)' }}>¡Mazo al día!</span></span>
              }
            </div>
          </div>
          <div className="fc-face back">
            <span className="fc-badge">Reverso (Respuesta)</span>
            <div className="fc-texto" style={{ fontSize: '1em', overflowY: 'auto' }}>
              {currentCard ? currentCard.back : 'Has completado todos los repasos programados. Volvé más tarde.'}
            </div>
          </div>
        </div>
      </div>

      {/* Botón voltear */}
      {!showEval && (
        <div className="fc-nav" style={{ display: 'flex' }}>
          <button
            className="fc-main"
            onClick={handleFlip}
            disabled={!currentCard}
            style={{ background: 'var(--violet)', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: currentCard ? 'pointer' : 'not-allowed' }}
          >
            {currentCard ? 'Mostrar Respuesta' : 'Nada por repasar'}
          </button>
          {!currentCard && (
            <button onClick={resetDeck} style={{ background: 'var(--bg-soft)', color: 'var(--violet)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 13, marginLeft: 10 }}>
              ↺ Reiniciar mazo
            </button>
          )}
        </div>
      )}

      {/* Botones de evaluación Ebbinghaus */}
      <div className={`fc-eval${showEval ? ' visible' : ''}`}>
        <button className="fc-btn-mal" onClick={() => processFeedback('again')}>
          Otra vez <small>&lt; 1 min</small>
        </button>
        <button className="fc-btn-dificil" onClick={() => processFeedback('hard')}>
          Difícil <small>+ 1 día</small>
        </button>
        <button className="fc-btn-bien" onClick={() => processFeedback('good')}>
          Bien <small>+ {lvl * 2} días</small>
        </button>
        <button className="fc-btn-facil" onClick={() => processFeedback('easy')}>
          Fácil <small>+ {lvl * 4} días</small>
        </button>
      </div>

      {/* Distribución Leitner */}
      <div style={{ marginTop: 38 }}>
        <p style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: '1.2px', color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 8 }}>DISTRIBUCIÓN DEL MAZO · SISTEMA LEITNER</p>
        <div className="leitner">
          {[
            { label: 'Caja 1 · Aprendizaje', bg: 'var(--danger-bg)', count: boxCounts[1] },
            { label: 'Caja 2 · En Progreso',  bg: 'var(--bg-soft)',   count: boxCounts[2] },
            { label: 'Caja 3 · Retención',    bg: 'var(--amber-bg)',  count: boxCounts[3] },
            { label: 'Caja 4+ · Dominio',     bg: 'var(--mint)',      count: boxCounts[4] },
          ].map((box, i) => (
            <div key={i} style={{ background: box.bg }}>
              <b style={{ font: '600 28px Playfair Display', display: 'block', color: 'var(--violet)' }}>{box.count}</b>
              <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>{box.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
        <div>Tarjeta: <b>{idx + 1}</b> / <b>{mazo.length}</b></div>
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

function RecallView({ preguntas: preguntasCrudas }) {
  const [mazo, setMazo] = useState(() => mezclar(preguntasCrudas || []));
  const [idx, setIdx] = useState(0);
  const [voltea, setVoltea] = useState(false);
  const [evalVisible, setEvalVisible] = useState(false);
  const [bien, setBien] = useState(0);
  const [mal, setMal] = useState(0);
  const [errores, setErrores] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [enRepaso, setEnRepaso] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [faseBanner, setFaseBanner] = useState('Fase 1: Vuelta Completa');
  const [faseColor, setFaseColor] = useState('#7766c9');

  if (!preguntasCrudas?.length) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>La IA no devolvió preguntas para este material.</p>

  const actual = mazo[idx];
  const pctBien = (bien + mal) > 0 ? Math.round((bien / (bien + mal)) * 100) : 0;

  const resetCard = (nuevoMazo, nuevoIdx) => {
    setVoltea(false);
    setEvalVisible(false);
    setTimeout(() => { setMazo(nuevoMazo); setIdx(nuevoIdx); }, 180);
  };

  const voltearTarjeta = () => {
    const next = !voltea;
    setVoltea(next);
    if (next) setTimeout(() => setEvalVisible(true), 210);
    else setEvalVisible(false);
  };

  const irSiguiente = () => {
    const next = (idx + 1) % mazo.length;
    resetCard(mazo, next);
  };

  const irAtras = () => {
    if (!historial.length) return;
    const ultima = historial[historial.length - 1];
    const nuevoHistorial = historial.slice(0, -1);
    setHistorial(nuevoHistorial);
    if (ultima.calificacion) setBien(b => b - 1);
    else {
      setMal(m => m - 1);
      setErrores(e => e.filter(c => c.p !== ultima.tarjeta.p));
    }
    const nuevoMazo = [...mazo];
    nuevoMazo.splice(ultima.indice, 0, ultima.tarjeta);
    resetCard(nuevoMazo, ultima.indice);
  };

  const registrar = (estabaBien) => {
    const tarjeta = mazo[idx];
    setHistorial(h => [...h, { tarjeta, calificacion: estabaBien, indice: idx }]);

    let nuevosErrores = [...errores];
    if (estabaBien) setBien(b => b + 1);
    else {
      setMal(m => m + 1);
      if (!nuevosErrores.some(c => c.p === tarjeta.p)) nuevosErrores.push(tarjeta);
      setErrores(nuevosErrores);
    }

    const nuevoMazo = [...mazo];
    nuevoMazo.splice(idx, 1);

    if (nuevoMazo.length === 0) {
      // Fin de vuelta: pasar a fase 2 o terminar
      if (!enRepaso) {
        if (nuevosErrores.length > 0) {
          setEnRepaso(true);
          setFaseBanner('Fase 2: Repaso de Errores');
          setFaseColor('#c0392b');
          setHistorial([]);
          resetCard(mezclar(nuevosErrores), 0);
          setErrores([]);
        } else {
          setTerminado(true);
        }
      } else {
        if (nuevosErrores.length > 0) {
          setHistorial([]);
          resetCard(mezclar(nuevosErrores), 0);
          setErrores([]);
        } else {
          setTerminado(true);
        }
      }
    } else {
      const nuevoIdx = idx >= nuevoMazo.length ? 0 : idx;
      resetCard(nuevoMazo, nuevoIdx);
    }
  };

  const reiniciar = () => {
    setMazo(mezclar(preguntasCrudas || []));
    setIdx(0); setVoltea(false); setEvalVisible(false);
    setBien(0); setMal(0); setErrores([]); setHistorial([]);
    setEnRepaso(false); setTerminado(false);
    setFaseBanner('Fase 1: Vuelta Completa'); setFaseColor('#7766c9');
  };

  if (terminado) return (
    <div className="rc-wrap">
      <div className="rc-done">
        <div className="rc-done-icon">{pctBien >= 80 ? '🏆' : pctBien >= 50 ? '📈' : '💪'}</div>
        <h3 className="rc-done-title">¡Sesión completada!</h3>
        <p className="rc-done-sub">Dominaste {preguntasCrudas.length} preguntas de memoria</p>
        <div className="rc-done-stats">
          <div className="rc-stat rc-stat-bien"><span>{bien}</span><small>Recordé</small></div>
          <div className="rc-stat rc-stat-score"><span>{pctBien}%</span><small>Retención</small></div>
          <div className="rc-stat rc-stat-mal"><span>{mal}</span><small>Me costó</small></div>
        </div>
        <button className="rc-btn-primary" onClick={reiniciar}>↶ Volver a intentar</button>
      </div>
    </div>
  );

  return (
    <div className="rc-wrap">
      <div className="rc-inner">
        {/* Banner de fase */}
        <div className="rc-fase-banner" style={{ background: faseColor }}>{faseBanner}</div>

        {/* Dashboard */}
        <div className="rc-dash">
          <div className="rc-dash-item">Tarjeta: <b>{idx + 1}</b>/<b>{mazo.length}</b></div>
          <div className="rc-dash-item rc-dash-bien">Bien: <b>{bien}</b></div>
          <div className="rc-dash-item rc-dash-mal">Mal: <b>{mal}</b></div>
        </div>

        {/* Tarjeta flip */}
        <div className="rc-card-scene" onClick={voltearTarjeta}>
          <div className={`rc-flip-card${voltea ? ' rc-flipped' : ''}`}>
            <div className="rc-face rc-face-front">
              <div className="rc-card-text">{actual?.p}</div>
              <div className="rc-badge-tipo">PREGUNTA</div>
            </div>
            <div className="rc-face rc-face-back">
              <div className="rc-card-text" style={{ fontSize: '1.1em' }}>{actual?.r}</div>
              <div className="rc-badge-tipo">RESPUESTA</div>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <div className="rc-nav">
          <button className="rc-nav-btn" onClick={irAtras} disabled={!historial.length}>⬅ Atrás</button>
          <button className="rc-nav-btn rc-nav-btn-main" onClick={voltearTarjeta}>Voltear</button>
          <button className="rc-nav-btn" onClick={irSiguiente}>Siguiente ➡</button>
        </div>

        {/* Zona de evaluación */}
        <div className={`rc-eval-zone${evalVisible ? ' rc-eval-visible' : ''}`}>
          <button className="rc-btn-bien" onClick={(e) => { e.stopPropagation(); registrar(true); }}>✓ Estaba Bien</button>
          <button className="rc-btn-mal" onClick={(e) => { e.stopPropagation(); registrar(false); }}>✗ Estaba Mal</button>
        </div>
      </div>
    </div>
  );
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
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
      {preguntas.map((p, qi) => (
        <div key={qi} className={`qz-card${mostrar ? ' qz-bloqueado' : ''}`}>
          <div className="qz-texto"> <span className="qz-num">{qi + 1}. </span>{String(p.t || '').replace(/^\d+\.\s*/, '')}</div>
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

function SintesisView({ datos }) {
  const contarPalabras = (str) => str.trim() === '' ? 0 : str.trim().split(/\s+/).length;
  const contarOraciones = (str) => {
    if (!str.trim()) return 0;
    const m = str.match(/[^.!?]+[.!?]+/g);
    return m ? m.length : 1;
  };

  const maxC1 = Math.ceil(contarPalabras(datos?.textoOrigen || '') * 0.55);

  const [capa1, setCapa1] = useState('');
  const [bullets, setBullets] = useState(['', '', '', '', '']);
  const [capa3, setCapa3] = useState('');
  const [panel, setPanel] = useState(null); // null | { ok, errores, prompt }
  const [copied, setCopied] = useState(false);
  const panelRef = useRef(null);

  if (!datos) return null;

  const palabrasC1 = contarPalabras(capa1);
  const oracionesC3 = contarOraciones(capa3);
  const pctC1 = maxC1 > 0 ? Math.min(100, Math.round((palabrasC1 / maxC1) * 100)) : 0;

  const setBullet = (i, v) => setBullets(b => b.map((x, idx) => idx === i ? v : x));

  const generarPrompt = () => {
    const puntos = bullets.filter(b => b.trim());
    const listaPuntos = puntos.length
      ? puntos.map((p, i) => `  - Punto ${i + 1}: ${p}`).join('\n')
      : '  - [No se ingresaron puntos clave]';
    return `Actúa como un tutor académico experto. He realizado un ejercicio de síntesis por niveles de abstracción (Método del Embudo) sobre el siguiente tema:\n\nTEMA: "${datos.subtitulo}" (${datos.asignatura})\n\nTEXTO ORIGINAL COMPLETO:\n"${datos.textoOrigen}"\n\n---\nMI TRABAJO DE SÍNTESIS REALIZADO:\n\n1. Capa 1 (Compresión de ideas al 50%):\n"${capa1 || '[Sin completar]'}"\n\n2. Capa 2 (Esquema de Puntos Clave):\n${listaPuntos}\n3. Capa 3 (Elevator Pitch - 1 Oración Global):\n"${capa3 || '[Sin completar]'}"\n---\n\nPor favor, evalúa mi síntesis respondiendo los siguientes aspectos:\n1. **Precisión y Fidelidad:** ¿Representa fielmente el texto original sin imprecisiones ni errores conceptuales?\n2. **Capacidad de Abstracción:** ¿Logré filtrar la información de manera progresiva y adecuada en cada nivel?\n3. **Omisiones Importantes:** ¿Omití alguna idea esencial que debió incluirse?\n4. **Calificación:** Dame una calificación del 1 al 10 y una recomendación concreta para mejorar mi síntesis.`;
  };

  const validar = () => {
    const puntos = bullets.filter(b => b.trim());
    const errores = [];
    if (palabrasC1 === 0) errores.push('La Capa 1 está vacía.');
    else if (palabrasC1 > maxC1) errores.push(`La Capa 1 supera las ${maxC1} palabras permitidas (usaste ${palabrasC1}).`);
    if (puntos.length === 0) errores.push('Debes completar al menos 1 punto clave en la Capa 2.');
    if (!capa3.trim()) errores.push('La Capa 3 (Elevator Pitch) está vacía.');
    else if (oracionesC3 > 1) errores.push('El Elevator Pitch debe constar de una sola oración contundente.');
    setPanel({ ok: errores.length === 0, errores, prompt: generarPrompt() });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const copiar = () => {
    if (!panel) return;
    navigator.clipboard.writeText(panel.prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="sn-wrap">
      {/* Header */}
      <div className="sn-header">
        <h2 className="sn-title">{datos.tituloPagina || 'Síntesis por Embudo'}</h2>
        <p className="sn-sub">{datos.subtitulo} — {datos.asignatura} ({datos.fecha})</p>
      </div>

      {/* Capa 0 – Texto Origen */}
      <div className="sn-card">
        <span className="sn-badge">Capa 0 — Material Base</span>
        <h3 className="sn-card-title">Texto Origen</h3>
        <p className="sn-card-desc">Lee con atención el texto completo antes de comenzar a reducir la información.</p>
        <div className="sn-orig-box">{datos.textoOrigen}</div>
        <div className="sn-meter-row">
          <span>Palabras totales: {contarPalabras(datos.textoOrigen)}</span>
          <span>Límite Capa 1: máx. {maxC1} palabras (50%)</span>
        </div>
      </div>

      {/* Capa 1 */}
      <div className="sn-card">
        <span className="sn-badge">Capa 1 — Selección e Ideas Principales</span>
        <h3 className="sn-card-title">Compresión al 50%</h3>
        <p className="sn-card-desc">Redacta las ideas esenciales eliminando ejemplos, fechas secundarias y relleno.</p>
        <textarea
          className="sn-textarea"
          rows={5}
          placeholder="Escribe tu resumen comprimido aquí..."
          value={capa1}
          onChange={e => setCapa1(e.target.value)}
        />
        {/* barra de progreso */}
        <div className="sn-pct-bar-wrap">
          <div className="sn-pct-bar">
            <div
              className="sn-pct-fill"
              style={{
                width: `${pctC1}%`,
                background: palabrasC1 > maxC1 ? 'var(--danger)' : 'var(--violet)',
              }}
            />
          </div>
          <span style={{ color: palabrasC1 > maxC1 ? 'var(--danger)' : 'var(--muted)' }}>{pctC1}%</span>
        </div>
        <div className="sn-meter-row">
          <span>{palabrasC1} palabras introducidas</span>
          <span style={{ color: palabrasC1 > maxC1 ? 'var(--danger)' : palabrasC1 > 0 ? 'var(--success)' : 'var(--muted)' }}>
            {palabrasC1 === 0 ? '' : palabrasC1 > maxC1 ? 'Excede el límite del 50%' : 'Dentro del límite permitido'}
          </span>
        </div>
      </div>

      {/* Capa 2 */}
      <div className="sn-card">
        <span className="sn-badge">Capa 2 — Esquematización</span>
        <h3 className="sn-card-title">Lista de Puntos Clave (Máx. 5)</h3>
        <p className="sn-card-desc">Sintetiza la Capa 1 en una lista de hasta 5 ítems o frases ultra-cortas con las ideas centrales.</p>
        <div className="sn-bullets">
          {bullets.map((b, i) => (
            <div key={i} className="sn-bullet-row">
              <div className="sn-bullet-num">{i + 1}</div>
              <input
                className="sn-bullet-input"
                type="text"
                placeholder={`Punto clave ${i + 1}${i >= 2 ? ' (opcional)' : ''}`}
                value={b}
                onChange={e => setBullet(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Capa 3 */}
      <div className="sn-card">
        <span className="sn-badge">Capa 3 — Abstracción Suprema</span>
        <h3 className="sn-card-title">Elevator Pitch (1 Sola Oración)</h3>
        <p className="sn-card-desc">Condensa absolutamente todo el tema en una única oración contundente.</p>
        <textarea
          className="sn-textarea"
          rows={2}
          placeholder="Una sola oración completa que englobe todo el concepto..."
          value={capa3}
          onChange={e => setCapa3(e.target.value)}
        />
        <div className="sn-meter-row">
          <span>{oracionesC3} oración(es) detectada(s)</span>
          <span style={{ color: oracionesC3 > 1 ? 'var(--danger)' : oracionesC3 === 1 ? 'var(--success)' : 'var(--muted)' }}>
            {oracionesC3 === 0 ? '' : oracionesC3 > 1 ? '¡Atención! Debe ser una sola oración.' : 'Formato correcto (1 oración)'}
          </span>
        </div>
      </div>

      {/* Botón validar */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px' }}>
        <button className="sn-val-btn" onClick={validar}>Validar y Comparar Síntesis</button>
      </div>

      {/* Panel de evaluación */}
      {panel && (
        <div className="sn-val-panel" ref={panelRef}>
          <div className="sn-val-header">
            <h3 className="sn-val-h3">Evaluación de la Comprensión</h3>
            <span className={`sn-chip ${panel.ok ? 'pass' : 'warn'}`}>
              {panel.ok ? '¡Límites Cumplidos!' : 'Ajustes Requeridos'}
            </span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            {panel.ok ? (
              <p>Has respetado correctamente las reglas de reducción por capas. Revisa abajo el prompt para enviar a la IA y compara tu trabajo con la síntesis ideal.</p>
            ) : (
              <>
                <b>Por favor revisa los siguientes puntos antes de enviar:</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {panel.errores.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </>
            )}
          </div>

          {/* Prompt para IA */}
          <div className="sn-prompt-box">
            <div className="sn-prompt-title">◎ Prompt personalizado para consultar a la IA</div>
            <p className="sn-prompt-desc">Este texto incluye automáticamente lo que redactaste arriba. Cópialo y pégalo en ChatGPT, Claude o Gemini para obtener una revisión pedagógica de tu estudio.</p>
            <textarea className="sn-prompt-textarea" readOnly value={panel.prompt} />
            <button className={`sn-copy-btn${copied ? ' copied' : ''}`} onClick={copiar}>
              {copied ? '✓ ¡Prompt copiado!' : '▤ Copiar Prompt para la IA'}
            </button>
          </div>

          {/* Síntesis ideal */}
          <h3 style={{ fontFamily: 'Playfair Display, serif', margin: '24px 0 10px', fontSize: '1.2em' }}>Síntesis Ideal de Referencia</h3>
          <div className="sn-comp-grid">
            <div className="sn-comp-box">
              <div className="sn-comp-label">Capa 1 Ideal (50%)</div>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{datos.capa1Ideal}</p>
            </div>
            <div className="sn-comp-box">
              <div className="sn-comp-label">Capa 2 Ideal (Puntos Clave)</div>
              <ul style={{ fontSize: 12.5, paddingLeft: 18, margin: 0, lineHeight: 1.5 }}>
                {(datos.capa2Ideal || []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
          <div className="sn-comp-box" style={{ marginTop: 14 }}>
            <div className="sn-comp-label">Capa 3 Ideal (Elevator Pitch)</div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--violet)', margin: 0 }}>{datos.capa3Ideal}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SQ3RView({ datos }) {
  const FASES = ['survey', 'read', 'recite', 'review']
  const [faseIdx, setFaseIdx] = useState(0)
  const [respuestas, setRespuestas] = useState(() => (datos?.secciones || []).map(() => ''))
  const [copied, setCopied] = useState(false)

  const normQ = (q = '') => {
    q = q.trim()
    if (!q.startsWith('¿')) q = '¿' + q
    if (!q.endsWith('?')) q = q + '?'
    return q
  }

  const allAnswered = respuestas.every(r => r.trim().length > 0)

  const promptEval = (() => {
    if (!datos) return ''
    let t = `Actuá como un profesor riguroso y evaluá mi sesión de Active Recall para el documento "${datos.tituloDocumento}".\n\nAquí están las preguntas, el texto de referencia original y lo que respondí de memoria:\n`
    ;(datos.secciones || []).forEach((s, i) => {
      t += `\n--- PREGUNTA ${i + 1}: ${normQ(s.preguntaGenerada)} ---\n`
      t += `TEXTO ORIGINAL: ${s.texto}\n`
      t += `MI RESPUESTA DE MEMORIA: ${respuestas[i] || '(sin respuesta)'}\n`
    })
    t += `\nPor favor, asignáme una calificación del 1 al 10, indicáme qué conceptos me faltaron, cuáles son mis aciertos y dame retroalimentación constructiva para mejorar en la prueba.`
    return t
  })()

  const copiar = () => {
    navigator.clipboard.writeText(promptEval).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  if (!datos) return null

  const tabLabels = [
    { label: 'Survey', sub: 'Panorama' },
    { label: 'Read', sub: 'Lectura' },
    { label: 'Recite', sub: 'Recall' },
    { label: 'Review', sub: 'Calificación' },
  ]

  return (
    <div className="sq3r-wrap">
      {/* Header */}
      <div className="sq3r-head">
        <span className="sq3r-eyebrow">{datos.tituloPagina}</span>
        <h2 className="sq3r-titulo">{datos.tituloDocumento}</h2>
      </div>

      {/* Stepper */}
      <div className="sq3r-stepper">
        {tabLabels.map((t, i) => (
          <div key={i} className={`sq3r-step${i === faseIdx ? ' active' : ''}${i < faseIdx ? ' completed' : ''}`}>
            <b>{t.label}</b>
            <small>{t.sub}</small>
          </div>
        ))}
      </div>

      {/* Workspace */}
      <div className="sq3r-workspace">

        {/* ── Fase 0: Survey ── */}
        {faseIdx === 0 && (
          <div className="sq3r-card">
            <div className="sq3r-phase-header">
              <h3 className="sq3r-phase-h3">1. Survey — Panorama General</h3>
              <p className="sq3r-phase-desc">Aquí tenés el análisis profundo del documento estructurado por la IA para que entiendas el contexto completo antes de iniciar la lectura.</p>
            </div>
            <div className="sq3r-content-box">
              <span className="sq3r-sec-label">Panorama General y Contexto:</span>
              <p style={{ margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.6, fontSize: 14 }}>{datos.temaGeneral}</p>
              <h4 style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, margin: '0 0 8px', font: '600 15px var(--font-serif)', color: 'var(--violet)' }}>Estructura del Contenido:</h4>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 13.5 }}>
                {datos.secciones.map((s, i) => <li key={i}><b>{s.subtitulo}</b></li>)}
              </ul>
            </div>
            <div className="sq3r-footer">
              <button className="sq3r-btn-primary" onClick={() => setFaseIdx(1)}>Siguiente paso: Read →</button>
            </div>
          </div>
        )}

        {/* ── Fase 1: Read ── */}
        {faseIdx === 1 && (
          <div className="sq3r-card">
            <div className="sq3r-phase-header">
              <h3 className="sq3r-phase-h3">2. Read — Lectura Guiada por Preguntas</h3>
              <p className="sq3r-phase-desc">Leé el texto de cada sección teniendo en mente la pregunta de examen asociada. Esto guiará tu atención hacia lo verdaderamente importante.</p>
            </div>
            {datos.secciones.map((s, i) => (
              <div key={i} className="sq3r-content-box">
                <span className="sq3r-sec-label">Sección: {s.subtitulo}</span>
                <h4 style={{ margin: '4px 0 10px', font: '600 15px var(--font-serif)', color: 'var(--violet)' }}>🎯 Pregunta clave: {normQ(s.preguntaGenerada)}</h4>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{s.texto}</p>
              </div>
            ))}
            <div className="sq3r-footer">
              <button className="sq3r-btn-primary" onClick={() => setFaseIdx(2)}>Siguiente paso: Recite →</button>
            </div>
          </div>
        )}

        {/* ── Fase 2: Recite ── */}
        {faseIdx === 2 && (
          <div className="sq3r-card">
            <div className="sq3r-phase-header">
              <h3 className="sq3r-phase-h3">3. Recite — Active Recall y Explicación</h3>
              <p className="sq3r-phase-desc">Ocultamos el texto. Aplicá <b>Active Recall</b>: respondé las preguntas explicándolo como si se lo enseñaras a alguien que no sabe nada del tema.</p>
            </div>
            {datos.secciones.map((s, i) => (
              <div key={i} className="sq3r-input-group">
                <label className="sq3r-label">Pregunta: {normQ(s.preguntaGenerada)}</label>
                <textarea
                  className="sq3r-textarea"
                  placeholder="Explicalo como si se lo enseñaras a alguien que no sabe del tema. No importa si te falta algo…"
                  value={respuestas[i]}
                  onChange={e => {
                    const next = [...respuestas]
                    next[i] = e.target.value
                    setRespuestas(next)
                  }}
                />
              </div>
            ))}
            <div className="sq3r-footer">
              <button className="sq3r-btn-primary" disabled={!allAnswered} onClick={() => setFaseIdx(3)}>
                Ver Calificación y Repaso →
              </button>
            </div>
          </div>
        )}

        {/* ── Fase 3: Review ── */}
        {faseIdx === 3 && (
          <div className="sq3r-card">
            <div className="sq3r-phase-header">
              <h3 className="sq3r-phase-h3">5. Review — Calificación y Feedback de la IA</h3>
              <p className="sq3r-phase-desc">Copiá el bloque de texto generado abajo y pegáselo a la IA. Ella evaluará tus respuestas de memoria frente al texto original y te dará una calificación detallada.</p>
            </div>

            {datos.secciones.map((s, i) => (
              <div key={i} className="sq3r-review-item">
                <div className="sq3r-review-hdr">{normQ(s.preguntaGenerada)}</div>
                <div className="sq3r-review-body">
                  <div className="sq3r-resp">
                    <b>Tu explicación:</b><br />{respuestas[i] || <em style={{ color: 'var(--muted)' }}>(sin respuesta)</em>}
                  </div>
                  <div className="sq3r-text-orig">
                    <b>Texto de referencia original:</b><br />{s.texto}
                  </div>
                </div>
              </div>
            ))}

            <div className="sq3r-prompt-box-wrap">
              <div className="sq3r-prompt-header-row">
                <h4 style={{ margin: 0, font: '600 14px var(--font-serif)', color: 'var(--violet)' }}>🤖 Consigna para calificar con la IA:</h4>
                <button className="sq3r-btn-copy" onClick={copiar}>
                  {copied ? '¡Copiado! ✓' : '📋 Copiar Prompt'}
                </button>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 10px' }}>Copiá este resumen de tus respuestas y pegáselo en el chat a la IA para recibir tu nota, correcciones y puntos de mejora:</p>
              <div className="sq3r-prompt-code">{promptEval}</div>
            </div>

            <div className="sq3r-footer">
              <button className="sq3r-btn-secondary" onClick={() => {
                setFaseIdx(0)
                setRespuestas(datos.secciones.map(() => ''))
                setCopied(false)
              }}>↶ Reiniciar sesión</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function BlurtingView({ datos }) {
  const [fase, setFase] = useState('idle'); // idle | running | done
  const [segundos, setSegundos] = useState(() => (datos?.tiempoMinutos || 5) * 60);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null);
  const [statusLabel, setStatusLabel] = useState('Esperando inicio');
  const [pausaTimer, setPausaTimer] = useState(null);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (fase !== 'running') return;
    timerRef.current = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { clearInterval(timerRef.current); corregir(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fase]);

  const iniciar = () => {
    setFase('running');
    setStatusLabel('Escribe cuando desees');
    setTexto('');
    setResultado(null);
    setSegundos((datos?.tiempoMinutos || 5) * 60);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const corregir = () => {
    clearInterval(timerRef.current);
    if (pausaTimer) clearTimeout(pausaTimer);
    setFase('done');
    setStatusLabel('Vaciado finalizado');
    const textoNorm = texto.toLowerCase();
    const conceptos = datos?.conceptosClave || [];
    const encontrados = conceptos.filter(c => textoNorm.includes(c.toLowerCase()));
    const faltantes = conceptos.filter(c => !textoNorm.includes(c.toLowerCase()));
    const porcentaje = conceptos.length ? Math.round((encontrados.length / conceptos.length) * 100) : 0;

    // Resaltar conceptos encontrados en el texto
    let textoResaltado = texto;
    [...encontrados].sort((a, b) => b.length - a.length).forEach(c => {
      const re = new RegExp(`(${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      textoResaltado = textoResaltado.replace(re, '___HIGHLIGHT_START___$1___HIGHLIGHT_END___');
    });

    setResultado({ encontrados, faltantes, porcentaje, textoResaltado, textoPlano: texto });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const reiniciar = () => {
    clearInterval(timerRef.current);
    setFase('idle');
    setSegundos((datos?.tiempoMinutos || 5) * 60);
    setTexto('');
    setResultado(null);
    setStatusLabel('Esperando inicio');
  };

  const copiarReporte = () => {
    if (!resultado) return;
    const reporte =
`Actúa como un tutor académico experto y pedagógico especialista en técnicas de estudio activo (Blurting y Active Recall).

He realizado una sesión de Vaciado de Memoria (Blurting) sobre el tema: "${datos?.subtitulo || ''}".

### DATOS DE LA SESIÓN DE ESTUDIO:
- **Conceptos que logré recordar:**
${resultado.encontrados.length > 0 ? resultado.encontrados.map(c => `  * ${c}`).join('\n') : '  * Ninguno'}

- **Conceptos omitidos / validados como faltantes:**
${resultado.faltantes.length > 0 ? resultado.faltantes.map(c => `  * ${c}`).join('\n') : '  * Ninguno'}

- **Texto exacto escrito por mí durante el vaciado:**
"${resultado.textoPlano || 'Sin texto registrado.'}"

---

### TUS INSTRUCCIONES DE EVALUACIÓN:
1. **Evaluación de Coherencia y Precisión:** Analiza el texto que escribí. Valida si la narrativa o explicación es correcta conceptualmente o si cometí algún error argumentativo, de cronología o interpretación.
2. **Explicación Breve de los Conceptos Omitidos:** Para cada concepto que me faltó incluir, dame un resumen conciso (2 o 3 oraciones máximo por concepto) explicando su importancia dentro de este tema específico.
3. **Puntos de Conexión:** Explícame brevemente cómo se conectan los conceptos que SÍ recordé con los que OLVIDÉ.
4. **Preguntas de Afianzamiento:** Hazme 3 preguntas breves y directas para poner a prueba mi comprensión sobre las partes que omití.`;
    navigator.clipboard.writeText(reporte).catch(() => {});
  };

  const alEscribir = (e) => {
    setTexto(e.target.value);
    setStatusLabel('Escribiendo...');
    if (pausaTimer) clearTimeout(pausaTimer);
    setPausaTimer(setTimeout(() => setStatusLabel('Tiempo de reflexión'), 1500));
  };

  const min = String(Math.floor(segundos / 60)).padStart(2, '0');
  const sec = String(segundos % 60).padStart(2, '0');
  const total = (datos?.tiempoMinutos || 5) * 60;
  const progreso = total ? Math.round(((total - segundos) / total) * 100) : 0;

  if (!datos) return null;

  // Renderiza el texto resaltado fragmentando por los marcadores
  const renderTextoResaltado = (raw) => {
    if (!raw) return <em style={{ color: 'var(--muted)' }}>No ingresaste texto durante la sesión.</em>;
    const parts = raw.split(/(___HIGHLIGHT_START___|___HIGHLIGHT_END___)/);
    let inside = false;
    return parts.map((p, i) => {
      if (p === '___HIGHLIGHT_START___') { inside = true; return null; }
      if (p === '___HIGHLIGHT_END___') { inside = false; return null; }
      if (inside) return <mark key={i} className="bl-highlight">{p}</mark>;
      return <span key={i}>{p}</span>;
    });
  };

  return (
    <div className="bl-wrap">
      {/* Header */}
      <div className="bl-header">
        <span className="bl-eyebrow">BLURTING</span>
        <h3 className="bl-titulo">{datos.subtitulo}</h3>
      </div>

      {/* Temporizador */}
      <div className="bl-timer-card">
        <div className="bl-timer-progress" style={{ width: `${progreso}%` }} />
        <div className="bl-timer-inner">
          <div className="bl-timer-display-row">
            <div className={`bl-status-dot${fase === 'running' ? ' active' : ''}`} />
            <span className="bl-time">{min}:{sec}</span>
          </div>
          <div className="bl-controls">
            {fase === 'idle' && (
              <button className="bl-btn" onClick={iniciar}>Iniciar vaciado</button>
            )}
            {fase === 'running' && (
              <button className="bl-btn bl-btn-outline" onClick={corregir}>Corregir ahora</button>
            )}
            {fase === 'done' && (
              <button className="bl-btn bl-btn-outline" onClick={reiniciar}>↶ Nueva sesión</button>
            )}
          </div>
        </div>
      </div>

      {/* Área de escritura */}
      <div className={`bl-editor${fase === 'running' ? ' active' : ''}`}>
        <div className="bl-editor-meta">
          <span>{statusLabel}</span>
          <span>{texto.length} caracteres</span>
        </div>
        <textarea
          ref={textareaRef}
          className="bl-textarea"
          value={texto}
          onChange={alEscribir}
          disabled={fase !== 'running'}
          placeholder={fase === 'idle' ? "Hacé clic en 'Iniciar vaciado' para comenzar. Escribí todo lo que recuerdes del tema..." : fase === 'done' ? 'Sesión finalizada.' : 'Escribí todo lo que recuerdes del tema sin mirar tus apuntes...'}
        />
      </div>

      {/* Resultados */}
      {resultado && (
        <div className="bl-results" ref={resultRef}>
          <div className="bl-results-head">
            <h3 className="bl-results-title">Análisis de Vaciado</h3>
            <button className="bl-btn bl-btn-outline bl-btn-sm" onClick={copiarReporte}>
              📋 Copiar reporte para IA
            </button>
          </div>

          <div className="bl-metric">
            <span>Grado de Recuerdo:</span>
            <span className="bl-metric-val">{resultado.porcentaje}% ({resultado.encontrados.length}/{(datos.conceptosClave || []).length})</span>
          </div>

          <div className="bl-section">
            <p className="bl-section-label">Conceptos Clave de Referencia</p>
            <div className="bl-badges">
              {resultado.encontrados.map((c, i) => (
                <span key={i} className="bl-badge bl-badge-found">✓ {c}</span>
              ))}
              {resultado.faltantes.map((c, i) => (
                <span key={i} className="bl-badge bl-badge-missing">✕ {c}</span>
              ))}
            </div>
          </div>

          <div className="bl-section">
            <p className="bl-section-label">Tu texto escrito</p>
            <div className="bl-highlighted-text">
              {renderTextoResaltado(resultado.textoResaltado)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudyRoom({ method, apiKey, providerLabel, aiResult, previewData, previewError, previewVersion, loading, streamText, materials, activeMaterial, onSelectMaterial, onAddMaterial, onRemoveMaterial, onPreviewMaterial, onClose, onGenerate, callAI, aiProvider, aiModel, aiBaseUrl }) {
  const [answer, setAnswer] = useState(false), [notes, setNotes] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !apiKey && aiProvider !== 'openai_compatible') return;
    const userMsg = { role: 'user', content: text };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const materialCtx = activeMaterial ? `\n\nEl estudiante está trabajando con el material: "${activeMaterial.name}".` : '';
      // Contexto del resultado generado por la IA (mapa mental, Cornell, etc.) para que
      // el tutor pueda responder preguntas puntuales sobre lo que se generó (ej. "¿qué
      // significa el nodo X del mapa?", "explicame la hoja 2 del Cornell").
      let resultCtx = '';
      if (previewData) {
        try {
          const serialized = JSON.stringify(previewData);
          const trimmed = serialized.length > 6000 ? serialized.slice(0, 6000) + '…(truncado)' : serialized;
          resultCtx = `\n\nA continuación tenés, en formato JSON, el contenido exacto que se generó con el método "${method[1]}" a partir de ese material. Usalo como referencia para responder preguntas sobre nodos, hojas, tarjetas o cualquier parte específica de este resultado:\n${trimmed}`;
        } catch {}
      } else if (aiResult) {
        const trimmed = aiResult.length > 6000 ? aiResult.slice(0, 6000) + '…(truncado)' : aiResult;
        resultCtx = `\n\nA continuación tenés el contenido generado con el método "${method[1]}" a partir de ese material. Usalo como referencia:\n${trimmed}`;
      }
      const historial = chatMsgs.map(m => `${m.role === 'user' ? 'Estudiante' : 'Tutor'}: ${m.content}`).join('\n');
      const promptCtx = historial ? `Historial:\n${historial}\n\nEstudiante: ${text}` : text;
      const systemPrompt = `Sos un tutor académico experto y paciente. Tu objetivo es ayudar al estudiante a entender los temas de su material de estudio.${materialCtx}${resultCtx} Respondé de forma clara, directa y en el idioma del estudiante. Si el estudiante pregunta por una parte específica del resultado generado (un nodo del mapa, una hoja del Cornell, una tarjeta, etc.), usá el JSON de referencia para responder con precisión. Si el estudiante dice que no entendió algo, explicalo de otra forma, con ejemplos o analogías. Sé conciso pero completo.`;
      const fullPrompt = `${systemPrompt}\n\n${promptCtx}`;
      const resp = await callAI({
        provider: aiProvider, model: aiModel, key: apiKey,
        promptText: fullPrompt, material: null, baseUrl: aiBaseUrl
      });
      setChatMsgs(prev => [...prev, { role: 'assistant', content: resp }]);
    } catch (e) {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: `No pude responder: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };
  const writing = ['feynman', 'cornell'].includes(method[0]);
  const strict = STRICT_METHODS.includes(method[0]);
  const aiResultRef = useRef(null);
  const streamRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamText]);
  
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
  
  const handleRemove = (m) => {
    if (removingId) return;
    setRemovingId(m.id);
    setTimeout(() => { onRemoveMaterial(m); setRemovingId(null) }, 280);
  }
  
  const downloadResult = () => {
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
          <div> <span>{method[3]}</span> <b>{method[1]}</b> </div>
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
            <p className="eyebrow" style={{ margin: 0 }}>MATERIAL ACTIVO</p>
            {materials.length === 0 ? (
              <div className="empty-source">▤ <b>Aún no elegiste un material</b> <span>Agrega un PDF o un apunte con el botón de abajo.</span></div>
            ) : (
              <div className="material-selector" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
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
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i>{m.type === 'PDF' ? '📄' : '📝'}</i> {m.name}
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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="upload-link study-add-btn" style={{ fontSize: '10px', marginTop: '16px' }}>+ Agregar <input type="file" accept=".pdf,.txt,.md" multiple onChange={onAddMaterial} /></label>
            <style>{'@keyframes trash-shake{0%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}100%{transform:rotate(0)}}'}</style>
          </aside>
          <article className="canvas">
            <p className="eyebrow">{method[1].toUpperCase()}</p>
            <h2>{method[0] === 'mind' ? 'Organizá las ideas de tu tema.' : method[0] === 'recall' ? 'Poné a prueba la memoria antes de mirar.' : method[0] === 'multiple' ? 'Rendí un examen y medí tu dominio del tema.' : method[0] === 'blurting' ? 'Vaciá tu memoria. Descubrí qué falta.' : method[0] === 'sintesis' ? 'Reducí el texto capa por capa hasta la esencia.' : method[0] === 'sq3r' ? 'Survey, Read, Recite y Review para dominar el tema.' : method[0] === 'subrayado' ? 'Subrayá y jerarquizá las ideas por categorías.' : 'Convertí lo que estudiás en conocimiento propio.'}</h2>
            {loading && (
              <section className="ai-result" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
                    border: '2px solid var(--line-accent)', borderTopColor: 'var(--violet)', animation: 'spin 0.8s linear infinite'
                  }} />
                  <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{providerLabel} está preparando tu {method[1].toLowerCase()}…</b>
                </div>
                <div
                  ref={streamRef}
                  style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--muted)',
                    lineHeight: '1.4'
                  }}
                >
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--violet)', fontWeight: 600, marginBottom: '6px' }}>
                    ✦ Proceso de pensamiento y generación en vivo:
                  </div>
                  {streamText ? streamText : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic' }}>
                      <span style={{
                        display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%',
                        border: '2px solid var(--line-accent)', borderTopColor: 'var(--violet)', animation: 'spin 0.8s linear infinite'
                      }} />
                      El modelo está pensando… (los modelos de razonamiento no muestran su cadena de pensamiento, pero ya están trabajando)
                    </div>
                  )}
                </div>
                <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
              </section>
            )}
            {!loading && aiResult && (
              <section className={`ai-result${pseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`} ref={aiResultRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>✦ Propuesta de {providerLabel}</b>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={toggleFullscreen}
                      title={fullscreenActivo ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
                      style={{
                        color: 'var(--violet)', background: 'var(--bg-surface)', border: '1px solid var(--line-soft)', borderRadius: '7px',
                        padding: '5px 9px', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >{fullscreenActivo ? '⤡ Salir' : '⛶ Pantalla completa'}</button>
                    <button
                      onClick={downloadResult}
                      style={{
                        color: 'var(--violet)', background: 'var(--bg-soft)', border: '1px solid var(--line-accent)', borderRadius: '7px',
                        padding: '5px 9px', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >⬇ Descargar código</button>
                  </div>
                </div>
                {strict && previewData && (method[0] === 'mind' || method[0] === 'cornell' || method[0] === 'spaced') && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    {method[0] === 'mind' && (
                      <button onClick={() => exportarMapaAPDF(previewData)} style={{ color: 'var(--violet)', background: 'var(--bg-soft)', border: '1px solid var(--line-accent)', borderRadius: '7px', padding: '5px 9px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar PDF</button>
                    )}
                    {method[0] === 'cornell' && (
                      <button onClick={() => exportarCornellAPDF(previewData)} style={{ color: 'var(--violet)', background: 'var(--bg-soft)', border: '1px solid var(--line-accent)', borderRadius: '7px', padding: '5px 9px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar PDF imprimible</button>
                    )}
                    {method[0] === 'spaced' && (
                      <button onClick={() => exportarFlashcardsAnki(previewData, activeMaterial?.name)} style={{ color: 'var(--violet)', background: 'var(--bg-soft)', border: '1px solid var(--line-accent)', borderRadius: '7px', padding: '5px 9px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar a Anki (.txt)</button>
                    )}
                  </div>
                )}
                {strict && previewData && (
                  <div style={{ marginTop: 14 }}>
                    <ErrorBoundary
                      key={previewVersion}
                      fallback={(msg) => (
                        <div style={{ padding: '22px 16px', textAlign: 'center', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 12 }}>
                          <b style={{ color: 'var(--danger)', fontSize: 13 }}>No pudimos mostrar esta vista.</b>
                          <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>El contenido que devolvió la IA no tenía el formato esperado. Descargá el código de arriba y revisalo, o generá el contenido de nuevo.</p>
                        </div>
                      )}
                    >
                      {method[0] === 'mind' && <MapaView datos={previewData} />}
                      {method[0] === 'cornell' && <CornellView datos={previewData} />}
                      {method[0] === 'spaced' && <SpacedRepetitionView banco={previewData} />}
                      {method[0] === 'recall' && <RecallView preguntas={previewData} />}
                      {method[0] === 'multiple' && <TestView preguntas={previewData} />}
                      {method[0] === 'feynman' && <FeynmanView datos={previewData} />}
                      {method[0] === 'blurting' && <BlurtingView datos={previewData} />}
                      {method[0] === 'sintesis' && <SintesisView datos={previewData} />}
                      {method[0] === 'sq3r' && <SQ3RView datos={previewData} />}
                      {method[0] === 'subrayado' && <SubrayadoView datos={previewData} />}
                      {method[0] === 'timeline' && <TimelineView datos={previewData} />}
                      {method[0] === 'tabla' && <TablaView datos={previewData} />}
                    </ErrorBoundary>
                  </div>
                )}
                {strict && !previewData && (
                  <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'var(--danger)', fontWeight: 600 }}>
                    No pudimos interpretar el resultado automáticamente{previewError ? `: ${previewError}` : ''}. Descargá el código de abajo y revisalo, o regenerá con {providerLabel}.
                  </p>
                )}
                {!strict && (
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '10px', lineHeight: '1.5' }}>{aiResult}</div>
                )}
              </section>
            )}
            {/* ── Canvas: Mapa Mental ── */}
            {method[0] === 'mind' && !previewData && (
              <div className="mind-map">
                <div className="mind-node root">Idea Central</div>
                <div className="mind-node n1">Concepto 1</div>
                <div className="mind-node n2">Concepto 2</div>
                <div className="mind-node n3">Concepto 3</div>
                <button className="add-node">+ Añadir idea</button>
              </div>
            )}
            {/* ── Canvas: Cornell ── */}
            {method[0] === 'cornell' && !previewData && (
              <div className="canvas-placeholder cornell-placeholder">
                <div className="cp-header">
                  <div className="cp-header-meta">
                    <span className="cp-badge">MÉTODO CORNELL</span>
                    <span className="cp-subtitle">Apuntes estructurados</span>
                  </div>
                </div>
                <div className="cp-cornell-body">
                  <div className="cp-col cp-col-cue">
                    <div className="cp-col-label">Ideas clave</div>
                    {['¿Qué?', '¿Por qué?', '¿Cómo?'].map((q, i) => (
                      <div key={i} className="cp-cue-pill">{q}</div>
                    ))}
                  </div>
                  <div className="cp-col cp-col-notes">
                    <div className="cp-col-label">Notas de la clase</div>
                    {[80, 60, 75, 45].map((w, i) => (
                      <div key={i} className="cp-line" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
                <div className="cp-summary-bar">
                  <span className="cp-col-label">Resumen</span>
                  <div className="cp-line" style={{ width: '90%' }} />
                  <div className="cp-line" style={{ width: '65%' }} />
                </div>
                <p className="cp-hint">La IA organizará tu material en hojas Cornell con ideas clave, notas y resumen por sección.</p>
              </div>
            )}
            {/* ── Canvas: Feynman ── */}
            {method[0] === 'feynman' && !previewData && (
              <div className="canvas-placeholder feynman-placeholder">
                <div className="cp-feynman-steps">
                  {[
                    { num: '1', label: 'Concepto clave', icon: '◌' },
                    { num: '2', label: 'Explicación simple', icon: '◎' },
                    { num: '3', label: 'Puntos críticos', icon: '◈' },
                    { num: '4', label: 'Síntesis y analogía', icon: '◉' },
                  ].map((s, i) => (
                    <div key={i} className="cp-fy-step">
                      <div className="cp-fy-icon">{s.icon}</div>
                      <div className="cp-fy-info">
                        <span className="cp-fy-num">PASO {s.num}</span>
                        <span className="cp-fy-label">{s.label}</span>
                      </div>
                      <div className="cp-fy-lines">
                        <div className="cp-line" style={{ width: '85%' }} />
                        <div className="cp-line" style={{ width: '60%' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="cp-hint">La IA explicará tu material en 4 pasos Feynman: del concepto central a una analogía simple y memorable.</p>
              </div>
            )}
            {/* ── Canvas: Active Recall ── */}
            {method[0] === 'recall' && !previewData && (
              <div className="canvas-placeholder recall-placeholder">
                <div className="cp-recall-card cp-recall-question">
                  <span className="cp-badge">↶ ACTIVE RECALL · PREGUNTA 1</span>
                  <div className="cp-recall-text">¿Qué recuerdas sobre este concepto?</div>
                  <div className="cp-recall-btn-mock">Intenté recordarla → ver respuesta</div>
                </div>
                <div className="cp-recall-card cp-recall-answer">
                  <span className="cp-badge cp-badge-green">RESPUESTA</span>
                  <div className="cp-line" style={{ width: '92%', marginTop: 6 }} />
                  <div className="cp-line" style={{ width: '70%' }} />
                  <div className="cp-recall-eval-mock">
                    <div className="cp-eval-btn cp-eval-mal">✗ Me costó</div>
                    <div className="cp-eval-btn cp-eval-bien">✓ Lo recordé</div>
                  </div>
                </div>
                <p className="cp-hint">La IA generará preguntas de recuperación activa. Intentá recordar la respuesta antes de revelarla.</p>
              </div>
            )}
            {/* ── Canvas: Multiple Choice ── */}
            {method[0] === 'multiple' && !previewData && (
              <div className="canvas-placeholder multiple-placeholder">
                <div className="cp-qz-card">
                  <div className="cp-qz-num">1.</div>
                  <div className="cp-line" style={{ width: '78%' }} />
                  <div className="cp-qz-options">
                    {['A', 'B', 'C', 'D'].map((l, i) => (
                      <div key={i} className={`cp-qz-op${i === 1 ? ' cp-qz-op-sel' : ''}`}>
                        <span className="cp-qz-letra">{l}</span>
                        <div className="cp-line" style={{ width: `${[55, 70, 48, 62][i]}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cp-qz-card" style={{ opacity: 0.45 }}>
                  <div className="cp-qz-num">2.</div>
                  <div className="cp-line" style={{ width: '65%' }} />
                </div>
                <p className="cp-hint">La IA creará un examen de opción múltiple con 4 opciones por pregunta, cubriendo todo tu material.</p>
              </div>
            )}
            {/* ── Canvas: Blurting ── */}
            {/* ── Canvas: Síntesis por Embudo ── */}
            {method[0] === 'sintesis' && !previewData && (
              <div className="canvas-placeholder">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
                  {[
                    { badge: 'Capa 0 — Material Base', title: 'Texto Origen', w: [85, 65, 75] },
                    { badge: 'Capa 1 — Compresión al 50%', title: 'Ideas Principales', w: [70, 50] },
                    { badge: 'Capa 2 — Esquematización', title: '3–5 Puntos Clave', w: [60, 45, 55] },
                    { badge: 'Capa 3 — Abstracción Suprema', title: 'Elevator Pitch', w: [80] },
                  ].map((layer, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: 14,
                      padding: '14px 16px', opacity: 1 - i * 0.12
                    }}>
                      <span className="cp-badge" style={{ marginBottom: 6, display: 'inline-block' }}>{layer.badge}</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{layer.title}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {layer.w.map((w, j) => <div key={j} className="cp-line" style={{ width: `${w}%` }} />)}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="cp-hint">La IA reducirá tu material en 3 capas progresivas: resumen al 50%, puntos clave y un Elevator Pitch de una sola oración. Luego podés comparar con la síntesis ideal.</p>
              </div>
            )}
            {method[0] === 'blurting' && !previewData && (
              <div className="canvas-placeholder blurting-placeholder">
                <div className="cp-bl-header">
                  <span className="cp-badge">✐ BLURTING · VACIADO DE MEMORIA</span>
                  <p className="cp-bl-desc">Cerrá tus apuntes y escribí todo lo que recuerdes. Después la app compara tu texto con los conceptos clave y te muestra qué faltó.</p>
                </div>
                <div className="cp-bl-timer-mock">
                  <div className="cp-bl-dot" />
                  <span className="cp-bl-time">05:00</span>
                </div>
                <div className="cp-bl-textarea-mock">
                  <div className="cp-bl-meta">
                    <span>Esperando inicio</span>
                    <span>0 caracteres</span>
                  </div>
                  <div className="cp-bl-lines">
                    {[0,1,2].map(i => <div key={i} className="cp-line" style={{ width: `${[88,65,75][i]}%` }} />)}
                  </div>
                </div>
                <div className="cp-bl-concepts-mock">
                  {['Concepto A', 'Concepto B', 'Concepto C', 'Concepto D'].map((c, i) => (
                    <span key={i} className={`cp-bl-badge ${i < 2 ? 'found' : 'missing'}`}>
                      {i < 2 ? `✓ ${c}` : `✕ ${c}`}
                    </span>
                  ))}
                </div>
                <p className="cp-hint">La IA extraerá los conceptos clave de tu material y te dará un tiempo cronometrado para escribir todo lo que recuerdes.</p>
              </div>
            )}
            {/* ── Canvas: Spaced Repetition ── */}
            {method[0] === 'spaced' && !previewData && (
              <div>
                <div className="fc-dash" style={{ maxWidth: 480 }}>
                  <div>Nuevas: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono,monospace', fontSize: 14, marginLeft: 5 }}>—</strong></div>
                  <div>Para Repasar Hoy: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono,monospace', fontSize: 14, marginLeft: 5 }}>—</strong></div>
                  <div>Dominadas: <strong style={{ color: 'var(--violet)', fontFamily: 'DM Mono,monospace', fontSize: 14, marginLeft: 5 }}>—</strong></div>
                </div>
                <div className="leitner" style={{ marginTop: 22 }}>
                  {[
                    { label: 'Caja 1 · Aprendizaje', bg: 'var(--danger-bg)', count: '?' },
                    { label: 'Caja 2 · En Progreso',  bg: 'var(--bg-soft)',   count: '?' },
                    { label: 'Caja 3 · Retención',    bg: '#fff0df',          count: '?' },
                    { label: 'Caja 4+ · Dominio',     bg: 'var(--mint)',      count: '?' },
                  ].map((box, i) => (
                    <div key={i} style={{ background: box.bg }}>
                      <b style={{ font: '600 28px Playfair Display', display: 'block', color: 'var(--violet)' }}>{box.count}</b>
                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono,monospace', letterSpacing: 1 }}>{box.label}</span>
                    </div>
                  ))}
                </div>
                <p className="cp-hint" style={{ marginTop: 18 }}>La IA extraerá tarjetas de tu material. El algoritmo Leitner programará repasos en el momento justo para que no olvides nada.</p>
              </div>
            )}
            {/* ── Canvas: SQ3R ── */}
            {method[0] === 'sq3r' && !previewData && (
              <div className="canvas-placeholder">
                <div className="sq3r-placeholder-wrap">
                  <div className="sq3r-pl-stepper">
                    {[['Survey','Panorama'],['Read','Lectura'],['Recite','Recall'],['Review','Calificación']].map(([label, sub], i) => (
                      <div key={i} className={`sq3r-pl-step${i === 0 ? ' sq3r-pl-active' : ''}`}>
                        <b>{label}</b><small>{sub}</small>
                      </div>
                    ))}
                  </div>
                  <div className="sq3r-pl-card">
                    <span className="cp-badge">◈ SQ3R · SURVEY</span>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 12px', lineHeight: 1.5 }}>Panorama general del documento:</p>
                    {[90, 72, 80].map((w, i) => <div key={i} className="cp-line" style={{ width: `${w}%`, marginBottom: 6 }} />)}
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0 6px', fontWeight: 600 }}>Estructura del contenido:</p>
                    {['Sección 1', 'Sección 2', 'Sección 3'].map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--violet)', flexShrink: 0 }} />
                        <div className="cp-line" style={{ width: `${[55,65,50][i]}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="sq3r-pl-card" style={{ opacity: 0.45 }}>
                    <span className="cp-badge">◈ SQ3R · RECITE</span>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 6px' }}>Pregunta de examen:</p>
                    <div className="cp-line" style={{ width: '80%', marginBottom: 8 }} />
                    <div style={{ border: '1px solid var(--line-soft)', borderRadius: 8, padding: '8px 10px', marginTop: 6 }}>
                      <div className="cp-line" style={{ width: '60%', marginBottom: 4 }} />
                      <div className="cp-line" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
                <p className="cp-hint">La IA analizará tu material y generará una sesión SQ3R completa: Survey, lectura guiada con preguntas, Active Recall y un prompt de calificación para la IA.</p>
              </div>
            )}
            {/* ── Canvas: Subrayado Jerárquico ── */}
            {method[0] === 'subrayado' && !previewData && (
              <div className="canvas-placeholder">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                  <span className="cp-badge">▣ SUBRAYADO JERÁRQUICO</span>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 10px', lineHeight: 1.5 }}>
                    La IA procesará tu material y generará un texto interactivo donde podés seleccionar frases y clasificarlas por tipo:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SB_CATEGORIAS.map(cat => (
                      <span key={cat.id} className={`sb-hl-btn-demo sb-btn-${cat.id}`} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 600, background: `var(--sb-${cat.id}-bg)`, color: `var(--sb-${cat.id})`, border: `1px solid var(--sb-${cat.id}-border)` }}>
                        {cat.nombre}
                      </span>
                    ))}
                  </div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginTop: 4, lineHeight: 1.85, fontSize: 13, color: 'var(--muted)' }}>
                    {['█████████ ██████████ ████ ██████████████████.', '████ ██████ ██████████ ██████ ██████████ ████████████.', '██████ ██████████████████ ██████████ ████████.'].map((l, i) => (
                      <div key={i} className="cp-line" style={{ width: ['90%','75%','82%'][i], marginBottom: 7 }} />
                    ))}
                  </div>
                </div>
                <p className="cp-hint">Después de subrayar, podrás comparar con el criterio ideal de la IA y generar un prompt de evaluación.</p>
              </div>
            )}
            {/* ── Canvas: Línea de Tiempo ── */}
            {method[0] === 'timeline' && !previewData && (
              <div className="canvas-placeholder">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 520 }}>
                  <span className="cp-badge" style={{ marginBottom: 12 }}>⟶ LÍNEA DE TIEMPO CONECTADA</span>
                  {[
                    { fecha: 'Fecha del evento 1', titulo: 'Primer hito o suceso clave', w: [78, 55] },
                    { fecha: 'Fecha del evento 2', titulo: 'Desarrollo y consecuencia', w: [68, 45] },
                    { fecha: 'Fecha del evento 3', titulo: 'Cierre o impacto final', w: [82, 50] },
                  ].map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 2 ? 0 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--violet)', border: '2px solid var(--bg-surface)', boxShadow: '0 0 0 2px var(--violet)', flexShrink: 0, marginTop: 16 }} />
                        {i < 2 && <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, var(--violet), var(--line-accent))', minHeight: 30 }} />}
                      </div>
                      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, flex: 1 }}>
                        <div style={{ background: 'var(--bg-soft)', borderRadius: 5, padding: '2px 7px', display: 'inline-block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--violet)', fontWeight: 600, marginBottom: 5 }}>{ev.fecha}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{ev.titulo}</div>
                        {ev.w.map((w, j) => <div key={j} className="cp-line" style={{ width: `${w}%`, marginBottom: 4 }} />)}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="cp-hint">La IA extraerá los eventos clave de tu material, los ordenará cronológicamente y mostrará cómo cada uno desencadena el siguiente.</p>
              </div>
            )}
            {/* ── Canvas: Tabla Comparativa ── */}
            {method[0] === 'tabla' && !previewData && (
              <div className="canvas-placeholder">
                <span className="cp-badge" style={{ marginBottom: 12, display: 'inline-block' }}>⊞ TABLA COMPARATIVA</span>
                <div style={{ overflowX: 'auto', maxWidth: 560 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 12px', background: 'var(--bg-soft)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textAlign: 'left', borderRadius: '8px 0 0 0', border: '1px solid var(--line)' }}>Criterio</th>
                        {['Concepto A', 'Concepto B'].map((h, i) => (
                          <th key={i} style={{ padding: '8px 12px', background: 'var(--bg-soft)', color: 'var(--violet)', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 13, textAlign: 'left', border: '1px solid var(--line)', borderRadius: i === 1 ? '0 8px 0 0' : undefined }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[['Definición', 72, 65], ['Características', 60, 70], ['Aplicaciones', 68, 55], ['Diferencias clave', 80, 60]].map(([label, w1, w2], i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)', border: '1px solid var(--line)', fontSize: 11 }}>{label}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid var(--line)' }}><div className="cp-line" style={{ width: `${w1}%` }} /></td>
                          <td style={{ padding: '10px 12px', border: '1px solid var(--line)' }}><div className="cp-line" style={{ width: `${w2}%` }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="cp-hint">La IA identificará los conceptos comparables en tu material y los organizará en una tabla con criterios relevantes.</p>
              </div>
            )}
            {writing && <div className="writing-space"> <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Empieza a explicar con tus propias palabras lo que leíste del material seleccionado…" /> <button className="primary" onClick={onGenerate}>Analizar texto y notas con {providerLabel} →</button> </div>}

            {/* ── Chat de dudas ── */}
            <div className="tutor-chat">
              <div className="tutor-chat-header">
                <span className="tutor-chat-icon">💬</span>
                <span className="tutor-chat-title">Consultá tu duda al tutor IA</span>
                {chatMsgs.length > 0 && (
                  <button className="tutor-chat-clear" onClick={() => setChatMsgs([])}>Limpiar</button>
                )}
              </div>
              <div className="tutor-chat-msgs">
                {chatMsgs.length === 0 && !chatLoading && (
                  <div className="tutor-chat-empty">
                    <span className="tutor-chat-empty-icon">💬</span>
                    <p>Escribí tu duda sobre {activeMaterial ? `"${activeMaterial.name}"` : 'el material'} y el tutor te responde acá.</p>
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`tutor-msg tutor-msg-${m.role}`}>
                    <span className="tutor-msg-label">{m.role === 'user' ? 'Vos' : providerLabel}</span>
                    <div className="tutor-msg-bubble">{m.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="tutor-msg tutor-msg-assistant">
                    <span className="tutor-msg-label">{providerLabel}</span>
                    <div className="tutor-msg-bubble tutor-msg-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="tutor-chat-input-row">
                <textarea
                  className="tutor-chat-textarea"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder={activeMaterial ? `Preguntá algo sobre "${activeMaterial.name}"… (Enter para enviar)` : 'Preguntá cualquier duda sobre tu material…'}
                  rows={2}
                  disabled={chatLoading}
                />
                <button
                  className="tutor-chat-send"
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  {chatLoading ? '…' : '↑'}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

const SB_CATEGORIAS = [
  { id: 'concepto',   nombre: '🟣 Conceptos / Definiciones',           emoji: '🟣' },
  { id: 'dato',       nombre: '🟢 Datos / Fechas / Autores',            emoji: '🟢' },
  { id: 'causa',      nombre: '🟠 Causas / Consecuencias / Procesos',   emoji: '🟠' },
  { id: 'ejemplo',    nombre: '🔵 Ejemplos / Aplicaciones',             emoji: '🔵' },
  { id: 'kw',         nombre: '💖 Palabras Clave / Términos',           emoji: '💖' },
  { id: 'secundario', nombre: '🟡 Detalles / Ideas Secundarias',        emoji: '🟡' },
]

function SubrayadoView({ datos }) {
  const [colorActivo, setColorActivo] = useState('concepto')
  const [marks, setMarks] = useState([]) // { id, color, text }
  const [showIdeal, setShowIdeal] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const viewerRef = useRef(null)
  const savedRangeRef = useRef(null)

  const contarPalabras = (str) => str.trim() === '' ? 0 : str.trim().split(/\s+/).length

  // Re-render the text with marks applied
  useEffect(() => {
    if (!viewerRef.current) return
    // Store current text if empty
    if (viewerRef.current.innerText === '' || marks.length === 0) {
      viewerRef.current.innerText = datos.textoOrigen
    }
  }, [datos])

  const applyHighlight = (color) => {
    const selection = window.getSelection()
    let range = (selection && !selection.isCollapsed) ? selection.getRangeAt(0) : savedRangeRef.current
    if (!range) return
    const text = range.toString().trim()
    if (!text) return
    const container = viewerRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) return

    const mark = document.createElement('mark')
    mark.className = `sb-hl-span sb-hl-${color}`
    mark.dataset.color = color
    const markId = 'sb-' + Date.now() + '-' + Math.random().toString(36).substr(2,4)
    mark.dataset.id = markId

    mark.onclick = (e) => {
      e.stopPropagation()
      // remove mark
      const p = mark.parentNode
      while (mark.firstChild) p.insertBefore(mark.firstChild, mark)
      p.removeChild(mark)
      setMarks(prev => prev.filter(m => m.id !== markId))
    }

    try { range.surroundContents(mark) } catch(e) {
      const contents = range.extractContents()
      mark.appendChild(contents)
      range.insertNode(mark)
    }

    setMarks(prev => [...prev, { id: markId, color, text }])
    window.getSelection()?.removeAllRanges()
    savedRangeRef.current = null
    setPopupVisible(false)
  }

  const handleMouseUp = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) { setPopupVisible(false); return }
    const range = selection.getRangeAt(0)
    const container = viewerRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) { setPopupVisible(false); return }
    savedRangeRef.current = range.cloneRange()
    const rect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setPopupPos({ top: rect.top - containerRect.top - 8, left: Math.max(0, rect.left - containerRect.left) })
    setPopupVisible(true)
  }

  const marksParaCategoria = (catId) => marks.filter(m => m.color === catId)

  const totalPalabrasSubrayadas = marks.reduce((acc, m) => acc + contarPalabras(m.text), 0)
  const totalPalabras = contarPalabras(datos.textoOrigen)
  const ratio = totalPalabras > 0 ? Math.round((totalPalabrasSubrayadas / totalPalabras) * 100) : 0

  const generarPrompt = () => {
    let resumen = ''
    SB_CATEGORIAS.forEach(cat => {
      const items = marksParaCategoria(cat.id)
      resumen += `\n${cat.nombre}:\n` + (items.length ? items.map(i => `  - "${i.text}"`).join('\n') : '  - [Sin selecciones]')
    })
    const p = `Actúa como docente experto en comprensión lectora.\n\nEVALUACIÓN DE SUBRAYADO JERÁRQUICO\nTema: "${datos.subtitulo}"\n\nTEXTO COMPLETO:\n"${datos.textoOrigen}"\n\n---\nSELECCIONES DEL ESTUDIANTE POR MARCADOR:\n${resumen}\n\nMÉTRICA: ${ratio}% del texto fue subrayado.\n\n---\nPOR FAVOR EVALÚA:\n1. Compará las selecciones del estudiante con el criterio ideal de jerarquización.\n2. ¿Clasificó correctamente cada tipo de dato (Conceptos vs Datos vs Causas)?\n3. Proporcioná una calificación del 1 al 10 y una recomendación de mejora.`
    setPromptText(p)
    setShowIdeal(true)
  }

  const copiarPrompt = () => {
    const text = promptText || (() => { generarPrompt(); return promptText })()
    navigator.clipboard.writeText(text).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2500)
    })
  }

  return (
    <div className="sb-wrap">
      {/* Header */}
      <div className="sb-header">
        <div className="sb-header-text">
          <span className="sb-eyebrow">{datos.tituloPagina}</span>
          <h2 className="sb-titulo">{datos.subtitulo}</h2>
          <div className="sb-meta">{datos.asignatura} · {datos.fecha}</div>
        </div>
        <div className={`sb-ratio-badge ${ratio > 30 ? 'danger' : ''}`}>{ratio}% subrayado</div>
      </div>

      <div className="sb-layout">
        {/* Left: text + toolbar */}
        <div className="sb-left">
          {/* Palette */}
          <div className="sb-palette">
            {SB_CATEGORIAS.map(cat => (
              <button
                key={cat.id}
                className={`sb-hl-btn ${colorActivo === cat.id ? 'active' : ''} sb-btn-${cat.id}`}
                onClick={() => { setColorActivo(cat.id); if (savedRangeRef.current || (window.getSelection() && !window.getSelection().isCollapsed)) applyHighlight(cat.id) }}
              >
                <span className="sb-btn-dot sb-dot-{cat.id}" style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: `var(--sb-${cat.id})` }} />
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Text viewer */}
          <div className="sb-viewer-wrap" style={{ position: 'relative' }}>
            {popupVisible && (
              <div className="sb-popup" style={{ top: popupPos.top, left: popupPos.left }}>
                {SB_CATEGORIAS.map(cat => (
                  <button key={cat.id} className={`sb-pop-btn sb-pop-${cat.id}`} onMouseDown={(e) => { e.preventDefault(); applyHighlight(cat.id) }}>
                    {cat.emoji} {cat.id === 'kw' ? 'Pal. Clave' : cat.id === 'secundario' ? 'Detalle' : cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div
              ref={viewerRef}
              className="sb-viewer"
              onMouseUp={handleMouseUp}
              onClick={() => { if (!window.getSelection() || window.getSelection().isCollapsed) setPopupVisible(false) }}
            />
          </div>

          {/* Validation */}
          <div className="sb-eval-bar">
            <button className="sb-btn-validar" onClick={generarPrompt}>🔍 Validar mi Subrayado</button>
            <button className={`sb-btn-copy ${promptCopied ? 'copied' : ''}`} onClick={copiarPrompt}>
              {promptCopied ? '✅ ¡Copiado!' : '📋 Copiar Prompt para la IA'}
            </button>
          </div>

          {showIdeal && (
            <div className="sb-feedback-box">
              <b>Análisis de cobertura ({ratio}% resaltado) — Comparación con el subrayado ideal:</b>
              <div className="sb-ideal-block">
                <div className="sb-ideal-label">Propuesta de subrayado ideal:</div>
                <div className="sb-ideal-text" dangerouslySetInnerHTML={{ __html: datos.textoSubrayadoIdealHTML }} />
              </div>
            </div>
          )}

          {promptText && (
            <textarea className="sb-prompt-ta" readOnly value={promptText} />
          )}
        </div>

        {/* Right: extraction panel */}
        <div className="sb-right">
          <div className="sb-panel-head">
            <h3 className="sb-panel-title">Extracción Lateral</h3>
          </div>
          {SB_CATEGORIAS.map(cat => {
            const items = marksParaCategoria(cat.id)
            return (
              <div key={cat.id} className="sb-cat-group">
                <div className={`sb-cat-title sb-cat-${cat.id}`}>
                  <span>{cat.nombre}</span>
                  <span className="sb-cat-count">{items.length}</span>
                </div>
                <ul className="sb-extracted-list">
                  {items.length === 0
                    ? <li className="sb-empty-msg">Sin selecciones.</li>
                    : items.map(item => (
                      <li key={item.id} className="sb-extracted-item">
                        <span>"{item.text}"</span>
                      </li>
                    ))
                  }
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TIMELINE VIEW
// ============================================================
function TimelineView({ datos }) {
  if (!datos || !datos.eventos) return null;
  return (
    <div className="tl-wrapper">
      <div className="tl-header">
        <h2 className="tl-title">{datos.tituloPagina}</h2>
        <p className="tl-subtitle">{datos.subtitulo}</p>
      </div>
      <div className="tl-list">
        {(datos.eventos || []).map((ev, i) => (
          <div key={i} className="tl-item">
            <div className="tl-spine">
              <div className="tl-dot" />
              {i < datos.eventos.length - 1 && <div className="tl-line" />}
            </div>
            <div className="tl-card">
              <span className="tl-fecha">{ev.fecha}</span>
              <div className="tl-evento-titulo">{ev.titulo}</div>
              <div className="tl-descripcion" dangerouslySetInnerHTML={{ __html: ev.descripcion }} />
              {ev.conexion && (
                <div className="tl-conexion">{ev.conexion}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TABLA COMPARATIVA VIEW
// ============================================================
function TablaView({ datos }) {
  if (!datos || !datos.filas || !datos.entidades) return null;
  return (
    <div className="tc-wrapper">
      <div className="tc-header">
        <h2 className="tc-title">{datos.tituloPagina}</h2>
        <p className="tc-subtitle">{datos.subtitulo}</p>
      </div>
      <div className="tc-scroll">
        <table className="tc-table">
          <thead>
            <tr>
              <th className="tc-th tc-th-corner">Criterio</th>
              {datos.entidades.map((ent, i) => (
                <th key={i} className="tc-th">{ent}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila, i) => (
              <tr key={i} className="tc-tr">
                <td className="tc-td-criterio">{fila.criterio}</td>
                {(fila.valores || []).map((val, j) => (
                  <td key={j} className="tc-td" dangerouslySetInnerHTML={{ __html: val }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppWrapper() {
  const [extraNotice, setExtraNotice] = useState('');
  useGlobalNotice(setExtraNotice);
  return (
    <>
      <App />
      {extraNotice && <div className="toast" style={{ bottom: 80 }}>✦ {extraNotice}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallback={() => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif', textAlign: 'center', padding: 20 }}>
      <b style={{ fontSize: 16, color: '#303249' }}>Algo salió mal.</b>
      <p style={{ fontSize: 13, color: '#88859c', maxWidth: 340 }}>Recargá la página para volver a intentarlo. Tu biblioteca y tu progreso quedaron guardados.</p>
      <button onClick={() => location.reload()} style={{ background: '#7766c9', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Recargar</button>
    </div>
  )}>
    <AppWrapper />
  </ErrorBoundary>
)