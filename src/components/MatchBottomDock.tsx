import type { GameUiActions, MatchViewModel, MoveDirection } from '../screens/uiState';

type TileActionMode = 'claim' | 'contest';

type MatchBottomDockProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
  canPlay: boolean;
  actionHint: string;
  tileActionMode: TileActionMode;
  onTileActionModeChange: (mode: TileActionMode) => void;
  onCollect: () => void;
  spectatorTarget: string | null;
  onSpectatorTargetChange: (target: string | null) => void;
};

const MOVE_BUTTONS: Array<{ direction: MoveDirection; label: string; className: string }> = [
  { direction: 'up', label: '↑', className: 'match-dpad__btn match-dpad__btn--up' },
  { direction: 'left', label: '←', className: 'match-dpad__btn match-dpad__btn--left' },
  { direction: 'down', label: '↓', className: 'match-dpad__btn match-dpad__btn--down' },
  { direction: 'right', label: '→', className: 'match-dpad__btn match-dpad__btn--right' },
];

function controlToEventType(controlId: string): string | null {
  switch (controlId) {
    case 'boost':
      return 'coffee_boost';
    case 'spill':
      return 'spill_slick';
    case 'shield':
      return 'deli_shield';
    default:
      return null;
  }
}

function dockButtonClass(options: { active?: boolean; disabled?: boolean } = {}): string {
  const classes = ['match-dock-btn'];
  if (options.active) classes.push('match-dock-btn--active');
  if (options.disabled) classes.push('match-dock-btn--disabled');
  return classes.join(' ');
}

export function MatchBottomDock({
  viewModel,
  actions,
  canPlay,
  actionHint,
  tileActionMode,
  onTileActionModeChange,
  onCollect,
  spectatorTarget,
  onSpectatorTargetChange,
}: MatchBottomDockProps) {
  return (
    <footer className="match-bottom-dock match-panel">
      <div className="match-bottom-dock__status">
        <p className="match-panel__label">Controls</p>
        <p className="match-bottom-dock__hint">{actionHint}</p>
        {viewModel.actionStatusLabel ? (
          <p className="match-bottom-dock__error">{viewModel.actionStatusLabel}</p>
        ) : null}
        <div className="match-bottom-dock__meta">
          {!viewModel.isSpectator && viewModel.claimHint ? (
            <span className="match-bottom-dock__meta-item">{viewModel.claimHint}</span>
          ) : null}
          {canPlay && viewModel.localPlayerEffects.stunned ? (
            <span className="match-bottom-dock__chip match-bottom-dock__chip--danger">Stunned</span>
          ) : null}
          {canPlay && viewModel.localPlayerEffects.speedBoost ? (
            <span className="match-bottom-dock__chip match-bottom-dock__chip--boost">Speed boost</span>
          ) : null}
        </div>
      </div>

      {canPlay ? (
        <div className="match-bottom-dock__toolbar">
          <div className="match-bottom-dock__group">
            <p className="match-bottom-dock__group-label">Actions</p>
            <div className="match-bottom-dock__btn-row">
              <button
                type="button"
                className={dockButtonClass({ active: tileActionMode === 'claim' })}
                onClick={() => onTileActionModeChange('claim')}
              >
                Claim
              </button>
              <button
                type="button"
                className={dockButtonClass({ active: tileActionMode === 'contest' })}
                onClick={() => onTileActionModeChange('contest')}
              >
                Contest
              </button>
              <button
                type="button"
                className={dockButtonClass({ disabled: !viewModel.canCollectPickup })}
                disabled={!viewModel.canCollectPickup}
                onClick={onCollect}
              >
                Collect
              </button>
            </div>
          </div>

          <div className="match-bottom-dock__divider" aria-hidden="true" />

          <div className="match-bottom-dock__group">
            <p className="match-bottom-dock__group-label">Move · WASD / arrows</p>
            <div className="match-dpad" role="group" aria-label="Movement">
              {MOVE_BUTTONS.map(button => (
                <button
                  key={button.direction}
                  type="button"
                  className={button.className}
                  aria-label={button.direction}
                  onClick={() => actions.onMove(button.direction)}
                  disabled={viewModel.localPlayerEffects.stunned}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="match-bottom-dock__toolbar">
          <div className="match-bottom-dock__group">
            <p className="match-bottom-dock__group-label">Spectator</p>
            <div className="match-bottom-dock__btn-row">
              {viewModel.controls.map(control => {
                const eventType = controlToEventType(control.id);
                const isActive = spectatorTarget === eventType;
                return (
                  <button
                    key={control.id}
                    type="button"
                    className={dockButtonClass({ active: isActive, disabled: !control.enabled })}
                    disabled={!control.enabled}
                    onClick={() => {
                      if (!eventType) return;
                      onSpectatorTargetChange(spectatorTarget === eventType ? null : eventType);
                    }}
                  >
                    {control.label}
                    {isActive ? ' · tile' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
