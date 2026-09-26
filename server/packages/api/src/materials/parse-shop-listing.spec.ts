import { parseBoardTitle } from "./parse-board-title";
import { parseProductSpecs } from "./parse-product-page";
import {
  deliveryLabel,
  listingPageCount,
  listingPageStyle,
  listingPageUrl,
  parseDeliveryLabels,
  parseListingCards,
  parseListingDictionaries,
} from "./parse-shop-listing";

const CSS = `
.productItem__delivery.d1::after{content:'24h'}
.productItem__delivery.d2::after,.productItem__delivery.meble.d1::after{content:'48h'}
.productItem__delivery.d3::after{content:'3 dni'}
.productItem__delivery.d7::after{content:'7 dni'}
.productItem__delivery.d14::after{content:'14 dni'}
.productItem__delivery.koncowka-serii::after{content:'Końcówka serii'}
`;

const LISTING = `
<div class="productItem productItem--variant" data-id="5829997">
  <a class="productItem__name" title="Płyta meblowa EGGER W960 SM Biały klasyczny 18 mm" href="/p5829997,w960.html"></a>
  <div itemprop="brand"><meta itemprop="name" content="Egger"></div>
  <meta itemprop="price" content="227.45">
  <meta itemprop="priceCurrency" content="PLN">
  <div class="productItem__delivery plyty-meblowe d2 szybka-wysylka"></div>
</div>
<div class="productItem productItem--variant" data-id="7033936">
  <a class="productItem__name" title="Płyta meblowa 5981 BS Kaszmir 18 mmn" href="/p7033936,kaszmir.html"></a>
  <div itemprop="brand"><meta itemprop="name" content="Kronospan"></div>
  <meta itemprop="price" content="205.61">
  <meta itemprop="priceCurrency" content="PLN">
  <div class="productItem__delivery plyty-meblowe d7"></div>
</div>
<div class="category__sidebar grupa rodzaj-dekoru">
  <a href="/plyty-meblowe/produkcyjne/"><label class="nazwa-cechy" title="Produkcyjne (na zamówienie)">Produkcyjne (na zamówienie)</label></a>
</div>
`;

const PRODUCT = `
<nav class="breadcrumb">
  <li class="breadcrumb__listitem"><a href="/plyty-meblowe/" itemprop="item"><span itemprop="name">Płyty meblowe</span></a></li>
  <li class="breadcrumb__listitem"><a href="/plyty-meblowe/bialy/" itemprop="item"><span itemprop="name">Białe</span></a></li>
</nav>
<div class="wymiary"><div class="name">Format</div><div class="value">2070x2800</div></div>
<div class="wymiary"><div class="name">Grubość</div><div class="value">18,0 mm<span>, (dostępne również:</span> 10,0 mm</div></div>
<div><div class="name">Struktura</div><div class="value">SM SemiMatt</div></div>
<div><div class="name">Wodoodporność</div><div class="value"><a>Suchotrwała</a></div></div>
<div><div class="name">Kolor</div><div class="value">Biały klasyczny</div></div>
`;

describe("shop catalog parsers", () => {
  const labels = parseDeliveryLabels(CSS);

  it("reads lead times from the shop stylesheet without letting a nested selector overwrite them", () => {
    expect(labels.get("d1")).toBe("24h");
    expect(labels.get("d2")).toBe("48h");
    expect(deliveryLabel("productItem__delivery plyty-meblowe d2 szybka-wysylka", undefined, labels)).toBe(
      "48h",
    );
    expect(deliveryLabel("productItem__delivery koncowka-serii", undefined, labels)).toBe("Końcówka serii");
  });

  it("reads price, producer, decor, thickness and structure from a listing card", () => {
    const cards = parseListingCards(LISTING, labels);
    expect(cards).toEqual([
      expect.objectContaining({
        mebleRefId: "5829997",
        manufacturer: "Egger",
        decorCode: "W960",
        decorName: "Biały klasyczny",
        structure: "SM",
        thicknessMm: 18,
        availability: "48h",
        unitPriceAmount: 227.45,
        currency: "PLN",
      }),
      expect.objectContaining({
        mebleRefId: "7033936",
        manufacturer: "Kronospan",
        decorCode: "5981",
        decorName: "Kaszmir",
        structure: "BS",
        availability: "7 dni",
        unitPriceAmount: 205.61,
      }),
    ]);
  });

  it("splits a decor title that includes format", () => {
    expect(
      parseBoardTitle("Płyta meblowa EGGER W960 ST7 Biały klasyczny 2800x1032 36 mm", "Egger"),
    ).toMatchObject({
      decorCode: "W960",
      decorName: "Biały klasyczny",
      structure: "ST7",
      format: "2800x1032",
      thicknessMm: 36,
    });
  });

  it("follows both shop pagination styles", () => {
    const directory = '<a href="/plyty-meblowe/page/page8.html?view=icon"></a>';
    expect(listingPageCount(directory)).toBe(8);
    expect(listingPageStyle(directory)).toBe("directory");
    expect(listingPageUrl("https://www.meble.pl/plyty-meblowe/?view=icon", 3, "directory")).toBe(
      "https://www.meble.pl/plyty-meblowe/page/page3.html?view=icon",
    );

    const suffix = '<a href="/plyty-meblowe/magazynowe/page6.html?view=icon"></a>';
    expect(listingPageCount(suffix)).toBe(6);
    expect(listingPageStyle(suffix)).toBe("suffix");
    expect(listingPageUrl("https://www.meble.pl/plyty-meblowe/magazynowe/?view=icon", 2, "suffix")).toBe(
      "https://www.meble.pl/plyty-meblowe/magazynowe/page2.html?view=icon",
    );
  });

  it("reads shop dictionary ids from the listing sidebar", () => {
    const html = `
      <script>$.post('/plyty-meblowe/go/ajaxRequest/', {ajax: "dodaj_do_koszyka", id_kategorii: 1, id_oferty: idOferty});</script>
      <div class="category__sidebar producenci">
        <div class="checkbox" data-nr="1">
          <input value="2962397" name="filtr_cechy[7][2962397]">
          <label class="nazwa-cechy" title="Egger">Egger</label>
        </div>
      </div>
      <div class="category__sidebar rodzaj-dekoru">
        <div class="checkbox" data-nr="2">
          <input value="3263402">
          <label title="Produkcyjne (na zamówienie)"></label>
        </div>
      </div>
    `;
    const dictionaries = parseListingDictionaries(html, { code: "plyty-meblowe", name: "Płyty meblowe", sortOrder: 1 });
    expect(dictionaries.category).toMatchObject({ code: "plyty-meblowe", mebleRefId: "1", name: "Płyty meblowe" });
    expect(dictionaries.manufacturers).toEqual([
      { mebleRefId: "2962397", code: "egger", name: "Egger", sortOrder: 1 },
    ]);
    expect(dictionaries.decorKinds[0]).toMatchObject({
      mebleRefId: "3263402",
      code: "produkcyjne-na-zamowienie",
      sortOrder: 2,
    });
  });

  it("reads the product-page specification, not the other thicknesses", () => {
    expect(parseProductSpecs(PRODUCT)).toEqual({
      format: "2070x2800",
      thicknessMm: 18,
      structure: "SM SemiMatt",
      waterResistance: "Suchotrwała",
      color: "Biały klasyczny",
      subtype: "Białe",
    });
  });
});
