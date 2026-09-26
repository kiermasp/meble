import { formatMoney, thicknessLabel } from "./catalog";

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
}

export const EDGEBAND_SORTS = ["code", "name", "manufacturer", "width", "thickness", "availability", "price"] as const;
export type EdgebandSort = (typeof EDGEBAND_SORTS)[number];
export type SortDirection = "asc" | "desc";

export interface EdgebandView {
  query: string;
  sort: EdgebandSort;
  direction: SortDirection;
  page: number;
}

export const EDGEBAND_PAGE_SIZE = 50;

const DEFAULT_VIEW: EdgebandView = {
  query: "",
  sort: "code",
  direction: "asc",
  page: 0,
};

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
    nullableString(row.currency)
  );
}

export function readEdgebandView(params: URLSearchParams): EdgebandView {
  const sort = params.get("sort");
  const direction = params.get("dir");
  const page = Number(params.get("page"));
  return {
    query: params.get("q") ?? "",
    sort: isEdgebandSort(sort) ? sort : DEFAULT_VIEW.sort,
    direction: direction === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page >= 0 ? page : 0,
  };
}

export function writeEdgebandView(view: EdgebandView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.query) params.set("q", view.query);
  if (view.sort !== DEFAULT_VIEW.sort) params.set("sort", view.sort);
  if (view.direction !== DEFAULT_VIEW.direction) params.set("dir", view.direction);
  if (view.page > 0) params.set("page", String(view.page));
  return params;
}

export function browseEdgebands(rows: CatalogEdgeband[], view: EdgebandView): CatalogEdgeband[] {
  const query = view.query.trim().toLocaleLowerCase("pl");
  const matched = query ? rows.filter((row) => searchText(row).includes(query)) : rows;
  return [...matched].sort((left, right) => compareEdgebands(left, right, view.sort, view.direction));
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
  const byRank = compareNullableNumber(availabilityRank(left.availability), availabilityRank(right.availability), direction);
  if (byRank !== 0) return byRank;
  return directedString(left.availability ?? "", right.availability ?? "", direction);
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
