import { existsSync, readFileSync } from 'node:fs';

/**
 * Structural scaffold check for the Wave 0 spine.
 *
 * This is a fast, dependency-free guard that the critical-path files keep their
 * agreed shape: the SpacetimeDB schema split, the dev round-trip proof, the
 * frozen React<->Phaser contract, the router, and the Tailwind wiring. It does
 * not run the module — `spacetime build`, `spacetime generate`, `tsc -b`, and a
 * local publish cover that.
 */

const read = path => readFileSync(path, 'utf8');

const files = {
  // server
  tables: read('spacetimedb/src/tables.ts'),
  schema: read('spacetimedb/src/schema.ts'),
  reducersDev: read('spacetimedb/src/reducers.dev.ts'),
  reducersRoom: read('spacetimedb/src/reducers.room.ts'),
  reducersPlayer: read('spacetimedb/src/reducers.player.ts'),
  reducersSpectator: read('spacetimedb/src/reducers.spectator.ts'),
  reducersFlavor: read('spacetimedb/src/reducers.flavor.ts'),
  reducersTick: read('spacetimedb/src/reducers.tick.ts'),
  income: read('spacetimedb/src/income.ts'),
  serverIndex: read('spacetimedb/src/index.ts'),
  map: read('spacetimedb/src/map.ts'),
  // client
  app: read('src/App.tsx'),
  devSync: read('src/components/DevSync.tsx'),
  renderState: read('src/renderState.ts'),
  phaserGame: read('src/game/PhaserGame.tsx'),
  main: read('src/main.tsx'),
  indexCss: read('src/index.css'),
  viteConfig: read('vite.config.ts'),
  // config / docs
  envExample: read('.env.example'),
  packageJson: read('package.json'),
  readme: read('README.md'),
};

const GAME_TABLES = [
  'rooms',
  'players',
  'player_state',
  'spectator_state',
  'tiles',
  'pickups',
  'events',
  'taunts',
  'round_results',
];

const SCHEMA_TABLES = [...GAME_TABLES, 'round_tick'];

const SCREENS = ['Join', 'Lobby', 'Match', 'Results', 'Judge'];

