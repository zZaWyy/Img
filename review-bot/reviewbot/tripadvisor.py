"""Modo semiautomático para TripAdvisor.

TripAdvisor NO tiene API oficial para publicar respuestas (solo lectura),
así que automatizar la publicación es imposible sin servicios de pago que
además incumplen sus términos de uso. Lo que sí automatizamos es la
redacción: pegas las reseñas nuevas en un archivo de texto y este comando
genera todas las respuestas listas para copiar en el Management Center.

Formato del archivo de entrada (una reseña por bloque, separadas por ---):

    Mercader del Mar | John S. | 5
    Amazing dinner by the sea, the grilled fish was perfect!
    -> menciona que en agosto tenemos música en directo
    ---
    Madre | Marta G. | 4
    Muy buen tardeo, volveremos seguro.

Primera línea: restaurante | nombre del cliente | estrellas.
Las líneas "->" son directivas internas opcionales (igual que en Google).

Uso:
    python -m reviewbot tripadvisor reseñas.txt
"""

import sys
from pathlib import Path

from .config import find_restaurant, load_config
from .llm import generate_reply
from .prompt import build_user_prompt


def run(input_file: str):
    config = load_config()
    blocks = [b.strip() for b in Path(input_file).read_text(encoding="utf-8")
              .split("\n---") if b.strip()]

    for block in blocks:
        lines = block.strip().splitlines()
        header = [p.strip() for p in lines[0].split("|")]
        if len(header) != 3:
            print(f"⚠ Bloque ignorado, cabecera inválida: {lines[0]!r}\n"
                  "  Formato esperado: Restaurante | Cliente | Estrellas")
            continue
        name, reviewer, stars = header[0], header[1], int(header[2])
        text = "\n".join(lines[1:]).strip()

        restaurant = find_restaurant(config, name)
        if restaurant is None:
            print(f"⚠ Restaurante '{name}' no está en config.yaml, bloque ignorado.")
            continue
        if stars < config.min_star_rating:
            print(f"⚠ {name} · {reviewer}: {stars}★ — negativa/neutra, "
                  "responder a mano.")
            continue

        user_prompt = build_user_prompt(restaurant, reviewer, stars, text)
        reply = generate_reply(config.llm_provider, config.llm_model, user_prompt)

        print(f"\n=== {name} · {reviewer} · {stars}★ ===")
        print(reply)
        print()

    print("\nCopia cada respuesta en el Management Center de TripAdvisor.")


if __name__ == "__main__":
    run(sys.argv[1])
