# meble

Lokalny katalog płyt z [meble.pl](https://www.meble.pl/rozkroj,plyty-meblowe) oraz mostek SketchUp w tym samym repozytorium.

Local furniture-board catalog in front of meble.pl, plus the SketchUp bridge in this same repository.

## Układ / Layout

- `sketchup_chat_bridge` — pliki mostka, zwykła część tego repozytorium. Osobne repozytorium [kiermasp/sketchup-chat-bridge](https://github.com/kiermasp/sketchup-chat-bridge) zostaje na GitHubie i nie jest już lokalnym klonem.
- `server` — monorepo npm: `packages/domain` (typy) i `apps/api` (NestJS).
- `docker-compose.yml` — Postgres i API. Uruchamiaj z tego katalogu.

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

API nasłuchuje na porcie **3010** (w kontenerze 3000). Po starcie proces od razu pobiera płyty i zapisuje je w Postgresie, potem powtarza to co 3 godziny od startu procesu (interwał, nie cron).

```bash
curl http://127.0.0.1:3010/health
curl "http://127.0.0.1:3010/materials?category=plyty-meblowe"
```

Źródło: `POST https://www.meble.pl/rozkroj/go/ajaxRequest,showDialogPlyta` z treścią `nr=1&id=0&zakladka=plyty-meblowe&plytyId=0,0`. Odpowiedź to HTML. Jedno wywołanie zawiera zakładki: Płyta meblowa, Płyta akrylowa, Wysoki połysk, Głęboki mat, Rauvisio Crystal, TSS Cleaf, HDF, Rauvisio Grip.

Legenda: zielony `in_stock` = na magazynie, pomarańczowy `on_order` = na zamówienie, czerwony `on_order_pallet` = na zamówienie, minimalna ilość to paleta.

Baza lokalna: `postgres://meble:meble@127.0.0.1:5432/meble`. Hasło jest tylko do tego compose, nie do produkcji.

## Testy / Tests

Postgres z compose musi działać (test zapisu łączy się z `127.0.0.1:5432` i używa bazy `meble_test`).

```bash
cd ~/github/meble/server
npm test
```

Parser czyta prawdziwą odpowiedź `showDialogPlyta`. Drugi test sprawdza, że ponowny upsert aktualizuje płytę i nie dodaje duplikatu.
