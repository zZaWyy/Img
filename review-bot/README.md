# Bot de respuestas a reseñas — Unicum Group

Automatiza la respuesta a reseñas **positivas** (4-5★) de Google Business
Profile y semiautomatiza las de TripAdvisor. Sin herramientas de pago.

---

## 1. Conclusiones de la investigación

### Google: SÍ se puede automatizar gratis
La [API de Google Business Profile](https://developers.google.com/my-business/content/review-data)
es **gratuita** y permite listar reseñas y publicar respuestas. El único
requisito es solicitar acceso (formulario en Google Cloud): hace falta un
perfil de empresa verificado con 60+ días de antigüedad, una web y describir
el caso de uso. La aprobación tarda de días a un par de semanas.

### TripAdvisor: NO tiene API para responder
La API oficial de TripAdvisor es de solo lectura; **no existe forma oficial
de publicar respuestas por API**. Las herramientas que lo hacen son de pago
y usan automatización de navegador que incumple los términos de uso de
TripAdvisor (riesgo de bloqueo de la cuenta). Solución aquí: modo
semiautomático — el bot redacta las respuestas y una persona las pega en el
Management Center (30 segundos por reseña).

### ¿Penaliza Google las respuestas automatizadas o inmediatas?
**No hay penalización documentada** ni por usar IA ni por la velocidad de
respuesta. Lo que sí perjudica (a la confianza del cliente y, de rebote, al
perfil) son respuestas **genéricas y repetitivas**. Responder reseñas
mejora las señales de interacción del perfil (las reseñas y su gestión
pesan un 10-15% en el ranking local). Aun así, el bot incorpora vuestras
dos salvaguardas por prudencia y naturalidad:
- **Desfase mínimo** de 2 h desde que se publica la reseña (configurable).
- **Ventana horaria** de publicación, p. ej. 10:00-21:00 (configurable).

---

## 2. Cómo funciona

```
GitHub Actions (cron, cada hora)
        │
        ▼
  reviewbot (Python)
        │  1. Lee las reseñas de todas las fichas de Google
        │  2. Filtra:  ≥4★ · sin respuesta previa · ≥2h de antigüedad
        │             · <30 días · dentro de la ventana horaria
        │  3. Genera la respuesta con IA (prompt de la casa, perfeccionado)
        │  4. Publica la respuesta vía API
        ▼
  replies_log.jsonl  (registro de todo lo publicado)
```

Garantías integradas:
- Las reseñas de **1-3★ nunca se tocan**: se siguen respondiendo a mano.
- Si una reseña **ya tiene respuesta** (manual o del bot), no se pisa.
- **Idioma**: responde siempre en el idioma original del cliente.
- **Keywords SEO**: máximo 1-2 por respuesta y solo si encajan de forma
  natural (configurable por restaurante en `config.yaml`).
- Máximo 5 respuestas por ejecución (freno de seguridad).
- `DRY_RUN=true` por defecto: genera pero **no publica** hasta que lo
  activéis expresamente.

## 3. Puesta en marcha, paso a paso

### Paso 1 — Solicitar acceso a la API de Google (empezar ya: tarda días)
1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com)
   con la cuenta propietaria de las fichas.
2. Rellenar el [formulario de solicitud de acceso a la GBP API](https://developers.google.com/my-business/content/prereqs)
   describiendo el uso: *"gestión de respuestas a reseñas de nuestros
   propios restaurantes"*.
3. Al aprobarse, habilitar en el proyecto las APIs de Business Profile
   (My Business Account Management, Business Information y la API v4).

### Paso 2 — Credenciales OAuth
1. En Google Cloud → *APIs y servicios* → *Credenciales* → crear
   **ID de cliente OAuth** (tipo "aplicación de escritorio").
2. Guardar `GBP_CLIENT_ID` y `GBP_CLIENT_SECRET`.
3. En un ordenador, ejecutar una única vez:
   ```bash
   pip install -r requirements.txt
   export GBP_CLIENT_ID=... GBP_CLIENT_SECRET=...
   python -m reviewbot auth
   ```
   Autorizar con la cuenta propietaria de las fichas y guardar el
   `GBP_REFRESH_TOKEN` que imprime.

### Paso 3 — API key del generador de texto (gratis)
Crear una API key en [Google AI Studio](https://aistudio.google.com/apikey)
(Gemini, capa gratuita: de sobra para este volumen). Coste total del
sistema: **0 €**. Alternativa: API de Anthropic (céntimos/mes), cambiando
`llm.provider` en `config.yaml`.

### Paso 4 — Configurar los restaurantes
Editar `config.yaml`: un bloque por restaurante con su nombre (tal como
aparece en Google), ciudad, keywords SEO y notas. También ahí se ajustan
ventana horaria, desfase y umbral de estrellas.

### Paso 5 — Secretos en GitHub y prueba en seco
1. En el repo: *Settings → Secrets and variables → Actions → Secrets*:
   `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN`,
   `GEMINI_API_KEY`.
2. Lanzar el workflow a mano (*Actions → Review Bot → Run workflow*) y
   revisar en el log las respuestas generadas. **En este punto no publica
   nada** (dry-run).
3. Iterar sobre el prompt/keywords hasta que las respuestas convenzan.

### Paso 6 — Activar la publicación real
En *Settings → Secrets and variables → Actions → Variables* crear
`DRY_RUN` con valor `false`. Desde ese momento el bot publica solo. Para
pausarlo, volver a ponerla en `true` o desactivar el workflow.

## 4. TripAdvisor (semiautomático)

Cuando lleguen reseñas nuevas (aviso por email de TripAdvisor), pegarlas en
un archivo de texto con este formato:

```
Mercader del Mar | John S. | 5
Amazing dinner by the sea, the grilled fish was perfect!
---
Madre | Marta G. | 4
Muy buen tardeo, volveremos seguro.
-> menciona la nueva carta de otoño
```

Y ejecutar:

```bash
python -m reviewbot tripadvisor reseñas.txt
```

Imprime todas las respuestas listas para copiar en el Management Center.
Las líneas `->` funcionan igual que siempre: directiva prioritaria.

## 5. Uso local (sin GitHub Actions)

```bash
cd review-bot
pip install -r requirements.txt
cp .env.example .env   # rellenar y exportar las variables
python -m reviewbot run
```
