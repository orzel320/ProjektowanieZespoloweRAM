import { ApiProperty } from '@nestjs/swagger';

export class GenerateGameDto {
  @ApiProperty({ example: 'General' })
  topic: string;

  @ApiProperty({ example: 'Hard' })
  difficulty: string;
}
