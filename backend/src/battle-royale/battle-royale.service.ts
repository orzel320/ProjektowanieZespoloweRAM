import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BoardsService } from '../boards/boards.service';
import type { BoardPayload, CategoryPayload } from '../game/game.types';
import type {
  BRLeaderboardEntry,
  BRPlayerState,
  BRPublicPlayerState,
  BRPublicRound,
  BRSession,
  BRSessionConfig,
} from './battle-royale.types';

const DEFAULTS = {
  MAX_ROUNDS: 5,
  ROUND_DURATION_MS: 60_000,   
  COOLDOWN_MS: 5_000,          
  ELIMINATED_PER_ROUND: 1,
  TOPIC: 'General',
  DIFFICULTY: 'Medium',
} as const;

export type BREventEmitter = {
  onRoundStarted: (sessionId: string, state: BRPublicRound) => void;
  onRoundEnded: (
    sessionId: string,
    state: BRPublicRound,
    eliminated: BRLeaderboardEntry[],
  ) => void;
  onGameFinished: (sessionId: string, leaderboard: BRLeaderboardEntry[]) => void;
  onLeaderboardUpdate: (sessionId: string, leaderboard: BRLeaderboardEntry[]) => void;
};

@Injectable()
export class BattleRoyaleService {
  private readonly logger = new Logger(BattleRoyaleService.name);
  private readonly sessions = new Map<string, BRSession>();
  private readonly roomToSession = new Map<string, string>();

  private emitter: BREventEmitter | null = null;

  constructor(private readonly boardsService: BoardsService) {}

  registerEmitter(emitter: BREventEmitter) {
    this.emitter = emitter;
  }

  createSession(config: BRSessionConfig): BRSession {
    if (this.roomToSession.has(config.roomId)) {
      throw new BadRequestException('A session already exists for this room');
    }
    const sessionId = uuidv4();
    const session: BRSession = {
      sessionId,
      roomId: config.roomId,
      maxRounds: config.maxRounds ?? DEFAULTS.MAX_ROUNDS,
      roundDurationMs: config.roundDurationMs ?? DEFAULTS.ROUND_DURATION_MS,
      cooldownMs: config.cooldownMs ?? DEFAULTS.COOLDOWN_MS,
      playersEliminatedPerRound:
        config.playersEliminatedPerRound ?? DEFAULTS.ELIMINATED_PER_ROUND,
      topic: config.topic ?? DEFAULTS.TOPIC,
      difficulty: config.difficulty ?? DEFAULTS.DIFFICULTY,
      status: 'waiting',
      currentRound: 0,
      board: null,
      roundStartedAt: null,
      roundEndsAt: null,
      players: new Map(),
      roundTimer: null,
    };
    this.sessions.set(sessionId, session);
    this.roomToSession.set(config.roomId, sessionId);
    this.logger.log(`BR session ${sessionId} created for room ${config.roomId}`);
    return session;
  }

  joinSession(sessionId: string, userId: string, username: string, socketId: string): void {
    const session = this.getOrThrow(sessionId);
    if (session.status !== 'waiting') {
      throw new BadRequestException('Cannot join a session that has already started');
    }
    session.players.set(userId, {
      userId,
      username,
      socketId,
      score: 0,
      roundScore: 0,
      isEliminated: false,
      eliminatedInRound: null,
      cooldownUntil: null,
      solvedCategoryIndicesThisRound: [],
    });
    this.logger.log(`${username} joined BR session ${sessionId}`);
  }

  removePlayer(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.players.delete(userId);
  }

  getSessionByRoom(roomId: string): BRSession | undefined {
    const sid = this.roomToSession.get(roomId);
    return sid ? this.sessions.get(sid) : undefined;
  }

