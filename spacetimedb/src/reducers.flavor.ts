import { t } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * Flavor (LLM taunt/recap) reducers — STUB.
 *
 * Signature is the real contract; body throws until the flavor slice
 * implements it. The flavor worker (and static fallback) post through this.
 * See bodega-blitz-cursor-brief.md "LLM flavor" + "Reducers".
 */

// post_taunt(room_id, speaker, text, model_label, target_player_id?)
//   -> insert taunt; truncate text to 120 chars; accepts static + worker posts.
export const postTaunt = spacetimedb.reducer(
  { name: 'post_taunt' },
  {
    roomId: t.u32(),
    speaker: t.string(),
    text: t.string(),
    modelLabel: t.string(),
    targetPlayerId: t.option(t.u32()),
  },
  _ctx => {
    throw new Error('not implemented: post_taunt');
  }
);
