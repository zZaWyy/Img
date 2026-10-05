# Sistema de respuestas a reseñas (versión 2): guía

Una hoja de Google que se rellena sola con las reseñas nuevas de **Google y
TripAdvisor** de todos los locales y **la respuesta ya redactada** con el
estilo de la casa. Publicas desde el móvil con dos toques.

## Qué hace

- **Lee las reseñas nuevas** de Google Maps cada hora y las de TripAdvisor
  cada 12 h. Un repaso diario recoge las que Google publica con retraso.
- **Redacta un borrador** para las de 4-5★, en el idioma del cliente, y
  **traduce** al español las reseñas en otros idiomas.
- **Aprende de vosotros:** lee vuestras respuestas antiguas y, cada vez que
  corregís un borrador antes de publicarlo, guarda la versión final como
  ejemplo. Cuanto más lo uséis, más suena a vosotros.
- **No se repite:** evita empezar como las últimas respuestas del mismo
  local.
- **Detecta problemas escondidos:** si una reseña de 5★ dice *"todo genial
  pero el café llegó frío"*, la marca **Revisar ⚠** con el motivo.
- **Negativas (1-3★):** sin borrador y con **aviso por correo al momento**.
  Si quieres, le cuentas qué pasó y te propone un borrador para revisar.
- **Cola en el móvil:** una página donde, con **"Copiar y abrir"**, copias
  la respuesta y abres la reseña para pegarla.
- **Resumen diario** por correo a las 10:00 con lo pendiente por local.
- Sabe cuándo ya está publicada y la marca **Publicada ✔** sola.

Coste: **0 €** dentro de los planes gratuitos (ver "Costes").

---

## Instalación (unos 20 minutos)

Necesitas la cuenta `simsalabimgrupo@gmail.com`, tu clave de Gemini y una
cuenta gratuita de Apify (paso 4).

### Paso 1: Crear la hoja

