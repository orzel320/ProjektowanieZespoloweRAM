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
import type { BRLeaderboardEntry, BRPublicRound, BRSessionConfig } from './battle-royale.types';
import { BattleRoyaleService } from './battle-royale.service';

export const BR_EVENTS = {
  CREATE_SESSION: 'br:create_session',
  JOIN_SESSION: 'br:join_session',
  LEAVE_SESSION: 'br:leave_session',
  START_ROUND: 'br:start_round',
  GUESS: 'br:guess',
  GET_STATE: 'br:get_state',

  SESSION_CREATED: 'br:session_created',
  SESSION_STATE: 'br:session_state',
  ROUND_STARTED: 'br:round_started',
  ROUND_ENDED: 'br:round_ended',
  GAME_FINISHED: 'br:game_finished',
  GUESS_RESULT: 'br:guess_result',
  LEADERBOARD: 'br:leaderboard',
  ELIMINATED: 'br:eliminated',
  ERROR: 'br:error',
} as const;

@WebSocketGateway({
  namespace: '/battle-royale',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class BattleRoyaleGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(BattleRoyaleGateway.name);

  private readonly socketToPlayer = new Map<string, { sessionId: string; userId: string }>();

  constructor(private readonly brService: BattleRoyaleService) {}

  afterInit() {
    this.logger.log('BattleRoyaleGateway initialized');

    this.brService.registerEmitter({
      onRoundStarted: (sessionId, state) => {
        this.server.to(sessionId).emit(BR_EVENTS.ROUND_STARTED, state);
      },
      onRoundEnded: (sessionId, state, leaderboard) => {
        this.server.to(sessionId).emit(BR_EVENTS.ROUND_ENDED, { state, leaderboard });

        const eliminated = leaderboard.filter((e) => {
          const session = this.brService.getSession(sessionId);
          const p = session?.players.get(e.userId);
          return p?.eliminatedInRound === state.round;
        });
        for (const e of eliminated) {
          const session = this.brService.getSession(sessionId);
          const socketId = session?.players.get(e.userId)?.socketId;
          if (socketId) {
            this.server.to(socketId).emit(BR_EVENTS.ELIMINATED, {
              round: state.round,
              finalRank: e.rank,
              score: e.score,
            });
          }
        }
      },
      onGameFinished: (sessionId, leaderboard) => {
        this.server.to(sessionId).emit(BR_EVENTS.GAME_FINISHED, { leaderboard });
      },
      onLeaderboardUpdate: (sessionId, leaderboard) => {
        this.server.to(sessionId).emit(BR_EVENTS.LEADERBOARD, leaderboard);
      },
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`BR client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`BR client disconnected: ${client.id}`);
    const info = this.socketToPlayer.get(client.id);
    if (info) {
      this.brService.removePlayer(info.sessionId, info.userId);
      this.socketToPlayer.delete(client.id);
    }
  }

  @SubscribeMessage(BR_EVENTS.CREATE_SESSION)
  handleCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BRSessionConfig & { userId: string },
  ) {
    if (!body?.roomId || !body?.userId) {
      return this.emitError(client, 'roomId and userId are required');
    }
    try {
      const session = this.brService.createSession(body);
      void client.join(session.sessionId);
      this.socketToPlayer.set(client.id, {
        sessionId: session.sessionId,
        userId: body.userId,
      });
      client.emit(BR_EVENTS.SESSION_CREATED, {
        sessionId: session.sessionId,
        roomId: session.roomId,
        config: {
          maxRounds: session.maxRounds,
          roundDurationMs: session.roundDurationMs,
          cooldownMs: session.cooldownMs,
          playersEliminatedPerRound: session.playersEliminatedPerRound,
        },
      });
    } catch (e: unknown) {
      return this.emitError(client, (e as Error).message);
    }
  }

  @SubscribeMessage(BR_EVENTS.JOIN_SESSION)
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; userId: string; username: string },
  ) {
    if (!body?.sessionId || !body?.userId || !body?.username) {
      return this.emitError(client, 'sessionId, userId and username are required');
    }
    try {
      this.brService.joinSession(body.sessionId, body.userId, body.username, client.id);
      void client.join(body.sessionId);
      this.socketToPlayer.set(client.id, {
        sessionId: body.sessionId,
        userId: body.userId,
      });

      const session = this.brService.getSession(body.sessionId);
      if (!session) return this.emitError(client, 'Session not found');

      const state = this.brService.toPublicRound(session);
      this.server.to(body.sessionId).emit(BR_EVENTS.SESSION_STATE, state);
    } catch (e: unknown) {
      return this.emitError(client, (e as Error).message);
    }
  }

  @SubscribeMessage(BR_EVENTS.LEAVE_SESSION)
  handleLeaveSession(@ConnectedSocket() client: Socket) {
    const info = this.socketToPlayer.get(client.id);
    if (info) {
      this.brService.removePlayer(info.sessionId, info.userId);
      void client.leave(info.sessionId);
      this.socketToPlayer.delete(client.id);
    }
    return { success: true };
  }

  @SubscribeMessage(BR_EVENTS.START_ROUND)
  async handleStartRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; topic?: string; difficulty?: string },
  ) {
    if (!body?.sessionId) {
      return this.emitError(client, 'sessionId is required');
    }
    try {
      await this.brService.startNextRound(body.sessionId, body.topic, body.difficulty);
    } catch (e: unknown) {
      return this.emitError(client, (e as Error).message);
    }
  }

  @SubscribeMessage(BR_EVENTS.GUESS)
  handleGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; userId: string; words: string[] },
  ) {
    if (!body?.sessionId || !body?.userId || !Array.isArray(body?.words)) {
      return this.emitError(client, 'sessionId, userId and words are required');
    }
    try {
      const result = this.brService.handleGuess(body.sessionId, body.userId, body.words);

      client.emit(BR_EVENTS.GUESS_RESULT, {
        correct: result.correct,
        cooldownMs: result.cooldownMs,
        categoryName: result.categoryName,
        categoryIndex: result.categoryIndex,
        allCategoriesSolved: result.allCategoriesSolved,
      });

    } catch (e: unknown) {
      return this.emitError(client, (e as Error).message);
    }
  }

  @SubscribeMessage(BR_EVENTS.GET_STATE)
  handleGetState(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    if (!body?.sessionId) {
      return this.emitError(client, 'sessionId is required');
    }
    const session = this.brService.getSession(body.sessionId);
    if (!session) return this.emitError(client, 'Session not found');

    client.emit(BR_EVENTS.SESSION_STATE, this.brService.toPublicRound(session));
  }

  private emitError(client: Socket, message: string) {
    client.emit(BR_EVENTS.ERROR, { message });
    return { error: message };
  }
}