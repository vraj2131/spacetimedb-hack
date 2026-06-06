import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { RenderState } from '../renderState';
import { EventBus } from './EventBus';
import { MOCK_RENDER_STATE } from './mockRenderState';
import { BoardScene, type CameraMode } from './scenes/BoardScene';
import { DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from './projection';

/**
 * React <-> Phaser mount point.
 *
 * Constructs a single `Phaser.Game` on mount and destroys it on unmount. React
 * passes {@link RenderState} snapshots through {@link EventBus}; Phaser scenes
 * draw them without importing SpacetimeDB or generated bindings.
 */
export function PhaserGame({
  renderState = MOCK_RENDER_STATE,
  cameraMode = 'follow',
  localPlayerId,
  viewportWidth = DEFAULT_VIEWPORT_WIDTH,
  viewportHeight = DEFAULT_VIEWPORT_HEIGHT,
}: {
  renderState?: RenderState;
  cameraMode?: CameraMode;
  localPlayerId?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: viewportWidth,
      height: viewportHeight,
      backgroundColor: '#142033',
      scene: [new BoardScene({ cameraMode, localPlayerId })],
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
  }, [cameraMode, localPlayerId, renderState.width, renderState.height, viewportHeight, viewportWidth]);

  useEffect(() => {
    EventBus.emit('renderState:update', renderState);
  }, [renderState]);

  return <div ref={containerRef} className="phaser-canvas" />;
}
