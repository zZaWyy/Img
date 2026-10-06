/**
 * Unicum Group — Respuestas a reseñas de Google y TripAdvisor (versión 3).
 *
 * Funciona solo, cada media hora, en los servidores de Google:
 *   1. Lee las reseñas nuevas de cada restaurante (Google Maps cada hora,
 *      TripAdvisor cada 12 h) con los lectores públicos de Apify. No toca
 *      las cuentas del negocio.
 *   2. Las apunta en la pestaña "Respuestas" y redacta un borrador para las
 *      de 4-5★ con el estilo de la casa, aprendiendo de respuestas reales
 *      del equipo (pestaña "Ejemplos") y sin repetir aperturas recientes.
 *      Las de 1-3★ quedan "A mano (negativa)" y se avisa por correo.
 *   3. Si una reseña positiva menciona un problema, la marca "Revisar ⚠".
 *   4. Cuando detecta la respuesta publicada, marca "Publicada ✔". Si el
 *      equipo la cambió respecto al borrador, guarda la versión final
 *      como ejemplo: el sistema aprende de vuestras correcciones.
 *   5. Cada lunes manda un informe con la nota media de cada local y lo
 *      que más se elogia y se critica; avisa si la IA deja de redactar.
 *
 * Publicar sigue siendo manual, idealmente desde la cola del móvil
 * (archivo Cola.html, se publica como aplicación web). Ver GUIA.md.
 *
 * Claves: las pide y comprueba "Reseñas → Instalar" (APIFY_TOKEN y
 * GEMINI_API_KEY) y se guardan en las propiedades del proyecto.
 */

const CONFIG = {
  // --- Lectura de reseñas (Apify) ---
  HORAS_ENTRE_LECTURAS: 1,               // Google Maps: reseñas nuevas
  HORAS_ENTRE_LECTURAS_TRIPADVISOR: 12,
  // Repaso diario de los últimos días: recoge reseñas que Google muestra
  // con retraso y detecta las respuestas ya publicadas.
  DIAS_REPASO: 3,
  RESENAS_POR_RESTAURANTE: 100,          // tope por local y lectura
  DIAS_MAXIMOS: 31,                      // reseñas más antiguas no se apuntan
  // "Recuperar reseñas sin responder": hasta cuántos días atrás mira.
  DIAS_RECUPERACION: 30,
  // Gasto mensual de Apify (de 5 $ gratis) a partir del cual solo se hace
  // el repaso diario.
  APIFY_PRESUPUESTO_USD: 4.5,

  // --- Redacción (Gemini API, capa gratuita) ---
  // Se prueba en este orden; si uno agota su cupo diario, se pasa al
  // siguiente. Flash redacta mejor pero da pocas peticiones gratis al día.
  MODELOS: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemma-4-31b-it'],
  // Las reseñas sin texto o muy cortas empiezan en este modelo (posición
  // en MODELOS, desde 0) para reservar el cupo del mejor a las largas.
  MODELO_PARA_RESENAS_CORTAS: 1,
  LONGITUD_RESENA_CORTA: 40,
  EJEMPLOS_EN_PROMPT: 3,
  APERTURAS_A_EVITAR: 6,
  MIN_ESTRELLAS_BORRADOR: 4,
  MAX_BORRADORES_POR_EJECUCION: 25,
  PAUSA_ENTRE_LLAMADAS_MS: 6000,
  TIEMPO_MAXIMO_MS: 5 * 60 * 1000,

  // --- Avisos por correo ---
  EMAIL_AVISOS: '',                      // vacío = el de la cuenta dueña; varios, separados por comas
  AVISAR_NEGATIVAS: true,
  // Las negativas también reciben un borrador (siguen "A mano": se revisan
  // siempre antes de publicar).
  BORRADOR_NEGATIVAS: true,
  RESUMEN_DIARIO_HORA: 10,               // hora de Madrid; 0 = sin resumen
  // Informe semanal (quejas y elogios que se repiten, nota media por local).
  INFORME_SEMANAL_DIA: 1,                // 1 = lunes … 7 = domingo; 0 = sin informe
  INFORME_SEMANAL_HORA: 9,               // hora de Madrid
  // Aviso si hay reseñas esperando borrador y la IA lleva este tiempo sin
  // redactar ninguno (cupo agotado, clave caducada…).
  HORAS_SIN_BORRADORES_AVISO: 6,
};

const ZONA = 'Europe/Madrid';
const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const HOJA = {
  RESPUESTAS: 'Respuestas',
  RESTAURANTES: 'Restaurantes',
  EJEMPLOS: 'Ejemplos',
  PROMPT: 'Prompt',
  PUBLICADAS: 'Publicadas',
};

const CABECERA = ['Fecha', 'Plataforma', 'Restaurante', 'Cliente', '★', 'Idioma',
  'Reseña (original)', 'Traducción', 'Instrucción (->)', 'Respuesta propuesta',
  'Responder', 'Estado', 'Aviso IA', 'Respuesta publicada', 'Modelo', 'ID', 'Respuesta en español'];
const COL = {
  FECHA: 1, PLATAFORMA: 2, RESTAURANTE: 3, CLIENTE: 4, ESTRELLAS: 5, IDIOMA: 6,
  RESENA: 7, TRADUCCION: 8, INSTRUCCION: 9, RESPUESTA: 10, ENLACE: 11, ESTADO: 12,
  AVISO: 13, PUBLICADA: 14, MODELO: 15, ID: 16, RESP_ES: 17,
};
const ESTADO = {
  PENDIENTE: 'Pendiente',
  REVISAR: 'Revisar ⚠',
  MANO: 'A mano (negativa)',
  PUBLICADA: 'Publicada ✔',
  DESCARTADA: 'Descartada',
  ERROR: 'Error IA (regenerar)',
};
const ESTADOS_ABIERTOS = [ESTADO.PENDIENTE, ESTADO.REVISAR, ESTADO.MANO, ESTADO.ERROR];

const CABECERA_RESTAURANTES = ['Activo', 'Nombre en Google (coincide con)', 'Ciudad',
  'Enlace Google Maps', 'Enlace TripAdvisor', 'Keywords SEO', 'Notas'];
const CR = { ACTIVO: 1, NOMBRE: 2, CIUDAD: 3, GOOGLE: 4, TRIPADVISOR: 5, KEYWORDS: 6, NOTAS: 7 };

const CABECERA_EJEMPLOS = ['Usar', 'Restaurante', 'Idioma', '★', 'Reseña', 'Respuesta', 'Origen', 'ID'];
const CE = { USAR: 1, RESTAURANTE: 2, IDIOMA: 3, ESTRELLAS: 4, RESENA: 5, RESPUESTA: 6, ORIGEN: 7, ID: 8 };
const ORIGEN = { HISTORICO: 'Respuesta anterior', CORREGIDA: 'Corregida por el equipo' };
const MAX_HISTORICOS_POR_LOCAL = 25;

// Enlaces de Google Maps construidos con el identificador de ficha (cid)
// de los correos de aviso de Google; los de TripAdvisor, localizados en
// TripAdvisor (octubre de 2026). Comprobad que cada uno abre el local.
const RESTAURANTES_INICIALES = [
  ['Sí', 'Mercader del Mar', 'Santa Ponsa', 'https://maps.google.com/?cid=14530670311499082814', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d23043884-Reviews-Mercader_Del_Mar-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'restaurante mediterráneo, paellas, mariscos frescos, pescados, terraza con vistas al mar, vinos y cava, menú para niños, ambiente familiar, celebraciones y eventos, abierto todo el año', ''],
  ['Sí', 'Alma Beach', 'Santa Ponsa', 'https://maps.google.com/?cid=12253750210614447929', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d6761224-Reviews-Alma_Beach_Cocktail_Bar_Steak_House_Thin_Crispy_Pizza-Santa_Ponsa_Calvia_Majorca_.html',
    'steakhouse, beach bar, cócteles, terraza al aire libre, paellas, pizzas artesanales, cocina mediterránea, abierto todo el año', ''],
  ['Sí', 'Amira Great Kebab', 'Santa Ponsa', 'https://maps.google.com/?cid=5849406189229568440', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d32867042-Reviews-Amira_Great_Kebab_Durum_Pizza-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'kebab gourmet, dürum, pizza, wok oriental, poké bowl, helados y copas heladas, take away, reparto a domicilio en Calvià, abierto 24 horas, abierto todo el año',
    'Abierto 24 horas. Agradecer también los pedidos take away / a domicilio.'],
  ['Sí', 'Balcón de María', 'Santa Ponsa', 'https://maps.google.com/?cid=4685547750116726756', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d1792294-Reviews-Balcon_de_Maria-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'pinchos y tapas, terraza con vistas al mar, menú infantil, parque infantil, ambiente familiar, cocina mediterránea, cena romántica, abierto todo el año', ''],
  ['Sí', 'Madre Santa Pizza', 'Santa Ponsa', 'https://maps.google.com/?cid=8957138940596620405', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d26835950-Reviews-Madre_Santa_Pizza_Pasta_Tiramisu-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'restaurante italiano, pizza napolitana, pasta fresca, tiramisú casero, cócteles, terraza con vistas al mar, ambiente familiar, cocina tradicional italiana, abierto todo el año', ''],
  ['Sí', 'Mestiza', 'Santa Ponsa', 'https://maps.google.com/?cid=11933573054473555408', 'https://www.tripadvisor.es/Restaurant_Review-g562815-d33087927-Reviews-Mestiza_Great_Burger_Prime_Steak_Thin_Crispy_American_Pizza-Santa_Ponsa_Calvia_M.html',
    'steak house, prime steak, great burger, pizza fina, cócteles, terraza al aire libre, sports bar', ''],
  ['Sí', 'Virtus Smash Burger', 'Santa Ponsa', 'https://maps.google.com/?cid=8982377804222892924', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d32713291-Reviews-Virtus_Smash_Burger_Beer-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'smash burgers, sports bar, desayunos y bocadillos, cócteles y cerveza, terraza al aire libre, comida rápida de calidad, abierto 24 horas, abierto todo el año',
    'Abierto 24 horas.'],
  ['Sí', 'Pecado 24H', 'Santa Ponsa', 'https://maps.google.com/?cid=18063739213391216462', 'https://www.tripadvisor.com/Restaurant_Review-g562815-d33026069-Reviews-Pecado_24h_Delivery_Street_Food-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'delivery 24 horas, take away',
    'Es delivery/take away: agradecer también los pedidos a domicilio.'],
  ['Sí', 'Playas del Rey', 'Santa Ponsa', 'https://maps.google.com/?cid=2155032086752323594', 'https://www.tripadvisor.com/Hotel_Review-g562815-d272932-Reviews-Playas_del_Rey_Hotel-Santa_Ponsa_Calvia_Majorca_Balearic_Islands.html',
    'hotel en Santa Ponsa, buena ubicación, cerca de la playa, hotel céntrico, desayuno incluido, piscina',
    'Es un HOTEL, no un restaurante: responder como el equipo del hotel. Su bar es N76 (Sports Pool Bar: smash burger, thin pizza, baguettes y sandwiches, cócteles y cerveza, ambiente relajado junto a la piscina); si la reseña habla de la comida o del bar, se puede mencionar N76 con naturalidad.'],
  ['Sí', 'Madre Café Bar', 'Palma de Mallorca', 'https://maps.google.com/?cid=975611850967119471', 'https://www.tripadvisor.com/Restaurant_Review-g187463-d26725569-Reviews-Madre_Cafe_Bar_Tapas_Burger-Palma_de_Mallorca_Majorca_Balearic_Islands.html',
    'tapas, pinchos, arroces y paellas, menú diario, desayunos, Plaza Patines, parque infantil, ambiente familiar, abierto todo el año', ''],
  ['Sí', 'Madre Pizza', 'Palma de Mallorca', 'https://maps.google.com/?cid=4547889845256865308', 'https://www.tripadvisor.com/Restaurant_Review-g187463-d32713256-Reviews-Madre_Pizza_Pasta_Tiramisu-Palma_de_Mallorca_Majorca_Balearic_Islands.html',
    'restaurante italiano, pizza napolitana, pasta casera, tiramisú, cocina italiana tradicional, Plaza Patines, abierto todo el año', ''],
];

