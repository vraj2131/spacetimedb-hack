import type { ScreenProps } from '../App';

/**
 * Match screen — STUB.
 * Will hold: Phaser board canvas, timer, local score, standings, event feed,
 * taunt bubble, role-based controls.
 */
export function MatchScreen({ navigate }: ScreenProps) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Screen</p>
        <h1>Match</h1>
        <p className="intro">Placeholder. Board canvas, HUD, feed, and controls land here.</p>
        <button type="button" onClick={() => navigate('dev')}>
          Back to scaffold
        </button>
      </section>
    </main>
  );
}
