import { Injectable, Logger } from '@nestjs/common';
import type {
  LobbyPlayer,
  LobbyPublicRoom,
  LobbyRoom,
  LobbyRoomConfig,
} from './lobby.types';

const DEFAULT_MAX_PLAYERS = 8;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

const DEFAULT_CONFIG: LobbyRoomConfig = {
  mode: 'BR',
  roundDurationMs: 60_000,
  difficulty: 'Medium',
  maxRounds: 5,
  playersEliminatedPerRound: 1,
};

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);

  private readonly rooms = new Map<string, LobbyRoom>();

  private readonly socketToRoom = new Map<string, string>();

  createRoom(
    host: Omit<LobbyPlayer, 'isHost'>,
    maxPlayers = DEFAULT_MAX_PLAYERS,
    config: Partial<LobbyRoomConfig> = {},
  ): LobbyRoom {
    const roomId = this.generateRoomCode();
    const room: LobbyRoom = {
      roomId,
      status: 'waiting',
      players: [{ ...host, isHost: true }],
      maxPlayers,
      config: { ...DEFAULT_CONFIG, ...config },
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    this.socketToRoom.set(host.socketId, roomId);
    this.logger.log(`Room ${roomId} created by ${host.username}`);
    return room;
  }

  joinRoom(
    roomId: string,
    player: Omit<LobbyPlayer, 'isHost'>,
  ): { success: boolean; room?: LobbyRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };

    const alreadyIn = room.players.some((p) => p.userId === player.userId);
    if (alreadyIn) return { success: false, error: 'Already in this room' };

    room.players.push({ ...player, isHost: false });
    this.socketToRoom.set(player.socketId, roomId);
    this.logger.log(`${player.username} joined room ${roomId}`);
    return { success: true, room };
  }

  leaveRoom(socketId: string): { room?: LobbyRoom; roomId?: string; wasHost: boolean; roomDeleted: boolean } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return { wasHost: false, roomDeleted: false };

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return { wasHost: false, roomDeleted: false };
    }

    const leaving = room.players.find((p) => p.socketId === socketId);
    const wasHost = leaving?.isHost ?? false;

    room.players = room.players.filter((p) => p.socketId !== socketId);
    this.socketToRoom.delete(socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.logger.log(`Room ${roomId} deleted (empty)`);
      return { roomId, wasHost, roomDeleted: true };
    }

    if (wasHost) {
      room.players[0].isHost = true;
      this.logger.log(`${room.players[0].username} promoted to host in room ${roomId}`);
    }

    return { room, roomId, wasHost, roomDeleted: false };
  }

  startGame(roomId: string, gameId: string): LobbyRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return null;
    room.status = 'in_game';
    room.gameId = gameId;
    this.logger.log(`Room ${roomId} game started: ${gameId}`);
    return room;
  }

  markFinished(roomId: string): LobbyRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.status = 'finished';
    return room;
  }

  getRoomBySocket(socketId: string): LobbyRoom | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomById(roomId: string): LobbyRoom | undefined {
    return this.rooms.get(roomId);
  }

  listWaitingRooms(): LobbyPublicRoom[] {
    return [...this.rooms.values()]
      .filter((r) => r.status === 'waiting')
      .map((r) => this.toPublic(r));
  }

  private generateRoomCode(): string {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET.charAt(
          Math.floor(Math.random() * ROOM_CODE_ALPHABET.length),
        );
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Could not generate a unique room code');
  }

  toPublic(room: LobbyRoom): LobbyPublicRoom {
    return {
      roomId: room.roomId,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      players: room.players.map(({ userId, username, isHost }) => ({ userId, username, isHost })),
      config: room.config,
      gameId: room.gameId,
    };
  }
}