import { describe, expect, it } from "vitest";
import { browseEdgebands, isCatalogEdgeband, type CatalogEdgeband } from "./edgebands";

function band(overrides: Partial<CatalogEdgeband> = {}): CatalogEdgeband {
  return {
    externalCode: "1050019",
    displayName: "Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm Egger",
    code: "U702",
    name: "Kaszmir",
    manufacturer: "Egger",
    structure: "ST9",
    widthMm: 23,
    thicknessMm: 0.8,
    availability: "24h",
    unitPriceAmount: 1.67,
    currency: "PLN",
    ...overrides,
  };
}

const rows = [
  band(),
  band({
    externalCode: "2",
    code: "W960",
    name: "Biały",
    widthMm: 23,
    thicknessMm: 2,
    availability: "7 dni",
    unitPriceAmount: 3.5,
  }),
  band({
    externalCode: "3",
    displayName: "Obrzeże REHAU 2464L",
    code: "2464L",
    name: "Noble Matt",
    manufacturer: "REHAU",
    widthMm: 23,
    thicknessMm: 1,
    availability: "48h",
    unitPriceAmount: 0.9,
  }),
];

describe("browseEdgebands", () => {
  it("searches code, name, and manufacturer without inventing a price order", () => {
    const found = browseEdgebands(rows, { query: "rehau", sort: "code", direction: "asc", page: 0 });
    expect(found.map((row) => row.code)).toEqual(["2464L"]);
  });

  it("sorts by price and keeps missing prices last", () => {
    const priced = browseEdgebands(
      [...rows, band({ externalCode: "4", code: "H001", unitPriceAmount: null })],
      { query: "", sort: "price", direction: "asc", page: 0 },
    );
    expect(priced.map((row) => row.unitPriceAmount)).toEqual([0.9, 1.67, 3.5, null]);
  });

  it("rejects a row that is not an edgeband", () => {
    expect(isCatalogEdgeband(band())).toBe(true);
    expect(isCatalogEdgeband({ ...band(), widthMm: "23" })).toBe(false);
  });
});
