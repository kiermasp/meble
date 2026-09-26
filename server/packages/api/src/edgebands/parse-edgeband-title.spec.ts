import { parseDeliveryLabels, parseListingCards } from "../materials/parse-shop-listing";
import { buildEdgeband } from "./build-edgeband";
import { parseEdgebandTitle } from "./parse-edgeband-title";

const PAGE_TITLES = [
  "Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm EGGER",
  "Obrzeże meblowe ABS W960 SM (76873) biały bazowy 23 x 0.8 mm REHAU",
  "Obrzeże ABS H1385 ST40 Dąb Casella naturalny 23 x 0.8 mm EGGER",
  "Obrzeże meblowe ABS W908 SM biały bazowy 23 x 2 mm REHAU",
  "Obrzeże meblowe do oklejania laserowego PRO U702 ST9 (79098) Kaszmir 23 x 1 mm REHAU",
  "Obrzeże meblowe do oklejania laserowego PRO U702 PM (140342) Kaszmir 23 x 1 mm REHAU",
  "Obrzeże ABS U702 PMST9 Kaszmir 23 x 1 mm EGGER",
  "Obrzeże ABS W1100 PGST9 Biały alpejski 23 x 1 mm EGGER",
  "Obrzeże meblowe do oklejania laserowego PRO U999 PM / 2461L (140339) Czarny 23 x 1 mm REHAU",
  "Obrzeże meblowe do oklejania laserowego PRO 2464L (Boxcar Blonde) Noble Matt 23 x 1 mm REHAU",
];

describe("parseEdgebandTitle", () => {
  it("reads code, name, width and thickness from shop titles", () => {
    expect(parseEdgebandTitle(PAGE_TITLES[0] ?? "", "Egger")).toEqual({
      code: "U702",
      name: "Kaszmir",
      structure: "ST9",
      widthMm: 23,
      thicknessMm: 0.8,
    });
    expect(parseEdgebandTitle(PAGE_TITLES[1] ?? "", "REHAU")).toMatchObject({
      code: "W960",
      name: "biały bazowy",
      structure: "SM",
      widthMm: 23,
      thicknessMm: 0.8,
    });
    expect(parseEdgebandTitle(PAGE_TITLES[4] ?? "", "REHAU")).toMatchObject({
      code: "U702",
      structure: "ST9",
      name: "Kaszmir",
      thicknessMm: 1,
    });
    expect(parseEdgebandTitle(PAGE_TITLES[6] ?? "", "Egger").structure).toBe("PMST9");
    expect(parseEdgebandTitle(PAGE_TITLES[8] ?? "", "REHAU")).toMatchObject({
      code: "U999",
      structure: "PM",
      name: "Czarny",
      widthMm: 23,
      thicknessMm: 1,
    });
    expect(parseEdgebandTitle(PAGE_TITLES[9] ?? "", "REHAU")).toMatchObject({
      code: "2464L",
      name: "(Boxcar Blonde) Noble Matt",
      structure: null,
      thicknessMm: 1,
    });
  });

  it("keeps width and thickness on every sampled listing title", () => {
    for (const title of PAGE_TITLES) {
      const parsed = parseEdgebandTitle(title, title.endsWith("REHAU") ? "REHAU" : "Egger");
      expect(parsed.code).toEqual(expect.any(String));
      expect(parsed.widthMm).toBe(23);
      expect(parsed.thicknessMm).toBeGreaterThan(0);
    }
  });
});

describe("buildEdgeband", () => {
  it("copies the shop price and lead time onto the parsed tape", () => {
    const html = `
      <div class="productItem productItem--variant" data-id="1050019">
        <a class="productItem__name" title="Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm EGGER" href="/p1050019,obrzeze.html"></a>
        <div itemprop="brand"><meta itemprop="name" content="Egger"></div>
        <meta itemprop="price" content="1.67">
        <meta itemprop="priceCurrency" content="PLN">
        <div class="productItem__delivery obrzeza d1"></div>
      </div>`;
    const labels = parseDeliveryLabels(".productItem__delivery.d1::after{content:'24h'}");
    const [card] = parseListingCards(html, labels);
    expect(card).toBeDefined();
    expect(buildEdgeband(card!, new Date("2026-09-26T12:00:00.000Z"))).toMatchObject({
      externalCode: "1050019",
      code: "U702",
      name: "Kaszmir",
      manufacturer: "Egger",
      widthMm: 23,
      thicknessMm: 0.8,
      availability: "24h",
      unitPriceAmount: 1.67,
      currency: "PLN",
    });
  });
});
