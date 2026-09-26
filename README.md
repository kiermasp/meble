# meble

Lokalny katalog płyt z [meble.pl](https://www.meble.pl/plyty-meblowe/?view=icon) oraz mostek SketchUp w tym samym repozytorium.

Local furniture-board catalog in front of meble.pl, plus the SketchUp bridge in this same repository.

## Układ / Layout

- `sketchup_chat_bridge` — pliki mostka, zwykła część tego repozytorium. Osobne repozytorium [kiermasp/sketchup-chat-bridge](https://github.com/kiermasp/sketchup-chat-bridge) zostaje na GitHubie i nie jest już lokalnym klonem.
- `server/packages/domain` — typy domenowe, bez Nest, HTTP i ORM.
- `server/packages/api` — aplikacja NestJS. Każdy endpoint przyjmuje i zwraca tylko `application/json`.
- `server/packages/magazyn` — aplikacja React (Vite, Material UI). Czyta JSON z API.
- `docker-compose.yml` — Postgres, API i magazyn. Uruchamiaj z tego katalogu.

The live plugin in `~/Documents/ChatGPT/sketchup api` is a different copy.

## Instalacja / Install

Wymagane: Docker Desktop, Node.js 22+, npm.

```bash
cd ~/github/meble/server
npm install
```

## Compose

Z katalogu `~/github/meble`:

```bash
docker compose up -d --build
```

API nasłuchuje na porcie **3010** (w kontenerze 3000). Magazyn nasłuchuje na porcie **3011** (w kontenerze 3000) i woła API pod `http://api:3000`. Po starcie API od razu pobiera płyty i zapisuje je w Postgresie, potem powtarza to co 3 godziny od startu procesu (interwał, nie cron).

API wystawia wyłącznie JSON (`Content-Type: application/json`):

- `GET /health` — `{ "status": "ok", "materials": <liczba> }`
- `GET /materials` — warianty płyt: `manufacturer`, `decorCode`, `decorName`, `structure`, `thicknessMm`, `format`, `availability`, `unitPriceAmount`, `currency`
- `GET /materials?category=plyty-meblowe` — jedna kategoria

```bash
curl -H 'Accept: application/json' http://127.0.0.1:3010/health
curl -H 'Accept: application/json' "http://127.0.0.1:3010/materials?category=plyty-meblowe"
```

Źródło katalogu: listing sklepu [płyty meblowe](https://www.meble.pl/plyty-meblowe/?view=icon). Każdy wariant (grubość × struktura) jest osobnym rekordem. Cena i czas dostawy pochodzą z karty na listingu. Pozostałe działy (sklejki, obrzeża, płyty budowlane, laminaty, płyty akrylowe, blaty, panele wnękowe) są opisane w domenie i nie są jeszcze pobierane.

Baza lokalna: `postgres://meble:meble@127.0.0.1:5432/meble`. Hasło jest tylko do tego compose, nie do produkcji.

## Testy / Tests

Postgres z compose musi działać (test zapisu łączy się z `127.0.0.1:5432` i używa bazy `meble_test`).

```bash
cd ~/github/meble/server
npm test
```

Parser czyta kartę z listingu sklepu i specyfikację ze strony produktu. Test zapisu sprawdza, że ponowny upsert aktualizuje wariant i usuwa kod, którego nie ma w nowym przebiegu.

## Magazyn

Strona React serwowana z `server/packages/magazyn`, nie przez API. API zostaje wyłącznie JSON. Po `docker compose up -d --build` strona jest na http://localhost:3011.

Interfejs korzysta z Material UI. Boczny panel filtruje warianty: Producenci, Grubość, Struktura, Rodzaj dekoru, Format, Wodoodporność, a także Jasność, Typ dekoru, Odcień, Kolor i Status, gdy katalog je ma. Każdy dekor jest blokiem z wierszami Grubość, Struktura, Dostępność i Cena/szt. Nagłówki tych kolumn sortują wiersze, a lista dekorów sortuje się po nazwie, producencie, cenie albo grubości. Warianty produkcyjne są pod osobnym nagłówkiem „Warianty na zamówienie”.
