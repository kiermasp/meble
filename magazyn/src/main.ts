import "./style.css";

interface Board {
  externalCode: string;
  displayName: string;
  category: string;
  categoryLabel: string;
  availability: Availability;
}

type Availability = "in_stock" | "on_order" | "on_order_pallet";

const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "na magazynie",
  on_order: "na zamówienie",
  on_order_pallet: "na zamówienie — paleta",
};

const AVAILABILITY_ORDER: Availability[] = ["in_stock", "on_order", "on_order_pallet"];

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3010").replace(/\/$/, "");

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Brak elementu #app");
}

const categorySelect = document.createElement("select");
const availabilitySelect = document.createElement("select");
const summary = document.createElement("p");
const tableBody = document.createElement("tbody");
const message = document.createElement("p");

app.append(
  heading(),
  filters(),
  summary,
  message,
  table(),
);

let boards: Board[] = [];

void load();

function heading(): HTMLElement {
  const header = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = "Magazyn";
  const note = document.createElement("p");
  note.textContent = "Dostępność płyt z katalogu meble.pl.";
  header.append(title, note);
  return header;
}

function filters(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "filters";
  categorySelect.addEventListener("change", renderRows);
  availabilitySelect.addEventListener("change", renderRows);
  bar.append(labeled("Kategoria", categorySelect), labeled("Dostępność", availabilitySelect));
  return bar;
}

function labeled(text: string, control: HTMLSelectElement): HTMLLabelElement {
  const label = document.createElement("label");
  const caption = document.createElement("span");
  caption.textContent = text;
  label.append(caption, control);
  return label;
}

function table(): HTMLTableElement {
  const element = document.createElement("table");
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  for (const label of ["Kod", "Nazwa", "Kategoria", "Dostępność"]) {
    const cell = document.createElement("th");
    cell.textContent = label;
    row.append(cell);
  }
  head.append(row);
  element.append(head, tableBody);
  return element;
}

async function load(): Promise<void> {
  message.textContent = "Wczytywanie…";
  try {
    const response = await fetch(`${apiBase}/materials`);
    if (!response.ok) {
      throw new Error(`API zwróciło HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("API nie zwróciło JSON");
    }
    boards = (await response.json()) as Board[];
    message.textContent = "";
    fillFilters();
    renderRows();
  } catch (error) {
    boards = [];
    tableBody.replaceChildren();
    summary.textContent = "";
    message.textContent = error instanceof Error ? error.message : "Nie udało się pobrać katalogu";
  }
}

function fillFilters(): void {
  const categories = new Map<string, string>();
  for (const board of boards) {
    categories.set(board.category, board.categoryLabel || board.category);
  }
  fillSelect(
    categorySelect,
    [...categories.entries()]
      .sort((left, right) => left[1].localeCompare(right[1], "pl"))
      .map(([value, label]) => ({ value, label })),
  );
  fillSelect(
    availabilitySelect,
    AVAILABILITY_ORDER.map((value) => ({ value, label: AVAILABILITY_LABELS[value] })),
  );
}

function fillSelect(select: HTMLSelectElement, options: Array<{ value: string; label: string }>): void {
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "Wszystkie";
  select.append(all);
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
}

function renderRows(): void {
  const category = categorySelect.value;
  const availability = availabilitySelect.value;
  const visible = boards
    .filter((board) => !category || board.category === category)
    .filter((board) => !availability || board.availability === availability)
    .sort((left, right) => left.externalCode.localeCompare(right.externalCode, "pl"));

  summary.textContent = `${visible.length} z ${boards.length}`;
  tableBody.replaceChildren(
    ...visible.map((board) => {
      const row = document.createElement("tr");
      row.append(
        cell(board.externalCode),
        cell(board.displayName),
        cell(board.categoryLabel || board.category),
        availabilityCell(board.availability),
      );
      return row;
    }),
  );
}

function cell(text: string): HTMLTableCellElement {
  const element = document.createElement("td");
  element.textContent = text;
  return element;
}

function availabilityCell(availability: Availability): HTMLTableCellElement {
  const element = document.createElement("td");
  const mark = document.createElement("span");
  mark.className = `status ${availability}`;
  mark.textContent = AVAILABILITY_LABELS[availability] ?? availability;
  element.append(mark);
  return element;
}