const PROMPT_POR_DEFECTO = `Eres la persona del equipo de Unicum Group (Mallorca) que responde las reseñas de Google y TripAdvisor de sus restaurantes en Santa Ponsa y Palma.

Lineamientos obligatorios:
- Tono cercano, cálido e informal: una conversación humana, nunca corporativa.
- Redacción natural, como escrita por un español nativo de Mallorca; expresiones locales sutiles y creíbles, sin forzar mallorquinismos.
- Personalización real: responde al contenido concreto de la reseña. Si el cliente menciona un plato, una persona o un momento, recógelo en la respuesta.
- Idioma: responde SIEMPRE en el idioma exacto en que está escrita la reseña (español, inglés, alemán, francés, catalán, etc.). Si la reseña no tiene texto o es solo una puntuación, responde en el idioma que sugiera el nombre del cliente o, en su defecto, en español.
- Extensión similar a la de la reseña. Reseña de una línea → respuesta de una o dos líneas. Sin texto → dos frases breves como máximo.
- La respuesta no debe parecer automatizada ni generada por IA.
- VARIEDAD: no empieces con la misma fórmula de siempre. Evita arrancar con "¡Muchas gracias..." de forma sistemática; alterna estructuras y entradas.
- Nada de plantillas: fluidez y coherencia por encima de estructuras rígidas.

Para reseñas positivas, cuando la extensión lo permita:
- Agradece la visita y el tiempo dedicado a escribir.
- Transmite alegría genuina por la experiencia.
- Si encaja de forma 100% orgánica, integra COMO MUCHO una o dos de las keywords indicadas. Si no encajan con naturalidad, no uses ninguna: mejor cero keywords que una respuesta forzada.
- Cuando venga a cuento, refuerza la idea de experiencia integral (familia, amigos, cenas románticas, tardeo, celebraciones).
- Invita a volver.
- Emojis con moderación (🌟✨🌅🍴) y solo si encajan con el tono del comentario; en reseñas sobrias, ninguno.

Si aparece una línea que empieza por "->", es una directiva interna del equipo y debe cumplirse de forma prioritaria.

La respuesta debe ser solo el texto a publicar: sin comillas, sin explicaciones y sin firma (la plataforma ya muestra el nombre del restaurante).`;

const INSTRUCCION_NEGATIVA = 'Esta reseña es NEGATIVA. Redacta un BORRADOR para que el equipo lo revise antes de publicarlo: agradece la opinión, lamenta lo ocurrido sin excusas ni discusiones, no inventes hechos ni prometas compensaciones (salvo que la directiva "->" lo indique), apóyate en lo que explique la directiva sobre lo sucedido e invita a contactar en privado. Si no hay directiva, no supongas causas ni des explicaciones: recoge lo concreto que cuenta el cliente, discúlpate por ello y ofrece hablarlo en privado. Si la reseña también elogia algo, agradécelo brevemente. Tono humano y sereno; sin emojis.';

const ESQUEMA_RESPUESTA = {
  type: 'OBJECT',
  properties: {
    respuesta: { type: 'STRING', description: 'Solo el texto a publicar.' },
    aviso: {
      type: 'STRING',
      description: 'En español y en una frase: si la reseña, aunque sea positiva, menciona un problema que el equipo debería revisar (servicio, espera, cobro, limpieza, alergias, trato). Vacío si no hay nada.',
    },
    traduccion: {
      type: 'STRING',
      description: 'Traducción al español de la reseña si se pide; si no, vacío.',
    },
    respuesta_es: {
      type: 'STRING',
      description: 'Si "respuesta" no está en español, su traducción al español para que el equipo la entienda; si ya está en español, vacío.',
    },
  },
  required: ['respuesta', 'aviso', 'traduccion', 'respuesta_es'],
};

const ESQUEMA_TRADUCCION = {
  type: 'OBJECT',
  properties: { traduccion: { type: 'STRING', description: 'El texto traducido al español de España.' } },
  required: ['traduccion'],
};

/**
 * Número interno de cada ficha en Google Business Profile (el que aparece
 * en business.google.com/n/NÚMERO/...), según el cid de su enlace de Maps.
 * Sirve para abrir cada reseña directamente donde se responde.
 */
const NEGOCIO_GOOGLE = {
  '14530670311499082814': '3803572902912039031',   // Mercader del Mar
  '12253750210614447929': '4757988494907609327',   // Alma Beach
  '5849406189229568440': '1280164913376555953',    // Amira Great Kebab
  '4685547750116726756': '14970568932413650508',   // Balcón de María
  '8957138940596620405': '861813709944121767',     // Madre Santa Pizza
  '11933573054473555408': '988258622949546584',    // Mestiza
  '8982377804222892924': '13031996306508447943',   // Virtus Smash Burger
  '18063739213391216462': '6198292089282020621',   // Pecado 24H
  '2155032086752323594': '1273142670807325147',    // Playas del Rey
  '975611850967119471': '4263931238444707074',     // Madre Café Bar
  '4547889845256865308': '9111890258740612259',    // Madre Pizza
};

/** Enlace para responder: en Google, el panel del negocio; si no se conoce, la reseña pública. */
function enlaceResponder_(plataforma, id, cid, urlResena) {
  const idResena = String(id || '').replace(/^g:/, '');
  if (plataforma === 'Google' && NEGOCIO_GOOGLE[cid] && /^[\w-]+$/.test(idResena)) {
    return 'https://business.google.com/n/' + NEGOCIO_GOOGLE[cid] + '/reviews/' + idResena + '?fid=' + cid;
  }
  return urlResena || '';
}


// ===================================================================== fuentes

const FUENTES = {
  google: {
    plataforma: 'Google',
    actor: 'compass~google-maps-reviews-scraper',
    campoUrl: 'google',
    horas: () => CONFIG.HORAS_ENTRE_LECTURAS,
    repasoDiario: true,
    entrada: (urls, tipo, desde) => {
      const e = {
        startUrls: urls.map(u => ({ url: u })),
        maxReviews: tipo === 'estilo' ? 60 : tipo === 'recuperar' ? 300 : CONFIG.RESENAS_POR_RESTAURANTE,
        reviewsSort: 'newest', // obligatorio para usar reviewsStartDate
        language: 'es',
        personalData: true,
      };
      if (tipo !== 'estilo') {
        e.reviewsStartDate = Math.max(1, Math.ceil((Date.now() - desde) / HORA)) + ' hours';
      }
      return e;
    },
    normalizar: it => ({
      id: 'g:' + (it.reviewId || it.reviewUrl || ''),
      plataforma: 'Google',
      nombreFicha: it.title || it.placeName || '',
      cid: String(it.cid || ''),
      cliente: it.name || it.reviewerName || 'Cliente',
      estrellas: Number(it.stars || it.rating || 0),
      idioma: it.originalLanguage || '',
      texto: it.text || '',
      traduccion: it.originalLanguage && it.originalLanguage !== 'es' ? (it.textTranslated || '') : '',
      url: it.reviewUrl || it.url || '',
      fecha: fecha_(it.publishedAtDate || it.publishedAt),
      respuestaPropietario: it.responseFromOwnerText || it.ownerResponseText || '',
    }),
  },
  tripadvisor: {
    plataforma: 'TripAdvisor',
    actor: 'maxcopell~tripadvisor-reviews',
    campoUrl: 'tripadvisor',
    horas: () => CONFIG.HORAS_ENTRE_LECTURAS_TRIPADVISOR,
    repasoDiario: false, // cada lectura ya cubre los últimos días
    entrada: (urls, tipo, desde) => {
      const e = {
        startUrls: urls.map(u => ({ url: u })),
        maxItemsPerQuery: tipo === 'estilo' ? 40 : tipo === 'recuperar' ? 150 : CONFIG.RESENAS_POR_RESTAURANTE,
      };
      if (tipo !== 'estilo') {
        e.lastReviewDate = Utilities.formatDate(
          new Date(Math.min(desde, Date.now() - CONFIG.DIAS_REPASO * DIA)), ZONA, 'yyyy-MM-dd');
      }
      return e;
    },
    normalizar: it => {
      const respuesta = it.ownerResponse;
      return {
        id: 't:' + (it.id || it.url || ''),
        plataforma: 'TripAdvisor',
        nombreFicha: (it.placeInfo && it.placeInfo.name) || '',
        cid: '',
        cliente: (it.user && (it.user.name || it.user.username)) || 'Cliente',
        estrellas: Number(it.rating || 0),
        idioma: it.lang || '',
        texto: [it.title, it.text].filter(Boolean).join('\n'),
        traduccion: '',
        url: it.url || '',
        fecha: fecha_(it.publishedDate),
        respuestaPropietario: respuesta ? (typeof respuesta === 'string' ? respuesta : respuesta.text || '') : '',
      };
    },
  },
};


// ======================================================================== menú

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Reseñas')
    .addItem('▶ Buscar reseñas nuevas ahora', 'ciclo')
    .addItem('↻ Regenerar respuesta de la fila seleccionada', 'regenerarFilaSeleccionada')
    .addItem('📱 Abrir la cola de respuestas', 'mostrarEnlaceCola')
    .addSeparator()
    .addItem('📥 Recuperar reseñas sin responder (último mes)', 'pedirRecuperacion')
    .addItem('📊 Enviar el informe semanal ahora', 'enviarInformeAhora')
    .addItem('🎓 Aprender de respuestas antiguas', 'pedirEjemplos')
    .addItem('💳 Gemini de pago: activar / desactivar', 'alternarGeminiPago')
    .addItem('💶 Ver gasto de Apify', 'mostrarGastoApify')
    .addItem('🔑 Cambiar claves', 'cambiarClaves')
    .addItem('⚙ Instalar / reparar', 'instalar')
    .addToUi();
}

function instalar() {
  const ui = SpreadsheetApp.getUi();
  if (!pedirClaves_(false)) return;
  prepararHojaRespuestas_();
  prepararHojaRestaurantes_();
  const primeraVez = prepararHojaEjemplos_();
  prepararHojaPrompt_();
  prepararHojaPublicadas_();

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'ciclo')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ciclo').timeBased().everyMinutes(30).create();

  if (primeraVez) pedirEjemplos_();

  ui.alert('Listo. La hoja se actualizará sola cada media hora.\n\n' +
    'Ahora pulsa Reseñas → "Buscar reseñas nuevas ahora". La primera lectura ' +
    'tarda unos minutos y además aprende de vuestras respuestas antiguas: ' +
    'vuelve a pulsarlo pasados 5-10 minutos (o espera a la siguiente media hora).');
}

function cambiarClaves() {
  if (pedirClaves_(true)) SpreadsheetApp.getUi().alert('Claves guardadas y comprobadas ✔');
}

const CLAVES = [
  { nombre: 'APIFY_TOKEN', texto: 'Pega tu token de Apify (console.apify.com → Settings → API & Integrations → Personal API token):', probar: probarApify_ },
  { nombre: 'GEMINI_API_KEY', texto: 'Pega tu clave de Gemini (aistudio.google.com → Get API key):', probar: probarGemini_ },
];

/**
 * Pide por pantalla las claves que falten (o todas, si "todas"), comprueba
 * que funcionan y las guarda en las propiedades del proyecto, que solo
 * puede leer este programa. Devuelve false si se cancela.
 */
