import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { AuthController } from '../auth/auth.controller';
import { StatsService } from './stats.service';
import { AuthService } from '../auth/auth.service';
import { Stats } from '../user/stats.entity'; 
import { Game } from '../game/game.entity'; 

describe('Statistics Module', () => {
  let controller: StatsController;
  let service: StatsService;
  let statsRepository: any;

  let authController: AuthController;

  // Generate unique test user IDs
  const TEST_USER_ID = `test-user-${Date.now()}-${Math.random()}`;

  // Create mock AuthService
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  const mockStatsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController, AuthController], 
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Stats),
          useValue: mockStatsRepository,
        },
        AuthService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get<StatsService>(StatsService);
    statsRepository = module.get(getRepositoryToken(Stats));

    authController = module.get<AuthController>(AuthController);
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
      mockStatsRepository.create.mockImplementation((data) => data);
      mockStatsRepository.save.mockImplementation(async (s) => s); 

      const result = await service.updateStatistics(game, newUserId);
      console.log(result);


      expect(result.totalGuesses).toBe(10);
      expect(result.gamesPlayed).toBe(1);
      expect(result.gamesWon).toBe(1);
    });
  });

  describe('StatsController - getMyStatistics()', () => {
    it('should register userId in session', async () => {
      const mockSession = {} as any;
      const mockResult = {
        success: true,
        user: { id: 'user-123', username: 'testuser' }
      };

      mockAuthService.login.mockResolvedValue(mockResult);
      await authController.login({ username: 'testuser', password: 'pass' }, mockSession); 
	    
       // Verify session was set
       expect(mockSession.userId).toBe('user-123');
    });

    it('should return unauthenticated message when not logged in', async () => {
      // Spy on the method instead of using it directly
      const spy = jest.spyOn(service, 'getUserStatistics');	

      const mockSess = {} as any;
      const result = await controller.getMyStatistics(mockSess);

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
});
