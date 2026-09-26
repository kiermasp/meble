import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  BrightnessRow,
  CategoryRow,
  CollectionStatusRow,
  ColorRow,
  DecorKindRow,
  DecorTypeRow,
  ManufacturerRow,
  ShadeRow,
  WaterResistanceRow,
} from "../lookups/lookup.rows";

const numeric = (name: string, precision: number, scale: number) => ({
  name,
  type: "numeric" as const,
  precision,
  scale,
  nullable: true,
  transformer: {
    to: (value: number | null) => value,
    from: (value: string | null) => (value == null ? null : Number(value)),
  },
});

@Entity({ name: "materials" })
@Index(["categoryId", "mebleRefId"], { unique: true })
export class MaterialRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "meble_ref_id", type: "text" })
  mebleRefId!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @Index()
  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @ManyToOne(() => CategoryRow, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category!: CategoryRow;

  @Column({ type: "text", nullable: true })
  subtype!: string | null;

  @Index()
  @Column({ name: "manufacturer_id", type: "uuid", nullable: true })
  manufacturerId!: string | null;

  @ManyToOne(() => ManufacturerRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "manufacturer_id" })
  manufacturer!: ManufacturerRow | null;

  @Column({ name: "decor_code", type: "text", nullable: true })
  decorCode!: string | null;

  @Column({ name: "decor_name", type: "text", nullable: true })
  decorName!: string | null;

  @Column({ type: "text", nullable: true })
  structure!: string | null;

  @Column(numeric("thickness_mm", 5, 1))
  thicknessMm!: number | null;

  @Column({ type: "text", nullable: true })
  format!: string | null;

  @Column({ type: "text", nullable: true })
  availability!: string | null;

  @Column(numeric("unit_price_amount", 12, 2))
  unitPriceAmount!: number | null;

  @Column({ type: "text", nullable: true })
  currency!: string | null;

  @Index()
  @Column({ name: "decor_kind_id", type: "uuid", nullable: true })
  decorKindId!: string | null;

  @ManyToOne(() => DecorKindRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "decor_kind_id" })
  decorKind!: DecorKindRow | null;

  @Index()
  @Column({ name: "water_resistance_id", type: "uuid", nullable: true })
  waterResistanceId!: string | null;

  @ManyToOne(() => WaterResistanceRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "water_resistance_id" })
  waterResistance!: WaterResistanceRow | null;

  @Index()
  @Column({ name: "brightness_id", type: "uuid", nullable: true })
  brightnessId!: string | null;

  @ManyToOne(() => BrightnessRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "brightness_id" })
  brightness!: BrightnessRow | null;

  @Index()
  @Column({ name: "decor_type_id", type: "uuid", nullable: true })
  decorTypeId!: string | null;

  @ManyToOne(() => DecorTypeRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "decor_type_id" })
  decorType!: DecorTypeRow | null;

  @Index()
  @Column({ name: "shade_id", type: "uuid", nullable: true })
  shadeId!: string | null;

  @ManyToOne(() => ShadeRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "shade_id" })
  shade!: ShadeRow | null;

  @Index()
  @Column({ name: "color_id", type: "uuid", nullable: true })
  colorId!: string | null;

  @ManyToOne(() => ColorRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "color_id" })
  color!: ColorRow | null;

  @OneToMany(() => MaterialCollectionStatusRow, (link) => link.material)
  collectionLinks!: MaterialCollectionStatusRow[];

  @Column({ name: "fetched_at", type: "timestamptz" })
  fetchedAt!: Date;
}

@Entity({ name: "material_collection_statuses" })
export class MaterialCollectionStatusRow {
  @PrimaryColumn({ name: "material_id", type: "uuid" })
  materialId!: string;

  @PrimaryColumn({ name: "collection_status_id", type: "uuid" })
  collectionStatusId!: string;

  @ManyToOne(() => MaterialRow, (material) => material.collectionLinks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "material_id" })
  material!: MaterialRow;

  @ManyToOne(() => CollectionStatusRow, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "collection_status_id" })
  status!: CollectionStatusRow;
}
