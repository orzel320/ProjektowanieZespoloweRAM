import { Controller, Post, Get, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LobbyService } from './lobby.service';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  createRoom(@Body() body: any) {
    // Manual validation
    if (!body.username || !body.userId) {
      return { 
        success: false, 
        error: 'Missing required fields: username and userId are required' 
      };
    }
    
    if (typeof body.username !== 'string' || body.username.length < 2) {
      return { 
        success: false, 
        error: 'Username must be at least 2 characters long' 
      };
    }
    
    const room = this.lobbyService.createRoom(
      {
        username: body.username,
        userId: body.userId,
        socketId: body.socketId || `http-${Date.now()}-${Math.random()}`,
	joinedAt: new Date() //added
      },
      body.maxPlayers
    );
    
    return { 
      success: true, 
      data: room,
      message: 'Room created successfully'
    };
  }

  @Post('rooms/:roomId/join')
  @HttpCode(HttpStatus.OK)
  joinRoom(@Param('roomId') roomId: string, @Body() body: any) {
    // Simple validation
    if (!body.username || !body.userId) {
      return { 
        success: false, 
        error: 'Missing required fields: username and userId are required' 
      };
    }
    
    if (!roomId) {
      return { 
        success: false, 
        error: 'Room ID is required' 
      };
    }
    
    const result = this.lobbyService.joinRoom(roomId, {
      username: body.username,
      userId: body.userId,
      socketId: body.socketId || `http-${Date.now()}-${Math.random()}`,
      joinedAt: new Date() //added
    });
    
    return result;
  }

  @Delete('rooms/leave')
  @HttpCode(HttpStatus.OK)
  leaveRoom(@Body() body: any) {
    if (!body.socketId) {
      return { 
        success: false, 
        error: 'socketId is required' 
      };
    }
    
    const result = this.lobbyService.leaveRoom(body.socketId);
    return { 
      success: true, 
      data: result,
      message: result.roomDeleted ? 'Room deleted' : 'Left room successfully'
    };
  }

  @Get('rooms')
  @HttpCode(HttpStatus.OK)
  getAllRooms() {
    const rooms = this.lobbyService.listWaitingRooms();
    return {
      success: true,
      data: rooms,
      count: rooms.length,
      message: 'Available waiting rooms'
    };
  }

  @Get('rooms/:roomId')
  @HttpCode(HttpStatus.OK)
  getRoom(@Param('roomId') roomId: string) {
    const room = this.lobbyService.getRoomById(roomId);
    if (!room) {
      return {
        success: false,
        error: 'Room not found'
      };
    }
    return {
      success: true,
      data: this.lobbyService.toPublic(room)
    };
  }

  @Post('rooms/:roomId/start')
  @HttpCode(HttpStatus.OK)
  startGame(@Param('roomId') roomId: string, @Body() body: any) {
    if (!body.gameId) {
      return {
        success: false,
        error: 'gameId is required'
      };
    }
    
    const room = this.lobbyService.startGame(roomId, body.gameId);
    if (!room) {
      return {
        success: false,
        error: 'Cannot start game - room not found or game already started'
      };
    }
    return {
      success: true,
      data: room,
      message: 'Game started successfully'
    };
  }
}