function pedirClaves_(todas) {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  for (const c of CLAVES) {
    if (!todas && props.getProperty(c.nombre)) continue;
    for (;;) {
      const r = ui.prompt('Clave ' + c.nombre, c.texto + (todas ? '\n(Vacío = mantener la actual)' : ''),
        ui.ButtonSet.OK_CANCEL);
      if (r.getSelectedButton() !== ui.Button.OK) {
        ui.alert('Instalación pausada: sin esa clave el sistema no puede funcionar. Vuelve a pulsar "Instalar" cuando la tengas.');
        return false;
      }
      const valor = r.getResponseText().trim();
      if (!valor && todas && props.getProperty(c.nombre)) break;
      const error = valor ? c.probar(valor) : 'está vacía';
      if (!error) { props.setProperty(c.nombre, valor); break; }
      ui.alert('Esa clave no funciona (' + error + '). Revisa que la copiaste entera y vuelve a pegarla.');
    }
  }
  return true;
}

/** Devuelve '' si el token de Apify funciona, o el motivo del fallo. */
function probarApify_(token) {
  const res = UrlFetchApp.fetch('https://api.apify.com/v2/users/me', {
    headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  return res.getResponseCode() === 200 ? '' : 'Apify respondió ' + res.getResponseCode();
}

/** Devuelve '' si la clave de Gemini funciona, o el motivo del fallo. */
function probarGemini_(clave) {
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
    headers: { 'x-goog-api-key': clave }, muteHttpExceptions: true });
  return res.getResponseCode() === 200 ? '' : 'Gemini respondió ' + res.getResponseCode();
}

function pedirEjemplos() {
  pedirEjemplos_();
  SpreadsheetApp.getUi().alert('En la próxima vuelta (como mucho media hora, o pulsando "Buscar ' +
    'reseñas nuevas ahora") se leerán vuestras respuestas antiguas y se guardarán en la ' +
    'pestaña "Ejemplos". Podéis desactivar con "No" las que no os gusten.');
}

function pedirEjemplos_() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(FUENTES).forEach(c => props.setProperty('ESTILO_PEDIDO_' + c, '1'));
}

function pedirRecuperacion() {
  pedirRecuperacion_();
  SpreadsheetApp.getUi().alert('En la próxima vuelta (como mucho media hora, o pulsando "Buscar reseñas ' +
    'nuevas ahora") se leerán las reseñas del último mes y se añadirán las que sigan sin responder. ' +
    'Los borradores se irán redactando en las horas siguientes, de las más recientes a las más antiguas.');
}

function pedirRecuperacion_() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(FUENTES).forEach(c => props.setProperty('RECUPERAR_PEDIDO_' + c, '1'));
}

/** Con la facturación de Gemini activada, todo va al mejor modelo y más rápido. */
function alternarGeminiPago() {
  const props = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  if (props.getProperty('GEMINI_PAGO')) {
    props.deleteProperty('GEMINI_PAGO');
    ui.alert('Modo gratuito: Gemini Flash para las reseñas largas mientras haya cupo, y modelos más ligeros para el resto.');
  } else {
    const r = ui.alert('¿Has activado la facturación de tu clave de Gemini en AI Studio? ' +
      '(Si no, las respuestas fallarían por falta de cupo.)', ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
    props.setProperty('GEMINI_PAGO', '1');
    ui.alert('Modo de pago activado ✔ Todas las respuestas usarán el mejor modelo (coste estimado: 2-4 € al mes).');
  }
}

function geminiPago_() {
  return Boolean(PropertiesService.getScriptProperties().getProperty('GEMINI_PAGO'));
}

/** Cambios que se aplican una sola vez al actualizar a esta versión. */
function migrarVersion_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('INSTALADO')) props.setProperty('INSTALADO', String(Date.now()));
  const version = props.getProperty('VERSION');
  if (version === '3.3') return;
  const antesDe = v => !version || Number(version) < v;
  if (antesDe(3)) pedirRecuperacion_();   // rescata las reseñas sin responder del último mes
  if (antesDe(3.1)) {
    desactivarEjemplosMalos_();  // ejemplos respondidos en otro idioma
    rehacerBorradoresEnOtroIdioma_();
  }
  if (antesDe(3.2)) {
    prepararHojaRespuestas_();   // columna "Respuesta en español"
    actualizarEnlacesResponder_();
  }
  prepararHojaPublicadas_();
  props.setProperty('VERSION', '3.3');
}

/** Pestaña de solo lectura con las respuestas publicadas, de la más reciente a la más antigua. */
function prepararHojaPublicadas_() {
  const hoja = hoja_(HOJA.PUBLICADAS, true);
  hoja.getRange(1, 1, 1, 9).setValues([['Fecha', 'Plataforma', 'Restaurante', 'Cliente', '★', 'Reseña',
    'Respuesta publicada', 'Borrador de la IA', 'Borrador en español']])
    .setFontWeight('bold').setBackground('#1a7f37').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  // Se rellena sola con lo que esté "Publicada ✔" en Respuestas: no hay que tocarla.
  hoja.getRange(2, 1).setFormula('=IFERROR(SORT(CHOOSECOLS(FILTER(' + HOJA.RESPUESTAS + '!A2:Q, ' +
    HOJA.RESPUESTAS + '!L2:L="' + ESTADO.PUBLICADA + '"), 1, 2, 3, 4, 5, 7, 14, 10, 17), 1, FALSE), ' +
    '"Todavía no hay respuestas publicadas.")');
  [110, 90, 150, 140, 40, 320, 380, 320, 320].forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  const filas = hoja.getMaxRows() - 1;
  hoja.getRange(2, 1, filas, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  hoja.getRange(2, 1, filas, 9).setWrap(true).setVerticalAlignment('top');
}

/** Cambia los enlaces de las reseñas de Google abiertas por el de responder. */
function actualizarEnlacesResponder_() {
  conBloqueo_(() => {
    const hoja = hoja_(HOJA.RESPUESTAS);
    const ultima = hoja.getLastRow();
    if (ultima < 2) return;
    const restaurantes = leerRestaurantes_();
    const filas = hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues();
    const enlaces = hoja.getRange(2, COL.ENLACE, ultima - 1, 1).getRichTextValues();
    let cambios = 0;
    const nuevos = filas.map((f, i) => {
      const actual = (enlaces[i][0] && enlaces[i][0].getLinkUrl()) || '';
      const rest = buscarRestaurantePorNombre_(restaurantes, f[COL.RESTAURANTE - 1]);
      const url = enlaceResponder_(f[COL.PLATAFORMA - 1], f[COL.ID - 1], rest && rest.cid, actual);
      if (url === actual) return [enlaces[i][0] || SpreadsheetApp.newRichTextValue().setText('').build()];
      cambios++;
      return [SpreadsheetApp.newRichTextValue().setText('Responder ↗').setLinkUrl(url).build()];
    });
    if (cambios) hoja.getRange(2, COL.ENLACE, ultima - 1, 1).setRichTextValues(nuevos);
  });
}

/** Vacía los borradores pendientes que están en otro idioma que la reseña para que se redacten de nuevo. */
function rehacerBorradoresEnOtroIdioma_() {
  conBloqueo_(() => {
    const hoja = hoja_(HOJA.RESPUESTAS);
    if (hoja.getLastRow() < 2) return;
    hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA.length).getValues().forEach((f, i) => {
      const estado = f[COL.ESTADO - 1];
      if ((estado !== ESTADO.PENDIENTE && estado !== ESTADO.REVISAR) || f[COL.INSTRUCCION - 1]) return;
      if (String(f[COL.RESENA - 1] || '').trim().length < 20) return;
      if (!f[COL.RESPUESTA - 1] || !idiomaDistinto_(f[COL.IDIOMA - 1], f[COL.RESPUESTA - 1])) return;
      hoja.getRange(i + 2, COL.RESPUESTA).setValue('');
      hoja.getRange(i + 2, COL.ESTADO, 1, 2).setValues([[ESTADO.PENDIENTE, '']]); // estado y aviso
      hoja.getRange(i + 2, COL.MODELO).setValue('');
    });
  });
}

function mostrarGastoApify() {
  const gasto = gastoApify_(true);
  SpreadsheetApp.getUi().alert(gasto === null
    ? 'No se pudo consultar el gasto de Apify. Revísalo en console.apify.com → Billing.'
    : 'Gasto de Apify este mes: ' + gasto.toFixed(2) + ' $ de 5 $ gratuitos.');
}

function mostrarEnlaceCola() {
  const url = ScriptApp.getService().getUrl();
  const ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('La cola todavía no está publicada. Sigue el paso "Cola en el móvil" de la guía ' +
      '(Implementar → Nueva implementación → Aplicación web).');
    return;
  }
  ui.showModalDialog(HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Abre este enlace en el móvil (con la cuenta de la hoja) ' +
    'y guárdalo en la pantalla de inicio:</p><p style="font-family:sans-serif;word-break:break-all">' +
    '<a href="' + url + '" target="_blank">' + url + '</a></p>').setWidth(460).setHeight(170),
    'Cola de respuestas');
}


// ======================================================================= ciclo

function ciclo() {
  const inicio = Date.now();
  try { migrarVersion_(); } catch (e) { console.warn('migración: ' + e); }
  Object.keys(FUENTES).forEach(clave => {
    try {
      comprobarLectura_(clave);
      lanzarLecturaSiToca_(clave);
    } catch (e) {
      avisarError_('fuente_' + clave, 'Fallo leyendo ' + FUENTES[clave].plataforma + ': ' + (e.message || e));
    }
  });
  // El informe va antes que los borradores: es una sola llamada a la IA y así no se queda sin tiempo.
  try { enviarInformeSiToca_(); } catch (e) { avisarError_('informe', 'No se pudo enviar el informe semanal: ' + (e.message || e)); }
  generarPendientes_(inicio);
  enviarResumenSiToca_();
}

/** Si la lectura lanzada antes ha terminado, pasa sus reseñas a la hoja. */
function comprobarLectura_(clave) {
  const props = PropertiesService.getScriptProperties();
  const lectura = JSON.parse(props.getProperty('LECTURA_' + clave) || 'null');
  if (!lectura) return;
  const run = apify_('GET', 'actor-runs/' + lectura.id);
  const estado = run && run.data ? run.data.status : 'DESCONOCIDO';
  if (['READY', 'RUNNING', 'TIMING-OUT', 'ABORTING'].indexOf(estado) >= 0) {
    if (Date.now() - lectura.inicio < 3 * HORA) return;
    // Colgada: se cancela para que no siga gastando y se lanzará otra.
    try { apify_('POST', 'actor-runs/' + lectura.id + '/abort'); } catch (e) { /* mejor esfuerzo */ }
    props.deleteProperty('LECTURA_' + clave);
    avisarError_('lectura_' + clave, 'Una lectura de ' + FUENTES[clave].plataforma +
      ' llevaba más de 3 horas sin terminar y se ha cancelado. Se lanzará otra sola.');
    return;
  }
  props.deleteProperty('LECTURA_' + clave);
  if (estado !== 'SUCCEEDED') {
    avisarError_('lectura_' + clave, 'La lectura de ' + FUENTES[clave].plataforma +
      ' terminó con estado ' + estado + '. Se reintentará sola.');
    return;
  }
  const items = apify_('GET', 'datasets/' + run.data.defaultDatasetId + '/items?clean=true&format=json') || [];
  conBloqueo_(() => procesarLectura_(clave, items));
  props.setProperty('OK_' + clave, String(lectura.inicio));
}

