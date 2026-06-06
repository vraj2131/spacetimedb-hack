import { useEffect } from 'react';
import type { MoveDirection } from '../screens/uiState';

const KEY_TO_DIRECTION: Record<string, MoveDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

export function directionForMoveKey(key: string): MoveDirection | null {
  return KEY_TO_DIRECTION[key] ?? null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

type UseMatchMoveKeyboardOptions = {
  enabled: boolean;
  onMove: (direction: MoveDirection) => void;
};

export function useMatchMoveKeyboard({ enabled, onMove }: UseMatchMoveKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;

      const direction = directionForMoveKey(event.code);
      if (!direction) return;

      event.preventDefault();
      onMove(direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onMove]);
}
