/** One purchasable edgeband from the shop listing. */
export interface Edgeband {
  /** meble.pl product id from the listing card data-id. Same value as id_produktu. */
  mebleRefId: string;
  displayName: string;
  code: string | null;
  name: string | null;
  manufacturer: string | null;
  structure: string | null;
  widthMm: number | null;
  thicknessMm: number | null;
  availability: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  fetchedAt: Date;
}
