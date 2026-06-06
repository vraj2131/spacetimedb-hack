/** Shared types for the flavor worker (Slice 9). */

export type FlavorContext =
  | 'claim'
  | 'contest'
  | 'pickup'
  | 'spectator'
  | 'results'
  | 'generic';

export type TauntResult = {
  text: string;
  modelLabel: string;
};

export type RecapResult = {
  text: string;
  modelLabel: string;
};

export type FlavorProvider = {
  readonly name: string;
  generateTaunt(context: FlavorContext, detail?: string): Promise<TauntResult | null>;
  generateRecap(summary: string): Promise<RecapResult | null>;
};

export type PhrasesFile = {
  claim: string[];
  contest: string[];
  pickup: string[];
  spectator: string[];
  generic: string[];
  recap_templates: string[];
};
