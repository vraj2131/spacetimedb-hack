import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import { timestampMs } from './time';

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
  (ctx, { roomId, speaker, text, modelLabel, targetPlayerId }) => {
    const room = ctx.db.rooms.id.find(roomId);
    if (!room) {
      throw new SenderError('post_taunt: room not found');
    }
    if (speaker !== 'cat' && speaker !== 'announcer') {
      throw new SenderError("post_taunt: speaker must be 'cat' or 'announcer'");
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      throw new SenderError('post_taunt: text must not be empty');
    }
    const trimmedModel = modelLabel.trim();
    if (trimmedModel.length === 0) {
      throw new SenderError('post_taunt: modelLabel must not be empty');
    }

    if (targetPlayerId !== undefined && targetPlayerId !== null) {
      const target = ctx.db.players.id.find(targetPlayerId);
      if (!target || target.roomId !== roomId) {
        throw new SenderError('post_taunt: target player not found in room');
      }
    }

    ctx.db.taunts.insert({
      id: 0n,
      roomId,
      speaker,
      targetPlayerId: targetPlayerId ?? undefined,
      text: trimmedText.slice(0, 120),
      modelLabel: trimmedModel.slice(0, 40),
      createdAtMs: timestampMs(ctx),
    });
  }
);
