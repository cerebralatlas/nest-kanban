import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { WorkspaceRole, BoardRole } from '../../generated/prisma';

export type ResourceAction = 'read' | 'write' | 'admin' | 'delete';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  // 工作区权限检查
  async checkWorkspacePermission(
    userId: string, 
    workspaceId: string, 
    action: ResourceAction
  ): Promise<{ hasPermission: boolean; userRole?: WorkspaceRole }> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        }
      },
      include: {
        workspace: {
          select: {
            ownerId: true,
          }
        }
      }
    });

    if (!member) {
      return { hasPermission: false };
    }

    const hasPermission = this.evaluateWorkspacePermission(member.role, action);
    
    if (!hasPermission) {
      this.logger.logSecurity('workspace_permission_denied', {
        userId,
        workspaceId,
        action,
        userRole: member.role,
      });
    }

    return {
      hasPermission,
      userRole: member.role,
    };
  }

  // 看板权限检查
  async checkBoardPermission(
    userId: string, 
    boardId: string, 
    action: ResourceAction
  ): Promise<{ hasPermission: boolean; userRole?: BoardRole; inheritedRole?: WorkspaceRole }> {
    // 首先检查看板级别的权限
    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        }
      }
    });

    // 如果有看板级别的权限，直接使用
    if (boardMember) {
      const hasPermission = this.evaluateBoardPermission(boardMember.role, action);
      
      if (!hasPermission) {
        this.logger.logSecurity('board_permission_denied', {
          userId,
          boardId,
          action,
          userRole: boardMember.role,
          source: 'board_member',
        });
      }

      return {
        hasPermission,
        userRole: boardMember.role,
      };
    }

    // 如果没有看板级别权限，检查工作区权限继承
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        workspaceId: true,
      }
    });

    if (!board) {
      return { hasPermission: false };
    }

    const workspacePermission = await this.checkWorkspacePermission(
      userId, 
      board.workspaceId, 
      action
    );

    if (!workspacePermission.hasPermission) {
      this.logger.logSecurity('board_permission_denied', {
        userId,
        boardId,
        action,
        inheritedRole: workspacePermission.userRole,
        source: 'workspace_inheritance',
      });
    }

    return {
      hasPermission: workspacePermission.hasPermission,
      inheritedRole: workspacePermission.userRole,
    };
  }

  // 检查用户是否是工作区所有者
  async isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });

    return workspace?.ownerId === userId;
  }

  // 检查用户是否是看板管理员
  async isBoardAdmin(userId: string, boardId: string): Promise<boolean> {
    // 检查看板级别的管理员权限
    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        }
      }
    });

    if (boardMember?.role === BoardRole.ADMIN) {
      return true;
    }

    // 检查工作区所有者权限（自动继承看板管理员权限）
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          select: {
            ownerId: true,
          }
        }
      }
    });

    return board?.workspace.ownerId === userId;
  }

  // 获取用户在工作区中的有效角色
  async getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        }
      }
    });

    return member?.role || null;
  }

  // 获取用户在看板中的有效角色
  async getUserBoardRole(userId: string, boardId: string): Promise<{ role: BoardRole | WorkspaceRole | null; source: 'board' | 'workspace' | null }> {
    // 首先检查看板级别的角色
    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId,
          boardId,
        }
      }
    });

    if (boardMember) {
      return {
        role: boardMember.role,
        source: 'board',
      };
    }

    // 检查工作区继承的角色
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        workspaceId: true,
      }
    });

    if (board) {
      const workspaceRole = await this.getUserWorkspaceRole(userId, board.workspaceId);
      return {
        role: workspaceRole,
        source: 'workspace',
      };
    }

    return {
      role: null,
      source: null,
    };
  }

  // 权限评估逻辑
  private evaluateWorkspacePermission(role: WorkspaceRole, action: ResourceAction): boolean {
    switch (role) {
      case WorkspaceRole.OWNER:
        return true; // 所有权限

      case WorkspaceRole.MEMBER:
        return ['read', 'write'].includes(action);

      case WorkspaceRole.VIEWER:
        return action === 'read';

      default:
        return false;
    }
  }

  private evaluateBoardPermission(role: BoardRole, action: ResourceAction): boolean {
    switch (role) {
      case BoardRole.ADMIN:
        return true; // 所有权限

      case BoardRole.MEMBER:
        return ['read', 'write'].includes(action);

      case BoardRole.VIEWER:
        return action === 'read';

      default:
        return false;
    }
  }

  // 权限断言方法（抛出异常）
  async assertWorkspacePermission(userId: string, workspaceId: string, action: ResourceAction): Promise<WorkspaceRole> {
    const result = await this.checkWorkspacePermission(userId, workspaceId, action);
    
    if (!result.hasPermission) {
      throw new ForbiddenException(`无权在工作区中执行 ${action} 操作`);
    }

    return result.userRole!;
  }

  async assertBoardPermission(userId: string, boardId: string, action: ResourceAction): Promise<{ role: BoardRole | WorkspaceRole; source: 'board' | 'workspace' }> {
    const result = await this.checkBoardPermission(userId, boardId, action);
    
    if (!result.hasPermission) {
      throw new ForbiddenException(`无权在看板中执行 ${action} 操作`);
    }

    return {
      role: result.userRole || result.inheritedRole!,
      source: result.userRole ? 'board' : 'workspace',
    };
  }

  async assertWorkspaceOwnership(userId: string, workspaceId: string): Promise<void> {
    const isOwner = await this.isWorkspaceOwner(userId, workspaceId);
    
    if (!isOwner) {
      throw new ForbiddenException('只有工作区所有者可以执行此操作');
    }
  }

  async assertBoardAdmin(userId: string, boardId: string): Promise<void> {
    const isAdmin = await this.isBoardAdmin(userId, boardId);
    
    if (!isAdmin) {
      throw new ForbiddenException('只有看板管理员可以执行此操作');
    }
  }
}
