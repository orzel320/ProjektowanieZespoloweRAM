import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'statistics' })
export class Stats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'games_played', default: 0 })
  gamesPlayed: number;

  @Column({ name: 'games_won', default: 0 })
  gamesWon: number;

  @Column({ name: 'games_lost', default: 0 })
  gamesLost: number;

  @Column({ name: 'best_streak', default: 0 })
  bestStreak: number;

  @Column({ name: 'current_streak', default: 0 })
  currentStreak: number;

  @Column({ name: 'total_mistakes', default: 0 })
  totalMistakes: number;

  @Column({ name: 'total_guesses', default: 0 })
  totalGuesses: number;
}
