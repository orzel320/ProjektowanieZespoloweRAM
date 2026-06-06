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

  async updateStatistics(game: Game, userId: string) {
    let stats = await this.statisticsRepository.findOne({
      where: { userId: userId }
    });

    if (!stats) {
      stats = this.statisticsRepository.create({ 
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        bestStreak: 0,
        currentStreak: 0,
        totalGuesses: 0,
        totalMistakes: 0,
      });
    }

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
      where: { userId: userId }
    });

    if (!stats) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalGuesses: 0,
        totalMistakes: 0,
        bestStreak: 0,
        currentStreak: 0,
      };
    }


    return {
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      totalGuesses: stats.totalGuesses,
      totalMistakes: stats.totalMistakes,
      bestStreak: stats.bestStreak,
      currentStreak: stats.currentStreak,
    };
  }
}
