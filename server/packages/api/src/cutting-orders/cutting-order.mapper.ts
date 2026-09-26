import {
  isEdgeSide,
  isGrainDirection,
  isParkedStatus,
  type CuttingOrder,
  type CuttingPiece,
  type PieceEdge,
  type PieceHole,
} from "@meble/domain";
import { CuttingOrderRow, CuttingPieceRow, PieceEdgeRow, PieceHoleRow } from "./cutting-order.rows";

export function toCuttingOrder(row: CuttingOrderRow): CuttingOrder {
  if (!isParkedStatus(row.status)) {
    throw new Error(`Cutting order ${row.id} is not parked`);
  }
  const pieces = [...(row.pieces ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    id: row.id,
    status: row.status,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    pieces: pieces.map(toPiece),
  };
}

function toPiece(row: CuttingPieceRow): CuttingPiece {
  if (!isGrainDirection(row.grain)) {
    throw new Error(`Unknown grain on piece ${row.id}: ${row.grain}`);
  }
  const edges = [...(row.edges ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
  const holes = [...(row.holes ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    id: row.id,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    thicknessMm: row.thicknessMm,
    quantity: row.quantity,
    materialId: row.materialId,
    grain: row.grain,
    edges: edges.map(toEdge),
    holes: holes.map(toHole),
  };
}

function toEdge(row: PieceEdgeRow): PieceEdge {
  if (!isEdgeSide(row.side)) {
    throw new Error(`Unknown edge side on ${row.id}: ${row.side}`);
  }
  return {
    id: row.id,
    side: row.side,
    edgebandId: row.edgebandId,
    thicknessMm: row.thicknessMm,
  };
}

function toHole(row: PieceHoleRow): PieceHole {
  return {
    id: row.id,
    xMm: row.xMm,
    yMm: row.yMm,
    diameterMm: row.diameterMm,
    depthMm: row.depthMm,
  };
}
