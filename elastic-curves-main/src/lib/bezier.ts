import { Vec2, vec2 } from './vector';

export const evaluateBezier = (
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number
): Vec2 => {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  const b0 = oneMinusT3;
  const b1 = 3 * oneMinusT2 * t;
  const b2 = 3 * oneMinusT * t2;
  const b3 = t3;

  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
};

export const evaluateBezierDerivative = (
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number
): Vec2 => {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const t2 = t * t;

  const c0 = 3 * oneMinusT2;
  const c1 = 6 * oneMinusT * t;
  const c2 = 3 * t2;

  const d0 = vec2.subtract(p1, p0);
  const d1 = vec2.subtract(p2, p1);
  const d2 = vec2.subtract(p3, p2);

  return {
    x: c0 * d0.x + c1 * d1.x + c2 * d2.x,
    y: c0 * d0.y + c1 * d1.y + c2 * d2.y,
  };
};

export const sampleBezierCurve = (
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  step: number = 0.01
): Vec2[] => {
  const points: Vec2[] = [];
  
  for (let t = 0; t <= 1; t += step) {
    points.push(evaluateBezier(p0, p1, p2, p3, t));
  }
  
  if (points.length === 0 || points[points.length - 1].x !== p3.x || points[points.length - 1].y !== p3.y) {
    points.push(vec2.copy(p3));
  }
  
  return points;
};

export const sampleTangents = (
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  count: number = 10
): { position: Vec2; tangent: Vec2 }[] => {
  const tangents: { position: Vec2; tangent: Vec2 }[] = [];
  
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const position = evaluateBezier(p0, p1, p2, p3, t);
    const derivative = evaluateBezierDerivative(p0, p1, p2, p3, t);
    const tangent = vec2.normalize(derivative);
    
    tangents.push({ position, tangent });
  }
  
  return tangents;
};
