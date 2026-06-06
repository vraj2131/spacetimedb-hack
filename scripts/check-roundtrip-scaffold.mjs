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
  'round_tick',
];

// Reducers still scaffolded as stubs. start_round + move_player are now
// implemented (see IMPLEMENTED_REDUCERS below) so they are intentionally absent.
const STUB_REDUCERS = [
  ['create_room', files.reducersRoom],
  ['join_room', files.reducersRoom],
  ['end_round', files.reducersRoom],
  ['rematch', files.reducersRoom],
  ['reset_demo_room', files.reducersRoom],
  ['tick_round', files.reducersRoom],
  ['register_player', files.reducersPlayer],
  ['claim_tile', files.reducersPlayer],
  ['contest_tile', files.reducersPlayer],
  ['collect_pickup', files.reducersPlayer],
  ['trigger_spectator_event', files.reducersSpectator],
  ['post_taunt', files.reducersFlavor],
];

const SCREENS = ['Join', 'Lobby', 'Match', 'Results', 'Judge'];

const checks = [
  // --- generated bindings are not tracked --------------------------------
  ['module_bindings stays generated (untracked)', read('.gitignore').includes('src/module_bindings/')],

  // --- server: schema split ----------------------------------------------
  ['tables.ts keeps the dev sync_state table', files.tables.includes("name: 'sync_state'")],
  ['tables.ts makes sync_state public', files.tables.includes('public: true')],
  ...GAME_TABLES.map(name => [`tables.ts defines ${name}`, files.tables.includes(`name: '${name}'`)]),
  ['round_tick is a clearly-labeled placeholder', /round_tick/.test(files.tables) && /PLACEHOLDER/i.test(files.tables)],
  ['schema.ts builds the schema() instance', files.schema.includes('schema({') && files.schema.includes('export default spacetimedb')],
  ['schema.ts registers all game tables', GAME_TABLES.every(name => files.schema.includes(name))],

  // --- server: dev round-trip kept ---------------------------------------
  ['reducers.dev.ts keeps set_value', files.reducersDev.includes("'set_value'")],
  ['reducers.dev.ts seeds the single row', files.reducersDev.includes("value: 'first-pipe-online'")],
  ['reducers.dev.ts defines lifecycle hooks', files.reducersDev.includes('clientConnected') && files.reducersDev.includes('clientDisconnected')],

  // --- server: game reducer stubs throw ----------------------------------
  ...STUB_REDUCERS.map(([name, src]) => [
    `reducer ${name} is a stub that throws 'not implemented'`,
    src.includes(`'${name}'`) && src.includes(`not implemented: ${name}`),
  ]),

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
  ['DevSync reads the generated sync_state table', files.devSync.includes('useTable(tables.sync_state)')],
  ['DevSync obtains a typed connection', files.devSync.includes('getConnection() as DbConnection | null')],
  ['DevSync calls the reducer through conn.reducers', files.devSync.includes('conn?.reducers.setValue')],
  ['DevSync does not use the reducer hook', !files.devSync.includes('useReducer')],
  ['DevSync mounts the Phaser canvas', files.devSync.includes('<PhaserGame')],
  ['PhaserGame mounts + tears down a live Phaser.Game', files.phaserGame.includes('new Phaser.Game') && files.phaserGame.includes('game.destroy(true)')],

  // --- client: connection defaults ---------------------------------------
  ['client defaults to local SpacetimeDB', files.main.includes("'ws://127.0.0.1:3000'")],

  // --- styling: Tailwind v4 ----------------------------------------------
  ['Vite registers the Tailwind v4 plugin', files.viteConfig.includes('tailwindcss()')],
  ['main CSS imports Tailwind', files.indexCss.includes('@import "tailwindcss"')],
  ['package installs Tailwind v4', files.packageJson.includes('@tailwindcss/vite')],

  // --- config / docs -----------------------------------------------------
  ['env example points Vite at local host', files.envExample.includes('VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000')],
  ['env example defines database name', files.envExample.includes('VITE_SPACETIMEDB_DB_NAME=bodega-blitz')],
  ['package installs Phaser', files.packageJson.includes('"phaser"')],
  ['README explains local-first scaffold phase', files.readme.includes('local-first dev path')],
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
