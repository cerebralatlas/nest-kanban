import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService, ResourceAction } from '../permissions/permissions.service';
import { BOARD_ROLE_KEY } from '../decorators';
import { BoardRole } from '../../generated/prisma';

@Injectable()
export class BoardGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<BoardRole[]>(
      BOARD_ROLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有指定角色要求，允许通过
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const boardId = request.params.id || request.params.boardId;

    if (!user || !boardId) {
      throw new ForbiddenException('缺少用户信息或看板ID');
    }

    // 获取用户在看板中的角色（包括继承的工作区角色）
    const { role: userRole, source } = await this.permissionsService.getUserBoardRole(user.id, boardId);
    
    if (!userRole) {
      throw new ForbiddenException('用户无权访问此看板');
    }

    // 检查角色是否满足要求
    let hasRequiredRole = false;

    if (source === 'board') {
      // 直接看板角色检查
      hasRequiredRole = requiredRoles.includes(userRole as BoardRole);
    } else if (source === 'workspace') {
      // 工作区角色继承检查
      // OWNER -> ADMIN, MEMBER -> MEMBER, VIEWER -> VIEWER
      const mappedRole = this.mapWorkspaceRoleToBoardRole(userRole as any);
      hasRequiredRole = requiredRoles.includes(mappedRole);
    }
    
    if (!hasRequiredRole) {
      throw new ForbiddenException(`需要以下看板角色之一: ${requiredRoles.join(', ')}`);
    }

    // 将角色信息添加到请求中，供后续使用
    request.boardRole = userRole;
    request.roleSource = source;
    
    return true;
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
