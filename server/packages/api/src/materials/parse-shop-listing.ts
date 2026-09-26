import { load } from "cheerio";
import { parseBoardTitle } from "./parse-board-title";

const FACET_GROUPS = [
  "producenci",
  "wodoodpornosc",
  "rodzaj-dekoru",
  "format",
  "grubosc",
  "struktura",
  "jasnosc",
  "typ-dekoru",
  "odcien",
  "kolor",
  "bloczek-status",
] as const;

export type FacetGroup = (typeof FACET_GROUPS)[number];

export interface ListingCard {
  externalCode: string;
  displayName: string;
  href: string;
  manufacturer: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  availability: string | null;
  decorCode: string | null;
  decorName: string | null;
  structure: string | null;
  thicknessMm: number | null;
  format: string | null;
}

export interface FacetLink {
  group: FacetGroup;
  label: string;
  href: string;
}

const DELIVERY_CLASS = /^(?:d\d+|koncowka-serii|nds|tel|przedzial\d+-\d+)$/;

export function parseDeliveryLabels(css: string): Map<string, string> {
  const labels = new Map<string, string>();
  for (const match of css.matchAll(/([^{}]+)\{content:'([^']*)'\}/g)) {
    const content = match[2];
    if (content == null || content.includes("attr(")) continue;
    for (const selector of (match[1] ?? "").split(",")) {
      if (!selector.includes("productItem__delivery")) continue;
      const classes = [...selector.matchAll(/\.([A-Za-z0-9-]+)/g)].map((item) => item[1] ?? "");
      const deliveryClasses = classes.filter((className) => DELIVERY_CLASS.test(className));
      if (deliveryClasses.length !== 1) continue;
      const className = deliveryClasses[0];
      if (!className || labels.has(className)) continue;
      labels.set(className, content);
    }
  }
  return labels;
}

export function deliveryLabel(
  className: string,
  dataCr: string | undefined,
  labels: Map<string, string>,
): string | null {
  const classes = className.split(/\s+/);
  const timed = classes.find((token) => /^d\d+$/.test(token));
  if (timed && labels.has(timed)) return labels.get(timed) ?? null;
  if (dataCr && /^\d+$/.test(dataCr.trim())) return `${dataCr.trim()} dni`;
  const other = classes.find((token) => labels.has(token));
  return other ? (labels.get(other) ?? null) : null;
}

export function parseListingCards(html: string, labels: Map<string, string>): ListingCard[] {
  const $ = load(html);
  const cards: ListingCard[] = [];
  $(".productItem--variant").each((_, element) => {
    const card = $(element);
    const externalCode = card.attr("data-id")?.trim() ?? "";
    const displayName = collapse(card.find("a.productItem__name").first().attr("title") ?? "");
    const href = card.find("a.productItem__name").first().attr("href") ?? "";
    if (!externalCode || !displayName) return;
    const manufacturer =
      collapse(card.find('[itemprop="brand"] [itemprop="name"]').attr("content") ?? "") || null;
    const priceRaw = card.find('[itemprop="price"]').attr("content");
    const unitPriceAmount = priceRaw == null ? null : parsePrice(priceRaw);
    const currency = collapse(card.find('[itemprop="priceCurrency"]').attr("content") ?? "") || null;
    const delivery = card.find(".productItem__delivery").first();
    const availability = deliveryLabel(delivery.attr("class") ?? "", delivery.attr("data-cr"), labels);
    const title = parseBoardTitle(displayName, manufacturer);
    cards.push({
      externalCode,
      displayName,
      href,
      manufacturer,
      unitPriceAmount,
      currency,
      availability,
      decorCode: title.decorCode,
      decorName: title.decorName,
      structure: title.structure,
      thicknessMm: title.thicknessMm,
      format: title.format,
    });
  });
  return cards;
}

export type ListingPageStyle = "directory" | "suffix";

export function listingPageCount(html: string): number {
  let max = 1;
  for (const match of html.matchAll(/\/page(\d+)\.html/g)) {
    const page = Number(match[1]);
    if (Number.isFinite(page)) max = Math.max(max, page);
  }
  return max;
}

/** Main catalog pages use /page/pageN.html. Facet listings use /pageN.html. */
export function listingPageStyle(html: string): ListingPageStyle {
  return /\/page\/page\d+\.html/.test(html) ? "directory" : "suffix";
}

export function listingPageUrl(url: string, page: number, style: ListingPageStyle): string {
  const parsed = new URL(url);
  const path = parsed.pathname
    .replace(/\/$/, "")
    .replace(/\/page\/page\d+\.html$/, "")
    .replace(/\/page\d+\.html$/, "");
  if (page <= 1) parsed.pathname = `${path}/`;
  else if (style === "directory") parsed.pathname = `${path}/page/page${page}.html`;
  else parsed.pathname = `${path}/page${page}.html`;
  parsed.searchParams.set("view", "icon");
  return parsed.toString();
}

export function parseFacetLinks(html: string): FacetLink[] {
  const $ = load(html);
  const links: FacetLink[] = [];
  $(".category__sidebar").each((_, element) => {
    const className = $(element).attr("class") ?? "";
    const group = FACET_GROUPS.find((token) => className.split(/\s+/).includes(token));
    if (!group) return;
    $(element)
      .find("a[href]")
      .each((__, anchor) => {
        const href = $(anchor).attr("href") ?? "";
        const label = collapse(
          $(anchor).find(".nazwa-cechy").attr("title") ?? $(anchor).attr("title") ?? "",
        );
        if (!href || !label) return;
        links.push({ group, label, href });
      });
  });
  return links;
}

export function stylesheetHref(html: string): string | null {
  const match = html.match(/href="([^"]*\/main\.css[^"]*)"/);
  return match?.[1] ?? null;
}

function parsePrice(raw: string): number | null {
  const value = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
