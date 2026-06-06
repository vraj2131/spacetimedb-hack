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
  onTileClick,
}: {
  renderState?: RenderState;
  cameraMode?: CameraMode;
  localPlayerId?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  onTileClick?: (x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onTileClickRef = useRef(onTileClick);

  useEffect(() => {
    onTileClickRef.current = onTileClick;
  }, [onTileClick]);

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
      scale: {
        mode: Phaser.Scale.NONE,
      },
    });

    gameRef.current = game;

    const offTileClick = EventBus.on('tile:click', ({ x, y }) => {
      onTileClickRef.current?.(x, y);
    });

    EventBus.emit('renderState:update', renderState);

    return () => {
      offTileClick();
      gameRef.current = null;
      game.destroy(true);
    };
    // Rebuild the game only when board dimensions change (rare). Per-frame
    // RenderState updates flow through EventBus, not a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode, localPlayerId, renderState.width, renderState.height]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.scale.resize(viewportWidth, viewportHeight);
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    EventBus.emit('renderState:update', renderState);
  }, [renderState]);

  return <div ref={containerRef} className="phaser-canvas" />;
}
