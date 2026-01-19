import { useEffect, useRef, useCallback } from 'react';
import { vec2, Vec2 } from '@/lib/vector';
import { createBody, integrateSpring, setTarget, PhysicsBody, SpringConfig } from '@/lib/physics';
import { sampleBezierCurve, sampleTangents } from '@/lib/bezier';

const COLORS = {
  background: '#0a0c10',
  grid: 'rgba(30, 40, 55, 0.5)',
  gridMajor: 'rgba(40, 55, 75, 0.6)',
  curve: '#00d4ff',
  curveGlow: 'rgba(0, 212, 255, 0.3)',
  anchor: '#4ade80',
  anchorGlow: 'rgba(74, 222, 128, 0.4)',
  controlPoint: '#fbbf24',
  controlPointGlow: 'rgba(251, 191, 36, 0.4)',
  tangent: '#ec4899',
  tangentGlow: 'rgba(236, 72, 153, 0.3)',
  controlLine: 'rgba(100, 116, 139, 0.4)',
};

const SPRING_CONFIG: SpringConfig = {
  stiffness: 8,
  damping: 4,
};

const PHYSICS_TIMESTEP = 1 / 60;
const BEZIER_SAMPLE_STEP = 0.008;
const TANGENT_COUNT = 12;
const TANGENT_LENGTH = 25;
const GRID_SIZE = 40;

interface SimulationState {
  p0: Vec2;
  p1: PhysicsBody;
  p2: PhysicsBody;
  p3: Vec2;
  mousePos: Vec2;
  canvasSize: Vec2;
}

