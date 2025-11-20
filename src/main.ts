// @deno-types="npm:@types/leaflet"
import leaflet, { LatLng } from "leaflet";
// ------------------------

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function (deterministic hash for spawning)
import luck from "./_luck.ts";

// --------------- GAME STATE AND CONSTANTS ------------

// Token Interface: Represents the content of a cell or the player's inventory
interface Token {
  value: number; // Token value (e.g., 1, 2, 4, 8)
}

// Player State
let playerToken: Token | null = null; // What the player is currently holding
const WIN_VALUE = 256; // The value required for victory (e.g., 8 or 16)

// Map Coordinates for the Classroom (origin reference point)
const _CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Player location (tracked and updatable)
let playerLatLng = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// ---------------- Movement Facade -----------------
// Create an interface and two implementations to allow swapping
// button-based movement with geolocation-based movement.
interface MovementFacade {
  getPlayerPosition(): LatLng;
  onPositionChange(cb: (pos: LatLng) => void): void;
  stop?(): void; // optional for geolocation
}

class ButtonMovement implements MovementFacade {
  private pos: LatLng;
  private listeners: Array<(pos: LatLng) => void> = [];

  constructor(initial: LatLng) {
    this.pos = initial;
  }

  getPlayerPosition(): LatLng {
    return this.pos;
  }

  onPositionChange(cb: (pos: LatLng) => void) {
    this.listeners.push(cb);
  }

  // methods specific to button movement (not part of interface)
  moveBy(deltaLat: number, deltaLng: number) {
    this.pos = leaflet.latLng(this.pos.lat + deltaLat, this.pos.lng + deltaLng);
    this.emit();
  }

  private emit() {
    for (const cb of this.listeners) cb(this.pos);
  }
}

class GeolocationMovement implements MovementFacade {
  private pos: LatLng;
  private listeners: Array<(pos: LatLng) => void> = [];
  private watchId: number | null = null;

  constructor(initial: LatLng) {
    this.pos = initial;
  }

  getPlayerPosition(): LatLng {
    return this.pos;
  }

  onPositionChange(cb: (pos: LatLng) => void) {
    this.listeners.push(cb);
  }

  startWatching(options?: PositionOptions) {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      (p) => {
        this.pos = leaflet.latLng(p.coords.latitude, p.coords.longitude);
        for (const cb of this.listeners) cb(this.pos);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
      },
      options,
    );
  }

  stop() {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
  }
}

// Default movement (may be swapped at startup)
let movement: MovementFacade = new ButtonMovement(playerLatLng);
// If buttons used, we will maintain a concrete ref so the button handlers
// can call moveBy on it.
let buttonMovement: ButtonMovement | null = null;
if (movement instanceof ButtonMovement) {
  buttonMovement = movement as ButtonMovement;
}

// When movement changes, call movePlayer and redraw
movement.onPositionChange((pos) => movePlayer(pos));

// Helper: switch movement mode implementation (Buttons vs Geolocation)
function setMovementMode(mode: string) {
  const current = movement;
  if (current.stop) current.stop();
  if (mode === "geolocation" && navigator.geolocation) {
    movement = new GeolocationMovement(current.getPlayerPosition());
    (movement as GeolocationMovement).startWatching();
  } else {
    movement = new ButtonMovement(current.getPlayerPosition());
  }
  buttonMovement = movement instanceof ButtonMovement
    ? (movement as ButtonMovement)
    : null;
  movement.onPositionChange((pos) => movePlayer(pos));
  try {
    localStorage.setItem("movementMode", mode);
  } catch (_e) {
    // ignore localStorage errors
  }
}

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001; // Cell size
const VISIBLE_RANGE = 20; // How many cells to draw
const INTERACTION_RANGE = 3;
const INITIAL_TOKEN_PROBABILITY = 0.2; // Probability of a cell spawning a base token

