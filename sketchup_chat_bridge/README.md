# SketchUp Chat Bridge

Lokalny mostek między czatem a **SketchUp Make 2017**. Z czatu powstają płyty meblowe — boki, półki, korpusy — bez klikania w SketchUpie i bez odpalania dowolnego Ruby.

Polecenia idą przez pliki JSON. Mostek wykonuje tylko allowlistę operacji.

```
czat / send_command.py  →  command.json  →  SketchUp Ruby API  →  result.json
```

## Co umie

- płyty pionowe i leżące w **milimetrach**
- dekor płyty, słoje i obrzeże na nazwanych krawędziach (podgląd materiałów)
- korpusy z paneli (szafa, regał)
- odczyt modelu i usuwanie elementów
- samoczynne wczytanie `sketchup_chat_bridge.rb` po zapisie (po pierwszej instalacji zrestartuj SketchUp)

## Osie

Wysokość mebla to zawsze **Z**, nigdy SketchUpowe `bounds.height` (to jest Y).

```
            Z  niebieska · wysokość · góra
            │
            │
            └────── X  czerwona · szerokość / grubość boku
           /
          Y  zielona · głębokość (w głąb szafy)
```

Płyta siada spodem na `origin`. Przy `[0, 0, 0]` stoi na podłodze.

| Płyta | Pola | XYZ |
| --- | --- | --- |
| pionowa (`standing`) | `thickness_mm`, `depth_mm`, `height_mm` | X × Y × Z |
| leżąca (`flat`) | `width_mm`, `depth_mm`, `thickness_mm` | X × Y × Z |

## Instalacja

1. Skopiuj `sketchup_chat_bridge/sketchup_chat_bridge.rb` do  
   `~/Library/Application Support/SketchUp 2017/SketchUp/Plugins/`
2. Zrestartuj SketchUp i otwórz model.
3. Menu **Extensions → Chat Bridge: Process Command Now** wymusza jedno polecenie od razu.

Mostek czyta i pisze w katalogu:

`~/Documents/ChatGPT/sketchup api/sketchup_chat_bridge/`

## Szybki start

```bash
cd "sketchup_chat_bridge"

# pionowy bok szafy 18 × 600 × 2000 mm
python3 send_command.py panel \
  --name "Bok szafy" \
  --orientation standing \
  --thickness 18 --depth 600 --height 2000

# półka 562 × 281 × 19 mm
python3 send_command.py panel \
  --name "Półka" \
  --orientation flat \
  --width 562 --depth 281 --thickness 19 \
  --x 19 --z 400

python3 send_command.py inspect
```

To samo jako JSON w `command.json` (SketchUp zbiera plik co ok. 1 s):

```json
{
  "id": "bok-001",
  "operation": "create_panel",
  "name": "Bok szafy",
  "orientation": "standing",
  "thickness_mm": 18,
  "depth_mm": 600,
  "height_mm": 2000,
  "origin_mm": [0, 0, 0]
}
```

Odpowiedź ląduje w `result.json`. Udany create zwraca `entity_id`, `size_mm` i `bounds_mm`.

## Operacje

### `create_panel`

Jedna płyta meblowa. Domyślnie `orientation: "standing"`.

**Bok (pion)**

```json
{
  "operation": "create_panel",
  "name": "Regal - bok lewy",
  "orientation": "standing",
  "thickness_mm": 19,
  "depth_mm": 300,
  "height_mm": 2500,
  "origin_mm": [0, 0, 0]
}
```

**Półka (leżąco)** — aliasy orientacji: `flat`, `polka`, `lezaco`.

```json
{
  "operation": "create_panel",
  "name": "Regal - polka 2",
  "orientation": "flat",
  "width_mm": 562,
  "depth_mm": 281,
  "thickness_mm": 19,
  "origin_mm": [19, 0, 413.5]
}
```

### Wykończenie: płyta i obrzeże

