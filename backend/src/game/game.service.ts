import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardsService } from '../boards/boards.service';
import { StatsService } from '../user/stats.service'; 
import { Game } from './game.entity';
import type { BoardPayload, CategoryPayload, GameStatusValue, HintType } from './game.types';

const MAX_MISTAKES = 4;

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gamesRepository: Repository<Game>,
    private readonly statsService: StatsService,
    private readonly boardsService: BoardsService,
  ) {}

  async generate(topic: string, difficulty: string, language: string, userId?:string) { 
    const raw = await this.boardsService.generate(topic, difficulty, language);
    const board = this.parseAndValidateBoard(raw);
    const gridOrder = this.shuffle(board.categories.flatMap((c) => c.words));
    const game = this.gamesRepository.create({
      status: 'in_progress' as GameStatusValue,
      boardJson: board,
      gridOrder,
      solvedCategoryIndices: [],
      mistakes: 0,
      guessCount: 0,
      hintUsed: false,
      finishedAt: null,
      userId: userId || null , 
    });
    const saved = await this.gamesRepository.save(game);
    return { gameId: saved.id, grid: saved.gridOrder };
  }

  async getById(gameId: string) {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException();
    }
    return this.toPublicState(game);
  }

  async guess(gameId: string, words: string[]) {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException();
    }

    const base = this.toPublicState(game);

    if (game.status !== 'in_progress') {
      return {
        gameEnded: true,
        message: 'Game has already ended',
        ...base,
      };
    }

    if (!Array.isArray(words) || words.length !== 4) {
      throw new BadRequestException('Exactly four words are required');
    }

    const normalizedGuess = words.map((w) => this.normalizeWord(w));
    const boardWordSet = this.allBoardWordsNormalized(game.boardJson);

    for (const w of normalizedGuess) {
      if (!boardWordSet.has(w)) {
        throw new BadRequestException('Words must appear on the board');
      }
    }

    const guessKey = this.multisetKey(normalizedGuess);
    const solved = new Set(game.solvedCategoryIndices);
    let matchedIndex: number | null = null;

    for (let i = 0; i < game.boardJson.categories.length; i++) {
      if (solved.has(i)) {
        continue;
      }
      const cat = game.boardJson.categories[i];
      const catKey = this.multisetKey(cat.words.map((w) => this.normalizeWord(w)));
      if (catKey === guessKey) {
        matchedIndex = i;
        break;
      }
    }

    const previousStatus = game.status;
    game.guessCount += 1;

    if (matchedIndex !== null) {
      const nextSolved = [...game.solvedCategoryIndices, matchedIndex].sort(

        (a, b) => a - b,

      );

      game.solvedCategoryIndices = nextSolved;

      if (nextSolved.length === 4) {
        game.status = 'won';
        game.finishedAt = new Date();
      }
    } else {
      game.mistakes += 1;
      if (game.mistakes >= MAX_MISTAKES) {
        game.status = 'lost';
        game.finishedAt = new Date();
      }
    }

    await this.gamesRepository.save(game);

    // Update statistics if game just ended and user is authenticated
    const userId = game.userId;
    if (previousStatus === 'in_progress' && game.status !== 'in_progress' && userId) {
      await this.statsService.updateStatistics(game, userId);
    }

    const updated = this.toPublicState(game);

    return {
      correct: matchedIndex !== null,
      gameEnded: game.status !== 'in_progress',
      ...updated,
    };
  }

  async hint(gameId: string, type: HintType) {
    if (type !== 'pair' && type !== 'category') {
      throw new BadRequestException('Invalid hint type');
    }

    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException();
    }
    if (game.status !== 'in_progress') {
      throw new BadRequestException('Game has already ended');
    }
    if (game.hintUsed) {
      throw new BadRequestException('Hint already used');
    }

    const solved = new Set(game.solvedCategoryIndices);
    const unsolvedIndex = game.boardJson.categories.findIndex(
      (_, i) => !solved.has(i),
    );
    if (unsolvedIndex === -1) {
      throw new BadRequestException('No categories left to reveal');
    }

    const category = game.boardJson.categories[unsolvedIndex];

    game.hintUsed = true;
    await this.gamesRepository.save(game);

    if (type === 'category') {
      return { type, categoryName: category.name };
    }
    return { type, words: category.words.slice(0, 2) };
  }

  private parseAndValidateBoard(raw: unknown): BoardPayload {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Invalid board payload');
    }
    const o = raw as Record<string, unknown>;
    const categories = o.categories;
    if (!Array.isArray(categories) || categories.length !== 4) {
      throw new BadRequestException('Invalid board payload');
    }
    const parsed: CategoryPayload[] = [];
    const seen = new Set<string>();
    for (const c of categories) {
      if (!c || typeof c !== 'object') {
        throw new BadRequestException('Invalid board payload');
      }
      const cat = c as Record<string, unknown>;
      const name = cat.name;
      const words = cat.words;
      const logic = cat.logic;
      if (typeof name !== 'string' || typeof logic !== 'string') {
        throw new BadRequestException('Invalid board payload');
      }
      if (!Array.isArray(words) || words.length !== 4) {
        throw new BadRequestException('Invalid board payload');
      }
      const wlist = words.map((w) => {
        if (typeof w !== 'string') {
          throw new BadRequestException('Invalid board payload');
        }
        return w;
      });
      for (const w of wlist) {
        const n = this.normalizeWord(w);
        if (seen.has(n)) {
          throw new BadRequestException('Invalid board payload');
        }
        seen.add(n);
      }
      parsed.push({ name, words: wlist, logic });
    }
    const topic = typeof o.topic === 'string' ? o.topic : '';
    const difficulty =
      typeof o.difficulty === 'string' ? o.difficulty : '';
    return { topic, difficulty, categories: parsed };
  }

  private shuffle<T>(items: T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private normalizeWord(word: string): string {
    return word.trim().toUpperCase();
  }

  private multisetKey(words: string[]): string {
    return [...words].sort().join('\u0001');
  }

  private allBoardWordsNormalized(board: BoardPayload): Set<string> {
    const s = new Set<string>();
    for (const c of board.categories) {
      for (const w of c.words) {
        s.add(this.normalizeWord(w));
      }
    }
    return s;
  }

  private toPublicState(game: Game) {
    const indicesToReveal = game.status === 'lost'
        ? [0, 1, 2, 3]
        : [...game.solvedCategoryIndices].sort((a, b) => a - b);

    const revealedCategories = indicesToReveal.map((i) => {
      const c = game.boardJson.categories[i];
      return {
        name: c.name,
        words: c.words,
        logic: c.logic,
      };
    });

    const out: Record<string, unknown> = {
      gameId: game.id,
      status: game.status,
      grid: game.gridOrder,
      mistakes: game.mistakes,
      maxMistakes: MAX_MISTAKES,
      guessCount: game.guessCount,
      hintUsed: game.hintUsed,
      revealedCategories,
    };

    if (game.status !== 'in_progress' && game.finishedAt) {
      out.durationMs =
          game.finishedAt.getTime() - game.startedAt.getTime();
    }

    return out;
  }
}
