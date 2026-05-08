import { Module } from '@nestjs/common';
import { BoardsModule } from '../boards/boards.module';
import { BattleRoyaleGateway } from './battle-royale.gateway';
import { BattleRoyaleService } from './battle-royale.service';

@Module({
  imports: [BoardsModule],
  providers: [BattleRoyaleService, BattleRoyaleGateway],
  exports: [BattleRoyaleService],
})
export class BattleRoyaleModule {}