export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

export interface StrokeOperation {
  id: string;
  type: 'stroke';
  userId: string;
  color: string;
  width: number;
  tool: ToolType;
  points: Point[];
  startTime: number;
  endTime?: number;
  sequence: number;
}

export interface ClearOperation {
  id: string;
  type: 'clear';
  userId: string;
  timestamp: number;
  sequence: number;
}

export type DrawingOperation = StrokeOperation | ClearOperation;

export type ToolType = 'brush' | 'eraser';

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor: Point | null;
  isDrawing: boolean;
  lastSeen: number;
}

export interface CanvasState {
  operations: DrawingOperation[];
  currentSequence: number;
  width: number;
  height: number;
}

export type WSMessageType = 
  | 'stroke:start'
  | 'stroke:move'
  | 'stroke:end'
  | 'cursor:move'
  | 'operation:commit'
  | 'operation:undo'
  | 'operation:redo'
  | 'state:sync'
  | 'user:join'
  | 'user:leave'
  | 'canvas:clear';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  userId: string;
  timestamp: number;
  sequence?: number;
}

export interface DrawingContext {
  isDrawing: boolean;
  currentStroke: StrokeOperation | null;
  lastPoint: Point | null;
}

export interface ToolSettings {
  tool: ToolType;
  color: string;
  width: number;
}

export interface HistoryState {
  past: DrawingOperation[];
  future: DrawingOperation[];
}

export const COLORS = [
  '#ffffff',
  '#1a1a2e',
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#f97316',
  '#ec4899',
  '#14b8a6',
] as const;

export const USER_COLORS = [
  'hsl(210, 100%, 55%)',
  'hsl(340, 85%, 60%)',
  'hsl(150, 80%, 45%)',
  'hsl(45, 100%, 55%)',
  'hsl(280, 80%, 60%)',
  'hsl(180, 70%, 50%)',
] as const;

export const BRUSH_WIDTHS = [2, 4, 8, 12, 20] as const;
