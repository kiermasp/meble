import { formatMoney, thicknessLabel, updatedLabel } from "./catalog";

export interface CatalogEdgeband {
  mebleRefId: string;
  displayName: string;
  code: string | null;
  name: string | null;
  manufacturer: string | null;
  structure: string | null;
  widthMm: number | null;
  thicknessMm: number | null;
  availability: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  updatedAt: string;
}

export const EDGEBAND_SORTS = ["code", "name", "manufacturer", "width", "thickness", "availability", "price", "updated"] as const;
export type EdgebandSort = (typeof EDGEBAND_SORTS)[number];
export type SortDirection = "asc" | "desc";

export const EDGEBAND_FILTER_NAMES = ["manufacturer", "kind", "thickness", "structure", "format"] as const;
export type EdgebandFilterName = (typeof EDGEBAND_FILTER_NAMES)[number];
export type EdgebandFilters = Partial<Record<EdgebandFilterName, string[]>>;

export interface EdgebandFilterGroup {
  name: EdgebandFilterName;
  label: string;
  open: boolean;
  value: (row: CatalogEdgeband) => string | null;
  optionLabel: (value: string) => string;
  compare: (left: string, right: string) => number;
}

export interface EdgebandFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface EdgebandView {
  query: string;
  sort: EdgebandSort;
  direction: SortDirection;
  page: number;
  filters: EdgebandFilters;
}

export const EDGEBAND_PAGE_SIZE = 50;

const KIND_ORDER = ["Grip", "Laserowe", "Wzdłużne"];

const DEFAULT_VIEW: EdgebandView = {
  query: "",
  sort: "code",
  direction: "asc",
  page: 0,
  filters: {},
};

export const EDGEBAND_FILTER_GROUPS: EdgebandFilterGroup[] = [
  {
    name: "manufacturer",
    label: "Producenci",
    open: true,
    value: (row) => row.manufacturer,
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "kind",
    label: "Rodzaj obrzeża",
    open: true,
    value: edgebandKind,
    optionLabel: identity,
    compare: (left, right) => KIND_ORDER.indexOf(left) - KIND_ORDER.indexOf(right),
  },
  {
    name: "thickness",
    label: "Grubość",
    open: false,
    value: (row) => (row.thicknessMm == null ? null : String(row.thicknessMm)),
    optionLabel: (value) => thicknessLabel(Number(value)),
    compare: (left, right) => Number(left) - Number(right),
  },
  {
    name: "structure",
    label: "Struktura",
    open: false,
    value: (row) => row.structure,
    optionLabel: identity,
    compare: comparePl,
  },
  {
    name: "format",
    label: "Format",
    open: false,
    value: edgebandFormat,
    optionLabel: formatOptionLabel,
    compare: compareFormat,
  },
];

export function normalizeCatalogEdgeband(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  if (typeof row.updatedAt === "string" || typeof row.fetchedAt !== "string") return value;
  return { ...row, updatedAt: row.fetchedAt };
}

export function isCatalogEdgeband(value: unknown): value is CatalogEdgeband {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.mebleRefId === "string" &&
    typeof row.displayName === "string" &&
    nullableString(row.code) &&
    nullableString(row.name) &&
    nullableString(row.manufacturer) &&
    nullableString(row.structure) &&
    nullableNumber(row.widthMm) &&
    nullableNumber(row.thicknessMm) &&
    nullableString(row.availability) &&
    nullableNumber(row.unitPriceAmount) &&
    nullableString(row.currency) &&
    typeof row.updatedAt === "string" &&
    !Number.isNaN(Date.parse(row.updatedAt))
  );
}

export function readEdgebandView(params: URLSearchParams): EdgebandView {
  const sort = params.get("sort");
  const direction = params.get("dir");
  const page = Number(params.get("page"));
  const filters: EdgebandFilters = {};
  for (const name of EDGEBAND_FILTER_NAMES) {
    const values = params.getAll(name).filter((value) => value !== "");
    if (values.length > 0) filters[name] = values;
  }
  return {
    query: params.get("q") ?? "",
    sort: isEdgebandSort(sort) ? sort : DEFAULT_VIEW.sort,
    direction: direction === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page >= 0 ? page : 0,
    filters,
  };
}

export function writeEdgebandView(view: EdgebandView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.query) params.set("q", view.query);
  for (const name of EDGEBAND_FILTER_NAMES) {
    for (const value of view.filters[name] ?? []) params.append(name, value);
  }
  if (view.sort !== DEFAULT_VIEW.sort) params.set("sort", view.sort);
  if (view.direction !== DEFAULT_VIEW.direction) params.set("dir", view.direction);
  if (view.page > 0) params.set("page", String(view.page));
  return params;
}

export function toggleEdgebandFilter(filters: EdgebandFilters, name: EdgebandFilterName, value: string): EdgebandFilters {
  const current = filters[name] ?? [];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return { ...filters, [name]: next.length === 0 ? undefined : next };
}