/** Lanza la siguiente lectura en Apify cuando toca. */
function lanzarLecturaSiToca_(clave) {
  const f = FUENTES[clave];
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('LECTURA_' + clave)) return; // ya hay una en marcha
  const urls = leerRestaurantes_().filter(r => r.activo && r[f.campoUrl]).map(r => r[f.campoUrl]);
  if (!urls.length) return;

  const ahora = Date.now();
  const desdeUltima = t => ahora - Number(props.getProperty('ULTIMA_' + t + '_' + clave) || 0);
  let tipo = null;
  if (props.getProperty('ESTILO_PEDIDO_' + clave)) tipo = 'estilo';
  else if (props.getProperty('RECUPERAR_PEDIDO_' + clave)) tipo = 'recuperar';
  else if (f.repasoDiario && desdeUltima('repaso') >= 20 * HORA) tipo = 'repaso';
  else if (desdeUltima('nuevas') >= f.horas() * HORA - 5 * MIN) tipo = 'nuevas';
  if (!tipo) return;

  const gasto = gastoApify_();
  if (gasto !== null && gasto >= 5) return; // tope gratuito: Apify rechazaría la lectura
  if (tipo === 'nuevas' && gasto !== null && gasto >= CONFIG.APIFY_PRESUPUESTO_USD) {
    avisarError_('presupuesto', 'El gasto de Apify de este mes (' + gasto.toFixed(2) +
      ' $) se acerca a los 5 $ gratuitos: hasta fin de mes solo se hará el repaso diario.');
    return;
  }

  const desde = tipo === 'repaso' ? ahora - CONFIG.DIAS_REPASO * DIA
    : tipo === 'recuperar' ? ahora - CONFIG.DIAS_RECUPERACION * DIA
    : Number(props.getProperty('OK_' + clave)) || ahora - CONFIG.DIAS_REPASO * DIA;
  const entrada = f.entrada(urls, tipo, desde);
  const porLocal = entrada.maxReviews || entrada.maxItemsPerQuery || CONFIG.RESENAS_POR_RESTAURANTE;
  const run = apify_('POST', 'acts/' + f.actor + '/runs?maxItems=' + urls.length * porLocal, entrada);
  props.setProperty('LECTURA_' + clave, JSON.stringify({ id: run.data.id, tipo: tipo, inicio: ahora }));
  props.setProperty('ULTIMA_' + tipo + '_' + clave, String(ahora));
  if (tipo === 'estilo') props.deleteProperty('ESTILO_PEDIDO_' + clave);
  if (tipo === 'recuperar') props.deleteProperty('RECUPERAR_PEDIDO_' + clave);
}

/** Pasa a la hoja las reseñas de una lectura y aprende de las ya respondidas. */
function procesarLectura_(clave, items) {
  const restaurantes = leerRestaurantes_();
  const resenas = items.map(FUENTES[clave].normalizar).filter(r => r.id.length > 2);
  resenas.forEach(r => {
    const rest = asociarRestaurante_(restaurantes, r);
    r.restaurante = rest ? rest.nombre : (r.nombreFicha || 'Desconocido');
    r.url = enlaceResponder_(r.plataforma, r.id, (rest && rest.cid) || r.cid, r.url);
  });

  const hoja = hoja_(HOJA.RESPUESTAS);
  const indice = indexarFilas_(hoja);
  const limite = Date.now() - CONFIG.DIAS_MAXIMOS * DIA;
  const nuevas = [];
  const negativas = [];
  const ejemplos = [];
  const vistas = {};

  resenas.forEach(r => {
    if (vistas[r.id]) return;
    vistas[r.id] = true;
    const fila = indice[r.id];
    if (fila) {
      if (r.respuestaPropietario) registrarPublicada_(hoja, fila, r.respuestaPropietario);
      return;
    }
    if (r.respuestaPropietario) {
      // Respondida fuera del sistema: buen ejemplo del estilo del equipo.
      if (r.estrellas >= CONFIG.MIN_ESTRELLAS_BORRADOR && r.texto) ejemplos.push(r);
      return;
    }
    if (r.fecha.getTime() < limite) return;
    const negativa = r.estrellas < CONFIG.MIN_ESTRELLAS_BORRADOR;
    nuevas.push([r.fecha, r.plataforma, r.restaurante, r.cliente, r.estrellas, r.idioma,
      r.texto, r.traduccion, '', '', r.url, negativa ? ESTADO.MANO : ESTADO.PENDIENTE,
      '', '', '', r.id, '']);
    if (negativa) negativas.push(r);
  });

  if (ejemplos.length) agregarEjemplos_(ejemplos, ORIGEN.HISTORICO);
  if (nuevas.length) anadirFilas_(hoja, nuevas);
  if (negativas.length && CONFIG.AVISAR_NEGATIVAS) avisarNegativas_(negativas);
}

/** Marca una fila como publicada y aprende si el texto final cambió. */
function registrarPublicada_(hoja, fila, textoPublicado) {
  const valores = hoja.getRange(fila, 1, 1, CABECERA.length).getValues()[0];
  if (valores[COL.ESTADO - 1] !== ESTADO.DESCARTADA) {
    hoja.getRange(fila, COL.ESTADO).setValue(ESTADO.PUBLICADA);
  }
  if (!valores[COL.PUBLICADA - 1] && textoPublicado) {
    hoja.getRange(fila, COL.PUBLICADA).setValue(textoPublicado);
    aprenderDeFila_(valores, textoPublicado);
  }
}

/** Si el equipo corrigió el borrador, guarda la versión final como ejemplo. */
function aprenderDeFila_(valores, textoFinal) {
  const borrador = String(valores[COL.RESPUESTA - 1] || '');
  if (!borrador || !textoFinal || similitud_(borrador, textoFinal) >= 0.8) return;
  if (Number(valores[COL.ESTRELLAS - 1]) < CONFIG.MIN_ESTRELLAS_BORRADOR) return;
  agregarEjemplos_([{
    id: valores[COL.ID - 1],
    restaurante: valores[COL.RESTAURANTE - 1],
    idioma: valores[COL.IDIOMA - 1],
    estrellas: valores[COL.ESTRELLAS - 1],
    texto: valores[COL.RESENA - 1],
    respuestaPropietario: textoFinal,
  }], ORIGEN.CORREGIDA);
}


// ================================================================== redacción

/**
 * Redacta los borradores que falten (filas "Pendiente" sin respuesta).
 * El tiempo cuenta desde "inicio" (el principio de la vuelta), porque
 * Google corta cualquier ejecución que pase de 6 minutos.
 */
function generarPendientes_(inicio) {
  const props = PropertiesService.getScriptProperties();
  if (Number(props.getProperty('GENERANDO_HASTA') || 0) > Date.now()) return;
  props.setProperty('GENERANDO_HASTA', String(Date.now() + CONFIG.TIEMPO_MAXIMO_MS + MIN));
  inicio = inicio || Date.now();
  try {
    const contexto = cargarContexto_();
    // Primero las negativas (más urgentes), luego las positivas.
    const sinBorrador = estado => contexto.filas.filter(f => f[COL.ESTADO - 1] === estado &&
      !f[COL.RESPUESTA - 1] && !f[COL.AVISO - 1]);
    const pendientes = (CONFIG.BORRADOR_NEGATIVAS ? sinBorrador(ESTADO.MANO) : [])
      .concat(sinBorrador(ESTADO.PENDIENTE));
    let hechos = 0;
    for (const fila of pendientes) {
      if (hechos >= CONFIG.MAX_BORRADORES_POR_EJECUCION) break;
      if (Date.now() - inicio > CONFIG.TIEMPO_MAXIMO_MS) break;
      const id = fila[COL.ID - 1];
      try {
        const salida = redactar_(fila, contexto, '');
        guardarRedaccion_(id, salida, '');
        contexto.anotarApertura(fila[COL.RESTAURANTE - 1], salida.respuesta);
        props.setProperty('ULTIMO_BORRADOR', String(Date.now()));
      } catch (e) {
        if (e.limite) break; // sin cupo en ningún modelo: se sigue más tarde
        if (e.tipo === 'clave') {
          avisarError_('clave_gemini', 'La clave de Gemini (GEMINI_API_KEY) no es válida o no tiene ' +
            'permiso. Revísala en la configuración del proyecto. Detalle: ' + e.message);
          break;
        }
        conBloqueo_(() => {
          const n = filaPorId_(hoja_(HOJA.RESPUESTAS), id);
          if (!n) return;
          const h = hoja_(HOJA.RESPUESTAS);
          if (fila[COL.ESTADO - 1] === ESTADO.MANO) {
            // Sigue "a mano"; el aviso evita reintentarla en cada vuelta.
            h.getRange(n, COL.AVISO).setValue('No se pudo redactar el borrador: pide uno desde la cola.');
          } else {
            h.getRange(n, COL.ESTADO).setValue(ESTADO.ERROR);
          }
          h.getRange(n, COL.RESPUESTA).setNote(String(e.message || e));
        });
      }
      hechos++;
      Utilities.sleep(geminiPago_() ? 1500 : CONFIG.PAUSA_ENTRE_LLAMADAS_MS);
    }
    comprobarAtasco_(Math.max(0, pendientes.length - hechos));

    // Respuestas en otro idioma sin su versión en español (p. ej., de antes de existir la columna).
    const porTraducir = cargarContexto_().filas.filter(f => ESTADOS_ABIERTOS.indexOf(f[COL.ESTADO - 1]) >= 0 &&
      f[COL.RESPUESTA - 1] && !f[COL.RESP_ES - 1] && !enEspanol_(f[COL.RESPUESTA - 1]));
    for (const fila of porTraducir) {
      if (hechos >= CONFIG.MAX_BORRADORES_POR_EJECUCION || Date.now() - inicio > CONFIG.TIEMPO_MAXIMO_MS) break;
      let es;
      try {
        es = traducirAlEspanol_(fila[COL.RESPUESTA - 1]);
      } catch (e) {
        if (e.limite || e.tipo === 'clave') break;
        es = '(no se pudo traducir)';
      }
      conBloqueo_(() => {
        const h = hoja_(HOJA.RESPUESTAS);
        const n = filaPorId_(h, fila[COL.ID - 1]);
        // Solo si el borrador sigue siendo el mismo que se tradujo.
        if (n && h.getRange(n, COL.RESPUESTA).getValue() === fila[COL.RESPUESTA - 1]) h.getRange(n, COL.RESP_ES).setValue(es);
      });
      hechos++;
      Utilities.sleep(geminiPago_() ? 1500 : CONFIG.PAUSA_ENTRE_LLAMADAS_MS);
    }
  } finally {
    props.deleteProperty('GENERANDO_HASTA');
  }
}

function traducirAlEspanol_(texto) {
  return String(llamarIA_('Traduce al español de España el texto que te paso, con naturalidad. ' +
    'Devuelve solo la traducción.', String(texto), CONFIG.MODELO_PARA_RESENAS_CORTAS, ESQUEMA_TRADUCCION).traduccion || '').trim();
}

function enEspanol_(texto) {
  return idiomaProbable_(texto) === 'es';
}

/** Avisa si hay reseñas esperando y la IA lleva horas sin redactar nada. */
function comprobarAtasco_(pendientes) {
  const props = PropertiesService.getScriptProperties();
  if (!pendientes) { props.deleteProperty('PENDIENTES_DESDE'); return; }
  if (!props.getProperty('PENDIENTES_DESDE')) props.setProperty('PENDIENTES_DESDE', String(Date.now()));
  // Se cuenta desde lo más reciente: el último borrador o el momento en que empezó a haber cola.
  const desde = Math.max(Number(props.getProperty('ULTIMO_BORRADOR') || 0),
    Number(props.getProperty('PENDIENTES_DESDE')));
  const horas = (Date.now() - desde) / HORA;
  if (horas < CONFIG.HORAS_SIN_BORRADORES_AVISO) return;
  const error = props.getProperty('ULTIMO_ERROR_IA') || 'sin detalle';
  avisarError_('atasco', 'Hay ' + pendientes + ' reseñas esperando borrador y la IA lleva ' + Math.floor(horas) +
    ' horas sin redactar ninguno. Último error: ' + error + '. Si es por cupo, se arregla solo al día ' +
    'siguiente; con la facturación de Gemini activada no vuelve a pasar.');
}

