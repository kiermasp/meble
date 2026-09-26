import type { Edgeband } from "@meble/domain";
import type { ListingCard } from "../materials/parse-shop-listing";
import { parseEdgebandTitle } from "./parse-edgeband-title";

export function buildEdgeband(card: ListingCard, fetchedAt: Date): Edgeband {
  const parsed = parseEdgebandTitle(card.displayName, card.manufacturer);
  return {
    externalCode: card.externalCode,
    displayName: card.displayName,
    code: parsed.code,
    name: parsed.name,
    manufacturer: card.manufacturer,
    structure: parsed.structure,
    widthMm: parsed.widthMm,
    thicknessMm: parsed.thicknessMm,
    availability: card.availability,
    unitPriceAmount: card.unitPriceAmount,
    currency: card.currency,
    fetchedAt,
  };
}
