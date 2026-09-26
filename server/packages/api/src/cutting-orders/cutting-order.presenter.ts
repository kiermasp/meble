import type { CuttingOrder, CuttingOrderDraft, CuttingPieceDraft } from "@meble/domain";
import { CuttingOrderBodyDto } from "./cutting-order.dto";

export function presentCuttingOrder(order: CuttingOrder) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    pieces: order.pieces.map((piece) => ({
      id: piece.id,
      widthMm: piece.widthMm,
      heightMm: piece.heightMm,
      thicknessMm: piece.thicknessMm,
      quantity: piece.quantity,
      materialId: piece.materialId,
      grain: piece.grain,
      edges: piece.edges.map((edge) => ({
        id: edge.id,
        side: edge.side,
        edgebandId: edge.edgebandId,
        thicknessMm: edge.thicknessMm,
      })),
      holes: piece.holes.map((hole) => ({
        id: hole.id,
        xMm: hole.xMm,
        yMm: hole.yMm,
        diameterMm: hole.diameterMm,
        depthMm: hole.depthMm,
      })),
    })),
  };
}

export function toDraft(body: CuttingOrderBodyDto): CuttingOrderDraft {
  const pieces: CuttingPieceDraft[] = body.pieces.map((piece) => ({
    widthMm: piece.widthMm,
    heightMm: piece.heightMm,
    thicknessMm: piece.thicknessMm,
    quantity: piece.quantity,
    materialId: piece.materialId,
    grain: piece.grain,
    edges: piece.edges.map((edge) => ({
      side: edge.side,
      edgebandId: edge.edgebandId,
      thicknessMm: edge.thicknessMm ?? null,
    })),
    holes: piece.holes.map((hole) => ({
      xMm: hole.xMm,
      yMm: hole.yMm,
      diameterMm: hole.diameterMm,
      depthMm: hole.depthMm ?? null,
    })),
  }));
  return { pieces };
}
