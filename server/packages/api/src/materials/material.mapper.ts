import type { Material } from "@meble/domain";
import { MaterialRow } from "./material.row";

export interface StoredMaterial extends Material {
  id: string;
  categoryId: string;
  categoryLabel: string;
  manufacturerId: string | null;
  decorKindId: string | null;
}

export function toMaterial(row: MaterialRow): StoredMaterial {
  const statuses = (row.collectionLinks ?? [])
    .flatMap((link) => (link.status ? [link.status] : []))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "pl"));
  return {
    id: row.id,
    mebleRefId: row.mebleRefId,
    displayName: row.displayName,
    categoryId: row.categoryId,
    category: row.category.code,
    categoryLabel: row.category.name,
    subtype: row.subtype,
    manufacturerId: row.manufacturerId,
    manufacturer: row.manufacturer?.name ?? null,
    decorCode: row.decorCode,
    decorName: row.decorName,
    structure: row.structure,
    thicknessMm: row.thicknessMm,
    format: row.format,
    availability: row.availability,
    unitPriceAmount: row.unitPriceAmount,
    currency: row.currency,
    decorKindId: row.decorKindId,
    decorKind: row.decorKind?.name ?? null,
    waterResistance: row.waterResistance?.name ?? null,
    brightness: row.brightness?.name ?? null,
    decorType: row.decorType?.name ?? null,
    shade: row.shade?.name ?? null,
    color: row.color?.name ?? null,
    statuses: statuses.map((status) => status.name),
    fetchedAt: new Date(row.fetchedAt),
  };
}
