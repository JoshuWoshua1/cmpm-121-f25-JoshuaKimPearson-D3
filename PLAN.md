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

### D3.b Steps

Haven't planned out D3b yet
