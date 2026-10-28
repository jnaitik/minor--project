// ============================================================================
// lib/gestureRecognizer.ts — Hand gesture classification via trained MLP neural network
//
// Uses the lightweight MLP classifier trained on MediaPipe keypoints (keypoint.csv)
// to accurately classify hand gestures in real-time for the collaborative circuit simulator.
//
// Trained Classes (99.79% Test Accuracy):
//   Class 0: Open Palm (Pan Canvas)
//   Class 1: Fist (Hold / Stop / Delete)
//   Class 2: Point (Cursor navigation / Place component)
//   Class 3: Pinch / Pick (Grab / Select / Move component)
//
// Landmark indices (MediaPipe convention):
//   0: Wrist
//   1-4: Thumb (CMC, MCP, IP, TIP)
//   5-8: Index (MCP, PIP, DIP, TIP)
//   9-12: Middle (MCP, PIP, DIP, TIP)
//   13-16: Ring (MCP, PIP, DIP, TIP)
//   17-20: Pinky (MCP, PIP, DIP, TIP)
// ============================================================================

import type { GestureType, Position } from '../types';
import rawModelData from './gestureModelWeights.json';

/** A single landmark point from MediaPipe */
export interface Landmark {
  x: number; // 0-1 normalized (left-right)
  y: number; // 0-1 normalized (top-bottom)
  z: number; // depth
}

/** Result of gesture classification */
export interface GestureResult {
  gesture: GestureType;
  confidence: number;        // 0-1 classification confidence
  cursorPosition: Position;  // index finger tip mapped to canvas coordinates
  palmCenter: Position;      // center of palm for pan gesture
}

/** Layer definition within the exported MLP model */
interface ModelLayer {
  layer_index: number;
  input_dim: number;
  output_dim: number;
  activation: 'relu' | 'softmax';
  weights: number[][]; // [input_dim][output_dim]
  biases: number[];    // [output_dim]
}

/** Metadata and weights structure of the trained model */
export interface GestureModel {
  model_type: string;
  framework: string;
  architecture: number[];
  input_features: number;
  num_classes: number;
  accuracy: number;
  classes: Array<{
    index: number;
    id: GestureType;
    name: string;
    action: string;
  }>;
  layers: ModelLayer[];
}

/** Loaded trained MLP model */
const trainedModel: GestureModel = rawModelData as unknown as GestureModel;

/**
 * Preprocess raw MediaPipe landmarks into the exact feature representation
 * used during training:
 * 1. Convert to relative coordinates with wrist (landmark 0) as origin (0, 0)
 * 2. Normalize by the maximum absolute coordinate value across the hand so all
 *    features are scaled in the range [-1.0, 1.0], invariant to distance from camera.
 */
