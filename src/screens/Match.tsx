import { useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { Hud } from '../components/Hud';
import { Scoreboard } from '../components/Scoreboard';
import type { RenderState } from '../renderState';
import type { GameUiActions, MatchViewModel, MoveDirection } from './uiState';

type MatchScreenProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
  renderState: RenderState;
  localPlayerId: number | null;
};

type TileActionMode = 'claim' | 'contest';
type SpectatorTileTarget = 'spill_slick' | 'deli_shield';

const overlayButtonClass =
  'rounded-md border border-yellow-300/40 bg-slate-900/90 px-3 py-2 text-xs font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

const moveButtonClass =
  'rounded-md border border-yellow-300/30 bg-slate-900/80 px-3 py-2 text-xs font-black uppercase tracking-wide text-yellow-100 transition hover:border-yellow-200/70 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

const actionModeButtonClass = (active: boolean) =>
  `rounded-md border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
    active
      ? 'border-yellow-300 bg-yellow-800/80 text-yellow-100'
      : 'border-yellow-300/30 bg-slate-900/80 text-yellow-100 hover:border-yellow-200/70 hover:bg-slate-800'
  }`;

const MOVE_BUTTONS: Array<{ direction: MoveDirection; label: string; className?: string }> = [
  { direction: 'up', label: 'Up', className: 'col-start-2' },
  { direction: 'left', label: 'Left', className: 'col-start-1 row-start-2' },
  { direction: 'down', label: 'Down', className: 'col-start-2 row-start-2' },
  { direction: 'right', label: 'Right', className: 'col-start-3 row-start-2' },
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

export function MatchScreen({
  viewModel,
  actions,
  renderState,
  localPlayerId,
}: MatchScreenProps) {
  const canPlay = !viewModel.isSpectator && viewModel.roomState === 'live';
  const [spectatorTarget, setSpectatorTarget] = useState<SpectatorTileTarget | null>(null);
  const [showBoostTargets, setShowBoostTargets] = useState(false);
  const [tileActionMode, setTileActionMode] = useState<TileActionMode>('claim');

  const localToken = renderState.tokens.find(token => token.playerId === localPlayerId);

  const handleTileClick = (x: number, y: number) => {
    if (viewModel.isSpectator && spectatorTarget) {
      actions.onSpectatorTileClick(spectatorTarget, x, y);
      setSpectatorTarget(null);
      return;
    }
    if (!canPlay) return;
    if (tileActionMode === 'contest') {
      actions.onContestTileAt(x, y);
      return;
    }
    actions.onClaimTileAt(x, y);
  };

  const handleCollect = () => {
    if (!canPlay || !viewModel.canCollectPickup || !localToken) return;
    actions.onCollectPickupAt(localToken.x, localToken.y);
  };

  const actionHint = viewModel.isSpectator
    ? 'Spectator watch mode'
    : tileActionMode === 'contest'
      ? 'Contest mode — click an adjacent enemy tile'
      : 'Claim mode — click an adjacent open tile';

  return (
    <main className="match-screen min-h-screen bg-slate-950 p-3 text-white">
      <GameStage
        cameraMode="overview"
        renderState={renderState}
        localPlayerId={localPlayerId ?? undefined}
        onTileClick={handleTileClick}
      >
        <div className="match-overlay match-overlay--header">
          <div className="match-overlay__panel match-overlay__panel--header">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-yellow-300/90">Match</p>
              <h1 className="text-xl font-black text-white md:text-2xl">{viewModel.roomName}</h1>
            </div>
            <CountdownOverlay label={viewModel.timerLabel} />
          </div>
        </div>

        <div className="match-overlay match-overlay--scoreboard">
          <div className="match-overlay__panel match-overlay__panel--scroll">
            <Scoreboard mode="live" entries={viewModel.liveStandings} />
          </div>
        </div>

        <div className="match-overlay match-overlay--hud">
          <div className="match-overlay__panel match-overlay__panel--scroll">
            <Hud
              timerLabel={viewModel.timerLabel}
              roomCode={viewModel.roomCode}
              phaseLabel={viewModel.phaseLabel}
              role={viewModel.localRole}
              taunt={viewModel.recentTaunt}
              events={viewModel.events}
            />
          </div>
        </div>

        <div className="match-overlay match-overlay--controls">
          <div className="match-overlay__panel match-overlay__panel--controls">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-300/90">Controls</p>
                <h2 className="text-sm font-black text-white md:text-base">{actionHint}</h2>
                {viewModel.actionStatusLabel ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300">{viewModel.actionStatusLabel}</p>
                ) : null}
                {!viewModel.isSpectator ? (
                  <p className="mt-1 text-xs font-semibold text-yellow-100/85">{viewModel.claimHint}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {viewModel.isHost ? (
                  <button
                    type="button"
                    onClick={() => actions.onEndRound(viewModel.roomId)}
                    disabled={viewModel.roomState !== 'live'}
                    className={overlayButtonClass}
                  >
                    End round
                  </button>
                ) : null}
                <button type="button" onClick={() => actions.onBackToLobby()} className={overlayButtonClass}>
                  Lobby
                </button>
                {viewModel.canLeaveRoom ? (
                  <button
                    type="button"
                    onClick={() => actions.onLeaveRoom(viewModel.roomId)}
                    className={overlayButtonClass}
                  >
                    Leave room
                  </button>
                ) : null}
              </div>
            </div>

            {canPlay ? (
              <>
                <div className="mt-2 rounded-md border border-emerald-400/40 bg-emerald-900/30 px-3 py-2 text-center text-xs font-black uppercase text-emerald-100">
                  <p>Cash stash: ${viewModel.localCash}</p>
                  <p className="mt-1 text-[10px] font-semibold normal-case text-emerald-200/90">
                    Tile income ${viewModel.localTileIncome} + pickups ${viewModel.localPickupCash}
                  </p>
                </div>
                {viewModel.localPlayerEffects.stunned && (
                  <div className="mt-2 rounded-md border border-red-400/50 bg-red-900/40 px-3 py-2 text-center text-xs font-black uppercase text-red-200">
                    Stunned!
                  </div>
                )}
                {viewModel.localPlayerEffects.speedBoost && (
                  <div className="mt-2 rounded-md border border-cyan-400/50 bg-cyan-900/40 px-3 py-2 text-center text-xs font-black uppercase text-cyan-200">
                    Speed Boost!
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={actionModeButtonClass(tileActionMode === 'claim')}
                    onClick={() => setTileActionMode('claim')}
                  >
                    Claim
                  </button>
                  <button
                    type="button"
                    className={actionModeButtonClass(tileActionMode === 'contest')}
                    onClick={() => setTileActionMode('contest')}
                  >
                    Contest
                  </button>
                  <button
                    type="button"
                    className={overlayButtonClass}
                    disabled={!viewModel.canCollectPickup}
                    onClick={handleCollect}
                  >
                    Collect
                  </button>
                </div>
                <div className="mt-3 grid max-w-[12rem] grid-cols-3 gap-2">
                  {MOVE_BUTTONS.map(button => (
                    <button
                      key={button.direction}
                      type="button"
                      className={`${moveButtonClass} ${button.className ?? ''}`}
                      onClick={() => actions.onMove(button.direction)}
                      disabled={viewModel.localPlayerEffects.stunned}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {viewModel.controls.map(control => {
                  const eventType = controlToEventType(control.id);
                  const isActive = spectatorTarget === eventType;
                  return (
                    <button
                      key={control.id}
                      type="button"
                      className={`rounded-md border px-3 py-2 text-center text-xs font-black uppercase tracking-wide transition ${
                        !control.enabled
                          ? 'border-slate-600/50 bg-slate-900/50 text-slate-500 cursor-not-allowed'
                          : isActive
                            ? 'border-yellow-300 bg-yellow-800/80 text-yellow-100'
                            : 'border-yellow-300/30 bg-slate-900/80 text-yellow-100 hover:border-yellow-200/70 hover:bg-slate-800'
                      }`}
                      disabled={!control.enabled}
                      onClick={() => {
                        if (!eventType) return;
                        if (eventType === 'coffee_boost') {
                          setSpectatorTarget(null);
                          setShowBoostTargets(prev => !prev);
                          return;
                        }
                        setShowBoostTargets(false);
                        setSpectatorTarget(prev =>
                          prev === eventType ? null : (eventType as SpectatorTileTarget)
                        );
                      }}
                    >
                      {control.label}
                      {isActive ? ' (select tile...)' : ''}
                    </button>
                  );
                })}
                {showBoostTargets
                  ? viewModel.liveStandings.map(entry => (
                      <button
                        key={entry.id}
                        type="button"
                        className="rounded-md border border-cyan-300/40 bg-slate-900/80 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-cyan-100 transition hover:border-cyan-200/70 hover:bg-slate-800"
                        onClick={() => {
                          actions.onSpectatorEvent('coffee_boost', Number(entry.id), undefined);
                          setShowBoostTargets(false);
                        }}
                      >
                        {entry.name}
                      </button>
                    ))
                  : null}
              </div>
            )}
          </div>
        </div>
      </GameStage>
    </main>
  );
}
