import Phaser from 'phaser';

export function PhaserPlaceholder() {
  return (
    <section className="phaser-panel" aria-label="Phaser scaffold status">
      <div className="phaser-copy">
        <p className="eyebrow">Renderer Stack</p>
        <h2>Phaser is installed and ready</h2>
        <p>
          Phase 0 keeps the UI simple while the team standardizes local setup. Gameplay
          scenes come in the next slice after everyone can run the scaffold.
        </p>
      </div>

      <dl className="phaser-meta">
        <div>
          <dt>Package</dt>
          <dd>`phaser`</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{Phaser.VERSION}</dd>
        </div>
      </dl>
    </section>
  );
}
