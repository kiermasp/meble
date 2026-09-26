import type { StoredMaterial } from "./material.mapper";

export function presentMaterial(material: StoredMaterial) {
  return {
    id: material.id,
    mebleRefId: material.mebleRefId,
    displayName: material.displayName,
    categoryId: material.categoryId,
    category: material.category,
    categoryLabel: material.categoryLabel,
    subtype: material.subtype,
    manufacturerId: material.manufacturerId,
    manufacturer: material.manufacturer,
    decorCode: material.decorCode,
    decorName: material.decorName,
    structure: material.structure,
    thicknessMm: material.thicknessMm,
    format: material.format,
    availability: material.availability,
    unitPriceAmount: material.unitPriceAmount,
    currency: material.currency,
    decorKindId: material.decorKindId,
    decorKind: material.decorKind,
    waterResistance: material.waterResistance,
    brightness: material.brightness,
    decorType: material.decorType,
    shade: material.shade,
    color: material.color,
    statuses: material.statuses,
    fetchedAt: material.fetchedAt.toISOString(),
  };
}
