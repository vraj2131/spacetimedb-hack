import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PhaserGame } from '../game/PhaserGame';
import type { CameraMode } from '../game/scenes/BoardScene';
import type { RenderState } from '../renderState';

export type GameStageProps = {
  children?: ReactNode;
  renderState?: RenderState;
  cameraMode?: CameraMode;
  localPlayerId?: number;
  onTileClick?: (x: number, y: number) => void;
};

type StageSize = {
  width: number;
  height: number;
};

export function GameStage({
  children,
  renderState,
  cameraMode,
  localPlayerId,
  onTileClick,
}: GameStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<StageSize | null>(null);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const updateSize = () => {
      const { width, height } = node.getBoundingClientRect();
      const w = Math.max(Math.floor(width), 320);
      const h = Math.max(Math.floor(height), 240);
      setSize(prev => (prev?.width === w && prev?.height === h ? prev : { width: w, height: h }));
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="game-stage">
      <div ref={stageRef} className="game-stage__viewport">
        {size ? (
          <>
            <PhaserGame
              renderState={renderState}
              cameraMode={cameraMode}
              localPlayerId={localPlayerId}
              onTileClick={onTileClick}
              viewportWidth={size.width}
              viewportHeight={size.height}
            />
            {children ? <div className="game-stage__overlay">{children}</div> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
