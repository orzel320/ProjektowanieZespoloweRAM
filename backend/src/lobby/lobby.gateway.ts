import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BattleRoyaleService } from '../battle-royale/battle-royale.service';
import { LobbyService } from './lobby.service';
import type { LobbyMode } from './lobby.types';

export const WS_EVENTS = {
  CREATE_ROOM: 'lobby:create_room',
  JOIN_ROOM: 'lobby:join_room',
  LEAVE_ROOM: 'lobby:leave_room',
  START_GAME: 'lobby:start_game',
  LIST_ROOMS: 'lobby:list_rooms',

  ROOM_CREATED: 'lobby:room_created',
  ROOM_UPDATED: 'lobby:room_updated',
  ROOM_DELETED: 'lobby:room_deleted',
  GAME_STARTED: 'lobby:game_started',
  ROOMS_LIST: 'lobby:rooms_list',
  ERROR: 'lobby:error',
} as const;

@WebSocketGateway({
  namespace: '/lobby',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class LobbyGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LobbyGateway.name);

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly brService: BattleRoyaleService,
  ) {}

  afterInit() {
    this.logger.log('LobbyGateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const { room, roomId, roomDeleted } = this.lobbyService.leaveRoom(client.id);
    if (roomDeleted) {
      this.server.emit(WS_EVENTS.ROOM_DELETED, { roomId });
    } else if (room) {
      const publicRoom = this.lobbyService.toPublic(room);
      this.server.to(room.roomId).emit(WS_EVENTS.ROOM_UPDATED, publicRoom);
    }
    this.broadcastRoomsList();
  }

  @SubscribeMessage(WS_EVENTS.LIST_ROOMS)
  handleListRooms() {
    return this.lobbyService.listWaitingRooms();
  }

  @SubscribeMessage(WS_EVENTS.CREATE_ROOM)
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      userId: string;
      username: string;
      maxPlayers?: number;
      mode?: LobbyMode;
      roundDurationMs?: number;
      difficulty?: string;
      topic?: string;
      language?: string;
      maxRounds?: number;
      playersEliminatedPerRound?: number;
    },
  ) {
    if (!body?.userId || !body?.username) {
      return this.emitError(client, 'userId and username are required');
    }

    const config = pickDefined({
      mode: body.mode,
      roundDurationMs: body.roundDurationMs,
      difficulty: body.difficulty,
      topic: body.topic,
      language: body.language,
      maxRounds: body.maxRounds,
      playersEliminatedPerRound: body.playersEliminatedPerRound,
    });

    const room = this.lobbyService.createRoom(
      {
        userId: body.userId,
        username: body.username,
        socketId: client.id,
        joinedAt: new Date(),
      },
      body.maxPlayers,
      config,
    );

    void client.join(room.roomId);
    const publicRoom = this.lobbyService.toPublic(room);

    client.emit(WS_EVENTS.ROOM_CREATED, publicRoom);
    this.broadcastRoomsList();
    return publicRoom;
  }

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; userId: string; username: string },
  ) {
    if (!body?.roomId || !body?.userId || !body?.username) {
      return this.emitError(client, 'roomId, userId and username are required');
    }

    const result = this.lobbyService.joinRoom(body.roomId, {
      userId: body.userId,
      username: body.username,
      socketId: client.id,
      joinedAt: new Date(),
    });

    if (!result.success || !result.room) {
      return this.emitError(client, result.error ?? 'Could not join room');
    }

    void client.join(body.roomId);
    const publicRoom = this.lobbyService.toPublic(result.room);

    this.server.to(body.roomId).emit(WS_EVENTS.ROOM_UPDATED, publicRoom);
    this.broadcastRoomsList();
    return publicRoom;
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const { room, roomId, roomDeleted } = this.lobbyService.leaveRoom(client.id);
    void client.leave(roomId ?? '');

    if (roomDeleted) {
      this.server.emit(WS_EVENTS.ROOM_DELETED, { roomId });
    } else if (room) {
      const publicRoom = this.lobbyService.toPublic(room);
      this.server.to(room.roomId).emit(WS_EVENTS.ROOM_UPDATED, publicRoom);
    }

    this.broadcastRoomsList();
    return { success: true };
  }

  @SubscribeMessage(WS_EVENTS.START_GAME)
  handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    if (!body?.roomId) {
      return this.emitError(client, 'roomId is required');
    }

    const room = this.lobbyService.getRoomById(body.roomId);
    if (!room) return this.emitError(client, 'Room not found');

    const isHost = room.players.find((p) => p.socketId === client.id)?.isHost;
    if (!isHost) return this.emitError(client, 'Only the host can start the game');

    if (room.players.length < 2) {
      return this.emitError(client, 'Need at least 2 players to start');
    }

    this.brService.destroyFinishedSessionByRoom(room.roomId);

    let sessionId: string;
    try {
      const session = this.brService.createSession({
        roomId: room.roomId,
        maxRounds: room.config.maxRounds,
        roundDurationMs: room.config.roundDurationMs,
        playersEliminatedPerRound: room.config.playersEliminatedPerRound,
        topic: room.config.topic,
        difficulty: room.config.difficulty,
        language: room.config.language,
      });
      sessionId = session.sessionId;
    } catch (e: unknown) {
      return this.emitError(client, (e as Error).message);
    }

    const updated = this.lobbyService.startGame(body.roomId, sessionId);
    if (!updated) {
      this.brService.destroySession(sessionId);
      return this.emitError(client, 'Could not start game');
    }

    this.server.to(body.roomId).emit(WS_EVENTS.GAME_STARTED, {
      roomId: body.roomId,
      gameId: sessionId,
      sessionId,
      mode: room.config.mode,
      config: {
        maxRounds: room.config.maxRounds,
        roundDurationMs: room.config.roundDurationMs,
        difficulty: room.config.difficulty,
        topic: room.config.topic,
        language: room.config.language,
      },
    });
  }

  private emitError(client: Socket, message: string) {
    client.emit(WS_EVENTS.ERROR, { message });
  }

  private broadcastRoomsList() {
    this.server.emit(WS_EVENTS.ROOMS_LIST, this.lobbyService.listWaitingRooms());
  }
}

function pickDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}