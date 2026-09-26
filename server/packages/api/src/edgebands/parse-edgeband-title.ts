import { parseMillimetres } from "../materials/parse-board-title";

const STRUCTURE_TOKEN = /^(?:ST\d+[A-Z]*|SMK|SM|BS|PG|PM|PGST\d+|PMST\d+)$/i;
const CODE_TOKEN = /^[A-Z]*\d+[A-Z0-9]*$/i;
export interface ParsedEdgebandTitle {
  code: string | null;
  name: string | null;
  structure: string | null;
  widthMm: number | null;
  thicknessMm: number | null;
}

const EMPTY: ParsedEdgebandTitle = {
  code: null,
  name: null,
  structure: null,
  widthMm: null,
  thicknessMm: null,
};

/**
 * Shop titles put the tape width first and the thickness second: "23 x 0.8 mm".
 * A product page for that shape lists Grubość as 0,8 mm and Format as 0,8x23 mm.
 */
const DIMENSIONS_AT_END = /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*mm)?\s*$/i;
const SHORT_SUFFIX = /\s+\([A-Za-z]\)\s*$/;

export function parseEdgebandTitle(displayName: string, manufacturer: string | null): ParsedEdgebandTitle {
  let rest = displayName.trim().replace(/^Obrze[żz]e\s+/i, "");
  rest = rest.replace(/^meblowe\s+/i, "");
  rest = rest.replace(/^do\s+oklejania\s+laserowego\s+/i, "");
  rest = stripShopTail(rest, manufacturer);

  const dims = rest.match(new RegExp(`^(.*)\\s+${DIMENSIONS_AT_END.source}`, "i"));
  if (!dims?.[1] || !dims[2] || !dims[3]) return EMPTY;

  let middle = dims[1].trim().replace(/^(?:ABS|PVC|PCV|PP|PMMA|PRO|AKRYL)\s+/i, "");
  const widthMm = parseMillimetres(dims[2]);
  const thicknessMm = parseMillimetres(dims[3]);
  const codeMatch = middle.match(/^(\S+)\s*([\s\S]*)$/);
  if (!codeMatch?.[1] || !CODE_TOKEN.test(codeMatch[1])) {
    return { ...EMPTY, name: middle || null, widthMm, thicknessMm };
  }

  let after = (codeMatch[2] ?? "").trim();
  let structure: string | null = null;
  const structureMatch = after.match(/^(\S+)\s+([\s\S]+)$/);
  if (structureMatch?.[1] && structureMatch[2] && STRUCTURE_TOKEN.test(structureMatch[1])) {
    structure = structureMatch[1].toUpperCase();
    after = structureMatch[2].trim();
  }
  after = after.replace(/^\/\s*\S+\s*/, "");
  after = after.replace(/^\(\d+\)\s*/, "");

  return {
    code: codeMatch[1].toUpperCase(),
    name: after || null,
    structure,
    widthMm,
    thicknessMm,
  };
}

function stripShopTail(value: string, manufacturer: string | null): string {
  const stripped = stripTrailingManufacturer(stripShortSuffix(value), manufacturer);
  if (DIMENSIONS_AT_END.test(stripped)) return stripped;
  const withoutToken = stripped.replace(/\s+\S+$/, "").trim();
  if (withoutToken === stripped) return stripped;
  return stripTrailingManufacturer(stripShortSuffix(withoutToken), manufacturer);
}

function stripShortSuffix(value: string): string {
  return value.replace(SHORT_SUFFIX, "").trim();
}

function stripTrailingManufacturer(value: string, manufacturer: string | null): string {
  if (!manufacturer) return value;
  const suffix = manufacturer.trim();
  if (suffix && value.toLowerCase().endsWith(` ${suffix.toLowerCase()}`)) {
    return value.slice(0, value.length - suffix.length).trim();
  }
  return value;
}
