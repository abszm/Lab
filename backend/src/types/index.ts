export interface Player {
  id: string;
  isReady: boolean;
  score: number;
  isConnected: boolean;
}

export interface RoomState {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  status: "waiting" | "playing" | "closed";
  createdAt: number;
}

export interface GameMove {
  playerId: string;
  action: string;
  timestamp: number;
}

export interface GameState {
  board: unknown;
  players: string[];
  moves: Record<string, string>;
  phase: "waiting" | "resolved";
}

export interface GameResult {
  winner: string | null;
  isDraw: boolean;
  scores: Record<string, number>;
  winGap: number;
  cardOptions?: RewardCardOption[];
}

export interface RewardCardOption {
  id: string;
  cellId: string;
  level: 1 | 2 | 3 | 4;
  displayName: string;
}

export type PenaltyType = "action" | "verbal" | "visual" | "physical";

export interface Penalty {
  id: string;
  level: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  duration: number;
  type: PenaltyType;
}

export interface PenaltyLevel {
  level: 1 | 2 | 3 | 4;
  minGap: number;
  maxGap: number;
  items: Penalty[];
}
