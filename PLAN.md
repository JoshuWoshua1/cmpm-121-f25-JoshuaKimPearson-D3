# D3: World of Bits

## Game Design Vision

A location-based token crafting game where players move in the real world to combine identical tokens on a map grid, aiming for a high-value token like 256.

## Technologies

TypeScript for most game code, little to no explicit HTML, and all CSS collected in common 'style.css' file
Deno and Vite for building
GitHub Actions + GitHub Pages for deployment automation
Leaflet for map rendering

## Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### D3.a Steps

- **Initial Setup & Map**
- [x] Copy main.ts to reference.ts for future reference.
- [x] Delete everything in main.ts.
- [x] Put a basic Leaflet map on the screen.
- [x] Draw the player's location on the map.
- [x] Implement the deterministic hashing mechanism to decide if a grid cell contains a token.
- [x] Create a function to convert latitude/longitude into a grid cell identifier.

- **Grid Cell Rendering**
- [x] Use the coordinate conversion function and loops to draw a whole grid of cells on the map around the player.
- [x] Ensure cells are visible to the edge of the map, simulating a world full of cells.
- [x] Render the contents of the cell using text or graphics.

- **Inventory & Interaction**
- [x] Implement a data structure to track the player's held token.
- [x] Clearly display the held token's state/value on the screen.
- [x] Implement logic to determine if a cell is nearby for interaction.

- **Core Mechanics (Click Handling)**
- [x] Set up an event listener so cells can be clicked to exercise game mechanics.
- [x] Implement collection: If a nearby cell has a token, and the player is not holding one, clicking it removes the token from the cell and places it in the player's hand.
- [x] Implement crafting: If the player is holding a token, and a nearby cell has a token of equal value, clicking the cell should remove both tokens and place a single new token of **double the value** into the cell. The player's hand becomes empty.
- [x] Implement the victory condition: Detect when the player has crafted a token of the target value

- **Polish & Finalization**
- [x] Do a final code review to check for code quality , preparing for a cleanup-only commit.
- [x] Commit all changes and mark the milestone complete.

## D3.b: Globe-spanning gameplay

Key technical challenge: Can you set up your implementation to support gameplay anywhere in the real world, not just locations near our classroom?
Key gameplay challenge: Can players craft an even higher value token by moving to other locations to get access to additional crafting materials?

### D3.b Steps

- **Movement Setup**
- [x] Introduce a new state variable (`playerLatLng`) to track the player's true location, initialized to `CLASSROOM_LATLNG`.
- [x] Update `playerMarker` and `map.center` to use `playerLatLng` instead of the fixed `CLASSROOM_LATLNG` constant.
- [x] Add North, South, East, and West buttons to the `controlPanelDiv` to simulate movement (e.g., move by one `TILE_DEGREES`).
- [x] Implement click handlers for movement buttons that update `playerLatLng` and then trigger `drawGrid()` and update the map center.

- **World-Anchored Coordinates (Null Island)**
- [x] Change the basis of coordinate calculations: modify `getCellId` and `getCellBounds` to use **Null Island (0, 0) as the true origin**, rather than `CLASSROOM_LATLNG`.
- _Tip: This is a major refactor of Section 3 to ensure the grid is globally consistent._
- [x] Verify that `luck` uses the new Null Island-based `i, j` coordinates for its seed to maintain global consistency.

- **Dynamic Map View**
- [x] Update `drawGrid` to center the drawing loop (`VISIBLE_RANGE`) around the current cell of `playerLatLng` (i.e., around `iPlayer`, `jPlayer`).
- [x] Ensure the player marker moves to `playerLatLng` when the map is moved by button clicks.
- [x] **Crucial for D3.b Gameplay:** When `drawGrid` runs, implement the "memoryless" cell requirement by **NOT** using the `cellContents` map to restore state. Instead, only check `getInitialCellToken`.
- _This creates the intentional farming bug, which will be fixed in D3.c._

- **Interaction Refinement**
- [x] Modify `handleCellClick` to calculate the proximity check based on the current cell of `playerLatLng` (`iPlayer`, `jPlayer`). The range check should be relative to the player's _new_ position.

- **Gameplay Progression**
- [x] Increase `WIN_VALUE` (e.g., from 16 to 64 or 128) to require movement and farming to achieve victory.
- [x] Test the farming exploit: confirm the player can move out of range, move back, and see a freshly spawned token in a cell they previously emptied.

- **Polish & Finalization**
- [x] Do a final code review and cleanup (preparing for a cleanup-only commit).
- [x] Commit all changes and mark the milestone complete (e.g., `(D3.b complete)`).

## D3.c Object persistence

Key technical challenge: Can you implement efficient memory management using the Flyweight pattern so unmodified cells don't consume memory, while preserving the state of modified cells using the Memento pattern?
Key gameplay challenge: Can players rely on cell state persisting across map movements (without page reload)?

### D3.c Steps

- **Memory Management (Flyweight Pattern)**
- [x] Ensure unmodified cells are not stored in memory. Only cells the player has interacted with (collected from, crafted in, or placed tokens into) are stored in `cellContents`.
- [x] Verify that `cellContents` only contains cells with non-initial tokens or null states (cleared tokens), not every cell on the map.

- **State Persistence (Memento Pattern)**
- [x] Modify the cell cleanup logic in `drawGrid()` to preserve player-modified cells outside `VISIBLE_RANGE` instead of deleting them.
- [x] Update the rendering logic in `drawGrid()` to restore saved cell state when cells re-enter the visible range.
- [x] Ensure crafted tokens and placed tokens persist in `cellContents` even when scrolled off-screen, and are restored when the player returns.

- **Testing the Persistence**
- [x] Test that a crafted token remains in a cell when the player moves away and returns.
- [x] Test that the farming glitch no longer works (cells should NOT reset when out of view).
- [ ] Verify that `cellContents` map size grows only with interacted cells, not with map size.
- [ ] Confirm memory efficiency: `cellContents` should remain small compared to the visible grid.

- **Polish & Finalization**
- [ ] Do a final code review and cleanup (preparing for a cleanup-only commit).
- [ ] Commit all changes and mark the milestone complete (e.g., `(D3.c complete)`).
