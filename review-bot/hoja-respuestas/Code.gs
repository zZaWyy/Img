/**
 * Unicum Group — Hoja de borradores de respuesta a reseñas de Google.
 *
 * Qué hace (solo, cada hora, en los servidores de Google):
 *   1. Lee las reseñas más recientes de cada restaurante en Google Maps
 *      (con el lector público de Apify; no toca la cuenta del negocio).
 *   2. Apunta en la pestaña "Respuestas" las reseñas nuevas sin contestar.
 *   3. Redacta con Gemini un borrador para las de 4-5★, con el prompt de la
 *      casa. Las de 1-3★ quedan marcadas "A mano (negativa)", sin borrador.
 *   4. Cuando detecta que una reseña ya tiene respuesta publicada en
 *      Google, la marca como "Publicada ✔".
 *
 * Publicar sigue siendo manual: copiar la respuesta, pulsar "Abrir ↗" y
 * pegarla en Google. Ver GUIA.md para la instalación.
 *
 * Claves necesarias (Configuración del proyecto → Propiedades de la
 * secuencia de comandos): APIFY_TOKEN y GEMINI_API_KEY.
 */

const CONFIG = {
  APIFY_ACTOR: 'compass~google-maps-reviews-scraper',
  // Alias que siempre apunta al modelo Flash vigente (capa gratuita).
  GEMINI_MODEL: 'gemini-flash-latest',
  // Cada cuántas horas se leen las reseñas en Google Maps. Con 12 h,
  // 20 reseñas y 11 restaurantes el coste de Apify (~3 $/mes) cabe en
  // los 5 $/mes gratuitos. Bajarlo aumenta el coste.
  HORAS_ENTRE_LECTURAS: 12,
  RESENAS_POR_RESTAURANTE: 20,
  // Reseñas más antiguas que esto no se apuntan. Con 7 días la primera
  // lectura cabe en los límites gratuitos; subidlo después si queréis
  // recuperar reseñas antiguas sin contestar.
  DIAS_MAXIMOS: 7,
  // Por debajo de estas estrellas no se redacta borrador.
  MIN_ESTRELLAS_BORRADOR: 4,
  MAX_BORRADORES_POR_EJECUCION: 25,
  // Pausa entre llamadas a Gemini para respetar el límite gratuito.
  PAUSA_ENTRE_LLAMADAS_MS: 7000,
  // Apps Script corta a los 6 minutos; paramos antes por seguridad.
  TIEMPO_MAXIMO_MS: 5 * 60 * 1000,
};

const HOJA_RESPUESTAS = 'Respuestas';
const HOJA_RESTAURANTES = 'Restaurantes';

const CABECERA = ['Fecha', 'Restaurante', 'Cliente', '★', 'Idioma',
  'Reseña (original)', 'Traducción', 'Instrucción (->)',
  'Respuesta propuesta', 'Responder', 'Estado', 'ID'];
const COL = {
  FECHA: 1, RESTAURANTE: 2, CLIENTE: 3, ESTRELLAS: 4, IDIOMA: 5, RESENA: 6,
  TRADUCCION: 7, INSTRUCCION: 8, RESPUESTA: 9, ENLACE: 10, ESTADO: 11, ID: 12,
};
const ESTADO = {
  PENDIENTE: 'Pendiente',
  PUBLICADA: 'Publicada ✔',
  MANO: 'A mano (negativa)',
  DESCARTADA: 'Descartada',
  ERROR: 'Error IA (regenerar)',
};

const CABECERA_RESTAURANTES = ['Activo', 'Nombre en Google (coincide con)',
  'Ciudad', 'Enlace Google Maps', 'Keywords SEO', 'Notas'];

