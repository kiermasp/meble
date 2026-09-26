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

/**
 * Producer meble.pl prints for that cutting section.
 * Furniture, gloss, and mat boards are Egger (nav "Płyty meblowe EGGER", shop titles "Płyta … EGGER").
 * Acrylic and Crystal are Rehau (nav "REHAU Rauvisio" / "REHAU Crystal").
 * TSS Cleaf is Cleaf (dialog tab "TSS Cleaf"). Grip names end with REHAU.
 * HDF product pages leave `brand` empty, so those rows stay null.
 */
const CATEGORY_MANUFACTURER: Record<MaterialCategory, string | null> = {
  "plyty-meblowe": "Egger",
  "plyty-akrylowe": "Rehau",
  "plyty-wysoki-polysk": "Egger",
  "plyty-gleboki-mat": "Egger",
  "plyty-crystal": "Rehau",
  "plyty-tss-cleaf": "Cleaf",
  hdf: null,
  grip: "Rehau",
};

const PRODUCER_IN_NAME: Record<string, string> = {
  EGGER: "Egger",
  REHAU: "Rehau",
  CLEAF: "Cleaf",
};

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
    const displayName = `${externalCode} / ${colorName}`;
    materials.push({
      externalCode,
      displayName,
      category,
      manufacturer: manufacturerFor(category, displayName),
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
      manufacturer: manufacturerFor(category, displayName),
      structure: null,
      thicknessMm: thicknessFromName(displayName),
      availability: availabilityFromToken(image),
      fetchedAt,
    });
  });
  return materials;
}

function manufacturerFor(category: MaterialCategory, displayName: string): string | null {
  const named = displayName.match(/\b(EGGER|REHAU|CLEAF)\b/i);
  if (named?.[1]) {
    return PRODUCER_IN_NAME[named[1].toUpperCase()] ?? null;
  }
  return CATEGORY_MANUFACTURER[category];
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
