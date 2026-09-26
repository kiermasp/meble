export const MATERIAL_CATEGORIES = [
  "plyty-meblowe",
  "plyty-akrylowe",
  "plyty-wysoki-polysk",
  "plyty-gleboki-mat",
  "plyty-crystal",
  "plyty-tss-cleaf",
  "hdf",
  "grip",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  "plyty-meblowe": "Płyta meblowa",
  "plyty-akrylowe": "Płyta akrylowa",
  "plyty-wysoki-polysk": "Wysoki połysk",
  "plyty-gleboki-mat": "Głęboki mat",
  "plyty-crystal": "Rauvisio Crystal",
  "plyty-tss-cleaf": "TSS Cleaf",
  hdf: "HDF",
  grip: "Rauvisio Grip",
};

export function isMaterialCategory(value: string): value is MaterialCategory {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

/** Green, orange, and red tiles on the meble.pl board dialog. */
export const AVAILABILITY_STATUSES = [
  "in_stock",
  "on_order",
  "on_order_pallet",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  in_stock: "na magazynie",
  on_order: "na zamówienie",
  on_order_pallet: "na zamówienie — minimalna ilość to paleta",
};

export function isAvailabilityStatus(value: string): value is AvailabilityStatus {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(value);
}

export interface Material {
  externalCode: string;
  displayName: string;
  category: MaterialCategory;
  structure: string | null;
  thicknessMm: number | null;
  availability: AvailabilityStatus;
  fetchedAt: Date;
}
