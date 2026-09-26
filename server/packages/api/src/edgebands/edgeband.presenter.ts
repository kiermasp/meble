import type { Edgeband } from "@meble/domain";

export function presentEdgeband(edgeband: Edgeband & { id: string }) {
  return {
    id: edgeband.id,
    externalCode: edgeband.externalCode,
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
  };
}
