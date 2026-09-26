import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "materials" })
@Index(["category", "externalCode"], { unique: true })
export class MaterialRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "external_code", type: "text" })
  externalCode!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @Column({ type: "text" })
  category!: string;

  @Column({ type: "text", nullable: true })
  manufacturer!: string | null;

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

  @Column({ type: "text" })
  availability!: string;

  @Column({ name: "fetched_at", type: "timestamptz" })
  fetchedAt!: Date;
}
