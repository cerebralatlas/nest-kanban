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
  ApiConflictResponse,
} from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import {
  CreateBoardDto,
  UpdateBoardDto,
  BoardQueryDto,
  AddBoardMemberDto,
  UpdateBoardMemberDto,
} from './dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('boards')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post('workspaces/:workspaceId/boards')
  @ApiOperation({
    summary: '创建看板',
    description: '在指定工作区中创建新看板，需要工作区 OWNER 或 MEMBER 权限'
  })
  @ApiParam({ name: 'workspaceId', description: '工作区ID' })
  @ApiResponse({
    status: 201,
    description: '看板创建成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板创建成功' },
        board: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            name: { type: 'string', example: 'Product Development' },
            description: { type: 'string', example: '产品开发团队的主要看板' },
            workspaceId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            workspace: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                members: { type: 'number' },
                lists: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: '无权在工作区中创建看板' })
  createBoard(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Body() createBoardDto: CreateBoardDto
  ) {
    return this.boardsService.create(workspaceId, user.id, createBoardDto);
  }

  @Get('workspaces/:workspaceId/boards')
  @ApiOperation({
    summary: '获取工作区看板列表',
    description: '获取指定工作区的所有看板，需要工作区成员权限'
  })
  @ApiParam({ name: 'workspaceId', description: '工作区ID' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段', enum: ['name', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向', enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取看板列表成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              userRole: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
              roleSource: { type: 'string', enum: ['board', 'workspace'] },
              _count: {
                type: 'object',
                properties: {
                  members: { type: 'number' },
                  lists: { type: 'number' }
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
  @ApiForbiddenResponse({ description: '无权访问此工作区' })
  getBoardsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Query() query: BoardQueryDto
  ) {
    return this.boardsService.findAllByWorkspace(workspaceId, user.id, query);
  }

  @Get('boards/:id')
  @ApiOperation({
    summary: '获取看板详情',
    description: '获取指定看板的详细信息，包括成员和列表'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取看板详情成功' },
        board: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            userRole: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
            roleSource: { type: 'string', enum: ['board', 'workspace'] },
            workspace: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' }
              }
            },
            allMembers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  role: { type: 'string' },
                  source: { type: 'string', enum: ['board', 'workspace'] },
                  effectiveRole: { type: 'string' },
                  user: {
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
            lists: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  order: { type: 'number' },
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
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '看板不存在' })
  @ApiForbiddenResponse({ description: '无权访问此看板' })
  getBoard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.findOne(id, user.id);
  }

  @Patch('boards/:id')
  @ApiOperation({
    summary: '更新看板',
    description: '更新看板信息，需要看板 ADMIN 权限或工作区 OWNER 权限'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板更新成功' },
        board: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '看板不存在' })
  @ApiForbiddenResponse({ description: '无权管理此看板' })
  updateBoard(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateBoardDto: UpdateBoardDto
  ) {
    return this.boardsService.update(id, user.id, updateBoardDto);
  }

  @Delete('boards/:id')
  @ApiOperation({
    summary: '删除看板',
    description: '删除看板及其所有相关数据，需要看板 ADMIN 权限或工作区 OWNER 权限'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板删除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '看板不存在' })
  @ApiForbiddenResponse({ description: '无权删除此看板' })
  deleteBoard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.remove(id, user.id);
  }

  // 看板成员管理
  @Post('boards/:id/members')
  @ApiOperation({
    summary: '添加看板成员',
    description: '添加用户到看板，需要看板 ADMIN 权限或工作区 OWNER 权限'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiResponse({
    status: 201,
    description: '添加成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板成员添加成功' },
        member: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            boardId: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'MEMBER', 'VIEWER'] },
            joinedAt: { type: 'string', format: 'date-time' },
            user: {
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
  @ApiNotFoundResponse({ description: '要添加的用户不存在' })
  @ApiConflictResponse({ description: '用户已经是看板成员' })
  @ApiForbiddenResponse({ description: '只能添加工作区成员到看板' })
  addBoardMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() addMemberDto: AddBoardMemberDto
  ) {
    return this.boardsService.addMember(id, user.id, addMemberDto);
  }

  @Get('boards/:id/members')
  @ApiOperation({
    summary: '获取看板成员',
    description: '获取看板的所有成员，包括直接成员和工作区继承成员'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiQuery({ name: 'search', required: false, description: '搜索成员' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取看板成员成功' },
        data: {
          type: 'object',
          properties: {
            directMembers: {
              type: 'array',
              description: '看板直接成员',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  role: { type: 'string' },
                  joinedAt: { type: 'string', format: 'date-time' },
                  user: {
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
            allMembers: {
              type: 'array',
              description: '所有成员（包括继承）',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  role: { type: 'string' },
                  source: { type: 'string', enum: ['board', 'workspace'] },
                  effectiveRole: { type: 'string' },
                  inheritedFrom: { type: 'string' },
                  user: {
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
  getBoardMembers(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query() query: BoardQueryDto
  ) {
    return this.boardsService.getMembers(id, user.id, query);
  }

  @Patch('boards/:id/members/:userId')
  @ApiOperation({
    summary: '更新看板成员角色',
    description: '更新看板成员的角色，需要看板 ADMIN 权限或工作区 OWNER 权限'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiParam({ name: 'userId', description: '成员用户ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板成员角色更新成功' },
        member: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            role: { type: 'string' },
            user: {
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
  @ApiNotFoundResponse({ description: '用户不是看板直接成员' })
  @ApiForbiddenResponse({ description: '无权管理看板成员' })
  updateBoardMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() updateMemberDto: UpdateBoardMemberDto
  ) {
    return this.boardsService.updateMember(id, userId, user.id, updateMemberDto);
  }

  @Delete('boards/:id/members/:userId')
  @ApiOperation({
    summary: '移除看板成员',
    description: '从看板移除直接成员，需要看板 ADMIN 权限或工作区 OWNER 权限'
  })
  @ApiParam({ name: 'id', description: '看板ID' })
  @ApiParam({ name: 'userId', description: '成员用户ID' })
  @ApiResponse({
    status: 200,
    description: '移除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '看板成员移除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '用户不是看板直接成员，无法移除' })
  @ApiForbiddenResponse({ description: '无权管理看板成员' })
  removeBoardMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any
  ) {
    return this.boardsService.removeMember(id, userId, user.id);
  }
}
