import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';

@Module({
  providers: [LobbyGateway, LobbyService],
  exports: [LobbyService],
})
export class LobbyModule {}