[drive.google.com](https://drive.google.com) con `simsalabimgrupo@gmail.com`
→ **Nuevo → Hojas de cálculo de Google** → nombre: `Respuestas reseñas
Unicum`.

### Paso 2: Pegar el programa

1. En la hoja: **Extensiones → Apps Script**.
2. Borra todo el texto del archivo `Código.gs` y pega el contenido completo
   de **`Code.gs`**.
3. Arriba, cambia "Proyecto sin título" por `Reseñas Unicum`.

### Paso 3: Añadir la cola del móvil

1. En el mismo editor, junto a "Archivos", pulsa **＋ → HTML**.
2. Nombre: **`Cola`**, exactamente así (el editor añade `.html` solo).
3. Borra lo que trae y pega el contenido completo de **`Cola.html`**.
4. Guarda 💾.

### Paso 4: Clave de Apify (gratis)

[apify.com](https://apify.com) → **Sign up** con Google (plan Free, sin
tarjeta) → **Settings → API & Integrations** → copia el **Personal API
token**.

### Paso 5: Guardar las dos claves

En el editor: rueda **⚙ Configuración del proyecto** → **Propiedades de la
secuencia de comandos → Añadir propiedad**:

| Propiedad | Valor |
|---|---|
| `APIFY_TOKEN` | el token de Apify |
| `GEMINI_API_KEY` | tu clave de Gemini |

→ **Guardar propiedades de la secuencia de comandos**.

### Paso 6: Instalar

1. Vuelve a la **hoja** y recárgala (F5). Aparece el menú **Reseñas**.
2. **Reseñas → ⚙ Instalar / reparar**.
3. Acepta los permisos. Es vuestro propio programa: pide leer la hoja,
   conectarse a Apify y Gemini y enviaros correos.
   - Si sale *"Google no ha verificado esta aplicación"* → **Configuración
     avanzada → Ir a Reseñas Unicum (no seguro) → Permitir**.
4. Si no apareció "Listo", pulsa otra vez **Instalar / reparar**.

### Paso 7: Revisar los restaurantes y añadir TripAdvisor

Pestaña **Restaurantes**:

1. **Haz clic en cada enlace de Google Maps** y comprueba que abre el local
   correcto. Si alguno falla, busca el local en Google Maps y pega la
   dirección del navegador.
2. **Columna "Enlace TripAdvisor":** busca cada local en TripAdvisor y pega
   la dirección de su página (la que contiene `Restaurant_Review-g…-d…`).
   Los que dejes vacíos no se leen en TripAdvisor.
3. Aquí se cambian también **keywords y notas**, o se desactiva un local
   (Activo = No), sin tocar el programa.

### Paso 8: Primera lectura

**Reseñas → ▶ Buscar reseñas nuevas ahora.** La primera vez lee además
vuestras respuestas antiguas para aprender el estilo. Vuelve a pulsarlo
pasados **5-10 minutos**: aparecerán las reseñas de los últimos 7 días y la
pestaña **Ejemplos** se llenará con vuestras respuestas reales.

### Paso 9: Publicar la cola en el móvil

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Rueda ⚙ junto a "Seleccionar tipo" → **Aplicación web**.
3. **Ejecutar como:** Yo. **Quién tiene acceso:** Solo yo.
4. **Implementar** → copia la **URL de la aplicación web**.
5. Ábrela en el móvil (con la cuenta `simsalabimgrupo` iniciada) y
   **añádela a la pantalla de inicio** (Compartir → Añadir a pantalla de
   inicio).

El enlace también aparece en **Reseñas → 📱 Abrir la cola de respuestas**
y en los correos.

> **Si la cola dice "no se puede abrir el archivo":** suele pasar con varias
> cuentas de Google iniciadas en el mismo navegador. Ábrela en una ventana
> de incógnito con solo `simsalabimgrupo` iniciada.
>
> **Para que la use más gente del equipo:** en el paso 3, elige "Cualquier
> persona con cuenta de Google". Quien tenga el enlace podrá usarla, así que
> no lo compartáis fuera del equipo.

---

## Uso diario

**Desde el móvil (lo recomendado):** abre la cola →

- **Por publicar:** revisa el borrador (puedes editarlo) → **📋 Copiar y
  abrir** → en Google o TripAdvisor, **Responder** → pega → **Publicar** →
  vuelve y pulsa **✓ Publicada**.
- **↻ Otra versión:** te pide una indicación opcional (*"más corta"*,
  *"menciona la terraza"*).
- **Revisar ⚠:** positivas que mencionan algo a mirar. El aviso explica
  qué.
- **Negativas:** **✍ Redactar borrador** → cuéntale qué pasó → revisa y
  publica tú.

**Desde la hoja:** misma información en columnas. Para regenerar, escribe
en *Instrucción (->)*, selecciona la fila y pulsa **Reseñas → ↻ Regenerar**.

Colores: rojo = negativa · naranja = revisar · amarillo = error de IA · verde
= publicada · gris = descartada.

## Cómo aprende

- **Pestaña Ejemplos:** respuestas reales vuestras que la IA usa como
  referencia de estilo. Las que no os gusten, ponedlas en **No**.
  - *Respuesta anterior:* respondidas antes del sistema o fuera de él.
  - *Corregida por el equipo:* cambiasteis el borrador antes de publicar.
    Son las que más pesan.
- **Pestaña Prompt:** las normas de estilo que sigue la IA. Podéis editarlas
  directamente. Si borráis la celda, vuelve a las originales.
- **Reseñas → 🎓 Aprender de respuestas antiguas** vuelve a leer vuestras
  respuestas pasadas cuando queráis.

## Asistentes para lo que no es automático

En la carpeta `asistentes/`:

- **Gem de Gemini** (`GEM-GEMINI.md`): un asistente en la app de Gemini
  conectado a esta hoja (keywords y ejemplos en vivo), para TripAdvisor a
  mano, negativas o respuestas sueltas. Aquí sí aprovechas tu Gemini Plus.
- **Skill de Claude** (`skill-claude/respuestas-resenas-unicum.zip`): lo
  mismo dentro de Claude. Se sube en claude.ai → **Ajustes → Funciones →
  Skills → Subir skill**. A partir de ahí, basta con pegar reseñas en
  cualquier chat.

---

## Costes y cupos

| Servicio | Coste |
|---|---|
| Hoja, programa y correos (Google) | Gratis |
| Lectura de reseñas (Apify) | 5 $/mes gratis. Se paga por reseña leída y cada lectura pide solo lo nuevo; con vuestro volumen, unos 2-3 $/mes. Si el gasto se acerca a 4,5 $, el sistema reduce las lecturas y os avisa |
| Redacción (Gemini API, capa gratuita) | Gratis |

**Cupos gratuitos de Gemini:** el mejor modelo (Flash) solo da unas 20
redacciones gratis al día. Por eso el sistema encadena modelos:

1. **Gemini Flash** para las reseñas con texto, que es donde más se nota la
   calidad;
2. **Gemini Flash-Lite** (unas 500 al día) para las cortas o sin texto, y
   cuando Flash se agota;
3. **Gemma** como reserva.

Si se agotan todos, lo pendiente se redacta en la siguiente vuelta.

**Opción de pago, recomendable si os importa la calidad:** activando la
facturación de la clave de Gemini en
[aistudio.google.com](https://aistudio.google.com) → *Billing*, todas las
respuestas pueden ir con Flash, sin límites diarios, por unos **2-4 € al
mes** con vuestro volumen. La suscripción Gemini Plus no incluye uso de esta
API: son productos distintos.

**Primera semana:** mira el gasto en Apify (**Reseñas → 💶 Ver gasto de
Apify**) para confirmar las cifras.

## Ajustes

Al principio de `Code.gs`, bloque `CONFIG`. Tras cambiar algo, guarda 💾:

- `HORAS_ENTRE_LECTURAS` (1) y `HORAS_ENTRE_LECTURAS_TRIPADVISOR` (12).
- `DIAS_MAXIMOS` (7): antigüedad máxima de las reseñas que se apuntan.
  Súbelo a 30 para recuperar reseñas antiguas sin contestar.
- `MODELOS`: orden de modelos de IA. Con facturación activada, podéis dejar
  solo `'gemini-flash-latest'`.
- `EMAIL_AVISOS`: a quién llegan los correos. Vacío = la cuenta dueña de la
  hoja; varios, separados por comas.
- `AVISAR_NEGATIVAS` (true) y `RESUMEN_DIARIO_HORA` (10; 0 lo desactiva).

## Si ya instalaste la versión 1

1. En Apps Script, sustituye el contenido de `Código.gs` por el nuevo
   `Code.gs`.
2. Añade el archivo HTML `Cola` (paso 3).
3. Pulsa **Reseñas → ⚙ Instalar / reparar**. Tu hoja antigua se guarda
   como "Respuestas (v1)", se crea la nueva y a *Restaurantes* se le añade
   la columna de TripAdvisor sin perder vuestros cambios.
4. Sigue con los pasos 7 a 9.

## Limitaciones

- **Publicar sigue siendo manual.** Sin la aprobación de Google (o con
  TripAdvisor, que no lo permite nunca) no hay forma segura de publicar
  automáticamente.
- Lee la **información pública** de Google Maps y TripAdvisor. No entra en
  vuestras cuentas, así que no corren ningún riesgo. Si alguna de esas webs
  cambia, Apify suele actualizar su lector en pocos días. Mientras tanto,
  os llega un aviso por correo.
- Una reseña de Google tarda **alrededor de una hora** en aparecer, y las de
  TripAdvisor hasta 12 h.
- **"Error IA (regenerar)":** pulsa *Otra versión*. La nota de la celda
  explica el motivo.
