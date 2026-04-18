import { ApiProperty } from '@nestjs/swagger';

export class GuessDto {
  @ApiProperty({
    example: ['WORD1', 'WORD2', 'WORD3', 'WORD4'],
    type: [String],
    minItems: 4,
    maxItems: 4,
  })
  words: string[];
}
