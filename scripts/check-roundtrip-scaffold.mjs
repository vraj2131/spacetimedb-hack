import { readFileSync } from 'node:fs';

const files = {
  module: readFileSync('spacetimedb/src/index.ts', 'utf8'),
  app: readFileSync('src/App.tsx', 'utf8'),
  main: readFileSync('src/main.tsx', 'utf8'),
  env: readFileSync('.env.local', 'utf8'),
};

const checks = [
  ['server exposes sync_state table', files.module.includes("name: 'sync_state'")],
  ['server makes sync_state public', files.module.includes('public: true')],
  ['server defines set_value reducer', files.module.includes("'set_value'")],
  ['server initializes the single row', files.module.includes("value: 'first-pipe-online'")],
  ['client uses useSpacetimeDB hook', files.app.includes('useSpacetimeDB()')],
  ['client reads generated sync_state table', files.app.includes('useTable(tables.sync_state)')],
  ['client obtains typed connection from provider state', files.app.includes('getConnection() as DbConnection | null')],
  ['client calls reducers through conn.reducers', files.app.includes('conn?.reducers.setValue')],
  ['client does not use reducer hook', !files.app.includes('useReducer')],
  ['client defaults to Maincloud URL', files.main.includes("'https://maincloud.spacetimedb.com'")],
  ['env points Vite at Maincloud', files.env.includes('VITE_SPACETIMEDB_HOST=https://maincloud.spacetimedb.com')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error('Round-trip scaffold check failed:');
  for (const [name] of failures) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('Round-trip scaffold check passed.');
