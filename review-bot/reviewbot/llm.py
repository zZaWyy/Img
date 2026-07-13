"""Generación de la respuesta con un LLM.

Dos proveedores intercambiables (config.yaml -> llm.provider):
  - gemini:    gratis con la API key de Google AI Studio (cuota de sobra
               para el volumen de reseñas de un grupo de restaurantes).
  - anthropic: pago por uso (céntimos al mes con este volumen).
"""

import os

import requests

from .prompt import SYSTEM_PROMPT


def generate_reply(provider: str, model: str, user_prompt: str) -> str:
    if provider == "gemini":
        return _gemini(model, user_prompt)
    if provider == "anthropic":
        return _anthropic(model, user_prompt)
    raise ValueError(f"Proveedor LLM desconocido: {provider}")


def _gemini(model: str, user_prompt: str) -> str:
    api_key = os.environ["GEMINI_API_KEY"]
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent")
    resp = requests.post(
        url,
        params={"key": api_key},
        json={
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.9, "maxOutputTokens": 1024},
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _anthropic(model: str, user_prompt: str) -> str:
    api_key = os.environ["ANTHROPIC_API_KEY"]
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": model,
            "max_tokens": 1024,
            "temperature": 0.9,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"].strip()
