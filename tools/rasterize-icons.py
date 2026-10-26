"""Rasterizza le icone SVG in PNG per il manifest PWA / Android.
Richiede: pip install cairosvg
Uso: python3 tools/rasterize-icons.py
"""
import pathlib
import cairosvg

d = pathlib.Path(__file__).resolve().parent.parent / "assets" / "icons"
for src, size, name in [
    ("icon.svg", 192, "icon-192.png"),
    ("icon.svg", 512, "icon-512.png"),
    ("maskable.svg", 512, "maskable-512.png"),
    ("icon.svg", 180, "apple-touch-icon.png"),
]:
    cairosvg.svg2png(url=str(d / src), write_to=str(d / name), output_width=size, output_height=size)
    print("ok", name)
