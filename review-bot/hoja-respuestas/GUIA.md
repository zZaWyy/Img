# Sistema de respuestas a reseñas (versión 3): guía

Una hoja de Google que se rellena sola con las reseñas nuevas de **Google y
TripAdvisor** de todos los locales y **la respuesta ya redactada** con el
estilo de la casa. Publicas desde el móvil con dos toques.

## Qué hace

- **Lee las reseñas nuevas** de Google Maps cada hora y las de TripAdvisor
  cada 12 h. Un repaso diario recoge las que Google publica con retraso y,
  una vez por semana, repasa el último mes: las que alguien respondió
  directamente en Google salen solas de la cola.
- **Redacta un borrador** para las de 4-5★, en el idioma del cliente, y
  **traduce** al español las reseñas en otros idiomas. Comprueba el idioma
  de cada borrador: si sale en otro, lo repite, y si aun así falla, lo
  marca **Revisar ⚠**.
- **Aprende de vosotros:** lee vuestras respuestas antiguas y, cada vez que
  corregís un borrador antes de publicarlo, guarda la versión final como
  ejemplo. Cuanto más lo uséis, más suena a vosotros.
- **No se repite:** evita empezar como las últimas respuestas del mismo
  local.
- **Detecta problemas escondidos:** si una reseña de 5★ dice *"todo genial
  pero el café llegó frío"*, la marca **Revisar ⚠** con el motivo.
- **Negativas (1-3★):** **aviso por correo al momento** y un borrador
  breve y neutro: se disculpa, agradece que nos lo cuente y espera
  recibirle de nuevo, sin repetir sus quejas ni invitar a contactar.
  Siempre se revisan antes de publicar; si le cuentas qué pasó, te propone
  otro mejor.
- **Respuesta en español:** si el borrador está en otro idioma, debajo (y
  en la columna *Respuesta en español* de la hoja) tienes qué dice.
- **Enlace directo para responder:** en Google abre la reseña en el panel
  del negocio, con el botón *Responder* (hay que tener iniciada la cuenta
  que gestiona las fichas).
- **Publicadas:** pestaña *Publicadas ✔* en la cola (últimos 60 días) y
  pestaña *Publicadas* en la hoja, que se rellena sola. Si una se marcó por
  error, **↩ Devolver a pendientes**.
- **Cola en el móvil:** una página donde, con **"Copiar y abrir"**, copias
  la respuesta y abres la reseña para pegarla.
- **Resumen diario** por correo a las 10:00 con lo pendiente por local.
- **Informe semanal** cada lunes a las 9:00: nota media de cada local
  (comparada con la semana anterior), lo que más se elogia, las quejas que
  se repiten y una acción concreta por local.
- **Aviso si se atasca:** si hay reseñas esperando y la IA lleva 6 horas
  sin redactar ninguna, os llega un correo con el motivo.
- **Recupera las atrasadas:** con un clic busca las reseñas del último mes
  que siguen sin responder.
- Sabe cuándo ya está publicada y la marca **Publicada ✔** sola.

Coste: **0 €** dentro de los planes gratuitos (ver "Costes").

---

## Instalación (unos 10 minutos)

Lo que ya está hecho: el programa, la configuración de los 11 locales y sus
enlaces de Google Maps y TripAdvisor. Lo que queda son pasos que exigen
**tu cuenta y tu permiso**, y por eso solo los puedes hacer tú.

Necesitas la cuenta `simsalabimgrupo@gmail.com` y tu clave de Gemini.

### Paso 1: Crear la hoja y pegar el programa

