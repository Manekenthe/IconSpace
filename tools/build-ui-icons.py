#!/usr/bin/env python3
"""Sloučí SVG z assets/ui-icons do js/icons.js (barva přes currentColor).

Spouští se jen když přidáš / změníš UI ikonu:   python3 tools/build-ui-icons.py
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
icons = {}
for p in sorted((ROOT / "assets" / "ui-icons").glob("*.svg")):
    svg = p.read_text(encoding="utf-8").strip()
    svg = re.sub(r'\s(width|height)="[^"]*"', "", svg, count=2)
    svg = re.sub(r'fill="(black|#000000|#000)"', 'fill="currentColor"', svg)
    svg = re.sub(r'stroke="(black|#000000|#000)"', 'stroke="currentColor"', svg)
    svg = svg.replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
    svg = re.sub(r"\s*\n\s*", "", svg)
    icons[p.stem] = svg
out = "// Generováno příkazem tools/build-ui-icons.py\nwindow.ICONS = " + json.dumps(icons, separators=(",", ":")) + ";\n"
(ROOT / "js" / "icons.js").write_text(out, encoding="utf-8")
print(f"OK: {len(icons)} ikon -> js/icons.js")
