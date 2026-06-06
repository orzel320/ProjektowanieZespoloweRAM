import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Stats } from './stats.entity';
import { StatsController} from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [ TypeOrmModule.forFeature([Stats, User]) ],
  controllers: [StatsController] ,
  providers: [StatsService] ,
  exports: [StatsService], 
})
export class UserModule {}
