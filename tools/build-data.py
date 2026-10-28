#!/usr/bin/env python3
"""Převede data/apps.csv (+ data/counts.json) na data/apps.js, který načítá web.

Spuštění z kořene projektu:   python3 tools/build-data.py
"""
import csv, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = {
    "Business", "Developer Tools", "Education", "Entertainment", "Finance", "Games",
    "Graphic & Design", "Health & Fitness", "Lifestyle", "Medical", "Music", "News",
    "Photo & Video", "Productivity", "Reference", "Social Networking", "Sports",
    "Travel", "Utilities", "Weather",
}
PLATFORMS = {"ios", "macos"}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "app"


def main():
    apps, seen, warnings = [], {}, []
    with open(ROOT / "data" / "apps.csv", newline="", encoding="utf-8-sig") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            row = {k: (v or "").strip() for k, v in row.items()}
            if not row.get("title"):
                continue
            plat = row["platform"].lower()
            if plat not in PLATFORMS:
                warnings.append(f"řádek {n}: platform '{row['platform']}' musí být ios nebo macos")
                continue
            if row["category"] not in CATEGORIES:
                warnings.append(f"řádek {n}: neznámá kategorie '{row['category']}'")
            if not re.fullmatch(r"\d{4}-\d{2}", row["date"]):
                warnings.append(f"řádek {n}: date '{row['date']}' musí být ve formátu YYYY-MM (např. 2026-10)")
            if row["icon"] and not (ROOT / row["icon"]).exists():
                warnings.append(f"řádek {n}: soubor ikony '{row['icon']}' neexistuje")
            base = f"{plat}-{slugify(row['title'])}"
            seen[base] = seen.get(base, 0) + 1
            app_id = base if seen[base] == 1 else f"{base}-{seen[base]}"
            apps.append({
                "id": app_id,
                "platform": plat,
                "title": row["title"],
                "category": row["category"],
                "developer": row["developer"],
                "date": row["date"],
                "website": row["website"],
                "appStore": row["appstore"],
                "icon": row["icon"],
                "featured": row["featured"].lower() in {"1", "yes", "ano", "true", "x"},
            })

    counts = {}
    cpath = ROOT / "data" / "counts.json"
    if cpath.exists():
        counts = json.loads(cpath.read_text(encoding="utf-8"))

    payload = {"counts": counts, "apps": apps}
    out = "// Generováno příkazem tools/build-data.py z data/apps.csv – needitovat ručně.\n"
    out += "window.DOCKAPP = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "data" / "apps.js").write_text(out, encoding="utf-8")

    for w in warnings:
        print("⚠", w, file=sys.stderr)
    print(f"OK: {len(apps)} aplikací -> data/apps.js" + (f" ({len(warnings)} upozornění)" if warnings else ""))


if __name__ == "__main__":
    main()
