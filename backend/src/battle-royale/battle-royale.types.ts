import type { BoardPayload } from '../game/game.types';

export type BRSessionStatus = 'waiting' | 'round_active' | 'round_end' | 'finished';

export interface BRPlayerState {
  userId: string;
  username: string;
  socketId: string;
  score: number;                   
  roundScore: number;              
  isEliminated: boolean;
  eliminatedInRound: number | null;
  cooldownUntil: Date | null;      
  solvedCategoryIndicesThisRound: number[]; 
}

export interface BRSession {
  sessionId: string;
  roomId: string;

  maxRounds: number;
  roundDurationMs: number;
  cooldownMs: number;
  playersEliminatedPerRound: number;

  topic: string;
  difficulty: string;

  status: BRSessionStatus;
  currentRound: number;
  board: BoardPayload | null;
  roundStartedAt: Date | null;
  roundEndsAt: Date | null;

  players: Map<string, BRPlayerState>;
  roundTimer: ReturnType<typeof setTimeout> | null;
}

export interface BRPublicPlayerState {
  userId: string;
  username: string;
  score: number;
  roundScore: number;
  isEliminated: boolean;
  eliminatedInRound: number | null;
  isInCooldown: boolean;
  cooldownRemainingMs: number;
  solvedCategoriesThisRound: number;
}

export interface BRPublicRound {
  round: number;
  maxRounds: number;
  status: BRSessionStatus;
  roundEndsAt: string | null;      
  board: BoardPayload | null;
  leaderboard: BRPublicPlayerState[];
}

export interface BRLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  roundScore: number;
  isEliminated: boolean;
}

export interface BRSessionConfig {
  roomId: string;
  topic?: string;
  difficulty?: string;
  maxRounds?: number;
  roundDurationMs?: number;
  cooldownMs?: number;
  playersEliminatedPerRound?: number;
}