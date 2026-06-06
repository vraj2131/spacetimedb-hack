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

The scaffold verification script checks for:

- the `sync_state` table and reducer
- the local-first connection default
- the shared `.env.example`
- Phaser as an installed dependency
- README scaffold guidance

If one of those changed intentionally, update the script in `scripts/check-roundtrip-scaffold.mjs` as part of the same commit.

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
