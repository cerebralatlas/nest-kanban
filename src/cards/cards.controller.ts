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
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import {
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  AssignCardDto,
  CardQueryDto,
} from './dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('cards')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('lists/:listId/cards')
  @ApiOperation({
    summary: '创建卡片',
    description: '在指定列表中创建新卡片，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'listId', description: '列表ID' })
  @ApiResponse({
    status: 201,
    description: '卡片创建成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '卡片创建成功' },
        card: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            title: { type: 'string', example: '实现用户认证功能' },
            description: { type: 'string', example: '实现用户注册、登录和JWT认证功能' },
            order: { type: 'number', example: 1 },
            listId: { type: 'string' },
            assigneeId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            list: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                boardId: { type: 'string' },
                board: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    workspaceId: { type: 'string' }
                  }
                }
              }
            },
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
  })
  @ApiForbiddenResponse({ description: '无权在此列表创建卡片' })
  createCard(
    @Param('listId') listId: string,
    @CurrentUser() user: any,
    @Body() createCardDto: CreateCardDto
  ) {
    return this.cardsService.create(listId, user.id, createCardDto);
  }

  @Get('lists/:listId/cards')
  @ApiOperation({
    summary: '获取列表卡片',
    description: '获取指定列表的所有卡片，支持过滤和排序'
  })
  @ApiParam({ name: 'listId', description: '列表ID' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段', enum: ['title', 'createdAt', 'updatedAt', 'order'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'assignedToMe', required: false, description: '只显示分配给我的', example: false })
  @ApiQuery({ name: 'unassigned', required: false, description: '只显示未分配的', example: false })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取卡片列表成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              order: { type: 'number' },
              listId: { type: 'string' },
              assigneeId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              list: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  boardId: { type: 'string' }
                }
              },
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
  @ApiForbiddenResponse({ description: '无权访问此列表' })
  getCardsByList(
    @Param('listId') listId: string,
    @CurrentUser() user: any,
    @Query() query: CardQueryDto
  ) {
    return this.cardsService.findAllByList(listId, user.id, query);
  }

  @Get('cards/:id')
  @ApiOperation({
    summary: '获取卡片详情',
    description: '获取指定卡片的详细信息'
  })
  @ApiParam({ name: 'id', description: '卡片ID' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取卡片详情成功' },
        card: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            order: { type: 'number' },
            listId: { type: 'string' },
            assigneeId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            list: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                boardId: { type: 'string' },
                board: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    workspaceId: { type: 'string' }
                  }
                }
              }
            },
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
  })
  @ApiNotFoundResponse({ description: '卡片不存在' })
  @ApiForbiddenResponse({ description: '无权访问此卡片' })
  getCard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cardsService.findOne(id, user.id);
  }

  @Patch('cards/:id')
  @ApiOperation({
    summary: '更新卡片',
    description: '更新卡片信息，需要看板 ADMIN/MEMBER 权限或卡片分配者权限'
  })
  @ApiParam({ name: 'id', description: '卡片ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '卡片更新成功' },
        card: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            order: { type: 'number' },
            assigneeId: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
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
  })
  @ApiNotFoundResponse({ description: '卡片不存在' })
  @ApiForbiddenResponse({ description: '无权修改此卡片' })
  @ApiBadRequestResponse({ description: '只能分配给看板成员' })
  updateCard(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateCardDto: UpdateCardDto
  ) {
    return this.cardsService.update(id, user.id, updateCardDto);
  }

  @Delete('cards/:id')
  @ApiOperation({
    summary: '删除卡片',
    description: '删除卡片，需要看板 ADMIN 权限或卡片分配者权限'
  })
  @ApiParam({ name: 'id', description: '卡片ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '卡片删除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '卡片不存在' })
  @ApiForbiddenResponse({ description: '只有看板管理员或卡片分配者可以删除卡片' })
  deleteCard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cardsService.remove(id, user.id);
  }

  @Patch('cards/:id/move')
  @ApiOperation({
    summary: '移动卡片',
    description: '移动卡片到其他列表或调整位置，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'id', description: '卡片ID' })
  @ApiResponse({
    status: 200,
    description: '移动成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '卡片移动成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '卡片或目标列表不存在' })
  @ApiForbiddenResponse({ description: '无权移动此卡片' })
  @ApiBadRequestResponse({ description: '移动卡片失败' })
  moveCard(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() moveCardDto: MoveCardDto
  ) {
    return this.cardsService.move(id, user.id, moveCardDto);
  }

  @Patch('cards/:id/assign')
  @ApiOperation({
    summary: '分配卡片',
    description: '分配或取消分配卡片，需要看板 ADMIN/MEMBER 权限'
  })
  @ApiParam({ name: 'id', description: '卡片ID' })
  @ApiResponse({
    status: 200,
    description: '分配成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '卡片分配成功' },
        card: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            assigneeId: { type: 'string' },
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
  })
  @ApiNotFoundResponse({ description: '卡片不存在' })
  @ApiForbiddenResponse({ description: '无权分配此卡片' })
  @ApiBadRequestResponse({ description: '只能将卡片分配给看板成员' })
  assignCard(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() assignCardDto: AssignCardDto
  ) {
    return this.cardsService.assign(id, user.id, assignCardDto);
  }
}
