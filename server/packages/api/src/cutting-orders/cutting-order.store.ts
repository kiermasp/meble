import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { CuttingOrder, CuttingOrderDraft, CuttingPieceDraft } from "@meble/domain";
import { Repository, type EntityManager } from "typeorm";
import { toCuttingOrder } from "./cutting-order.mapper";
import { EdgebandRow } from "../edgebands/edgeband.row";
import { MaterialRow } from "../materials/material.row";
import { CuttingOrderRow, CuttingPieceRow, PieceEdgeRow, PieceHoleRow } from "./cutting-order.rows";

const ORDER_RELATIONS = { pieces: { edges: true, holes: true } } as const;

export class UnknownMaterialError extends Error {
  readonly materialId: string;

  constructor(materialId: string) {
    super(`Unknown material ${materialId}`);
    this.materialId = materialId;
  }
}

export class UnknownEdgebandError extends Error {
  readonly edgebandId: string;

  constructor(edgebandId: string) {
    super(`Unknown edgeband ${edgebandId}`);
    this.edgebandId = edgebandId;
  }
}

@Injectable()
export class CuttingOrderStore {
  constructor(
    @InjectRepository(CuttingOrderRow)
    private readonly orders: Repository<CuttingOrderRow>,
  ) {}

  async create(draft: CuttingOrderDraft): Promise<CuttingOrder> {
    return this.orders.manager.transaction(async (manager) => {
      await this.assertMaterials(manager, draft.pieces.map((piece) => piece.materialId));
      await this.assertEdgebands(manager, draft.pieces.flatMap((piece) => piece.edges.map((edge) => edge.edgebandId)));
      const saved = await manager.save(manager.create(CuttingOrderRow, { status: "parked" }));
      const pieces = draft.pieces.map((piece, index) => {
        const row = this.pieceRow(piece, index);
        row.cuttingOrderId = saved.id;
        row.order = saved;
        return row;
      });
      if (pieces.length > 0) await this.savePieces(manager, pieces);
      const loaded = await manager.findOne(CuttingOrderRow, {
        where: { id: saved.id },
        relations: ORDER_RELATIONS,
      });
      if (!loaded) throw new Error(`Cutting order ${saved.id} disappeared after save`);
      return toCuttingOrder(loaded);
    });
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
      await this.assertMaterials(manager, draft.pieces.map((piece) => piece.materialId));
      await this.assertEdgebands(manager, draft.pieces.flatMap((piece) => piece.edges.map((edge) => edge.edgebandId)));
      await manager.delete(CuttingPieceRow, { cuttingOrderId: id });
      const pieces = draft.pieces.map((piece, index) => {
        const row = this.pieceRow(piece, index);
        row.cuttingOrderId = id;
        row.order = existing;
        return row;
      });
      if (pieces.length > 0) await this.savePieces(manager, pieces);
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

  private async savePieces(manager: EntityManager, pieces: CuttingPieceRow[]): Promise<void> {
    const edges = pieces.map((piece) => piece.edges ?? []);
    const holes = pieces.map((piece) => piece.holes ?? []);
    for (const piece of pieces) {
      piece.edges = [];
      piece.holes = [];
    }
    const saved = await manager.save(CuttingPieceRow, pieces);
    const edgeRows = saved.flatMap((piece, index) =>
      (edges[index] ?? []).map((edge) => {
        edge.cuttingPieceId = piece.id;
        edge.piece = piece;
        return edge;
      }),
    );
    const holeRows = saved.flatMap((piece, index) =>
      (holes[index] ?? []).map((hole) => {
        hole.cuttingPieceId = piece.id;
        hole.piece = piece;
        return hole;
      }),
    );
    if (edgeRows.length > 0) await manager.save(PieceEdgeRow, edgeRows);
    if (holeRows.length > 0) await manager.save(PieceHoleRow, holeRows);
  }

  private pieceRow(piece: CuttingPieceDraft, sortOrder: number): CuttingPieceRow {
    const row = new CuttingPieceRow();
    row.sortOrder = sortOrder;
    row.widthMm = piece.widthMm;
    row.heightMm = piece.heightMm;
    row.thicknessMm = piece.thicknessMm;
    row.quantity = piece.quantity;
    row.materialId = piece.materialId;
    row.material = { id: piece.materialId } as MaterialRow;
    row.grain = piece.grain;
    row.edges = piece.edges.map((edge, index) => {
      const edgeRow = new PieceEdgeRow();
      edgeRow.sortOrder = index;
      edgeRow.side = edge.side;
      edgeRow.edgebandId = edge.edgebandId;
      edgeRow.edgeband = { id: edge.edgebandId } as EdgebandRow;
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

  private async assertMaterials(manager: EntityManager, materialIds: string[]): Promise<void> {
    const unique = [...new Set(materialIds)];
    if (unique.length === 0) return;
    const found: { id: string }[] = await manager.query(
      "SELECT id FROM materials WHERE id = ANY($1::uuid[])",
      [unique],
    );
    const known = new Set(found.map((row) => row.id));
    const missing = unique.find((id) => !known.has(id));
    if (missing) throw new UnknownMaterialError(missing);
  }

  private async assertEdgebands(manager: EntityManager, edgebandIds: string[]): Promise<void> {
    const unique = [...new Set(edgebandIds)];
    if (unique.length === 0) return;
    const found: { id: string }[] = await manager.query(
      "SELECT id FROM edgebands WHERE id = ANY($1::uuid[])",
      [unique],
    );
    const known = new Set(found.map((row) => row.id));
    const missing = unique.find((id) => !known.has(id));
    if (missing) throw new UnknownEdgebandError(missing);
  }
}
