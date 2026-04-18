import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { GenerateGameDto } from './dto/generate-game.dto';
import { GuessDto } from './dto/guess.dto';
import { GameService } from './game.service';

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('generate')
  @ApiBody({ type: GenerateGameDto })
  async generate(@Body() body: GenerateGameDto) {
    return this.gameService.generate(body.topic, body.difficulty);
  }

  @Post(':gameId/guess')
  @ApiBody({ type: GuessDto })
  async guess(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @Body() body: GuessDto,
  ) {
    return this.gameService.guess(gameId, body.words);
  }

  @Get(':gameId')
  async get(@Param('gameId', ParseUUIDPipe) gameId: string) {
    return this.gameService.getById(gameId);
  }
}
