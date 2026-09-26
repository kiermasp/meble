# SketchUp Chat Bridge

Rozszerzenie Ruby do SketchUp Make 2017. Pełna dokumentacja jest w [głównym README](../README.md).

Krótko: czat zapisuje JSON do `command.json`, SketchUp buduje płyty w milimetrach, odpowiedź wraca w `result.json`. Dekor, obrzeże i nawierty (`holes` na tej samej płycie, `front` / `back` / `left` / `right` / `top` / `bottom`) są w tym samym JSON-ie — bez numerów 1–4 i bez `create_hole`. Istniejącą płytę nawiercasz przez `add_holes`.

```bash
python3 send_command.py panel \
  --name "Bok szafy" \
  --orientation standing \
  --thickness 18 --depth 600 --height 2000

python3 send_command.py inspect
```
