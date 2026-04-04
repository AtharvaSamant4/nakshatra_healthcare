"""
Seed all exercises from exercises.json into the Supabase exercises table.
Uses upsert so it's safe to run multiple times.

Run from the backend/ directory:
    python -m seed.seed_exercises
"""

import json
import sys
from pathlib import Path

# Allow running from backend/ or backend/seed/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config.settings import get_settings
from supabase import create_client

EXERCISES_JSON = Path(__file__).parent / "exercises.json"

# Fixed IDs matching the frontend DEFAULT_EXERCISES catalog so URLs and
# prescriptions referencing these IDs stay consistent.
FIXED_IDS = [
    "a1000001-0001-4000-8000-000000000001",  # Shoulder Flexion
    "a1000001-0001-4000-8000-000000000002",  # Shoulder Abduction
    "a1000001-0001-4000-8000-000000000003",  # Elbow Flexion
    "a1000001-0001-4000-8000-000000000004",  # Knee Extension
    "a1000001-0001-4000-8000-000000000005",  # Knee Flexion
    "a1000001-0001-4000-8000-000000000006",  # Hip Abduction
    "a1000001-0001-4000-8000-000000000007",  # Shoulder External Rotation
    "a1000001-0001-4000-8000-000000000008",  # Straight Leg Raise
]


def main() -> None:
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_key)

    exercises = json.loads(EXERCISES_JSON.read_text())

    rows = []
    for i, ex in enumerate(exercises):
        row = {
            "id": FIXED_IDS[i] if i < len(FIXED_IDS) else None,
            "name": ex["name"],
            "description": ex.get("description"),
            "body_part": ex["body_part"],
            "difficulty": ex["difficulty"],
            "angle_config": ex["angle_config"],
            "instructions": ex.get("instructions"),
            "thumbnail_url": ex.get("thumbnail_url"),
        }
        # Let Supabase generate an ID if we ran out of fixed IDs
        if row["id"] is None:
            del row["id"]
        rows.append(row)

    # Upsert — on_conflict=id means update if already exists
    response = client.table("exercises").upsert(rows, on_conflict="id").execute()
    inserted = response.data or []
    print(f"✓ Seeded {len(inserted)} exercises:")
    for row in inserted:
        print(f"  [{row['id']}] {row['name']}")


if __name__ == "__main__":
    main()
