import type { Edgeband, Material } from "@meble/domain";

/** Last time the stored catalog row itself changed. A later fetch that copies the same fields keeps the previous date. */
export function nextUpdatedAt(
  previous: { updatedAt: Date; fetchedAt: Date } | undefined,
  fetchedAt: Date,
  changed: boolean,
): Date {
  if (!previous || changed) return fetchedAt;
  const updated = previous.updatedAt.getTime();
  const fetched = previous.fetchedAt.getTime();
  if (!Number.isFinite(updated) || !Number.isFinite(fetched)) return fetchedAt;
  return updated <= fetched ? previous.updatedAt : previous.fetchedAt;
}

export function materialContentChanged(previous: Material, incoming: Material): boolean {
  return stable(materialContent(previous)) !== stable(materialContent(incoming));
}

export function edgebandContentChanged(previous: Edgeband, incoming: Edgeband): boolean {
  return stable(edgebandContent(previous)) !== stable(edgebandContent(incoming));
}

function materialContent(material: Material) {
  return {
    displayName: material.displayName,
    category: material.category,
    subtype: material.subtype,
    manufacturer: material.manufacturer,
    decorCode: material.decorCode,
    decorName: material.decorName,
    structure: material.structure,
    thicknessMm: roundMm(material.thicknessMm),
    format: material.format,
    availability: material.availability,
    unitPriceAmount: roundMoney(material.unitPriceAmount),
    currency: material.currency,
    decorKind: material.decorKind,
    waterResistance: material.waterResistance,
    brightness: material.brightness,
    decorType: material.decorType,
    shade: material.shade,
    color: material.color,
    statuses: [...material.statuses].sort((left, right) => left.localeCompare(right, "pl")),
  };
}

function edgebandContent(edgeband: Edgeband) {
  return {
    displayName: edgeband.displayName,
    code: edgeband.code,
    name: edgeband.name,
    manufacturer: edgeband.manufacturer,
    structure: edgeband.structure,
    widthMm: roundMm(edgeband.widthMm),
    thicknessMm: roundMm(edgeband.thicknessMm),
    availability: edgeband.availability,
    unitPriceAmount: roundMoney(edgeband.unitPriceAmount),
    currency: edgeband.currency,
  };
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

function roundMm(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
