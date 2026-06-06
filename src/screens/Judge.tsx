import type { ScreenProps } from '../App';

/**
 * Judge screen — STUB.
 * Will hold: read-only projector view — large board, timer, feed, standings,
 * recent taunt, no controls.
 */
export function JudgeScreen({ navigate }: ScreenProps) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Screen</p>
        <h1>Judge</h1>
        <p className="intro">Placeholder. Read-only projector view lands here.</p>
        <button type="button" onClick={() => navigate('dev')}>
          Back to scaffold
        </button>
      </section>
    </main>
  );
}
