import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MATERIAL_CATEGORIES } from "@meble/domain";
import { parseBoardDialog } from "./parse-board-dialog";

const html = readFileSync(
  join(__dirname, "../../test/fixtures/show-dialog-plyta.html"),
  "utf8",
);
const fetchedAt = new Date("2026-09-26T16:57:16.000Z");

describe("parseBoardDialog", () => {
  const materials = parseBoardDialog(html, fetchedAt);

  it("reads codes, names, structures, and thickness from the live dialog", () => {
    const white = materials.find((material) => material.externalCode === "W1000 ST19");
    expect(white).toMatchObject({
      displayName: "W1000 ST19 / Biały premium",
      category: "plyty-meblowe",
      manufacturer: "Egger",
      structure: "ST19",
      thicknessMm: 18,
      availability: "in_stock",
      fetchedAt,
    });

    const cleaf = materials.find((material) => material.externalCode === "B073 CHFI");
    expect(cleaf).toMatchObject({
      displayName: "B073 CHFI / Total White",
      category: "plyty-tss-cleaf",
      manufacturer: "Cleaf",
      structure: "CHFI",
      availability: "in_stock",
    });
    expect(cleaf?.thicknessMm).toBeCloseTo(18.4, 5);

    expect(materials.find((material) => material.externalCode === "U1895L STEM")?.manufacturer).toBe("Rehau");
    expect(materials.find((material) => material.category === "plyty-crystal")?.manufacturer).toBe("Rehau");
    expect(materials.find((material) => material.category === "plyty-wysoki-polysk")?.manufacturer).toBe("Egger");
    expect(materials.find((material) => material.category === "plyty-gleboki-mat")?.manufacturer).toBe("Egger");
  });

  it("keeps all three availability states", () => {
    expect(materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ externalCode: "W1000 ST19", availability: "in_stock" }),
        expect.objectContaining({
          externalCode: "W960 ST7",
          displayName: "W960 ST7 / Biały klasyczny",
          availability: "on_order",
        }),
        expect.objectContaining({
          externalCode: "W908 SM",
          displayName: "W908 SM / Biały bazowy",
          availability: "on_order_pallet",
        }),
      ]),
    );
  });

  it("covers every requested category and skips the other tabs", () => {
    const counts = Object.fromEntries(MATERIAL_CATEGORIES.map((category) => [category, 0]));
    for (const material of materials) {
      counts[material.category] += 1;
    }
    expect(counts).toEqual({
      "plyty-meblowe": 231,
      "plyty-akrylowe": 55,
      "plyty-wysoki-polysk": 7,
      "plyty-gleboki-mat": 62,
      "plyty-crystal": 49,
      "plyty-tss-cleaf": 33,
      hdf: 5,
      grip: 2,
    });
    expect(materials).toHaveLength(444);
    expect(materials.some((material) => material.displayName.includes("OSB"))).toBe(false);
  });

  it("reads HDF and Grip product tiles, including orange availability", () => {
    expect(materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          externalCode: "67544",
          category: "hdf",
          displayName: "Płyta HDF 3 mm jednostronnie biała (2070x2800)",
          manufacturer: null,
          structure: null,
          thicknessMm: 3,
          availability: "in_stock",
        }),
        expect.objectContaining({
          externalCode: "4745147",
          category: "grip",
          manufacturer: "Rehau",
          structure: null,
          thicknessMm: 16,
          availability: "in_stock",
        }),
        expect.objectContaining({
          externalCode: "4745363",
          category: "grip",
          availability: "on_order",
        }),
      ]),
    );
  });

  it("returns nothing for an empty document", () => {
    expect(parseBoardDialog("", fetchedAt)).toEqual([]);
  });
});
