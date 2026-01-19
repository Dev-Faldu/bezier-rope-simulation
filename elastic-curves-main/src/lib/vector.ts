export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = {
  create: (x: number = 0, y: number = 0): Vec2 => ({ x, y }),

  add: (a: Vec2, b: Vec2): Vec2 => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),

  subtract: (a: Vec2, b: Vec2): Vec2 => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),

  scale: (v: Vec2, scalar: number): Vec2 => ({
    x: v.x * scalar,
    y: v.y * scalar,
  }),

  magnitude: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),

  normalize: (v: Vec2): Vec2 => {
    const mag = vec2.magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  },

  lerp: (a: Vec2, b: Vec2, t: number): Vec2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),

  distance: (a: Vec2, b: Vec2): number => vec2.magnitude(vec2.subtract(b, a)),

  copy: (v: Vec2): Vec2 => ({ x: v.x, y: v.y }),
};
