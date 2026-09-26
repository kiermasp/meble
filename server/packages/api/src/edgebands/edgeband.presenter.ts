import type { StoredEdgeband } from "./edgeband.mapper";

export function presentEdgeband(edgeband: StoredEdgeband) {
  return {
    id: edgeband.id,
    mebleRefId: edgeband.mebleRefId,
    displayName: edgeband.displayName,
    code: edgeband.code,
    name: edgeband.name,
    manufacturer: edgeband.manufacturer,
    structure: edgeband.structure,
    widthMm: edgeband.widthMm,
    thicknessMm: edgeband.thicknessMm,
    availability: edgeband.availability,
    unitPriceAmount: edgeband.unitPriceAmount,
    currency: edgeband.currency,
    fetchedAt: edgeband.fetchedAt.toISOString(),
    updatedAt: edgeband.updatedAt.toISOString(),
  };
}
