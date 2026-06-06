# Troubleshooting

## `spacetime` command not found

Install the SpacetimeDB CLI, then restart the terminal or open a new shell so the updated path is loaded.

macOS install command:

```sh
curl -sSf https://install.spacetimedb.com | sh
```

## The app connects to the wrong server

Check `.env.local`. The release/default host is:

```env
VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
VITE_SPACETIMEDB_DB_NAME=bodega-blitz
```

For local development, switch only the host:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000
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

- confirm the local server is up: `npm run spacetime:status:local`
- if it is down, run `npm run spacetime:publish:local` (starts the server for you)
- confirm `.env.local` points to the local host for normal development
- confirm no other process is already using the expected local port

## `spacetime start` says `spacetime.pid already exists`

The local server is **already running** — usually started earlier by `npm run spacetime:publish:local`.

1. Check status:
   ```sh
   npm run spacetime:status:local
   ```
2. If it reports running, **do not** run `spacetime start` again. Publish or reset instead:
   ```sh
   npm run spacetime:publish:local
   # or, if reducers are failing:
   npm run spacetime:reset:local
   ```
3. Only if you need a clean restart:
   ```sh
   npm run spacetime:kill:local
   npm run spacetime:publish:local
   ```

## An action shows a rejection message (e.g. "No room with that code")

This is **expected validation feedback**, not a server problem. Reducers throw
`SenderError` for invalid input (joining a non-existent room, moving off the
map, acting before a round is live, etc.), and the message is surfaced in the
UI. The database is fine — fix the input (e.g. use a valid room code) and retry.

> Note: this used to surface as a generic "Action rejected by the server / run
> `spacetime:reset:local`" message. That was a bug — every reducer threw a plain
> `Error`, which SpacetimeDB collapses into a detail-free `InternalError`. The
> reducers now throw `SenderError`, so the real reason reaches the client.

## Match controls show "The game server hit an internal error"

This is a real module crash — the **local `bodega-blitz` database is stale or
corrupt**, usually after a publish failed with `Connection refused` while the
browser was already connected. Unlike a normal rejection (which now names the
actual reason), a bare `InternalError` carries no detail and means the module
is unhealthy.

1. Reset the local database (starts the server if needed, deletes old data, republishes):
   ```sh
   npm run spacetime:reset:local
   ```
2. Hard-reload both browser tabs (`?client=host` and `?client=guest`).
3. Start a **fresh** room (create → join → start). Do not expect old room codes to work.

If you only need to republish without wiping data, use `npm run spacetime:publish:local` instead — but after a failed publish, **reset is the reliable fix**.

## Someone on the team has a different experience

Treat that as a Phase 0 blocker. Capture:

- Node version
- `spacetime version`
- the exact setup commands they ran
- a screenshot of the failing step
