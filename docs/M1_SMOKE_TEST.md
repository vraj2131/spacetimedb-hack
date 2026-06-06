# M1 Browser Smoke Test

Repeatable two-client checklist for the merged L2A–L2C live wiring. Run this after pulling
`main` (or the `feature/m1-live-hardening` PR branch) and before demoing M1.

Automated gates already green on CI/local:

```sh
npm test
npm run build
npm run test:integration
```

This doc covers the **manual browser smoke** those scripts do not run.

---

## 1. Local SpacetimeDB setup

Check server status:

```sh
npm run spacetime:status:local
```

If status reports stale PID, not reachable, or reducers fail with fatal errors:

```sh
npm run spacetime:kill:local
npm run spacetime:reset:local
```

If the server is simply down (no stale PID):

```sh
npm run spacetime:publish:local
```

`publish:local` starts the server if needed and publishes the module. After a reset, **hard-reload
all browser tabs** and start a **fresh room** (old room codes are invalid).

---

## 2. Start the frontend

```sh
npm run dev -- --host 127.0.0.1
```

Note the port Vite prints (often `5173`; may bump to `5174` if busy). Use that port in the URLs below.

---

## 3. Open two clients

Use separate auth token slots so host and guest do not share identity:

- **Host:** `http://127.0.0.1:5173/?client=host`
- **Guest:** `http://127.0.0.1:5173/?client=guest`

(Replace `5173` with your Vite port. If browser automation blocks `127.0.0.1`, use
`http://localhost:5173/?client=host` and `?client=guest` instead — same server.)

Hard-reload both tabs (`Cmd+Shift+R`) if you recently reset the database.

---

## 4. Acceptance flow

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Both | Land on dev scaffold, click **Start Bodega Blitz** | Join screen loads |
| 2 | Both | Confirm connection status | Shows connected / live sync |
| 3 | Host | Enter name, choose **player**, **Create room** | Routes to Lobby; room code visible |
| 4 | Guest | Enter name, choose **player**, enter host's room code, **Join** | Guest Lobby; roster shows both players |
| 5 | Host | **Start round** | Both auto-route to Match |
| 6 | Both | Use move pad (Up/Down/Left/Right) | Tokens move; no persistent action error |
| 7 | Both | Click an **adjacent non-alley** tile on the board | Tile ownership color updates on **both** clients |
| 8 | Both | Check HUD event feed | Claim event appears |
| 9 | Host | **End round** | Both auto-route to Results |
| 10 | Both | Review scoreboard | Rows match server `round_results` (winner/scores agree) |
| 11 | Host | **Rematch** | Both return to Lobby; room state is lobby |
| 12 | Optional | Host **Start round** again | Second round playable |

---

## 5. Expected UI signals

- **Join:** connection label shows connected (not stuck waiting).
- **Lobby:** roster updates when guest joins; host-only **Start round** enabled when ready.
- **Match:** live board shows player tokens and tile ownership colors (primitives, not Kenney sprites yet).
- **Match HUD:** timer label ticks from `endsAtMs`; standings reflect owned tiles.
- **Claim:** event feed receives a claim line; adjacent-only rejects show a readable action error.
- **Results:** `round_results` rows drive the scoreboard; host **Rematch** enabled in results state.

---

## 6. Failure triage

| Symptom | Fix |
|---------|-----|
| Blank white page | Check browser console; hard-reload after latest pull |
| "Action rejected by the server" on every move | Not in a live room — create → join → start fresh |
| Fatal error on all reducers | `npm run spacetime:reset:local`, hard-reload both tabs |
| `spacetime.pid already exists` | Server already up — use `spacetime:status:local`, skip manual `spacetime start` |
| Guest cannot join | Confirm code, room still in lobby (not live/results) |
| Lobby button snaps back to Match | Expected during live round unless you use **Lobby** then **Return to match** |

See also [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## 7. Pass criteria (M1)

- [x] Both clients connect with separate identities
- [x] Host creates room; guest joins by code
- [x] Host starts round; both route to Match
- [x] Move buttons call live movement on both clients
- [x] Board click claims adjacent tile and updates both clients
- [x] Host ends round; both route to Results with server score rows
- [x] Host rematches; both return to Lobby

When all boxes pass, M1 live wiring is verified for demo.

---

## 8. Recorded smoke run (2026-06-06)

Automated two-client smoke via **Playwright MCP** on branch `feature/m1-live-hardening`
after L2C merge. Local SpacetimeDB was already running (`pid 1284`); Vite on
`http://localhost:5173` (`npm run dev -- --host 127.0.0.1`).

| Step | Result | Evidence |
|------|--------|----------|
| Host/guest connect | Pass | Separate identities (`c2002bbc…` host); both showed **Connected** on Join |
| Create + join | Pass | Room `OR5Q9B`; guest roster `2 / 10` with SmokeHost + SmokeGuest |
| Start round | Pass | Both auto-routed to **Match**, Round 3 timer live |
| Move (both) | Pass | Up/Down/Left/Right buttons; no persistent action errors |
| Claim (both) | Pass | Host claimed center tiles (score 9 live → 39 final); guest claimed `(11,10)` (score 3 live → 13 final); event feed + standings synced on **both** tabs |
| End round | Pass | Both routed to **Results**; server rows: Host 39 (Tiles 9, Bonus 30), Guest 13 (Tiles 3, Bonus 10) |
| Rematch | Pass | Both returned to **Lobby** (host Ready, guest Waiting for host) |

**Automation notes:** Match HUD overlays intercept naive canvas clicks — use the board
center (move players toward the map middle first) or Playwright `force: true` on the
canvas. Tile claims require an adjacent cell; the UI correctly surfaces `Claim an
adjacent tile.` when the click misses.

**M1 status:** Live wiring smoke-verified for demo (2026-06-06).
