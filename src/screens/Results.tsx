import type { ScreenProps } from '../App';

/**
 * Results screen — STUB.
 * Will hold: ranked scores, breakdown, recap line, rematch (host).
 */
export function ResultsScreen({ navigate }: ScreenProps) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Screen</p>
        <h1>Results</h1>
        <p className="intro">Placeholder. Ranked scores, breakdown, and rematch land here.</p>
        <button type="button" onClick={() => navigate('dev')}>
          Back to scaffold
        </button>
      </section>
    </main>
  );
}
