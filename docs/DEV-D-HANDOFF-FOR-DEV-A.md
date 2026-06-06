# Dev D → Dev A Handoff — assets + flavor prep

| | |
|---|---|
| **From** | Dev D (`dev-d-assets-flavor-prep`) |
| **To** | Dev A (critical-path spine on `main`) |
| **Purpose** | Merge Dev D work after gate commits land (or anytime — zero conflict) |
| **Date** | June 6, 2026 |

---

## 1. Summary

Dev D scope is **complete**. All work is in new files/folders only — no edits to shared spine files Dev A owns (`src/`, `spacetimedb/`, root `package.json`, Vite, etc.).

- Safe to merge anytime Dev A chooses
- No dependency on Dev A's gate commits
- No backend connection
- No blocker for spine work

**Commit on branch:** `22cdc30` — Add assets atlas and flavor worker stubs  
**Branch:** `dev-d-assets-flavor-prep`

---

## 2. What was delivered (Dev D checklist)

- [x] CC0 Kenney isometric tileset sourced (Isometric Miniature Prototype)
- [x] ~15–20 frame atlas packed → **17 frames**
- [x] Dropped into `public/assets/` (`game.png` + `game.json`)
- [x] Licenses tracked in `ASSETS.md`
- [x] `agents/phrases.json` — static taunt/recap fallback
- [x] `agents/run-flavor.ts` — worker entry (stub)
- [x] `agents/providers/{groq,gemini,static}.ts` — provider stubs
- [x] Groq/Gemini chain with static fallback (dry-run verified)
- [ ] Backend STDB wiring — **intentionally not done** (Slice 9; kept simple per Dev D)

---

## 3. Files added (merge manifest)

**Committed:**

| Path | Notes |
|------|-------|
| `ASSETS.md` | License + frame map |
| `public/assets/game.png` | ~78 KB — **required** shipped atlas |
| `public/assets/game.json` | ~6 KB — **required** Phaser atlas JSON |
| `public/assets/_source/pack_atlas.py` | Optional rebuild script |
| `public/assets/_source/README.md` | Optional dev notes |
| `agents/package.json` | |
| `agents/package-lock.json` | |
| `agents/tsconfig.json` | |
| `agents/README.md` | |
| `agents/phrases.json` | |
| `agents/run-flavor.ts` | |
| `agents/types.ts` | |
| `agents/providers/gemini.ts` | |
| `agents/providers/groq.ts` | |
| `agents/providers/static.ts` | |

**Not in commit (correct — do not add on merge):**

| Path | Reason |
|------|--------|
| `public/assets/_source/kenney.zip` | ~3.5 MB local download |
| `public/assets/_source/extracted/` | Empty local junk — delete if present |
| `agents/node_modules/` | Gitignored |

> **Note:** Commit `22cdc30` also includes a minor root `package-lock.json` diff (removed `"peer": true` metadata lines). Cosmetic only; safe to keep or revert during merge if Dev A wants a cleaner lockfile history.

---

## 4. Conflict risk — none expected

Dev D touched **no** files in Dev A's critical path.

**Did not edit:**

- `src/App.tsx`, `renderState.ts`, `DevSync.tsx`, `screens/`
- `spacetimedb/src/*`
- `vite.config.ts`, `index.css`, `package.json` (root)
- `.gitignore` (Dev A Commit 1)

**Dev D only added:** `public/`, `agents/`, `ASSETS.md`

| | |
|---|---|
| **Merge strategy** | `git merge dev-d-assets-flavor-prep` |
| **Expected result** | Fast-forward or clean merge, no conflict resolution |

---

## 5. Recommended merge timing (for Dev A)

Per wave plan, Dev D is **mergeable anytime**.

**Suggested order:**

1. Dev A lands Commits 1–5 on `main` (gate)
2. Dev A merges `dev-d-assets-flavor-prep` into `main` (or integration branch)
3. No regenerate required for Dev D assets
4. Optional: flip checklist items for `ASSETS.md`, `public/assets`, `agents` stubs

**Dev D does not need to wait for:**

- `renderState.ts` shape
- Phaser Slice 8 wiring
- `post_taunt` reducer implementation
- `spacetime:generate` (unless Dev A wants full `npm test` pass — unaffected by D)

---

## 6. What other devs get after merge

### Assets (Dev B / Slice 8)

- Atlas ready at `public/assets/game.png` + `game.json`
- Load in `BoardScene` preload:

```ts
this.load.atlas('game', 'assets/game.png', 'assets/game.json');
```

- Frame keys documented in `ASSETS.md` (`tile_street`, `token_red`, `bodega_cat`, etc.)
- No Kenney zip download needed for normal work

### Flavor (Slice 9 — later)

- `agents/` is standalone; not imported by React client
- `npm run dry-run` in `agents/` smoke-tests providers (no STDB)
- Backend wiring (`events` subscription, `post_taunt`) is future work

---

## 7. Verify after merge (Dev A or any teammate)

**Assets on disk:**

```powershell
Test-Path public/assets/game.png   # → True
Test-Path public/assets/game.json  # → True
```

**Flavor worker (no backend):**

```sh
cd agents
npm install
npm run dry-run
```

→ 4 taunts + 1 recap (static without `GROQ_API_KEY`; Groq if key exported)

**Vite serves assets (optional):**

```sh
npm run dev
```

→ `http://localhost:5173/assets/game.png` loads

---

## 8. Dev A merge commands

After gate is on `main`:

```sh
git checkout main
git pull
git merge dev-d-assets-flavor-prep -m "Merge Dev D: assets atlas and flavor stubs"

# spot-check
git log -1 --stat
# Windows: dir public\assets\game.png

git push origin main
```

If using a shared integration branch instead of direct-to-main:

```sh
git checkout integration
git merge dev-d-assets-flavor-prep
```

---

## 9. Checklist flips (Dev A — Commit 5 or post-merge docs pass)

In `docs/checklist.md` (when Dev A updates docs):

- [ ] `ASSETS.md`
- [ ] Texture atlas in `public/assets/`
- [ ] `agents/phrases.json` static fallback
- [ ] `agents/run-flavor.ts` worker (stub)
- [ ] `agents/providers` groq + gemini + static

Slice 9 items remain open until backend + UI wiring:

- [ ] `post_taunt` reducer + `TauntBubble`
- [ ] Full worker STDB subscription

---

## 10. Open items — not Dev D scope (do not block merge)

- Phaser `BoardScene` does not load atlas yet (Dev B / Slice 8)
- `post_taunt` reducer still throws stub (gameplay / Slice 9)
- `agents/run-flavor.ts` `npm start` is stub only (no STDB) — by design
- `bodega_cat` is orange-tinted character stand-in until custom cat art

---

## 11. Reference docs

| Topic | Location |
|-------|----------|
| Atlas frame map + license | `ASSETS.md` |
| Flavor worker usage | `agents/README.md` |
| Rebuild atlas (optional) | `public/assets/_source/README.md` + `pack_atlas.py` |

Dev D branch is ready for Dev A merge. No further Dev D work required for gate.