// Enlaces construidos con el identificador de ficha (cid) que aparece en
// los correos de aviso de Google. Comprobad que cada uno abre el
// restaurante correcto; si no, pegad el enlace copiado de Google Maps.
const RESTAURANTES_INICIALES = [
  ['Sí', 'Mercader del Mar', 'Santa Ponsa', 'https://maps.google.com/?cid=14530670311499082814',
    'restaurante mediterráneo, paellas, mariscos frescos, pescados, terraza con vistas al mar, vinos y cava, menú para niños, ambiente familiar, celebraciones y eventos, abierto todo el año', ''],
  ['Sí', 'Alma Beach', 'Santa Ponsa', 'https://maps.google.com/?cid=12253750210614447929',
    'steakhouse, beach bar, cócteles, terraza al aire libre, paellas, pizzas artesanales, cocina mediterránea, abierto todo el año', ''],
  ['Sí', 'Amira Great Kebab', 'Santa Ponsa', 'https://maps.google.com/?cid=5849406189229568440',
    'kebab gourmet, dürum, pizza, wok oriental, poké bowl, helados y copas heladas, take away, reparto a domicilio en Calvià, abierto 24 horas, abierto todo el año',
    'Abierto 24 horas. Agradecer también los pedidos take away / a domicilio.'],
  ['Sí', 'Balcón de María', 'Santa Ponsa', 'https://maps.google.com/?cid=4685547750116726756',
    'pinchos y tapas, terraza con vistas al mar, menú infantil, parque infantil, ambiente familiar, cocina mediterránea, cena romántica, abierto todo el año', ''],
  ['Sí', 'Madre Santa Pizza', 'Santa Ponsa', 'https://maps.google.com/?cid=8957138940596620405',
    'restaurante italiano, pizza napolitana, pasta fresca, tiramisú casero, cócteles, terraza con vistas al mar, ambiente familiar, cocina tradicional italiana, abierto todo el año', ''],
  ['Sí', 'Mestiza', 'Santa Ponsa', 'https://maps.google.com/?cid=11933573054473555408',
    'steak house, prime steak, great burger, pizza fina, cócteles, terraza al aire libre, sports bar', ''],
  ['Sí', 'Virtus Smash Burger', 'Santa Ponsa', 'https://maps.google.com/?cid=8982377804222892924',
    'smash burgers, sports bar, desayunos y bocadillos, cócteles y cerveza, terraza al aire libre, comida rápida de calidad, abierto 24 horas, abierto todo el año',
    'Abierto 24 horas.'],
  ['Sí', 'Pecado 24H', 'Santa Ponsa', 'https://maps.google.com/?cid=18063739213391216462',
    'delivery 24 horas, take away',
    'Es delivery/take away: agradecer también los pedidos a domicilio.'],
  ['Sí', 'Playas del Rey', 'Santa Ponsa', 'https://maps.google.com/?cid=2155032086752323594',
    'hotel en Santa Ponsa, buena ubicación, cerca de la playa, hotel céntrico, desayuno incluido, piscina',
    'Es un HOTEL, no un restaurante: responder como el equipo del hotel. Su bar es N76 (Sports Pool Bar: smash burger, thin pizza, baguettes y sandwiches, cócteles y cerveza, ambiente relajado junto a la piscina); si la reseña habla de la comida o del bar, se puede mencionar N76 con naturalidad.'],
  ['Sí', 'Madre Café Bar', 'Palma de Mallorca', 'https://maps.google.com/?cid=975611850967119471',
    'tapas, pinchos, arroces y paellas, menú diario, desayunos, Plaza Patines, parque infantil, ambiente familiar, abierto todo el año', ''],
  ['Sí', 'Madre Pizza', 'Palma de Mallorca', 'https://maps.google.com/?cid=4547889845256865308',
    'restaurante italiano, pizza napolitana, pasta casera, tiramisú, cocina italiana tradicional, Plaza Patines, abierto todo el año', ''],
];

const SYSTEM_PROMPT = `Eres la persona del equipo de Unicum Group (Mallorca) que responde las reseñas de Google y TripAdvisor de sus restaurantes en Santa Ponsa y Palma.

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

Si tras el texto de la reseña aparece una línea que empieza por "->", es una directiva interna del equipo y debe cumplirse de forma prioritaria.

Devuelve ÚNICAMENTE el texto de la respuesta, sin comillas, sin explicaciones y sin firma (la plataforma ya muestra el nombre del restaurante).`;


