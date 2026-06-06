import { useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import type { GameUiActions, JoinViewModel, PlayerRole } from './uiState';

type JoinScreenProps = {
  viewModel: JoinViewModel;
  actions: GameUiActions;
};

export function JoinScreen({ viewModel, actions }: JoinScreenProps) {
  const [nickname, setNickname] = useState(viewModel.defaultName);
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState<PlayerRole>(viewModel.defaultRole);
  const canSubmit = nickname.trim().length > 0 && viewModel.connection.isConnected;
  const connectionTone = viewModel.connection.isConnected ? 'good' : 'danger';

  return (
    <main className="min-h-screen bg-[#f6f2e8] px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Join</p>
              <h1 className="mt-2 text-4xl font-black">Bodega Blitz</h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-700">
                Choose a role, enter a room code if you have one, and move into the lobby shell.
              </p>
            </div>
            <StatusPill label={viewModel.connection.label} tone={connectionTone} />
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Nickname
              </span>
              <input
                value={nickname}
                onChange={event => setNickname(event.target.value)}
                placeholder="Corner-store alias"
                className="rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-teal-700"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Role</span>
              <div className="flex flex-wrap gap-3">
                {(['player', 'spectator'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRole(option)}
                    className={`rounded-md border px-4 py-3 text-sm font-black uppercase tracking-wide ${
                      role === option
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                Room code
              </span>
              <input
                value={roomCode}
                onChange={event => setRoomCode(event.target.value.toUpperCase())}
                placeholder={viewModel.suggestedRoomCode}
                className="rounded-md border border-slate-300 bg-white px-4 py-3 uppercase text-slate-950 outline-none focus:border-teal-700"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => actions.onCreateRoom(nickname.trim(), role)}
              disabled={!canSubmit || viewModel.connection.isSubmitting}
              className="rounded-md bg-teal-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Create room
            </button>
            <button
              type="button"
              onClick={() => actions.onJoinRoom(nickname.trim(), role, roomCode.trim())}
              disabled={!canSubmit || roomCode.trim().length === 0 || viewModel.connection.isSubmitting}
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Join room
            </button>
            <button
              type="button"
              onClick={actions.onReturnToDev}
              className="rounded-md border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-600"
            >
              Dev sync
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-300 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-300">Screen contract</p>
          <h2 className="mt-2 text-2xl font-black">Backend-ready props</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
              <dt className="font-bold text-slate-300">Name</dt>
              <dd className="mt-1 text-white">{nickname || 'pending'}</dd>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
              <dt className="font-bold text-slate-300">Role</dt>
              <dd className="mt-1 text-white">{role}</dd>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
              <dt className="font-bold text-slate-300">Room</dt>
              <dd className="mt-1 text-white">{roomCode || 'create new'}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
