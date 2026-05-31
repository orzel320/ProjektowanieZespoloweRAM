import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { REQUEST } from '@nestjs/core';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Stats } from '../user/user.entity';
import { Game } from './game.entity';

describe('Statistics Module', () => {
  let controller: StatsController;
  let service: StatsService;
  let statsRepository: any;

  // Generate unique test user IDs
  const TEST_USER_ID = `test-user-${Date.now()}-${Math.random()}`;

  const mockStatsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Stats),
          useValue: mockStatsRepository,
        },
        {
          provide: REQUEST,
          useValue: { user: { id: TEST_USER_ID } },
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get<StatsService>(StatsService);
    statsRepository = module.get(getRepositoryToken(Stats));
  });

  describe('StatsService - getUserStatistics(userId)', () => {
    it('should return stats for a specific user when userId is passed', async () => {
      const stats = {
        gamesPlayed: 25,
        gamesWon: 18,
        gamesLost: 7,
        totalGuesses: 142,
        totalMistakes: 28,
        bestStreak: 5,
        currentStreak: 2,
      };

      mockStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStatistics(TEST_USER_ID);

      expect(result).toEqual({
        gamesPlayed: 25,
        gamesWon: 18,
        gamesLost: 7,
        totalGuesses: 142,
        totalMistakes: 28,
        bestStreak: 5,
        currentStreak: 2,
      });
      expect(mockStatsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID }
      });
    });

    it('should return default stats for user with no games', async () => {
      mockStatsRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserStatistics(TEST_USER_ID);

      expect(result).toEqual({
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalGuesses: 0,
        totalMistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
      });
    });
  });

  describe('StatsService - updateStatistics(game, userId)', () => {
    it('should update stats for a winning game', async () => {
      const existingStats = {
        userId: TEST_USER_ID,
        gamesPlayed: 10,
        gamesWon: 6,
        gamesLost: 4,
        totalGuesses: 75,
        totalMistakes: 20,
        bestStreak: 3,
        currentStreak: 2,
      };

      const game = {
        status: 'won',
        guessCount: 8,
        mistakes: 2,
      } as Game;

      mockStatsRepository.findOne.mockResolvedValue(existingStats);
      mockStatsRepository.save.mockImplementation(async (s) => s);

      const result = await service.updateStatistics(game, TEST_USER_ID);

      expect(result.gamesPlayed).toBe(11);
      expect(result.gamesWon).toBe(7);
      expect(result.currentStreak).toBe(3);
      expect(result.totalGuesses).toBe(83);
    });

    it('should create new stats for first-time user', async () => {
      const newUserId = `new-user-${Date.now()}`;
      const game = {
        status: 'won',
        guessCount: 10,
        mistakes: 1,
      } as Game;

      mockStatsRepository.findOne.mockResolvedValue(null);
      mockStatsRepository.create.mockReturnValue({ userId: newUserId });
      mockStatsRepository.save.mockImplementation(async (s) => s);

      const result = await service.updateStatistics(game, newUserId);
      console.log(result);

      expect(mockStatsRepository.create).toHaveBeenCalledWith({
        userId: newUserId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalGuesses: 0,
        totalMistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
      });
      expect(result.gamesPlayed).toBe(1);
      expect(result.gamesWon).toBe(1);
    });
  });

  describe('StatsController - getMyStatistics()', () => {
    it('should return stats for the authenticated user (gets userId from request)', async () => {
      const mockStats = {
        gamesPlayed: 25,
        gamesWon: 18,
        gamesLost: 7,
        totalGuesses: 142,
        totalMistakes: 28,
        bestStreak: 5,
        currentStreak: 2,
      };

      // Mock the service's getUserStatistics method (called by controller)
      jest.spyOn(service, 'getUserStatistics').mockResolvedValue(mockStats);

      // Create mock request object with user
      const mockReq = {
        user: { id: TEST_USER_ID }
      } as any;

      const result = await controller.getMyStatistics(mockReq);

      expect(result).toEqual({
        success: true,
        statistics: mockStats,
      });
      // Controller should call getUserStatistics with userId from request
      expect(service.getUserStatistics).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return unauthenticated message when no user in request', async () => {
      // Create module with no user in request
      const module = await Test.createTestingModule({
        controllers: [StatsController],
        providers: [
          StatsService,
          {
            provide: getRepositoryToken(Stats),
            useValue: mockStatsRepository,
          },
          {
            provide: REQUEST,
            useValue: { user: null },
          },
        ],
      }).compile();

      const unAuthController = module.get<StatsController>(StatsController);
      const unAuthService = module.get<StatsService>(StatsService);

      // Spy on the method instead of using it directly
      const spy = jest.spyOn(unAuthService, 'getUserStatistics');	

       // Create mock request with NO user
      const mockReq = {} as any;
      const result = await unAuthController.getMyStatistics(mockReq);

      expect(result).toEqual({
        message: 'Please log in to view your statistics',
        statistics: null,
      });
      // Service should NOT be called
      expect(spy).not.toHaveBeenCalled();

      // Clean up
      spy.mockRestore();
    });
  });

  describe('Integration - Complete flow with both functions', () => {
    it('should: update stats → get stats for same user', async () => {
      const playerId = `player-${Date.now()}`;
      let savedStats: any = null;

      // Create module for this player
      const module = await Test.createTestingModule({
        controllers: [StatsController],
        providers: [
          StatsService,
          {
            provide: getRepositoryToken(Stats),
            useValue: {
              findOne: jest.fn(),
              create: jest.fn(),
              save: jest.fn(),
            },
          },
          {
            provide: REQUEST,
            useValue: { user: { id: playerId } },
          },
        ],
      }).compile();

      const playerController = module.get<StatsController>(StatsController);
      const playerService = module.get<StatsService>(StatsService);
      const playerStatsRepo = module.get(getRepositoryToken(Stats));

      // Step 1: No stats initially
      playerStatsRepo.findOne.mockResolvedValue(null);
      const initialStats = await playerService.getUserStatistics(playerId);
      expect(initialStats.gamesPlayed).toBe(0);

      // Step 2: Play and win a game
      playerStatsRepo.findOne.mockResolvedValue(null);
      playerStatsRepo.create.mockReturnValue({ userId: playerId });
      playerStatsRepo.save.mockImplementation(async (s) => {
        savedStats = s;
        return s;
      });

      await playerService.updateStatistics({ status: 'won', guessCount: 8, mistakes: 2 } as Game, playerId);

      // Step 3: Get stats via controller (should show updated stats)
      const updatedStats = {
        gamesPlayed: 1,
        gamesWon: 1,
        gamesLost: 0,
        totalGuesses: 8,
        totalMistakes: 2,
        bestStreak: 1,
        currentStreak: 1,
      };
      
      jest.spyOn(playerService, 'getUserStatistics').mockResolvedValue(updatedStats);

      const mockReq = {
        user: {id:playerId} //weird
      } as any;
      const result = await playerController.getMyStatistics(mockReq);
	console.log(result)
      
      expect(result.statistics.gamesPlayed).toBe(1);
      expect(result.statistics.gamesWon).toBe(1);
    });
  });
});
