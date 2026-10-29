// ============================================================================
// lib/collision.ts — Component bounding box & collision detection system
//
// Prevents components from overlapping on the canvas, calculates bounding
// boxes with padding, and finds the nearest valid grid slot when placing.
// ============================================================================

import type { Node } from '@xyflow/react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Standard component dimensions (width x height in canvas units) */
export const COMPONENT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  resistor: { width: 110, height: 60 },
  capacitor: { width: 110, height: 60 },
  inductor: { width: 110, height: 60 },
  voltage_source: { width: 100, height: 70 },
  ground: { width: 80, height: 60 },
  led: { width: 100, height: 65 },
  switch: { width: 110, height: 60 },
};

/** Get the center offset for placing a component centered at cursor */
export function getComponentCenterOffset(type: string, rotation: number = 0): { x: number; y: number } {
  const dim = COMPONENT_DIMENSIONS[type] || { width: 110, height: 60 };
  const isRot = rotation === 90 || rotation === 270;
  const w = isRot ? dim.height : dim.width;
  const h = isRot ? dim.width : dim.height;
  return { x: Math.round(w / 2), y: Math.round(h / 2) };
}

/** Get the bounding box for a component node with rotation support */
export function getComponentBoundingBox(
  type: string,
  position: { x: number; y: number },
  rotation: number = 0,
  buffer: number = 16
): BoundingBox {
  const baseDim = COMPONENT_DIMENSIONS[type] || { width: 110, height: 60 };
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const width = isRotated90or270 ? baseDim.height : baseDim.width;
  const height = isRotated90or270 ? baseDim.width : baseDim.height;

  return {
    x: position.x - buffer,
    y: position.y - buffer,
    width: width + buffer * 2,
    height: height + buffer * 2,
  };
}

/** Check if two bounding boxes intersect (AABB collision test) */
export function doBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * Check if placing/moving a component at targetPos collides with any existing node.
 * Returns the conflicting node if collision detected, otherwise null.
 */
export function checkCollision(
  targetType: string,
  targetPos: { x: number; y: number },
  existingNodes: Node[],
  excludeNodeId?: string | null,
  buffer: number = 16
): Node | null {
  const targetBox = getComponentBoundingBox(targetType, targetPos, 0, buffer);

  for (const node of existingNodes) {
    if (excludeNodeId && node.id === excludeNodeId) continue;

    const nodeRotation = ((node.data?.rotation as number) || 0);
    const nodeBox = getComponentBoundingBox(
      node.type || 'resistor',
      node.position,
      nodeRotation,
      buffer
    );

    if (doBoxesIntersect(targetBox, nodeBox)) {
      return node;
    }
  }

  return null;
}

export function isPositionValid(
  targetType: string,
  targetPos: { x: number; y: number },
  existingNodes: Node[],
  excludeNodeId?: string | null,
  buffer: number = 16
): boolean {
  return checkCollision(targetType, targetPos, existingNodes, excludeNodeId, buffer) === null;
}

/**
 * Finds the nearest non-overlapping grid slot using an outward spiral search.
 * Snaps to the specified grid resolution (default 16px).
 */
