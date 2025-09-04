import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  CreateBoardDto,
  UpdateBoardDto,
  BoardQueryDto,
  AddBoardMemberDto,
  UpdateBoardMemberDto,
} from './dto';
import { BoardRole } from '../../generated/prisma';

@Injectable()
export class BoardsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private permissionsService: PermissionsService,
  ) {}

  async create(workspaceId: string, userId: string, createBoardDto: CreateBoardDto) {
    // 检查用户是否有在工作区创建看板的权限
    await this.permissionsService.assertWorkspacePermission(userId, workspaceId, 'write');

    const { name, description } = createBoardDto;

    try {
      // 使用事务创建看板
      const board = await this.prisma.$transaction(async (tx) => {
        // 创建看板
        const newBoard = await tx.board.create({
          data: {
            name,
            description,
            workspaceId,
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            },
            _count: {
              select: {
                members: true,
                lists: true,
              }
            }
          }
        });

        // 自动添加创建者为看板管理员（如果不是工作区所有者）
        const isWorkspaceOwner = await this.permissionsService.isWorkspaceOwner(userId, workspaceId);
        
        if (!isWorkspaceOwner) {
          await tx.boardMember.create({
            data: {
              userId,
              boardId: newBoard.id,
              role: BoardRole.ADMIN,
            }
          });
        }

        return newBoard;
      });

      this.logger.logUserAction(userId, 'create_board', {
        boardId: board.id,
        boardName: name,
        workspaceId,
      });

      return {
        message: '看板创建成功',
        board,
      };
    } catch (error) {
      this.logger.logError(error, 'create_board', userId);
      throw new BadRequestException('创建看板失败');
    }
  }

  async findAllByWorkspace(workspaceId: string, userId: string, query: BoardQueryDto) {
    // 检查用户是否有访问工作区的权限
    await this.permissionsService.assertWorkspacePermission(userId, workspaceId, 'read');

    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ]
      })
    };

    const [boards, total] = await Promise.all([
      this.prisma.board.findMany({
        where,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
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
              lists: true,
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.board.count({ where }),
    ]);

    // 获取用户在每个看板中的有效角色
    const boardsWithRoles = await Promise.all(
      boards.map(async (board) => {
        const { role, source } = await this.permissionsService.getUserBoardRole(userId, board.id);
        return {
          ...board,
          userRole: role,
          roleSource: source,
          members: undefined, // 移除详细成员信息
        };
      })
    );

    return {
      message: '获取看板列表成功',
      data: boardsWithRoles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(boardId: string, userId: string) {
    // 检查用户是否有访问看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'read');

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
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
        lists: {
          select: {
            id: true,
            name: true,
            order: true,
            _count: {
              select: {
                cards: true,
              }
            }
          },
          orderBy: {
            order: 'asc',
          }
        },
        _count: {
          select: {
            members: true,
            lists: true,
          }
        }
      }
    });

    if (!board) {
      throw new NotFoundException('看板不存在');
    }

    // 获取当前用户在看板中的角色
    const { role: userRole, source } = await this.permissionsService.getUserBoardRole(userId, boardId);

    // 获取所有工作区成员（用于显示继承权限）
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: board.workspaceId },
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

    // 合并直接成员和继承成员
    const allMembers = this.mergeDirectAndInheritedMembers(board.members, workspaceMembers);

    return {
      message: '获取看板详情成功',
      board: {
        ...board,
        userRole,
        roleSource: source,
        allMembers,
      }
    };
  }

  async update(boardId: string, userId: string, updateBoardDto: UpdateBoardDto) {
    // 检查用户是否有管理看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'admin');

    try {
      const board = await this.prisma.board.update({
        where: { id: boardId },
        data: updateBoardDto,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          _count: {
            select: {
              members: true,
              lists: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'update_board', {
        boardId,
        updates: updateBoardDto,
      });

      return {
        message: '看板更新成功',
        board,
      };
    } catch (error) {
      this.logger.logError(error, 'update_board', userId);
      throw new BadRequestException('更新看板失败');
    }
  }

  async remove(boardId: string, userId: string) {
    // 检查用户是否有删除看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'delete');

    try {
      await this.prisma.$transaction(async (tx) => {
        // 删除看板成员
        await tx.boardMember.deleteMany({
          where: { boardId }
        });

        // 删除看板（会级联删除列表和卡片）
        await tx.board.delete({
          where: { id: boardId }
        });
      });

      this.logger.logUserAction(userId, 'delete_board', {
        boardId,
      });

      return {
        message: '看板删除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'delete_board', userId);
      throw new BadRequestException('删除看板失败');
    }
  }

  // 看板成员管理
  async addMember(boardId: string, userId: string, addMemberDto: AddBoardMemberDto) {
    // 检查用户是否有管理看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'admin');

    const { email, role } = addMemberDto;

    // 查找要添加的用户
    const targetUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      throw new NotFoundException('要添加的用户不存在');
    }

    // 获取看板信息
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true }
    });

    if (!board) {
      throw new NotFoundException('看板不存在');
    }

    // 验证目标用户是工作区成员
    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId: board.workspaceId,
        }
      }
    });

    if (!workspaceMember) {
      throw new ForbiddenException('只能添加工作区成员到看板');
    }

    // 检查用户是否已经是看板成员
    const existingMember = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: targetUser.id,
          boardId,
        }
      }
    });

    if (existingMember) {
      throw new ConflictException('用户已经是看板成员');
    }

    try {
      const member = await this.prisma.boardMember.create({
        data: {
          userId: targetUser.id,
          boardId,
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

      this.logger.logUserAction(userId, 'add_board_member', {
        boardId,
        targetUserId: targetUser.id,
        targetEmail: email,
        role,
      });

      return {
        message: '看板成员添加成功',
        member,
      };
    } catch (error) {
      this.logger.logError(error, 'add_board_member', userId);
      throw new BadRequestException('添加看板成员失败');
    }
  }

  async getMembers(boardId: string, userId: string, query: BoardQueryDto) {
    // 检查用户是否有访问看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'read');

    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // 获取看板直接成员
    const directMembersWhere = {
      boardId,
      ...(search && {
        user: {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ]
        }
      })
    };

    const [directMembers, directTotal] = await Promise.all([
      this.prisma.boardMember.findMany({
        where: directMembersWhere,
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
      this.prisma.boardMember.count({ where: directMembersWhere }),
    ]);

    // 获取工作区继承成员
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true }
    });

    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: board?.workspaceId,
        ...(search && {
          user: {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ]
          }
        })
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

    // 合并成员信息
    const allMembers = this.mergeDirectAndInheritedMembers(directMembers, workspaceMembers);

    return {
      message: '获取看板成员成功',
      data: {
        directMembers,
        allMembers,
      },
      pagination: {
        page,
        limit,
        total: allMembers.length,
        totalPages: Math.ceil(allMembers.length / limit),
      }
    };
  }

  async updateMember(boardId: string, targetUserId: string, userId: string, updateMemberDto: UpdateBoardMemberDto) {
    // 检查用户是否有管理看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'admin');

    // 检查目标用户是否是看板成员
    const member = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        }
      }
    });

    if (!member) {
      throw new NotFoundException('用户不是看板直接成员');
    }

    try {
      const updatedMember = await this.prisma.boardMember.update({
        where: {
          userId_boardId: {
            userId: targetUserId,
            boardId,
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

      this.logger.logUserAction(userId, 'update_board_member', {
        boardId,
        targetUserId,
        newRole: updateMemberDto.role,
      });

      return {
        message: '看板成员角色更新成功',
        member: updatedMember,
      };
    } catch (error) {
      this.logger.logError(error, 'update_board_member', userId);
      throw new BadRequestException('更新看板成员角色失败');
    }
  }

  async removeMember(boardId: string, targetUserId: string, userId: string) {
    // 检查用户是否有管理看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'admin');

    // 检查目标用户是否是看板直接成员
    const member = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: targetUserId,
          boardId,
        }
      }
    });

    if (!member) {
      throw new NotFoundException('用户不是看板直接成员，无法移除');
    }

    try {
      await this.prisma.boardMember.delete({
        where: {
          userId_boardId: {
            userId: targetUserId,
            boardId,
          }
        }
      });

      this.logger.logUserAction(userId, 'remove_board_member', {
        boardId,
        targetUserId,
      });

      return {
        message: '看板成员移除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'remove_board_member', userId);
      throw new BadRequestException('移除看板成员失败');
    }
  }

  // 辅助方法：合并直接成员和继承成员
  private mergeDirectAndInheritedMembers(directMembers: any[], workspaceMembers: any[]) {
    const directMemberIds = new Set(directMembers.map(m => m.userId));
    
    // 直接成员
    const directMembersWithSource = directMembers.map(member => ({
      ...member,
      source: 'board',
      effectiveRole: member.role,
    }));

    // 继承成员（排除已有直接成员）
    const inheritedMembers = workspaceMembers
      .filter(wm => !directMemberIds.has(wm.userId))
      .map(wm => ({
        id: null, // 没有看板成员记录
        userId: wm.userId,
        boardId: null,
        role: this.mapWorkspaceRoleToBoardRole(wm.role),
        joinedAt: wm.joinedAt,
        user: wm.user,
        source: 'workspace',
        effectiveRole: this.mapWorkspaceRoleToBoardRole(wm.role),
        inheritedFrom: wm.role,
      }));

    return [...directMembersWithSource, ...inheritedMembers];
  }

  private mapWorkspaceRoleToBoardRole(workspaceRole: string): BoardRole {
    switch (workspaceRole) {
      case 'OWNER':
        return BoardRole.ADMIN;
      case 'MEMBER':
        return BoardRole.MEMBER;
      case 'VIEWER':
        return BoardRole.VIEWER;
      default:
        return BoardRole.VIEWER;
    }
  }
}
