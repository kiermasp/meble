export interface CatalogBoard {
  externalCode: string;
  displayName: string;
  category: string;
  categoryLabel: string;
  manufacturer: string | null;
  thicknessMm: number | null;
  availability: string;
}

export function isCatalogBoard(value: unknown): value is CatalogBoard {
  if (value == null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.externalCode === "string" &&
    typeof row.displayName === "string" &&
    typeof row.category === "string" &&
    typeof row.categoryLabel === "string" &&
    (row.manufacturer === null || typeof row.manufacturer === "string") &&
    (row.thicknessMm === null || typeof row.thicknessMm === "number") &&
    typeof row.availability === "string"
  );
}