/** Menú de la hoja: vuelve a redactar la fila seleccionada. */
function regenerarFilaSeleccionada() {
  const ui = SpreadsheetApp.getUi();
  const hoja = SpreadsheetApp.getActiveSheet();
  const fila = hoja.getActiveRange() ? hoja.getActiveRange().getRow() : 0;
  if (hoja.getName() !== HOJA.RESPUESTAS || fila < 2) {
    ui.alert('Selecciona una fila de la pestaña "' + HOJA.RESPUESTAS + '".');
    return;
  }
  const id = hoja.getRange(fila, COL.ID).getValue();
  const instruccion = hoja.getRange(fila, COL.INSTRUCCION).getValue();
  try {
    regenerarPorId_(id, instruccion);
  } catch (e) {
    ui.alert('No se pudo redactar: ' + (e.message || e));
  }
}

function regenerarPorId_(id, instruccion) {
  const contexto = cargarContexto_();
  const fila = contexto.filas.find(f => f[COL.ID - 1] === id);
  if (!fila) throw new Error('No encuentro esa reseña en la hoja.');
  const salida = redactar_(fila, contexto, String(instruccion || ''), true);
  guardarRedaccion_(id, salida, String(instruccion || ''));
  return salida;
}

function guardarRedaccion_(id, salida, instruccion) {
  conBloqueo_(() => {
    const hoja = hoja_(HOJA.RESPUESTAS);
    const n = filaPorId_(hoja, id);
    if (!n) return;
    const v = hoja.getRange(n, 1, 1, CABECERA.length).getValues()[0];
    hoja.getRange(n, COL.RESPUESTA).setValue(salida.respuesta).clearNote();
    hoja.getRange(n, COL.AVISO).setValue(salida.aviso || '');
    hoja.getRange(n, COL.MODELO).setValue(salida.modelo);
    hoja.getRange(n, COL.RESP_ES).setValue(enEspanol_(salida.respuesta) ? '' : salida.respuesta_es || '');
    if (instruccion) hoja.getRange(n, COL.INSTRUCCION).setValue(instruccion);
    if (salida.traduccion && !v[COL.TRADUCCION - 1]) hoja.getRange(n, COL.TRADUCCION).setValue(salida.traduccion);
    const estado = v[COL.ESTADO - 1];
    if (estado !== ESTADO.MANO && estado !== ESTADO.PUBLICADA && estado !== ESTADO.DESCARTADA) {
      hoja.getRange(n, COL.ESTADO).setValue(salida.aviso ? ESTADO.REVISAR : ESTADO.PENDIENTE);
    }
  });
}

/** Lee una vez todo lo que la IA necesita: filas, restaurantes, ejemplos y prompt. */
function cargarContexto_() {
  const hoja = hoja_(HOJA.RESPUESTAS);
  const ultima = hoja.getLastRow();
  const filas = ultima < 2 ? [] : hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues();
  const aperturas = {};
  filas.forEach(f => { // la hoja está ordenada de más reciente a más antigua
    const r = f[COL.RESTAURANTE - 1];
    const texto = f[COL.PUBLICADA - 1] || f[COL.RESPUESTA - 1];
    if (!texto) return;
    aperturas[r] = aperturas[r] || [];
    if (aperturas[r].length < CONFIG.APERTURAS_A_EVITAR) aperturas[r].push(apertura_(texto));
  });
  return {
    filas: filas,
    restaurantes: leerRestaurantes_(),
    ejemplos: leerEjemplos_(),
    prompt: leerPrompt_(),
    aperturas: aperturas,
    anotarApertura: function (r, texto) {
      this.aperturas[r] = [apertura_(texto)].concat(this.aperturas[r] || [])
        .slice(0, CONFIG.APERTURAS_A_EVITAR);
    },
  };
}

function redactar_(fila, contexto, instruccion, manual) {
  const nombre = String(fila[COL.RESTAURANTE - 1]);
  const rest = buscarRestaurantePorNombre_(contexto.restaurantes, nombre) ||
    { nombre: nombre, ciudad: '', keywords: '', notas: '' };
  const idioma = String(fila[COL.IDIOMA - 1] || '');
  const texto = String(fila[COL.RESENA - 1] || '').trim();
  const estrellas = Number(fila[COL.ESTRELLAS - 1]);
  const pedirTraduccion = !fila[COL.TRADUCCION - 1] && texto && idioma !== 'es';

  const p = [];
  p.push('Plataforma: ' + fila[COL.PLATAFORMA - 1]);
  p.push('Restaurante: ' + rest.nombre + (rest.ciudad ? ' (' + rest.ciudad + ')' : ''));
  if (rest.keywords) {
    p.push('Keywords disponibles (usar 1-2 como máximo y solo si encajan; están en español: si respondes en ' +
      'otro idioma, tradúcelas): ' + rest.keywords);
  }
  if (rest.notas) p.push('Notas del equipo: ' + rest.notas);

  const ejemplos = elegirEjemplos_(contexto.ejemplos, rest.nombre, idioma);
  if (ejemplos.length) {
    p.push('');
    p.push('Ejemplos reales de cómo responde el equipo (imita el tono y la naturalidad; NO copies sus frases ni su estructura):');
    ejemplos.forEach((e, i) => {
      p.push('[' + (i + 1) + '] ' + (e.restaurante !== rest.nombre ? '(otro local del grupo) ' : '') +
        'Reseña (' + e.estrellas + '★): "' + recortar_(e.resena, 280) + '"');
      p.push('    Respuesta: "' + recortar_(e.respuesta, 450) + '"');
    });
  }
  const usadas = contexto.aperturas[rest.nombre] || [];
  if (usadas.length) {
    p.push('');
    p.push('Así empezaron las últimas respuestas de este local; empieza de forma claramente distinta:');
    usadas.forEach(a => p.push('- "' + a + '"'));
  }

  p.push('');
  p.push('Cliente: ' + fila[COL.CLIENTE - 1]);
  p.push('Puntuación: ' + estrellas + ' estrellas');
  p.push(texto ? 'Reseña:\n' + texto : 'Reseña: (sin texto, solo puntuación)');
  const lengua = texto && idioma ? nombreIdioma_(idioma) : '';
  if (lengua) {
    p.push('\nIdioma de la reseña: ' + lengua + '. Escribe la respuesta en ' + lengua +
      ', aunque estas indicaciones y los ejemplos estén en español.');
  }
  if (estrellas < CONFIG.MIN_ESTRELLAS_BORRADOR) p.push('\n' + INSTRUCCION_NEGATIVA);
  if (instruccion) p.push('-> ' + instruccion.replace(/^->\s*/, ''));
  if (pedirTraduccion) p.push('\nIncluye en "traduccion" la traducción de la reseña al español.');

  const largo = texto.length >= CONFIG.LONGITUD_RESENA_CORTA;
  const mejor = manual || largo || geminiPago_();
  const salida = llamarIA_(contexto.prompt, p.join('\n'), mejor ? 0 : CONFIG.MODELO_PARA_RESENAS_CORTAS);

  // Comprobación de idioma (salvo que el equipo haya dado una indicación propia).
  const comprobar = lengua && !instruccion && texto.length >= 20;
  if (!comprobar || !idiomaDistinto_(idioma, salida.respuesta)) return salida;
  try {
    const otra = llamarIA_(contexto.prompt, p.join('\n') + '\n-> IMPORTANTE: tu respuesta anterior no estaba en ' +
      lengua + '. Escríbela entera en ' + lengua + '.', 0);
    if (!idiomaDistinto_(idioma, otra.respuesta)) return otra;
  } catch (e) {
    if (e.tipo === 'clave') throw e;
  }
  salida.aviso = (salida.aviso ? salida.aviso + ' ' : '') + 'La respuesta no parece estar en ' + lengua +
    ': revísala o pide otra versión.';
  return salida;
}

const NOMBRES_IDIOMA = {
  es: 'español', en: 'inglés', de: 'alemán', fr: 'francés', it: 'italiano', pt: 'portugués',
  nl: 'neerlandés', ca: 'catalán', sv: 'sueco', no: 'noruego', nb: 'noruego', da: 'danés',
  fi: 'finés', pl: 'polaco', ru: 'ruso', uk: 'ucraniano', cs: 'checo', sk: 'eslovaco', hu: 'húngaro',
  ro: 'rumano', el: 'griego', tr: 'turco', ga: 'irlandés', is: 'islandés', lt: 'lituano',
  lv: 'letón', et: 'estonio', sl: 'esloveno', hr: 'croata', bg: 'búlgaro', sr: 'serbio',
  ja: 'japonés', zh: 'chino', ko: 'coreano', ar: 'árabe', he: 'hebreo', eu: 'euskera', gl: 'gallego',
};

function nombreIdioma_(codigo) {
  const c = String(codigo || '').toLowerCase();
  return NOMBRES_IDIOMA[c.slice(0, 2)] || 'el mismo idioma de la reseña (' + c + ')';
}

/**
 * Prueba los modelos en orden, saltando los que no tienen cupo. Con
 * "esquema" (informe semanal) solo usa los Gemini, que devuelven JSON.
 */
function llamarIA_(sistema, usuario, desde, esquema) {
  const modelos = CONFIG.MODELOS.slice(Math.min(desde, CONFIG.MODELOS.length - 1))
    .filter(m => !esquema || m.indexOf('gemini') === 0);
  for (const modelo of modelos) {
    if (modeloEnPausa_(modelo)) continue;
    try {
      let salida;
      try {
        salida = llamarModelo_(modelo, sistema, usuario, esquema);
      } catch (e) {
        // "Mucha demanda" (503) suele durar segundos: un reintento antes de pasar al modelo ligero.
        if (e.tipo !== 'temporal') throw e;
        Utilities.sleep(4000);
        salida = llamarModelo_(modelo, sistema, usuario, esquema);
      }
      salida.modelo = modelo;
      return salida;
    } catch (e) {
      const motivo = e.tipo === 'cuota' ? modelo + ' sin cupo ' + (e.diaria ? 'para hoy' : 'por unos minutos')
        : String(e.message || e).slice(0, 200);
      PropertiesService.getScriptProperties().setProperties({
        ULTIMO_ERROR_IA: Utilities.formatDate(new Date(), ZONA, 'dd/MM HH:mm') + ' · ' + motivo,
        ULTIMO_ERROR_IA_MS: String(Date.now()),
      });
      if (e.tipo === 'cuota') { pausarModelo_(modelo, e.diaria ? 3 * HORA : 2 * MIN); continue; }
      if (e.tipo === 'temporal') { pausarModelo_(modelo, 2 * MIN); continue; }
      if (e.tipo === 'vacio') continue; // respuesta vacía o mal formada: probar el siguiente
      if (e.tipo === 'roto') {
        pausarModelo_(modelo, DIA);
        avisarError_('modelo_' + modelo, 'El modelo "' + modelo + '" no está disponible (' + e.message +
          '). Se usan los demás; si persiste, cambiadlo en CONFIG.MODELOS.');
        continue;
      }
      throw e;
    }
  }
  const err = new Error('Ningún modelo de IA tiene cupo ahora; se reintentará más tarde.');
  err.limite = true;
  throw err;
}