// ---------------------------------------------------------------- menú

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Reseñas')
    .addItem('▶ Buscar reseñas nuevas ahora', 'ciclo')
    .addItem('↻ Regenerar respuesta de la fila seleccionada', 'regenerarFilaSeleccionada')
    .addSeparator()
    .addItem('⚙ Instalar / reparar', 'instalar')
    .addToUi();
}

function instalar() {
  const ui = SpreadsheetApp.getUi();
  const faltan = ['APIFY_TOKEN', 'GEMINI_API_KEY'].filter(k => !prop_(k, false));
  if (faltan.length) {
    ui.alert('Faltan claves: ' + faltan.join(', ') + '.\n\n' +
      'Añádelas en Extensiones → Apps Script → ⚙ Configuración del proyecto → ' +
      'Propiedades de la secuencia de comandos, y vuelve a pulsar "Instalar".');
    return;
  }
  prepararHojaRespuestas_();
  prepararHojaRestaurantes_();

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'ciclo')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ciclo').timeBased().everyHours(1).create();

  ui.alert('Listo. La hoja se actualizará sola cada hora.\n\n' +
    'Ahora pulsa Reseñas → "Buscar reseñas nuevas ahora". La primera lectura ' +
    'de Google Maps tarda unos minutos: vuelve a pulsarlo pasados 5-10 minutos ' +
    'para ver los borradores (o espera a la siguiente hora).');
}


// ---------------------------------------------------------------- ciclo

function ciclo() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // ya hay una ejecución en marcha
  const inicio = Date.now();
  try {
    incorporarUltimaLectura_();
    lanzarLecturaSiToca_();
    generarPendientes_(inicio);
  } finally {
    lock.releaseLock();
  }
}

/** Pasa a la hoja las reseñas de la última lectura de Apify terminada. */
function incorporarUltimaLectura_() {
  const ultima = apify_('GET', 'acts/' + CONFIG.APIFY_ACTOR + '/runs/last?status=SUCCEEDED');
  if (!ultima || !ultima.data) return;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ULTIMA_LECTURA_INCORPORADA') === ultima.data.id) return;

  const items = apify_('GET', 'datasets/' + ultima.data.defaultDatasetId + '/items?clean=true&format=json') || [];
  const hoja = hoja_(HOJA_RESPUESTAS);
  const restaurantes = leerRestaurantes_();
  const filasPorId = indexarFilas_(hoja);
  const limite = Date.now() - CONFIG.DIAS_MAXIMOS * 24 * 3600 * 1000;
  const nuevas = [];

  items.forEach(it => {
    const id = String(it.reviewId || it.reviewUrl || '');
    if (!id) return;
    const respondida = Boolean(it.responseFromOwnerText || it.ownerResponseText);
    const existente = filasPorId[id];

    if (existente) {
      if (existente < 0) return; // repetida dentro de esta misma lectura
      const estado = hoja.getRange(existente, COL.ESTADO).getValue();
      if (respondida && (estado === ESTADO.PENDIENTE || estado === ESTADO.ERROR || estado === ESTADO.MANO)) {
        hoja.getRange(existente, COL.ESTADO).setValue(ESTADO.PUBLICADA);
      }
      return;
    }
    if (respondida) return; // ya contestada antes de entrar en la hoja

    const fecha = new Date(it.publishedAtDate || it.publishedAt || Date.now());
    if (fecha.getTime() < limite) return;

    const estrellas = Number(it.stars || it.rating || 0);
    const idioma = it.originalLanguage || '';
    const nombreFicha = it.title || it.placeName || '';
    const rest = buscarRestaurante_(restaurantes, nombreFicha);
    nuevas.push({
      fecha: fecha,
      valores: [
        fecha,
        rest ? rest.nombre : nombreFicha,
        it.name || it.reviewerName || 'Cliente',
        estrellas,
        idioma,
        it.text || '',
        idioma && idioma !== 'es' ? (it.textTranslated || '') : '',
        '',
        '',
        it.reviewUrl || '',
        estrellas >= CONFIG.MIN_ESTRELLAS_BORRADOR ? ESTADO.PENDIENTE : ESTADO.MANO,
        id,
      ],
    });
    filasPorId[id] = -1; // evita duplicados dentro de la misma lectura
  });

  if (nuevas.length) {
    // Se añaden al final (filas ya formateadas) y luego se ordena todo
    // por fecha, con lo más reciente arriba.
    const inicio = hoja.getLastRow() + 1;
    const faltan = inicio + nuevas.length - 1 - hoja.getMaxRows();
    if (faltan > 0) hoja.insertRowsAfter(hoja.getMaxRows(), faltan);
    const filas = nuevas.map(n => n.valores);
    hoja.getRange(inicio, 1, filas.length, CABECERA.length).setValues(filas);
    escribirEnlaces_(hoja, inicio, filas.map(f => f[COL.ENLACE - 1]));
    hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA.length)
      .sort({ column: COL.FECHA, ascending: false });
  }
  props.setProperty('ULTIMA_LECTURA_INCORPORADA', ultima.data.id);
}

