import { describe, expect, it } from "vitest";
import {
  isCatalogBoard,
  readViewState,
  viewCatalog,
  type CatalogBoard,
  type CatalogSort,
} from "./catalog";

const defaultSort: CatalogSort = {
  groups: "name",
  groupDirection: "asc",
  rows: "thickness",
  rowDirection: "asc",
};

function board(overrides: Partial<CatalogBoard> = {}): CatalogBoard {
  return {
    mebleRefId: "5829997",
    displayName: "Płyta meblowa EGGER W960 SM Biały klasyczny 18 mm",
    category: "plyty-meblowe",
    categoryLabel: "Płyty meblowe",
    subtype: "bialy",
    manufacturer: "Egger",
    decorCode: "W960",
    decorName: "Biały klasyczny",
    structure: "SM SemiMatt",
    thicknessMm: 18,
    format: "2070x2800",
    availability: "48h",
    unitPriceAmount: 227.45,
    currency: "PLN",
    decorKind: "Magazynowe",
    waterResistance: "Suchotrwała",
    brightness: null,
    decorType: null,
    shade: null,
    color: "Biały klasyczny",
    statuses: ["Kolekcja 26+"],
    ...overrides,
  };
}

describe("viewCatalog", () => {
  const boards = [
    board(),
    board({
      mebleRefId: "5999999",
      structure: "ST7",
      thicknessMm: 36,
      availability: "14 dni",
      unitPriceAmount: 344.74,
      decorKind: "Produkcyjne (na zamówienie)",
    }),
    board({
      mebleRefId: "3149044",
      manufacturer: "Kronospan",
      decorCode: "5981",
      decorName: "Kaszmir",
      structure: "BS",
      thicknessMm: 18,
      availability: "7 dni",
      unitPriceAmount: 205.61,
      color: "Kaszmir",
      statuses: [],
    }),
  ];

  it("keeps made-to-order rows in their own list and sorts dekors by name", () => {
    const groups = viewCatalog(boards, {}, defaultSort);
    expect(groups.map((group) => group.title)).toEqual(["Egger W960 Biały klasyczny", "Kronospan 5981 Kaszmir"]);
    expect(groups[0].stock.map((row) => row.structure)).toEqual(["SM SemiMatt"]);
    expect(groups[0].ordered.map((row) => row.availability)).toEqual(["14 dni"]);
    expect(groups[1].ordered).toEqual([]);
  });

  it("combines filters and still offers every option from the full catalog", () => {
    const groups = viewCatalog(boards, { manufacturer: ["Egger"], thickness: ["18"] }, defaultSort);
    expect(groups).toHaveLength(1);
    expect(groups[0].stock.map((row) => row.mebleRefId)).toEqual(["5829997"]);
    expect(groups[0].ordered).toEqual([]);
  });

  it("sorts rows by lead time and puts a missing price last", () => {
    const priced = [
      board({ mebleRefId: "a", availability: "7 dni", unitPriceAmount: 100, thicknessMm: 18 }),
      board({ mebleRefId: "b", availability: "24h", unitPriceAmount: null, thicknessMm: 18, structure: "ST9" }),
      board({ mebleRefId: "c", availability: "14 dni", unitPriceAmount: 50, thicknessMm: 18, structure: "PG" }),
    ];
    const byLead = viewCatalog(priced, {}, { ...defaultSort, rows: "availability", rowDirection: "asc" });
    expect(byLead[0].stock.map((row) => row.availability)).toEqual(["24h", "7 dni", "14 dni"]);
    const byPrice = viewCatalog(priced, {}, { ...defaultSort, rows: "price", rowDirection: "desc" });
    expect(byPrice[0].stock.map((row) => row.unitPriceAmount)).toEqual([100, 50, null]);
  });

  it("sorts decor blocks by price descending", () => {
    const groups = viewCatalog(boards, {}, { ...defaultSort, groups: "price", groupDirection: "desc" });
    expect(groups.map((group) => group.title)).toEqual(["Egger W960 Biały klasyczny", "Kronospan 5981 Kaszmir"]);
  });
});

describe("readViewState", () => {
  it("reads repeated filters and an explicit sort", () => {
    const params = new URLSearchParams("manufacturer=Egger&manufacturer=Kronospan&sort=price&dir=desc&row=price&rowDir=desc");
    expect(readViewState(params)).toEqual({
      filters: { manufacturer: ["Egger", "Kronospan"] },
      sort: { groups: "price", groupDirection: "desc", rows: "price", rowDirection: "desc" },
    });
  });
});

describe("isCatalogBoard", () => {
  it("requires the shop fields and allows a missing lead time", () => {
    expect(isCatalogBoard(board())).toBe(true);
    expect(isCatalogBoard({ ...board(), availability: null })).toBe(true);
    const { unitPriceAmount, ...withoutPrice } = board();
    expect(unitPriceAmount).toBe(227.45);
    expect(isCatalogBoard(withoutPrice)).toBe(false);
  });
});
