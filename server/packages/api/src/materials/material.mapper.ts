import {
  isAvailabilityStatus,
  isMaterialCategory,
  type Material,
} from "@meble/domain";
import { MaterialRow } from "./material.row";

export function toMaterial(row: MaterialRow): Material {
  if (!isMaterialCategory(row.category)) {
    throw new Error(`Unknown category in storage: ${row.category}`);
  }
  if (!isAvailabilityStatus(row.availability)) {
    throw new Error(`Unknown availability in storage: ${row.availability}`);
  }
  return {
    externalCode: row.externalCode,
    displayName: row.displayName,
    category: row.category,
    manufacturer: row.manufacturer,
    structure: row.structure,
    thicknessMm: row.thicknessMm,
    availability: row.availability,
    fetchedAt: new Date(row.fetchedAt),
  };
}
