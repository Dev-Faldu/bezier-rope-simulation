import type { Point, StrokeOperation, DrawingOperation } from '@/types/canvas';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function now(): number {
  return Date.now();
}

function catmullRomSpline(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y, timestamp: p1.timestamp };
}

export function smoothPoints(points: Point[], segments: number = 8): Point[] {
  if (points.length < 4) return points;

  const smoothed: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      smoothed.push(catmullRomSpline(p0, p1, p2, p3, t));
    }
  }

  smoothed.push(points[points.length - 1]);

  return smoothed;
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function filterNearbyPoints(points: Point[], minDistance: number): Point[] {
  if (points.length < 2) return points;

  const filtered: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    if (distance(filtered[filtered.length - 1], points[i]) >= minDistance) {
      filtered.push(points[i]);
    }
  }

  if (filtered[filtered.length - 1] !== points[points.length - 1]) {
    filtered.push(points[points.length - 1]);
  }

  return filtered;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private dpr: number;
  private animationFrameId: number | null = null;
  private needsRedraw: boolean = false;
  private operations: DrawingOperation[] = [];
  private currentStroke: StrokeOperation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    if (!offscreenCtx) throw new Error('Failed to get offscreen 2D context');
    this.offscreenCtx = offscreenCtx;

    this.dpr = window.devicePixelRatio || 1;

    this.startRenderLoop();
  }

  resize(width: number, height: number): void {
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    this.offscreenCanvas.width = width * this.dpr;
    this.offscreenCanvas.height = height * this.dpr;

    this.ctx.scale(this.dpr, this.dpr);
    this.offscreenCtx.scale(this.dpr, this.dpr);

    this.canvas.dataset.width = String(width);
    this.canvas.dataset.height = String(height);

    this.requestRedraw();
  }

  getDimensions(): { width: number; height: number } {
    return {
      width: parseInt(this.canvas.dataset.width || '800', 10),
      height: parseInt(this.canvas.dataset.height || '600', 10),
    };
  }

  setOperations(operations: DrawingOperation[]): void {
    this.operations = [...operations];
    this.requestRedraw();
  }

  addOperation(operation: DrawingOperation): void {
    this.operations.push(operation);
    this.requestRedraw();
  }

  removeLastOperation(): DrawingOperation | undefined {
    const removed = this.operations.pop();
    this.requestRedraw();
    return removed;
  }

  clearOperations(): void {
    this.operations = [];
    this.requestRedraw();
  }

  getOperations(): DrawingOperation[] {
    return [...this.operations];
  }

  setCurrentStroke(stroke: StrokeOperation | null): void {
    this.currentStroke = stroke;
    this.requestRedraw();
  }

  requestRedraw(): void {
    this.needsRedraw = true;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private render(): void {
    const { width, height } = this.getDimensions();

    this.offscreenCtx.fillStyle = '#f8fafc';
    this.offscreenCtx.fillRect(0, 0, width, height);

    this.drawGrid(this.offscreenCtx, width, height);

    for (const op of this.operations) {
      if (op.type === 'stroke') {
        this.drawStroke(this.offscreenCtx, op);
      } else if (op.type === 'clear') {
        this.offscreenCtx.fillStyle = '#f8fafc';
        this.offscreenCtx.fillRect(0, 0, width, height);
        this.drawGrid(this.offscreenCtx, width, height);
      }
    }

    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.drawStroke(this.offscreenCtx, this.currentStroke);
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gridSize = 20;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    for (let x = gridSize; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeOperation): void {
    const points = stroke.points;
    if (points.length === 0) return;

    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();

    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const smoothed = points.length > 3 ? smoothPoints(points, 4) : points;
      
      ctx.moveTo(smoothed[0].x, smoothed[0].y);
      
      for (let i = 1; i < smoothed.length; i++) {
        ctx.lineTo(smoothed[i].x, smoothed[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  getEventCoordinates(e: MouseEvent | TouchEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      timestamp: now(),
    };
  }

  toDataURL(type: string = 'image/png', quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }
}