export function findNearestValidPosition(
  targetType: string,
  targetPos: { x: number; y: number },
  existingNodes: Node[],
  excludeNodeId?: string | null,
  gridSize: number = 16,
  maxRadius: number = 500
): { x: number; y: number; wasAdjusted: boolean; conflictingNode: Node | null } {
  // 1. First snap candidate position to grid
  const initialPos = {
    x: Math.round(targetPos.x / gridSize) * gridSize,
    y: Math.round(targetPos.y / gridSize) * gridSize,
  };

  const initialCollision = checkCollision(targetType, initialPos, existingNodes, excludeNodeId);
  // If initial position doesn't collide, use it directly
  if (!initialCollision) {
    return { ...initialPos, wasAdjusted: false, conflictingNode: null };
  }

  // 2. Perform radial spiral search in steps of gridSize
  const step = gridSize * 2; // Step by 32px for clean spacing
  const maxSteps = Math.ceil(maxRadius / step);

  for (let ring = 1; ring <= maxSteps; ring++) {
    const dist = ring * step;

    // Check points along square perimeter of radius dist
    const candidates: Array<{ x: number; y: number }> = [];

    for (let x = -dist; x <= dist; x += step) {
      candidates.push({ x: initialPos.x + x, y: initialPos.y - dist });
      candidates.push({ x: initialPos.x + x, y: initialPos.y + dist });
    }
    for (let y = -dist + step; y < dist; y += step) {
      candidates.push({ x: initialPos.x - dist, y: initialPos.y + y });
      candidates.push({ x: initialPos.x + dist, y: initialPos.y + y });
    }

    // Sort candidates by Euclidean distance to targetPos to keep closest
    candidates.sort((a, b) => {
      const distA = Math.hypot(a.x - targetPos.x, a.y - targetPos.y);
      const distB = Math.hypot(b.x - targetPos.x, b.y - targetPos.y);
      return distA - distB;
    });

    for (const cand of candidates) {
      if (!checkCollision(targetType, cand, existingNodes, excludeNodeId)) {
        return { ...cand, wasAdjusted: true, conflictingNode: initialCollision };
      }
    }
  }

  // Fallback offset if space is completely saturated
  return {
    x: initialPos.x + 96,
    y: initialPos.y + 96,
    wasAdjusted: true,
    conflictingNode: initialCollision,
  };
}

/**
 * Computes exact bounding box for a React Flow node taking type dimensions and rotation into account.
 */
export function getComponentBounds(node: any): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  const type = node.type || 'resistor';
  const baseDim = COMPONENT_DIMENSIONS[type] || { width: 110, height: 60 };
  const rotation = (((node.data?.rotation as number) || 0) % 360 + 360) % 360;
  const isRotated = rotation === 90 || rotation === 270;
  const width = isRotated ? baseDim.height : baseDim.width;
  const height = isRotated ? baseDim.width : baseDim.height;
  const left = node.position.x;
  const top = node.position.y;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

/**
 * Robust hit testing for gesture interaction.
 * - Only selects a component if the cursor is genuinely inside its bounding box (+ touchPadding).
 * - Resolves overlapping components deterministically by selecting the closest center.
 * - Returns null if no component is underneath (never selects distant components!).
 */
export function findComponentUnderCursor(
  nodes: any[],
  flowCursor: { x: number; y: number },
  touchPadding: number = 8
): {
  targetNode: any | null;
  minDistance: number | null;
  candidates: Array<{
    node: any;
    bounds: ReturnType<typeof getComponentBounds>;
    distanceToCenter: number;
    isInside: boolean;
  }>;
} {
  const candidates: Array<{
    node: any;
    bounds: ReturnType<typeof getComponentBounds>;
    distanceToCenter: number;
    isInside: boolean;
  }> = [];

  for (const node of nodes) {
    const bounds = getComponentBounds(node);
    const isInside =
      flowCursor.x >= bounds.left - touchPadding &&
      flowCursor.x <= bounds.right + touchPadding &&
      flowCursor.y >= bounds.top - touchPadding &&
      flowCursor.y <= bounds.bottom + touchPadding;

    const distanceToCenter = Math.hypot(
      bounds.centerX - flowCursor.x,
      bounds.centerY - flowCursor.y
    );

    candidates.push({
      node,
      bounds,
      distanceToCenter,
      isInside,
    });
  }

  // Filter only candidate components whose bounding box actually contains the cursor
  const hitCandidates = candidates.filter(c => c.isInside);

  if (hitCandidates.length === 0) {
    return { targetNode: null, minDistance: null, candidates };
  }

  // Sort deterministically: closest distance to center first
  hitCandidates.sort((a, b) => a.distanceToCenter - b.distanceToCenter);

  return {
    targetNode: hitCandidates[0].node,
    minDistance: hitCandidates[0].distanceToCenter,
    candidates,
  };
}