function llamarModelo_(modelo, sistema, usuario, esquema) {
  // Gemini: instrucciones de sistema y salida JSON con aviso y traducción.
  // Gemma: todo en un único mensaje y salida de texto plano.
  const json = modelo.indexOf('gemini') === 0;
  const cuerpo = {
    contents: [{ role: 'user', parts: [{ text: json ? usuario : sistema + '\n\n---\n\n' + usuario +
      '\n\nDevuelve solo el texto de la respuesta.' }] }],
    // Sin temperatura: Gemini 3 recomienda la de serie (con menos puede entrar en bucle). Margen
    // amplio de tokens porque el "razonamiento" del modelo también cuenta.
    generationConfig: { maxOutputTokens: 8192 },
  };
  if (json) {
    cuerpo.systemInstruction = { parts: [{ text: sistema }] };
    cuerpo.generationConfig.responseMimeType = 'application/json';
    cuerpo.generationConfig.responseSchema = esquema || ESQUEMA_RESPUESTA;
  }
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' +
    modelo + ':generateContent', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': prop_('GEMINI_API_KEY') },
    muteHttpExceptions: true,
    payload: JSON.stringify(cuerpo),
  });
  const codigo = res.getResponseCode();
  const bruto = res.getContentText();
  const fallo = (tipo, diaria) => {
    const e = new Error(modelo + ' respondió ' + codigo + ': ' + bruto.slice(0, 200));
    e.tipo = tipo;
    e.diaria = diaria;
    return e;
  };
  if (codigo === 429) throw fallo('cuota', /PerDay/i.test(bruto));
  if (codigo === 401 || codigo === 403 || /API_KEY_INVALID|API key not valid/i.test(bruto)) throw fallo('clave');
  if (codigo === 404 || (codigo === 400 && /not found|not supported|not enabled|unknown name|invalid json payload/i.test(bruto))) {
    throw fallo('roto');
  }
  if (codigo >= 500) throw fallo('temporal');
  if (codigo !== 200) throw fallo('otro');

  const datos = JSON.parse(bruto);
  const partes = (((datos.candidates || [])[0] || {}).content || {}).parts || [];
  const texto = partes.filter(x => !x.thought).map(x => x.text || '').join('').trim();
  if (!texto) throw fallo('vacio');
  if (!json) return { respuesta: limpiarRespuesta_(texto), aviso: '', traduccion: '', respuesta_es: '' };
  let obj;
  try {
    obj = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch (e) {
    throw fallo('vacio');
  }
  if (esquema) return obj;
  if (!obj.respuesta) throw fallo('vacio');
  return {
    respuesta: limpiarRespuesta_(obj.respuesta),
    aviso: String(obj.aviso || '').trim(),
    traduccion: String(obj.traduccion || '').trim(),
    respuesta_es: String(obj.respuesta_es || '').trim(),
  };
}

function modeloEnPausa_(modelo) {
  return Number(PropertiesService.getScriptProperties().getProperty('PAUSA_' + modelo) || 0) > Date.now();
}

function pausarModelo_(modelo, ms) {
  PropertiesService.getScriptProperties().setProperty('PAUSA_' + modelo, String(Date.now() + ms));
}

function limpiarRespuesta_(t) {
  return String(t).trim().replace(/^["“«]+|["”»]+$/g, '').trim();
}


// =================================================================== ejemplos

function leerEjemplos_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA.EJEMPLOS);
  if (!hoja || hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_EJEMPLOS.length).getValues()
    .filter(f => String(f[CE.USAR - 1]).toLowerCase().startsWith('s') && f[CE.RESPUESTA - 1])
    .map(f => ({
      restaurante: String(f[CE.RESTAURANTE - 1]),
      idioma: String(f[CE.IDIOMA - 1]),
      estrellas: f[CE.ESTRELLAS - 1],
      resena: String(f[CE.RESENA - 1]),
      respuesta: String(f[CE.RESPUESTA - 1]),
      corregida: f[CE.ORIGEN - 1] === ORIGEN.CORREGIDA,
    }));
}

/** Prioriza ejemplos del mismo local, corregidos por el equipo y del mismo idioma. */
function elegirEjemplos_(ejemplos, restaurante, idioma) {
  const puntuar = e => (e.restaurante === restaurante ? 4 : 0) + (e.corregida ? 2 : 0) +
    (idioma && e.idioma === idioma ? 1 : 0) + Math.random();
  const propios = ejemplos.filter(e => e.restaurante === restaurante);
  const candidatos = propios.length >= 2 ? propios
    : ejemplos.filter(e => e.restaurante === restaurante || !idioma || e.idioma === idioma);
  return candidatos.map(e => ({ e: e, p: puntuar(e) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, CONFIG.EJEMPLOS_EN_PROMPT)
    .map(x => x.e);
}

function agregarEjemplos_(lista, origen) {
  const hoja = hoja_(HOJA.EJEMPLOS, true);
  const ultima = hoja.getLastRow();
  const existentes = ultima < 2 ? [] : hoja.getRange(2, 1, ultima - 1, CABECERA_EJEMPLOS.length).getValues();
  const ids = {};
  const historicos = {};
  existentes.forEach(f => {
    ids[f[CE.ID - 1]] = true;
    if (f[CE.ORIGEN - 1] === ORIGEN.HISTORICO) {
      historicos[f[CE.RESTAURANTE - 1]] = (historicos[f[CE.RESTAURANTE - 1]] || 0) + 1;
    }
  });
  const nuevas = [];
  lista.forEach(r => {
    if (!r.id || ids[r.id]) return;
    if (idiomaDistinto_(r.idioma, r.respuestaPropietario)) return; // mal ejemplo: otro idioma
    if (origen === ORIGEN.HISTORICO) {
      if ((historicos[r.restaurante] || 0) >= MAX_HISTORICOS_POR_LOCAL) return;
      historicos[r.restaurante] = (historicos[r.restaurante] || 0) + 1;
    }
    ids[r.id] = true;
    nuevas.push(['Sí', r.restaurante, r.idioma || '', r.estrellas, recortar_(r.texto, 600),
      recortar_(r.respuestaPropietario, 1000), origen, r.id]);
  });
  if (nuevas.length) hoja.getRange(ultima + 1, 1, nuevas.length, CABECERA_EJEMPLOS.length).setValues(nuevas);
}


/** Pone "No" a los ejemplos cuya respuesta está en otro idioma que la reseña. */
function desactivarEjemplosMalos_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA.EJEMPLOS);
  if (!hoja || hoja.getLastRow() < 2) return 0;
  const rango = hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_EJEMPLOS.length);
  const filas = rango.getValues();
  let cambiados = 0;
  filas.forEach((f, i) => {
    if (String(f[CE.USAR - 1]).toLowerCase().startsWith('s') &&
        idiomaDistinto_(f[CE.IDIOMA - 1], f[CE.RESPUESTA - 1])) {
      hoja.getRange(i + 2, CE.USAR).setValue('No');
      cambiados++;
    }
  });
  return cambiados;
}

const PALABRAS_IDIOMA = {
  es: ['el', 'la', 'los', 'las', 'que', 'gracias', 'muchas', 'nos', 'por', 'una', 'muy', 'esperamos', 'pronto', 'os', 'vuestra', 'tu', 'tus', 'del', 'visita'],
  en: ['the', 'and', 'thank', 'thanks', 'you', 'your', 'we', 'for', 'with', 'our', 'hope', 'soon', 'very', 'was', 'see', 'again'],
  de: ['und', 'der', 'die', 'das', 'vielen', 'dank', 'wir', 'uns', 'ihr', 'ihnen', 'sehr', 'bald', 'wieder', 'freuen', 'für', 'sie'],
  fr: ['merci', 'nous', 'vous', 'votre', 'les', 'des', 'très', 'pour', 'avec', 'bientôt', 'ravis', 'est', 'une'],
  it: ['grazie', 'siamo', 'molto', 'il', 'vostro', 'presto', 'della', 'che', 'ci', 'tornare', 'felici'],
  pt: ['obrigado', 'obrigada', 'muito', 'você', 'nós', 'em', 'breve', 'ficamos', 'seu', 'sua', 'até'],
  nl: ['bedankt', 'dank', 'wij', 'jullie', 'zeer', 'voor', 'met', 'graag', 'snel', 'weer', 'het', 'een'],
  ca: ['moltes', 'gràcies', 'gracies', 'molt', 'amb', 'tornar', 'aviat', 'vostra', 'és', 'els', 'una'],
};

/** Idioma más probable de un texto (solo los de PALABRAS_IDIOMA), o '' si no está claro. */
function idiomaProbable_(texto) {
  const palabras = String(texto || '').toLowerCase().split(/[^\p{L}]+/u);
  const cuenta = {};
  Object.keys(PALABRAS_IDIOMA).forEach(l => {
    const set = PALABRAS_IDIOMA[l];
    cuenta[l] = palabras.filter(w => set.indexOf(w) >= 0).length;
  });
  const orden = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
  const [a, b] = [cuenta[orden[0]], cuenta[orden[1]]];
  return a >= 3 && a >= 1.5 * b ? orden[0] : '';
}

/**
 * true si la respuesta está claramente en otro idioma que la reseña. Para
 * idiomas que no sabemos reconocer (polaco, sueco…) solo detecta las
 * respuestas en español.
 */
function idiomaDistinto_(idiomaResena, respuesta) {
  const l = String(idiomaResena || '').toLowerCase().slice(0, 2);
  if (!l) return false;
  const r = idiomaProbable_(respuesta);
  if (!r) return false;
  return PALABRAS_IDIOMA[l] ? r !== l : r === 'es';
}


// ================================================================== cola móvil

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Cola')
    .setTitle('Respuestas · Unicum')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Datos de la cola: reseñas abiertas, de la más reciente a la más antigua. */
