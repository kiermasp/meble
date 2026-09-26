import { isShopSection, type Material } from "@meble/domain";
import { MaterialRow } from "./material.row";

export function toMaterial(row: MaterialRow): Material {
  if (!isShopSection(row.category)) {
    throw new Error(`Unknown category in storage: ${row.category}`);
  }
  return {
    externalCode: row.externalCode,
    displayName: row.displayName,
    category: row.category,
    subtype: row.subtype,
    manufacturer: row.manufacturer,
    decorCode: row.decorCode,
    decorName: row.decorName,
    structure: row.structure,
    thicknessMm: row.thicknessMm,
    format: row.format,
    availability: row.availability,
    unitPriceAmount: row.unitPriceAmount,
    currency: row.currency,
    decorKind: row.decorKind,
    waterResistance: row.waterResistance,
    brightness: row.brightness,
    decorType: row.decorType,
    shade: row.shade,
    color: row.color,
    statuses: row.statuses ?? [],
    fetchedAt: new Date(row.fetchedAt),
  };
}
