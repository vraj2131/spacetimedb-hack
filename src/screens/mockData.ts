export type PlayerRole = 'player' | 'spectator';

export type PlayerSummary = {
  id: string;
  name: string;
  role: PlayerRole;
  color: string;
  score: number;
  status: string;
  isHost?: boolean;
};

export type EventItem = {
  id: string;
  label: string;
  tone: 'neutral' | 'good' | 'danger';
};

export type ResultRow = {
  id: string;
  rank: number;
  name: string;
  territory: number;
  pickups: number;
  bonus: number;
  total: number;
};

export const mockRoom = {
  code: 'BODEGA',
  name: 'Union Square Scramble',
  phaseLabel: 'Round 1',
  timerLabel: '01:12',
  spectators: 7,
  localName: 'Nithi',
  localRole: 'player' as PlayerRole,
  taunt: "Hold the corner or lose the counter.",
};

export const mockPlayers: PlayerSummary[] = [
  {
    id: 'p1',
    name: 'Nithi',
    role: 'player',
    color: '#0f766e',
    score: 42,
    status: 'Holding west block',
    isHost: true,
  },
  {
    id: 'p2',
    name: 'Rishi',
    role: 'player',
    color: '#dc2626',
    score: 38,
    status: 'Contesting center',
  },
  {
    id: 'p3',
    name: 'Asha',
    role: 'player',
    color: '#ca8a04',
    score: 31,
    status: 'Boost ready',
  },
  {
    id: 'p4',
    name: 'Maya',
    role: 'player',
    color: '#2563eb',
    score: 28,
    status: 'Guarding south lane',
  },
];

export const mockEvents: EventItem[] = [
  { id: 'e1', label: 'Coffee boost on Asha', tone: 'good' },
  { id: 'e2', label: 'Rishi contests the center tile', tone: 'danger' },
  { id: 'e3', label: 'Nithi secures the west lane', tone: 'neutral' },
];

export const mockResults: ResultRow[] = [
  { id: 'r1', rank: 1, name: 'Nithi', territory: 41, pickups: 12, bonus: 15, total: 68 },
  { id: 'r2', rank: 2, name: 'Rishi', territory: 34, pickups: 9, bonus: 14, total: 57 },
  { id: 'r3', rank: 3, name: 'Asha', territory: 28, pickups: 8, bonus: 8, total: 44 },
  { id: 'r4', rank: 4, name: 'Maya', territory: 24, pickups: 6, bonus: 9, total: 39 },
];