export function preprocessLandmarks(landmarks: Landmark[]): number[] {
  if (!landmarks || landmarks.length < 21) {
    return new Array(42).fill(0);
  }

  const baseX = landmarks[0].x;
  const baseY = landmarks[0].y;
  const features = new Array<number>(42);

  // 1. Coordinates relative to wrist
  for (let i = 0; i < 21; i++) {
    features[i * 2] = landmarks[i].x - baseX;
    features[i * 2 + 1] = landmarks[i].y - baseY;
  }

  // 2. Find max absolute value
  let maxAbs = 0;
  for (let i = 0; i < 42; i++) {
    const abs = Math.abs(features[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  // 3. Normalize into [-1, 1]
  if (maxAbs > 0) {
    for (let i = 0; i < 42; i++) {
      features[i] /= maxAbs;
    }
  }

  return features;
}

/**
 * Forward pass of the lightweight Multi-Layer Perceptron (MLP).
 * Computes: Input(42) -> Dense(64, ReLU) -> Dense(32, ReLU) -> Dense(4, Softmax)
 * Execution time: < 0.01 ms per frame (sub-microsecond pure JS matrix multiplication).
 */
export function forwardMLP(features: number[], model: GestureModel = trainedModel): number[] {
  let current = features;

  for (const layer of model.layers) {
    const { weights, biases, output_dim, activation } = layer;
    const next = new Array<number>(output_dim);

    for (let j = 0; j < output_dim; j++) {
      let sum = biases[j];
      for (let i = 0; i < current.length; i++) {
        sum += current[i] * weights[i][j];
      }
      next[j] = sum;
    }

    if (activation === 'relu') {
      current = next.map(v => (v > 0 ? v : 0));
    } else if (activation === 'softmax') {
      // Numerically stable softmax
      let maxVal = -Infinity;
      for (let j = 0; j < output_dim; j++) {
        if (next[j] > maxVal) maxVal = next[j];
      }

      let sumExp = 0;
      const exps = new Array<number>(output_dim);
      for (let j = 0; j < output_dim; j++) {
        exps[j] = Math.exp(next[j] - maxVal);
        sumExp += exps[j];
      }

      current = exps.map(v => v / sumExp);
    } else {
      current = next;
    }
  }

  return current;
}

/**
 * Predict hand gesture using the trained MLP classifier.
 */
export function predictGestureWithMLP(landmarks: Landmark[]) {
  const features = preprocessLandmarks(landmarks);
  const probabilities = forwardMLP(features, trainedModel);

  let bestIndex = 0;
  let bestProb = probabilities[0];
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > bestProb) {
      bestProb = probabilities[i];
      bestIndex = i;
    }
  }

  const classInfo = trainedModel.classes[bestIndex] || {
    id: 'none' as GestureType,
    name: 'Unknown',
    action: 'None',
  };

  return {
    classIndex: bestIndex,
    gesture: classInfo.id as GestureType,
    name: classInfo.name,
    action: classInfo.action,
    confidence: bestProb,
    probabilities,
  };
}

/**
 * Calculate Euclidean distance between two landmarks (2D, ignoring z).
 */
function distance2D(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Check if a finger is extended (used as fallback for secondary gestures like thumbs_up / victory).
 */
function isFingerExtended(
  landmarks: Landmark[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number,
  isThumb: boolean = false
): boolean {
  if (isThumb) {
    const tip = landmarks[tipIdx];
    const mcp = landmarks[mcpIdx];
    const wrist = landmarks[0];
    return distance2D(tip, wrist) > distance2D(mcp, wrist) * 1.1;
  }
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

/**
 * Main gesture classification function called on every video frame.
 * 
 * Uses the trained MLP Neural Network model to classify:
 *   - 'pinch': Pinch / Pick (Thumb & Index pinched close)
 *   - 'fist': Fist (All fingers curled)
 *   - 'point': Point (Index finger pointing)
 *   - 'pan': Open Palm (All fingers extended)
 * 
 * @param landmarks Array of 21 hand landmarks from MediaPipe
 * @param canvasWidth Screen/window width for cursor mapping
 * @param canvasHeight Screen/window height for cursor mapping
 * @returns GestureResult with classified gesture, confidence, and cursor coordinates
 */
export function classifyGesture(
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  isCurrentlyPinching: boolean = false
): GestureResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'none',
      confidence: 0,
      cursorPosition: { x: 0, y: 0 },
      palmCenter: { x: 0, y: 0 },
    };
  }

  // Key landmarks
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];

  // Palm size for scale-invariant distance measurements
  const palmSize = distance2D(wrist, middleMcp);
  const pinchDistance = distance2D(thumbTip, indexTip);

  // 1. Run inference using the trained MLP model
  const prediction = predictGestureWithMLP(landmarks);

  // Pinch hysteresis: Easier to hold an active pinch than to initiate one
  const pinchThreshold = isCurrentlyPinching ? palmSize * 0.38 : palmSize * 0.28;
  const isPinchDetected =
    (prediction.gesture === 'pinch' && (isCurrentlyPinching ? prediction.confidence >= 0.35 : prediction.confidence >= 0.55)) ||
    (pinchDistance < pinchThreshold && prediction.gesture !== 'fist');

  // Compute active cursor contact point:
  // When pinching: contact point is the midpoint between thumb tip and index tip
  // When pointing/pan/fist: index finger tip
  const activeX = isPinchDetected ? (thumbTip.x + indexTip.x) / 2 : indexTip.x;
  const activeY = isPinchDetected ? (thumbTip.y + indexTip.y) / 2 : indexTip.y;

  // Map to canvas coordinates (mirror horizontally for natural webcam feel)
  const cursorPosition: Position = {
    x: (1 - activeX) * canvasWidth,
    y: activeY * canvasHeight,
  };

  // Palm center (average of wrist and MCP joints)
  const palmCenter: Position = {
    x: (1 - (wrist.x + indexMcp.x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5) * canvasWidth,
    y: ((wrist.y + indexMcp.y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5) * canvasHeight,
  };

  if (isPinchDetected) {
    const pinchConf = Math.max(prediction.confidence, 1 - pinchDistance / (palmSize * 0.40));
    return {
      gesture: 'pinch',
      confidence: Math.min(1, Math.max(0.7, pinchConf)),
      cursorPosition,
      palmCenter,
    };
  }

  // Check other MLP gestures (Open Palm, Fist, Point)
  const CONFIDENCE_THRESHOLD = 0.55;
  if (prediction.confidence >= CONFIDENCE_THRESHOLD) {
    return {
      gesture: prediction.gesture,
      confidence: prediction.confidence,
      cursorPosition,
      palmCenter,
    };
  }

  // 2. Secondary heuristic check for helper shortcuts (thumbs_up, victory)
  const thumbExtended = isFingerExtended(landmarks, 4, 3, 2, true);
  const indexExtended = isFingerExtended(landmarks, 8, 6, 5);
  const middleExtended = isFingerExtended(landmarks, 12, 10, 9);
  const ringExtended = isFingerExtended(landmarks, 16, 14, 13);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18, 17);

  // Thumbs up: only thumb extended and pointing upward
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    if (landmarks[4].y < landmarks[2].y) {
      return {
        gesture: 'thumbs_up',
        confidence: 0.85,
        cursorPosition,
        palmCenter,
      };
    }
  }

  // Victory / Peace: index and middle extended, others curled
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return {
      gesture: 'victory',
      confidence: 0.85,
      cursorPosition,
      palmCenter,
    };
  }

  // Default fallback when ambiguous
  return {
    gesture: 'none',
    confidence: prediction.confidence,
    cursorPosition,
    palmCenter,
  };
}

