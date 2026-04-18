import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsModule } from '../boards/boards.module';
import { Game } from './game.entity';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), BoardsModule],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