Wymiary to **cięcie płyty** — obrzeże nie powiększa bryły. Klej i „kryjące długie/krótkie” są w JSON-ie pod CNC; w SketchUpie widać kolor ścian, nie spoinę narożnika.

Nie numeruj krawędzi 1–4. Nazwy:

- `standing` (bok): duże ściany ±X; obrzeże `front` (−Y), `back` (+Y), `top` (+Z), `bottom` (−Z)
- `flat` (półka): duże ściany ±Z; obrzeże `front` (−Y), `back` (+Y), `left` (−X), `right` (+X)

Słoje: na boku `na_wysokosc` = Z, `na_szerokosc` = Y. Na półce `na_szerokosc` = X, `na_wysokosc` = Y.

Krawędź pominięta albo `null` = bez obrzeża. `{}` bierze `edgeband.default`.

```json
{
  "operation": "create_panel",
  "name": "Regal - bok lewy",
  "orientation": "standing",
  "thickness_mm": 19,
  "depth_mm": 300,
  "height_mm": 2500,
  "origin_mm": [0, 0, 0],
  "board": {
    "decor": "W1000",
    "structure": "ST19",
    "grain": "na_wysokosc",
    "hex": "#F4F1EA"
  },
  "edgeband": {
    "glue": "neutral",
    "cover": "long",
    "default": { "decor": "W1000", "thickness_mm": 0.8 },
    "edges": {
      "front": {},
      "back": {},
      "top": {},
      "bottom": { "decor": "W1000", "thickness_mm": 0.8 }
    }
  }
}
```

`inspect_model` zwraca to samo w `finish`. Pełne wykończenie podawaj w JSON (`command.json`); CLI ma tylko wymiary.

### Nawierty (`holes`)

Otwór należy do płyty — nie ma `create_hole`, osobnej grupy ani wiersza w `cut_list`. Tablica `holes` jest polem `create_panel` / `create_box` / `add_holes` (jak `board` i `edgeband`). SketchUp wycina kółko **w tej samej grupie**. `inspect` / `cut_list` oddają `holes` pod częścią. `qty` scala płyty tylko gdy zgadza się też lista nawiertów.

Dwa rodzaje. Pozycja to **środek** otworu w wymiarze gotowym. `type` na razie tylko `single` (brak pola = `single`).

- **W płaszczyźnie** (`kind: "face"`): lico `front` albo `back`. `x_mm` wzdłuż długości formatki, `y_mm` wzdłuż szerokości. Origin lica: standing — dół + przód; flat — lewy + przód; thin_y — lewy + dół. Głębokość w mm albo `through`.
- **W czole** (`kind: "edge"`): krawędź nazwana (`front` / `back` / `left` / `right` / `top` / `bottom`), zawsze na środku grubości. `from_mm` od zera krawędzi do środka. Nieznana krawędź dla orientacji = błąd.

`cut_list` dodaje też pozycję na formatce po odjęciu obrzeża od krawędzi origin: `x_cut_mm` / `y_cut_mm` albo `from_cut_mm`. `finished_mm` / `cut_mm` płyty się nie zmieniają.

Do **istniejącej** płyty dopisz kolejne otwory przez `add_holes` (ta sama grupa, ta sama tablica `holes`). `create_hole` nie istnieje.

```json
{
  "operation": "add_holes",
  "entity_id": 20628,
  "holes": [
    {
      "id": "k-extra",
      "kind": "edge",
      "edge": "front",
      "from_mm": 80,
      "diameter_mm": 8,
      "depth_mm": 9
    }
  ]
}
```

```json
{
  "operation": "create_panel",
  "name": "Regal - polka z nawiertami",
  "orientation": "flat",
  "width_mm": 562,
  "depth_mm": 281,
  "thickness_mm": 19,
  "origin_mm": [19, 0, 413.5],
  "holes": [
    {
      "id": "p1",
      "kind": "face",
      "surface": "front",
      "x_mm": 80,
      "y_mm": 50,
      "diameter_mm": 5,
      "depth_mm": 10,
      "type": "single"
    },
    {
      "id": "c1",
      "kind": "edge",
      "edge": "left",
      "from_mm": 50,
      "diameter_mm": 8,
      "depth_mm": 20,
      "type": "single"
    }
  ]
}
```