const checks = [
  // --- generated bindings are not tracked --------------------------------
  ['module_bindings stays generated (untracked)', read('.gitignore').includes('src/module_bindings/')],

  // --- server: schema split ----------------------------------------------
  ['tables.ts no longer keeps the dev sync_state table', !files.tables.includes("name: 'sync_state'")],
  ...GAME_TABLES.map(name => [`tables.ts defines ${name}`, files.tables.includes(`name: '${name}'`)]),
  ['reducers.tick.ts defines scheduled round_tick', files.reducersTick.includes("name: 'round_tick'") && files.reducersTick.includes('t.scheduleAt()')],
  ['schema.ts builds the schema() instance', files.schema.includes('schema({') && files.schema.includes('export default spacetimedb')],
  ['schema.ts registers all game tables', SCHEMA_TABLES.every(name => files.schema.includes(name))],

  // --- server: dev lifecycle hooks ---------------------------------------
  ['reducers.dev.ts no longer keeps set_value', !files.reducersDev.includes("'set_value'")],
  ['reducers.dev.ts defines lifecycle hooks', files.reducersDev.includes('clientConnected') && files.reducersDev.includes('clientDisconnected')],

  // --- server: no gameplay reducer stubs remain --------------------------
  [
    'gameplay reducers have no not implemented stubs',
    [
      files.reducersRoom,
      files.reducersPlayer,
      files.reducersSpectator,
      files.reducersTick,
    ].every(src => !src.includes('not implemented')),
  ],

  // --- server: implemented reducers (Wave 1 scrollable-world) ------------
  [
    'start_round is implemented (seeds tiles from the map)',
    files.reducersRoom.includes("name: 'start_round'") &&
      !files.reducersRoom.includes('not implemented: start_round') &&
      files.reducersRoom.includes('ctx.db.tiles.insert'),
  ],
  [
    'move_player is implemented (enforces map bounds)',
    files.reducersPlayer.includes("name: 'move_player'") &&
      !files.reducersPlayer.includes('not implemented: move_player') &&
      files.reducersPlayer.includes('MAP_WIDTH'),
  ],
  [
    'register_player is implemented (inserts a player row)',
    files.reducersPlayer.includes("name: 'register_player'") &&
      !files.reducersPlayer.includes('not implemented: register_player') &&
      files.reducersPlayer.includes('ctx.db.players.insert'),
  ],
  [
    'create_room is implemented (inserts a room with a code)',
    files.reducersRoom.includes("name: 'create_room'") &&
      !files.reducersRoom.includes('not implemented: create_room') &&
      files.reducersRoom.includes('ctx.db.rooms.insert'),
  ],
  [
    'join_room is implemented (looks up the room by code)',
    files.reducersRoom.includes("name: 'join_room'") &&
      !files.reducersRoom.includes('not implemented: join_room') &&
      files.reducersRoom.includes('ctx.db.rooms.code.find'),
  ],
  [
    'claim_tile is implemented (sets tile ownership)',
    files.reducersPlayer.includes("name: 'claim_tile'") &&
      !files.reducersPlayer.includes('not implemented: claim_tile') &&
      files.reducersPlayer.includes('ctx.db.tiles.id.update'),
  ],
  [
    'end_round is implemented (writes ranked round_results)',
    files.reducersRoom.includes("name: 'end_round'") &&
      !files.reducersRoom.includes('not implemented: end_round') &&
      files.reducersRoom.includes('finishRound(ctx, room)'),
  ],
  [
    'rematch is implemented (clears the board back to lobby)',
    files.reducersRoom.includes("name: 'rematch'") &&
      !files.reducersRoom.includes('not implemented: rematch') &&
      files.reducersRoom.includes('ctx.db.tiles.roomId.delete'),
  ],
  [
    'contest_tile is implemented (starts a timed contest)',
    files.reducersPlayer.includes("name: 'contest_tile'") &&
      !files.reducersPlayer.includes('not implemented: contest_tile') &&
      files.reducersPlayer.includes('contest_tile: tile is not adjacent') &&
      files.reducersPlayer.includes('contestedBy: player.id'),
  ],
  [
    'collect_pickup is implemented (deactivates pickup)',
    files.reducersPlayer.includes("name: 'collect_pickup'") &&
      !files.reducersPlayer.includes('not implemented: collect_pickup') &&
      files.reducersPlayer.includes('collect_pickup: not on the pickup'),
  ],
  [
    'tick_round applies passive tile income',
    files.reducersTick.includes("name: 'tick_round'") &&
      files.reducersTick.includes('applyRoomTileIncome') &&
      files.income.includes('MIN_INCOME_TICK_GAP_MS'),
  ],
  [
    'trigger_spectator_event is implemented (deducts energy)',
    files.reducersSpectator.includes("name: 'trigger_spectator_event'") &&
      !files.reducersSpectator.includes('not implemented: trigger_spectator_event') &&
      files.reducersSpectator.includes('ENERGY_COST'),
  ],
  [
    'tick_round is implemented as a scheduled reducer',
    files.reducersTick.includes("name: 'tick_round'") &&
      !files.reducersTick.includes('not implemented: tick_round') &&
      files.reducersTick.includes('ctx.senderAuth.isInternal') &&
      files.reducersTick.includes('resolveExpiredContests') &&
      files.reducersTick.includes('applyRoomTileIncome'),
  ],
  [
    'reset_demo_room is implemented (host hard-deletes room data)',
    files.reducersRoom.includes("name: 'reset_demo_room'") &&
      !files.reducersRoom.includes('not implemented: reset_demo_room') &&
      files.reducersRoom.includes('deleteRoomScopedRows(ctx, room.id)') &&
      files.reducersRoom.includes('rehomeRoomPlayers(ctx, room.id)'),
  ],
  [
    'post_taunt is implemented (inserts taunts)',
    files.reducersFlavor.includes("name: 'post_taunt'") &&
      !files.reducersFlavor.includes('not implemented: post_taunt') &&
      files.reducersFlavor.includes('ctx.db.taunts.insert'),
  ],

  // --- server: barrel + map ----------------------------------------------
  ['index.ts default-exports the schema', files.serverIndex.includes('export default spacetimedb')],
  ['index.ts re-exports the dev + game reducers', files.serverIndex.includes('./reducers.dev') && files.serverIndex.includes('./reducers.room')],
  ['map.ts declares the 28x20 map dimensions', files.map.includes('MAP_WIDTH = 28') && files.map.includes('MAP_HEIGHT = 20')],

  // --- client: frozen render contract ------------------------------------
  ['renderState.ts exports the RenderState contract', files.renderState.includes('export interface RenderState')],
  ['renderState.ts is readonly (frozen firewall)', files.renderState.includes('readonly tiles') && files.renderState.includes('EMPTY_RENDER_STATE')],
  ['Phaser layer does not import module_bindings', !files.phaserGame.includes('module_bindings')],

  // --- client: router + dev round-trip -----------------------------------
  ['App.tsx is a dumb router over a Screen union', files.app.includes('export type Screen') && files.app.includes('switch (screen)')],
  ...SCREENS.map(name => [`screen ${name} stub exists`, existsSync(`src/screens/${name}.tsx`)]),
  ['DevSync holds the round-trip (useSpacetimeDB)', files.devSync.includes('useSpacetimeDB()')],
  ['DevSync reads subscribed game tables', files.devSync.includes('useTable(tables.rooms)') && files.devSync.includes('useTable(tables.players)')],
  ['DevSync calls room reducers through conn.reducers', files.devSync.includes('conn.reducers.registerPlayer') && files.devSync.includes('conn.reducers.createRoom')],
  ['DevSync does not use the reducer hook', !files.devSync.includes('useReducer')],
  ['DevSync mounts the Phaser canvas', files.devSync.includes('<PhaserGame')],
  ['PhaserGame mounts + tears down a live Phaser.Game', files.phaserGame.includes('new Phaser.Game') && files.phaserGame.includes('game.destroy(true)')],

  // --- client: connection defaults ---------------------------------------
  ['client defaults to Maincloud SpacetimeDB', files.main.includes("'https://maincloud.spacetimedb.com'")],

  // --- styling: Tailwind v4 ----------------------------------------------
  ['Vite registers the Tailwind v4 plugin', files.viteConfig.includes('tailwindcss()')],
  ['main CSS imports Tailwind', files.indexCss.includes('@import "tailwindcss"')],
  ['package installs Tailwind v4', files.packageJson.includes('@tailwindcss/vite')],

  // --- config / docs -----------------------------------------------------
  ['env example points Vite at Maincloud host', files.envExample.includes('VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com')],
  ['env example defines database name', files.envExample.includes('VITE_SPACETIMEDB_DB_NAME=bodega-blitz')],
  ['package installs Phaser', files.packageJson.includes('"phaser"')],
  ['README explains Maincloud-default app targeting', files.readme.includes('Maincloud-default app target')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error('Round-trip scaffold check failed:');
  for (const [name] of failures) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log(`Round-trip scaffold check passed (${checks.length} checks).`);