/** Lanza una nueva lectura en Apify si ha pasado el tiempo configurado. */
function lanzarLecturaSiToca_() {
  const props = PropertiesService.getScriptProperties();
  const ultimoInicio = Number(props.getProperty('ULTIMO_INICIO_LECTURA') || 0);
  if (Date.now() - ultimoInicio < CONFIG.HORAS_ENTRE_LECTURAS * 3600 * 1000) return;

  const enCurso = apify_('GET', 'acts/' + CONFIG.APIFY_ACTOR + '/runs/last');
  if (enCurso && enCurso.data && ['READY', 'RUNNING'].indexOf(enCurso.data.status) >= 0) return;

  const urls = leerRestaurantes_().filter(r => r.activo && r.url).map(r => ({ url: r.url }));
  if (!urls.length) return;
  const maxItems = urls.length * CONFIG.RESENAS_POR_RESTAURANTE; // tope de coste
  apify_('POST', 'acts/' + CONFIG.APIFY_ACTOR + '/runs?maxItems=' + maxItems, {
    startUrls: urls,
    maxReviews: CONFIG.RESENAS_POR_RESTAURANTE,
    reviewsSort: 'newest',
    language: 'es',
    personalData: true,
  });
  props.setProperty('ULTIMO_INICIO_LECTURA', String(Date.now()));
}

/** Redacta los borradores que falten (filas "Pendiente" sin respuesta). */
function generarPendientes_(inicio) {
  const hoja = hoja_(HOJA_RESPUESTAS);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return;
  const datos = hoja.getRange(2, 1, ultima - 1, CABECERA.length).getValues();
  const restaurantes = leerRestaurantes_();
  let hechos = 0;

  for (let i = 0; i < datos.length; i++) {
    if (hechos >= CONFIG.MAX_BORRADORES_POR_EJECUCION) break;
    if (Date.now() - inicio > CONFIG.TIEMPO_MAXIMO_MS) break;
    const fila = datos[i];
    if (fila[COL.ESTADO - 1] !== ESTADO.PENDIENTE || fila[COL.RESPUESTA - 1]) continue;

    try {
      const texto = redactar_(fila, restaurantes);
      hoja.getRange(i + 2, COL.RESPUESTA).setValue(texto);
    } catch (e) {
      if (e.limite) break; // límite de Gemini: seguimos en la próxima hora
      hoja.getRange(i + 2, COL.ESTADO).setValue(ESTADO.ERROR);
      hoja.getRange(i + 2, COL.RESPUESTA).setNote(String(e.message || e));
    }
    hechos++;
    Utilities.sleep(CONFIG.PAUSA_ENTRE_LLAMADAS_MS);
  }
}