### `create_box`

Surowy prostopadłościan `[X, Y, Z]` w mm. Do tyłu korpusu i nietypowych formatów.

```json
{
  "operation": "create_box",
  "name": "Regal - tyl",
  "origin_mm": [19, 281, 19],
  "dimensions_mm": [562, 19, 2462]
}
```

`origin_m` / `dimensions_m` nadal działają, ale do mebli używaj mm.

### `inspect_model`

Domyślnie tylko grupy i komponenty. `detail: "all"` pokazuje też luźne krawędzie i ściany.

```json
{ "operation": "inspect_model" }
```

Bryła w SketchUpie to **wymiar gotowy** (`finished_mm` = jak płyta siada w korpusie).  
`cut_mm` to formatka na piłę (gotowy minus obrzeża na danej osi).  
`cut_blank_mm` to `length_mm × width_mm × thickness_mm` pod API cięcia.

Przykład półki 562 × 281 × 19 z okleiną 0,8 mm na 4 krawędziach:

- `finished_mm`: `{ "x": 562, "y": 281, "z": 19 }`
- `cut_mm`: `{ "x": 560.4, "y": 279.4, "z": 19 }`
- `cut_blank_mm`: `{ "length_mm": 560.4, "width_mm": 279.4, "thickness_mm": 19 }`

### `cut_list`

Sama lista formatek: nazwa, **qty**, cięcie, gotowy, płyta, obrzeże, **nawierty pod częścią**. Identyczne płyty (wymiar, wykończenie i lista otworów) są jedną pozycją z `qty`. `line_count` to liczba pozycji, `qty_total` to suma sztuk.

```json
{ "operation": "cut_list" }
```

W wyniku `size_mm.z` to wysokość. Po każdym create sprawdź, że `bounds_mm.min_mm[2]` jest na żądanym `z` (na podłodze: `0`).

### `add_holes`

Dopisuje nawierty do **istniejącej** grupy płyty. Ta sama walidacja co przy `create_panel`. Odpowiedź ma pełną listę `holes` i pole `added` z nowymi.

```json
{ "operation": "add_holes", "entity_id": 20628, "holes": [{ "kind": "edge", "edge": "left", "from_mm": 80, "diameter_mm": 8, "depth_mm": 9 }] }
```

```bash
python3 send_command.py add-holes 20628 --holes '[{"kind":"edge","edge":"left","from_mm":80,"diameter_mm":8,"depth_mm":9}]'
```

### `delete_entity`

```json
{ "operation": "delete_entity", "entity_id": 14622 }
```

```bash
python3 send_command.py delete 14622
```

## Przykład: regał

Korpus **600 × 300 × 2500 mm**, płyta **19 mm**, 6 równych poziomów:

| Element | Gotowy (w korpusie) | Cięcie (0,8 mm × 4 krawędzie) |
| --- | --- | --- |
| 2 boki | 19 × 300 × 2500 | 19 × 298,4 × 2498,4 |
| spód + wieniec | 562 × 300 × 19 | 560,4 × 298,4 × 19 |
| 5 półek | 562 × 281 × 19 | 560,4 × 279,4 × 19 |
| tył | 562 × 19 × 2462 | 560,4 × 19 × 2460,4 |

Boki na wylot, półki w świetle **562 mm**, światło między półkami **394,5 mm**.

## Bezpieczeństwo

Mostek **nie ewaluuje** Ruby z JSON-a. Nieznana `operation` kończy się błędem w `result.json`.

`command.json` i `result.json` są lokalne i nie trafiają do gita.

## Pliki

```
sketchup_chat_bridge/
  sketchup_chat_bridge.rb   # rozszerzenie SketchUp
  send_command.py           # CLI
  command.json              # wejście (roboczy)
  result.json               # wyjście (roboczy)
```
