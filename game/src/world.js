// The game's rules and state, with no drawing and no browser in it: the player, the guards
// and their vision cones, cover, loot, the exit and the alarm. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the world knowing
// about screens or sound. Levels are hand-built (see levels.js), so nothing here is random.
import { FIELD, GUARD, LOOT, PLAYER } from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_LOOT = 1;
export const EVENT_CLEAR = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ALARM = 8;
export const EVENT_SUSPICIOUS = 16;

function angleDiff(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Does the circle at (cx, cy) with radius r touch the rectangle? */
function circleHitsRect(cx, cy, r, rect) {
  const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? (Slab method.) */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function createWorld() {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    player: { x: 0, y: 0, sneak: false, hidden: false },
    guards: [],
    lootTaken: [],
    score: 0,
    lootGot: 0,
    lootTotal: 0,
    detections: 0,
    elapsed: 0,
    totalElapsed: 0,
    detection: 0,
    alert: 'calm',
    status: 'play',
  };

  function solids() {
    return [...state.level.walls, ...state.level.crates];
  }

  function blocked(cx, cy, r) {
    for (const rect of solids()) if (circleHitsRect(cx, cy, r, rect)) return true;
    return false;
  }

  function moveCircle(body, r, dx, dy) {
    const nx = body.x + dx;
    if (!blocked(nx, body.y, r)) body.x = nx;
    const ny = body.y + dy;
    if (!blocked(body.x, ny, r)) body.y = ny;
  }

  function lineBlocked(x1, y1, x2, y2) {
    for (const rect of solids()) if (segmentHitsRect(x1, y1, x2, y2, rect)) return true;
    return false;
  }

  function playerInBush() {
    for (const bush of state.level.bushes) {
      const dx = state.player.x - bush.x;
      const dy = state.player.y - bush.y;
      if (dx * dx + dy * dy < bush.r * bush.r) return true;
    }
    return false;
  }

  /** Would guard `g` see a person standing at (px, py) right now? */
  function guardSeesPoint(g, px, py) {
    const dx = px - g.x;
    const dy = py - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.sightRange) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), g.angle)) > GUARD.sightHalfAngle) return false;
    return !lineBlocked(g.x, g.y, px, py);
  }

  function reset(levelIndex) {
    state.levelIndex = levelIndex;
    state.level = LEVELS[levelIndex];
    state.player.x = state.level.player.x;
    state.player.y = state.level.player.y;
    state.player.sneak = false;
    state.player.hidden = false;
    state.guards = state.level.guards.map((g) => ({
      x: g.x,
      y: g.y,
      angle: 0,
      mode: 'patrol',
      suspicion: 0,
      wp: 0,
      pause: 0,
      scanDir: 1,
      alarmTimer: 0,
      seen: false,
    }));
    // Face along the first patrol leg.
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      const def = state.level.guards[i];
      const target = def.waypoints[1] ?? def.waypoints[0];
      g.angle = Math.atan2(target[1] - g.y, target[0] - g.x);
    }
    state.lootTaken = state.level.loot.map(() => false);
    state.lootTotal = state.level.loot.length;
    state.lootGot = 0;
    state.elapsed = 0;
    state.detection = 0;
    state.alert = 'calm';
    state.status = 'play';
  }

  function stepGuard(g, def, dt, events) {
    const player = state.player;
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.hypot(dx, dy);
    const seen = guardSeesPoint(g, player.x, player.y);
    g.seen = seen;

    if (seen) {
      const proximity = 1 - dist / GUARD.sightRange;
      let rate = GUARD.detectRate * (0.35 + 0.65 * proximity);
      if (player.sneak) rate *= GUARD.sneakFactor;
      if (player.hidden) rate *= GUARD.bushFactor;
      const before = g.suspicion;
      g.suspicion = Math.min(1, g.suspicion + rate * dt);
      if (before < GUARD.suspiciousAt && g.suspicion >= GUARD.suspiciousAt && g.mode !== 'chase') {
        g.mode = 'suspicious';
        events |= EVENT_SUSPICIOUS;
      }
      if (g.suspicion >= 1 && g.mode !== 'chase') {
        g.mode = 'chase';
        g.alarmTimer = GUARD.alarmMemory;
        state.detections += 1;
        events |= EVENT_ALARM;
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - GUARD.forgetRate * dt);
      if (g.mode === 'chase') {
        g.alarmTimer -= dt;
        if (g.alarmTimer <= 0) {
          g.mode = 'suspicious';
          g.suspicion = Math.max(g.suspicion, 0.6);
        }
      } else if (g.mode === 'suspicious' && g.suspicion < GUARD.suspiciousAt) {
        g.mode = 'patrol';
      }
    }

    if (g.mode === 'chase') {
      g.angle = Math.atan2(dy, dx);
      moveCircle(g, GUARD.radius, (dx / (dist || 1)) * GUARD.chaseSpeed * dt, (dy / (dist || 1)) * GUARD.chaseSpeed * dt);
      if (dist < GUARD.catchDistance) {
        state.status = 'caught';
        events |= EVENT_CAUGHT;
      }
      return events;
    }

    if (g.mode === 'suspicious') {
      // Stand and stare at the last seen spot.
      g.angle = Math.atan2(dy, dx);
      return events;
    }

    // Patrol: walk the waypoints, pausing at each to scan the room.
    if (g.pause > 0) {
      g.pause -= dt;
      g.angle += g.scanDir * 0.9 * dt;
      return events;
    }
    const target = def.waypoints[g.wp];
    const tx = target[0] - g.x;
    const ty = target[1] - g.y;
    const tdist = Math.hypot(tx, ty);
    const stepLen = def.speed * dt;
    if (tdist <= Math.max(stepLen, 4)) {
      g.x = target[0];
      g.y = target[1];
      g.wp = (g.wp + 1) % def.waypoints.length;
      g.pause = GUARD.scanPause;
      g.scanDir = -g.scanDir;
    } else {
      g.angle = Math.atan2(ty, tx);
      moveCircle(g, GUARD.radius, (tx / tdist) * stepLen, (ty / tdist) * stepLen);
    }
    return events;
  }

  /**
   * One fixed step. `mx, my` is the wanted move direction (each -1, 0 or 1); `sneak` is the
   * Shift key. Returns EVENT_* flags.
   */
  function step(dt, mx, my, sneak) {
    if (state.status !== 'play') return 0;
    let events = 0;
    state.elapsed += dt;
    state.totalElapsed += dt;

    const player = state.player;
    player.sneak = sneak;
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(mx, my) || 1;
    moveCircle(player, PLAYER.radius, (mx / len) * speed * dt, (my / len) * speed * dt);
    player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x));
    player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y));
    player.hidden = playerInBush();

    const defs = state.level.guards;
    for (let i = 0; i < state.guards.length; i += 1) {
      events = stepGuard(state.guards[i], defs[i], dt, events);
      if (state.status === 'caught') break;
    }

    let maxSuspicion = 0;
    let anyChase = false;
    for (const g of state.guards) {
      maxSuspicion = Math.max(maxSuspicion, g.suspicion);
      if (g.mode === 'chase') anyChase = true;
    }
    state.detection = maxSuspicion;
    state.alert = anyChase ? 'alarm' : maxSuspicion >= GUARD.suspiciousAt ? 'suspicious' : 'calm';

    if (state.status === 'play') {
      for (let i = 0; i < state.level.loot.length; i += 1) {
        if (state.lootTaken[i]) continue;
        const gem = state.level.loot[i];
        const dx = player.x - gem.x;
        const dy = player.y - gem.y;
        if (dx * dx + dy * dy < (PLAYER.radius + LOOT.radius + 4) ** 2) {
          state.lootTaken[i] = true;
          state.lootGot += 1;
          state.score += LOOT.points;
          events |= EVENT_LOOT;
        }
      }
      const ex = state.level.exit;
      const edx = player.x - ex.x;
      const edy = player.y - ex.y;
      if (edx * edx + edy * edy < 34 * 34) {
        state.status = 'clear';
        events |= EVENT_CLEAR;
      }
    }
    return events;
  }

  /** Advance to the next level; returns false when the last level was cleared. */
  function nextLevel() {
    if (state.levelIndex + 1 >= LEVELS.length) {
      state.status = 'won';
      return false;
    }
    reset(state.levelIndex + 1);
    return true;
  }

  reset(0);
  return { state, reset, step, nextLevel, guardSeesPoint };
}
