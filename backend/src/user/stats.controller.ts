import { ApiTags } from '@nestjs/swagger'; //idk how to use it
import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  async getMyStatistics(@Req() req: Request) {
    // Extract user ID from request (adjust based on your auth setup)
    const userId = (req as any).user?.id;
    
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