// ---------------- UI SETUP ----------------

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
controlPanelDiv.innerHTML = `
    <h2>World of Bits</h2>
    <div id="playerInventory">Inventory: Empty</div>
    <div id="gameStatus">Goal: Craft a token of value ${WIN_VALUE}.</div>
    <div id="movementControls" style="margin-top: 10px;">
      <button id="btnNorth" style="display: block; margin: 5px auto;">↑ North</button>
      <div style="text-align: center;">
        <button id="btnWest" style="margin: 5px 5px;">← West</button>
        <button id="btnEast" style="margin: 5px 5px;">→ East</button>
      </div>
      <button id="btnSouth" style="display: block; margin: 5px auto;">↓ South</button>
    </div>
    <div style="margin-top:6px; text-align:center;">
      <label for="movementMode" style="font-size:12px;">Movement:</label>
      <select id="movementMode" style="margin-left:6px; font-size:12px;">
        <option value="buttons">Buttons</option>
        <option value="geolocation">Geolocation</option>
      </select>
    </div>
`;
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Debug panel placeholder for future debuggers
const debugPanelDiv = document.createElement("div");
debugPanelDiv.id = "debugPanel";
debugPanelDiv.style.cssText =
  "position: absolute; right: 8px; top: 8px; background: rgba(0,0,0,0.6); color: white; padding: 8px; font-size: 12px; border-radius: 6px; z-index: 9999;";
debugPanelDiv.innerHTML = `
  <div style="margin-bottom:6px; font-weight:600;">Debug</div>
  <button id="dbgToggle" style="margin-top:6px; font-size:11px;">Toggle</button>
`;
document.body.append(debugPanelDiv);

// Movement mode UI wiring: select movement mode by query string or saved preference
const movementSelect = document.getElementById(
  "movementMode",
) as HTMLSelectElement | null;
function applyInitialMovementMode() {
  const params = new URLSearchParams(globalThis.location.search);
  const paramMode = params.get("movement");
  const mode = paramMode || localStorage.getItem("movementMode") || "buttons";
  if (movementSelect) movementSelect.value = mode;
  setMovementMode(mode);
}
movementSelect?.addEventListener("change", () => {
  const mode = movementSelect.value;
  setMovementMode(mode);
});
applyInitialMovementMode();

// Create the map and set view to player location
const map = leaflet.map(mapDiv, {
  center: movement.getPlayerPosition(),
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: true,
});

