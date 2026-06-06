import type { FlavorContext, FlavorProvider, RecapResult, TauntResult } from '../types.js';
import { truncate } from './static.js';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const MAX_TAUNT_LEN = 120;

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

async function generate(prompt: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 60,
      },
    }),
  });

  if (!response.ok) {
    console.warn(`[gemini] HTTP ${response.status}: ${await response.text()}`);
    return null;
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text ? truncate(text, MAX_TAUNT_LEN) : null;
}

const SYSTEM_TAUNT =
  'You are Bodega Cat, a sarcastic NYC bodega cat. Reply with ONE taunt under 120 characters. No quotes.';

const SYSTEM_RECAP =
  'You are a NYC game announcer. Reply with ONE recap sentence under 120 characters.';

export const geminiProvider: FlavorProvider = {
  name: 'gemini',

  async generateTaunt(context: FlavorContext, detail?: string): Promise<TauntResult | null> {
    const text = await generate(
      `${SYSTEM_TAUNT}\nEvent: ${context}${detail ? `. ${detail}` : ''}.`,
    );
    if (!text) return null;
    return { text, modelLabel: GEMINI_MODEL };
  },

  async generateRecap(summary: string): Promise<RecapResult | null> {
    const text = await generate(`${SYSTEM_RECAP}\nSummary: ${summary}`);
    if (!text) return null;
    return { text, modelLabel: GEMINI_MODEL };
  },
};
