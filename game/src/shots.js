// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world, steered by a simple autopilot that walks the level's safe route and
// waits when a guard's cone covers the next leg, so the frame is what a real game looks
// like and the same seed always gives the same frame. The end scene walks the whole first
// level to the exit, so it shows a genuine level-clear screen.
import { FIELD, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_CLEAR } from './world.js';
import { SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 6;
const END_LIMIT_SECONDS = 240;

/** How close the autopilot must get to a waypoint before moving to the next one. */
const WAYPOINT_REACH = 18;

/**
 * Is the point (x, y) inside any guard's vision cone right now? The autopilot waits
 * outside the cones instead of walking into them.
 */
function pointWatched(world, x, y) {
  for (const g of world.state.guards) {
    if (world.guardSeesPoint(g, x, y)) return true;
  }
  return false;
}

/**
 * Steer toward the current route target. Returns {x, y, sneak}: the move direction and
 * whether to sneak. Waits (stands still, sneaking) while the next waypoint is watched.
 */
function autopilot(world, routeIndex) {
  const state = world.state;
  const player = state.player;
  const route = [...state.level.route, [state.level.exit.x, state.level.exit.y]];
  const target = route[Math.min(routeIndex, route.length - 1)];
  const dx = target[0] - player.x;
  const dy = target[1] - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < WAYPOINT_REACH) return { x: 0, y: 0, sneak: false, reached: true };
  // Never step into a watched spot: wait for the patrol to turn away.
  if (pointWatched(world, target[0], target[1]) || pointWatched(world, player.x + (dx / dist) * 40, player.y + (dy / dist) * 40)) {
    return { x: 0, y: 0, sneak: true, reached: false };
  }
  const nearGuard = state.guards.some((g) => Math.hypot(g.x - player.x, g.y - player.y) < 190);
  return { x: dx / dist, y: dy / dist, sneak: nearGuard, reached: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it and the best time to show.
 */
export function stageShot(name, world) {
  world.reset(0);
  if (name !== 'play' && name !== 'end') {
    // Title over a living level: guards patrol for a few seconds behind the panel.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  let routeIndex = 0;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let screen = SCREEN_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world, routeIndex);
    if (move.reached) routeIndex += 1;
    const events = world.step(STEP, move.x, move.y, move.sneak);
    if (events & EVENT_CAUGHT) {
      screen = SCREEN_CAUGHT;
      break;
    }
    if (events & EVENT_CLEAR) {
      screen = SCREEN_CLEAR;
      break;
    }
  }
  // The play scene is a mid-game frame; the end scene must show the clear screen, and if
  // the autopilot somehow did not make it, the frame still shows honest mid-game play.
  return { screen, best: 0 };
}
