export type LobbyStatus = 'waiting' | 'in_game' | 'finished';

export type LobbyMode = '1v1' | 'BR';

export interface LobbyRoomConfig {
  mode: LobbyMode;
  roundDurationMs: number;
  difficulty: string;
  topic?: string;
  maxRounds: number;
  playersEliminatedPerRound: number;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  socketId: string;
  isHost: boolean;
  joinedAt: Date;
}

export interface LobbyRoom {
  roomId: string;
  status: LobbyStatus;
  players: LobbyPlayer[];
  maxPlayers: number;
  config: LobbyRoomConfig;
  createdAt: Date;
  gameId?: string;
}

export interface LobbyPublicRoom {
  roomId: string;
  status: LobbyStatus;
  playerCount: number;
  maxPlayers: number;
  players: Pick<LobbyPlayer, 'userId' | 'username' | 'isHost'>[];
  config: LobbyRoomConfig;
  gameId?: string;
}
