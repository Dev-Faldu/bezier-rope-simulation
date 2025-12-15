import { Vec2, vec2 } from './vector';

export interface PhysicsBody {
  position: Vec2;
  velocity: Vec2;
  target: Vec2;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
}

export const createBody = (x: number, y: number): PhysicsBody => ({
  position: vec2.create(x, y),
  velocity: vec2.create(0, 0),
  target: vec2.create(x, y),
});

export const integrateSpring = (
  body: PhysicsBody,
  config: SpringConfig,
  deltaTime: number
): void => {
  const displacement = vec2.subtract(body.position, body.target);
  const springForce = vec2.scale(displacement, -config.stiffness);
  const dampingForce = vec2.scale(body.velocity, -config.damping);
  const acceleration = vec2.add(springForce, dampingForce);

  body.velocity = vec2.add(body.velocity, vec2.scale(acceleration, deltaTime));
  body.position = vec2.add(body.position, vec2.scale(body.velocity, deltaTime));
};

export const setTarget = (body: PhysicsBody, x: number, y: number): void => {
  body.target.x = x;
  body.target.y = y;
};
