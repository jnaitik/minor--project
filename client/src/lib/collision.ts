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
