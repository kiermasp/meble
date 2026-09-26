export interface CatalogBoard {
  mebleRefId: string;
  displayName: string;
  categoryId: string;
  category: string;
  categoryLabel: string;
  subtype: string | null;
  manufacturerId: string | null;
  manufacturer: string | null;
  decorCode: string | null;
  decorName: string | null;
  structure: string | null;
  thicknessMm: number | null;
  format: string | null;
  availability: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  decorKindId: string | null;
  decorKind: string | null;
  waterResistance: string | null;
  brightness: string | null;
  decorType: string | null;
  shade: string | null;
  color: string | null;
  statuses: string[];
  updatedAt: string;
}

export interface WarehouseFilters {
  category?: string[];
  manufacturer?: string[];
  thickness?: string[];
  structure?: string[];
  decorKind?: string[];
  format?: string[];
  waterResistance?: string[];
  brightness?: string[];
  decorType?: string[];
  shade?: string[];
  color?: string[];
  status?: string[];
}

export const GROUP_SORTS = ["name", "manufacturer", "price", "thickness"] as const;
export const ROW_SORTS = ["thickness", "structure", "availability", "price", "updated"] as const;
export type GroupSort = (typeof GROUP_SORTS)[number];
export type RowSort = (typeof ROW_SORTS)[number];
export type SortDirection = "asc" | "desc";

export interface CatalogSort {
  groups: GroupSort;
  groupDirection: SortDirection;
  rows: RowSort;
  rowDirection: SortDirection;
}

export interface VariantGroup {
  key: string;
  title: string;
  stock: CatalogBoard[];
  ordered: CatalogBoard[];
}

export interface FilterGroup {
  name: keyof WarehouseFilters;
  label: string;
  values: (board: CatalogBoard) => string[];
  optionLabel: (value: string) => string;
  compare: (left: string, right: string) => number;
}

const DEFAULT_SORT: CatalogSort = {
  groups: "name",
  groupDirection: "asc",
  rows: "thickness",
  rowDirection: "asc",
};

export const FILTER_GROUPS: FilterGroup[] = [
  { name: "category", label: "Kategoria", values: (board) => [board.categoryId], optionLabel: identity, compare: comparePl },
  { name: "manufacturer", label: "Producenci", values: (board) => present(board.manufacturerId), optionLabel: identity, compare: comparePl },
  {
    name: "thickness",
    label: "Grubość",
    values: (board) => (board.thicknessMm == null ? [] : [String(board.thicknessMm)]),
    optionLabel: (value) => thicknessLabel(Number(value)),
    compare: (left, right) => Number(left) - Number(right),
  },
  { name: "structure", label: "Struktura", values: (board) => present(board.structure), optionLabel: identity, compare: comparePl },
  { name: "decorKind", label: "Rodzaj dekoru", values: (board) => present(board.decorKindId), optionLabel: identity, compare: comparePl },
  { name: "format", label: "Format", values: (board) => present(board.format), optionLabel: identity, compare: comparePl },
  {
    name: "waterResistance",
    label: "Wodoodporność",
    values: (board) => present(board.waterResistance),
    optionLabel: identity,
    compare: comparePl,
  },
  { name: "brightness", label: "Jasność", values: (board) => present(board.brightness), optionLabel: identity, compare: comparePl },
  { name: "decorType", label: "Typ dekoru", values: (board) => present(board.decorType), optionLabel: identity, compare: comparePl },
  { name: "shade", label: "Odcień", values: (board) => present(board.shade), optionLabel: identity, compare: comparePl },
  { name: "color", label: "Kolor", values: (board) => present(board.color), optionLabel: identity, compare: comparePl },
  { name: "status", label: "Status", values: (board) => board.statuses, optionLabel: identity, compare: comparePl },
];

