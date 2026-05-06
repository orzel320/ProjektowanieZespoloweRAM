import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';
import type { LobbyPlayer } from './lobby.types';

function makePlayer(overrides: Partial<LobbyPlayer> = {}): Omit<LobbyPlayer, 'isHost'> {
  return {
    userId: 'user-1',
    username: 'Alice',
    socketId: 'socket-1',
    joinedAt: new Date(),
    ...overrides,
  };
}

describe('LobbyService', () => {
  let service: LobbyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LobbyService],
    }).compile();

    service = module.get<LobbyService>(LobbyService);
  });

  describe('createRoom', () => {
    it('should create a room and mark the creator as host', () => {
      const host = makePlayer();
      const room = service.createRoom(host);

      expect(room.roomId).toBeDefined();
      expect(room.status).toBe('waiting');
      expect(room.players).toHaveLength(1);
      expect(room.players[0].isHost).toBe(true);
      expect(room.players[0].username).toBe('Alice');
    });

    it('should respect custom maxPlayers', () => {
      const room = service.createRoom(makePlayer(), 4);
      expect(room.maxPlayers).toBe(4);
    });

    it('should make the room retrievable by socket', () => {
      const host = makePlayer({ socketId: 'socket-host' });
      const room = service.createRoom(host);

      const found = service.getRoomBySocket('socket-host');
      expect(found?.roomId).toBe(room.roomId);
    });
  });

  describe('joinRoom', () => {
    it('should allow a second player to join', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);

      const guest = makePlayer({ userId: 'u2', username: 'Bob', socketId: 's2' });
      const result = service.joinRoom(room.roomId, guest);

      expect(result.success).toBe(true);
      expect(result.room?.players).toHaveLength(2);
      expect(result.room?.players[1].isHost).toBe(false);
    });

    it('should return error for unknown roomId', () => {
      const result = service.joinRoom('nonexistent-room', makePlayer());
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('should return error when room is full', () => {
      const host = makePlayer({ userId: 'u0', socketId: 's0' });
      const room = service.createRoom(host, 2);

      service.joinRoom(room.roomId, makePlayer({ userId: 'u1', socketId: 's1' }));
      const result = service.joinRoom(room.roomId, makePlayer({ userId: 'u2', socketId: 's2' }));

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/full/i);
    });

    it('should return error when the same user tries to join twice', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);

      const duplicate = makePlayer({ userId: 'u1', socketId: 's-other' });
      const result = service.joinRoom(room.roomId, duplicate);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already in/i);
    });

    it('should return error when game has already started', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);
      service.startGame(room.roomId, 'game-uuid');

      const result = service.joinRoom(room.roomId, makePlayer({ userId: 'u2', socketId: 's2' }));

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already started/i);
    });
  });

  describe('leaveRoom', () => {
    it('should remove the player from the room', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);
      service.joinRoom(room.roomId, makePlayer({ userId: 'u2', socketId: 's2' }));

      service.leaveRoom('s2');

      const updated = service.getRoomById(room.roomId);
      expect(updated?.players).toHaveLength(1);
    });

    it('should promote the next player when the host leaves', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);
      service.joinRoom(room.roomId, makePlayer({ userId: 'u2', username: 'Bob', socketId: 's2' }));

      service.leaveRoom('s1');

      const updated = service.getRoomById(room.roomId);
      expect(updated?.players[0].username).toBe('Bob');
      expect(updated?.players[0].isHost).toBe(true);
    });

    it('should delete the room when the last player leaves', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);

      const { roomDeleted } = service.leaveRoom('s1');

      expect(roomDeleted).toBe(true);
      expect(service.getRoomById(room.roomId)).toBeUndefined();
    });

    it('should return wasHost=true when the host leaves', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      service.createRoom(host);
      service.joinRoom(
        service.getRoomBySocket('s1')!.roomId,
        makePlayer({ userId: 'u2', socketId: 's2' }),
      );

      const { wasHost } = service.leaveRoom('s1');
      expect(wasHost).toBe(true);
    });
  });

  describe('startGame', () => {
    it('should set status to in_game and attach gameId', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);

      const updated = service.startGame(room.roomId, 'game-uuid');

      expect(updated?.status).toBe('in_game');
      expect(updated?.gameId).toBe('game-uuid');
    });

    it('should return null for unknown room', () => {
      expect(service.startGame('bad-id', 'game-uuid')).toBeNull();
    });

    it('should return null when room is not in waiting status', () => {
      const host = makePlayer({ userId: 'u1', socketId: 's1' });
      const room = service.createRoom(host);
      service.startGame(room.roomId, 'game-1');

      expect(service.startGame(room.roomId, 'game-2')).toBeNull();
    });
  });

  describe('listWaitingRooms', () => {
    it('should list only rooms in waiting status', () => {
      const h1 = makePlayer({ userId: 'u1', socketId: 's1' });
      const h2 = makePlayer({ userId: 'u2', socketId: 's2' });

      const r1 = service.createRoom(h1);
      const r2 = service.createRoom(h2);
      service.startGame(r2.roomId, 'game-uuid');

      const waiting = service.listWaitingRooms();

      expect(waiting.map((r) => r.roomId)).toContain(r1.roomId);
      expect(waiting.map((r) => r.roomId)).not.toContain(r2.roomId);
    });

    it('should not expose socketId in public room data', () => {
      service.createRoom(makePlayer({ userId: 'u1', socketId: 's1' }));

      const [room] = service.listWaitingRooms();

      room.players.forEach((p) => {
        expect((p as any).socketId).toBeUndefined();
      });
    });
  });
});