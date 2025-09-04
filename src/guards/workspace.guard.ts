import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService, ResourceAction } from '../permissions/permissions.service';
import { WORKSPACE_ROLE_KEY } from '../decorators';
import { WorkspaceRole } from '../../generated/prisma';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有指定角色要求，允许通过
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.params.id || request.params.workspaceId;

    if (!user || !workspaceId) {
      throw new ForbiddenException('缺少用户信息或工作区ID');
    }

    // 获取用户在工作区中的角色
    const userRole = await this.permissionsService.getUserWorkspaceRole(user.id, workspaceId);
    
    if (!userRole) {
      throw new ForbiddenException('用户不是工作区成员');
    }

    // 检查角色是否满足要求
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      throw new ForbiddenException(`需要以下角色之一: ${requiredRoles.join(', ')}`);
    }

    // 将角色信息添加到请求中，供后续使用
    request.workspaceRole = userRole;
    
    return true;
  }
}
