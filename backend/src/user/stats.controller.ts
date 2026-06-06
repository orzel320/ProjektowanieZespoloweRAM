import { ApiTags } from '@nestjs/swagger'; 
import { Controller, Get, Session } from '@nestjs/common'; 
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  async getMyStatistics(@Session() session: any) { 

    const userId = session?.userId; 
    
    if (!userId) {
      return {
        message: 'Please log in to view your statistics',
        statistics: null,
      };
    }
    
    const statistics = await this.statsService.getUserStatistics(userId);
    
    return {
      success: true,
      statistics,
    };
  }
}
