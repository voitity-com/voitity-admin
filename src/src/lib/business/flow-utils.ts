import type { BusinessFlowNode } from './api-client';

export interface CanvasBounds { height: number; offsetX: number; offsetY: number; width: number }
export interface CanvasPoint { x: number; y: number }

export const FLOW_NODE_HEIGHT = 120;
export const FLOW_NODE_WIDTH = 240;

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
  return getEdgePathToPoint(source, getEdgeTargetPoint(target, offsetX, offsetY), offsetX, offsetY);
}

export function getEdgePathToPoint(source: BusinessFlowNode, target: CanvasPoint, offsetX: number, offsetY: number): string {
  const sourceX = source.x + offsetX + FLOW_NODE_WIDTH;
  const sourceY = source.y + offsetY + FLOW_NODE_HEIGHT / 2;
  const targetX = target.x;
  const targetY = target.y;
  const curve = Math.max(80, Math.abs(targetX - sourceX) * 0.45);

  return `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`;
}

export function getEdgeTargetPoint(target: BusinessFlowNode, offsetX: number, offsetY: number): CanvasPoint {
  return {
    x: target.x + offsetX,
    y: target.y + offsetY + FLOW_NODE_HEIGHT / 2,
  };
}

export function findFlowNodeAtPoint(
  nodes: BusinessFlowNode[],
  point: CanvasPoint,
  offsetX: number,
  offsetY: number,
  excludedKey?: string,
): BusinessFlowNode | undefined {
  return nodes.find((node) => {
    if (node.key === excludedKey) return false;
    const left = node.x + offsetX;
    const top = node.y + offsetY;

    return point.x >= left - 16
      && point.x <= left + FLOW_NODE_WIDTH + 16
      && point.y >= top - 16
      && point.y <= top + FLOW_NODE_HEIGHT + 16;
  });
}
