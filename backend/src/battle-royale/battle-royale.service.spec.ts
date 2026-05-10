import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from '../boards/boards.service';
import { BattleRoyaleService } from './battle-royale.service';
import type { BRSession } from './battle-royale.types';

function makeBoard() {
  return {
    topic: 'Test',
    difficulty: 'easy',
    categories: [
      { name: 'Cats',  words: ['LION',  'TIGER',  'PUMA',   'CHEETAH'], logic: '' },
      { name: 'Dogs',  words: ['HUSKY', 'POODLE', 'BOXER',  'BEAGLE'],  logic: '' },
      { name: 'Birds', words: ['EAGLE', 'HAWK',   'OWL',    'FALCON'],  logic: '' },
      { name: 'Fish',  words: ['TROUT', 'SALMON', 'BASS',   'CARP'],    logic: '' },
    ],
  };
}

const mockBoardsService = { generate: jest.fn() };

function makeEmitter() {
  return {
    onRoundStarted:   jest.fn(),
    onRoundEnded:     jest.fn(),
    onGameFinished:   jest.fn(),
    onLeaderboardUpdate: jest.fn(),
  };
}

describe('BattleRoyaleService', () => {
  let service: BattleRoyaleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBoardsService.generate.mockResolvedValue(makeBoard());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleRoyaleService,
        { provide: BoardsService, useValue: mockBoardsService },
      ],
    }).compile();

    service = module.get<BattleRoyaleService>(BattleRoyaleService);
  });

  describe('createSession', () => {
    it('should create a session with default config', () => {
      const session = service.createSession({ roomId: 'room-1' });

      expect(session.sessionId).toBeDefined();
      expect(session.roomId).toBe('room-1');
      expect(session.status).toBe('waiting');
      expect(session.currentRound).toBe(0);
      expect(session.maxRounds).toBe(5);
      expect(session.roundDurationMs).toBe(60_000);
      expect(session.cooldownMs).toBe(5_000);
      expect(session.playersEliminatedPerRound).toBe(1);
    });

    it('should respect custom config', () => {
      const session = service.createSession({
        roomId: 'room-2',
        maxRounds: 3,
        roundDurationMs: 30_000,
        cooldownMs: 3_000,
        playersEliminatedPerRound: 2,
      });

      expect(session.maxRounds).toBe(3);
      expect(session.roundDurationMs).toBe(30_000);
      expect(session.cooldownMs).toBe(3_000);
      expect(session.playersEliminatedPerRound).toBe(2);
    });

    it('should throw if a session already exists for the room', () => {
      service.createSession({ roomId: 'room-dup' });
      expect(() => service.createSession({ roomId: 'room-dup' })).toThrow(BadRequestException);
    });

    it('should be retrievable by roomId', () => {
      const created = service.createSession({ roomId: 'room-get' });
      const found = service.getSessionByRoom('room-get');
      expect(found?.sessionId).toBe(created.sessionId);
    });
  });

  describe('joinSession', () => {
    it('should add a player to the session', () => {
      const session = service.createSession({ roomId: 'r1' });
      service.joinSession(session.sessionId, 'u1', 'Alice', 'sock-1');

      expect(session.players.size).toBe(1);
      const p = session.players.get('u1')!;
      expect(p.username).toBe('Alice');
      expect(p.score).toBe(0);
      expect(p.isEliminated).toBe(false);
    });

    it('should throw when joining a session that has started', async () => {
      const session = service.createSession({ roomId: 'r2' });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');

      await service.startNextRound(session.sessionId);

      expect(() =>
        service.joinSession(session.sessionId, 'u3', 'Carol', 's3'),
      ).toThrow(BadRequestException);
    });

    it('removePlayer should silently handle unknown session', () => {
      expect(() => service.removePlayer('nonexistent', 'u1')).not.toThrow();
    });

    it('removePlayer should remove the player from the session', () => {
      const session = service.createSession({ roomId: 'r3' });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.removePlayer(session.sessionId, 'u1');
      expect(session.players.size).toBe(0);
    });
  });

  describe('startNextRound', () => {
    async function setupSession(playerCount = 3) {
      const session = service.createSession({ roomId: `r-${Math.random()}` });
      for (let i = 0; i < playerCount; i++) {
        service.joinSession(session.sessionId, `u${i}`, `Player${i}`, `s${i}`);
      }
      return session;
    }

    it('should increment round and activate status', async () => {
      const session = await setupSession();
      await service.startNextRound(session.sessionId);

      expect(session.currentRound).toBe(1);
      expect(session.status).toBe('round_active');
      expect(session.board).not.toBeNull();
      expect(session.roundEndsAt).not.toBeNull();
    });

    it('should call boardsService.generate', async () => {
      const session = await setupSession();
      await service.startNextRound(session.sessionId, 'Animals', 'hard');

      expect(mockBoardsService.generate).toHaveBeenCalledWith('Animals', 'hard');
    });

    it('should reset per-round scores for all active players', async () => {
      const session = await setupSession(2);
      session.players.get('u0')!.roundScore = 3;
      session.players.get('u1')!.roundScore = 2;

      await service.startNextRound(session.sessionId);

      expect(session.players.get('u0')!.roundScore).toBe(0);
      expect(session.players.get('u1')!.roundScore).toBe(0);
    });

    it('should finish game immediately when fewer than 2 active players', async () => {
      const session = service.createSession({ roomId: `r-solo-${Math.random()}` });
      service.joinSession(session.sessionId, 'u1', 'Solo', 's1');

      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      await service.startNextRound(session.sessionId);

      expect(session.status).toBe('finished');
      expect(emitter.onGameFinished).toHaveBeenCalled();
    });

    it('should throw when round is already active', async () => {
      const session = await setupSession();
      await service.startNextRound(session.sessionId);

      await expect(service.startNextRound(session.sessionId)).rejects.toThrow(BadRequestException);
    });

    it('should call onRoundStarted emitter callback', async () => {
      const session = await setupSession(2);
      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      await service.startNextRound(session.sessionId);

      expect(emitter.onRoundStarted).toHaveBeenCalledWith(
        session.sessionId,
        expect.objectContaining({ round: 1, status: 'round_active' }),
      );
    });
  });

  describe('handleGuess', () => {
    let session: BRSession;

    beforeEach(async () => {
      session = service.createSession({ roomId: `r-guess-${Math.random()}`, cooldownMs: 5_000 });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      await service.startNextRound(session.sessionId);
    });

    afterEach(() => {
      if (session.roundTimer) clearTimeout(session.roundTimer);
    });

    it('should return correct=true and +1 score for a right guess', () => {
      const result = service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);

      expect(result.correct).toBe(true);
      expect(result.cooldownMs).toBe(0);
      expect(result.categoryName).toBe('Cats');
      expect(session.players.get('u1')!.score).toBe(1);
      expect(session.players.get('u1')!.roundScore).toBe(1);
    });

    it('should be case-insensitive and trim words', () => {
      const result = service.handleGuess(session.sessionId, 'u1', [' lion ', 'TIGER', 'Puma', 'cheetah']);
      expect(result.correct).toBe(true);
    });

    it('should return correct=false and apply cooldown for a wrong guess', () => {
      const result = service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'HUSKY']);

      expect(result.correct).toBe(false);
      expect(result.cooldownMs).toBe(5_000);
      expect(session.players.get('u1')!.cooldownUntil).not.toBeNull();
      expect(session.players.get('u1')!.score).toBe(0);
    });

    it('should block guesses during cooldown and return remaining time', () => {
      service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'HUSKY']);

      const result = service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);

      expect(result.correct).toBe(false);
      expect(result.cooldownMs).toBeGreaterThan(0);
      expect(result.cooldownMs).toBeLessThanOrEqual(5_000);
    });

    it('should not allow guessing an already-solved category', () => {
      service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);
      const result = service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);
      expect(result.correct).toBe(false);
    });

    it('should throw BadRequestException for wrong number of words', () => {
      expect(() => service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA'])).toThrow(
        BadRequestException,
      );
    });

    it('should throw when session does not exist', () => {
      expect(() => service.handleGuess('nonexistent', 'u1', ['A', 'B', 'C', 'D'])).toThrow(
        BadRequestException,
      );
    });

    it('should throw when round is not active', async () => {
      if (session.roundTimer) clearTimeout(session.roundTimer);
      session.status = 'round_end';

      expect(() => service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH'])).toThrow(
        BadRequestException,
      );
    });

    it('should broadcast leaderboard update on correct guess', () => {
      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);

      expect(emitter.onLeaderboardUpdate).toHaveBeenCalledWith(
        session.sessionId,
        expect.arrayContaining([expect.objectContaining({ userId: 'u1', score: 1 })]),
      );
    });
  });

  describe('endRound and elimination', () => {
    it('should eliminate the lowest-scoring player each round', async () => {
      const session = service.createSession({ roomId: `r-elim-${Math.random()}`, playersEliminatedPerRound: 1 });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      service.joinSession(session.sessionId, 'u3', 'Carol', 's3');
      await service.startNextRound(session.sessionId);

      service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);
      service.handleGuess(session.sessionId, 'u1', ['HUSKY', 'POODLE', 'BOXER', 'BEAGLE']);
      service.handleGuess(session.sessionId, 'u2', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);

      if (session.roundTimer) clearTimeout(session.roundTimer);
      await service.endRound(session.sessionId);

      expect(session.players.get('u3')!.isEliminated).toBe(true);
      expect(session.players.get('u1')!.isEliminated).toBe(false);
      expect(session.players.get('u2')!.isEliminated).toBe(false);
    });

    it('should finish game when only 1 player remains after elimination', async () => {
      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      const session = service.createSession({ roomId: `r-finish-${Math.random()}`, playersEliminatedPerRound: 1 });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      await service.startNextRound(session.sessionId);

      if (session.roundTimer) clearTimeout(session.roundTimer);
      await service.endRound(session.sessionId);

      expect(session.status).toBe('finished');
      expect(emitter.onGameFinished).toHaveBeenCalled();
    });

    it('should finish game when maxRounds is reached', async () => {
      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      const session = service.createSession({ roomId: `r-maxr-${Math.random()}`, maxRounds: 1, playersEliminatedPerRound: 0 });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      await service.startNextRound(session.sessionId);

      if (session.roundTimer) clearTimeout(session.roundTimer);
      await service.endRound(session.sessionId);

      expect(session.status).toBe('finished');
      expect(emitter.onGameFinished).toHaveBeenCalledWith(
        session.sessionId,
        expect.any(Array),
      );
    });

    it('should call onRoundEnded emitter with leaderboard', async () => {
      const emitter = makeEmitter();
      service.registerEmitter(emitter);

      const session = service.createSession({ roomId: `r-re-${Math.random()}` });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      service.joinSession(session.sessionId, 'u3', 'Carol', 's3');
      await service.startNextRound(session.sessionId);

      if (session.roundTimer) clearTimeout(session.roundTimer);
      await service.endRound(session.sessionId);

      expect(emitter.onRoundEnded).toHaveBeenCalledWith(
        session.sessionId,
        expect.objectContaining({ status: 'round_end' }),
        expect.arrayContaining([expect.objectContaining({ userId: 'u1' })]),
      );
    });

    it('should do nothing when endRound called on inactive session', async () => {
      const session = service.createSession({ roomId: `r-noop-${Math.random()}` });
      await expect(service.endRound(session.sessionId)).resolves.toBeUndefined();
    });
  });

  describe('toLeaderboard', () => {
    it('should rank active players above eliminated ones', async () => {
      const session = service.createSession({ roomId: `r-lb-${Math.random()}`, playersEliminatedPerRound: 1 });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      service.joinSession(session.sessionId, 'u3', 'Carol', 's3');
      await service.startNextRound(session.sessionId);

      service.handleGuess(session.sessionId, 'u1', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);
      service.handleGuess(session.sessionId, 'u2', ['HUSKY', 'POODLE', 'BOXER', 'BEAGLE']);

      if (session.roundTimer) clearTimeout(session.roundTimer);
      await service.endRound(session.sessionId);

      const leaderboard = service.toLeaderboard(session);

      const carolEntry = leaderboard.find((e) => e.userId === 'u3')!;
      expect(carolEntry.isEliminated).toBe(true);
      expect(carolEntry.rank).toBe(3);
    });

    it('should sort tied players by roundScore as tiebreaker', async () => {
      const session = service.createSession({ roomId: `r-tie-${Math.random()}` });
      service.joinSession(session.sessionId, 'u1', 'Alice', 's1');
      service.joinSession(session.sessionId, 'u2', 'Bob', 's2');
      await service.startNextRound(session.sessionId);

      service.handleGuess(session.sessionId, 'u2', ['LION', 'TIGER', 'PUMA', 'CHEETAH']);

      const leaderboard = service.toLeaderboard(session);
      expect(leaderboard[0].userId).toBe('u2');

      if (session.roundTimer) clearTimeout(session.roundTimer);
    });
  });

  describe('destroySession', () => {
    it('should remove the session completely', () => {
      const session = service.createSession({ roomId: 'r-destroy' });
      service.destroySession(session.sessionId);

      expect(service.getSession(session.sessionId)).toBeUndefined();
      expect(service.getSessionByRoom('r-destroy')).toBeUndefined();
    });

    it('should silently handle an unknown sessionId', () => {
      expect(() => service.destroySession('nonexistent')).not.toThrow();
    });
  });
});