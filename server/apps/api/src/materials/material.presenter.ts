import { AVAILABILITY_LABELS, CATEGORY_LABELS, type Material } from "@meble/domain";

export function presentMaterial(material: Material) {
  return {
    externalCode: material.externalCode,
    displayName: material.displayName,
    category: material.category,
    categoryLabel: CATEGORY_LABELS[material.category],
    structure: material.structure,
    thicknessMm: material.thicknessMm,
    availability: material.availability,
    availabilityLabel: AVAILABILITY_LABELS[material.availability],
    fetchedAt: material.fetchedAt.toISOString(),
  };
}
