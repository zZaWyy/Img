"""Ciclo principal: lee reseñas de Google, filtra y responde.

Reglas de seguridad (todas configurables en config.yaml):
  - Solo reseñas de min_star_rating (4) estrellas o más. Las negativas
    JAMÁS se responden automáticamente.
  - Solo reseñas sin respuesta previa (Google indica si ya tienen reply,
    así el bot nunca pisa una respuesta manual).
  - Desfase mínimo de min_delay_hours desde la publicación.
  - Solo dentro de la ventana horaria local configurada.
  - Máximo max_replies_per_run respuestas por ejecución.
  - DRY_RUN=true (por defecto): genera pero no publica.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .config import STAR_VALUES, find_restaurant, is_excluded, load_config
from .gbp import GBPClient
from .llm import generate_reply
from .prompt import build_user_prompt

LOG_PATH = Path(__file__).resolve().parent.parent / "replies_log.jsonl"


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def run():
    config = load_config()
    now_local = datetime.now(ZoneInfo(config.timezone))
    now_utc = datetime.now(timezone.utc)

    if not (config.window_start <= now_local.hour < config.window_end):
        print(f"[{now_local:%H:%M}] Fuera de la ventana horaria "
              f"({config.window_start}:00-{config.window_end}:00). No se publica nada.")
        return

    client = GBPClient()
    replies_done = 0

    for account in client.list_accounts():
        for location in client.list_locations(account["name"]):
            title = location.get("title", "")
            if is_excluded(config, location):
                print(f"– '{title}': ficha excluida/duplicada, se ignora.")
                continue
            restaurant = find_restaurant(config, title)
            if restaurant is None:
                print(f"– '{title}': no está en config.yaml, se ignora.")
                continue

            for review in client.list_reviews(account["name"], location["name"]):
                if replies_done >= config.max_replies_per_run:
                    print("Límite de respuestas por ejecución alcanzado.")
                    return

                stars = STAR_VALUES.get(review.get("starRating", ""), 0)
                created = _parse_time(review["createTime"])
                age_hours = (now_utc - created).total_seconds() / 3600

                if review.get("reviewReply"):
                    continue  # ya respondida (a mano o por el bot)
                if stars < config.min_star_rating:
                    continue  # negativa/neutra: siempre manual
                if age_hours < config.min_delay_hours:
                    continue  # todavía dentro del desfase deseado
                if age_hours > config.max_review_age_days * 24:
                    continue  # demasiado antigua

                reviewer = review.get("reviewer", {}).get("displayName", "Cliente")
                text = review.get("comment", "")
                user_prompt = build_user_prompt(restaurant, reviewer, stars, text)
                reply = generate_reply(config.llm_provider, config.llm_model,
                                       user_prompt)

                print(f"\n=== {title} · {reviewer} · {stars}★ ===")
                print(f"Reseña: {text[:200] or '(sin texto)'}")
                print(f"Respuesta: {reply}")

                if config.dry_run:
                    print("(DRY_RUN: no publicada)")
                else:
                    client.reply_to_review(review["name"], reply)
                    print("Publicada ✔")
                    _log(review, title, reviewer, stars, reply)
                    replies_done += 1
                    time.sleep(5)  # pausa breve entre publicaciones

    print(f"\nHecho. Respuestas publicadas: {replies_done}"
          + (" (dry-run, ninguna publicada de verdad)" if config.dry_run else ""))


def _log(review: dict, title: str, reviewer: str, stars: int, reply: str):
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "replied_at": datetime.now(timezone.utc).isoformat(),
            "review": review["name"],
            "restaurant": title,
            "reviewer": reviewer,
            "stars": stars,
            "reply": reply,
        }, ensure_ascii=False) + "\n")
