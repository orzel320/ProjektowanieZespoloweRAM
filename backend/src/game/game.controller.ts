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
import { HintDto } from './dto/hint.dto';
import { GameService } from './game.service';

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('generate')
  @ApiBody({ type: GenerateGameDto })
  async generate(@Body() body: GenerateGameDto) {
    return this.gameService.generate(body.topic, body.difficulty, body.language);
  }

  @Post(':gameId/guess')
  @ApiBody({ type: GuessDto })
  async guess(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @Body() body: GuessDto,
  ) {
    return this.gameService.guess(gameId, body.words);
  }

  @Post(':gameId/hint')
  @ApiBody({ type: HintDto })
  async hint(
    @Param('gameId', ParseUUIDPipe) gameId: string,
    @Body() body: HintDto,
  ) {
    return this.gameService.hint(gameId, body.type);
  }

  @Get(':gameId')
  async get(@Param('gameId', ParseUUIDPipe) gameId: string) {
    return this.gameService.getById(gameId);
  }
}
