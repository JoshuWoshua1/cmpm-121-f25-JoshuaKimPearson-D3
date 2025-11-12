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
const WIN_VALUE = 16; // The value required for victory (e.g., 8 or 16)

// Map Coordinates for the Classroom (fixed player location for D3.a)
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

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
`;
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Create the map and set fixed view ([x] Put a basic Leaflet map on the screen.)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
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

// Player Marker ([x] Draw the player's location on the map.)
const playerMarker = leaflet.marker(CLASSROOM_LATLNG, {
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
 * Converts a LatLng coordinate to the top-left corner of its cell identifier (i, j).
 * @param latlng - The latitude/longitude coordinate.
 * @returns An array [i, j] representing the cell coordinates.
 */
function getCellId(latlng: LatLng): [number, number] {
  // Relative position from the origin (classroom) in degrees
  const latDiff = latlng.lat - CLASSROOM_LATLNG.lat;
  const lngDiff = latlng.lng - CLASSROOM_LATLNG.lng;

  // Convert difference to cell indices (i, j)
  const i = Math.floor(latDiff / TILE_DEGREES);
  const j = Math.floor(lngDiff / TILE_DEGREES);

  return [i, j];
}

/**
 * Calculates the bounding box for a given cell (i, j).
 * @param i - The latitude index.
 * @param j - The longitude index.
 * @returns A LatLngBounds object for the cell.
 */
function getCellBounds(i: number, j: number): leaflet.LatLngBounds {
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
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

// ----------------- GAME STATE FOR D3.a --------------------

// Map of cell ID (string 'i,j') to its current Token.
const cellContents = new Map<string, Token | null>();

// A single layer group for drawing the grid (so we can clear/redraw easily)
const gridLayer = leaflet.layerGroup().addTo(map);

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
 * Only implements the nearby check ([x]) and event listener setup ([x]).
 */
function handleCellClick(i: number, j: number) {
  const cellKey = `${i},${j}`;

  // Re-evaluate current token for the cell (in case it's changed since draw)
  const cellToken = cellContents.get(cellKey) ?? null;

  // Player's cell index
  const playerCell = getCellId(CLASSROOM_LATLNG);
  const iPlayer = playerCell[0];
  const jPlayer = playerCell[1];

  // 1. Check Interaction Range relative to player ([x] Implement logic to determine if a cell is nearby for interaction)
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
    cellContents.set(cellKey, null); // Remove token from cell
    statusPanelDiv.innerHTML =
      `Collected token value ${playerToken.value} from cell ${cellKey}.`;
  } // -------------------- CRAFTING MECHANIC ------------------------
  else if (playerToken && cellToken && playerToken.value === cellToken.value) {
    // Player has token, cell has EQUAL token -> CRAFT
    const newValue = playerToken.value * 2;
    cellContents.set(cellKey, { value: newValue }); // Place new token in cell
    playerToken = null; // Clear player inventory
    statusPanelDiv.innerHTML =
      `Crafted new token value ${newValue} in cell ${cellKey}!`;
  } // -------------------- PLACEMENT (No match, just placing an inventory token) ------------------------
  else if (playerToken && !cellToken) {
    // Player has token, cell is empty -> PLACE (or drop)
    cellContents.set(cellKey, playerToken);
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
 * ([x] Use the coordinate conversion function and loops to draw a whole grid of cells on the map...)
 * ([x] Ensure cells are visible to the edge of the map, simulating a world full of cells.)
 * ([x] Render the contents of the cell using text or graphics.)
 */
function drawGrid() {
  // Clear previous grid drawing layers
  gridLayer.clearLayers();

  const playerCell = getCellId(CLASSROOM_LATLNG);
  const iPlayer = playerCell[0];
  const jPlayer = playerCell[1];

  // Use VISIBLE_RANGE for the bounds of the loop.
  for (let i = iPlayer - VISIBLE_RANGE; i < iPlayer + VISIBLE_RANGE; i++) {
    for (let j = jPlayer - VISIBLE_RANGE; j < jPlayer + VISIBLE_RANGE; j++) {
      const cellKey = `${i},${j}`;
      // Read from the local cache
      let token: Token | null = cellContents.get(cellKey) ?? null;

      // Deterministic Initialization logic
      if (!cellContents.has(cellKey)) {
        token = getInitialCellToken(i, j);
        cellContents.set(cellKey, token); // Cache the initial deterministic state
      }

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
        const label = leaflet.divIcon({
          className: "token-label",
          html: `<div style="color: ${
            isNearby ? "white" : "#1F2937"
          }; text-shadow: 0 0 3px black;">${token.value}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        leaflet.marker(bounds.getCenter(), { icon: label, interactive: false })
          .addTo(gridLayer);
      }

      // Click Handler to enable interaction ([x] Set up an event listener)
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

statusPanelDiv.innerHTML =
  "Welcome to the World of Bits! Start collecting tokens of value 1 near you.";