// Add a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player Marker (tracks player location)
const playerMarker = leaflet.marker(playerLatLng, {
  icon: leaflet.divIcon({
    className: "player-icon",
    html:
      '<div style="background-color: #0080ff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
});
playerMarker.addTo(map);

// ------------ HELPER FUNCTIONS --------------------

/**
 * Updates the player's position on the map.
 * @param newLatLng - The new latitude/longitude position.
 */
function movePlayer(newLatLng: LatLng) {
  playerLatLng = newLatLng;
  playerMarker.setLatLng(newLatLng);
  map.setView(newLatLng);
  drawGrid();
}

/**
 * Converts a LatLng coordinate to the top-left corner of its cell identifier (i, j).
 * @param latlng - The latitude/longitude coordinate.
 * @returns An array [i, j] representing the cell coordinates.
 */
function getCellId(latlng: LatLng): [number, number] {
  // Use Null Island (0,0) as the global origin so the grid is world-anchored.
  // Convert absolute lat/lng into cell indices (i, j) relative to (0,0).
  const i = Math.floor(latlng.lat / TILE_DEGREES);
  const j = Math.floor(latlng.lng / TILE_DEGREES);

  return [i, j];
}

/**
 * Calculates the bounding box for a given cell (i, j).
 * @param i - The latitude index.
 * @param j - The longitude index.
 * @returns A LatLngBounds object for the cell.
 */
function getCellBounds(i: number, j: number): leaflet.LatLngBounds {
  // Bounds are computed relative to Null Island (0,0) so the cell coordinates
  // map to consistent world positions.
  const bounds = leaflet.latLngBounds([
    [i * TILE_DEGREES, j * TILE_DEGREES],
    [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
  ]);
  return bounds;
}

/**
 * Determines the initial token value for a cell using the deterministic luck function.
 * @param i - The latitude index.
 * @param j - The longitude index.
 * @returns A Token object or null if the cell is empty.
 */
function getInitialCellToken(i: number, j: number): Token | null {
  // Seed the luck function with the cell's fixed coordinates
  const seed = `${i},${j}`;
  if (luck(seed) < INITIAL_TOKEN_PROBABILITY) {
    // Cells start with value 1
    return { value: 1 };
  }
  return null;
}

// -----------------GAME STATE --------------------

// Map of cell ID (string 'i,j') to its current Token.
const cellContents = new Map<string, Token | null>();

// A single layer group for drawing the grid (so we can clear/redraw easily)
const gridLayer = leaflet.layerGroup().addTo(map);

// Cache for token label icons to avoid recreating DOM nodes on each redraw
const iconCache = new Map<string, leaflet.DivIcon>();

// Safety clamp for maximum number of cells drawn from map bounds (unused for now)
const _SAFETY_RANGE = 200; // maximum number of cells in each direction from player

/**
 * Memento helpers: serialize and deserialize cell state so modified cells
 * persist when scrolled off-screen. We store a shallow copy of the token
 * to avoid accidental shared references.
 */
function saveCellMemento(cellKey: string, token: Token | null) {
  if (token) {
    // store a fresh object copy
    cellContents.set(cellKey, { value: token.value });
  } else {
    // explicit null indicates the cell was cleared by the player
    cellContents.set(cellKey, null);
  }
}

function loadCellMemento(cellKey: string): Token | null | undefined {
  if (!cellContents.has(cellKey)) return undefined;
  const stored = cellContents.get(cellKey);
  if (stored === null) return null;
  // return a fresh copy so callers don't mutate the stored object
  return stored ? { value: stored.value } : null;
}

/**
 * Create or reuse a token label icon for the given value and proximity.
 */
function createTokenLabel(value: number, isNearby: boolean): leaflet.DivIcon {
  const key = `${value}|${isNearby}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const html = `<div style="color: ${
    isNearby ? "white" : "#1F2937"
  }; text-shadow: 0 0 3px black;">${value}</div>`;
  const icon = leaflet.divIcon({
    className: "token-label",
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  iconCache.set(key, icon);
  return icon;
}

/**
 * Updates the state of the player's inventory display.
 */
function updateInventoryDisplay() {
  const inventoryDiv = document.getElementById("playerInventory");
  if (inventoryDiv) {
    if (playerToken) {
      inventoryDiv.innerHTML =
        `Inventory: <span class="token-value">${playerToken.value}</span>`;
      if (playerToken.value >= WIN_VALUE) {
        document.getElementById("gameStatus")!.innerHTML =
          `<h3>VICTORY! Token of value ${WIN_VALUE} crafted!</h3>`;
        document.getElementById("gameStatus")!.classList.add("win");
      }
    } else {
      inventoryDiv.innerHTML = "Inventory: Empty";
    }
  }
}

/**
 * The main game logic handler when a cell is clicked.
 * Implements collection, crafting, and placement mechanics.
 */
function handleCellClick(i: number, j: number) {
  const cellKey = `${i},${j}`;

  // Get the current token from getInitialCellToken.
  // If the cell was modified by the player, restore the saved memento.
  let cellToken: Token | null = getInitialCellToken(i, j);
  const restored = loadCellMemento(cellKey);
  if (restored !== undefined) {
    cellToken = restored;
  }

  // Player's cell index
  const playerCell = getCellId(movement.getPlayerPosition());
  const iPlayer = playerCell[0];
  const jPlayer = playerCell[1];

  // 1. Check Interaction Range relative to player
  if (
    Math.abs(i - iPlayer) > INTERACTION_RANGE ||
    Math.abs(j - jPlayer) > INTERACTION_RANGE
  ) {
    statusPanelDiv.innerHTML =
      `Cell ${cellKey} is too far away. (Must be within ${INTERACTION_RANGE} cells)`;
    return;
  }

  // ------------ COLLECTION MECHANIC -----------------
  if (!playerToken && cellToken) {
    // Player is empty, cell has token -> COLLECT
    playerToken = cellToken;
    saveCellMemento(cellKey, null); // Remove token from cell (save cleared state)
    statusPanelDiv.innerHTML =
      `Collected token value ${playerToken.value} from cell ${cellKey}.`;
  } // -------------------- CRAFTING MECHANIC ------------------------
  else if (playerToken && cellToken && playerToken.value === cellToken.value) {
    // Player has token, cell has EQUAL token -> CRAFT
    const newValue = playerToken.value * 2;
    saveCellMemento(cellKey, { value: newValue }); // Place new token in cell
    playerToken = null; // Clear player inventory
    statusPanelDiv.innerHTML =
      `Crafted new token value ${newValue} in cell ${cellKey}!`;
  } // -------------------- PLACEMENT (No match, just placing an inventory token) ------------------------
  else if (playerToken && !cellToken) {
    // Player has token, cell is empty -> PLACE (or drop)
    saveCellMemento(cellKey, playerToken);
    playerToken = null;
    statusPanelDiv.innerHTML = `Placed token value ${
      cellContents.get(cellKey)?.value
    } into cell ${cellKey}.`;
  } // -------------------- INVALID ACTION ---------------------
  else {
    // Player has token, cell has UNEQUAL token, or both empty/both full (should be handled by crafting/collection)
    statusPanelDiv.innerHTML =
      `Cannot interact with cell ${cellKey}. Token values must match for crafting, or cell must be empty/full for placing/collecting.`;
  }

  // Redraw everything after state change
  updateInventoryDisplay();
  drawGrid();
}

/**
 * Draws or updates the entire grid of cells around the player.
 * Uses the coordinate conversion function and loops to draw a grid of cells
 * around the player's fixed location. Cell contents are rendered as text
 * labels so token values are visible without clicking.
 */
function drawGrid() {
  // Clear previous grid drawing layers
  gridLayer.clearLayers();

  const playerCell = getCellId(movement.getPlayerPosition());
  const iPlayer = playerCell[0];
  const jPlayer = playerCell[1];

  // Center the drawing loop around the player using VISIBLE_RANGE
  const minI = iPlayer - VISIBLE_RANGE;
  const maxI = iPlayer + VISIBLE_RANGE;
  const minJ = jPlayer - VISIBLE_RANGE;
  const maxJ = jPlayer + VISIBLE_RANGE;

  // Flyweight Pattern: Only cells that have been interacted with (in cellContents)
  // are stored in memory. Unmodified cells are computed on-the-fly using getInitialCellToken.

  for (let i = minI; i <= maxI; i++) {
    for (let j = minJ; j <= maxJ; j++) {
      // Get initial token from deterministic spawn. If a memento exists for
      // this cell (i.e., the player modified it previously) restore it.
      let token: Token | null = getInitialCellToken(i, j);
      const cellKey = `${i},${j}`;
      const restored = loadCellMemento(cellKey);
      if (restored !== undefined) token = restored;

      const bounds = getCellBounds(i, j);
      const rect = leaflet.rectangle(bounds);

      // Determine style based on content and range
      const isNearby = Math.abs(i - iPlayer) <= INTERACTION_RANGE &&
        Math.abs(j - jPlayer) <= INTERACTION_RANGE;

      // Styling based on token presence and interaction range
      let color = token ? "#10B981" : "#E5E7EB"; // Green for token, light grey for empty
      const opacity = isNearby ? 0.7 : 0.2; // Brighter if nearby
      const weight = isNearby ? 2 : 0;
      let fillOpacity = opacity;

      if (!isNearby) {
        color = token ? "#15803d" : "#9ca3af"; // Darker if far away
        fillOpacity = 0.1;
      }

      rect.setStyle({
        color: color,
        weight: weight,
        fillOpacity: fillOpacity,
      });

      rect.addTo(gridLayer);

      // Add the token value as a label in the center
      if (token) {
        const icon = createTokenLabel(token.value, isNearby);
        leaflet.marker(bounds.getCenter(), { icon, interactive: false }).addTo(
          gridLayer,
        );
      }

      // Click handler to enable interaction
      rect.on("click", () => {
        handleCellClick(i, j);
      });
    }
  }
}

// ---------------- INITIALIZATION ---------------------

// Initial Draw
drawGrid();
updateInventoryDisplay();

// Set up redrawing on map move (for when user scrolls)
map.on("moveend", () => {
  // This allows the user to see the full "World of Bits" that extends past the initial viewport
  drawGrid();
});

// Movement button handlers
document.getElementById("btnNorth")?.addEventListener("click", () => {
  if (buttonMovement) buttonMovement.moveBy(TILE_DEGREES, 0);
});

document.getElementById("btnSouth")?.addEventListener("click", () => {
  if (buttonMovement) buttonMovement.moveBy(-TILE_DEGREES, 0);
});

document.getElementById("btnEast")?.addEventListener("click", () => {
  if (buttonMovement) buttonMovement.moveBy(0, TILE_DEGREES);
});

document.getElementById("btnWest")?.addEventListener("click", () => {
  if (buttonMovement) buttonMovement.moveBy(0, -TILE_DEGREES);
});

statusPanelDiv.innerHTML =
  "Welcome to the World of Bits! Start collecting tokens of value 1 near you.";
