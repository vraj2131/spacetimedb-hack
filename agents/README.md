# Flavor worker (Dev D stub)

Standalone Node process for LLM taunts and announcer recaps. **Non-critical** — game must run with empty env vars.

## Provider chain

| Use | Order |
|-----|-------|
| Taunts | Groq (`llama-3.1-8b-instant`) → Gemini (`gemini-2.5-flash-lite`) → `phrases.json` |
| Recaps | Gemini → Groq → `phrases.json` templates |

## Env vars (optional)

Set in your shell or root `.env.local` (not auto-loaded — export manually):

```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...
```

## Run

```sh
cd agents
npm install
npm run dry-run    # smoke-test providers (no API keys needed for static)
npm start          # stub entry (STDB subscription TODO in Slice 9)
```

## Files

- `run-flavor.ts` — worker entry + provider routing
- `phrases.json` — static taunt/recap fallback
- `providers/static.ts` — loads phrases.json
- `providers/groq.ts` — Groq OpenAI-compatible stub
- `providers/gemini.ts` — Gemini generateContent stub
- `types.ts` — shared types

## Slice 9 TODO

- Subscribe to SpacetimeDB `events` for claim/contest/spectator triggers
- Rate-limit: max one taunt per room per 3 seconds
- Call `post_taunt` reducer with truncated text (≤120 chars)
