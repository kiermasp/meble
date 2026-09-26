import { sectionLabel, type Material } from "@meble/domain";

export function presentMaterial(material: Material) {
  return {
    mebleRefId: material.mebleRefId,
    displayName: material.displayName,
    category: material.category,
    categoryLabel: sectionLabel(material.category),
    subtype: material.subtype,
    manufacturer: material.manufacturer,
    decorCode: material.decorCode,
    decorName: material.decorName,
    structure: material.structure,
    thicknessMm: material.thicknessMm,
    format: material.format,
    availability: material.availability,
    unitPriceAmount: material.unitPriceAmount,
    currency: material.currency,
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
