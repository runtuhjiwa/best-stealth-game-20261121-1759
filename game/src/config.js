// NIGHT VAULT — every tuning number and colour in one place. The playfield is a fixed
// 1280x800 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. A moody night palette: dark blue-grey floors, warm amber lamps, glowing
// yellow vision cones and a green exit.

export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 175,
  sneakSpeed: 95,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 150,
  /** How far a guard can see, in pixels. */
  sightRange: 265,
  /** Half of the vision cone's opening angle, in radians. */
  sightHalfAngle: 0.62,
  /** How long a guard pauses at each waypoint to scan, in seconds. */
  scanPause: 1.4,
  /** Suspicion fills this fast per second when the player is fully seen up close. */
  detectRate: 1.5,
  /** Suspicion drains this fast per second while the player is unseen. */
  forgetRate: 0.35,
  /** Sneaking multiplies the detect rate by this. */
  sneakFactor: 0.45,
  /** Standing inside a bush multiplies the detect rate by this. */
  bushFactor: 0.22,
  /** Suspicion at which a guard stops and stares at the player. */
  suspiciousAt: 0.45,
  /** Seconds a chasing guard keeps the alarm after losing sight. */
  alarmMemory: 3.0,
  /** Distance at which a chasing guard catches the player. */
  catchDistance: 26,
};

export const LOOT = { radius: 10, points: 100 };

export const PALETTE = {
  backdrop: '#0b0e14',
  floor: '#171c28',
  floorTile: '#1b2231',
  wall: '#2e3850',
  wallTop: '#3d4a68',
  crate: '#5a4632',
  crateTop: '#7a6244',
  bush: '#1d3a24',
  bushEdge: '#2c5a36',
  lamp: '#f2b04c',
  lampGlow: 'rgba(242, 176, 76, 0.10)',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneEdge: 'rgba(242, 201, 76, 0.45)',
  coneAlarm: 'rgba(229, 83, 75, 0.28)',
  coneAlarmEdge: 'rgba(229, 83, 75, 0.55)',
  guard: '#e8b64c',
  guardAlarm: '#e5534b',
  player: '#4fc3f7',
  playerSneak: '#2f9fd8',
  exit: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.16)',
  loot: '#f2c94c',
  panel: '#202634',
  panelEdge: '#39415a',
  text: '#eef1f5',
  muted: '#8b93a3',
  danger: '#e5534b',
  calm: '#39d98a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best clear time is kept between visits (this browser only). */
export const BEST_KEY = 'night-vault.best';
