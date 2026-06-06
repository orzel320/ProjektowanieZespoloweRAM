import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stats } from './stats.entity';
import { Game } from '../game/game.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Stats)
    private readonly statisticsRepository: Repository<Stats>,
  ) {}

  private async findOrCreate(userId: string): Promise<Stats> {
    const existing = await this.statisticsRepository.findOne({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.statisticsRepository.create({
      userId,
      loginCount: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      bestStreak: 0,
      currentStreak: 0,
      totalGuesses: 0,
      totalMistakes: 0,
    });
  }

  async incrementLoginCount(userId: string) {
    const stats = await this.findOrCreate(userId);
    stats.loginCount += 1;
    await this.statisticsRepository.save(stats);
    return stats;
  }

  async updateStatistics(game: Game, userId: string) {
    const stats = await this.findOrCreate(userId);

    const isWin = game.status === 'won';
    const isLoss = game.status === 'lost';

    stats.gamesPlayed += 1;

    if (isWin) {
      stats.gamesWon += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    } else if (isLoss) {
      stats.gamesLost += 1;
      stats.currentStreak = 0;
    }

    stats.totalGuesses += game.guessCount;
    stats.totalMistakes += game.mistakes;

    await this.statisticsRepository.save(stats);
    return stats;
  }

  async getUserStatistics(userId: string) {
    const stats = await this.statisticsRepository.findOne({
      where: { userId },
    });

    return {
      loginCount: stats?.loginCount ?? 0,
      gamesPlayed: stats?.gamesPlayed ?? 0,
      gamesWon: stats?.gamesWon ?? 0,
      gamesLost: stats?.gamesLost ?? 0,
      totalGuesses: stats?.totalGuesses ?? 0,
      totalMistakes: stats?.totalMistakes ?? 0,
      bestStreak: stats?.bestStreak ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
    };
  }
}
