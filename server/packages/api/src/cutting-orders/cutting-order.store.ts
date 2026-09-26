import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { CuttingOrder, CuttingOrderDraft, CuttingPieceDraft } from "@meble/domain";
import { Repository } from "typeorm";
import { toCuttingOrder } from "./cutting-order.mapper";
import { CuttingOrderRow, CuttingPieceRow, PieceEdgeRow, PieceHoleRow } from "./cutting-order.rows";

const ORDER_RELATIONS = { pieces: { edges: true, holes: true } } as const;

@Injectable()
export class CuttingOrderStore {
  constructor(
    @InjectRepository(CuttingOrderRow)
    private readonly orders: Repository<CuttingOrderRow>,
  ) {}

  async create(draft: CuttingOrderDraft): Promise<CuttingOrder> {
    const order = this.orders.create({ status: "parked" });
    order.pieces = draft.pieces.map((piece, index) => this.pieceRow(piece, index));
    const saved = await this.orders.save(order);
    return toCuttingOrder(await this.load(saved.id));
  }

  async list(): Promise<CuttingOrder[]> {
    const rows = await this.orders.find({ relations: ORDER_RELATIONS });
    return rows.map(toCuttingOrder).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async find(id: string): Promise<CuttingOrder | null> {
    const row = await this.orders.findOne({ where: { id }, relations: ORDER_RELATIONS });
    return row ? toCuttingOrder(row) : null;
  }

  async update(id: string, draft: CuttingOrderDraft): Promise<CuttingOrder | null> {
    return this.orders.manager.transaction(async (manager) => {
      const existing = await manager.findOne(CuttingOrderRow, { where: { id } });
      if (!existing) return null;
      await manager.delete(CuttingPieceRow, { cuttingOrderId: id });
      const pieces = draft.pieces.map((piece, index) => {
        const row = this.pieceRow(piece, index);
        row.cuttingOrderId = id;
        return row;
      });
      if (pieces.length > 0) await manager.save(CuttingPieceRow, pieces);
      await manager
        .createQueryBuilder()
        .update(CuttingOrderRow)
        .set({ status: "parked", updatedAt: () => "now()" })
        .where("id = :id", { id })
        .execute();
      const loaded = await manager.findOne(CuttingOrderRow, {
        where: { id },
        relations: ORDER_RELATIONS,
      });
      if (!loaded) return null;
      return toCuttingOrder(loaded);
    });
  }

  private async load(id: string): Promise<CuttingOrderRow> {
    const row = await this.orders.findOne({ where: { id }, relations: ORDER_RELATIONS });
    if (!row) throw new Error(`Cutting order ${id} disappeared after save`);
    return row;
  }

  private pieceRow(piece: CuttingPieceDraft, sortOrder: number): CuttingPieceRow {
    const row = new CuttingPieceRow();
    row.sortOrder = sortOrder;
    row.widthMm = piece.widthMm;
    row.heightMm = piece.heightMm;
    row.thicknessMm = piece.thicknessMm;
    row.quantity = piece.quantity;
    row.materialReference = piece.materialReference;
    row.grain = piece.grain;
    row.edges = piece.edges.map((edge, index) => {
      const edgeRow = new PieceEdgeRow();
      edgeRow.sortOrder = index;
      edgeRow.side = edge.side;
      edgeRow.materialReference = edge.materialReference;
      edgeRow.thicknessMm = edge.thicknessMm;
      return edgeRow;
    });
    row.holes = piece.holes.map((hole, index) => {
      const holeRow = new PieceHoleRow();
      holeRow.sortOrder = index;
      holeRow.xMm = hole.xMm;
      holeRow.yMm = hole.yMm;
      holeRow.diameterMm = hole.diameterMm;
      holeRow.depthMm = hole.depthMm;
      return holeRow;
    });
    return row;
  }
}
