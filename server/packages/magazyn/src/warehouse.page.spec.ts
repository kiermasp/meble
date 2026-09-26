import type { CatalogBoard } from "./catalog-board";
import { isCatalogBoard } from "./catalog-board";
import { renderWarehousePage } from "./warehouse.page";

function board(overrides: Partial<CatalogBoard> = {}): CatalogBoard {
  return {
    externalCode: "5829997",
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

describe("renderWarehousePage", () => {
  it("groups a decor and separates order variants", () => {
    const html = renderWarehousePage({
      boards: [
        board(),
        board({
          externalCode: "5999999",
          structure: "ST7",
          thicknessMm: 36,
          availability: "14 dni",
          unitPriceAmount: 310.5,
          format: "2800x1032",
          decorKind: "Produkcyjne (na zamówienie)",
        }),
        board({
          externalCode: "3149044",
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
      ],
    });

    expect(html).toContain("<h2>Egger W960 Biały klasyczny</h2>");
    expect(html).toContain("<h2>Kronospan 5981 Kaszmir</h2>");
    expect(html.indexOf("<h2>Egger W960 Biały klasyczny</h2>")).toBeLessThan(
      html.indexOf("<h2>Kronospan 5981 Kaszmir</h2>"),
    );
    const egger = html.slice(html.indexOf("<h2>Egger W960 Biały klasyczny</h2>"));
    expect(egger.indexOf("<td>SM SemiMatt</td>")).toBeLessThan(egger.indexOf("<h3>Warianty na zamówienie</h3>"));
    expect(egger.indexOf("<h3>Warianty na zamówienie</h3>")).toBeLessThan(egger.indexOf("<td>ST7</td>"));
    expect(html).toContain("18 mm");
    expect(html).toContain("36 mm");
    expect(html).toContain("227,45 zł");
    expect(html).toContain("310,50 zł");
    expect(html).toContain("48h");
    expect(html).toContain("14 dni");
    expect(html).toContain("<th>Grubość</th>");
    expect(html).toContain("<th>Struktura</th>");
    expect(html).toContain("<th>Dostępność</th>");
    expect(html).toContain("<th class=\"price\">Cena/szt.</th>");
    expect(html).toContain("Producenci");
    expect(html).toContain("Rodzaj dekoru");
    expect(html).toContain("Wodoodporność");
    expect(html).toContain("Status");
    expect(html).toContain("Kolor");
    expect(html).not.toContain("Jasność");
    expect(html).not.toContain("Typ dekoru");
    expect(html).not.toContain("Odcień");
    expect(html).toContain("3 z 3");
    const kaszmir = html.slice(html.indexOf("Kronospan 5981 Kaszmir"));
    expect(kaszmir).not.toContain("Warianty na zamówienie");
  });

  it("shows the order heading when every variant of a decor is made to order", () => {
    const html = renderWarehousePage({
      boards: [board({ decorKind: "Produkcyjne (na zamówienie)" })],
    });
    const article = html.slice(html.indexOf("<article"));
    expect(article.indexOf("<h3>Warianty na zamówienie</h3>")).toBeLessThan(article.indexOf("<td>SM SemiMatt</td>"));
  });

  it("keeps every option visible and combines filters", () => {
    const html = renderWarehousePage({
      boards: [
        board(),
        board({
          externalCode: "5999999",
          structure: "ST7",
          thicknessMm: 18.6,
          availability: "14 dni",
          decorKind: "Produkcyjne (na zamówienie)",
          brightness: "jasne",
          decorType: "Dąb",
          shade: "biały",
          statuses: ["Kolekcja 26+", "Końcówka serii"],
        }),
        board({
          externalCode: "3149044",
          manufacturer: "Kronospan",
          decorCode: "5981",
          decorName: "Kaszmir",
          structure: "BS",
          availability: "7 dni",
          color: "Kaszmir",
          statuses: ["Wyprzedaże"],
        }),
      ],
      filters: { manufacturer: ["Egger"], thickness: ["18"], status: ["Kolekcja 26+"] },
    });

    expect(html).toContain("SM SemiMatt");
    expect(html).toContain("227,45 zł");
    expect(html).not.toContain("<td>ST7</td>");
    expect(html).not.toContain("<h2>Kronospan 5981 Kaszmir</h2>");
    expect(html).toContain("1 z 3");
    expect(html).toContain("value=\"Egger\" checked");
    expect(html).toContain("value=\"18\" checked");
    expect(html).toContain("value=\"Kronospan\"");
    expect(html).not.toContain("value=\"Kronospan\" checked");
    expect(html).toContain("18,6 mm");
    expect(html).toContain("Jasność");
    expect(html).toContain("Typ dekoru");
    expect(html).toContain("Odcień");
    expect(html).toContain("Końcówka serii");
  });

  it("matches a status when the variant carries that label among others", () => {
    const html = renderWarehousePage({
      boards: [
        board({ statuses: ["Kolekcja 26+", "Końcówka serii"] }),
        board({
          externalCode: "3149044",
          decorCode: "5981",
          decorName: "Kaszmir",
          statuses: ["Wyprzedaże"],
        }),
      ],
      filters: { status: ["Końcówka serii", "Wyprzedaże"] },
    });
    expect(html).toContain("W960");
    expect(html).toContain("5981");
    expect(html).toContain("2 z 2");
  });

  it("escapes names that contain markup", () => {
    const html = renderWarehousePage({
      boards: [board({ decorName: "Biały <b>premium</b>", displayName: "W1000 <b>premium</b>" })],
    });
    expect(html).toContain("Biały &lt;b&gt;premium&lt;/b&gt;");
    expect(html).not.toContain("<b>premium</b>");
  });

  it("leaves the price blank when the shop card has none", () => {
    const html = renderWarehousePage({
      boards: [board({ unitPriceAmount: null, currency: null, thicknessMm: null, structure: null, availability: null })],
    });
    expect(html).toContain(">—<");
  });
});

describe("isCatalogBoard", () => {
  it("requires the shop variant fields and allows an empty lead time", () => {
    expect(isCatalogBoard(board())).toBe(true);
    expect(isCatalogBoard({ ...board(), availability: null, statuses: [] })).toBe(true);
    const { unitPriceAmount, ...withoutPrice } = board();
    expect(unitPriceAmount).toBe(227.45);
    expect(isCatalogBoard(withoutPrice)).toBe(false);
  });
});
