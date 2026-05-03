import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { AuthService } from './auth.service';

const mockUsersRepository = {
  exists: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid',
    username: 'testuser',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return success', async () => {
      mockUsersRepository.exists.mockResolvedValue(false);
      mockUsersRepository.create.mockReturnValue(makeUser());
      mockUsersRepository.save.mockResolvedValue(makeUser());

      const result = await service.register('newuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockUsersRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before saving', async () => {
      mockUsersRepository.exists.mockResolvedValue(false);
      mockUsersRepository.create.mockImplementation((data) => data);
      mockUsersRepository.save.mockResolvedValue(makeUser());

      await service.register('newuser', 'plainpassword');

      const created = mockUsersRepository.create.mock.calls[0][0];
      expect(created.passwordHash).toBeDefined();
      expect(created.passwordHash).not.toBe('plainpassword');

      const isHashed = await bcrypt.compare('plainpassword', created.passwordHash as string);
      expect(isHashed).toBe(true);
    });

    it('should return error when username already exists', async () => {
      mockUsersRepository.exists.mockResolvedValue(true);

      const result = await service.register('existinguser', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already exists/i);
      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return user data on successful login', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      const user = makeUser({ passwordHash: hash });
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.login('testuser', 'correctpassword');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(user.id);
      expect(result.user!.username).toBe(user.username);
      expect(result.user!.createdAt).toEqual(user.createdAt);
      expect(result.error).toBeUndefined();
    });

    it('should not expose passwordHash in the returned user object', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      const user = makeUser({ passwordHash: hash });
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.login('testuser', 'correctpassword');

      expect((result.user as any)?.passwordHash).toBeUndefined();
    });

    it('should return error when user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.login('unknownuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
      expect(result.user).toBeUndefined();
    });

    it('should return error when password is wrong', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      const user = makeUser({ passwordHash: hash });
      mockUsersRepository.findOne.mockResolvedValue(user);

      const result = await service.login('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid password/i);
      expect(result.user).toBeUndefined();
    });

    it('should be case-sensitive for usernames', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.login('TESTUSER', 'password');

      expect(result.success).toBe(false);
    });
  });
});