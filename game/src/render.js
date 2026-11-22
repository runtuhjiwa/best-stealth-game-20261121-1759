// Drawing only: the world's state and the current screen in, pixels out. The 1280x800
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Vision cones are drawn as translucent wedges (yellow while patrolling, red on
// alarm) and walls are painted over them, so cover reads as cover. The minimap sits
// bottom-right, clear of the exit, which is always top-right.
import { FIELD, FONT, GUARD, LOOT, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WON = 'won';

const PANEL = { width: 620, top: 150, line: 36, bottom: 76 };
const MINIMAP = { width: 200, height: 125, margin: 16 };

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFloor(state) {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint floor tiles so the space reads as rooms, not a void.
    context.fillStyle = PALETTE.floorTile;
    for (let x = 0; x < FIELD.width; x += 80) {
      for (let y = 0; y < FIELD.height; y += 80) {
        if (((x + y) / 80) % 2 === 0) context.fillRect(x + 1, y + 1, 78, 78);
      }
    }
    // Warm lamp pools in the middle of each room.
    for (const lamp of state.level.lamps ?? []) {
      context.fillStyle = PALETTE.lampGlow;
      context.beginPath();
      context.arc(lamp.x, lamp.y, 130, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.lamp;
      context.beginPath();
      context.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawExit(state) {
    const exit = state.level.exit;
    context.fillStyle = PALETTE.exitGlow;
    context.beginPath();
    context.arc(exit.x, exit.y, 64, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.exit;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(exit.x, exit.y, 34, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.exit;
    context.beginPath();
    context.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0b0e14';
    context.font = `bold 15px ${FONT}`;
    context.textAlign = 'center';
    context.fillText('EXIT', exit.x, exit.y + 5);
  }

  function drawCover(state) {
    for (const bush of state.level.bushes) {
      context.fillStyle = PALETTE.bush;
      context.beginPath();
      context.arc(bush.x, bush.y, bush.r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.bushEdge;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(bush.x, bush.y, bush.r - 3, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.bushEdge;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + bush.x * 0.01;
        context.beginPath();
        context.arc(bush.x + Math.cos(a) * bush.r * 0.55, bush.y + Math.sin(a) * bush.r * 0.55, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    for (let i = 0; i < state.level.loot.length; i += 1) {
      if (state.lootTaken[i]) continue;
      const gem = state.level.loot[i];
      context.fillStyle = PALETTE.loot;
      context.save();
      context.translate(gem.x, gem.y);
      context.rotate(Math.PI / 4);
      context.fillRect(-LOOT.radius * 0.7, -LOOT.radius * 0.7, LOOT.radius * 1.4, LOOT.radius * 1.4);
      context.restore();
      context.fillStyle = 'rgba(255, 255, 255, 0.65)';
      context.fillRect(gem.x - 2, gem.y - 5, 4, 4);
    }
  }

  function drawCone(g) {
    const alarmed = g.mode === 'chase';
    const suspicious = g.mode === 'suspicious';
    const color = alarmed ? PALETTE.coneAlarm : PALETTE.cone;
    const edge = alarmed ? PALETTE.coneAlarmEdge : suspicious ? 'rgba(242, 176, 76, 0.6)' : PALETTE.coneEdge;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(g.x, g.y);
    context.arc(g.x, g.y, GUARD.sightRange, g.angle - GUARD.sightHalfAngle, g.angle + GUARD.sightHalfAngle);
    context.closePath();
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(g.x, g.y);
    context.arc(g.x, g.y, GUARD.sightRange, g.angle - GUARD.sightHalfAngle, g.angle + GUARD.sightHalfAngle);
    context.closePath();
    context.stroke();
  }

  function drawWalls(state) {
    for (const wall of state.level.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 4);
    }
    for (const crate of state.level.crates) {
      context.fillStyle = PALETTE.crate;
      context.fillRect(crate.x, crate.y, crate.w, crate.h);
      context.strokeStyle = PALETTE.crateTop;
      context.lineWidth = 2;
      context.strokeRect(crate.x + 3, crate.y + 3, crate.w - 6, crate.h - 6);
      context.beginPath();
      context.moveTo(crate.x, crate.y);
      context.lineTo(crate.x + crate.w, crate.y + crate.h);
      context.moveTo(crate.x + crate.w, crate.y);
      context.lineTo(crate.x, crate.y + crate.h);
      context.stroke();
    }
  }

  function drawActors(state) {
    for (const g of state.guards) {
      const alarmed = g.mode === 'chase';
      context.fillStyle = alarmed ? PALETTE.guardAlarm : PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      // Facing tick: a short nose in the direction the guard looks.
      context.strokeStyle = '#0b0e14';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 5), g.y + Math.sin(g.angle) * (GUARD.radius + 5));
      context.stroke();
      if (g.mode === 'suspicious' || alarmed) {
        text(alarmed ? '!' : '?', g.x, g.y - GUARD.radius - 8, 24, alarmed ? PALETTE.danger : PALETTE.lamp, 'center');
      }
    }

    const player = state.player;
    if (player.hidden) {
      context.strokeStyle = PALETTE.bushEdge;
      context.lineWidth = 2;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(player.x, player.y, PLAYER.radius + 6, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    context.fillStyle = player.sneak ? PALETTE.playerSneak : PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius - 3, 0, Math.PI * 2);
    context.stroke();
    if (player.hidden) text('HIDDEN', player.x, player.y + PLAYER.radius + 16, 12, PALETTE.bushEdge, 'center');
  }

  function drawHud(state) {
    const level = state.level;
    text(`${level.name}  ·  LEVEL ${state.levelIndex + 1}/3`, 28, 52, 22, PALETTE.text);
    text(`◆ ${state.lootGot}/${state.lootTotal}    ${formatTime(state.elapsed)}`, FIELD.width - 28, 52, 22, PALETTE.text, 'right');

    // Detection meter, centred at the top.
    const barW = 240;
    const barX = (FIELD.width - barW) / 2;
    const barY = 30;
    text('DETECTION', barX, barY - 8, 12, PALETTE.muted);
    context.fillStyle = PALETTE.panel;
    context.fillRect(barX, barY, barW, 12);
    const meterColor = state.detection >= GUARD.suspiciousAt ? (state.alert === 'alarm' ? PALETTE.danger : PALETTE.lamp) : PALETTE.calm;
    context.fillStyle = meterColor;
    context.fillRect(barX, barY, barW * Math.min(1, state.detection), 12);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(barX, barY, barW, 12);
    const alertText = state.alert === 'alarm' ? 'ALARM!' : state.alert === 'suspicious' ? 'SUSPICIOUS' : 'UNSEEN';
    text(alertText, barX + barW / 2, barY + 30, 13, meterColor, 'center');
  }

  function drawMinimap(state) {
    const x = FIELD.width - MINIMAP.width - MINIMAP.margin;
    const y = FIELD.height - MINIMAP.height - MINIMAP.margin;
    const scaleX = MINIMAP.width / FIELD.width;
    const scaleY = MINIMAP.height / FIELD.height;
    context.fillStyle = 'rgba(11, 14, 20, 0.82)';
    context.fillRect(x, y, MINIMAP.width, MINIMAP.height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(x, y, MINIMAP.width, MINIMAP.height);
    for (const wall of state.level.walls) {
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(x + wall.x * scaleX, y + wall.y * scaleY, Math.max(1, wall.w * scaleX), Math.max(1, wall.h * scaleY));
    }
    for (const crate of state.level.crates) {
      context.fillStyle = PALETTE.crateTop;
      context.fillRect(x + crate.x * scaleX, y + crate.y * scaleY, Math.max(1, crate.w * scaleX), Math.max(1, crate.h * scaleY));
    }
    const exit = state.level.exit;
    context.fillStyle = PALETTE.exit;
    context.fillRect(x + exit.x * scaleX - 3, y + exit.y * scaleY - 3, 6, 6);
    for (let i = 0; i < state.level.loot.length; i += 1) {
      if (state.lootTaken[i]) continue;
      const gem = state.level.loot[i];
      context.fillStyle = PALETTE.loot;
      context.fillRect(x + gem.x * scaleX - 2, y + gem.y * scaleY - 2, 4, 4);
    }
    for (const g of state.guards) {
      context.fillStyle = g.mode === 'chase' ? PALETTE.guardAlarm : PALETTE.guard;
      context.beginPath();
      context.arc(x + g.x * scaleX, y + g.y * scaleY, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    const player = state.player;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(x + player.x * scaleX, y + player.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    context.beginPath();
    context.arc(x + player.x * scaleX, y + player.y * scaleY, 5.5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawPanel(title, titleColor, lines, prompt) {
    const height = PANEL.top + PANEL.line * lines.length + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(11, 14, 20, 0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 62, 44, titleColor, 'center');
    lines.forEach((line, i) => {
      text(line.text, FIELD.width / 2, y + 112 + i * PANEL.line, line.size ?? 19, line.color ?? PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 30, 18, PALETTE.muted, 'center');
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(-view.x / view.scale, -view.y / view.scale, FIELD.width + (2 * view.x) / view.scale, FIELD.height + (2 * view.y) / view.scale);

    drawFloor(state);
    drawExit(state);
    drawCover(state);
    for (const g of state.guards) drawCone(g);
    drawWalls(state);
    drawActors(state);

    if (screen === SCREEN_TITLE) {
      drawPanel('NIGHT VAULT', PALETTE.lamp, [
        { text: 'A top-down stealth heist in three levels.' },
        { text: 'Slip past the guards. Pocket the gems. Reach the EXIT unseen.' },
        { text: 'WASD / arrows to move  ·  Shift to sneak  ·  R to retry  ·  P to pause', size: 17, color: PALETTE.muted },
        { text: 'Bushes hide you. Crates and walls block their sight.', size: 17, color: PALETTE.muted },
      ], 'Press Space or click to start');
    } else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state);
      drawMinimap(state);
      if (screen === SCREEN_PAUSED) {
        drawPanel('PAUSED', PALETTE.text, [{ text: 'The guards are waiting.' }], 'Press P or Space to keep going');
      }
    } else if (screen === SCREEN_CLEAR) {
      drawPanel(state.detections === 0 ? 'UNSEEN — LEVEL CLEAR' : 'LEVEL CLEAR', PALETTE.exit, [
        { text: `${state.level.name}  ·  ${formatTime(state.elapsed)}` },
        { text: `Loot ${state.lootGot}/${state.lootTotal}   ·   Spotted ${state.detections} time${state.detections === 1 ? '' : 's'}` },
        { text: state.detections === 0 ? 'Not a single guard saw you.' : 'You made it out — barely.', color: PALETTE.muted },
      ], state.levelIndex + 1 < 3 ? 'Press Space for the next level' : 'Press Space to finish the heist');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel('CAUGHT!', PALETTE.danger, [
        { text: `A guard ran you down in ${state.level.name}.` },
        { text: `Loot ${state.lootGot}/${state.lootTotal}   ·   Time ${formatTime(state.elapsed)}`, color: PALETTE.muted },
      ], 'Press R to retry the level');
    } else if (screen === SCREEN_WON) {
      drawPanel('THE VAULT IS YOURS', PALETTE.exit, [
        { text: 'All three levels cleared.' },
        { text: `Total time ${formatTime(state.totalElapsed)}   ·   Loot ${state.score / 100} gems` },
        { text: state.detections === 0 ? 'UNSEEN — a perfect heist.' : `Spotted ${state.detections} time${state.detections === 1 ? '' : 's'} along the way.`, color: PALETTE.muted },
        { text: best > 0 ? `Best clear ${formatTime(best)}` : '', color: PALETTE.muted },
      ], 'Press Space to play again');
    }
  }

  return { draw };
}
