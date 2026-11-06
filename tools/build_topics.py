#!/usr/bin/env python3
import json
import math
import os
import sys
from topics_data import TOPICS
from ssc_topics_data import SSC_TOPICS

def point_in_polygon(x, y, poly):
    """Ray-casting algorithm to test if point (x,y)=(lon,lat) is inside polygon."""
    inside = False
    n = len(poly)
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def min_distance_to_poly(x, y, poly):
    """Distance in degrees to closest vertex of polygon."""
    return min(math.hypot(x - px, y - py) for px, py in poly)

def main():
    states_file = "assets/india_states.json"
    if not os.path.exists(states_file):
        print(f"Error: {states_file} not found. Run tools/build_states.py first.")
        sys.exit(1)

    with open(states_file, "r", encoding="utf-8") as f:
        states_data = json.load(f)

    # Build state lookup: name -> list of rings
    state_polys = {s["name"]: s["rings"] for s in states_data}

    total_places = 0
    errors = []
    warnings = []

    compiled_topics = []

    for topic in TOPICS + SSC_TOPICS:
        t_id = topic["id"]
        t_cats = set(topic["categories"])
        seen_places = set()

        compiled_places = []
        for name, lat, lon, state, category, fact in topic["places"]:
            total_places += 1
            # 1. Bounds check
            if not (6.0 <= lat <= 38.0 and 67.0 <= lon <= 98.0):
                errors.append(f"[{t_id}] Place '{name}' out of India coordinate bounds: ({lat}, {lon})")

            # 2. Duplicate check
            if name in seen_places:
                errors.append(f"[{t_id}] Duplicate place name: '{name}'")
            seen_places.add(name)

            # 3. Category validity
            if category not in t_cats:
                errors.append(f"[{t_id}] Place '{name}' category '{category}' not in topic categories: {t_cats}")

            # 4. State validation (point in polygon)
            if state != "":
                # Handle Ladakh inside Jammu & Kashmir dataset
                lookup_state = "Jammu & Kashmir" if state == "Ladakh" else state
                rings = state_polys.get(lookup_state)
                if not rings:
                    warnings.append(f"[{t_id}] State '{state}' not found in india_states.json for place '{name}'")
                else:
                    # Check if inside any ring
                    is_inside = any(point_in_polygon(lon, lat, ring) for ring in rings)
                    if not is_inside:
                        # Coastal / border tolerance check: within 0.38 degrees (~40 km)
                        min_dist = min(min_distance_to_poly(lon, lat, ring) for ring in rings)
                        if min_dist > 0.38:
                            warnings.append(f"[{t_id}] Place '{name}' ({lat}, {lon}) lies {min_dist:.2f}° outside '{state}' boundaries")

            compiled_places.append({
                "name": name,
                "lat": lat,
                "lon": lon,
                "state": state,
                "category": category,
                "fact": fact
            })

        # Process questions
        compiled_questions = []
        for q_text, correct, wrong, expl in topic.get("questions", []):
            if len(wrong) != 3:
                errors.append(f"[{t_id}] Question '{q_text}' has {len(wrong)} wrong options, expected 3")
            compiled_questions.append({
                "question": q_text,
                "correct": correct,
                "wrong": wrong,
                "explanation": expl
            })

        compiled_topics.append({
            "id": topic["id"],
            "title": topic["title"],
            "emoji": topic["emoji"],
            "color": topic["color"],
            "syllabus": topic["syllabus"],
            "noun": topic["noun"],
            "blurb": topic["blurb"],
            "categories": topic["categories"],
            "places": compiled_places,
            "questions": compiled_questions
        })

    print(f"\n--- DATA VALIDATION REPORT ---")
    print(f"Total Topics: {len(compiled_topics)}")
    print(f"Total Places: {total_places}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")

    if warnings:
        for w in warnings[:10]:
            print(f"  Warning: {w}")
    if errors:
        for e in errors:
            print(f"  Error: {e}")
        sys.exit(1)

    # Save outputs
    out_paths = [
        "assets/topics.json",
        "app/src/main/assets/topics.json",
        "public/topics.json",
        "src/data/topics.json",
        "android/app/src/main/assets/public/topics.json"
    ]
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as out:
            json.dump(compiled_topics, out, indent=2)
        size_kb = os.path.getsize(p) / 1024
        print(f"Wrote {p} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
