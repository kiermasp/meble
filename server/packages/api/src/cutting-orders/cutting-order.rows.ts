import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MaterialRow } from "../materials/material.row";
import { numericColumn } from "./numeric";

@Entity({ name: "cutting_orders" })
@Check(`"status" = 'parked'`)
export class CuttingOrderRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", default: "parked" })
  status!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => CuttingPieceRow, (piece) => piece.order, { cascade: ["insert"] })
  pieces!: CuttingPieceRow[];
}

@Entity({ name: "cutting_pieces" })
@Check(`"grain" IN ('along-length', 'along-width', 'none')`)
@Index(["cuttingOrderId", "sortOrder"])
export class CuttingPieceRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "cutting_order_id", type: "uuid" })
  cuttingOrderId!: string;

  @ManyToOne(() => CuttingOrderRow, (order) => order.pieces, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cutting_order_id" })
  order!: CuttingOrderRow;

  @Column({ name: "sort_order", type: "int" })
  sortOrder!: number;

  @Column(numericColumn("width_mm", 8, 2))
  widthMm!: number;

  @Column(numericColumn("height_mm", 8, 2))
  heightMm!: number;

  @Column(numericColumn("thickness_mm", 6, 2))
  thicknessMm!: number;

  @Column({ type: "int" })
  quantity!: number;

  @Index()
  @Column({ name: "material_id", type: "uuid" })
  materialId!: string;

  @ManyToOne(() => MaterialRow, { nullable: false, onDelete: "RESTRICT", onUpdate: "NO ACTION" })
  @JoinColumn({ name: "material_id" })
  material!: MaterialRow;

  @Column({ type: "text" })
  grain!: string;

  @OneToMany(() => PieceEdgeRow, (edge) => edge.piece, { cascade: ["insert"] })
  edges!: PieceEdgeRow[];

  @OneToMany(() => PieceHoleRow, (hole) => hole.piece, { cascade: ["insert"] })
  holes!: PieceHoleRow[];
}

@Entity({ name: "piece_edges" })
@Check(`"side" IN ('top', 'bottom', 'left', 'right')`)
@Index(["cuttingPieceId", "sortOrder"])
export class PieceEdgeRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "cutting_piece_id", type: "uuid" })
  cuttingPieceId!: string;

  @ManyToOne(() => CuttingPieceRow, (piece) => piece.edges, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cutting_piece_id" })
  piece!: CuttingPieceRow;

  @Column({ name: "sort_order", type: "int" })
  sortOrder!: number;

  @Column({ type: "text" })
  side!: string;

  @Column({ name: "material_reference", type: "text", nullable: true })
  materialReference!: string | null;

  @Column(numericColumn("thickness_mm", 5, 2, true))
  thicknessMm!: number | null;
}

@Entity({ name: "piece_holes" })
@Index(["cuttingPieceId", "sortOrder"])
export class PieceHoleRow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "cutting_piece_id", type: "uuid" })
  cuttingPieceId!: string;

  @ManyToOne(() => CuttingPieceRow, (piece) => piece.holes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cutting_piece_id" })
  piece!: CuttingPieceRow;

  @Column({ name: "sort_order", type: "int" })
  sortOrder!: number;

  @Column(numericColumn("x_mm", 8, 2))
  xMm!: number;

  @Column(numericColumn("y_mm", 8, 2))
  yMm!: number;

  @Column(numericColumn("diameter_mm", 6, 2))
  diameterMm!: number;

  @Column(numericColumn("depth_mm", 6, 2, true))
  depthMm!: number | null;
}

export const CUTTING_ORDER_ENTITIES = [CuttingOrderRow, CuttingPieceRow, PieceEdgeRow, PieceHoleRow];
