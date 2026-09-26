import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "materials" })
@Index(["category", "mebleRefId"], { unique: true })
export class MaterialRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "meble_ref_id", type: "text" })
  mebleRefId!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @Column({ type: "text" })
  category!: string;

  @Column({ type: "text", nullable: true })
  subtype!: string | null;

  @Column({ type: "text", nullable: true })
  manufacturer!: string | null;

  @Column({ name: "decor_code", type: "text", nullable: true })
  decorCode!: string | null;

  @Column({ name: "decor_name", type: "text", nullable: true })
  decorName!: string | null;

  @Column({ type: "text", nullable: true })
  structure!: string | null;

  @Column({
    name: "thickness_mm",
    type: "numeric",
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  thicknessMm!: number | null;

  @Column({ type: "text", nullable: true })
  format!: string | null;

  @Column({ type: "text", nullable: true })
  availability!: string | null;

  @Column({
    name: "unit_price_amount",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  unitPriceAmount!: number | null;

  @Column({ type: "text", nullable: true })
  currency!: string | null;

  @Column({ name: "decor_kind", type: "text", nullable: true })
  decorKind!: string | null;

  @Column({ name: "water_resistance", type: "text", nullable: true })
  waterResistance!: string | null;

  @Column({ type: "text", nullable: true })
  brightness!: string | null;

  @Column({ name: "decor_type", type: "text", nullable: true })
  decorType!: string | null;

  @Column({ type: "text", nullable: true })
  shade!: string | null;

  @Column({ type: "text", nullable: true })
  color!: string | null;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  statuses!: string[];

  @Column({ name: "fetched_at", type: "timestamptz" })
  fetchedAt!: Date;
}
