import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ListsService } from './lists.service';
import {
  CreateListDto,
  UpdateListDto,
  ListQueryDto,
  ReorderListsDto,
} from './dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('lists')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post('boards/:boardId/lists')
  @ApiOperation({
    summary: '创建列表',
    description: '在指定看板中创建新列表，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'boardId', description: '看板ID' })
  @ApiResponse({
    status: 201,
    description: '列表创建成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '列表创建成功' },
        list: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            name: { type: 'string', example: 'To Do' },
            order: { type: 'number', example: 1 },
            boardId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            board: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                workspaceId: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                cards: { type: 'number', example: 0 }
              }
            }
          }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: '无权在此看板创建列表' })
  createList(
    @Param('boardId') boardId: string,
    @CurrentUser() user: any,
    @Body() createListDto: CreateListDto
  ) {
    return this.listsService.create(boardId, user.id, createListDto);
  }

  @Get('boards/:boardId/lists')
  @ApiOperation({
    summary: '获取看板列表',
    description: '获取指定看板的所有列表，按排序返回'
  })
  @ApiParam({ name: 'boardId', description: '看板ID' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'includeCards', required: false, description: '是否包含卡片', example: false })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取列表成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              order: { type: 'number' },
              boardId: { type: 'string' },
              _count: {
                type: 'object',
                properties: {
                  cards: { type: 'number' }
                }
              },
              cards: {
                type: 'array',
                description: '卡片列表（当 includeCards=true 时）',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    order: { type: 'number' },
                    assignee: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        avatar: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: '无权访问此看板' })
  getListsByBoard(
    @Param('boardId') boardId: string,
    @CurrentUser() user: any,
    @Query() query: ListQueryDto
  ) {
    return this.listsService.findAllByBoard(boardId, user.id, query);
  }

  @Get('lists/:id')
  @ApiOperation({
    summary: '获取列表详情',
    description: '获取指定列表的详细信息，包括所有卡片'
  })
  @ApiParam({ name: 'id', description: '列表ID' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取列表详情成功' },
        list: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'number' },
            boardId: { type: 'string' },
            board: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                workspaceId: { type: 'string' }
              }
            },
            cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  order: { type: 'number' },
                  assignee: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      email: { type: 'string' },
                      avatar: { type: 'string' }
                    }
                  }
                }
              }
            },
            _count: {
              type: 'object',
              properties: {
                cards: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '列表不存在' })
  @ApiForbiddenResponse({ description: '无权访问此列表' })
  getList(@Param('id') id: string, @CurrentUser() user: any) {
    return this.listsService.findOne(id, user.id);
  }

  @Patch('lists/:id')
  @ApiOperation({
    summary: '更新列表',
    description: '更新列表信息，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'id', description: '列表ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '列表更新成功' },
        list: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            order: { type: 'number' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '列表不存在' })
  @ApiForbiddenResponse({ description: '无权修改此列表' })
  updateList(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateListDto: UpdateListDto
  ) {
    return this.listsService.update(id, user.id, updateListDto);
  }

  @Delete('lists/:id')
  @ApiOperation({
    summary: '删除列表',
    description: '删除列表及其所有卡片，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'id', description: '列表ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '列表删除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '列表不存在' })
  @ApiForbiddenResponse({ description: '无权删除此列表' })
  deleteList(@Param('id') id: string, @CurrentUser() user: any) {
    return this.listsService.remove(id, user.id);
  }

  @Patch('boards/:boardId/lists/reorder')
  @ApiOperation({
    summary: '批量重排序列表',
    description: '批量更新列表排序，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'boardId', description: '看板ID' })
  @ApiResponse({
    status: 200,
    description: '重排序成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '列表重排序成功' }
      }
    }
  })
  @ApiForbiddenResponse({ description: '无权重排序此看板的列表' })
  reorderLists(
    @Param('boardId') boardId: string,
    @CurrentUser() user: any,
    @Body() reorderDto: ReorderListsDto
  ) {
    return this.listsService.reorderLists(boardId, user.id, reorderDto);
  }
}
