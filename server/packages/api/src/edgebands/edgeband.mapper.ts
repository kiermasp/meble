import type { Edgeband } from "@meble/domain";
import { EdgebandRow } from "./edgeband.row";

export function toEdgeband(row: EdgebandRow): Edgeband & { id: string } {
  return {
    id: row.id,
    externalCode: row.externalCode,
    displayName: row.displayName,
    code: row.code,
    name: row.name,
    manufacturer: row.manufacturer,
    structure: row.structure,
    widthMm: row.widthMm,
    thicknessMm: row.thicknessMm,
    availability: row.availability,
    unitPriceAmount: row.unitPriceAmount,
    currency: row.currency,
    fetchedAt: new Date(row.fetchedAt),
  };
}
