import { load } from "cheerio";
import { parseMillimetres } from "./parse-board-title";

export interface ProductSpecs {
  format: string | null;
  thicknessMm: number | null;
  structure: string | null;
  waterResistance: string | null;
  color: string | null;
  subtype: string | null;
}

export function parseProductSpecs(html: string): ProductSpecs {
  const $ = load(html);
  const specs: ProductSpecs = {
    format: null,
    thicknessMm: null,
    structure: null,
    waterResistance: null,
    color: null,
    subtype: null,
  };

  $("div.name").each((_, element) => {
    const name = collapse($(element).text());
    const value = collapse($(element).next(".value").text());
    if (!value) return;
    if (name === "Format") specs.format = value;
    if (name === "Grubość") specs.thicknessMm = parseMillimetres(value);
    if (name === "Struktura") specs.structure = value;
    if (name === "Wodoodporność") specs.waterResistance = value;
    if (name === "Kolor") specs.color = value;
  });

  $(".breadcrumb__listitem a[itemprop='item']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const label = collapse($(element).find("[itemprop='name']").text());
    if (/^\/plyty-meblowe\/[^/]+\/$/.test(href) && label) specs.subtype = label;
  });

  return specs;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
