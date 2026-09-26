const STRUCTURE_TOKEN = /^(?:ST\d+[A-Z]*|SMK|SM|BS|PG|PGST\d+|PMST\d+)$/i;

export interface ParsedTitle {
  decorCode: string | null;
  decorName: string | null;
  structure: string | null;
  thicknessMm: number | null;
  format: string | null;
}

export function parseBoardTitle(displayName: string, manufacturer: string | null): ParsedTitle {
  const empty: ParsedTitle = {
    decorCode: null,
    decorName: null,
    structure: null,
    thicknessMm: null,
    format: null,
  };
  const withoutKind = displayName.replace(/^Płyta meblowa\s+/i, "").trim();
  const rest = stripManufacturer(withoutKind, manufacturer);
  const match = rest.match(
    /^([A-Z]*\d+[A-Z0-9]*)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*mmn?(?:\s*\([^)]*\))?\s*$/i,
  );
  if (!match?.[1] || !match[2] || !match[3]) return empty;

  let middle = match[2].trim();
  let structure: string | null = null;
  const structureMatch = middle.match(/^(\S+)\s+([\s\S]+)$/);
  if (structureMatch?.[1] && structureMatch[2] && STRUCTURE_TOKEN.test(structureMatch[1])) {
    structure = structureMatch[1].toUpperCase();
    middle = structureMatch[2].trim();
  }

  let format: string | null = null;
  const formatMatch = middle.match(/^(.*)\s+(\d+x\d+)$/i);
  if (formatMatch?.[1] && formatMatch[2]) {
    middle = formatMatch[1].trim();
    format = formatMatch[2];
  }

  return {
    decorCode: match[1].toUpperCase(),
    decorName: middle || null,
    structure,
    thicknessMm: parseMillimetres(match[3]),
    format,
  };
}

export function parseMillimetres(raw: string): number | null {
  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function stripManufacturer(value: string, manufacturer: string | null): string {
  if (!manufacturer) return value;
  const prefix = manufacturer.trim();
  if (prefix && value.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
    return value.slice(prefix.length).trim();
  }
  return value;
}
