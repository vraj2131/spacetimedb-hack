# Visual Simulation

Use this guide to run the local mock board simulation without needing live
SpacetimeDB gameplay.

## Goal

Launch the fullscreen Match board and visually verify:

- 28x20 isometric board
- Kenney atlas tiles
- token circles
- pickups and FX overlays
- pan, zoom, resize, and fallback behavior

## Launch

From the game repo:

```sh
npm run dev
```

Open the Vite URL in your browser, then walk:

1. `Start Bodega Blitz`
2. Join flow
3. `Lobby`
4. `Start round`

That path reaches `MatchScreen -> GameStage -> PhaserGame -> BoardScene`.
Board data comes from `src/game/mockRenderState.ts`.

## QA Checklist

- Tiles render from the atlas instead of fallback polygons
- Street, bodega, and alley tiles are visually distinct
- Contest, shield, and spill FX overlays are visible
- Token circles remain readable on all tile types
- Pickups appear at the expected mock coordinates
- Drag pans the board and mouse wheel zooms it
- Resizing the viewport keeps the board visible
- The boxed `Dev sync` board still renders correctly

## Fallback Check

Temporarily rename `public/assets/game.json`, reload the app, and confirm the
board falls back to non-atlas rendering. Restore the file immediately after the
check.

## Automated Checks

```sh
npm test
npx tsc -b
npm run build
```
