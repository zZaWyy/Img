import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"

STAR_VALUES = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


@dataclass
class Restaurant:
    match: str
    city: str = ""
    keywords: list = field(default_factory=list)
    notes: str = ""


@dataclass
class Config:
    timezone: str
    window_start: int
    window_end: int
    min_delay_hours: float
    max_review_age_days: int
    min_star_rating: int
    max_replies_per_run: int
    llm_provider: str
    llm_model: str
    restaurants: list

    @property
    def dry_run(self) -> bool:
        return os.environ.get("DRY_RUN", "true").strip().lower() != "false"


def load_config(path: Path = CONFIG_PATH) -> Config:
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return Config(
        timezone=raw.get("timezone", "Europe/Madrid"),
        window_start=int(raw["reply_window"]["start_hour"]),
        window_end=int(raw["reply_window"]["end_hour"]),
        min_delay_hours=float(raw.get("min_delay_hours", 2)),
        max_review_age_days=int(raw.get("max_review_age_days", 30)),
        min_star_rating=int(raw.get("min_star_rating", 4)),
        max_replies_per_run=int(raw.get("max_replies_per_run", 5)),
        llm_provider=raw["llm"]["provider"],
        llm_model=raw["llm"]["model"],
        restaurants=[Restaurant(**r) for r in raw.get("restaurants", [])],
    )


def find_restaurant(config: Config, location_title: str):
    title = location_title.lower()
    for r in config.restaurants:
        if r.match.lower() in title:
            return r
    return None
