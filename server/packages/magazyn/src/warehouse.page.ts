import type { CatalogBoard } from "./catalog-board";
import type { WarehouseFilters } from "./warehouse.query";

const PAGE_STYLE = `
:root { color: #1c1917; background: #f4f1ec; font-family: system-ui, sans-serif; }
body { margin: 0; }
#app { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
header h1 { margin: 0 0 0.25rem; font-size: 1.75rem; font-weight: 650; }
header p, .summary { color: #57534e; }
.layout { display: grid; grid-template-columns: 16.5rem minmax(0, 1fr); gap: 1.25rem; align-items: start; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
.sidebar, .product { background: white; border: 1px solid #e7e5e4; }
.sidebar { padding: 0.85rem 1rem 0.25rem; }
fieldset { border: 0; margin: 0 0 1rem; padding: 0; min-width: 0; }
legend { font-weight: 650; margin-bottom: 0.35rem; }
.choices { display: flex; flex-direction: column; gap: 0.2rem; max-height: 14rem; overflow: auto; }
.choice { display: flex; gap: 0.45rem; align-items: flex-start; font-size: 0.92rem; }
.product { margin: 0 0 1rem; padding: 0.85rem 1rem 1rem; }
.product h2 { margin: 0 0 0.75rem; font-size: 1.15rem; }
.product h3 { margin: 1rem 0 0.45rem; font-size: 0.95rem; font-weight: 650; color: #57534e; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.45rem 0.35rem; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
th { font-size: 0.82rem; color: #57534e; font-weight: 650; }
.price { text-align: right; white-space: nowrap; }
button { font: inherit; color: inherit; background: white; border: 1px solid #d6d3d1; border-radius: 0.4rem; padding: 0.4rem 0.7rem; }
`;

const FILTER_GROUPS: Array<{
  name: keyof WarehouseFilters;
  label: string;
  values: (board: CatalogBoard) => string[];
  optionLabel: (value: string) => string;
  compare: (left: string, right: string) => number;
}> = [
  {
    name: "manufacturer",
    label: "Producenci",
    values: (board) => present(board.manufacturer),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "thickness",
    label: "Grubość",
    values: (board) => (board.thicknessMm == null ? [] : [thicknessValue(board.thicknessMm)]),
    optionLabel: (value) => thicknessLabel(Number(value)),
    compare: (left, right) => Number(left) - Number(right),
  },
  {
    name: "structure",
    label: "Struktura",
    values: (board) => present(board.structure),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "decorKind",
    label: "Rodzaj dekoru",
    values: (board) => present(board.decorKind),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "format",
    label: "Format",
    values: (board) => present(board.format),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "waterResistance",
    label: "Wodoodporność",
    values: (board) => present(board.waterResistance),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "brightness",
    label: "Jasność",
    values: (board) => present(board.brightness),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "decorType",
    label: "Typ dekoru",
    values: (board) => present(board.decorType),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "shade",
    label: "Odcień",
    values: (board) => present(board.shade),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "color",
    label: "Kolor",
    values: (board) => present(board.color),
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "status",
    label: "Status",
    values: (board) => board.statuses,
    optionLabel: identity,
    compare: comparePl,
  },
];

