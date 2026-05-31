export type GameStatusValue = 'in_progress' | 'won' | 'lost';

export type HintType = 'pair' | 'category';

export interface CategoryPayload {
  name: string;
  words: string[];
  logic: string;
}

export interface BoardPayload {
  topic: string;
  difficulty: string;
  categories: CategoryPayload[];
}
