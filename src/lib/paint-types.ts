export type Tool = 'brush' | 'line' | 'rectangle' | 'circle' | 'fill' | 'eraser';
export type Brush = 'pen' | 'chalk' | 'spray';
export type Point = { x: number; y: number };

export type HistoryState = {
  index: number;
  length: number;
};
