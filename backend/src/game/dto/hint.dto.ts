import { ApiProperty } from '@nestjs/swagger';
import type { HintType } from '../game.types';

export class HintDto {
  @ApiProperty({ enum: ['pair', 'category'], example: 'pair' })
  type: HintType;
}
