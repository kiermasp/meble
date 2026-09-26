import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Edgeband, Material } from "@meble/domain";
import { buildEdgeband } from "../edgebands/build-edgeband";
import { buildVariant, emptyTags, type VariantTags } from "./build-variant";
import { mapPool } from "./map-pool";
import { parseProductSpecs } from "./parse-product-page";
import { shopRetryDelayMs } from "./shop-retry";
import {
  listingPageCount,
  listingPageStyle,
  listingPageUrl,
  parseDeliveryLabels,
  parseFacetLinks,
  parseListingCards,
  stylesheetHref,
  type FacetGroup,
  type ListingCard,
} from "./parse-shop-listing";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const TAGGED_GROUPS: FacetGroup[] = [
  "rodzaj-dekoru",
  "jasnosc",
  "typ-dekoru",
  "odcien",
  "bloczek-status",
];

@Injectable()
export class MebleCatalogClient {
  private readonly logger = new Logger(MebleCatalogClient.name);

  constructor(private readonly config: ConfigService) {}

  async fetchFurnitureBoards(fetchedAt: Date): Promise<Material[]> {
    const base = (this.config.get<string>("MEBLE_BASE_URL") ?? "https://www.meble.pl").replace(/\/$/, "");
    const listingUrl = `${base}/plyty-meblowe/?view=icon`;
    const firstHtml = await this.getText(listingUrl);
    const labels = await this.deliveryLabels(base, firstHtml);
    const pages = listingPageCount(firstHtml);
    const pageStyle = listingPageStyle(firstHtml);
    const pageHtml = [firstHtml];
    if (pages > 1) {
      const rest = await mapPool(
        Array.from({ length: pages - 1 }, (_, index) => index + 2),
        4,
        (page) => this.getText(listingPageUrl(listingUrl, page, pageStyle)),
      );
      pageHtml.push(...rest);
    }

    const cards = dedupeCards(pageHtml.flatMap((html) => parseListingCards(html, labels)));
    if (cards.length === 0) {
      throw new Error("Furniture-board listing parsed to zero variants");
    }

    const tags = await this.facetTags(base, firstHtml, labels);
    const specs = await mapPool(cards, 8, async (card) => {
      const html = await this.getText(absoluteUrl(base, card.href));
      return parseProductSpecs(html);
    });

    return cards.map((card, index) => buildVariant(card, specs[index] ?? null, tags.get(card.externalCode) ?? emptyTags(), fetchedAt));
  }

  async fetchEdgebands(fetchedAt: Date): Promise<Edgeband[]> {
    const base = (this.config.get<string>("MEBLE_BASE_URL") ?? "https://www.meble.pl").replace(/\/$/, "");
    const listingUrl = `${base}/obrzeza/?view=icon`;
    const firstHtml = await this.getText(listingUrl);
    const labels = await this.deliveryLabels(base, firstHtml);
    const pages = listingPageCount(firstHtml);
    const pageStyle = listingPageStyle(firstHtml);
    const pageHtml = [firstHtml];
    if (pages > 1) {
      const rest = await mapPool(
        Array.from({ length: pages - 1 }, (_, index) => index + 2),
        1,
        (page) => this.getText(listingPageUrl(listingUrl, page, pageStyle)),
      );
      pageHtml.push(...rest);
    }
    const cards = dedupeCards(pageHtml.flatMap((html) => parseListingCards(html, labels)));
    if (cards.length === 0) {
      throw new Error("Edgeband listing parsed to zero variants");
    }
    const priced = cards.filter((card) => card.unitPriceAmount != null).length;
    if (priced === 0) {
      throw new Error("Edgeband listing did not include any prices");
    }
    return cards.map((card) => buildEdgeband(card, fetchedAt));
  }

  private async deliveryLabels(base: string, listingHtml: string): Promise<Map<string, string>> {
    const href = stylesheetHref(listingHtml);
    if (!href) throw new Error("Shop listing did not link the delivery stylesheet");
    const css = await this.getText(absoluteUrl(base, href));
    const labels = parseDeliveryLabels(css);
    if (!labels.has("d2")) {
      throw new Error("Delivery stylesheet did not define the shop lead-time labels");
    }
    return labels;
  }

  private async facetTags(
    base: string,
    listingHtml: string,
    labels: Map<string, string>,
  ): Promise<Map<string, VariantTags>> {
    const tags = new Map<string, VariantTags>();
    const links = parseFacetLinks(listingHtml).filter((link) => TAGGED_GROUPS.includes(link.group));
    await mapPool(links, 4, async (link) => {
      const url = absoluteUrl(base, link.href);
      const first = await this.getText(withIconView(url));
      const pages = listingPageCount(first);
      const pageStyle = listingPageStyle(first);
      const htmls = [first];
      if (pages > 1) {
        const rest = await mapPool(
          Array.from({ length: pages - 1 }, (_, index) => index + 2),
          3,
          (page) => this.getText(listingPageUrl(withIconView(url), page, pageStyle)),
        );
        htmls.push(...rest);
      }
      const ids = htmls.flatMap((html) => parseListingCards(html, labels).map((card) => card.externalCode));
      for (const id of ids) {
        const current = tags.get(id) ?? emptyTags();
        applyFacet(current, link.group, link.label);
        tags.set(id, current);
      }
      this.logger.log(`Tagged ${ids.length} variants for ${link.group}: ${link.label}`);
    });
    return tags;
  }

  private async getText(url: string): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "text/html,text/css,*/*;q=0.8",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(45_000),
        });
        const retryMs = shopRetryDelayMs(response.status, response.headers.get("retry-after"), attempt);
        if (retryMs != null) {
          lastError = new Error(`${url} failed with HTTP ${response.status}`);
          this.logger.warn(`Shop responded ${response.status}; retrying ${url} in ${retryMs} ms`);
          await delay(retryMs);
          continue;
        }
        if (!response.ok) {
          throw new Error(`${url} failed with HTTP ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 5) await delay(1_000 * (attempt + 1));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
  }
}

function applyFacet(tags: VariantTags, group: FacetGroup, label: string): void {
  if (group === "rodzaj-dekoru") tags.decorKind = label;
  if (group === "jasnosc") tags.brightness = label;
  if (group === "typ-dekoru") tags.decorType = label;
  if (group === "odcien") tags.shade = label;
  if (group === "bloczek-status" && !tags.statuses.includes(label)) tags.statuses.push(label);
}

function dedupeCards(cards: ListingCard[]): ListingCard[] {
  const byId = new Map<string, ListingCard>();
  for (const card of cards) byId.set(card.externalCode, card);
  return [...byId.values()];
}

function absoluteUrl(base: string, href: string): string {
  if (href.startsWith("//")) return `https:${href}`;
  return new URL(href, `${base}/`).toString();
}

function withIconView(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("view", "icon");
  return parsed.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

