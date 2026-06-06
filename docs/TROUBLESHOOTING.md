# Troubleshooting

## `spacetime` command not found

Install the SpacetimeDB CLI, then restart the terminal or open a new shell so the updated path is loaded.

macOS install command:

```sh
curl -sSf https://install.spacetimedb.com | sh
```

## The app connects to the wrong server

Check `.env.local`. The scaffold default is:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000
VITE_SPACETIMEDB_DB_NAME=bodega-blitz
```

If you are smoke-testing Maincloud, switch only the host:

```env
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
```

## `npm test` fails

The scaffold verification script (`npm test`) runs:

- `scripts/check-roundtrip-scaffold.mjs` — 60 structural checks for the Wave 0 spine (schema split, stub reducers, RenderState firewall, router, Tailwind)
- `tests/*.test.mjs` — unit checks for map/renderState, generated bindings, Phaser firewall, onboarding docs

If you changed the scaffold intentionally, update those scripts as part of the same commit.

## `src/module_bindings` is missing after clone

Bindings are gitignored. Regenerate before build or dev:

```sh
npm run spacetime:generate
```

CI runs this automatically; fresh local clones must run it once after pull.

## The browser loads but never connects

- confirm `spacetime dev` is running
- confirm `.env.local` points to the local host for normal development
- confirm no other process is already using the expected local port

## Someone on the team has a different experience

Treat that as a Phase 0 blocker. Capture:

- Node version
- `spacetime version`
- the exact setup commands they ran
- a screenshot of the failing step
