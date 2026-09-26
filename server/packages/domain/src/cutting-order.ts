/** Local cutting-order draft. Nothing here is sent to a shop. */

export const PARKED_STATUS = "parked" as const;

export type CuttingOrderStatus = typeof PARKED_STATUS;

/** Grain parallel to heightMm, parallel to widthMm, or none. */
export const GRAIN_DIRECTIONS = ["along-length", "along-width", "none"] as const;

export type GrainDirection = (typeof GRAIN_DIRECTIONS)[number];

export const EDGE_SIDES = ["top", "bottom", "left", "right"] as const;

export type EdgeSide = (typeof EDGE_SIDES)[number];

export interface PieceEdge {
  id: string;
  side: EdgeSide;
  materialReference: string | null;
  thicknessMm: number | null;
}

export interface PieceHole {
  id: string;
  /** Distance from the left edge of the piece. */
  xMm: number;
  /** Distance from the bottom edge of the piece. */
  yMm: number;
  diameterMm: number;
  /** Null means a through hole. */
  depthMm: number | null;
}

export interface CuttingPiece {
  id: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  quantity: number;
  /** Catalog code of the board, stored on the draft. */
  materialReference: string;
  grain: GrainDirection;
  edges: PieceEdge[];
  holes: PieceHole[];
}

export interface CuttingOrder {
  id: string;
  status: CuttingOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  pieces: CuttingPiece[];
}

export interface PieceEdgeDraft {
  side: EdgeSide;
  materialReference: string | null;
  thicknessMm: number | null;
}

export interface PieceHoleDraft {
  xMm: number;
  yMm: number;
  diameterMm: number;
  depthMm: number | null;
}

export interface CuttingPieceDraft {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  quantity: number;
  materialReference: string;
  grain: GrainDirection;
  edges: PieceEdgeDraft[];
  holes: PieceHoleDraft[];
}

export interface CuttingOrderDraft {
  pieces: CuttingPieceDraft[];
}

export function isGrainDirection(value: string): value is GrainDirection {
  return (GRAIN_DIRECTIONS as readonly string[]).includes(value);
}

export function isEdgeSide(value: string): value is EdgeSide {
  return (EDGE_SIDES as readonly string[]).includes(value);
}

export function isParkedStatus(value: string): value is CuttingOrderStatus {
  return value === PARKED_STATUS;
}
