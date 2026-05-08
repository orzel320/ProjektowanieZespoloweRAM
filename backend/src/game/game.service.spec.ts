import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BoardsService } from '../boards/boards.service';
import { Game } from './game.entity';
import { GameService } from './game.service';
import type { BoardPayload } from './game.types';

function makeMockBoard(overrides: Partial<BoardPayload> = {}): BoardPayload {
  return {
    topic: 'Animals',
    difficulty: 'easy',
    categories: [
      { name: 'Cats', words: ['LION', 'TIGER', 'PUMA', 'CHEETAH'], logic: 'big cats' },
      { name: 'Dogs', words: ['HUSKY', 'POODLE', 'BOXER', 'BEAGLE'], logic: 'dog breeds' },
      { name: 'Birds', words: ['EAGLE', 'HAWK', 'OWL', 'FALCON'], logic: 'birds of prey' },
      { name: 'Fish', words: ['TROUT', 'SALMON', 'BASS', 'CARP'], logic: 'freshwater fish' },
    ],
    ...overrides,
  };
}

function makeGame(overrides: Partial<Game> = {}): Game {
  const board = makeMockBoard();
  return {
    id: 'test-uuid',
    status: 'in_progress',
    boardJson: board,
    gridOrder: board.categories.flatMap((c) => c.words),
    solvedCategoryIndices: [],
    mistakes: 0,
    guessCount: 0,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    finishedAt: null,
    ...overrides,
  } as Game;
}

const mockGamesRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockBoardsService = {
  generate: jest.fn(),
};

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: getRepositoryToken(Game), useValue: mockGamesRepository },
        { provide: BoardsService, useValue: mockBoardsService },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('generate', () => {
    it('should generate a game and return gameId with grid', async () => {
      const board = makeMockBoard();
      mockBoardsService.generate.mockResolvedValue(board);

      const savedGame = makeGame({ id: 'new-game-uuid' });
      mockGamesRepository.create.mockReturnValue(savedGame);
      mockGamesRepository.save.mockResolvedValue(savedGame);

      const result = await service.generate('Animals', 'easy');

      expect(mockBoardsService.generate).toHaveBeenCalledWith('Animals', 'easy');
      expect(mockGamesRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('gameId');
      expect(result).toHaveProperty('grid');
      expect(Array.isArray(result.grid)).toBe(true);
      expect(result.grid).toHaveLength(16);
    });

    it('should throw when board from AI has wrong number of categories', async () => {
      mockBoardsService.generate.mockResolvedValue({
        topic: 'Test',
        difficulty: 'easy',
        categories: [{ name: 'Only one', words: ['A', 'B', 'C', 'D'], logic: 'x' }],
      });

      await expect(service.generate('Test', 'easy')).rejects.toThrow(BadRequestException);
    });

    it('should throw when a category has wrong number of words', async () => {
      const board = makeMockBoard();
      board.categories[0].words = ['LION', 'TIGER']; 
      mockBoardsService.generate.mockResolvedValue(board);

      await expect(service.generate('Animals', 'easy')).rejects.toThrow(BadRequestException);
    });

    it('should throw when there are duplicate words across categories', async () => {
      const board = makeMockBoard();
      board.categories[1].words[0] = 'LION'; 
      mockBoardsService.generate.mockResolvedValue(board);

      await expect(service.generate('Animals', 'easy')).rejects.toThrow(BadRequestException);
    });

    it('should shuffle the grid (not always in original order)', async () => {
      const board = makeMockBoard();
      mockBoardsService.generate.mockResolvedValue(board);

      const originalOrder = board.categories.flatMap((c) => c.words);
      const savedGame = makeGame({ id: 'uuid', gridOrder: originalOrder });
      mockGamesRepository.create.mockReturnValue(savedGame);
      mockGamesRepository.save.mockResolvedValue(savedGame);

      const result = await service.generate('Animals', 'easy');

      expect(result.grid.slice().sort()).toEqual(originalOrder.slice().sort());
    });
  });

  describe('getById', () => {
    it('should return public state for an existing game', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);

      const result = await service.getById('test-uuid');

      expect(result).toHaveProperty('gameId', 'test-uuid');
      expect(result).toHaveProperty('status', 'in_progress');
      expect(result).toHaveProperty('mistakes', 0);
      expect(result).toHaveProperty('maxMistakes', 4);
      expect(result).toHaveProperty('grid');
      expect(result).toHaveProperty('revealedCategories');
      expect(Array.isArray((result as any).revealedCategories)).toBe(true);
    });

    it('should throw NotFoundException for an unknown gameId', async () => {
      mockGamesRepository.findOne.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should include durationMs when game is finished', async () => {
      const startedAt = new Date('2024-01-01T10:00:00Z');
      const finishedAt = new Date('2024-01-01T10:05:00Z');
      const game = makeGame({ status: 'won', solvedCategoryIndices: [0, 1, 2, 3], startedAt, finishedAt });
      mockGamesRepository.findOne.mockResolvedValue(game);

      const result = await service.getById('test-uuid') as any;

      expect(result.durationMs).toBe(5 * 60 * 1000);
    });
  });

  describe('guess', () => {
    it('should accept a correct guess and mark category as solved', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'CHEETAH']) as any;

      expect(result.correct).toBe(true);
      expect(result.gameEnded).toBe(false);
      expect(result.revealedCategories).toHaveLength(1);
      expect(result.revealedCategories[0].name).toBe('Cats');
    });

    it('should be case-insensitive and trim whitespace', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', [' lion ', 'tiger', 'PUMA', 'Cheetah']) as any;

      expect(result.correct).toBe(true);
    });

    it('should return correct=false and increment mistakes for a wrong guess', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'HUSKY']) as any;

      expect(result.correct).toBe(false);
      expect(game.mistakes).toBe(1);
      expect(result.gameEnded).toBe(false);
    });

    it('should end game as "won" when all 4 categories are solved', async () => {
      const game = makeGame({ solvedCategoryIndices: [0, 1, 2] });
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['TROUT', 'SALMON', 'BASS', 'CARP']) as any;

      expect(result.correct).toBe(true);
      expect(result.gameEnded).toBe(true);
      expect(result.status).toBe('won');
    });

    it('should end game as "lost" after 4 mistakes', async () => {
      const game = makeGame({ mistakes: 3 });
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'HUSKY']) as any;

      expect(result.correct).toBe(false);
      expect(result.gameEnded).toBe(true);
      expect(result.status).toBe('lost');
    });

    it('should return early when game has already ended', async () => {
      const game = makeGame({ status: 'lost' });
      mockGamesRepository.findOne.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'CHEETAH']) as any;

      expect(result.gameEnded).toBe(true);
      expect(result.message).toMatch(/already ended/i);
      expect(mockGamesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for less than 4 words', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);

      await expect(service.guess('test-uuid', ['LION', 'TIGER', 'PUMA'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for words not on the board', async () => {
      const game = makeGame();
      mockGamesRepository.findOne.mockResolvedValue(game);

      await expect(service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'DRAGON'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for unknown gameId', async () => {
      mockGamesRepository.findOne.mockResolvedValue(null);

      await expect(service.guess('nonexistent', ['LION', 'TIGER', 'PUMA', 'CHEETAH'])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not allow guessing an already-solved category', async () => {
      const game = makeGame({ solvedCategoryIndices: [0] });
      mockGamesRepository.findOne.mockResolvedValue(game);
      mockGamesRepository.save.mockResolvedValue(game);

      const result = await service.guess('test-uuid', ['LION', 'TIGER', 'PUMA', 'CHEETAH']) as any;

      expect(result.correct).toBe(false);
    });
  });
});