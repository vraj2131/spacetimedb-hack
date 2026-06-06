import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FlavorContext, FlavorProvider, PhrasesFile, RecapResult, TauntResult } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHRASES_PATH = join(__dirname, '..', 'phrases.json');

const MAX_TAUNT_LEN = 120;

function loadPhrases(): PhrasesFile {
  const raw = readFileSync(PHRASES_PATH, 'utf8');
  return JSON.parse(raw) as PhrasesFile;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function truncate(text: string, max = MAX_TAUNT_LEN): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export const staticProvider: FlavorProvider = {
  name: 'static',

  async generateTaunt(context: FlavorContext, _detail?: string): Promise<TauntResult> {
    const phrases = loadPhrases();
    const pool =
      context === 'results'
        ? phrases.generic
        : phrases[context as keyof Omit<PhrasesFile, 'recap_templates'>] ?? phrases.generic;

    return {
      text: truncate(pickRandom(pool)),
      modelLabel: 'static',
    };
  },

  async generateRecap(summary: string): Promise<RecapResult> {
    const phrases = loadPhrases();
    const template = pickRandom(phrases.recap_templates);
    const [winner = 'Someone', score = '?'] = summary.split(':');

    return {
      text: truncate(
        fillTemplate(template, { winner: winner.trim(), score: score.trim() }),
        MAX_TAUNT_LEN,
      ),
      modelLabel: 'static',
    };
  },
};

export { loadPhrases, truncate, pickRandom, fillTemplate };
