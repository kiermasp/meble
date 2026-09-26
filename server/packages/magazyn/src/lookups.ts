export interface LookupRecord {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  mebleRefId: string | null;
}

export function isLookupRecord(value: unknown): value is LookupRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.code === "string" &&
    typeof row.name === "string" &&
    typeof row.sortOrder === "number" &&
    (row.mebleRefId === null || typeof row.mebleRefId === "string")
  );
}

export async function loadLookups(path: string): Promise<LookupRecord[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} failed`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error(`${path} was not JSON`);
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isLookupRecord)) throw new Error(`${path} is not a lookup list`);
  return body;
}
