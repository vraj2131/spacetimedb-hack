import { useState } from 'react';
import { EventFeed } from '../components/EventFeed';
import { GameStage } from '../components/GameStage';
import { MatchBottomDock } from '../components/MatchBottomDock';
import { MatchTopBar } from '../components/MatchTopBar';
import { Scoreboard } from '../components/Scoreboard';
import { TauntBubble } from '../components/TauntBubble';
import { useMatchMoveKeyboard } from '../hooks/useMatchMoveKeyboard';
import type { RenderState } from '../renderState';
import type { GameUiActions, MatchViewModel } from './uiState';

type MatchScreenProps = {
  viewModel: MatchViewModel;
  actions: GameUiActions;
  renderState: RenderState;
  localPlayerId: number | null;
};

type TileActionMode = 'claim' | 'contest';

export function MatchScreen({
  viewModel,
  actions,
  renderState,
  localPlayerId,
}: MatchScreenProps) {
  const canPlay = !viewModel.isSpectator && viewModel.roomState === 'live';
  const [spectatorTarget, setSpectatorTarget] = useState<string | null>(null);
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
      ? 'Contest mode — click an enemy tile next to your token on the map'
      : 'Claim mode — click an empty tile next to your token on the map';

  const keyboardMoveEnabled =
    canPlay && !viewModel.localPlayerEffects.stunned && viewModel.roomState === 'live';

  useMatchMoveKeyboard({
    enabled: keyboardMoveEnabled,
    onMove: actions.onMove,
  });

  return (
    <main className="match-screen bg-slate-950 text-white">
      <MatchTopBar viewModel={viewModel} actions={actions} />

      <div className="match-body">
        <aside className="match-rail match-rail--left">
          <Scoreboard mode="live" entries={viewModel.liveStandings} variant="compact" />
        </aside>

        <GameStage
          cameraMode={viewModel.isSpectator ? 'overview' : 'follow'}
          renderState={renderState}
          localPlayerId={localPlayerId ?? undefined}
          onTileClick={handleTileClick}
        />

        <aside className="match-rail match-rail--right">
          <TauntBubble taunt={viewModel.recentTaunt} />
          <EventFeed events={viewModel.events} />
        </aside>
      </div>

      <MatchBottomDock
        viewModel={viewModel}
        actions={actions}
        canPlay={canPlay}
        actionHint={actionHint}
        tileActionMode={tileActionMode}
        onTileActionModeChange={setTileActionMode}
        onCollect={handleCollect}
        spectatorTarget={spectatorTarget}
        onSpectatorTargetChange={setSpectatorTarget}
      />
    </main>
  );
}
