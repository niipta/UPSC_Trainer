#!/usr/bin/env python3
"""Validate the duplicated topic JSON consumed by web, Capacitor and Kotlin apps."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATHS = (
    ROOT / "src/data/topics.json",
    ROOT / "assets/topics.json",
    ROOT / "public/topics.json",
    ROOT / "app/src/main/assets/topics.json",
    ROOT / "android/app/src/main/assets/public/topics.json",
)


def fail(message: str) -> None:
    raise SystemExit(f"DATA VALIDATION FAILED: {message}")


def validate_application_ids() -> None:
    native_gradle = (ROOT / "app/build.gradle.kts").read_text(encoding="utf-8")
    capacitor_gradle = (ROOT / "android/app/build.gradle").read_text(encoding="utf-8")
    capacitor_config = json.loads((ROOT / "capacitor.config.json").read_text(encoding="utf-8"))

    native_match = re.search(r'applicationId\s*=\s*"([^"]+)"', native_gradle)
    capacitor_match = re.search(r'applicationId\s+"([^"]+)"', capacitor_gradle)
    configured_id = capacitor_config.get("appId")

    if not native_match or not capacitor_match:
        fail("could not read both Android application IDs")
    native_id = native_match.group(1)
    capacitor_id = capacitor_match.group(1)
    if not isinstance(configured_id, str) or not configured_id:
        fail("capacitor.config.json must define a non-empty appId")
    if capacitor_id != configured_id:
        fail(f"Capacitor Gradle app ID ({capacitor_id}) does not match capacitor.config.json ({configured_id})")
    if native_id == capacitor_id:
        fail("native Kotlin and Capacitor Android app IDs must differ so both apps can be installed side by side")


def main() -> None:
    validate_application_ids()
    missing = [str(path.relative_to(ROOT)) for path in DATA_PATHS if not path.is_file()]
    if missing:
        fail("missing topic data copies: " + ", ".join(missing))

    reference = DATA_PATHS[0].read_bytes()
    for path in DATA_PATHS[1:]:
        if path.read_bytes() != reference:
            fail(f"topic data copy is out of sync: {path.relative_to(ROOT)}")

    try:
        topics = json.loads(reference)
    except json.JSONDecodeError as exc:
        fail(f"src/data/topics.json is invalid JSON: {exc}")

    if not isinstance(topics, list) or not topics:
        fail("topic data must be a non-empty JSON array")

    topic_ids: set[str] = set()
    total_places = 0
    total_questions = 0

    for topic in topics:
        if not isinstance(topic, dict):
            fail("each topic must be an object")
        topic_id = topic.get("id")
        if not isinstance(topic_id, str) or not topic_id:
            fail("every topic must have a non-empty id")
        if topic_id in topic_ids:
            fail(f"duplicate topic id: {topic_id}")
        topic_ids.add(topic_id)

        categories = topic.get("categories")
        places = topic.get("places")
        questions = topic.get("questions")
        if not isinstance(categories, list) or not isinstance(places, list) or not isinstance(questions, list):
            fail(f"{topic_id}: categories, places and questions must be arrays")

        place_names: set[str] = set()
        for place in places:
            if not isinstance(place, dict):
                fail(f"{topic_id}: every place must be an object")
            name = place.get("name")
            if not isinstance(name, str) or not name:
                fail(f"{topic_id}: place is missing a name")
            if name in place_names:
                fail(f"{topic_id}: duplicate place name: {name}")
            place_names.add(name)

            for field in ("lat", "lon"):
                value = place.get(field)
                if not isinstance(value, (int, float)):
                    fail(f"{topic_id}/{name}: {field} must be numeric")
            if not -90 <= place["lat"] <= 90 or not -180 <= place["lon"] <= 180:
                fail(f"{topic_id}/{name}: coordinates are outside valid ranges")

            for field in ("state", "category", "fact"):
                if not isinstance(place.get(field), str):
                    fail(f"{topic_id}/{name}: {field} must be a string")
            if place["category"] not in categories:
                fail(f"{topic_id}/{name}: category is not declared by its topic")
            total_places += 1

        for question in questions:
            if not isinstance(question, dict):
                fail(f"{topic_id}: every question must be an object")
            for field in ("question", "correct", "wrong", "explanation"):
                if field not in question:
                    fail(f"{topic_id}: question missing field {field}")
            if not isinstance(question["wrong"], list):
                fail(f"{topic_id}: question wrong options must be an array")
            total_questions += 1

    print(
        "Shared topic data OK: "
        f"{len(topics)} topics, {total_places} places, "
        f"{total_questions} topic questions; all {len(DATA_PATHS)} copies match."
    )


if __name__ == "__main__":
    main()
