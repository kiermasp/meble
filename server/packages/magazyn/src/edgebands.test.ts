import { describe, expect, it } from "vitest";
import {
  browseEdgebands,
  edgebandFilterOptions,
  edgebandKind,
  isCatalogEdgeband,
  normalizeCatalogEdgeband,
  readEdgebandView,
  writeEdgebandView,
  type CatalogEdgeband,
  type EdgebandView,
} from "./edgebands";

function band(overrides: Partial<CatalogEdgeband> = {}): CatalogEdgeband {
  return {
    mebleRefId: "1050019",
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
    updatedAt: "2026-09-26T12:00:00.000Z",
    ...overrides,
  };
}

const rows = [
  band(),
  band({
    mebleRefId: "2",
    code: "W960",
    name: "Biały",
    widthMm: 23,
    thicknessMm: 2,
    availability: "7 dni",
    unitPriceAmount: 3.5,
  }),
  band({
    mebleRefId: "3",
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

function view(overrides: Partial<EdgebandView> = {}): EdgebandView {
  return { query: "", sort: "code", direction: "asc", page: 0, filters: {}, ...overrides };
}

describe("browseEdgebands", () => {
  it("searches code, name, and manufacturer without inventing a price order", () => {
    const found = browseEdgebands(rows, view({ query: "rehau" }));
    expect(found.map((row) => row.code)).toEqual(["2464L"]);
  });

  it("sorts by price and keeps missing prices last", () => {
    const priced = browseEdgebands(
      [...rows, band({ mebleRefId: "4", code: "H001", unitPriceAmount: null })],
      view({ sort: "price" }),
    );
    expect(priced.map((row) => row.unitPriceAmount)).toEqual([0.9, 1.67, 3.5, null]);
  });

  it("filters by manufacturer and thickness together", () => {
    const found = browseEdgebands(rows, view({ filters: { manufacturer: ["Egger"], thickness: ["0.8"] } }));
    expect(found.map((row) => row.code)).toEqual(["U702"]);
  });

  it("classifies grip and laser tape, and keeps the rest longitudinal", () => {
    expect(edgebandKind(band({ displayName: "Obrzeże meblowe ABS GRIP Szare 98492 23 x 0.8 mm REHAU" }))).toBe("Grip");
    expect(edgebandKind(band({ displayName: "Obrzeże meblowe do oklejania laserowego PRO 1644L 23 x 1 mm REHAU" }))).toBe("Laserowe");
    expect(edgebandKind(band())).toBe("Wzdłużne");
  });

  it("counts format options from the rows that match the other filters", () => {
    const options = edgebandFilterOptions(rows, view({ filters: { manufacturer: ["Egger"] } }));
    const format = options.find((group) => group.name === "format");
    expect(format?.options.map((option) => option.label)).toEqual(["0,8x23 mm", "2x23 mm"]);
    expect(format?.options.map((option) => option.count)).toEqual([1, 1]);
  });

  it("round-trips the selected filters through the query string", () => {
    const params = writeEdgebandView(view({ filters: { manufacturer: ["Egger", "Rehau"], kind: ["Laserowe"] }, page: 1 }));
    expect(readEdgebandView(params).filters).toEqual({ manufacturer: ["Egger", "Rehau"], kind: ["Laserowe"] });
    expect(readEdgebandView(params).page).toBe(1);
  });

  it("rejects a row that is not an edgeband", () => {
    expect(isCatalogEdgeband(band())).toBe(true);
    expect(isCatalogEdgeband({ ...band(), widthMm: "23" })).toBe(false);
    const { updatedAt, ...withoutUpdate } = band();
    expect(updatedAt).toBe("2026-09-26T12:00:00.000Z");
    expect(isCatalogEdgeband(withoutUpdate)).toBe(false);
    const legacy = { ...withoutUpdate, fetchedAt: "2026-09-26T12:00:00.000Z" };
    expect(isCatalogEdgeband(normalizeCatalogEdgeband(legacy))).toBe(true);
  });

  it("sorts by the last update", () => {
    const ordered = browseEdgebands(
      [
        band({ mebleRefId: "old", code: "A", updatedAt: "2026-09-01T08:00:00.000Z" }),
        band({ mebleRefId: "new", code: "B", updatedAt: "2026-09-26T12:00:00.000Z" }),
      ],
      view({ sort: "updated", direction: "desc" }),
    );
    expect(ordered.map((row) => row.mebleRefId)).toEqual(["new", "old"]);
  });
});
