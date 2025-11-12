// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function (deterministic hash for spawning)
// import luck from "./_luck.ts"; (commented out for commit)

// --------------- GAME STATE AND CONSTANTS ------------

// Token Interface: Represents the content of a cell or the player's inventory
interface Token {
  value: number; // Token value (e.g., 1, 2, 4, 8)
}

// Player State
const WIN_VALUE = 16; // The value required for victory (e.g., 8 or 16)

// Map Coordinates for the Classroom (fixed player location for D3.a)
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
/* const TILE_DEGREES = 0.0001; // Cell size
const VISIBLE_RANGE = 20; // How many cells to draw
const INTERACTION_RANGE = 3;
const INITIAL_TOKEN_PROBABILITY = 0.2; // Probability of a cell spawning a base token
commented out for commit */
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

// Create the map and set fixed view
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: true, // Allow scrolling to see the world, but view is fixed
});

// Add a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player Marker (fixed location for D3.a)
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

// ----------------- GAME STATE FOR D3.a --------------------

// ---------------- INITIALIZATION ---------------------
