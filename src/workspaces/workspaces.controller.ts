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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { 
  CreateWorkspaceDto, 
  UpdateWorkspaceDto, 
  WorkspaceQueryDto,
  InviteMemberDto,
  UpdateMemberDto 
} from './dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('workspaces')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ 
    summary: '创建工作区', 
    description: '创建新的工作区，创建者自动成为所有者' 
  })
  @ApiResponse({
    status: 201,
    description: '工作区创建成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '工作区创建成功' },
        workspace: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            name: { type: 'string', example: 'My Team Workspace' },
            description: { type: 'string', example: '团队协作的主要工作区' },
            slug: { type: 'string', example: 'my-team-workspace' },
            ownerId: { type: 'string', example: 'clx1234567890' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                avatar: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                members: { type: 'number' },
                boards: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  @ApiConflictResponse({ description: '工作区标识符已存在' })
  create(@CurrentUser() user: any, @Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, createWorkspaceDto);
  }

  @Get()
  @ApiOperation({ 
    summary: '获取工作区列表', 
    description: '获取当前用户参与的所有工作区' 
  })
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
        message: { type: 'string', example: '获取工作区列表成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              userRole: { type: 'string', enum: ['OWNER', 'MEMBER', 'VIEWER'] },
              _count: {
                type: 'object',
                properties: {
                  members: { type: 'number' },
                  boards: { type: 'number' }
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
  findAll(@CurrentUser() user: any, @Query() query: WorkspaceQueryDto) {
    return this.workspacesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: '获取工作区详情', 
    description: '获取指定工作区的详细信息，包括成员和看板' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取工作区详情成功' },
        workspace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            slug: { type: 'string' },
            userRole: { type: 'string', enum: ['OWNER', 'MEMBER', 'VIEWER'] },
            members: {
              type: 'array',
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
            boards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '工作区不存在' })
  @ApiForbiddenResponse({ description: '无权访问此工作区' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: '更新工作区', 
    description: '更新工作区信息，只有所有者可以操作' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '工作区更新成功' },
        workspace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            slug: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '工作区不存在' })
  @ApiForbiddenResponse({ description: '只有工作区所有者可以执行此操作' })
  @ApiConflictResponse({ description: '工作区标识符已存在' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspacesService.update(id, user.id, updateWorkspaceDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: '删除工作区', 
    description: '删除工作区及其所有相关数据，只有所有者可以操作' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '工作区删除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '工作区不存在' })
  @ApiForbiddenResponse({ description: '只有工作区所有者可以执行此操作' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workspacesService.remove(id, user.id);
  }

  // 成员管理相关接口
  @Post(':id/members')
  @ApiOperation({ 
    summary: '邀请成员', 
    description: '邀请用户加入工作区，只有所有者可以操作' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiResponse({
    status: 201,
    description: '邀请成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '成员邀请成功' },
        member: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            workspaceId: { type: 'string' },
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
      }
    }
  })
  @ApiNotFoundResponse({ description: '要邀请的用户不存在' })
  @ApiConflictResponse({ description: '用户已经是工作区成员' })
  @ApiForbiddenResponse({ description: '只有工作区所有者可以执行此操作' })
  inviteMember(@Param('id') id: string, @CurrentUser() user: any, @Body() inviteMemberDto: InviteMemberDto) {
    return this.workspacesService.inviteMember(id, user.id, inviteMemberDto);
  }

  @Get(':id/members')
  @ApiOperation({ 
    summary: '获取成员列表', 
    description: '获取工作区的所有成员' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiQuery({ name: 'search', required: false, description: '搜索成员' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取成员列表成功' },
        data: {
          type: 'array',
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
  getMembers(@Param('id') id: string, @CurrentUser() user: any, @Query() query: WorkspaceQueryDto) {
    return this.workspacesService.getMembers(id, user.id, query);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ 
    summary: '更新成员角色', 
    description: '更新工作区成员的角色，只有所有者可以操作' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiParam({ name: 'userId', description: '成员用户ID' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '成员角色更新成功' },
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
  @ApiNotFoundResponse({ description: '成员不存在' })
  @ApiForbiddenResponse({ description: '不能修改工作区所有者的角色' })
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() updateMemberDto: UpdateMemberDto
  ) {
    return this.workspacesService.updateMember(id, userId, user.id, updateMemberDto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ 
    summary: '移除成员', 
    description: '从工作区移除成员，只有所有者可以操作' 
  })
  @ApiParam({ name: 'id', description: '工作区ID' })
  @ApiParam({ name: 'userId', description: '成员用户ID' })
  @ApiResponse({
    status: 200,
    description: '移除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '成员移除成功' }
      }
    }
  })
  @ApiNotFoundResponse({ description: '成员不存在' })
  @ApiForbiddenResponse({ description: '不能移除工作区所有者' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any
  ) {
    return this.workspacesService.removeMember(id, userId, user.id);
  }
}
