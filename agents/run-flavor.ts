import type { FlavorContext, FlavorProvider, RecapResult, TauntResult } from './types.js';
import { geminiProvider } from './providers/gemini.js';
import { groqProvider } from './providers/groq.js';
import { staticProvider } from './providers/static.js';

/** Taunt chain: Groq -> Gemini -> static phrases.json */
const TAUNT_CHAIN: FlavorProvider[] = [groqProvider, geminiProvider, staticProvider];

/** Recap chain: Gemini -> Groq -> static templates */
const RECAP_CHAIN: FlavorProvider[] = [geminiProvider, groqProvider, staticProvider];

export async function generateTaunt(
  context: FlavorContext,
  detail?: string,
): Promise<TauntResult> {
  for (const provider of TAUNT_CHAIN) {
    try {
      const result = await provider.generateTaunt(context, detail);
      if (result) {
        console.log(`[flavor] taunt via ${provider.name}: ${result.text}`);
        return result;
      }
    } catch (err) {
      console.warn(`[flavor] ${provider.name} taunt failed:`, err);
    }
  }

  return staticProvider.generateTaunt(context, detail);
}

export async function generateRecap(summary: string): Promise<RecapResult> {
  for (const provider of RECAP_CHAIN) {
    try {
      const result = await provider.generateRecap(summary);
      if (result) {
        console.log(`[flavor] recap via ${provider.name}: ${result.text}`);
        return result;
      }
    } catch (err) {
      console.warn(`[flavor] ${provider.name} recap failed:`, err);
    }
  }

  return staticProvider.generateRecap(summary);
}

/**
 * Worker entry (stub).
 *
 * TODO (Slice 9): subscribe to SpacetimeDB `events`, rate-limit taunts,
 * call `post_taunt` reducer with generated text.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log('[flavor] Bodega Blitz flavor worker (stub)');
  console.log('[flavor] GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'set' : 'missing');
  console.log('[flavor] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'missing');

  if (!dryRun) {
    console.log('[flavor] Pass --dry-run to smoke-test providers without STDB subscription.');
    console.log('[flavor] Full worker wiring lands in Slice 9.');
    return;
  }

  const contexts: FlavorContext[] = ['claim', 'contest', 'spectator', 'generic'];
  for (const ctx of contexts) {
    const taunt = await generateTaunt(ctx, 'smoke test');
    console.log(`  [${ctx}] ${taunt.text} (${taunt.modelLabel})`);
  }

  const recap = await generateRecap('RedPlayer:42');
  console.log(`  [recap] ${recap.text} (${recap.modelLabel})`);
}

main().catch((err) => {
  console.error('[flavor] fatal:', err);
  process.exit(1);
});
