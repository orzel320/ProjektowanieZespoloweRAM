import { Module } from '@nestjs/common';
import { BoardsService } from './boards.service';

@Module({
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
