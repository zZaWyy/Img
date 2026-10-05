# Hoja de respuestas a reseñas: guía de instalación

Una hoja de Google que se rellena sola cada hora con las reseñas nuevas de
Google de los 11 restaurantes y **la respuesta ya redactada** con el
prompt de la casa. Entras cuando quieras, copias, pegas en Google y listo.

- Las de **4-5★** traen borrador, en el idioma del cliente.
- Las de **1-3★** salen en rojo, **sin borrador**: se responden a mano.
- Cuando una reseña ya está respondida en Google, se marca sola
  "Publicada ✔".
- Funciona en los servidores de Google, aunque tengas el ordenador
  apagado. Coste: **0 €** (ver "Costes").

Necesitas unos 15 minutos y tres cosas: la cuenta `simsalabimgrupo@gmail.com`,
la clave de Gemini que ya creaste y una cuenta gratuita de Apify (paso 3).

---

## Paso 1: Crear la hoja

1. Entra en [drive.google.com](https://drive.google.com) con
   `simsalabimgrupo@gmail.com`.
2. **Nuevo → Hojas de cálculo de Google**.
3. Ponle de nombre, por ejemplo, `Respuestas reseñas Unicum`.

## Paso 2: Pegar el programa

1. En la hoja: **Extensiones → Apps Script**.
2. Se abre un editor con algo de texto (`function myFunction…`). **Bórralo
   todo.**
3. Pega el contenido completo del archivo `Code.gs`.
4. Arriba, cambia "Proyecto sin título" por `Reseñas Unicum`.
5. Pulsa el icono de **guardar** 💾.

## Paso 3: Crear la clave de Apify (gratis)

Apify es el servicio que lee las reseñas públicas de Google Maps.

1. Entra en [apify.com](https://apify.com) → **Sign up** → regístrate con
   la cuenta de Google. Plan **Free**, sin tarjeta.
2. En el panel: **Settings → API & Integrations**.
3. Copia el **Personal API token**.

## Paso 4: Guardar las dos claves en el programa

1. Vuelve al editor de Apps Script.
2. En la barra de la izquierda, pulsa la **rueda ⚙ (Configuración del
   proyecto)**.
3. Baja hasta **Propiedades de la secuencia de comandos → Añadir
   propiedad**, y crea estas dos (el nombre, exactamente así):

   | Propiedad | Valor |
   |---|---|
   | `APIFY_TOKEN` | el token del paso 3 |
   | `GEMINI_API_KEY` | tu clave de Gemini |

4. **Guardar propiedades de la secuencia de comandos**.

## Paso 5: Instalar

1. Vuelve a la pestaña de la **hoja** y **recárgala** (F5).
2. Arriba aparece un menú nuevo: **Reseñas**. Pulsa
   **Reseñas → ⚙ Instalar / reparar**.
3. Google pedirá permisos. Es normal, porque el programa es vuestro:
   - **Continuar** → elige `simsalabimgrupo@gmail.com`.
   - Si sale *"Google no ha verificado esta aplicación"* → **Configuración
     avanzada** → **Ir a Reseñas Unicum (no seguro)** → **Permitir**.
4. Vuelve a pulsar **Reseñas → ⚙ Instalar / reparar** si no apareció el
   mensaje "Listo".

## Paso 6: Comprobar los enlaces de los restaurantes

En la pestaña **Restaurantes** está la lista de los 11 locales con sus
keywords. **Haz clic en cada enlace** de la columna "Enlace Google Maps" y
comprueba que abre el restaurante correcto.

Si alguno no abre el restaurante correcto, búscalo en Google Maps, copia
la dirección de la barra del navegador y pégala en su casilla.

Desde esta pestaña también podéis cambiar keywords y notas, o desactivar
un local (columna "Activo" en "No"), sin tocar el programa.

## Paso 7: Primera lectura

1. **Reseñas → ▶ Buscar reseñas nuevas ahora**. Esto encarga la primera
   lectura a Apify, que tarda unos minutos.
2. Pasados **5-10 minutos**, pulsa otra vez **Buscar reseñas nuevas
   ahora**. Aparecerán las reseñas de los últimos 7 días y se irán
   redactando, hasta 25 por vez. El resto se redacta solo en las horas
   siguientes.

A partir de aquí funciona solo: cada hora revisa y redacta, y cada 12
horas vuelve a leer Google Maps.

---

## Uso diario

1. Abre la hoja cuando quieras. Las filas **Pendiente** ya tienen su
   **Respuesta propuesta**.
2. Copia la respuesta → pulsa **Abrir ↗** → en Google, **Responder** →
   pega → **Publicar**.
3. No hace falta marcar nada: en la siguiente lectura (como mucho 12 h)
   la fila pasa a **Publicada ✔** sola. Si quieres, márcala tú en la
   columna Estado.

**Colores:** rojo = negativa (a mano) · verde = publicada · amarillo =
error de la IA · gris = descartada.

**¿No te convence un borrador?** Escribe en la columna **Instrucción
(->)** lo que quieras (por ejemplo, *menciona la música en directo de los
viernes*), deja seleccionada esa fila y pulsa **Reseñas → ↻ Regenerar
respuesta de la fila seleccionada**.

**¿Una reseña que no queréis contestar?** Pon su Estado en
**Descartada**.

---

## Costes

| Servicio | Coste |
|---|---|
| Hoja y programa (Google Apps Script) | Gratis |
| Redacción (Gemini, capa gratuita) | Gratis |
| Lectura de reseñas (Apify) | 5 $/mes gratis. La configuración actual (11 locales × 20 reseñas × 2 lecturas al día) ronda los 3 $/mes, dentro de lo gratuito |

Puedes ver lo gastado en Apify en **Billing → Usage**. Apify no cobra nada
si no añades tarjeta: como mucho, deja de leer hasta el mes siguiente.

## Ajustes

Al principio del programa (`Code.gs`), en el bloque `CONFIG`:

- `HORAS_ENTRE_LECTURAS` (12): cada cuánto se leen las reseñas. Menos
  horas = reseñas antes, pero más gasto en Apify.
- `DIAS_MAXIMOS` (7): antigüedad máxima de las reseñas que se apuntan.
  Súbelo a 30 para recuperar reseñas antiguas sin contestar. Tardará unos
  días en redactarlas todas por los límites gratuitos.
- `MIN_ESTRELLAS_BORRADOR` (4): por debajo de esto no hay borrador.

Tras cambiar algo: guardar 💾. No hace falta reinstalar.

## Limitaciones

- **Publicar sigue siendo manual.** Sin la aprobación de Google no hay
  forma segura de publicar automáticamente.
- Lee la **información pública** de Google Maps (no la API oficial). No
  entra en vuestra cuenta, así que las fichas no corren ningún riesgo. Si
  Google cambia su web, Apify suele actualizar su lector en pocos días.
- Una reseña puede tardar **hasta 12 h** en aparecer en la hoja.
- **TripAdvisor no está incluido** todavía. Se puede añadir más adelante
  con el lector de TripAdvisor de Apify.
- Si aparece **"Error IA (regenerar)"**: selecciona la fila → Regenerar.
  La nota de la celda explica el error.
