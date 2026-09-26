import type { Edgeband, Material } from "@meble/domain";
import { edgebandContentChanged, materialContentChanged, nextUpdatedAt } from "./catalog-updated-at";

const earlier = new Date("2026-09-26T10:00:00.000Z");
const later = new Date("2026-09-26T13:00:00.000Z");

function board(overrides: Partial<Material> = {}): Material {
  return {
    mebleRefId: "5829997",
    displayName: "Płyta",
    category: "plyty-meblowe",
    subtype: null,
    manufacturer: "Egger",
    decorCode: "W960",
    decorName: "Biały",
    structure: "SM",
    thicknessMm: 18,
    format: "2070x2800",
    availability: "48h",
    unitPriceAmount: 227.45,
    currency: "PLN",
    decorKind: "Magazynowe",
    waterResistance: null,
    brightness: null,
    decorType: null,
    shade: null,
    color: null,
    statuses: ["Kolekcja 26+", "Nowość"],
    fetchedAt: earlier,
    ...overrides,
  };
}

function tape(overrides: Partial<Edgeband> = {}): Edgeband {
  return {
    mebleRefId: "1050019",
    displayName: "Obrzeże",
    code: "U702",
    name: "Kaszmir",
    manufacturer: "Egger",
    structure: "ST9",
    widthMm: 23,
    thicknessMm: 0.8,
    availability: "24h",
    unitPriceAmount: 1.67,
    currency: "PLN",
    fetchedAt: earlier,
    ...overrides,
  };
}

describe("nextUpdatedAt", () => {
  it("uses the fetch time for a new or changed row", () => {
    expect(nextUpdatedAt(undefined, later, true)).toBe(later);
    expect(nextUpdatedAt({ updatedAt: earlier, fetchedAt: earlier }, later, true)).toBe(later);
  });

  it("keeps the previous change when the next fetch copies the same fields", () => {
    expect(nextUpdatedAt({ updatedAt: earlier, fetchedAt: earlier }, later, false)).toEqual(earlier);
  });

  it("falls back to the last fetch when a column default is newer than the stored data", () => {
    const migrated = new Date("2026-09-26T18:00:00.000Z");
    expect(nextUpdatedAt({ updatedAt: migrated, fetchedAt: earlier }, later, false)).toEqual(earlier);
  });
});

describe("catalog content", () => {
  it("ignores status order and the fetch timestamp", () => {
    const previous = board();
    const incoming = board({
      statuses: ["Nowość", "Kolekcja 26+"],
      fetchedAt: later,
      unitPriceAmount: 227.4500001,
    });
    expect(materialContentChanged(previous, incoming)).toBe(false);
    expect(materialContentChanged(previous, board({ unitPriceAmount: 230 }))).toBe(true);
  });

  it("treats an edgeband price change as an update and a repeated fetch as the same row", () => {
    expect(edgebandContentChanged(tape(), tape({ fetchedAt: later }))).toBe(false);
    expect(edgebandContentChanged(tape(), tape({ availability: "48h" }))).toBe(true);
  });
});
