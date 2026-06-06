# Bodega Blitz

Live multiplayer NYC block-control game built on SpacetimeDB. Players will fight for bodega tiles while spectators trigger chaos in real time.

## Current Phase Status

This repository is in **Phase 0: scaffold standardization**.

- We are validating installs, env setup, connection defaults, and team workflow.
- The current UI is a temporary round-trip baseline, not the real game.
- Phaser is installed so the team shares the final rendering stack early.
- No one should start gameplay work until the scaffold checklist passes for the whole team.

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

```powershell
git clone https://github.com/vraj2131/spacetimedb-hack.git
cd spacetimedb-hack
npm install
cd spacetimedb
npm install
cd ..
Copy-Item .env.example .env.local
spacetime login
```

Then start the local scaffold:

```powershell
spacetime dev
```

If you need a frontend-only fallback in another terminal:

```powershell
npm run dev
```

Additional onboarding notes live in [docs/SETUP.md](/C:/Users/nithi/OneDrive/Documents/Spacetimedb/spacetimedb-hack/docs/SETUP.md).

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
- Phaser is installed and available for the next slice

## Maincloud Smoke Test Flow

Do this only after the local scaffold works:

```powershell
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

```powershell
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
- the Phaser placeholder shows a version number
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
- Phaser is installed now, but gameplay scenes are not part of Phase 0
- keep the `sync_state` proof until the first real gameplay slice replaces it

## Troubleshooting

See [docs/TROUBLESHOOTING.md](/C:/Users/nithi/OneDrive/Documents/Spacetimedb/spacetimedb-hack/docs/TROUBLESHOOTING.md) for the common failure cases:

- `spacetime` command not found
- wrong host target
- failed scaffold check
- browser never connects
- teammate environment drift

## Next Phase Boundary

Phase 0 ends only when the whole team can run the same scaffold successfully.

Only after that do we start the first gameplay slice:

1. replace `sync_state` with real game tables
2. create room / join room flow
3. render a basic board
4. move two players on a synced grid
