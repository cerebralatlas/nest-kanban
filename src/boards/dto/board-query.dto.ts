import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BoardQueryDto {
  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'development'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
    enum: ['name', 'createdAt', 'updatedAt']
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'desc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