function colaDatos() {
  const hoja = hoja_(HOJA.RESPUESTAS);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return JSON.stringify({ resenas: [], hoja: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
  const filas = hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues();
  const enlaces = hoja.getRange(2, COL.ENLACE, ultima - 1, 1).getRichTextValues();
  const resenas = filas
    .map((f, i) => ({ f: f, url: (enlaces[i][0] && enlaces[i][0].getLinkUrl()) || '' }))
    .filter(x => ESTADOS_ABIERTOS.indexOf(x.f[COL.ESTADO - 1]) >= 0)
    .slice(0, 300)
    .concat(filas
      .map((f, i) => ({ f: f, url: (enlaces[i][0] && enlaces[i][0].getLinkUrl()) || '' }))
      .filter(x => x.f[COL.ESTADO - 1] === ESTADO.PUBLICADA &&
        fecha_(x.f[COL.FECHA - 1]).getTime() > Date.now() - 60 * DIA)
      .slice(0, 150))
    .map(({ f, url }) => ({
      id: f[COL.ID - 1],
      fecha: f[COL.FECHA - 1] instanceof Date ? f[COL.FECHA - 1].toISOString() : String(f[COL.FECHA - 1]),
      plataforma: f[COL.PLATAFORMA - 1],
      restaurante: f[COL.RESTAURANTE - 1],
      cliente: f[COL.CLIENTE - 1],
      estrellas: Number(f[COL.ESTRELLAS - 1]),
      idioma: f[COL.IDIOMA - 1],
      resena: f[COL.RESENA - 1],
      traduccion: f[COL.TRADUCCION - 1],
      respuesta: f[COL.RESPUESTA - 1],
      url: url,
      estado: f[COL.ESTADO - 1],
      aviso: f[COL.AVISO - 1],
      respuestaEs: f[COL.RESP_ES - 1],
      publicada: f[COL.PUBLICADA - 1],
    }));
  // Como texto JSON: si alguna celda es una fecha u otro tipo raro, google.script.run devolvería null.
  return JSON.stringify({ resenas: resenas, hoja: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
}

/** Acciones desde la cola: publicada, descartar, regenerar, reabrir. */
function colaAccion(id, accion, datos) {
  datos = datos || {};
  if (accion === 'regenerar') {
    const s = regenerarPorId_(id, datos.instruccion || '');
    return { respuesta: s.respuesta, aviso: s.aviso, traduccion: s.traduccion,
      respuestaEs: enEspanol_(s.respuesta) ? '' : s.respuesta_es || '' };
  }
  return conBloqueo_(() => {
    const hoja = hoja_(HOJA.RESPUESTAS);
    const n = filaPorId_(hoja, id);
    if (!n) throw new Error('Esa reseña ya no está en la hoja.');
    const valores = hoja.getRange(n, 1, 1, CABECERA.length).getValues()[0];
    if (accion === 'publicada') {
      hoja.getRange(n, COL.ESTADO).setValue(ESTADO.PUBLICADA);
      const texto = String(datos.texto || '').trim();
      if (texto) {
        hoja.getRange(n, COL.PUBLICADA).setValue(texto);
        aprenderDeFila_(valores, texto);
      }
    } else if (accion === 'descartar') {
      hoja.getRange(n, COL.ESTADO).setValue(ESTADO.DESCARTADA);
    } else if (accion === 'reabrir') {
      const negativa = Number(valores[COL.ESTRELLAS - 1]) < CONFIG.MIN_ESTRELLAS_BORRADOR;
      hoja.getRange(n, COL.ESTADO).setValue(negativa ? ESTADO.MANO : ESTADO.PENDIENTE);
    } else {
      throw new Error('Acción desconocida: ' + accion);
    }
    return { ok: true };
  });
}


// ===================================================================== correos

function avisarNegativas_(lista) {
  const filas = lista.map(r =>
    '<li><b>' + esc_(r.restaurante) + '</b> · ' + r.plataforma + ' · ' + r.estrellas + '★ · ' +
    esc_(r.cliente) + '<br><i>' + esc_(recortar_(r.texto || '(sin texto)', 300)) + '</i>' +
    (r.url ? '<br><a href="' + esc_(r.url) + '">Responder ↗</a>' : '') + '</li>').join('');
  enviarCorreo_('⚠ ' + lista.length + (lista.length === 1 ? ' reseña negativa nueva' : ' reseñas negativas nuevas'),
    (CONFIG.BORRADOR_NEGATIVAS
      ? '<p>En unos minutos tendréis un borrador en la cola, pestaña "Negativas". Leedlo con calma antes ' +
        'de publicar y, si sabéis qué pasó, pulsad "Otro borrador" y contádselo.</p><ul>'
      : '<p>Para responder a mano:</p><ul>') + filas + '</ul>' + pieCorreo_());
}

function enviarResumenSiToca_() {
  if (!CONFIG.RESUMEN_DIARIO_HORA) return;
  const props = PropertiesService.getScriptProperties();
  const ahora = new Date();
  const hoy = Utilities.formatDate(ahora, ZONA, 'yyyy-MM-dd');
  if (Number(Utilities.formatDate(ahora, ZONA, 'H')) < CONFIG.RESUMEN_DIARIO_HORA) return;
  if (props.getProperty('RESUMEN_ENVIADO') === hoy) return;
  props.setProperty('RESUMEN_ENVIADO', hoy);

  const hoja = hoja_(HOJA.RESPUESTAS);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return;
  const cuenta = {};
  let total = 0;
  hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues().forEach(f => {
    const estado = f[COL.ESTADO - 1];
    if (ESTADOS_ABIERTOS.indexOf(estado) < 0) return;
    const r = f[COL.RESTAURANTE - 1];
    cuenta[r] = cuenta[r] || { listas: 0, revisar: 0, mano: 0 };
    if (estado === ESTADO.MANO) cuenta[r].mano++;
    else if (estado === ESTADO.REVISAR) cuenta[r].revisar++;
    else cuenta[r].listas++;
    total++;
  });
  if (!total) return;
  const filas = Object.keys(cuenta).sort().map(r => '<tr><td>' + esc_(r) + '</td><td>' + cuenta[r].listas +
    '</td><td>' + cuenta[r].revisar + '</td><td>' + cuenta[r].mano + '</td></tr>').join('');
  const fallo = Date.now() - Number(props.getProperty('ULTIMO_ERROR_IA_MS') || 0) < DIA
    ? '<p style="color:#888">Último fallo de la IA (se resolvió con otro modelo o al reintentar): ' +
      esc_(props.getProperty('ULTIMO_ERROR_IA')) + '</p>' : '';
  enviarCorreo_(total + ' reseñas esperando respuesta',
    '<table cellpadding="6" style="border-collapse:collapse"><tr><th align="left">Local</th>' +
    '<th>Listas</th><th>Revisar ⚠</th><th>Negativas</th></tr>' + filas + '</table>' + fallo + pieCorreo_());
}

// ------------------------------------------------------------ informe semanal

const ESQUEMA_INFORME = {
  type: 'OBJECT',
  properties: {
    resumen: {
      type: 'STRING',
      description: 'Dos o tres frases para la dirección con lo más importante de la semana en todo el grupo.',
    },
    locales: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          restaurante: { type: 'STRING', description: 'Nombre del local tal como aparece en los datos.' },
          elogios: {
            type: 'ARRAY', items: { type: 'STRING' },
            description: 'Hasta 3 cosas concretas que más se elogian (platos, personas, aspectos).',
          },
          quejas: {
            type: 'ARRAY', items: { type: 'STRING' },
            description: 'Hasta 3 problemas mencionados; si se repiten, con el número de reseñas entre paréntesis. Vacío si no hay.',
          },
          accion: {
            type: 'STRING',
            description: 'Una recomendación práctica y concreta para el local, o vacío si no hay nada que mejorar.',
          },
        },
        required: ['restaurante', 'elogios', 'quejas', 'accion'],
      },
    },
  },
  required: ['resumen', 'locales'],
};

const PROMPT_INFORME = 'Analizas las reseñas de la última semana de los restaurantes de Unicum Group ' +
  '(Mallorca) para su dirección. Por cada local con reseñas con texto, extrae lo que más se elogia, ' +
  'las quejas y una acción concreta. Básate solo en lo que dicen las reseñas: no inventes, y no ' +
  'conviertas un comentario aislado en tendencia salvo que sea grave (higiene, alergias, cobros, trato). ' +
  'Nombra platos y personas cuando lo hagan los clientes. Escribe en español, en frases cortas.';

function enviarInformeSiToca_() {
  if (!CONFIG.INFORME_SEMANAL_DIA) return;
  const ahora = new Date();
  const hoy = Utilities.formatDate(ahora, ZONA, 'yyyy-MM-dd');
  const diaSemana = (new Date(hoy + 'T12:00:00Z').getUTCDay() + 6) % 7 + 1; // 1 = lunes … 7 = domingo
  if (diaSemana !== CONFIG.INFORME_SEMANAL_DIA) return;
  if (Number(Utilities.formatDate(ahora, ZONA, 'H')) < CONFIG.INFORME_SEMANAL_HORA) return;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('INFORME_ENVIADO') === hoy) return;
  props.setProperty('INFORME_ENVIADO', hoy);
  enviarInforme_();
}

function enviarInformeAhora() {
  const enviado = enviarInforme_();
  SpreadsheetApp.getUi().alert(enviado ? 'Informe enviado a tu correo ✔'
    : 'No hay reseñas de los últimos 7 días en la hoja: no se ha enviado nada.');
}

/**
 * Informe de los últimos 7 días: reseñas y nota media por local, lo que se
 * repite en los comentarios y una acción sugerida. Devuelve false si no hay
 * reseñas que contar.
 */
function enviarInforme_() {
  const hoja = hoja_(HOJA.RESPUESTAS);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return false;
  const ahora = Date.now();
  const corte = ahora - 7 * DIA;
  const filas = hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues();
  const momento = f => fecha_(f[COL.FECHA - 1]).getTime();
  const semana = filas.filter(f => momento(f) >= corte);
  if (!semana.length) return false;
  // La semana anterior solo es comparable cuando el sistema ya llevaba leyéndola entera.
  const instalado = Number(PropertiesService.getScriptProperties().getProperty('INSTALADO') || ahora);
  const anterior = ahora - instalado >= 14 * DIA
    ? cifrasPorLocal_(filas.filter(f => momento(f) >= corte - 7 * DIA && momento(f) < corte)) : null;
  const cifras = cifrasPorLocal_(semana);
  const locales = Object.keys(cifras).filter(r => r !== '').sort((a, b) => cifras[b].n - cifras[a].n);
  const total = cifras[''];

  let analisis = null;
  let sinAnalisis = false;
  try {
    analisis = analizarSemana_(semana);
  } catch (e) {
    sinAnalisis = true;
    console.warn('Informe sin análisis: ' + e);
  }

  const nota = c => (c.suma / c.n).toFixed(1).replace('.', ',') + '★';
  const versus = (actual, previo) => {
    if (!previo) return '';
    const d = actual.suma / actual.n - previo.suma / previo.n;
    return ' <span style="color:' + (d >= 0.05 ? '#1a7f37">▲ desde ' + nota(previo)
      : d <= -0.05 ? '#c62828">▼ desde ' + nota(previo) : '#888">=') + '</span>';
  };
  const h = [];
  const rango = Utilities.formatDate(new Date(corte), ZONA, 'dd/MM') + ' – ' +
    Utilities.formatDate(new Date(ahora), ZONA, 'dd/MM');
  h.push('<p><b>' + total.n + ' reseñas</b> (' + rango + ') · nota media <b>' + nota(total) + '</b>' +
    versus(total, anterior && anterior['']) + ' · ' + total.negativas +
    (total.negativas === 1 ? ' negativa · ' : ' negativas · ') +
    total.abiertas + ' sin responder</p>');
  if (analisis && analisis.resumen) h.push('<p>' + esc_(analisis.resumen) + '</p>');
  h.push('<table cellpadding="6" style="border-collapse:collapse"><tr><th align="left">Local</th>' +
    '<th>Reseñas</th><th>Nota</th><th>Negativas</th><th>Sin responder</th></tr>' +
    locales.map(r => '<tr><td>' + esc_(r) + '</td><td align="center">' + cifras[r].n +
      '</td><td align="center">' + nota(cifras[r]) + versus(cifras[r], anterior && anterior[r]) +
      '</td><td align="center">' + cifras[r].negativas + '</td><td align="center">' +
      cifras[r].abiertas + '</td></tr>').join('') + '</table>');

  if (analisis) {
    const orden = r => { const i = locales.findIndex(l => normalizar_(l) === normalizar_(r)); return i < 0 ? 99 : i; };
    analisis.locales.slice().sort((a, b) => orden(a.restaurante) - orden(b.restaurante)).forEach(l => {
      const elogios = (l.elogios || []).filter(Boolean);
      const quejas = (l.quejas || []).filter(Boolean);
      if (!elogios.length && !quejas.length && !l.accion) return;
      h.push('<h3 style="margin:18px 0 4px">' + esc_(l.restaurante) + '</h3>' +
        (elogios.length ? '<div>👍 ' + esc_(elogios.join(' · ')) + '</div>' : '') +
        (quejas.length ? '<div>👎 ' + esc_(quejas.join(' · ')) + '</div>' : '') +
        (l.accion ? '<div>👉 <b>' + esc_(l.accion) + '</b></div>' : ''));
    });
  } else if (sinAnalisis) {
    h.push('<p style="color:#888">Esta vez la IA no tenía cupo para analizar los comentarios: van solo las cifras.</p>');
  }
  h.push(pieCorreo_());
  enviarCorreo_('Informe semanal: ' + total.n + ' reseñas, ' + nota(total), h.join(''));
  return true;
}

/** Cifras por local; la clave '' guarda el total. */
function cifrasPorLocal_(filas) {
  const cifras = {};
  filas.forEach(f => {
    const estrellas = Number(f[COL.ESTRELLAS - 1]) || 0;
    [String(f[COL.RESTAURANTE - 1] || 'Desconocido'), ''].forEach(r => {
      const c = cifras[r] = cifras[r] || { n: 0, suma: 0, negativas: 0, abiertas: 0 };
      c.n++;
      c.suma += estrellas;
      if (estrellas < CONFIG.MIN_ESTRELLAS_BORRADOR) c.negativas++;
      if (ESTADOS_ABIERTOS.indexOf(f[COL.ESTADO - 1]) >= 0) c.abiertas++;
    });
  });
  return cifras;
}

/** Una sola llamada a la IA con los comentarios de la semana. null si no hay texto. */
function analizarSemana_(filas) {
  const porLocal = {};
  filas.forEach(f => {
    const texto = String(f[COL.TRADUCCION - 1] || f[COL.RESENA - 1] || '').replace(/\s+/g, ' ').trim();
    if (!texto) return;
    const r = String(f[COL.RESTAURANTE - 1] || 'Desconocido');
    (porLocal[r] = porLocal[r] || []).push('- ' + f[COL.ESTRELLAS - 1] + '★ ' + recortar_(texto, 400));
  });
  const locales = Object.keys(porLocal).sort();
  if (!locales.length) return null;
  const usuario = locales.map(r => '## ' + r + '\n' + porLocal[r].slice(0, 40).join('\n')).join('\n\n');
  const obj = llamarIA_(PROMPT_INFORME, usuario, 0, ESQUEMA_INFORME);
  if (!obj || !Array.isArray(obj.locales)) throw new Error('análisis sin el formato esperado');
  return obj;
}

