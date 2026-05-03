export type LobbyStatus = 'waiting' | 'in_game' | 'finished';

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
  createdAt: Date;
  gameId?: string;
}

export interface LobbyPublicRoom {
  roomId: string;
  status: LobbyStatus;
  playerCount: number;
  maxPlayers: number;
  players: Pick<LobbyPlayer, 'userId' | 'username' | 'isHost'>[];
  gameId?: string;
}