export function isCatalogBoard(value: unknown): value is CatalogBoard {
  if (value == null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.mebleRefId === "string" &&
    typeof row.displayName === "string" &&
    typeof row.categoryId === "string" &&
    typeof row.category === "string" &&
    typeof row.categoryLabel === "string" &&
    nullableString(row.subtype) &&
    nullableString(row.manufacturerId) &&
    nullableString(row.manufacturer) &&
    nullableString(row.decorCode) &&
    nullableString(row.decorName) &&
    nullableString(row.structure) &&
    nullableNumber(row.thicknessMm) &&
    nullableString(row.format) &&
    nullableString(row.availability) &&
    nullableNumber(row.unitPriceAmount) &&
    nullableString(row.currency) &&
    nullableString(row.decorKindId) &&
    nullableString(row.decorKind) &&
    nullableString(row.waterResistance) &&
    nullableString(row.brightness) &&
    nullableString(row.decorType) &&
    nullableString(row.shade) &&
    nullableString(row.color) &&
    Array.isArray(row.statuses) &&
    row.statuses.every((status) => typeof status === "string") &&
    typeof row.updatedAt === "string" &&
    !Number.isNaN(Date.parse(row.updatedAt))
  );
}

export function filterOptions(boards: CatalogBoard[], group: FilterGroup): string[] {
  return [...new Set(boards.flatMap(group.values))].sort(group.compare);
}

export function toggleFilter(filters: WarehouseFilters, name: keyof WarehouseFilters, value: string): WarehouseFilters {
  const current = filters[name] ?? [];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return { ...filters, [name]: next.length === 0 ? undefined : next };
}

export function readViewState(params: URLSearchParams): { filters: WarehouseFilters; sort: CatalogSort } {
  const filters: WarehouseFilters = {};
  for (const group of FILTER_GROUPS) {
    const values = params.getAll(group.name).filter((value) => value !== "");
    if (values.length > 0) filters[group.name] = values;
  }
  const groups = params.get("sort");
  const rows = params.get("row");
  return {
    filters,
    sort: {
      groups: isGroupSort(groups) ? groups : DEFAULT_SORT.groups,
      groupDirection: params.get("dir") === "desc" ? "desc" : "asc",
      rows: isRowSort(rows) ? rows : DEFAULT_SORT.rows,
      rowDirection: params.get("rowDir") === "desc" ? "desc" : "asc",
    },
  };
}

export function writeViewState(filters: WarehouseFilters, sort: CatalogSort): URLSearchParams {
  const params = new URLSearchParams();
  for (const group of FILTER_GROUPS) {
    for (const value of filters[group.name] ?? []) params.append(group.name, value);
  }
  if (sort.groups !== DEFAULT_SORT.groups) params.set("sort", sort.groups);
  if (sort.groupDirection !== DEFAULT_SORT.groupDirection) params.set("dir", sort.groupDirection);
  if (sort.rows !== DEFAULT_SORT.rows) params.set("row", sort.rows);
  if (sort.rowDirection !== DEFAULT_SORT.rowDirection) params.set("rowDir", sort.rowDirection);
  return params;
}

export function viewCatalog(boards: CatalogBoard[], filters: WarehouseFilters, sort: CatalogSort): VariantGroup[] {
  const visible = boards.filter((board) => matches(board, filters));
  return groupBoards(visible)
    .sort((left, right) => compareGroups(left, right, sort))
    .map((rows) => toVariantGroup(rows, sort));
}