export function renderWarehousePage(input: {
  boards: CatalogBoard[];
  filters?: WarehouseFilters;
  error?: string;
}): string {
  const filters = input.filters ?? {};
  const visible = input.boards.filter((board) => matches(board, filters));
  const summary = input.error ? "" : `${visible.length} z ${input.boards.length}`;
  const groups = groupBoards(visible).map(renderGroup).join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Magazyn</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <div id="app">
    <header>
      <h1>Magazyn</h1>
      <p>Płyty meblowe z katalogu meble.pl.</p>
    </header>
    <div class="layout">
      <aside class="sidebar">
        <form method="get" action="/">
          ${renderFilters(input.boards, filters)}
          <noscript><button type="submit">Pokaż</button></noscript>
        </form>
      </aside>
      <main>
        <p class="summary">${escapeHtml(summary)}</p>
        <p>${escapeHtml(input.error ?? "")}</p>
        ${groups}
      </main>
    </div>
  </div>
</body>
</html>`;
}

export function renderHealthPage(): string {
  return "<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"utf-8\"><title>ok</title></head><body><p>ok</p></body></html>";
}

function renderFilters(boards: CatalogBoard[], filters: WarehouseFilters): string {
  return FILTER_GROUPS.map((group) => {
    const values = [...new Set(boards.flatMap(group.values))].sort(group.compare);
    if (values.length === 0) return "";
    const selected = new Set(filters[group.name] ?? []);
    const choices = values
      .map((value) => {
        const mark = selected.has(value) ? " checked" : "";
        return `<label class="choice"><input type="checkbox" name="${group.name}" value="${escapeHtml(value)}"${mark} onchange="this.form.submit()"> ${escapeHtml(group.optionLabel(value))}</label>`;
      })
      .join("");
    return `<fieldset><legend>${escapeHtml(group.label)}</legend><div class="choices">${choices}</div></fieldset>`;
  }).join("");
}

function matches(board: CatalogBoard, filters: WarehouseFilters): boolean {
  return FILTER_GROUPS.every((group) => {
    const selected = filters[group.name];
    if (!selected || selected.length === 0) return true;
    const values = group.values(board);
    return selected.some((choice) => values.includes(choice));
  });
}

function groupBoards(boards: CatalogBoard[]): CatalogBoard[][] {
  const groups = new Map<string, CatalogBoard[]>();
  for (const board of boards) {
    const key = JSON.stringify([board.manufacturer, board.decorCode, board.decorName]);
    const group = groups.get(key);
    if (group) group.push(board);
    else groups.set(key, [board]);
  }
  return [...groups.values()].sort((left, right) => {
    const byName = comparePl(left[0].decorName ?? left[0].displayName, right[0].decorName ?? right[0].displayName);
    if (byName !== 0) return byName;
    return comparePl(left[0].decorCode ?? "", right[0].decorCode ?? "");
  });
}

function renderGroup(group: CatalogBoard[]): string {
  const sample = group[0];
  const title = [sample.manufacturer, sample.decorCode, sample.decorName].filter((part) => part).join(" ");
  const stock = group.filter((board) => !isOrderVariant(board)).sort(compareRows);
  const ordered = group.filter(isOrderVariant).sort(compareRows);
  const tables = [
    stock.length > 0 ? renderTable(stock) : "",
    ordered.length > 0 ? `<h3>Warianty na zamówienie</h3>${renderTable(ordered)}` : "",
  ].join("");
  return `<article class="product"><h2>${escapeHtml(title || sample.displayName)}</h2>${tables}</article>`;
}

function renderTable(rows: CatalogBoard[]): string {
  const body = rows
    .map(
      (board) => `<tr>
      <td>${escapeHtml(thicknessLabel(board.thicknessMm))}</td>
      <td>${escapeHtml(board.structure || "—")}</td>
      <td>${escapeHtml(board.availability || "—")}</td>
      <td class="price">${escapeHtml(priceLabel(board))}</td>
    </tr>`,
    )
    .join("");
  return `<table>
    <thead><tr><th>Grubość</th><th>Struktura</th><th>Dostępność</th><th class="price">Cena/szt.</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function isOrderVariant(board: CatalogBoard): boolean {
  return (board.decorKind ?? "").toLocaleLowerCase("pl").includes("na zamówienie");
}

function compareRows(left: CatalogBoard, right: CatalogBoard): number {
  const thickness = (left.thicknessMm ?? Number.POSITIVE_INFINITY) - (right.thicknessMm ?? Number.POSITIVE_INFINITY);
  if (thickness !== 0) return thickness;
  return comparePl(left.structure ?? "", right.structure ?? "");
}

function present(value: string | null): string[] {
  return value ? [value] : [];
}

function identity(value: string): string {
  return value;
}

function comparePl(left: string, right: string): number {
  return left.localeCompare(right, "pl");
}

function thicknessValue(mm: number): string {
  return String(mm);
}

function thicknessLabel(mm: number | null): string {
  if (mm == null || !Number.isFinite(mm)) return "—";
  const formatted = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(mm);
  return `${formatted} mm`;
}

function priceLabel(board: CatalogBoard): string {
  if (board.unitPriceAmount == null || !Number.isFinite(board.unitPriceAmount)) return "—";
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(board.unitPriceAmount);
  if (board.currency == null || board.currency === "PLN") return `${formatted} zł`;
  return `${formatted} ${board.currency}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
