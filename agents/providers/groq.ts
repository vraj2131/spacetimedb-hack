import type { FlavorContext, FlavorProvider, RecapResult, TauntResult } from '../types.js';
import { truncate } from './static.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_TAUNT_LEN = 120;

function getApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

async function chat(system: string, user: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.9,
      max_tokens: 60,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`[groq] HTTP ${response.status}: ${await response.text()}`);
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? truncate(text, MAX_TAUNT_LEN) : null;
}

const SYSTEM_TAUNT =
  'You are Bodega Cat, a sarcastic NYC bodega cat announcer. One short taunt line only, under 120 characters, no quotes, no instructions.';

const SYSTEM_RECAP =
  'You are a hype NYC sports announcer for a turf-control game. One recap sentence under 120 characters.';

export const groqProvider: FlavorProvider = {
  name: 'groq',

  async generateTaunt(context: FlavorContext, detail?: string): Promise<TauntResult | null> {
    const text = await chat(
      SYSTEM_TAUNT,
      `Event: ${context}${detail ? `. Detail: ${detail}` : ''}.`,
    );
    if (!text) return null;
    return { text, modelLabel: GROQ_MODEL };
  },

  async generateRecap(summary: string): Promise<RecapResult | null> {
    const text = await chat(SYSTEM_RECAP, `Round summary: ${summary}`);
    if (!text) return null;
    return { text, modelLabel: GROQ_MODEL };
  },
};
