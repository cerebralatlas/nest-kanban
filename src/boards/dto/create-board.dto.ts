import { IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBoardDto {
  @ApiProperty({
    description: '看板名称',
    example: 'Product Development',
    minLength: 2
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: '看板描述',
    example: '产品开发团队的主要看板',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}
