import {
  AVAILABILITY_STATUSES,
  CATEGORY_LABELS,
  isAvailabilityStatus,
  isMaterialCategory,
  type AvailabilityStatus,
  type MaterialCategory,
} from "@meble/domain";
import type { CatalogBoard } from "./catalog-board";

const PAGE_AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "na magazynie",
  on_order: "na zamówienie",
  on_order_pallet: "na zamówienie — paleta",
};

const PAGE_STYLE = `
:root { color: #1c1917; background: #f6f3ee; font-family: "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif; }
body { margin: 0; }
#app { max-width: 1200px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
header h1 { margin: 0 0 0.25rem; font-size: 2rem; font-weight: 600; }
header p, .filters, #app > p { color: #57534e; }
.filters { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0 0.75rem; align-items: end; }
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; }
select, button { font: inherit; color: inherit; background: white; border: 1px solid #d6d3d1; border-radius: 0.4rem; padding: 0.45rem 0.6rem; }
select { min-width: 16rem; }
table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e7e5e4; }
th, td { text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
th { font-size: 0.85rem; letter-spacing: 0.02em; color: #57534e; }
.status { display: inline-flex; align-items: center; gap: 0.45rem; }
.status::before { content: ""; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: currentColor; }
.in_stock { color: #15803d; }
.on_order { color: #c2410c; }
.on_order_pallet { color: #b91c1c; }
`;

export function renderWarehousePage(input: {
  boards: CatalogBoard[];
  category?: MaterialCategory;
  availability?: AvailabilityStatus;
  error?: string;
}): string {
  const visible = input.boards
    .filter((board) => !input.category || board.category === input.category)
    .filter((board) => !input.availability || board.availability === input.availability)
    .sort((left, right) => left.externalCode.localeCompare(right.externalCode, "pl"));

  const summary = input.error ? "" : `${visible.length} z ${input.boards.length}`;
  const rows = visible.map(renderRow).join("");

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
      <p>Dostępność płyt z katalogu meble.pl.</p>
    </header>
    <form class="filters" method="get" action="/">
      ${labeled("Kategoria", "category", categoryOptions(input.boards, input.category))}
      ${labeled("Dostępność", "availability", availabilityOptions(input.availability))}
      <noscript><button type="submit">Pokaż</button></noscript>
    </form>
    <p>${escapeHtml(summary)}</p>
    <p>${escapeHtml(input.error ?? "")}</p>
    <table>
      <thead>
        <tr>
          <th>Kod</th>
          <th>Nazwa</th>
          <th>Producent</th>
          <th>Grubość</th>
          <th>Kategoria</th>
          <th>Dostępność</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export function renderHealthPage(): string {
  return "<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"utf-8\"><title>ok</title></head><body><p>ok</p></body></html>";
}

function renderRow(board: CatalogBoard): string {
  const availability = isAvailabilityStatus(board.availability) ? board.availability : null;
  const availabilityCell = availability
    ? `<td><span class="status ${availability}">${escapeHtml(PAGE_AVAILABILITY_LABELS[availability])}</span></td>`
    : `<td>${escapeHtml(board.availability)}</td>`;
  return `<tr>
    <td>${escapeHtml(board.externalCode)}</td>
    <td>${escapeHtml(board.displayName)}</td>
    <td>${escapeHtml(board.manufacturer || "—")}</td>
    <td>${escapeHtml(thicknessLabel(board.thicknessMm))}</td>
    <td>${escapeHtml(categoryLabel(board))}</td>
    ${availabilityCell}
  </tr>`;
}

function categoryOptions(boards: CatalogBoard[], selected?: MaterialCategory): string {
  const categories = new Map<MaterialCategory, string>();
  for (const board of boards) {
    if (!isMaterialCategory(board.category)) continue;
    categories.set(board.category, CATEGORY_LABELS[board.category]);
  }
  if (selected) categories.set(selected, CATEGORY_LABELS[selected]);
  const options = [...categories.entries()].sort((left, right) => left[1].localeCompare(right[1], "pl"));
  return [
    option("", "Wszystkie", selected == null),
    ...options.map(([value, label]) => option(value, label, value === selected)),
  ].join("");
}

function availabilityOptions(selected?: AvailabilityStatus): string {
  return [
    option("", "Wszystkie", selected == null),
    ...AVAILABILITY_STATUSES.map((status) => option(status, PAGE_AVAILABILITY_LABELS[status], status === selected)),
  ].join("");
}

function option(value: string, label: string, selected: boolean): string {
  const mark = selected ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${mark}>${escapeHtml(label)}</option>`;
}

function labeled(caption: string, name: string, options: string): string {
  return `<label><span>${caption}</span><select name="${name}" onchange="this.form.submit()">${options}</select></label>`;
}

function categoryLabel(board: CatalogBoard): string {
  if (isMaterialCategory(board.category)) return CATEGORY_LABELS[board.category];
  return board.categoryLabel || board.category;
}

function thicknessLabel(mm: number | null): string {
  if (mm == null || !Number.isFinite(mm)) return "—";
  const formatted = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(mm);
  return `${formatted} mm`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