export function thicknessLabel(mm: number | null): string {
  if (mm == null || !Number.isFinite(mm)) return "—";
  return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(mm)} mm`;
}

export function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const formatted = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  if (currency == null || currency === "PLN") return `${formatted} zł`;
  return `${formatted} ${currency}`;
}

export function priceLabel(board: CatalogBoard): string {
  return formatMoney(board.unitPriceAmount, board.currency);
}

export function updatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

export function isOrderVariant(board: CatalogBoard): boolean {
  return (board.decorKind ?? "").toLocaleLowerCase("pl").includes("na zamówienie");
}

function toVariantGroup(rows: CatalogBoard[], sort: CatalogSort): VariantGroup {
  const sample = rows[0];
  const title = [sample.manufacturer, sample.decorCode, sample.decorName].filter((part) => part).join(" ");
  return {
    key: JSON.stringify([sample.manufacturer, sample.decorCode, sample.decorName]),
    title: title || sample.displayName,
    stock: rows.filter((board) => !isOrderVariant(board)).sort((left, right) => compareRows(left, right, sort)),
    ordered: rows.filter(isOrderVariant).sort((left, right) => compareRows(left, right, sort)),
  };
}

function matches(board: CatalogBoard, filters: WarehouseFilters): boolean {
  return FILTER_GROUPS.every((group) => {
    const selected = filters[group.name];
    if (!selected || selected.length === 0) return true;
    return selected.some((choice) => group.values(board).includes(choice));
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
  return [...groups.values()];
}

function compareGroups(left: CatalogBoard[], right: CatalogBoard[], sort: CatalogSort): number {
  const compared = compareGroupKey(left, right, sort);
  if (compared !== 0) return compared;
  return comparePl(left[0].decorCode ?? "", right[0].decorCode ?? "");
}

function compareGroupKey(left: CatalogBoard[], right: CatalogBoard[], sort: CatalogSort): number {
  if (sort.groups === "name") {
    return directedString(left[0].decorName ?? left[0].displayName, right[0].decorName ?? right[0].displayName, sort.groupDirection);
  }
  if (sort.groups === "manufacturer") {
    return directedString(left[0].manufacturer ?? "", right[0].manufacturer ?? "", sort.groupDirection);
  }
  if (sort.groups === "price") {
    return compareNullableNumber(minNumber(left.map((board) => board.unitPriceAmount)), minNumber(right.map((board) => board.unitPriceAmount)), sort.groupDirection);
  }
  return compareNullableNumber(minNumber(left.map((board) => board.thicknessMm)), minNumber(right.map((board) => board.thicknessMm)), sort.groupDirection);
}

function compareRows(left: CatalogBoard, right: CatalogBoard, sort: CatalogSort): number {
  const primary = compareRowKey(left, right, sort);
  if (primary !== 0) return primary;
  const thickness = compareNullableNumber(left.thicknessMm, right.thicknessMm, "asc");
  if (thickness !== 0) return thickness;
  return comparePl(left.structure ?? "", right.structure ?? "");
}

function compareRowKey(left: CatalogBoard, right: CatalogBoard, sort: CatalogSort): number {
  if (sort.rows === "thickness") return compareNullableNumber(left.thicknessMm, right.thicknessMm, sort.rowDirection);
  if (sort.rows === "structure") return directedString(left.structure ?? "", right.structure ?? "", sort.rowDirection);
  if (sort.rows === "price") return compareNullableNumber(left.unitPriceAmount, right.unitPriceAmount, sort.rowDirection);
  if (sort.rows === "updated") return compareNullableNumber(timestamp(left.updatedAt), timestamp(right.updatedAt), sort.rowDirection);
  const byRank = compareNullableNumber(availabilityRank(left.availability), availabilityRank(right.availability), sort.rowDirection);
  if (byRank !== 0) return byRank;
  return directedString(left.availability ?? "", right.availability ?? "", sort.rowDirection);
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

function minNumber(values: Array<number | null>): number | null {
  const presentValues = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (presentValues.length === 0) return null;
  return Math.min(...presentValues);
}

function compareNullableNumber(left: number | null, right: number | null, direction: SortDirection): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const delta = left - right;
  return direction === "asc" ? delta : -delta;
}

function directedString(left: string, right: string, direction: SortDirection): number {
  const delta = comparePl(left, right);
  return direction === "asc" ? delta : -delta;
}

function comparePl(left: string, right: string): number {
  return left.localeCompare(right, "pl");
}

function present(value: string | null): string[] {
  return value ? [value] : [];
}

function identity(value: string): string {
  return value;
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function nullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}

function isGroupSort(value: string | null): value is GroupSort {
  return GROUP_SORTS.some((sort) => sort === value);
}

function isRowSort(value: string | null): value is RowSort {
  return ROW_SORTS.some((sort) => sort === value);
}
