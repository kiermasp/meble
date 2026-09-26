import {
  MATERIAL_CATEGORIES,
  type AvailabilityStatus,
  type Material,
  type MaterialCategory,
} from "@meble/domain";
import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

const ADD_KOLOR_SOURCE =
  "addKolorDekoryDb\\(\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*\\)";

const THICKNESS_IN_NAME = /(\d+(?:[.,]\d+)?)\s*mm/i;

export function parseBoardDialog(html: string, fetchedAt: Date): Material[] {
  const $ = load(html);
  const materials: Material[] = [];

  for (const category of MATERIAL_CATEGORIES) {
    const section = $(`[id="warstwa_wybierz_kolor_${category}"]`);
    if (section.length === 0) continue;
    const sectionHtml = section.html() ?? "";
    const decor = parseDecorTiles(sectionHtml, category, fetchedAt);
    materials.push(...(decor.length > 0 ? decor : parseProductTiles($, section, category, fetchedAt)));
  }

  return materials;
}

function parseDecorTiles(sectionHtml: string, category: MaterialCategory, fetchedAt: Date): Material[] {
  const materials: Material[] = [];
  const pattern = new RegExp(ADD_KOLOR_SOURCE, "g");
  for (const match of sectionHtml.matchAll(pattern)) {
    const externalCode = collapse(match[2] ?? "");
    const colorName = collapse(match[3] ?? "");
    if (!externalCode) continue;
    materials.push({
      externalCode,
      displayName: `${externalCode} / ${colorName}`,
      category,
      structure: structureFromCode(externalCode),
      thicknessMm: parseThickness(match[5]),
      availability: availabilityFromToken(match[4] ?? ""),
      fetchedAt,
    });
  }
  return materials;
}

function parseProductTiles(
  $: CheerioAPI,
  section: Cheerio<Element>,
  category: MaterialCategory,
  fetchedAt: Date,
): Material[] {
  const materials: Material[] = [];
  section.find(".probka-kont").each((_, element) => {
    const tile = $(element);
    const id = tile.find(".probka").first().attr("id") ?? "";
    const externalCode = id.startsWith("kolor_") ? id.slice("kolor_".length) : "";
    const displayName = collapse(tile.find(".nazwa").first().text());
    const image = tile.find("img.dostepnosc").attr("src") ?? "";
    if (!externalCode || !displayName) return;
    materials.push({
      externalCode,
      displayName,
      category,
      structure: null,
      thicknessMm: thicknessFromName(displayName),
      availability: availabilityFromToken(image),
      fetchedAt,
    });
  });
  return materials;
}

function availabilityFromToken(token: string): AvailabilityStatus {
  if (token === "dostepne" || token.endsWith("dostepne.png")) return "in_stock";
  if (token === "dostep_62" || token.includes("dostep_62")) return "on_order_pallet";
  if (token === "dostep_31" || token.includes("dostep_31")) return "on_order";
  throw new Error(`Unknown availability token: ${token}`);
}

function structureFromCode(code: string): string | null {
  const parts = code.split(" ");
  if (parts.length < 2) return null;
  return parts.slice(1).join(" ");
}

function parseThickness(raw: string | undefined): number | null {
  if (raw == null) return null;
  const value = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function thicknessFromName(name: string): number | null {
  const match = name.match(THICKNESS_IN_NAME);
  return parseThickness(match?.[1]);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