export function edgebandFilterOptions(rows: CatalogEdgeband[], view: EdgebandView): Array<EdgebandFilterGroup & { options: EdgebandFilterOption[] }> {
  const queried = rowsMatchingQuery(rows, view.query);
  return EDGEBAND_FILTER_GROUPS.map((group) => {
    const pool = queried.filter((row) => matchesFilters(row, view.filters, group.name));
    const counts = new Map<string, number>();
    for (const row of pool) {
      const value = group.value(row);
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const selected = view.filters[group.name] ?? [];
    for (const value of selected) {
      if (!counts.has(value)) counts.set(value, 0);
    }
    const options = [...counts.entries()]
      .filter(([value, count]) => count > 0 || selected.includes(value))
      .sort((left, right) => group.compare(left[0], right[0]))
      .map(([value, count]) => ({ value, label: group.optionLabel(value), count }));
    return { ...group, options };
  }).filter((group) => group.options.length > 0);
}

export function browseEdgebands(rows: CatalogEdgeband[], view: EdgebandView): CatalogEdgeband[] {
  const matched = rowsMatchingQuery(rows, view.query).filter((row) => matchesFilters(row, view.filters));
  return [...matched].sort((left, right) => compareEdgebands(left, right, view.sort, view.direction));
}

export function edgebandKind(row: CatalogEdgeband): "Grip" | "Laserowe" | "Wzdłużne" {
  const name = row.displayName.toLocaleLowerCase("pl");
  if (name.includes("grip")) return "Grip";
  if (name.includes("laser")) return "Laserowe";
  return "Wzdłużne";
}

export function edgebandFormat(row: CatalogEdgeband): string | null {
  if (row.thicknessMm == null || row.widthMm == null) return null;
  return `${row.thicknessMm}x${row.widthMm}`;
}

export function pageOf(rows: CatalogEdgeband[], page: number): CatalogEdgeband[] {
  const start = Math.max(0, page) * EDGEBAND_PAGE_SIZE;
  return rows.slice(start, start + EDGEBAND_PAGE_SIZE);
}

export function edgebandPrice(row: CatalogEdgeband): string {
  return formatMoney(row.unitPriceAmount, row.currency);
}

export function millimetres(value: number | null): string {
  return thicknessLabel(value);
}

export function edgebandUpdated(row: CatalogEdgeband): string {
  return updatedLabel(row.updatedAt);
}

function rowsMatchingQuery(rows: CatalogEdgeband[], query: string): CatalogEdgeband[] {
  const needle = query.trim().toLocaleLowerCase("pl");
  if (!needle) return rows;
  return rows.filter((row) => searchText(row).includes(needle));
}

function matchesFilters(row: CatalogEdgeband, filters: EdgebandFilters, skip?: EdgebandFilterName): boolean {
  return EDGEBAND_FILTER_GROUPS.every((group) => {
    if (group.name === skip) return true;
    const selected = filters[group.name];
    if (!selected || selected.length === 0) return true;
    const value = group.value(row);
    return value != null && selected.includes(value);
  });
}

function formatOptionLabel(value: string): string {
  const [thickness, width] = value.split("x");
  const thicknessText = thicknessLabel(Number(thickness)).replace(/ mm$/, "");
  return `${thicknessText}x${thicknessLabel(Number(width))}`;
}

function compareFormat(left: string, right: string): number {
  const [leftThickness, leftWidth] = left.split("x").map(Number);
  const [rightThickness, rightWidth] = right.split("x").map(Number);
  return leftThickness - rightThickness || leftWidth - rightWidth;
}

function comparePl(left: string, right: string): number {
  return left.localeCompare(right, "pl");
}

function identity(value: string): string {
  return value;
}

function searchText(row: CatalogEdgeband): string {
  return [row.code, row.name, row.manufacturer, row.displayName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLocaleLowerCase("pl");
}

function compareEdgebands(left: CatalogEdgeband, right: CatalogEdgeband, sort: EdgebandSort, direction: SortDirection): number {
  const primary = compareKey(left, right, sort, direction);
  if (primary !== 0) return primary;
  const code = directedString(left.code ?? "", right.code ?? "", "asc");
  if (code !== 0) return code;
  const width = compareNullableNumber(left.widthMm, right.widthMm, "asc");
  if (width !== 0) return width;
  return compareNullableNumber(left.thicknessMm, right.thicknessMm, "asc");
}

function compareKey(left: CatalogEdgeband, right: CatalogEdgeband, sort: EdgebandSort, direction: SortDirection): number {
  if (sort === "code") return directedString(left.code ?? "", right.code ?? "", direction);
  if (sort === "name") return directedString(left.name ?? "", right.name ?? "", direction);
  if (sort === "manufacturer") return directedString(left.manufacturer ?? "", right.manufacturer ?? "", direction);
  if (sort === "width") return compareNullableNumber(left.widthMm, right.widthMm, direction);
  if (sort === "thickness") return compareNullableNumber(left.thicknessMm, right.thicknessMm, direction);
  if (sort === "price") return compareNullableNumber(left.unitPriceAmount, right.unitPriceAmount, direction);
  if (sort === "updated") return compareNullableNumber(timestamp(left.updatedAt), timestamp(right.updatedAt), direction);
  const byRank = compareNullableNumber(availabilityRank(left.availability), availabilityRank(right.availability), direction);
  if (byRank !== 0) return byRank;
  return directedString(left.availability ?? "", right.availability ?? "", direction);
}

function timestamp(iso: string): number | null {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

function availabilityRank(value: string | null): number | null {
  if (!value) return null;
  const hours = value.match(/^(\d+)\s*h$/i);
  if (hours) return Number(hours[1]);
  const days = value.match(/^(\d+)\s*dni$/i);
  if (days) return Number(days[1]) * 24;
  return null;
}

function compareNullableNumber(left: number | null, right: number | null, direction: SortDirection): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const delta = left - right;
  return direction === "asc" ? delta : -delta;
}

function directedString(left: string, right: string, direction: SortDirection): number {
  const delta = left.localeCompare(right, "pl");
  return direction === "asc" ? delta : -delta;
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function nullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}

function isEdgebandSort(value: string | null): value is EdgebandSort {
  return EDGEBAND_SORTS.some((sort) => sort === value);
}
