# Flavor worker

Standalone Node process for LLM taunts and announcer recaps. It is non-critical:
gameplay must keep working with empty env vars or a stopped worker.

## Provider Chain

| Use | Order |
|-----|-------|
| Taunts | Groq (`llama-3.1-8b-instant`) -> Gemini (`gemini-2.5-flash-lite`) -> `phrases.json` |
| Recaps | Gemini -> Groq -> `phrases.json` templates |

## Env Vars

Set in your shell or root `.env.local`:

```env
VITE_SPACETIMEDB_DB_NAME=bodega-blitz
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3000
GROQ_API_KEY=
GEMINI_API_KEY=
```

## Run

```sh
cd agents
npm install
npm run dry-run    # smoke-test providers; static fallback needs no keys
npm start          # connect to STDB, poll events/results, post taunts
```

## Files

- `run-flavor.ts` - worker entry, live STDB polling, provider routing
- `phrases.json` - static taunt/recap fallback
- `providers/static.ts` - loads phrases.json
- `providers/groq.ts` - Groq OpenAI-compatible provider
- `providers/gemini.ts` - Gemini generateContent provider
- `types.ts` - shared types