export const BezierRopeSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const animationRef = useRef<number>(0);

  const initializeState = useCallback((width: number, height: number): SimulationState => {
    const centerX = width / 2;
    const centerY = height / 2;
    const spread = Math.min(width, height) * 0.35;

    return {
      p0: vec2.create(centerX - spread, centerY),
      p1: createBody(centerX - spread * 0.3, centerY - spread * 0.5),
      p2: createBody(centerX + spread * 0.3, centerY + spread * 0.5),
      p3: vec2.create(centerX + spread, centerY),
      mousePos: vec2.create(centerX, centerY),
      canvasSize: vec2.create(width, height),
    };
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += GRID_SIZE) {
      ctx.strokeStyle = x % (GRID_SIZE * 4) === 0 ? COLORS.gridMajor : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += GRID_SIZE) {
      ctx.strokeStyle = y % (GRID_SIZE * 4) === 0 ? COLORS.gridMajor : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  const drawControlLines = useCallback((ctx: CanvasRenderingContext2D, state: SimulationState) => {
    ctx.strokeStyle = COLORS.controlLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);

    ctx.beginPath();
    ctx.moveTo(state.p0.x, state.p0.y);
    ctx.lineTo(state.p1.position.x, state.p1.position.y);
    ctx.lineTo(state.p2.position.x, state.p2.position.y);
    ctx.lineTo(state.p3.x, state.p3.y);
    ctx.stroke();

    ctx.setLineDash([]);
  }, []);

  const drawCurve = useCallback((ctx: CanvasRenderingContext2D, state: SimulationState) => {
    const points = sampleBezierCurve(
      state.p0,
      state.p1.position,
      state.p2.position,
      state.p3,
      BEZIER_SAMPLE_STEP
    );

    if (points.length < 2) return;

    ctx.strokeStyle = COLORS.curveGlow;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.curve;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }, []);

  const drawTangents = useCallback((ctx: CanvasRenderingContext2D, state: SimulationState) => {
    const tangentData = sampleTangents(
      state.p0,
      state.p1.position,
      state.p2.position,
      state.p3,
      TANGENT_COUNT
    );

    tangentData.forEach(({ position, tangent }) => {
      const endPoint = vec2.add(position, vec2.scale(tangent, TANGENT_LENGTH));

      ctx.strokeStyle = COLORS.tangentGlow;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();

      ctx.strokeStyle = COLORS.tangent;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();

      const arrowSize = 6;
      const angle = Math.atan2(tangent.y, tangent.x);
      
      ctx.fillStyle = COLORS.tangent;
      ctx.beginPath();
      ctx.moveTo(endPoint.x, endPoint.y);
      ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle - Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle + Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    });
  }, []);

  const drawPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    position: Vec2,
    color: string,
    glowColor: string,
    radius: number,
    label?: string
  ) => {
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (label) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, position.x, position.y - radius - 10);
    }
  }, []);

  const drawControlPoints = useCallback((ctx: CanvasRenderingContext2D, state: SimulationState) => {
    drawPoint(ctx, state.p0, COLORS.anchor, COLORS.anchorGlow, 10, 'P0');
    drawPoint(ctx, state.p3, COLORS.anchor, COLORS.anchorGlow, 10, 'P3');
    drawPoint(ctx, state.p1.position, COLORS.controlPoint, COLORS.controlPointGlow, 12, 'P1');
    drawPoint(ctx, state.p2.position, COLORS.controlPoint, COLORS.controlPointGlow, 12, 'P2');
  }, [drawPoint]);

  const render = useCallback((ctx: CanvasRenderingContext2D, state: SimulationState) => {
    const { width, height } = ctx.canvas;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height);
    drawControlLines(ctx, state);
    drawCurve(ctx, state);
    drawTangents(ctx, state);
    drawControlPoints(ctx, state);
  }, [drawGrid, drawControlLines, drawCurve, drawTangents, drawControlPoints]);

  const updatePhysics = useCallback((state: SimulationState) => {
    const p1Target = vec2.lerp(state.mousePos, state.p0, 0.3);
    setTarget(state.p1, p1Target.x, p1Target.y);

    const p2Target = vec2.lerp(state.mousePos, state.p3, 0.3);
    setTarget(state.p2, p2Target.x, p2Target.y);

    integrateSpring(state.p1, SPRING_CONFIG, PHYSICS_TIMESTEP);
    integrateSpring(state.p2, SPRING_CONFIG, PHYSICS_TIMESTEP);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = stateRef.current;

    if (!canvas || !ctx || !state) return;

    updatePhysics(state);
    render(ctx, state);

    animationRef.current = requestAnimationFrame(animate);
  }, [updatePhysics, render]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    state.mousePos.x = (e.clientX - rect.left) * scaleX;
    state.mousePos.y = (e.clientY - rect.top) * scaleY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state || e.touches.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches[0];

    state.mousePos.x = (touch.clientX - rect.left) * scaleX;
    state.mousePos.y = (touch.clientY - rect.top) * scaleY;
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    stateRef.current = initializeState(width, height);
  }, [initializeState]);

  useEffect(() => {
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [handleResize, handleMouseMove, handleTouchMove, animate]);

  return (
    <div className="relative w-full h-full min-h-screen bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />
      
      <div className="absolute top-6 left-6 p-5 bg-card/80 backdrop-blur-md rounded-xl border border-border shadow-2xl max-w-sm">
        <h1 className="text-xl font-semibold text-foreground mb-2 font-[var(--font-display)]">
          Bezier Rope Simulation
        </h1>
        <p className="text-sm text-muted-foreground mb-4 font-[var(--font-mono)]">
          Interactive cubic Bezier with spring physics
        </p>
        
        <div className="space-y-2 text-xs font-[var(--font-mono)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#4ade80]" />
            <span className="text-muted-foreground">P0, P3 - Fixed anchors</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#fbbf24]" />
            <span className="text-muted-foreground">P1, P2 - Dynamic control points</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00d4ff]" />
            <span className="text-muted-foreground">Bezier curve</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ec4899]" />
            <span className="text-muted-foreground">Tangent vectors</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-card/60 backdrop-blur-md rounded-full border border-border">
        <p className="text-sm text-muted-foreground font-[var(--font-mono)]">
          Move your cursor to control the rope
        </p>
      </div>
    </div>
  );
};

export default BezierRopeSimulation;
