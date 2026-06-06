import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { EMPTY_RENDER_STATE, type RenderState } from '../renderState';

const TILE_PX = 32;

/**
 * React <-> Phaser mount point.
 *
 * Constructs a single `Phaser.Game` on mount and destroys it on unmount. This
 * is the boundary: React reads SpacetimeDB and passes a {@link RenderState}
 * snapshot in; Phaser draws it. Right now the scene just draws the board grid
 * from the snapshot's dimensions (colored rectangles, zero art) so sync is
 * provable before sprites exist. The real BoardScene (tiles/tokens/pickups +
 * an EventBus for clicks) replaces the placeholder scene in a later slice.
 */
export function PhaserGame({
  renderState = EMPTY_RENDER_STATE,
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
      scene: {
        create(this: Phaser.Scene) {
          const g = this.add.graphics();
          g.lineStyle(1, 0x3a3f4a, 1);
          for (let x = 0; x <= width; x++) {
            g.lineBetween(x * TILE_PX, 0, x * TILE_PX, height * TILE_PX);
          }
          for (let y = 0; y <= height; y++) {
            g.lineBetween(0, y * TILE_PX, width * TILE_PX, y * TILE_PX);
          }
          this.add
            .text(8, 8, 'BOARD READY', {
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#9fe3bd',
            })
            .setDepth(1);
        },
      },
    });

    return () => {
      game.destroy(true);
    };
    // Rebuild the game only when board dimensions change (rare). Per-frame
    // RenderState updates will flow through an EventBus, not a remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderState.width, renderState.height]);

  return <div ref={containerRef} className="phaser-canvas" />;
}
