// The three heists. Each level is a hand-built floor plan: border walls, interior walls that
// split the space into rooms, crates and bushes as cover, loot gems, guards on patrol routes,
// a player start and a glowing exit. `route` is a safe path the screenshot autopilot walks
// (it is not shown to the player); every leg of it is checked against the walls when the
// level is built, so a bad route fails loudly instead of trapping the autopilot.
import { FIELD } from './config.js';

const BORDER = 24;

function borderWalls() {
  return [
    { x: 0, y: 0, w: FIELD.width, h: BORDER },
    { x: 0, y: FIELD.height - BORDER, w: FIELD.width, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: FIELD.height },
    { x: FIELD.width - BORDER, y: 0, w: BORDER, h: FIELD.height },
  ];
}

function rectHitsWall(rect, walls) {
  return walls.some(
    (wall) => rect.x < wall.x + wall.w && rect.x + rect.w > wall.x && rect.y < wall.y + wall.h && rect.y + rect.h > wall.y,
  );
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** A leg of the route is safe when the straight line between its ends never crosses a wall. */
function legClear(a, b, walls) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
  for (let i = 0; i <= steps; i += 1) {
    const x = a[0] + ((b[0] - a[0]) * i) / steps;
    const y = a[1] + ((b[1] - a[1]) * i) / steps;
    if (walls.some((wall) => pointInRect(x, y, wall))) return false;
  }
  return true;
}

function buildLevel(def) {
  const walls = [...borderWalls(), ...def.walls];
  const obstacles = [...walls, ...def.crates];
  const points = [[def.player.x, def.player.y], ...def.route, [def.exit.x, def.exit.y]];
  for (let i = 0; i + 1 < points.length; i += 1) {
    if (!legClear(points[i], points[i + 1], obstacles)) {
      throw new Error(`level ${def.name}: route leg ${i} crosses a wall or crate`);
    }
  }
  for (const crate of def.crates) {
    if (rectHitsWall(crate, walls)) throw new Error(`level ${def.name}: crate inside a wall`);
  }
  return { ...def, walls };
}

export const LEVELS = [
  buildLevel({
    name: 'THE LOBBY',
    player: { x: 90, y: 700 },
    exit: { x: 1150, y: 90 },
    walls: [
      { x: 400, y: 24, w: 24, h: 280 },
      { x: 400, y: 480, w: 24, h: 296 },
      { x: 640, y: 200, w: 360, h: 24 },
      { x: 640, y: 560, w: 360, h: 24 },
      { x: 880, y: 300, w: 24, h: 260 },
    ],
    crates: [
      { x: 300, y: 460, w: 56, h: 56 },
      { x: 560, y: 420, w: 56, h: 56 },
      { x: 760, y: 300, w: 56, h: 56 },
      { x: 1000, y: 500, w: 56, h: 56 },
      { x: 180, y: 180, w: 56, h: 56 },
    ],
    bushes: [
      { x: 520, y: 340, r: 34 },
      { x: 920, y: 660, r: 34 },
      { x: 240, y: 560, r: 34 },
      { x: 1080, y: 240, r: 34 },
    ],
    loot: [
      { x: 700, y: 120 },
      { x: 150, y: 400 },
    ],
    lamps: [
      { x: 640, y: 400 },
      { x: 1080, y: 640 },
      { x: 200, y: 120 },
    ],
    guards: [
      { x: 480, y: 250, waypoints: [[480, 250], [1120, 250]], speed: 62 },
      { x: 700, y: 320, waypoints: [[700, 320], [700, 700]], speed: 58 },
      { x: 280, y: 640, waypoints: [[280, 640], [1120, 640]], speed: 66 },
    ],
    route: [[90, 400], [380, 400], [500, 400], [500, 120], [1150, 120]],
  }),
  buildLevel({
    name: 'THE GALLERY',
    player: { x: 90, y: 90 },
    exit: { x: 1150, y: 700 },
    walls: [
      { x: 320, y: 0, w: 24, h: 300 },
      { x: 320, y: 500, w: 24, h: 300 },
      { x: 640, y: 300, w: 24, h: 500 },
      { x: 960, y: 0, w: 24, h: 300 },
      { x: 960, y: 500, w: 24, h: 300 },
      { x: 480, y: 560, w: 220, h: 24 },
    ],
    crates: [
      { x: 450, y: 350, w: 56, h: 56 },
      { x: 750, y: 550, w: 56, h: 56 },
      { x: 200, y: 650, w: 56, h: 56 },
      { x: 1050, y: 200, w: 56, h: 56 },
    ],
    bushes: [
      { x: 600, y: 350, r: 34 },
      { x: 100, y: 550, r: 34 },
      { x: 1150, y: 550, r: 34 },
      { x: 850, y: 120, r: 34 },
    ],
    loot: [
      { x: 600, y: 100 },
      { x: 150, y: 350 },
      { x: 1000, y: 620 },
    ],
    lamps: [
      { x: 640, y: 120 },
      { x: 200, y: 680 },
      { x: 1100, y: 400 },
    ],
    guards: [
      { x: 200, y: 200, waypoints: [[200, 200], [200, 600]], speed: 66 },
      { x: 500, y: 250, waypoints: [[500, 250], [900, 250]], speed: 72 },
      { x: 820, y: 450, waypoints: [[820, 450], [820, 700]], speed: 64 },
      { x: 500, y: 650, waypoints: [[500, 650], [1100, 650]], speed: 70 },
    ],
    route: [[90, 400], [380, 400], [380, 150], [700, 150], [700, 400], [1100, 400], [1100, 700]],
  }),
  buildLevel({
    name: 'THE VAULT',
    player: { x: 90, y: 700 },
    exit: { x: 1150, y: 90 },
    walls: [
      { x: 320, y: 24, w: 24, h: 260 },
      { x: 320, y: 460, w: 24, h: 316 },
      { x: 640, y: 200, w: 24, h: 380 },
      { x: 640, y: 640, w: 340, h: 24 },
      { x: 980, y: 24, w: 24, h: 280 },
      { x: 980, y: 304, w: 140, h: 24 },
      { x: 1180, y: 304, w: 76, h: 24 },
    ],
    crates: [
      { x: 420, y: 380, w: 56, h: 56 },
      { x: 760, y: 300, w: 56, h: 56 },
      { x: 200, y: 560, w: 56, h: 56 },
      { x: 900, y: 570, w: 56, h: 56 },
      { x: 600, y: 100, w: 56, h: 56 },
    ],
    bushes: [
      { x: 500, y: 650, r: 34 },
      { x: 850, y: 350, r: 34 },
      { x: 150, y: 120, r: 34 },
      { x: 1150, y: 500, r: 34 },
    ],
    loot: [
      { x: 700, y: 100 },
      { x: 250, y: 400 },
      { x: 1120, y: 150 },
    ],
    lamps: [
      { x: 500, y: 250 },
      { x: 900, y: 650 },
      { x: 1120, y: 200 },
    ],
    guards: [
      { x: 200, y: 300, waypoints: [[200, 300], [560, 300]], speed: 76 },
      { x: 480, y: 500, waypoints: [[480, 500], [480, 720]], speed: 70 },
      { x: 800, y: 150, waypoints: [[800, 150], [940, 150]], speed: 74 },
      { x: 800, y: 450, waypoints: [[800, 450], [1150, 450]], speed: 78 },
      { x: 1040, y: 240, waypoints: [[1040, 240], [1240, 240]], speed: 60 },
    ],
    route: [[90, 380], [380, 380], [380, 150], [560, 150], [560, 600], [700, 600], [700, 520], [1150, 520], [1150, 330]],
  }),
];
