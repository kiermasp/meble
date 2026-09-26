import type { Material } from "@meble/domain";
import type { ListingCard } from "./parse-shop-listing";
import type { ProductSpecs } from "./parse-product-page";

export interface VariantTags {
  decorKind: string | null;
  brightness: string | null;
  decorType: string | null;
  shade: string | null;
  statuses: string[];
}

export function emptyTags(): VariantTags {
  return { decorKind: null, brightness: null, decorType: null, shade: null, statuses: [] };
}

export function buildVariant(
  card: ListingCard,
  spec: ProductSpecs | null,
  tags: VariantTags,
  fetchedAt: Date,
): Material {
  return {
    externalCode: card.externalCode,
    displayName: card.displayName,
    category: "plyty-meblowe",
    subtype: spec?.subtype ?? null,
    manufacturer: card.manufacturer,
    decorCode: card.decorCode,
    decorName: card.decorName,
    structure: spec?.structure ?? card.structure,
    thicknessMm: spec?.thicknessMm ?? card.thicknessMm,
    format: spec?.format ?? card.format,
    availability: card.availability,
    unitPriceAmount: card.unitPriceAmount,
    currency: card.currency,
    decorKind: tags.decorKind,
    waterResistance: spec?.waterResistance ?? null,
    brightness: tags.brightness,
    decorType: tags.decorType,
    shade: tags.shade,
    color: spec?.color ?? null,
    statuses: tags.statuses,
    fetchedAt,
  };
}
