import type { BusinessFlowNode } from './api-client';

export interface CanvasBounds { height: number; offsetX: number; offsetY: number; width: number }

export function getCanvasBounds(nodes: BusinessFlowNode[]): CanvasBounds {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(-2000, ...(xs.map((value) => value - 1000)));
  const minY = Math.min(-1600, ...(ys.map((value) => value - 800)));
  const maxX = Math.max(5000, ...(xs.map((value) => value + 1600)));
  const maxY = Math.max(4000, ...(ys.map((value) => value + 1200)));

  return { height: maxY - minY, offsetX: -minX, offsetY: -minY, width: maxX - minX };
}

export function getEdgePath(source: BusinessFlowNode, target: BusinessFlowNode, offsetX: number, offsetY: number): string {
  const sourceX = source.x + offsetX + 240;
  const sourceY = source.y + offsetY + 60;
  const targetX = target.x + offsetX;
  const targetY = target.y + offsetY + 60;
  const curve = Math.max(80, Math.abs(targetX - sourceX) * 0.45);

  return `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`;
}
