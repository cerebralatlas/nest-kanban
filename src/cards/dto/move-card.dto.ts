import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveCardDto {
  @ApiProperty({
    description: '目标列表ID',
    example: 'clx1234567890'
  })
  @IsString()
  @IsNotEmpty()
  targetListId: string;

  @ApiProperty({
    description: '在目标列表中的位置',
    example: 1,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetOrder?: number;
}
