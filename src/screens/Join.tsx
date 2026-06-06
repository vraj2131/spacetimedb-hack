import type { ScreenProps } from '../App';

/**
 * Join screen — STUB.
 * Will hold: nickname, role selector, optional room code. No code ->
 * create_room; code -> join_room.
 */
export function JoinScreen({ navigate }: ScreenProps) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Screen</p>
        <h1>Join</h1>
        <p className="intro">Placeholder. Nickname + role + optional room code land here.</p>
        <button type="button" onClick={() => navigate('dev')}>
          Back to scaffold
        </button>
      </section>
    </main>
  );
}
