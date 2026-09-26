import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CategoryRow, ManufacturerRow } from "../lookups/lookup.rows";

@Entity({ name: "edgebands" })
@Index(["mebleRefId"], { unique: true })
export class EdgebandRow {
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
  code!: string | null;

  @Column({ type: "text", nullable: true })
  name!: string | null;

  @Index()
  @Column({ name: "manufacturer_id", type: "uuid", nullable: true })
  manufacturerId!: string | null;

  @ManyToOne(() => ManufacturerRow, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "manufacturer_id" })
  manufacturer!: ManufacturerRow | null;

  @Column({ type: "text", nullable: true })
  structure!: string | null;

  @Column({
    name: "width_mm",
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  widthMm!: number | null;

  @Column({
    name: "thickness_mm",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  thicknessMm!: number | null;

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

  @Column({ name: "fetched_at", type: "timestamptz" })
  fetchedAt!: Date;

  @Column({ name: "updated_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}
