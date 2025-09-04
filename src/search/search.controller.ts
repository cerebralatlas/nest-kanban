import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SearchResultDto,
  ResourceType,
  SortBy,
} from './dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @ApiOperation({
    summary: '全局搜索',
    description: '在用户可访问的所有资源中进行搜索'
  })
  @ApiQuery({ name: 'query', description: '搜索关键词', example: '用户认证' })
  @ApiQuery({ name: 'resourceTypes', required: false, description: '资源类型过滤', enum: ResourceType, isArray: true })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序方式', enum: SortBy })
  @ApiQuery({ name: 'createdBy', required: false, description: '创建者过滤' })
  @ApiQuery({ name: 'assignedTo', required: false, description: '分配者过滤' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: SearchResultDto,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '搜索完成' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clx1234567890' },
              type: { type: 'string', enum: ['workspace', 'board', 'list', 'card'] },
              title: { type: 'string', example: '实现用户认证功能' },
              description: { type: 'string', example: '实现用户注册、登录和JWT认证功能' },
              highlights: {
                type: 'array',
                items: { type: 'string' },
                example: ['实现<em>用户认证</em>功能']
              },
              context: {
                type: 'object',
                properties: {
                  workspace: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' }
                    }
                  },
                  board: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  },
                  list: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              },
              metadata: {
                type: 'object',
                properties: {
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  createdBy: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      email: { type: 'string' }
                    }
                  },
                  assignedTo: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      email: { type: 'string' }
                    }
                  }
                }
              },
              relevanceScore: { type: 'number', example: 0.85 }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 25 },
            totalPages: { type: 'number', example: 3 }
          }
        },
        facets: {
          type: 'object',
          properties: {
            resourceTypes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  count: { type: 'number' }
                }
              }
            },
            workspaces: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  count: { type: 'number' }
                }
              }
            },
            dateRanges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  range: { type: 'string' },
                  count: { type: 'number' }
                }
              }
            }
          }
        },
        searchTime: { type: 'number', example: 25 }
      }
    }
  })
  @ApiBadRequestResponse({ description: '搜索参数无效' })
  async globalSearch(
    @CurrentUser() user: any,
    @Query() query: SearchQueryDto
  ): Promise<SearchResultDto> {
    return this.searchService.globalSearch(user.id, query);
  }

  @Get('workspaces/:id')
  @ApiOperation({
    summary: '工作区内搜索',
    description: '在指定工作区内搜索看板、列表和卡片'
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiQuery({ name: 'query', description: '搜索关键词', example: '开发' })
  @ApiQuery({ name: 'resourceTypes', required: false, description: '资源类型过滤', enum: ResourceType, isArray: true })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序方式', enum: SortBy })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: SearchResultDto
  })
  @ApiForbiddenResponse({ description: '无权访问此工作区' })
  async searchInWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser() user: any,
    @Query() query: SearchQueryDto
  ): Promise<SearchResultDto> {
    return this.searchService.searchInWorkspace(workspaceId, user.id, query);
  }

  @Get('boards/:id')
  @ApiOperation({
    summary: '看板内搜索',
    description: '在指定看板内搜索列表和卡片'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiQuery({ name: 'query', description: '搜索关键词', example: '任务' })
  @ApiQuery({ name: 'resourceTypes', required: false, description: '资源类型过滤', enum: ResourceType, isArray: true })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序方式', enum: SortBy })
  @ApiQuery({ name: 'assignedTo', required: false, description: '分配者过滤' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: SearchResultDto
  })
  @ApiForbiddenResponse({ description: '无权访问此看板' })
  async searchInBoard(
    @Param('id') boardId: string,
    @CurrentUser() user: any,
    @Query() query: SearchQueryDto
  ): Promise<SearchResultDto> {
    return this.searchService.searchInBoard(boardId, user.id, query);
  }

  @Post('reindex')
  @ApiOperation({
    summary: '重新索引所有数据',
    description: '将数据库中的所有数据重新索引到 Elasticsearch（管理员功能）'
  })
  @ApiResponse({
    status: 200,
    description: '重新索引成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '重新索引完成' }
      }
    }
  })
  @ApiBadRequestResponse({ description: '重新索引失败' })
  async reindexData(@CurrentUser() user: any) {
    // 这里应该添加管理员权限检查
    await this.searchService.reindexAllData();
    return {
      message: '重新索引完成'
    };
  }
}
