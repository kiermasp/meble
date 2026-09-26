import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** Shared columns for a shop dictionary. `code` is ours; `meble_ref_id` is the shop's id. */
export abstract class ShopLookupRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  code!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "sort_order", type: "int" })
  sortOrder!: number;

  @Column({ name: "meble_ref_id", type: "text", unique: true, nullable: true })
  mebleRefId!: string | null;
}

@Entity({ name: "categories" })
export class CategoryRow extends ShopLookupRow {}

@Entity({ name: "manufacturers" })
export class ManufacturerRow extends ShopLookupRow {}

@Entity({ name: "decor_kinds" })
export class DecorKindRow extends ShopLookupRow {}

@Entity({ name: "water_resistances" })
export class WaterResistanceRow extends ShopLookupRow {}

@Entity({ name: "decor_types" })
export class DecorTypeRow extends ShopLookupRow {}

@Entity({ name: "shades" })
export class ShadeRow extends ShopLookupRow {}

@Entity({ name: "colors" })
export class ColorRow extends ShopLookupRow {}

@Entity({ name: "brightnesses" })
export class BrightnessRow extends ShopLookupRow {}

@Entity({ name: "collection_statuses" })
export class CollectionStatusRow extends ShopLookupRow {}

export const LOOKUP_ENTITIES = [
  CategoryRow,
  ManufacturerRow,
  DecorKindRow,
  WaterResistanceRow,
  DecorTypeRow,
  ShadeRow,
  ColorRow,
  BrightnessRow,
  CollectionStatusRow,
];
