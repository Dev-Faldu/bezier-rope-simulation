# Bezier Rope Simulation

An interactive cubic Bezier curve simulation with spring-based physics, demonstrating real-time rendering, mathematical modeling, and clean system architecture.

---

## Bezier Curve Mathematics

### The Cubic Bezier Formula

A cubic Bezier curve is defined by four control points and a parameter `t in [0, 1]`:

```
B(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
```

At `t = 0`, the curve is at P0. At `t = 1`, the curve is at P3. P1 and P2 pull the curve toward them without the curve passing through them. The coefficients are Bernstein polynomials which always sum to 1, ensuring the curve stays within the convex hull of control points.

---

## Physics Model: Spring-Damper System

The spring-damper model was chosen for physical plausibility and controllability:

```
acceleration = -k * (position - target) - c * velocity
```

Where:
- `k` = spring stiffness (8.0) - controls snap-back speed
- `c` = damping coefficient (4.0) - prevents infinite oscillation

We use explicit Euler integration:

```
velocity += acceleration * dt
position += velocity * dt
```

At 60 FPS, Euler integration is stable for our spring constants.

---

## Tangent Vectors

The tangent (first derivative) of a cubic Bezier is a quadratic Bezier:

```
B'(t) = 3(1-t)^2 * (P1-P0) + 6(1-t) * t * (P2-P1) + 3t^2 * (P3-P2)
```

The derivative points in the direction the curve is traveling. Normalizing gives a unit tangent vector for consistent visualization.

---

## Architecture

```
src/
  lib/
    vector.ts      - 2D vector operations
    physics.ts     - Spring-damper integration
    bezier.ts      - Curve evaluation and derivatives
  components/
    BezierRopeSimulation.tsx  - Main renderer
  pages/
    Index.tsx      - Entry point
```

---

## Running the Project

```bash
npm install
npm run dev
```

Open http://localhost:8080

---

## Demo Guide

For a 30-second demonstration:

1. Start with cursor in center - rope at rest
2. Move cursor slowly - show smooth elastic following
3. Move cursor rapidly - demonstrate spring physics lag
4. Circle the cursor - show tangent vectors rotating
5. Return to center - watch rope settle with damping

---

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Spring stiffness | 8.0 |
| Damping | 4.0 |
| Curve samples | 125 |
| Tangent count | 12 |
| Tangent length | 25px |
| Physics timestep | 1/60s |

---

## License

MIT
