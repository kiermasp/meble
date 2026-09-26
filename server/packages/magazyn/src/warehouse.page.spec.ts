import type { CatalogBoard } from "./catalog-board";
import { renderWarehousePage } from "./warehouse.page";

function board(overrides: Partial<CatalogBoard> = {}): CatalogBoard {
  return {
    externalCode: "W1000 ST19",
    displayName: "W1000 ST19 / Biały premium",
    category: "plyty-meblowe",
    categoryLabel: "Płyta meblowa",
    manufacturer: "Egger",
    thicknessMm: 18,
    availability: "48h",
    ...overrides,
  };
}

describe("renderWarehousePage", () => {
  it("shows the producer and thickness in Polish column headings", () => {
    const html = renderWarehousePage({
      boards: [
        board(),
        board({
          externalCode: "B073 CHFI",
          displayName: "B073 CHFI / Total White",
          category: "plyty-tss-cleaf",
          categoryLabel: "TSS Cleaf",
          manufacturer: "Cleaf",
          thicknessMm: 18.4,
          availability: "7 dni",
        }),
        board({
          externalCode: "67544",
          displayName: "Płyta HDF 3 mm jednostronnie biała (2070x2800)",
          category: "hdf",
          categoryLabel: "HDF",
          manufacturer: null,
          thicknessMm: 3,
          availability: "48h",
        }),
        board({
          externalCode: "4745363",
          displayName: "Płyta Rauviso GRIP Popiel",
          category: "grip",
          categoryLabel: "Rauvisio Grip",
          manufacturer: "Rehau",
          thicknessMm: 16,
          availability: "14 dni",
        }),
      ],
    });

    expect(html).toContain("<th>Producent</th>");
    expect(html).toContain("<th>Grubość</th>");
    expect(html).toContain("Egger");
    expect(html).toContain("Cleaf");
    expect(html).toContain("18,4 mm");
    expect(html).toContain(">3 mm<");
    expect(html).toContain(">—<");
    expect(html).toContain("48h");
    expect(html).toContain("14 dni");
    expect(html).toContain("4 z 4");
  });

  it("escapes names that contain markup", () => {
    const html = renderWarehousePage({
      boards: [board({ displayName: "W1000 <b>premium</b>" })],
    });
    expect(html).toContain("W1000 &lt;b&gt;premium&lt;/b&gt;");
    expect(html).not.toContain("<b>premium</b>");
  });

  it("filters by category and availability", () => {
    const html = renderWarehousePage({
      boards: [
        board(),
        board({
          externalCode: "U708 PGST9",
          displayName: "U708 PGST9 / Szary jasny",
          category: "plyty-wysoki-polysk",
          categoryLabel: "Wysoki połysk",
          availability: "7 dni",
        }),
      ],
      category: "plyty-wysoki-polysk",
      availability: "7 dni",
    });
    expect(html).toContain("U708 PGST9");
    expect(html).not.toContain("W1000 ST19 / Biały premium");
    expect(html).toContain("1 z 2");
    expect(html).toContain("value=\"plyty-wysoki-polysk\" selected");
    expect(html).toContain("value=\"7 dni\" selected");
  });
});
