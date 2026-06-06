import { table, t } from 'spacetimedb/server';

/**
 * Bodega Blitz table definitions (SpacetimeDB 2.x TypeScript module).
 *
 * Field names are camelCase in TS; the default snake_case conversion policy
 * exposes them as snake_case columns/tables on the wire (e.g. `roomId` ->
 * `room_id`). Clients read them back as camelCase via the generated bindings.
 *
 * Schema source-of-truth: bodega-blitz-cursor-brief.md ("SpacetimeDB schema").
 * Everything is room_id-scoped: one database, all rooms share it, isolation is
 * enforced by `roomId` filtering on every subscription and reducer.
 */

// --- Scaffold round-trip proof (kept until the first gameplay slice) ---------
// Temporary single-row table that DevSync uses to prove end-to-end sync.
// Remove once room/player sync replaces it.
export const syncState = table(
  { name: 'sync_state', public: true },
  {
    id: t.u32().primaryKey(),
    value: t.string(),
    updatedBy: t.string(),
  }
);

// --- Room lifecycle ----------------------------------------------------------
export const rooms = table(
  { name: 'rooms', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    code: t.string().unique(),
    // 'lobby' | 'live' | 'results'
    state: t.string(),
    hostIdentity: t.identity(),
    roundNumber: t.u32(),
    seed: t.u64(),
    startsAtMs: t.i64(),
    endsAtMs: t.i64(),
    createdAtMs: t.i64(),
  }
);

export const players = table(
  { name: 'players', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    identity: t.identity().index('btree'),
    roomId: t.u32().index('btree'),
    name: t.string(),
    // 'player' | 'spectator'
    role: t.string(),
    color: t.string(),
    connected: t.bool(),
    joinedAtMs: t.i64(),
  }
);

export const playerState = table(
  { name: 'player_state', public: true },
  {
    playerId: t.u32().primaryKey(),
    roomId: t.u32().index('btree'),
    x: t.u32(),
    y: t.u32(),
    cash: t.i32(),
    tileIncomeTotal: t.i32(),
    pickupCashTotal: t.i32(),
    speedUntilMs: t.i64(),
    disabledUntilMs: t.i64(),
    pigeonBlocked: t.bool(),
    lastMoveAtMs: t.i64(),
    lastClaimAtMs: t.i64(),
    lastContestAtMs: t.i64(),
  }
);

export const spectatorState = table(
  { name: 'spectator_state', public: true },
  {
    playerId: t.u32().primaryKey(),
    roomId: t.u32().index('btree'),
    energy: t.u32(),
    lastActionAtMs: t.i64(),
  }
);

// --- Board -------------------------------------------------------------------
export const tiles = table(
  { name: 'tiles', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    roomId: t.u32().index('btree'),
    x: t.u32(),
    y: t.u32(),
    // 'street' | 'bodega' | 'alley'
    tileType: t.string(),
    ownerPlayerId: t.option(t.u32()),
    incomeValue: t.i32(),
    contestedBy: t.option(t.u32()),
    contestedUntilMs: t.i64(),
    shieldUntilMs: t.i64(),
    spillUntilMs: t.i64(),
  }
);

export const pickups = table(
  { name: 'pickups', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    roomId: t.u32().index('btree'),
    x: t.u32(),
    y: t.u32(),
    // 'cash' | 'coffee' | 'shield'
    pickupType: t.string(),
    value: t.i32(),
    active: t.bool(),
    spawnedAtMs: t.i64(),
  }
);

// --- Feed / social -----------------------------------------------------------
export const events = table(
  { name: 'events', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u32().index('btree'),
    eventType: t.string(),
    sourcePlayerId: t.option(t.u32()),
    targetPlayerId: t.option(t.u32()),
    targetTileId: t.option(t.u32()),
    message: t.string(),
    createdAtMs: t.i64(),
    expiresAtMs: t.i64(),
  }
);

export const taunts = table(
  { name: 'taunts', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u32().index('btree'),
    // 'cat' | 'announcer'
    speaker: t.string(),
    targetPlayerId: t.option(t.u32()),
    text: t.string(),
    modelLabel: t.string(),
    createdAtMs: t.i64(),
  }
);

export const roundResults = table(
  { name: 'round_results', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u32().index('btree'),
    roundNumber: t.u32(),
    playerId: t.u32(),
    tileScore: t.i32(),
    cashScore: t.i32(),
    ownershipBonus: t.i32(),
    totalScore: t.i32(),
    rank: t.u32(),
  }
);

// --- Tick (PLACEHOLDER — NOT FINAL) ------------------------------------------
// NON-FINAL PLACEHOLDER: the 1s server tick.
//
// This is intentionally a *plain* table, NOT yet wired as a SpacetimeDB
// scheduled table. The 2.x scheduled-reducer syntax needs a dedicated spike
// (see brief "Open items to verify" + Slice 4) before scoring depends on it.
// Until that spike lands, scoring uses the lazy elapsed-time fallback inside
// the action reducers / end_round. When the spike succeeds, this table gains
// `scheduled: () => tickRound` and the scheduledAt column switches to
// `t.scheduleAt()`. Shape below mirrors the intended columns so the contract
// is visible to the team now.
export const roundTick = table(
  { name: 'round_tick', public: true },
  {
    scheduledId: t.u64().primaryKey().autoInc(),
    scheduledAtMs: t.i64(),
    roomId: t.u32().index('btree'),
  }
);
