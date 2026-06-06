# Setup Checklist

Use this when onboarding a teammate from a fresh clone.

## Requirements

- Node.js `20 LTS` or `22`
- Git
- SpacetimeDB CLI
- A modern browser
- GitHub access to the repo

## First-Time Setup

```sh
git clone https://github.com/vraj2131/spacetimedb-hack.git
cd spacetimedb-hack
curl -sSf https://install.spacetimedb.com | sh
npm install
cd spacetimedb
npm install
cd ..
cp .env.example .env.local
spacetime login
npm run spacetime:generate
```

Bindings under `src/module_bindings/` are generated locally and not committed. Run `npm run spacetime:generate` after every pull that changes `spacetimedb/`.

## Daily Development

Preferred command:

```sh
spacetime dev
```

If you need to run the frontend separately:

```sh
npm run dev
```

## Verification

```sh
npm test
```

Then open the app and confirm:

- the page loads
- the connection status becomes `Connected`
- the shared value updates across two tabs
- the Phaser board canvas renders the isometric 28×20 board beside the sync proof
