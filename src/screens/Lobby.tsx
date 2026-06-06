import type { ScreenProps } from '../App';

/**
 * Lobby screen — STUB.
 * Will hold: room code, players + spectators, host badge, start button (host),
 * waiting state.
 */
export function LobbyScreen({ navigate }: ScreenProps) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Screen</p>
        <h1>Lobby</h1>
        <p className="intro">Placeholder. Roster, host badge, and start button land here.</p>
        <button type="button" onClick={() => navigate('dev')}>
          Back to scaffold
        </button>
      </section>
    </main>
  );
}
