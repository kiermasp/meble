export interface CatalogBoard {
  externalCode: string;
  displayName: string;
  category: string;
  categoryLabel: string;
  subtype: string | null;
  manufacturer: string | null;
  decorCode: string | null;
  decorName: string | null;
  structure: string | null;
  thicknessMm: number | null;
  format: string | null;
  availability: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  decorKind: string | null;
  waterResistance: string | null;
  brightness: string | null;
  decorType: string | null;
  shade: string | null;
  color: string | null;
  statuses: string[];
}

export function isCatalogBoard(value: unknown): value is CatalogBoard {
  if (value == null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.externalCode === "string" &&
    typeof row.displayName === "string" &&
    typeof row.category === "string" &&
    typeof row.categoryLabel === "string" &&
    nullableString(row.subtype) &&
    nullableString(row.manufacturer) &&
    nullableString(row.decorCode) &&
    nullableString(row.decorName) &&
    nullableString(row.structure) &&
    nullableNumber(row.thicknessMm) &&
    nullableString(row.format) &&
    nullableString(row.availability) &&
    nullableNumber(row.unitPriceAmount) &&
    nullableString(row.currency) &&
    nullableString(row.decorKind) &&
    nullableString(row.waterResistance) &&
    nullableString(row.brightness) &&
    nullableString(row.decorType) &&
    nullableString(row.shade) &&
    nullableString(row.color) &&
    Array.isArray(row.statuses) &&
    row.statuses.every((status) => typeof status === "string")
  );
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function nullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number";
}
