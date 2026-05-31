export type LobbyMode = '1v1' | 'BR';

export interface LobbyRoomConfig {
  mode: LobbyMode;
  roundDurationMs: number;
  difficulty: string;
  topic?: string;
  language?: string;
  maxRounds: number;
  playersEliminatedPerRound: number;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: Date;
  isHost: boolean;
}

export interface LobbyRoom {
  roomId: string;
  status: 'waiting' | 'in_game' | 'finished';
  players: LobbyPlayer[];
  maxPlayers: number;
  config: LobbyRoomConfig;
  createdAt: Date;
  gameId?: string;
}

export interface LobbyPublicRoom {
  roomId: string;
  status: 'waiting' | 'in_game' | 'finished';
  players: Omit<LobbyPlayer, 'socketId'>[];
  maxPlayers: number;
  config: LobbyRoomConfig;
  createdAt: Date;
  gameId?: string;
}