/** Menú: vuelve a redactar la fila seleccionada (usa "Instrucción (->)"). */
function regenerarFilaSeleccionada() {
  const ui = SpreadsheetApp.getUi();
  const hoja = SpreadsheetApp.getActiveSheet();
  const fila = hoja.getActiveRange() ? hoja.getActiveRange().getRow() : 0;
  if (hoja.getName() !== HOJA_RESPUESTAS || fila < 2) {
    ui.alert('Selecciona una fila de la pestaña "' + HOJA_RESPUESTAS + '".');
    return;
  }
  const valores = hoja.getRange(fila, 1, 1, CABECERA.length).getValues()[0];
  try {
    const texto = redactar_(valores, leerRestaurantes_());
    hoja.getRange(fila, COL.RESPUESTA).setValue(texto).clearNote();
    if (valores[COL.ESTADO - 1] === ESTADO.ERROR) {
      hoja.getRange(fila, COL.ESTADO).setValue(ESTADO.PENDIENTE);
    }
  } catch (e) {
    ui.alert('No se pudo redactar: ' + (e.message || e));
  }
}


// ---------------------------------------------------------------- IA

function redactar_(fila, restaurantes) {
  const nombre = fila[COL.RESTAURANTE - 1];
  const rest = buscarRestaurante_(restaurantes, nombre) ||
    { nombre: nombre, ciudad: '', keywords: '', notas: '' };
  const partes = [rest.ciudad ? 'Restaurante: ' + rest.nombre + ' (' + rest.ciudad + ')'
    : 'Restaurante: ' + rest.nombre];
  if (rest.keywords) {
    partes.push('Keywords disponibles (usar 1-2 como máximo y solo si encajan): ' + rest.keywords);
  }
  if (rest.notas) partes.push('Notas del equipo: ' + rest.notas);
  partes.push('Cliente: ' + fila[COL.CLIENTE - 1]);
  partes.push('Puntuación: ' + fila[COL.ESTRELLAS - 1] + ' estrellas');
  const texto = String(fila[COL.RESENA - 1] || '').trim();
  partes.push(texto ? 'Reseña:\n' + texto : 'Reseña: (sin texto, solo puntuación)');
  const instruccion = String(fila[COL.INSTRUCCION - 1] || '').trim();
  if (instruccion) partes.push('-> ' + instruccion.replace(/^->\s*/, ''));
  return llamarGemini_(partes.join('\n'));
}

function llamarGemini_(promptUsuario) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    CONFIG.GEMINI_MODEL + ':generateContent';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': prop_('GEMINI_API_KEY') },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: promptUsuario }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
    }),
  });
  const codigo = res.getResponseCode();
  if (codigo === 429) {
    const e = new Error('Límite gratuito de Gemini alcanzado; se reintenta en la próxima hora.');
    e.limite = true;
    throw e;
  }
  if (codigo !== 200) {
    throw new Error('Gemini respondió ' + codigo + ': ' + res.getContentText().slice(0, 300));
  }
  const datos = JSON.parse(res.getContentText());
  const partes = (((datos.candidates || [])[0] || {}).content || {}).parts || [];
  const texto = partes.map(p => p.text || '').join('').trim();
  if (!texto) throw new Error('Gemini no devolvió texto (posible bloqueo de contenido).');
  return texto;
}


// ---------------------------------------------------------------- Apify

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
  if (codigo === 404) return null; // todavía no hay ninguna lectura
  if (codigo >= 300) {
    throw new Error('Apify respondió ' + codigo + ': ' + res.getContentText().slice(0, 300));
  }
  return JSON.parse(res.getContentText());
}


// ---------------------------------------------------------------- hojas