  getSession(sessionId: string): BRSession | undefined {
    return this.sessions.get(sessionId);
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.roundTimer) clearTimeout(session.roundTimer);
    this.roomToSession.delete(session.roomId);
    this.sessions.delete(sessionId);
    this.logger.log(`BR session ${sessionId} destroyed`);
  }

  destroyFinishedSessionByRoom(roomId: string): void {
    const sid = this.roomToSession.get(roomId);
    if (!sid) return;
    const session = this.sessions.get(sid);
    if (session && session.status === 'finished') {
      this.destroySession(sid);
    }
  }

  async startNextRound(
    sessionId: string,
    topic?: string,
    difficulty?: string,
  ): Promise<BRPublicRound> {
    const session = this.getOrThrow(sessionId);

    if (session.status === 'round_active') {
      throw new BadRequestException('Round is already active');
    }

    const activePlayers = this.activePlayers(session);
    if (activePlayers.length < 2) {
      return this.finishGame(session);
    }

    session.currentRound += 1;

    const rawBoard = await this.boardsService.generate(
      topic ?? session.topic,
      difficulty ?? session.difficulty,
    );
    session.board = this.parseBoard(rawBoard);

    for (const p of session.players.values()) {
      if (!p.isEliminated) {
        p.roundScore = 0;
        p.solvedCategoryIndicesThisRound = [];
        p.cooldownUntil = null;
      }
    }

    const now = new Date();
    session.roundStartedAt = now;
    session.roundEndsAt = new Date(now.getTime() + session.roundDurationMs);
    session.status = 'round_active';

    if (session.roundTimer) clearTimeout(session.roundTimer);
    session.roundTimer = setTimeout(() => {
      void this.endRound(sessionId);
    }, session.roundDurationMs);

    const state = this.toPublicRound(session);
    this.logger.log(`BR session ${sessionId} round ${session.currentRound} started`);
    this.emitter?.onRoundStarted(sessionId, state);
    return state;
  }

  async endRound(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'round_active') return;

    if (session.roundTimer) {
      clearTimeout(session.roundTimer);
      session.roundTimer = null;
    }
    session.status = 'round_end';

    const eliminated = this.eliminatePlayers(session);

    const state = this.toPublicRound(session);
    this.logger.log(
      `BR session ${sessionId} round ${session.currentRound} ended. Eliminated: ${eliminated.map((e) => e.username).join(', ') || 'none'}`,
    );
    this.emitter?.onRoundEnded(sessionId, state, this.toLeaderboard(session));

    const activePlayers = this.activePlayers(session);
    const isLastRound = session.currentRound >= session.maxRounds;

    if (activePlayers.length <= 1 || isLastRound) {
      this.finishGame(session);
    }
  }

  handleGuess(
    sessionId: string,
    userId: string,
    words: string[],
  ): {
    correct: boolean;
    cooldownMs: number;
    categoryName?: string;
    categoryIndex?: number;
    leaderboard: BRLeaderboardEntry[];
    allCategoriesSolved: boolean;
  } {
    const session = this.getOrThrow(sessionId);

    if (session.status !== 'round_active') {
      throw new BadRequestException('No active round');
    }

    const player = session.players.get(userId);
    if (!player) throw new BadRequestException('Player not in session');
    if (player.isEliminated) throw new BadRequestException('Player is eliminated');

    const now = new Date();
    if (player.cooldownUntil && player.cooldownUntil > now) {
      const remaining = player.cooldownUntil.getTime() - now.getTime();
      return {
        correct: false,
        cooldownMs: remaining,
        leaderboard: this.toLeaderboard(session),
        allCategoriesSolved: false,
      };
    }

    if (!Array.isArray(words) || words.length !== 4) {
      throw new BadRequestException('Exactly 4 words required');
    }

    const board = session.board!;
    const normalized = words.map((w) => w.trim().toUpperCase());
    const guessKey = this.multisetKey(normalized);
    const alreadySolved = new Set(player.solvedCategoryIndicesThisRound);

    let matchedIndex: number | null = null;
    for (let i = 0; i < board.categories.length; i++) {
      if (alreadySolved.has(i)) continue;
      const catKey = this.multisetKey(board.categories[i].words.map((w) => w.toUpperCase()));
      if (catKey === guessKey) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex !== null) {
      player.solvedCategoryIndicesThisRound.push(matchedIndex);
      player.roundScore += 1;
      player.score += 1;
      player.cooldownUntil = null;

      const categoryName = board.categories[matchedIndex].name;

      const leaderboard = this.toLeaderboard(session);
      this.emitter?.onLeaderboardUpdate(sessionId, leaderboard);

      const allSolved = this.checkAllCategoriesSolved(session);
      if (allSolved) {
        void this.endRound(sessionId);
      }

      return {
        correct: true,
        cooldownMs: 0,
        categoryName,
        categoryIndex: matchedIndex,
        leaderboard,
        allCategoriesSolved: allSolved,
      };
    } else {
      player.cooldownUntil = new Date(now.getTime() + session.cooldownMs);
      return {
        correct: false,
        cooldownMs: session.cooldownMs,
        leaderboard: this.toLeaderboard(session),
        allCategoriesSolved: false,
      };
    }
  }

  toPublicRound(session: BRSession): BRPublicRound {
    return {
      round: session.currentRound,
      maxRounds: session.maxRounds,
      status: session.status,
      roundEndsAt: session.roundEndsAt?.toISOString() ?? null,
      board: session.board,
      leaderboard: [...session.players.values()]
        .sort((a, b) => {
          if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
          if (b.score !== a.score) return b.score - a.score;
          return b.roundScore - a.roundScore;
        })
        .map(p => this.toPublicPlayerState(p)),
    };
  }

  toLeaderboard(session: BRSession): BRLeaderboardEntry[] {
    const now = new Date();
    const active = [...session.players.values()].sort((a, b) => {
      if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      return b.roundScore - a.roundScore;
    });

    return active.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      username: p.username,
      score: p.score,
      roundScore: p.roundScore,
      isEliminated: p.isEliminated,
    }));
  }

  toPublicPlayerState(p: BRPlayerState): BRPublicPlayerState {
    const now = new Date();
    const cooldownRemainingMs =
      p.cooldownUntil && p.cooldownUntil > now
        ? p.cooldownUntil.getTime() - now.getTime()
        : 0;
    return {
      userId: p.userId,
      username: p.username,
      score: p.score,
      roundScore: p.roundScore,
      isEliminated: p.isEliminated,
      eliminatedInRound: p.eliminatedInRound,
      isInCooldown: cooldownRemainingMs > 0,
      cooldownRemainingMs,
      solvedCategoriesThisRound: p.solvedCategoryIndicesThisRound.length,
    };
  }

  private finishGame(session: BRSession): BRPublicRound {
    if (session.roundTimer) clearTimeout(session.roundTimer);
    session.status = 'finished';
    const leaderboard = this.toLeaderboard(session);
    this.logger.log(`BR session ${session.sessionId} finished`);
    this.emitter?.onGameFinished(session.sessionId, leaderboard);
    return this.toPublicRound(session);
  }

  private eliminatePlayers(session: BRSession): BRPlayerState[] {
    const active = this.activePlayers(session);
    if (active.length <= 1) return [];

    const sorted = [...active].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.roundScore - b.roundScore;
    });

    const count = Math.min(session.playersEliminatedPerRound, sorted.length - 1);
    const toEliminate = sorted.slice(0, count);

    for (const p of toEliminate) {
      p.isEliminated = true;
      p.eliminatedInRound = session.currentRound;
    }

    return toEliminate;
  }

  private checkAllCategoriesSolved(session: BRSession): boolean {
    const totalCategories = session.board?.categories.length ?? 4;
    return this.activePlayers(session).every(
      (p) => p.solvedCategoryIndicesThisRound.length >= totalCategories,
    );
  }

  private activePlayers(session: BRSession): BRPlayerState[] {
    return [...session.players.values()].filter((p) => !p.isEliminated);
  }

  private getOrThrow(sessionId: string): BRSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new BadRequestException('Session not found');
    return session;
  }

  private multisetKey(words: string[]): string {
    return [...words].sort().join('\u0001');
  }

  private parseBoard(raw: unknown): BoardPayload {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid board');
    const o = raw as Record<string, unknown>;
    const categories = o.categories as CategoryPayload[];
    if (!Array.isArray(categories) || categories.length !== 4)
      throw new Error('Board must have exactly 4 categories');
    return {
      topic: String(o.topic ?? ''),
      difficulty: String(o.difficulty ?? ''),
      categories,
    };
  }
}