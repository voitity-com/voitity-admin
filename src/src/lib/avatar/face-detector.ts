import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import type { Detection } from '@mediapipe/tasks-vision';

const modelPath = '/models/face-detector/blaze-face-short-range-float16.tflite';
const wasmPath = '/wasm/mediapipe';

export type AvatarFaceValidationReason =
  | 'faceOffCenter'
  | 'faceTooLarge'
  | 'faceTooSmall'
  | 'lowConfidence'
  | 'multipleFaces'
  | 'noFace';

export interface AvatarFaceValidationResult {
  reason?: AvatarFaceValidationReason;
  valid: boolean;
}

let detectorPromise: null | Promise<FaceDetector> = null;

export async function validateAvatarFace(file: File): Promise<AvatarFaceValidationResult> {
  const detector = await getFaceDetector();
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const result = detector.detect(image);

    return assessDetectedFace(result.detections, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function assessDetectedFace(
  detections: Detection[],
  imageWidth: number,
  imageHeight: number
): AvatarFaceValidationResult {
  if (detections.length === 0) {
    return { reason: 'noFace', valid: false };
  }

  if (detections.length > 1) {
    return { reason: 'multipleFaces', valid: false };
  }

  const detection = detections[0];
  const box = detection.boundingBox;
  const confidence = detection.categories[0]?.score ?? 0;

  if (!box || imageWidth <= 0 || imageHeight <= 0 || confidence < 0.7) {
    return { reason: 'lowConfidence', valid: false };
  }

  const widthRatio = box.width / imageWidth;
  const heightRatio = box.height / imageHeight;
  const areaRatio = widthRatio * heightRatio;
  const centerX = (box.originX + box.width / 2) / imageWidth;
  const centerY = (box.originY + box.height / 2) / imageHeight;

  if (areaRatio < 0.06) {
    return { reason: 'faceTooSmall', valid: false };
  }

  if (areaRatio > 0.72) {
    return { reason: 'faceTooLarge', valid: false };
  }

  if (centerX < 0.2 || centerX > 0.8 || centerY < 0.15 || centerY > 0.75) {
    return { reason: 'faceOffCenter', valid: false };
  }

  return { valid: true };
}

async function getFaceDetector(): Promise<FaceDetector> {
  detectorPromise ??= createFaceDetector();

  try {
    return await detectorPromise;
  } catch (error) {
    detectorPromise = null;
    throw error;
  }
}

async function createFaceDetector(): Promise<FaceDetector> {
  const vision = await FilesetResolver.forVisionTasks(wasmPath);

  return FaceDetector.createFromOptions(vision, {
    baseOptions: {
      delegate: 'CPU',
      modelAssetPath: modelPath,
    },
    minDetectionConfidence: 0.7,
    minSuppressionThreshold: 0.3,
    runningMode: 'IMAGE',
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('Could not load image for face validation.'));
    };
    image.src = src;
  });
}
