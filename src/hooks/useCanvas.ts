import { useRef, useCallback, useEffect, useState } from 'react';
import { CanvasEngine, generateId, now, filterNearbyPoints } from '@/lib/canvas-engine';
import type { 
  Point, 
  StrokeOperation, 
  DrawingOperation, 
  ToolSettings,
} from '@/types/canvas';

interface UseCanvasOptions {
  userId: string;
  onStrokeComplete?: (stroke: StrokeOperation) => void;
}

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isDrawing: boolean;
  operations: DrawingOperation[];
  startDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
  continueDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
  endDrawing: () => void;
  addOperation: (operation: DrawingOperation) => void;
  removeOperation: (id: string) => void;
  setOperations: (operations: DrawingOperation[]) => void;
  clear: () => void;
  resize: (width: number, height: number) => void;
  getEngine: () => CanvasEngine | null;
  operationCount: number;
}

export function useCanvas(
  toolSettings: ToolSettings,
  options: UseCanvasOptions
): UseCanvasReturn {
  const { userId, onStrokeComplete } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const currentStrokeRef = useRef<StrokeOperation | null>(null);
  const pointBufferRef = useRef<Point[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [operations, setOperationsState] = useState<DrawingOperation[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CanvasEngine(canvasRef.current);
    engineRef.current = engine;

    const parent = canvasRef.current.parentElement;
    if (parent) {
      engine.resize(parent.clientWidth, parent.clientHeight);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOperations(operations);
    }
  }, [operations]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!engineRef.current) return;
    
    e.preventDefault();
    
    const point = engineRef.current.getEventCoordinates(e.nativeEvent);
    const strokeId = generateId();

    const stroke: StrokeOperation = {
      id: strokeId,
      type: 'stroke',
      userId,
      color: toolSettings.color,
      width: toolSettings.width,
      tool: toolSettings.tool,
      points: [point],
      startTime: now(),
      sequence: 0,
    };

    currentStrokeRef.current = stroke;
    pointBufferRef.current = [point];
    setIsDrawing(true);

    engineRef.current.setCurrentStroke(stroke);
  }, [userId, toolSettings]);

  const continueDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!engineRef.current || !currentStrokeRef.current) return;
    
    e.preventDefault();

    const point = engineRef.current.getEventCoordinates(e.nativeEvent);
    
    pointBufferRef.current.push(point);
    
    const minDist = Math.max(1, toolSettings.width / 4);
    const filteredPoints = filterNearbyPoints(pointBufferRef.current, minDist);
    
    currentStrokeRef.current = {
      ...currentStrokeRef.current,
      points: filteredPoints,
    };

    engineRef.current.setCurrentStroke(currentStrokeRef.current);
  }, [toolSettings.width]);

  const endDrawing = useCallback(() => {
    if (!engineRef.current || !currentStrokeRef.current) return;

    const finalStroke: StrokeOperation = {
      ...currentStrokeRef.current,
      points: filterNearbyPoints(pointBufferRef.current, Math.max(1, toolSettings.width / 4)),
      endTime: now(),
    };

    if (finalStroke.points.length > 0) {
      engineRef.current.setCurrentStroke(null);
      setOperationsState(prev => [...prev, finalStroke]);
      onStrokeComplete?.(finalStroke);
    } else {
      engineRef.current.setCurrentStroke(null);
    }

    currentStrokeRef.current = null;
    pointBufferRef.current = [];
    setIsDrawing(false);
  }, [toolSettings.width, onStrokeComplete]);

  const addOperation = useCallback((operation: DrawingOperation) => {
    setOperationsState(prev => {
      if (prev.some(op => op.id === operation.id)) {
        return prev;
      }
      const newOps = [...prev, operation];
      newOps.sort((a, b) => a.sequence - b.sequence);
      return newOps;
    });
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperationsState(prev => prev.filter(op => op.id !== id));
  }, []);

  const setOperations = useCallback((ops: DrawingOperation[]) => {
    const sorted = [...ops].sort((a, b) => a.sequence - b.sequence);
    setOperationsState(sorted);
  }, []);

  const clear = useCallback(() => {
    setOperationsState([]);
  }, []);

  const resize = useCallback((width: number, height: number) => {
    engineRef.current?.resize(width, height);
  }, []);

  const getEngine = useCallback(() => engineRef.current, []);

  return {
    canvasRef,
    isDrawing,
    operations,
    startDrawing,
    continueDrawing,
    endDrawing,
    addOperation,
    removeOperation,
    setOperations,
    clear,
    resize,
    getEngine,
    operationCount: operations.length,
  };
}
