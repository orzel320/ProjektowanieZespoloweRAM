import { Module } from '@nestjs/common';
import { BattleRoyaleModule } from '../battle-royale/battle-royale.module';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';

@Module({
  controllers: [LobbyController],
  imports: [BattleRoyaleModule],
  providers: [LobbyGateway, LobbyService],
  exports: [LobbyService],
})
export class LobbyModule {}
