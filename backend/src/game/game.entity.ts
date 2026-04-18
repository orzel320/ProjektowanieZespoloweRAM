import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { BoardPayload, GameStatusValue } from './game.types';

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}
