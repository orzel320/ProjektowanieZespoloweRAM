import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import type { BoardPayload, GameStatusValue } from './game.types';
import { User } from '../user/user.entity';

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) //added
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: GameStatusValue;

  @Column({ name: 'board_json', type: 'jsonb' })
  boardJson: BoardPayload;

  @Column({ name: 'grid_order', type: 'jsonb' })
  gridOrder: string[];

  @Column({ name: 'solved_category_indices', type: 'jsonb' })
  solvedCategoryIndices: number[];

  @Column({ type: 'int' })
  mistakes: number;

  @Column({ name: 'guess_count', type: 'int' })
  guessCount: number;

  @Column({ name: 'hint_used', type: 'boolean', default: false })
  hintUsed: boolean;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