/** Avisos de errores, como mucho uno cada 12 h por tipo. */
function avisarError_(clave, mensaje) {
  console.warn(mensaje);
  const props = PropertiesService.getScriptProperties();
  if (Date.now() - Number(props.getProperty('AVISO_' + clave) || 0) < 12 * HORA) return;
  props.setProperty('AVISO_' + clave, String(Date.now()));
  try {
    enviarCorreo_('Aviso del sistema de reseñas', '<p>' + esc_(mensaje) + '</p>' + pieCorreo_());
  } catch (e) {
    console.warn('No se pudo enviar el aviso: ' + e);
  }
}

function enviarCorreo_(asunto, html) {
  const destino = CONFIG.EMAIL_AVISOS || Session.getEffectiveUser().getEmail();
  if (!destino) return;
  MailApp.sendEmail({ to: destino, subject: 'Reseñas Unicum · ' + asunto, htmlBody: html, name: 'Reseñas Unicum' });
}

function pieCorreo_() {
  const cola = ScriptApp.getService().getUrl();
  return '<p>' + (cola ? '<a href="' + cola + '"><b>Abrir la cola de respuestas</b></a> · ' : '') +
    '<a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja</a></p>';
}


// ======================================================================= Apify

function apify_(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo.toLowerCase(),
    headers: { Authorization: 'Bearer ' + prop_('APIFY_TOKEN') },
    muteHttpExceptions: true,
  };
  if (cuerpo) {
    opciones.contentType = 'application/json';
    opciones.payload = JSON.stringify(cuerpo);
  }
  const res = UrlFetchApp.fetch('https://api.apify.com/v2/' + ruta, opciones);
  const codigo = res.getResponseCode();
  if (codigo === 404) return null;
  if (codigo >= 300) {
    throw new Error('Apify respondió ' + codigo + ': ' + res.getContentText().slice(0, 300));
  }
  return JSON.parse(res.getContentText());
}

/** Gasto del mes en Apify (USD), con una hora de caché. null si no se sabe. */
function gastoApify_(fresco) {
  const cache = CacheService.getScriptCache();
  const guardado = fresco ? null : cache.get('GASTO_APIFY');
  if (guardado !== null) return Number(guardado);
  try {
    const r = apify_('GET', 'users/me/limits');
    const usd = Number(r && r.data && r.data.current && r.data.current.monthlyUsageUsd);
    if (isNaN(usd)) return null;
    cache.put('GASTO_APIFY', String(usd), 3600);
    return usd;
  } catch (e) {
    return null;
  }
}


// ======================================================================= hojas

function prepararHojaRespuestas_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const vieja = libro.getSheetByName(HOJA.RESPUESTAS);
  if (vieja && vieja.getLastRow() >= 1 && vieja.getRange(1, 2).getValue() !== 'Plataforma') {
    // Hoja de la versión 1: se conserva aparte.
    vieja.setName(HOJA.RESPUESTAS + ' (v1) ' + Utilities.formatDate(new Date(), ZONA, 'dd-MM HH:mm'));
  }
  const hoja = hoja_(HOJA.RESPUESTAS, true);
  hoja.getRange(1, 1, 1, CABECERA.length).setValues([CABECERA])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  [110, 90, 150, 140, 40, 55, 320, 260, 170, 380, 70, 130, 220, 280, 120, 60, 320]
    .forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  hoja.hideColumns(COL.MODELO, 2);

  const filas = hoja.getMaxRows() - 1;
  hoja.getRange(2, COL.FECHA, filas, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  hoja.getRange(2, COL.RESENA, filas, 4).setWrap(true);
  hoja.getRange(2, COL.AVISO, filas, 2).setWrap(true);
  hoja.getRange(2, COL.RESP_ES, filas, 1).setWrap(true);
  hoja.getRange(2, 1, filas, CABECERA.length).setVerticalAlignment('top');
  hoja.getRange(2, COL.ESTADO, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(Object.keys(ESTADO).map(k => ESTADO[k]), true).build());

  const rango = hoja.getRange(2, 1, filas, CABECERA.length);
  const regla = (estado, color) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$L2="' + estado + '"').setBackground(color)
    .setRanges([rango]).build();
  hoja.setConditionalFormatRules([
    regla(ESTADO.MANO, '#f8d7da'),
    regla(ESTADO.REVISAR, '#ffe5b4'),
    regla(ESTADO.ERROR, '#fff3cd'),
    regla(ESTADO.PUBLICADA, '#d4edda'),
    regla(ESTADO.DESCARTADA, '#e9ecef'),
  ]);
}

function prepararHojaRestaurantes_() {
  const hoja = hoja_(HOJA.RESTAURANTES, true);
  if (hoja.getLastRow() >= 1 && hoja.getRange(1, CR.TRIPADVISOR).getValue() === 'Keywords SEO') {
    // Hoja de la versión 1: se añade la columna de TripAdvisor sin perder nada.
    hoja.insertColumnBefore(CR.TRIPADVISOR);
    hoja.getRange(1, CR.TRIPADVISOR).setValue(CABECERA_RESTAURANTES[CR.TRIPADVISOR - 1]);
  }
  hoja.getRange(1, 1, 1, CABECERA_RESTAURANTES.length).setValues([CABECERA_RESTAURANTES])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  [60, 180, 130, 300, 300, 420, 360].forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
  if (hoja.getLastRow() >= 2) return; // no pisar lo que ya hayáis editado
  hoja.getRange(2, 1, RESTAURANTES_INICIALES.length, CABECERA_RESTAURANTES.length)
    .setValues(RESTAURANTES_INICIALES).setWrap(true).setVerticalAlignment('top');
}

/** Devuelve true si la pestaña de ejemplos es nueva. */
function prepararHojaEjemplos_() {
  const nueva = !SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA.EJEMPLOS);
  const hoja = hoja_(HOJA.EJEMPLOS, true);
  hoja.getRange(1, 1, 1, CABECERA_EJEMPLOS.length).setValues([CABECERA_EJEMPLOS])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  [50, 150, 60, 40, 380, 440, 170, 60].forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  hoja.hideColumns(CE.ID);
  hoja.getRange(2, CE.RESENA, hoja.getMaxRows() - 1, 2).setWrap(true);
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
  return nueva;
}

function prepararHojaPrompt_() {
  const hoja = hoja_(HOJA.PROMPT, true);
  hoja.getRange(1, 1).setValue('Instrucciones para la IA (podéis editarlas; si borráis la celda A2 se usan las originales)')
    .setFontWeight('bold');
  hoja.setColumnWidth(1, 900);
  if (!hoja.getRange(2, 1).getValue()) hoja.getRange(2, 1).setValue(PROMPT_POR_DEFECTO);
  hoja.getRange(2, 1).setWrap(true).setVerticalAlignment('top');
}

function leerPrompt_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA.PROMPT);
  const texto = hoja ? String(hoja.getRange(2, 1).getValue() || '').trim() : '';
  return texto || PROMPT_POR_DEFECTO;
}

function leerRestaurantes_() {
  const hoja = hoja_(HOJA.RESTAURANTES);
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_RESTAURANTES.length).getValues()
    .filter(f => f[CR.NOMBRE - 1])
    .map(f => {
      const google = String(f[CR.GOOGLE - 1]).trim();
      const tripadvisor = String(f[CR.TRIPADVISOR - 1]).trim();
      return {
        activo: String(f[CR.ACTIVO - 1]).trim().toLowerCase().startsWith('s'),
        nombre: String(f[CR.NOMBRE - 1]).trim(),
        ciudad: String(f[CR.CIUDAD - 1]).trim(),
        google: google,
        tripadvisor: tripadvisor,
        keywords: String(f[CR.KEYWORDS - 1]).trim(),
        notas: String(f[CR.NOTAS - 1]).trim(),
        cid: (google.match(/cid=(\d+)/) || [])[1] || '',
        idTripadvisor: (tripadvisor.match(/-d(\d+)-/) || [])[1] || '',
      };
    });
}

/** Asocia una reseña a su restaurante: por identificador si se puede, si no por nombre. */
function asociarRestaurante_(restaurantes, r) {
  const idTa = (String(r.url).match(/-d(\d+)-/) || [])[1];
  const porId = restaurantes.find(x =>
    (r.cid && x.cid === r.cid) || (idTa && r.plataforma === 'TripAdvisor' && x.idTripadvisor === idTa));
  return porId || buscarRestaurantePorNombre_(restaurantes, r.nombreFicha);
}

function buscarRestaurantePorNombre_(restaurantes, nombre) {
  const n = normalizar_(nombre);
  if (!n) return null;
  // El nombre configurado más largo primero ("Madre Santa Pizza" antes que "Madre").
  return restaurantes.slice()
    .sort((a, b) => b.nombre.length - a.nombre.length)
    .find(r => n.indexOf(normalizar_(r.nombre)) >= 0) || null;
}

/** Añade filas al final (ya formateadas) y ordena: lo más reciente arriba. */
function anadirFilas_(hoja, filas) {
  const inicio = hoja.getLastRow() + 1;
  const faltan = inicio + filas.length - 1 - hoja.getMaxRows();
  if (faltan > 0) hoja.insertRowsAfter(hoja.getMaxRows(), faltan);
  hoja.getRange(inicio, 1, filas.length, CABECERA.length).setValues(filas);
  hoja.getRange(inicio, COL.ENLACE, filas.length, 1).setRichTextValues(filas.map(f => [
    f[COL.ENLACE - 1]
      ? SpreadsheetApp.newRichTextValue().setText('Responder ↗').setLinkUrl(f[COL.ENLACE - 1]).build()
      : SpreadsheetApp.newRichTextValue().setText('').build()]));
  hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA.length)
    .sort({ column: COL.FECHA, ascending: false });
}

function indexarFilas_(hoja) {
  const indice = {};
  const ultima = hoja.getLastRow();
  if (ultima < 2) return indice;
  hoja.getRange(2, COL.ID, ultima - 1, 1).getValues()
    .forEach((f, i) => { if (f[0]) indice[String(f[0])] = i + 2; });
  return indice;
}

function filaPorId_(hoja, id) {
  return indexarFilas_(hoja)[String(id)] || 0;
}

function hoja_(nombre, crear) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja && crear) hoja = libro.insertSheet(nombre);
  if (!hoja) throw new Error('Falta la pestaña "' + nombre + '": usa Reseñas → Instalar.');
  return hoja;
}

/** Serializa los cambios de estructura (ordenar, escribir por ID). */
function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function prop_(clave, obligatoria) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  if (!valor && obligatoria !== false) {
    throw new Error('Falta la propiedad ' + clave + ' en la configuración del proyecto.');
  }
  return valor;
}


// ===================================================================== utilidades

function fecha_(valor) {
  const f = new Date(valor || Date.now());
  return isNaN(f.getTime()) ? new Date() : f;
}

function normalizar_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function recortar_(s, n) {
  s = String(s || '').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function apertura_(texto) {
  const t = String(texto).trim().split(/(?<=[.!?¡¿])\s/)[0];
  return recortar_(t, 80);
}

/** Parecido entre dos textos (0-1) por palabras compartidas. */
function similitud_(a, b) {
  const palabras = s => new Set(normalizar_(s).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2));
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.size || !pb.size) return 0;
  let comunes = 0;
  pa.forEach(w => { if (pb.has(w)) comunes++; });
  return comunes / Math.max(pa.size, pb.size);
}

function esc_(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
