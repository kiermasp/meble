export interface Material {
  /** meble.pl product id from the listing card data-id. Same value as id_produktu. */
  mebleRefId: string;
  displayName: string;
  /** English code of the categories row, such as plyty-meblowe. */
  category: string;
  subtype: string | null;
  manufacturer: string | null;
  decorCode: string | null;
  decorName: string | null;
  structure: string | null;
  thicknessMm: number | null;
  format: string | null;
  /** Lead time printed on the shop card, such as 48h or 7 dni. */
  availability: string | null;
  unitPriceAmount: number | null;
  currency: string | null;
  /** Shop filter "Rodzaj dekoru": Magazynowe or Produkcyjne (na zamówienie). */
  decorKind: string | null;
  waterResistance: string | null;
  brightness: string | null;
  decorType: string | null;
  shade: string | null;
  color: string | null;
  statuses: string[];
  fetchedAt: Date;
}
