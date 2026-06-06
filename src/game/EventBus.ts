import { Events } from 'phaser';
import type { RenderState } from '../renderState';

export type TileClickPayload = {
  readonly x: number;
  readonly y: number;
};

export type GameEventMap = {
  'renderState:update': RenderState;
  'tile:click': TileClickPayload;
};

/** Typed singleton bridge between React and Phaser scenes. */
class TypedEventBus {
  private readonly emitter = new Events.EventEmitter();
  private latestRenderState: RenderState | null = null;

  on<K extends keyof GameEventMap>(
    event: K,
    listener: (payload: GameEventMap[K]) => void,
  ): () => void {
    this.emitter.on(event, listener);
    if (event === 'renderState:update' && this.latestRenderState !== null) {
      listener(this.latestRenderState as GameEventMap[K]);
    }
    return () => {
      this.emitter.off(event, listener);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    if (event === 'renderState:update') {
      this.latestRenderState = payload as RenderState;
    }
    this.emitter.emit(event, payload);
  }
}

export const EventBus = new TypedEventBus();

export const GAME_EVENT_NAMES = ['renderState:update', 'tile:click'] as const;
