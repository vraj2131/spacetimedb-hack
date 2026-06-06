import { pathToFileURL } from 'node:url';
import type { FlavorContext, FlavorProvider, RecapResult, TauntResult } from './types.js';

type EventRow = {
  eventType: string;
  message: string;
  roomId?: number;
  sourcePlayerId?: number | null;
  targetPlayerId?: number | null;
};

type ResultRow = {
  rank: number;
  playerId: number;
  totalScore: number;
};

type PlayerRow = {
  id: number;
  name: string;
};

const RATE_LIMIT_MS = 5_000;
const POLL_MS = 1_000;

async function providerChains(): Promise<{
  taunts: FlavorProvider[];
  recaps: FlavorProvider[];
}> {
  const [{ geminiProvider }, { groqProvider }, { staticProvider }] = await Promise.all([
    import('./providers/gemini.js'),
    import('./providers/groq.js'),
    import('./providers/static.js'),
  ]);

  return {
    taunts: [groqProvider, geminiProvider, staticProvider],
    recaps: [geminiProvider, groqProvider, staticProvider],
  };
}

export function eventContext(event: EventRow): FlavorContext {
  switch (event.eventType) {
    case 'claim':
      return 'claim';
    case 'contest':
      return 'contest';
    case 'pickup':
      return 'pickup';
    case 'spill_slick':
    case 'deli_shield':
    case 'coffee_boost':
      return 'spectator';
    default:
      return 'generic';
  }
}

export function eventDetail(event: EventRow): string {
  return event.message.trim();
}

export function resultSummary(rows: readonly ResultRow[], players: readonly PlayerRow[]): string {
  const nameById = new Map(players.map(player => [player.id, player.name]));
  return [...rows]
    .sort((a, b) => a.rank - b.rank)
    .map(row => `${nameById.get(row.playerId) ?? `Player ${row.playerId}`}:${row.totalScore}`)
    .join(', ');
}

export async function generateTaunt(
  context: FlavorContext,
  detail?: string,
): Promise<TauntResult> {
  const { taunts } = await providerChains();
  for (const provider of taunts) {
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

  const { staticProvider } = await import('./providers/static.js');
  return staticProvider.generateTaunt(context, detail);
}

export async function generateRecap(summary: string): Promise<RecapResult> {
  const { recaps } = await providerChains();
  for (const provider of recaps) {
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

  const { staticProvider } = await import('./providers/static.js');
  return staticProvider.generateRecap(summary);
}

async function connect() {
  const { DbConnection } = await import('../src/module_bindings/index.ts');
  const uri = process.env.VITE_SPACETIMEDB_HOST ?? 'ws://127.0.0.1:3000';
  const dbName = process.env.VITE_SPACETIMEDB_DB_NAME ?? 'bodega-blitz';

  return new Promise<any>((resolve, reject) => {
    DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(dbName)
      .withCompression('none')
      .onConnect((conn: any) => resolve(conn))
      .onConnectError((_ctx: unknown, err: unknown) => reject(err))
      .build();
  });
}

async function subscribe(conn: any): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    conn
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError((ctx: any) => reject(ctx.event ?? new Error('subscription error')))
      .subscribe([
        'SELECT * FROM events',
        'SELECT * FROM players',
        'SELECT * FROM rooms',
        'SELECT * FROM round_results',
        'SELECT * FROM taunts',
      ]);
  });
}

export async function runLiveWorker(): Promise<void> {
  const conn = await connect();
  await subscribe(conn);
  console.log('[flavor] live worker connected');

  const seenEvents = new Set<string>();
  const postedRecaps = new Set<string>();
  const lastTauntAtByRoom = new Map<number, number>();

  setInterval(() => {
    void (async () => {
      const now = Date.now();

      for (const event of conn.db.events.iter()) {
        const eventId = event.id.toString();
        if (seenEvents.has(eventId)) {
          continue;
        }
        seenEvents.add(eventId);

        const lastAt = lastTauntAtByRoom.get(event.roomId) ?? 0;
        if (now - lastAt < RATE_LIMIT_MS) {
          continue;
        }

        const taunt = await generateTaunt(eventContext(event), eventDetail(event));
        await conn.reducers.postTaunt({
          roomId: event.roomId,
          speaker: 'cat',
          text: taunt.text,
          modelLabel: taunt.modelLabel,
          targetPlayerId: event.targetPlayerId ?? event.sourcePlayerId ?? undefined,
        });
        lastTauntAtByRoom.set(event.roomId, now);
      }

      const players = [...conn.db.players.iter()] as PlayerRow[];
      for (const room of conn.db.rooms.iter()) {
        if (room.state !== 'results') {
          continue;
        }
        const key = `${room.id}:${room.roundNumber}`;
        if (postedRecaps.has(key)) {
          continue;
        }

        const rows = [...conn.db.round_results.iter()].filter(
          (row: any) => row.roomId === room.id && row.roundNumber === room.roundNumber
        ) as ResultRow[];
        if (rows.length === 0) {
          continue;
        }

        const recap = await generateRecap(resultSummary(rows, players));
        await conn.reducers.postTaunt({
          roomId: room.id,
          speaker: 'announcer',
          text: recap.text,
          modelLabel: recap.modelLabel,
          targetPlayerId: rows[0]?.playerId,
        });
        postedRecaps.add(key);
      }
    })().catch(err => {
      console.warn('[flavor] poll failed:', err);
    });
  }, POLL_MS);

  await new Promise(() => {});
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log('[flavor] Bodega Blitz flavor worker');
  console.log('[flavor] GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'set' : 'missing');
  console.log('[flavor] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'missing');

  if (!dryRun) {
    await runLiveWorker();
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[flavor] fatal:', err);
    process.exit(1);
  });
}
