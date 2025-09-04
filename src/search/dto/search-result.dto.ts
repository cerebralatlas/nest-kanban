import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from './search-query.dto';

export class SearchContextDto {
  @ApiProperty({
    description: '工作区信息',
    required: false
  })
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({
    description: '看板信息',
    required: false
  })
  board?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: '列表信息',
    required: false
  })
  list?: {
    id: string;
    name: string;
  };
}

export class SearchMetadataDto {
  @ApiProperty({
    description: '创建时间',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    format: 'date-time'
  })
  updatedAt: Date;

  @ApiProperty({
    description: '创建者信息',
    required: false
  })
  createdBy?: {
    id: string;
    username: string;
    email: string;
  };

  @ApiProperty({
    description: '分配者信息（仅卡片）',
    required: false
  })
  assignedTo?: {
    id: string;
    username: string;
    email: string;
  };
}

export class SearchResultItemDto {
  @ApiProperty({
    description: '资源ID',
    example: 'clx1234567890'
  })
  id: string;

  @ApiProperty({
    description: '资源类型',
    enum: ResourceType,
    example: 'card'
  })
  type: ResourceType;

  @ApiProperty({
    description: '标题或名称',
    example: '实现用户认证功能'
  })
  title: string;

  @ApiProperty({
    description: '描述',
    example: '实现用户注册、登录和JWT认证功能',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: '搜索高亮片段',
    example: ['实现<em>用户认证</em>功能'],
    type: [String]
  })
  highlights: string[];

  @ApiProperty({
    description: '上下文信息',
    type: SearchContextDto
  })
  context: SearchContextDto;

  @ApiProperty({
    description: '元数据信息',
    type: SearchMetadataDto
  })
  metadata: SearchMetadataDto;

  @ApiProperty({
    description: '相关性评分',
    example: 0.85,
    minimum: 0,
    maximum: 1
  })
  relevanceScore: number;
}

export class SearchFacetsDto {
  @ApiProperty({
    description: '资源类型统计',
    example: [
      { type: 'card', count: 15 },
      { type: 'board', count: 5 },
      { type: 'workspace', count: 2 }
    ]
  })
  resourceTypes: Array<{ type: string; count: number }>;

  @ApiProperty({
    description: '工作区统计',
    example: [
      { id: 'clx123', name: 'Team Workspace', count: 10 },
      { id: 'clx456', name: 'Personal Workspace', count: 5 }
    ]
  })
  workspaces: Array<{ id: string; name: string; count: number }>;

  @ApiProperty({
    description: '时间范围统计',
    example: [
      { range: 'last_week', count: 8 },
      { range: 'last_month', count: 15 }
    ]
  })
  dateRanges: Array<{ range: string; count: number }>;
}

export class SearchResultDto {
  @ApiProperty({
    description: '搜索成功消息',
    example: '搜索完成'
  })
  message: string;

  @ApiProperty({
    description: '搜索结果列表',
    type: [SearchResultItemDto]
  })
  results: SearchResultItemDto[];

  @ApiProperty({
    description: '分页信息'
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({
    description: '搜索聚合信息',
    type: SearchFacetsDto
  })
  facets: SearchFacetsDto;

  @ApiProperty({
    description: '搜索耗时（毫秒）',
    example: 25
  })
  searchTime: number;
}