1. [drive.google.com](https://drive.google.com) con `simsalabimgrupo@gmail.com`
   → **Nuevo → Hojas de cálculo de Google** → nombre: `Respuestas reseñas
   Unicum`.
2. En la hoja: **Extensiones → Apps Script**.
3. Borra todo el texto de `Código.gs` y pega el contenido completo de
   **`Code.gs`**.
4. Junto a "Archivos", pulsa **＋ → HTML** → nombre **`Cola`** → borra lo
   que trae y pega el contenido completo de **`Cola.html`**.
5. Guarda 💾.

### Paso 2: Crear la cuenta de Apify (gratis)

[apify.com](https://apify.com) → **Sign up** con Google (plan Free, sin
tarjeta) → **Settings → API & Integrations** → copia el **Personal API
token**.

### Paso 3: Instalar

1. Vuelve a la **hoja** y recárgala (F5). Aparece el menú **Reseñas**.
2. **Reseñas → ⚙ Instalar / reparar**.
3. Acepta los permisos. Es vuestro propio programa: pide leer la hoja,
   conectarse a Apify y Gemini y enviaros correos.
   - Si sale *"Google no ha verificado esta aplicación"* → **Configuración
     avanzada → Ir a Reseñas Unicum (no seguro) → Permitir**.
4. Te pedirá **el token de Apify** y **la clave de Gemini**: pégalos. El
   programa comprueba que funcionan antes de guardarlos.
5. Si no apareció "Listo", pulsa otra vez **Instalar / reparar**.

### Paso 4: Comprobar los locales

Pestaña **Restaurantes**: haz clic en un par de enlaces de Google Maps y de
TripAdvisor y comprueba que abren el local correcto. Si alguno falla, pega
la dirección buena. Aquí se cambian también **keywords y notas**, o se
desactiva un local (Activo = No).

**Locales que ya no gestionáis:** pon *Activo* = **No**. Dejan de leerse,
redactarse, publicarse y de salir en la cola y en los informes. (Madre Café
Bar y Madre Pizza ya están desactivados por el traspaso.)

### Paso 5: Primera lectura

**Reseñas → ▶ Buscar reseñas nuevas ahora.** La primera vez lee además
vuestras respuestas antiguas para aprender el estilo. Vuelve a pulsarlo
pasados **5-10 minutos**, un par de veces: la pestaña **Ejemplos** se
llenará con vuestras respuestas reales y aparecerán las reseñas del último
mes que siguen sin responder.

### Paso 6: Publicar la cola en el móvil

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
> **Para que la use más gente del equipo:** ver "Compartir la cola con el
> equipo" más abajo.

### Paso 7 (opcional): Asistentes

Gem de Gemini y Skill de Claude: ver la sección "Asistentes" más abajo.

---

## Uso diario

**Desde el móvil o el PC (lo recomendado):** abre la cola. Se ve todo al
momento, sin pantallas de carga.

- **Responder:** revisa el texto (puedes editarlo) → **📋 Copiar y abrir**
  → en Google o TripAdvisor, pega y publica. Al pulsar el botón, la reseña
  pasa sola a *Publicadas*. Si al final no la publicas, **Deshacer** o, en
  *Publicadas*, **↩ Devolver a pendientes**.
  Las que tienen borde naranja mencionan algo a revisar: el aviso dice qué.
- **↻ Otra versión:** la reescribe al momento. Para cambiar algo concreto,
  edita el texto directamente.
- **En otros idiomas** (también inglés) se edita **en español**: cambia el
  texto de arriba y pulsa **Traducir al idioma del cliente**; abajo verás
  cómo quedará publicada.
- **TripAdvisor:** *Copiar y abrir* copia la respuesta y abre la reseña;
  respóndela desde vuestra cuenta de gestión y vuelve a pulsar **✓ Ya está
  publicada**. TripAdvisor no permite publicar automáticamente.
- **Negativas:** lee el borrador con calma. Si sabes qué pasó, **✍ Otro
  borrador** → cuéntaselo → revisa y publica tú.
- **Publicadas:** lo respondido en los últimos 60 días.
- Arriba: filtro **Todas · Google · TripAdvisor**, filtro por local, **↻**
  para actualizar y un enlace a todas las reseñas en el panel de Google.

**Desde la hoja:** misma información en columnas. Para regenerar, escribe
en *Instrucción (->)*, selecciona la fila y pulsa **Reseñas → ↻ Regenerar**.

**Menú Reseñas, de un vistazo:**

| Opción | Para qué |
|---|---|
| ▶ Buscar reseñas nuevas ahora | No esperar a la siguiente media hora |
| ↻ Regenerar respuesta de la fila seleccionada | Otra versión desde la hoja |
| 📱 Abrir la cola de respuestas | El enlace de la cola |
| 📥 Recuperar reseñas sin responder (último mes) | Rescatar las atrasadas |
| 📊 Enviar el informe semanal ahora | Recibirlo sin esperar al lunes |
| 🎓 Aprender de respuestas antiguas | Volver a leer vuestro estilo |
| 💳 Gemini de pago: activar / desactivar | Ver "Gemini de pago" |
| 💶 Ver gasto de Apify | Cuánto va del mes |
| 🔑 Cambiar claves | Cambiar el token de Apify o la clave de Gemini |
| ⚙ Instalar / reparar | Primera instalación o si algo se rompe |

## Informe semanal

Llega los **lunes a las 9:00** con los últimos 7 días:

- Reseñas, nota media, negativas y pendientes **por local**. A partir de la
  tercera semana, cada nota se compara con la de la semana anterior
  (▲ sube, ▼ baja).
- Por local: 👍 lo que más se elogia, 👎 las quejas (con cuántas reseñas
  las mencionan si se repiten) y 👉 una acción concreta.

Para cambiar el día o la hora, o desactivarlo: `INFORME_SEMANAL_DIA` e
`INFORME_SEMANAL_HORA` en *Ajustes*. Si ese día la IA no tiene cupo, llega
igualmente con las cifras.

Colores: rojo = negativa · naranja = revisar · amarillo = error de IA · verde
= publicada · gris = descartada.

## Cómo aprende

- **Pestaña Ejemplos:** respuestas reales vuestras que la IA usa como
  referencia de estilo. Las que no os gusten, ponedlas en **No**. Las
  respondidas en otro idioma que la reseña se descartan solas.
  - *Respuesta anterior:* respondidas antes del sistema o fuera de él.
  - *Corregida por el equipo:* cambiasteis el borrador antes de publicar.
    Son las que más pesan.
- **Pestaña Prompt:** las normas de estilo que sigue la IA. Podéis editarlas
  directamente. Si borráis la celda, vuelve a las originales.
- **Reseñas → 🎓 Aprender de respuestas antiguas** vuelve a leer vuestras
  respuestas pasadas cuando queráis.

## Publicación automática en Google (opcional, gratis)

Las respuestas de Google pueden publicarse solas, dentro de un horario, a
través de **Make**: una herramienta de automatizaciones que tiene el acceso
oficial de Google para responder reseñas. TripAdvisor no lo permite: esas
siguen con *Copiar y abrir*.

**Qué se publica solo:** reseñas de Google de 4-5★, sin avisos, cuya
respuesta está en el idioma correcto, entre las **10:00 y las 21:00** y al
menos **2 horas** después de la reseña. Salen 3 cada media hora, de la más
antigua a la más reciente. Las negativas y las de borde naranja nunca salen
solas. En la cola, las de Google tienen además el botón **Publicar en
Google** para publicarlas al momento. Horario y condiciones: `PUBLICAR_*`,
`HORAS_DESDE_RESENA` y `MIN_ESTRELLAS_AUTO` en *Ajustes*.

**Montarlo (unos 15 minutos, una sola vez):**

1. [make.com](https://www.make.com) → **Sign up** con `simsalabimgrupo`
   (plan Free: 1.000 operaciones al mes; cada respuesta gasta 2-3).
2. **Create a new scenario** → **＋** → **Webhooks → Custom webhook** →
   **Add** → nombre `Reseñas Unicum` → **Save**. Copia la dirección
   (`https://hook.eu1.make.com/…`).
3. Pulsa **Run once** (abajo). Ahora, en la hoja: **Reseñas → 🤖
   Publicación automática en Google** → pega la dirección. La hoja envía una
   muestra y Make aprende los campos (*Successfully determined*).
4. **＋** después del webhook → **Google Business Profile → Make an API
   Call** → conexión con la cuenta que gestiona las fichas → *API Type*:
   **Legacy Google My Business API** → *Method* `GET` → *URL*:
   `/v4/accounts/NÚMERO_CUENTA/locations/{{1.ubicacion}}/reviews` →
   *Query String*: `pageSize` = `50`. (El número de cuenta de Unicum Group
   es `108401907022019746383`. Para otro, en *Create/Update a Review Reply*
   elige una reseña de la lista y cambia a *Enter manually*: sale la ruta.)
   - Google usa sus propios códigos de reseña, distintos de los que lee la
     hoja; por eso Make pide las últimas 50 del local y elige la buena.
5. **＋** → **Flow Control → Iterator** → *Array*: **body → reviews[]** del
   módulo anterior.
6. **＋** → **Google Business Profile → Create/Update a Review Reply** →
   *Enter manually* → *Review name*: **name** (del Iterator) → *Reply
   comment*: **respuesta** (del webhook).
7. Filtro en la línea entre el Iterator y la respuesta (las tres a la vez):
   `{{length(1.reviewId)}}` *Greater than* `10`; **reviewReplyUrl** (del
   Iterator) *Contains* `/reviews/` + **reviewId** (del webhook); y
   **reviewReply** *Does not exist*. Así responde solo a esa reseña (por su
   código, no por el nombre del cliente) y nunca pisa una respuesta que ya
   exista.
8. **＋** → **Webhooks → Webhook response** → *Status* `200`, *Body*
   `{"ok":true}`.
9. Guarda 💾, activa el escenario (**ON**) con **Immediately as data
   arrives**.
10. Prueba: en la cola, en una reseña de Google, pulsa **Publicar en
    Google** y comprueba en Google que aparece la respuesta.

Si la reseña no está entre las 50 últimas del local (pasa con las de hace
unas semanas en los locales con muchas reseñas), la hoja la busca más atrás
con el escenario de *Reseñas antiguas* (hasta 500 reseñas, unos 4 créditos
por cada 50) y la publica con él; si ya tenía respuesta en Google, la pasa a
Publicadas con esa respuesta. Si aun así no se publica (no la encontró o el
escenario está apagado), la reseña se queda en la cola marcada en naranja
para hacerla a mano y llega un correo. No se reintenta sola, así no gasta
operaciones. Para desactivarlo: **Reseñas → 🤖 Publicación automática en Google**.

## Reseñas antiguas de Google sin responder (opcional)

Un segundo escenario de Make recorre el historial de cada local y la hoja
responde, con una respuesta breve y general, las **positivas que nunca se
respondieron**. Va despacio (`HIST_PAGINAS_POR_DIA` = 6 páginas de 50
reseñas y `HIST_RESPUESTAS_POR_DIA` = 8 respuestas al día como máximo),
siempre después de las nuevas, y no aparecen en la cola.

**No gasta los créditos de las nuevas:** la hoja lleva la cuenta de los
créditos de Make del ciclo y reserva los que necesitarán las nuevas hasta
la renovación (según el ritmo real, con un 20 % de margen). Las antiguas
solo usan lo que sobra: con el plan gratis avanzan sobre todo al final de
cada ciclo; con un plan de pago (cambiad `MAKE_CREDITOS_MES`) van a diario.
`MAKE_DIA_RENOVACION` es el día del mes en que Make renueva los créditos
(el 7; en Make → *Org* se ve la fecha).

**En Make ya está montado** (escenario *Reseñas antiguas*, activado). Solo
hay que pegar su dirección en la hoja: **Reseñas → 📜 Reseñas antiguas de
Google**. La dirección se ve en Make → *Webhooks* → *Reseñas antiguas*
(no la pongáis en sitios públicos: con ella se puede responder en Google).

Si hubiera que rehacerlo, el escenario es:

- **Webhooks → Custom webhook** `Reseñas antiguas` → **Flow Control → Router**.
- **Ruta 1** (filtro *accion* = `listar`): **Google Business Profile →
  Make an API Call** → *Legacy Google My Business API*, `GET`, URL
  `/v4/accounts/108401907022019746383/locations/{{1.ubicacion}}/reviews`,
  *Query String* `pageSize` = `50` y `pageToken` = **pageToken** →
  **JSON → Transform to JSON** (*Object* = **Body**) → **Webhooks → Webhook
  response**, *Status* `200`, *Body* = **JSON string**.
- **Ruta 2** (filtro *accion* = `responder`): **Google Business Profile →
  Create/Update a Review Reply** → *Enter manually*, *Review name* =
  **nombreApi**, *Reply comment* = **respuesta** → **Webhook response**,
  *Status* `200`, *Body* `{"ok":true}`.
- En los dos módulos de Google, **clic derecho → Add error handler →
  Webhook response** (*Status* `422`) **→ Skip**. Así, si Google rechaza
  algo (una reseña borrada), la hoja lo marca para hacerlo a mano y no lo
  reintenta, y Make no apaga el escenario por errores seguidos.
- Activado (**ON**, *Immediately*).

El avance se ve en **Reseñas → 📜 Reseñas antiguas de Google**.

## Créditos de Make

Todo lo que se hace con Make gasta de los mismos créditos (1.000 al mes en el
plan gratis): publicar las nuevas (unos 5 por reseña), las antiguas y
cualquier otro uso, como consultar fichas o publicar posts. La hoja reserva
los que necesitarán las reseñas nuevas hasta la renovación.

Para que vea los créditos **reales** (y no solo lo que gasta ella):
**Reseñas → 📊 Créditos de Make** → pega un token de la API de Make (Make →
tu foto, abajo a la izquierda → *Profile* → *API access* → *Add token* →
marca solo `organizations:read` → *Save*). Con el token, además, llega un
correo si los créditos no van a llegar para publicar las nuevas hasta la
renovación. Si se acabaran, las respuestas no se publican solas y hay que
hacerlas a mano desde la cola. Con un plan de pago de Make (10.000 créditos)
no hay que tocar nada: la hoja lo lee del token.

## Compartir la cola con el equipo

Dos formas; elegid una.

**A. Con el enlace (la más sencilla).** En Apps Script: **Implementar →
Gestionar implementaciones → ✏️** → *Quién tiene acceso:* **Cualquier
usuario con cuenta de Google** → **Implementar**. El enlace no cambia.
Cualquiera que lo tenga podrá usar la cola, así que pasadlo solo por el
grupo del equipo. Nadie puede publicar en Google desde ella; como mucho,
marcar o descartar borradores.

**B. Solo personas concretas.** Compartid la hoja con sus correos
(**Compartir → Editor**) y, en la implementación, poned *Ejecutar como:*
**Usuario que accede a la aplicación web** y *Quién tiene acceso:*
**Cualquier usuario con cuenta de Google**. Solo podrán abrir la cola
quienes tengan la hoja compartida. La primera vez, cada persona acepta los
permisos (el mismo aviso de "Google no ha verificado esta aplicación").
Como editores, también podrán ver las claves en la configuración del
proyecto.

## Asistentes para lo que no es automático

En la carpeta `asistentes/`:

- **Gem de Gemini** (`GEM-GEMINI.md`): un asistente en la app de Gemini
  conectado a esta hoja (keywords y ejemplos en vivo), para TripAdvisor a
  mano, negativas o respuestas sueltas. Aquí sí aprovechas tu Gemini Plus.
  En [gemini.google.com](https://gemini.google.com) → **Gems → Nuevo Gem**
  → pega las instrucciones de `GEM-GEMINI.md` → en *Conocimiento*, añade
  esta hoja desde Drive → **Guardar**.
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

**Primera semana:** mira el gasto en Apify (**Reseñas → 💶 Ver gasto de
Apify**) para confirmar las cifras. Recuperar las reseñas del último mes
cuesta unos céntimos.

## Gemini de pago (recomendado si os importa la calidad)

Con la facturación activada, **todas** las respuestas van con el mejor
modelo, sin límites diarios y más rápido, por unos **2-4 € al mes** con
vuestro volumen. Además, en el plan de pago Google no usa los textos de las
reseñas para entrenar sus modelos. La suscripción Gemini Plus no incluye
uso de esta API: son productos distintos.

1. [aistudio.google.com](https://aistudio.google.com) con
   `simsalabimgrupo@gmail.com` → **Get API key** → en la fila de vuestra
   clave, **Set up billing** (o *Configurar facturación*) → añade una
   tarjeta. La clave es la misma: no hay que cambiar nada en la hoja.
2. Pon un tope de seguridad:
   [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
   → **Presupuestos y alertas → Crear presupuesto** → 5 € al mes, con
   avisos al 50 %, 90 % y 100 %.
3. En la hoja: **Reseñas → 💳 Gemini de pago → Sí**.

Para volver al modo gratuito, pulsa otra vez **💳 Gemini de pago** (y quita
la facturación en AI Studio si ya no la quieres).

## Ajustes

Al principio de `Code.gs`, bloque `CONFIG`. Tras cambiar algo, guarda 💾:

- `HORAS_ENTRE_LECTURAS` (1) y `HORAS_ENTRE_LECTURAS_TRIPADVISOR` (12).
- `DIAS_MAXIMOS` (31): antigüedad máxima de las reseñas que se apuntan.
- `DIAS_RECUPERACION` (30): hasta dónde mira **📥 Recuperar reseñas**.
- `DIAS_ENTRE_REPASOS_DEL_MES` (7): cada cuántos días se repasa el último
  mes de Google, para quitar de la cola las que alguien respondió
  directamente en Google.
- `MODELOS`: orden de modelos de IA.
- `EMAIL_AVISOS`: a quién llegan los correos. Vacío = la cuenta dueña de la
  hoja; varios, separados por comas.
- `AVISAR_NEGATIVAS` (true) y `RESUMEN_DIARIO_HORA` (10; 0 lo desactiva).
- `INFORME_SEMANAL_DIA` (1 = lunes … 7 = domingo; 0 lo desactiva) e
  `INFORME_SEMANAL_HORA` (9).
- `HORAS_SIN_BORRADORES_AVISO` (6): tras cuántas horas sin borradores se
  avisa del atasco.

## Actualizar el programa

Cuando haya una versión nueva de `Code.gs` (o de `Cola.html`):

1. En Apps Script, borra el contenido de `Código.gs`, pega el nuevo y
   guarda 💾. Lo mismo con `Cola` si ha cambiado.
2. **Implementar → Gestionar implementaciones → ✏️** → *Versión:* **Nueva
   versión** → **Implementar**. Sin esto, la cola del móvil seguiría con el
   programa anterior. El enlace no cambia.
3. Recarga la hoja (F5) para ver el menú nuevo.

**Al pasar a la versión 3** no hace falta nada más. En la siguiente vuelta,
el sistema rescata solo las reseñas del último mes sin responder, descarta
los ejemplos respondidos en otro idioma y vuelve a redactar los borradores
pendientes que salieron en un idioma distinto al de la reseña.

## Si ya instalaste la versión 1

1. En Apps Script, sustituye el contenido de `Código.gs` por el nuevo
   `Code.gs` y añade el archivo HTML `Cola` (paso 1).
2. Pulsa **Reseñas → ⚙ Instalar / reparar**. Tu hoja antigua se guarda
   como "Respuestas (v1)", se crea la nueva y a *Restaurantes* se le añade
   la columna de TripAdvisor sin perder vuestros cambios.
3. Como tu pestaña *Restaurantes* se conserva, pega en la nueva columna los
   enlaces de TripAdvisor. Están en la lista `RESTAURANTES_INICIALES` del
   principio de `Code.gs`.
4. Sigue con los pasos 5 y 6.

Si la tenías en la versión 2, basta con "Actualizar el programa".

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
