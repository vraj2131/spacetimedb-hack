import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { RenderState } from '../renderState';
import { EventBus } from './EventBus';
import { MOCK_RENDER_STATE } from './mockRenderState';
import { BoardScene, TILE_PX } from './scenes/BoardScene';

/**
 * React <-> Phaser mount point.
 *
 * Constructs a single `Phaser.Game` on mount and destroys it on unmount. React
 * passes {@link RenderState} snapshots through {@link EventBus}; Phaser scenes
 * draw them without importing SpacetimeDB or generated bindings.
 */
export function PhaserGame({
  renderState = MOCK_RENDER_STATE,
}: {
  renderState?: RenderState;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const { width, height } = renderState;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: width * TILE_PX,
      height: height * TILE_PX,
      backgroundColor: '#1d1f24',
      scene: [BoardScene],
    });

    // Prime the bus before the scene boots so create() replays this snapshot.
    EventBus.emit('renderState:update', renderState);

    const offTileClick = EventBus.on('tile:click', ({ x, y }) => {
      console.info('[PhaserGame] tile:click', { x, y });
    });

    return () => {
      offTileClick();
      game.destroy(true);
    };
    // Rebuild the game only when board dimensions change (rare). Per-frame
    // RenderState updates flow through EventBus, not a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderState.width, renderState.height]);

  useEffect(() => {
    EventBus.emit('renderState:update', renderState);
  }, [renderState]);

  return <div ref={containerRef} className="phaser-canvas" />;
}
