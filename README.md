# Bodega Blitz

Live multiplayer NYC block-control game built on SpacetimeDB. Players will fight for bodega tiles while spectators trigger chaos in real time.

## Current Phase Status

This repository is in **Wave 1: mocked game flow plus visual board simulation**.

- Installs, bindings, and local-first defaults are already in place.
- The board can now be demoed locally from mock `RenderState` without live gameplay.
- Dev Sync still exists for connection and round-trip checks.
- Live multiplayer reducers and the backend-to-`RenderState` adapter are still pending.

This repo uses a **local-first dev path**. Maincloud is for smoke tests and deployment, not daily iteration.

## Required Installs

- Node.js `20 LTS` or `22`
- SpacetimeDB CLI
- Git
- A modern browser

Required accounts:

- GitHub
- repo access
- working `spacetime login`

Not required in Phase 0:

- Groq or Gemini API keys
- Vercel
- art tools
- OBS / Loom

## First-Time Setup

```sh
git clone https://github.com/vraj2131/spacetimedb-hack.git
cd spacetimedb-hack
curl -sSf https://install.spacetimedb.com | sh
npm install
cd spacetimedb
npm install
cd ..
cp .env.example .env.local
spacetime login
npm run spacetime:generate
```

Bindings under `src/module_bindings/` are generated locally and not committed. Run `npm run spacetime:generate` after every pull that changes `spacetimedb/`.

Then start the local scaffold:

```sh
spacetime dev
```

If you need a frontend-only fallback in another terminal:

```sh
npm run dev
```

For the visual simulation path, open the Vite URL and walk:

1. `Start Bodega Blitz`
2. Join flow
3. `Lobby`
4. `Start round`

That path reaches the fullscreen Match board powered by `MOCK_RENDER_STATE`.
Detailed steps live in [docs/SIMULATION.md](docs/SIMULATION.md).

Additional onboarding notes live in [docs/SETUP.md](docs/SETUP.md).

## Local Development Flow

Local development is the default and expected path for the whole team.

Default env values:

```env
VITE_SPACETIMEDB_DB_NAME=bodega-blitz
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000
```

What the baseline proves right now:

- generated bindings exist
- the React client connects
- the reducer can mutate shared state
- subscriptions update across tabs
- the Phaser board canvas mounts live beside the round-trip proof
- the full game schema, reducer stubs (throwing `not implemented`), screen
  router, and Tailwind v4 are scaffolded for the gameplay slices

## Maincloud Smoke Test Flow

Do this only after the local scaffold works:

```sh
spacetime publish bodega-blitz --server maincloud
```

Then switch your local `.env.local` host value:

```env
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
```

Keep the database name the same unless the team intentionally changes it.

## Environment Variables

Copy `.env.example` to `.env.local` and keep `.env.local` uncommitted.

Shared Phase 0 shape:

```env
VITE_SPACETIMEDB_DB_NAME=bodega-blitz
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000

# Optional future flavor worker vars:
GROQ_API_KEY=
GEMINI_API_KEY=
```

Rules:

- local host is the default
- Maincloud is an override
- `.env.example` is the team contract
- `.env.local` is machine-specific

## Baseline Verification Checklist

Run:

```sh
npm test
```

Then confirm all of these manually:

- `node -v` reports a supported version
- `spacetime version` works
- `spacetime login` succeeds
- `spacetime dev` starts
- the browser app loads
- the connection status shows `Connected`
- the shared value syncs across two tabs
- the Phaser board canvas renders the 28x20 mock board beside the sync proof
- there are no missing env errors

Each teammate should post in the team channel:

- Node version
- SpacetimeDB version
- screenshot or short clip of the scaffold screen
- confirmation that local sync worked

## Known Conventions

- `spacetimedb/` holds the SpacetimeDB module
- `src/` holds the current Vite React client
- `src/module_bindings/` is generated and should not be edited by hand
- `src/game/PhaserGame.tsx` mounts the live board canvas and defaults to `MOCK_RENDER_STATE`
- keep the `sync_state` proof until the first real gameplay slice replaces it

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for the common failure cases:

- `spacetime` command not found
- wrong host target
- failed scaffold check
- browser never connects
- teammate environment drift

## Next Phase Boundary

Phase 0 ends only when the whole team can run the same scaffold successfully.

Only after that do we start the first gameplay slice:

1. implement room reducer bodies (`create_room`, `join_room`, `start_round`, …)
2. wire Join + Lobby screens to those reducers
3. project live game state into `RenderState` for Phaser
4. `move_player` across two tabs on the synced grid
