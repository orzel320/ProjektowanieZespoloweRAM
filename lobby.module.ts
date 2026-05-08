import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';

@Module({
  controllers: [LobbyController],
  providers: [LobbyGateway, LobbyService],
  exports: [LobbyService],
})
export class LobbyModule {}
