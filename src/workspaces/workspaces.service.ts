import { 
  Injectable, 
  ConflictException, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PermissionsService } from '../permissions/permissions.service';
import { 
  CreateWorkspaceDto, 
  UpdateWorkspaceDto, 
  WorkspaceQueryDto,
  InviteMemberDto,
  UpdateMemberDto 
} from './dto';
import { WorkspaceRole } from '../../generated/prisma';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private permissionsService: PermissionsService,
  ) {}

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    const { name, description, slug } = createWorkspaceDto;

    // 检查 slug 是否已存在
    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: { slug }
    });

    if (existingWorkspace) {
      throw new ConflictException('工作区标识符已存在');
    }

    try {
      // 使用事务创建工作区和设置所有者
      const workspace = await this.prisma.$transaction(async (tx) => {
        // 创建工作区
        const newWorkspace = await tx.workspace.create({
          data: {
            name,
            description,
            slug,
            ownerId: userId,
          },
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              }
            },
            _count: {
              select: {
                members: true,
                boards: true,
              }
            }
          }
        });

        // 自动添加创建者为工作区成员
        await tx.workspaceMember.create({
          data: {
            userId,
            workspaceId: newWorkspace.id,
            role: WorkspaceRole.OWNER,
          }
        });

        return newWorkspace;
      });

      this.logger.logUserAction(userId, 'create_workspace', {
        workspaceId: workspace.id,
        workspaceName: name,
        slug,
      });

      return {
        message: '工作区创建成功',
        workspace,
      };
    } catch (error) {
      this.logger.logError(error, 'create_workspace', userId);
      throw new BadRequestException('创建工作区失败');
    }
  }

  async findAll(userId: string, query: WorkspaceQueryDto) {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = {
      members: {
        some: {
          userId,
        }
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ]
      })
    };

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          },
          members: {
            where: { userId },
            select: {
              role: true,
            }
          },
          _count: {
            select: {
              members: true,
              boards: true,
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return {
      message: '获取工作区列表成功',
      data: workspaces.map(workspace => ({
        ...workspace,
        userRole: workspace.members[0]?.role,
        members: undefined, // 移除详细成员信息
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(workspaceId: string, userId: string) {
    // 检查用户是否有访问权限
    await this.permissionsService.assertWorkspacePermission(userId, workspaceId, 'read');

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              }
            }
          },
          orderBy: {
            joinedAt: 'asc',
          }
        },
        boards: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          }
        },
        _count: {
          select: {
            members: true,
            boards: true,
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException('工作区不存在');
    }

    // 获取当前用户在工作区中的角色
    const userMember = workspace.members.find(member => member.userId === userId);

    return {
      message: '获取工作区详情成功',
      workspace: {
        ...workspace,
        userRole: userMember?.role,
      }
    };
  }

  async update(workspaceId: string, userId: string, updateWorkspaceDto: UpdateWorkspaceDto) {
    // 检查用户是否是工作区所有者
    await this.permissionsService.assertWorkspaceOwnership(userId, workspaceId);

    const { slug, ...updateData } = updateWorkspaceDto;

    // 如果更新 slug，检查唯一性
    if (slug) {
      const existingWorkspace = await this.prisma.workspace.findFirst({
        where: {
          slug,
          id: { not: workspaceId }
        }
      });

      if (existingWorkspace) {
        throw new ConflictException('工作区标识符已存在');
      }
    }

    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { ...updateData, ...(slug && { slug }) },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          },
          _count: {
            select: {
              members: true,
              boards: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'update_workspace', {
        workspaceId,
        updates: updateWorkspaceDto,
      });

      return {
        message: '工作区更新成功',
        workspace,
      };
    } catch (error) {
      this.logger.logError(error, 'update_workspace', userId);
      throw new BadRequestException('更新工作区失败');
    }
  }

  async remove(workspaceId: string, userId: string) {
    // 检查用户是否是工作区所有者
    await this.permissionsService.assertWorkspaceOwnership(userId, workspaceId);

    try {
      await this.prisma.$transaction(async (tx) => {
        // 删除相关数据（级联删除）
        await tx.workspaceMember.deleteMany({
          where: { workspaceId }
        });

        // 删除工作区下的所有看板及其相关数据
        const boards = await tx.board.findMany({
          where: { workspaceId },
          select: { id: true }
        });

        for (const board of boards) {
          // 删除看板成员
          await tx.boardMember.deleteMany({
            where: { boardId: board.id }
          });

          // 删除列表和卡片会通过 Prisma 的级联删除自动处理
        }

        // 删除工作区（会级联删除看板、列表、卡片）
        await tx.workspace.delete({
          where: { id: workspaceId }
        });
      });

      this.logger.logUserAction(userId, 'delete_workspace', {
        workspaceId,
      });

      return {
        message: '工作区删除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'delete_workspace', userId);
      throw new BadRequestException('删除工作区失败');
    }
  }

  // 成员管理方法
  async inviteMember(workspaceId: string, userId: string, inviteMemberDto: InviteMemberDto) {
    // 检查用户是否有邀请权限（OWNER）
    await this.permissionsService.assertWorkspaceOwnership(userId, workspaceId);

    const { email, role } = inviteMemberDto;

    // 查找要邀请的用户
    const inviteeUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!inviteeUser) {
      throw new NotFoundException('要邀请的用户不存在');
    }

    // 检查用户是否已经是成员
    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: inviteeUser.id,
          workspaceId,
        }
      }
    });

    if (existingMember) {
      throw new ConflictException('用户已经是工作区成员');
    }

    try {
      const member = await this.prisma.workspaceMember.create({
        data: {
          userId: inviteeUser.id,
          workspaceId,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'invite_workspace_member', {
        workspaceId,
        inviteeId: inviteeUser.id,
        inviteeEmail: email,
        role,
      });

      return {
        message: '成员邀请成功',
        member,
      };
    } catch (error) {
      this.logger.logError(error, 'invite_workspace_member', userId);
      throw new BadRequestException('邀请成员失败');
    }
  }

  async getMembers(workspaceId: string, userId: string, query: WorkspaceQueryDto) {
    // 检查用户是否有访问权限
    await this.permissionsService.assertWorkspacePermission(userId, workspaceId, 'read');

    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      ...(search && {
        user: {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ]
        }
      })
    };

    const [members, total] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        },
        orderBy: {
          joinedAt: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.workspaceMember.count({ where }),
    ]);

    return {
      message: '获取成员列表成功',
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async updateMember(workspaceId: string, targetUserId: string, userId: string, updateMemberDto: UpdateMemberDto) {
    // 检查用户是否是工作区所有者
    await this.permissionsService.assertWorkspaceOwnership(userId, workspaceId);

    // 不能修改所有者的角色
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });

    if (workspace?.ownerId === targetUserId) {
      throw new ForbiddenException('不能修改工作区所有者的角色');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        }
      }
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    try {
      const updatedMember = await this.prisma.workspaceMember.update({
        where: {
          userId_workspaceId: {
            userId: targetUserId,
            workspaceId,
          }
        },
        data: {
          role: updateMemberDto.role,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'update_workspace_member', {
        workspaceId,
        targetUserId,
        newRole: updateMemberDto.role,
      });

      return {
        message: '成员角色更新成功',
        member: updatedMember,
      };
    } catch (error) {
      this.logger.logError(error, 'update_workspace_member', userId);
      throw new BadRequestException('更新成员角色失败');
    }
  }

  async removeMember(workspaceId: string, targetUserId: string, userId: string) {
    // 检查用户是否是工作区所有者
    await this.permissionsService.assertWorkspaceOwnership(userId, workspaceId);

    // 不能移除所有者
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });

    if (workspace?.ownerId === targetUserId) {
      throw new ForbiddenException('不能移除工作区所有者');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        }
      }
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    try {
      await this.prisma.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId: targetUserId,
            workspaceId,
          }
        }
      });

      this.logger.logUserAction(userId, 'remove_workspace_member', {
        workspaceId,
        targetUserId,
      });

      return {
        message: '成员移除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'remove_workspace_member', userId);
      throw new BadRequestException('移除成员失败');
    }
  }

}
