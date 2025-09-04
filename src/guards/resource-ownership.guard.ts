import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions/permissions.service';
import { RESOURCE_OWNERSHIP_KEY, ResourceOwnershipConfig } from '../decorators';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<ResourceOwnershipConfig>(
      RESOURCE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有配置资源所有权检查，允许通过
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params[config.paramName || 'id'];

    if (!user || !resourceId) {
      throw new ForbiddenException('缺少用户信息或资源ID');
    }

    let isOwner = false;

    try {
      switch (config.resourceType) {
        case 'workspace':
          isOwner = await this.permissionsService.isWorkspaceOwner(user.id, resourceId);
          break;
        case 'board':
          isOwner = await this.permissionsService.isBoardAdmin(user.id, resourceId);
          break;
        default:
          throw new ForbiddenException('不支持的资源类型');
      }
    } catch (error) {
      throw new ForbiddenException(`无权访问此${config.resourceType === 'workspace' ? '工作区' : '看板'}`);
    }

    if (!isOwner) {
      throw new ForbiddenException(`只有${config.resourceType === 'workspace' ? '工作区所有者' : '看板管理员'}可以执行此操作`);
    }

    return true;
  }
}