function prepararHojaRespuestas_() {
  const hoja = hoja_(HOJA_RESPUESTAS, true);
  hoja.getRange(1, 1, 1, CABECERA.length).setValues([CABECERA])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  const anchos = [110, 150, 140, 40, 60, 320, 260, 180, 380, 80, 140, 60];
  anchos.forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  hoja.hideColumns(COL.ID);

  const filas = hoja.getMaxRows() - 1;
  hoja.getRange(2, COL.FECHA, filas, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  hoja.getRange(2, COL.RESENA, filas, 4).setWrap(true);
  hoja.getRange(2, 1, filas, CABECERA.length).setVerticalAlignment('top');
  hoja.getRange(2, COL.ESTADO, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(Object.keys(ESTADO).map(k => ESTADO[k]), true).build());

  const rango = hoja.getRange(2, 1, filas, CABECERA.length);
  const regla = (estado, color) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$K2="' + estado + '"').setBackground(color)
    .setRanges([rango]).build();
  hoja.setConditionalFormatRules([
    regla(ESTADO.MANO, '#f8d7da'),
    regla(ESTADO.ERROR, '#fff3cd'),
    regla(ESTADO.PUBLICADA, '#d4edda'),
    regla(ESTADO.DESCARTADA, '#e9ecef'),
  ]);
}

function prepararHojaRestaurantes_() {
  const hoja = hoja_(HOJA_RESTAURANTES, true);
  if (hoja.getLastRow() >= 2) return; // no pisar lo que ya hayáis editado
  hoja.getRange(1, 1, 1, CABECERA_RESTAURANTES.length).setValues([CABECERA_RESTAURANTES])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  hoja.getRange(2, 1, RESTAURANTES_INICIALES.length, CABECERA_RESTAURANTES.length)
    .setValues(RESTAURANTES_INICIALES).setWrap(true).setVerticalAlignment('top');
  [60, 180, 130, 300, 420, 360].forEach((a, i) => hoja.setColumnWidth(i + 1, a));
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
}

function leerRestaurantes_() {
  const hoja = hoja_(HOJA_RESTAURANTES);
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_RESTAURANTES.length).getValues()
    .filter(f => f[1])
    .map(f => ({
      activo: String(f[0]).trim().toLowerCase().startsWith('s'),
      nombre: String(f[1]).trim(),
      ciudad: String(f[2]).trim(),
      url: String(f[3]).trim(),
      keywords: String(f[4]).trim(),
      notas: String(f[5]).trim(),
    }));
}

function buscarRestaurante_(restaurantes, nombreFicha) {
  const nombre = String(nombreFicha || '').toLowerCase();
  // El nombre configurado más largo primero ("Madre Santa Pizza" antes que "Madre").
  return restaurantes.slice()
    .sort((a, b) => b.nombre.length - a.nombre.length)
    .find(r => nombre.indexOf(r.nombre.toLowerCase()) >= 0) || null;
}

function indexarFilas_(hoja) {
  const indice = {};
  const ultima = hoja.getLastRow();
  if (ultima < 2) return indice;
  hoja.getRange(2, COL.ID, ultima - 1, 1).getValues()
    .forEach((f, i) => { if (f[0]) indice[String(f[0])] = i + 2; });
  return indice;
}

function escribirEnlaces_(hoja, filaInicio, urls) {
  const valores = urls.map(u => [u
    ? SpreadsheetApp.newRichTextValue().setText('Abrir ↗').setLinkUrl(u).build()
    : SpreadsheetApp.newRichTextValue().setText('').build()]);
  hoja.getRange(filaInicio, COL.ENLACE, valores.length, 1).setRichTextValues(valores);
}

function hoja_(nombre, crear) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja && crear) hoja = libro.insertSheet(nombre);
  if (!hoja) throw new Error('Falta la pestaña "' + nombre + '": usa Reseñas → Instalar.');
  return hoja;
}

function prop_(clave, obligatoria) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  if (!valor && obligatoria !== false) {
    throw new Error('Falta la propiedad ' + clave + ' en la configuración del proyecto.');
  }
  return valor;
}
