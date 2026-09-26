/** One shared shop label. mebleRefId is the shop's own id when the listing exposes it. */
export interface ShopTerm {
  mebleRefId: string | null;
  code: string;
  name: string;
  sortOrder: number;
}

export interface ListingDictionaries {
  category: ShopTerm;
  manufacturers: ShopTerm[];
  decorKinds: ShopTerm[];
  waterResistances: ShopTerm[];
  decorTypes: ShopTerm[];
  shades: ShopTerm[];
  colors: ShopTerm[];
  brightnesses: ShopTerm[];
  collectionStatuses: ShopTerm[];
}

export interface LookupIndex {
  byName: Map<string, string>;
  byCode: Map<string, string>;
}

export function normName(name: string): string {
  return name.trim().toLocaleLowerCase("pl");
}
