# CMPM 121 D3 Project

## Game Overview

World of Bits is a small location-based token crafting game built with TypeScript and Leaflet. The player is fixed to the classroom location on the map and views a tiled grid of small cells (about 0.0001° per side) that appear to cover the whole world.

How it works:

- The world is divided into grid cells; each cell may deterministically contain a token. Token presence is decided with a deterministic hash function so initial spawns are consistent across page loads.
- Cells render their contents (token value) directly on the map so players can see tokens without clicking.
- The player can hold at most one token at a time; the held token is shown in the inventory in the control panel.
- Interaction is limited to nearby cells (about 3 cells away). Click a nearby cell to interact:

  - If you are empty-handed and the cell has a token, clicking collects it into your inventory and removes it from the cell.
  - If you hold a token and the cell has a token of equal value, clicking crafts a new token of double value into the cell and clears your hand.
  - If you hold a token and the cell is empty, clicking places your token into the cell (drops it).

- The goal is to craft a token of sufficient value (currently 16) to win.

Technical notes:

- The deterministic spawn uses the provided `luck` function so the same cell coordinates always produce the same initial token state.
- Cells are drawn with a LayerGroup so the grid can be redrawn cleanly as the map view changes.
- For D3.a the player is fixed (no GPS movement). The code is organized to allow future extensions like persistence or live player movement.

## Updates by Date

- **2025-11-10** — Created `PLAN.md`. Moved original main code into `reference.ts` to start a clean implementation in `src/main.ts`.

- **2025-11-11** — Updated `PLAN.md` for clarity. Began implementing `src/main.ts`: added the map, grid drawing, and deterministic tile spawning. Grid tiles are clickable and spawn deterministically (so they remain in the same locations after a reload). Had assistance from Copilot for parts of this work.

- **2025-11-12** — Completed core mechanics (D3.a): visible grid, interaction radius (~3 cells), deterministic token spawning, collecting/placing/crafting gameplay, and a win condition at token value 16. Remaining work: cleanup, polish, and optional persistence or player movement. Further Updated `README.md` with better formatting and a section outlining the game and its mechanics (as of D3.a). Changed loops based on `map.getBounds()` in order to avoid world-scale loops in the future. Also changed token rendering to reuse the same incon instead of creating a new one every time. Also removed parts of comments that referenced PLAN.md as they were just there for me to check what I have done and are bloat now. Created section in Plan.md for D3.b.

- **2025-11-13** — Stopped `CLASSROOM_LATLNG` from being the same as the player location and added buttons for the four cardinal directions so that the player may move to collect and craft higher tokens. The map also centers around `playerLatLng` instead of `CLASSROOM_LATLNG` making it easier to track where you are without constantly scrolling the map.

- **2025-11-14** — Changed basis to use the true origin (0, 0) instead of the classroom.
