import { Injectable } from "@nestjs/common";
import { DataSource, type EntityTarget } from "typeorm";
import { englishCode } from "./english-code";
import { type ShopLookupRow } from "./lookup.rows";
import { normName, type LookupIndex, type ShopTerm } from "./shop-term";

export interface LookupRecord {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  mebleRefId: string | null;
}

@Injectable()
export class ShopLookupStore {
  constructor(private readonly dataSource: DataSource) {}

  async upsert(entity: EntityTarget<ShopLookupRow>, terms: ShopTerm[]): Promise<LookupIndex> {
    const repo = this.dataSource.getRepository(entity);
    const existing = await repo.find();
    const byRef = new Map(existing.flatMap((row) => (row.mebleRefId ? [[row.mebleRefId, row] as const] : [])));
    const byCode = new Map(existing.map((row) => [row.code, row]));
    for (const term of assignCodes(terms)) {
      const found = (term.mebleRefId ? byRef.get(term.mebleRefId) : undefined) ?? byCode.get(term.code);
      if (found) {
        found.name = term.name;
        found.sortOrder = term.sortOrder;
        if (!found.mebleRefId && term.mebleRefId) found.mebleRefId = term.mebleRefId;
        await repo.save(found);
        byCode.set(found.code, found);
        if (found.mebleRefId) byRef.set(found.mebleRefId, found);
        continue;
      }
      const saved = await repo.save(
        repo.create({
          code: term.code,
          name: term.name,
          sortOrder: term.sortOrder,
          mebleRefId: term.mebleRefId,
        } as ShopLookupRow),
      );
      byCode.set(saved.code, saved);
      if (saved.mebleRefId) byRef.set(saved.mebleRefId, saved);
    }
    const rows = await repo.find();
    return {
      byName: new Map(rows.map((row) => [normName(row.name), row.id])),
      byCode: new Map(rows.map((row) => [row.code, row.id])),
    };
  }

  async list(entity: EntityTarget<ShopLookupRow>): Promise<LookupRecord[]> {
    const rows = await this.dataSource.getRepository(entity).find({ order: { sortOrder: "ASC", name: "ASC" } });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sortOrder: row.sortOrder,
      mebleRefId: row.mebleRefId,
    }));
  }
}

function assignCodes(terms: ShopTerm[]): ShopTerm[] {
  const used = new Set<string>();
  return terms.map((term) => {
    let code = term.code || englishCode(term.name);
    if (used.has(code)) code = `${code}-${term.mebleRefId ?? used.size + 1}`;
    used.add(code);
    return { ...term, code };
  });
}

export function lookupId(index: LookupIndex, name: string | null): string | null {
  if (!name) return null;
  return index.byName.get(normName(name)) ?? null;
}

export function mergeNamedTerms(fromShop: ShopTerm[], names: Array<string | null>): ShopTerm[] {
  const byName = new Map<string, ShopTerm>();
  for (const term of fromShop) byName.set(normName(term.name), term);
  let extra = 0;
  for (const name of names) {
    if (!name?.trim()) continue;
    const key = normName(name);
    if (byName.has(key)) continue;
    extra += 1;
    byName.set(key, { mebleRefId: null, code: englishCode(name), name: name.trim(), sortOrder: 1000 + extra });
  }
  return [...byName.values()];
}
