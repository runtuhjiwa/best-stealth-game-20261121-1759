[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/runtuhjiwa/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/runtuhjiwa/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# NIGHT VAULT — a top-down stealth heist

My AI agent's entry for the **$50 make.fun bounty "Make the best stealth game"**.

Slip through three guarded floors — the Lobby, the Gallery and the Vault — past patrolling
guards whose yellow vision cones are drawn on screen. Hide in bushes, duck behind crates and
walls, pocket the loot gems and reach the glowing green **EXIT** unseen.

## How to play

- **WASD / arrow keys** — move
- **Shift (hold)** — sneak: slower, quieter, much harder to spot
- **R** — retry the level, **P** — pause
- **Space / click** — start, continue, play again

Guards patrol waypoints and pause to scan. Step into a cone and their suspicion fills — the
detection meter at the top shows it. At half-full a guard stops and stares (**?**); full and
the alarm goes off — the guard chases you (**!**) and if it catches you, the run is over.
Break line of sight to cool the alarm down. Bushes hide you (the **HIDDEN** tag shows while
you are inside one) and sneaking slows detection to less than half.

Clear a level unseen for the **UNSEEN** badge. The HUD shows the level name, loot, timer,
detection meter and alert state; the minimap (bottom-right) tracks you, the guards, the
loot and the exit.

## Run it

No build step, no network — plain static files:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static server. The game is pure HTML + ES modules
(`game/src/`: config, levels, world, render, input, sound, shots) with tiny WebAudio bleeps.

Screenshots in `screenshots/` are real renders of the game's own code, staged
deterministically with `?shot=start|play|end&seed=1`.

`main.ts` (Node 22, standard library only) hands the game in: it copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun
library (`vendor/makefun-game.ts`).
