import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResourceType {
  WORKSPACE = 'workspace',
  BOARD = 'board',
  LIST = 'list',
  CARD = 'card',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  DATE = 'date',
  NAME = 'name',
}

export class DateRangeDto {
  @ApiPropertyOptional({
    description: '开始日期',
    example: '2024-01-01',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: '结束日期',
    example: '2024-12-31',
    format: 'date'
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SearchQueryDto {
  @ApiProperty({
    description: '搜索关键词',
    example: '用户认证',
    minLength: 1
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: '资源类型过滤',
    example: ['workspace', 'board', 'card'],
    enum: ResourceType,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ResourceType, { each: true })
  resourceTypes?: ResourceType[];

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
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '排序方式',
    example: 'relevance',
    enum: SortBy
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: '时间范围过滤',
    type: DateRangeDto
  })
  @IsOptional()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: '创建者过滤（用户ID）',
    example: 'clx1234567890'
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: '分配者过滤（用户ID，仅卡片）',
    example: 'clx1234567890'
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: '工作区ID过滤',
    example: 'clx1234567890'
  })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: '看板ID过滤',
    example: 'clx1234567890'
  })
  @IsOptional()
  @IsString()
  boardId?: string;
}