/**
 * Adaptive velocity-aware cursor position smoother with sensitivity controls.
 * - Sub-pixel jitter is eliminated when holding still (deadband + low alpha).
 * - Fast hand movements track smoothly without visual drag/lag.
 */
export function smoothPosition(
  current: Position,
  previous: Position,
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): Position {
  if (!previous || (previous.x === 0 && previous.y === 0)) {
    return current;
  }

  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const dist = Math.hypot(dx, dy);

  // Deadzone and baseAlpha based on sensitivity setting
  let deadzone = 2.0;
  let baseAlpha = 0.40;

  if (sensitivity === 'low') {
    deadzone = 3.2;
    baseAlpha = 0.28;
  } else if (sensitivity === 'high') {
    deadzone = 1.2;
    baseAlpha = 0.60;
  }

  // If movement is below deadzone (hand tremor / camera landmark noise), hold position
  if (dist < deadzone) {
    return previous;
  }

  // Dynamically scale alpha with velocity to combine high stability with low latency
  const speedBonus = (dist / 80) * 0.45;
  const dynamicAlpha = Math.min(0.90, Math.max(0.20, baseAlpha + speedBonus));

  return {
    x: previous.x + dynamicAlpha * dx,
    y: previous.y + dynamicAlpha * dy,
  };
}

/**
 * Get trained model specifications and accuracy report.
 */
export function getModelInfo() {
  return {
    architecture: trainedModel.architecture,
    accuracy: trainedModel.accuracy,
    classes: trainedModel.classes,
    modelType: trainedModel.model_type,
  };
}
