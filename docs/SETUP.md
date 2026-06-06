# Setup Checklist

Use this when onboarding a teammate from a fresh clone.

## Requirements

- Node.js `20 LTS` or `22`
- Git
- SpacetimeDB CLI
- A modern browser
- GitHub access to the repo

## First-Time Setup

```powershell
git clone https://github.com/vraj2131/spacetimedb-hack.git
cd spacetimedb-hack
npm install
cd spacetimedb
npm install
cd ..
Copy-Item .env.example .env.local
spacetime login
```

## Daily Development

Preferred command:

```powershell
spacetime dev
```

If you need to run the frontend separately:

```powershell
npm run dev
```

## Verification

```powershell
npm test
```

Then open the app and confirm:

- the page loads
- the connection status becomes `Connected`
- the shared value updates across two tabs
- the Phaser placeholder shows a version number
