// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between six screens: title, play, paused, level clear, caught and won.
//
// ?seed=N fixes the run. ?shot=start|play|end (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ALARM, EVENT_CAUGHT, EVENT_CLEAR, EVENT_LOOT } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RETRY, createInput } from './input.js';
import { createSound } from './sound.js';
import {
  SCREEN_CAUGHT,
  SCREEN_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sound.unlock();
    world.reset(0);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Reach the exit unseen.');
  }

  function retryLevel() {
    sound.unlock();
    world.reset(world.state.levelIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Retrying the level.');
  }

  function advanceFromClear() {
    sound.unlock();
    if (world.nextLevel()) {
      accumulator = 0;
      screen = SCREEN_PLAY;
      announce(`Playing ${world.state.level.name}.`);
    } else {
      screen = SCREEN_WON;
      if (best === 0 || world.state.totalElapsed < best) {
        best = Math.floor(world.state.totalElapsed);
        saveBest(best);
      }
      announce('Heist complete. The vault is yours.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE && actions & ACTION_CONFIRM) startGame();
    else if (screen === SCREEN_CLEAR && actions & ACTION_CONFIRM) advanceFromClear();
    else if (screen === SCREEN_WON && actions & ACTION_CONFIRM) startGame();
    else if (screen === SCREEN_CAUGHT && (actions & (ACTION_CONFIRM | ACTION_RETRY))) retryLevel();
    else if (screen === SCREEN_PLAY && actions & ACTION_RETRY) retryLevel();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const move = input.move();
    const events = world.step(STEP, move.x, move.y, move.sneak);
    if (events & EVENT_LOOT) sound.loot();
    if (events & EVENT_ALARM) {
      sound.alarm();
      announce('Spotted! A guard is chasing you.');
    }
    if (events & EVENT_CLEAR) {
      sound.clear();
      screen = SCREEN_CLEAR;
      announce(world.state.detections === 0 ? 'Level clear, unseen.' : 'Level clear.');
    } else if (events & EVENT_CAUGHT) {
      sound.caught();
      screen = SCREEN_CAUGHT;
      announce('Caught by a guard.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Night Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
