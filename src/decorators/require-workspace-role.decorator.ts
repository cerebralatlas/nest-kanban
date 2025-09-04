import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '../../generated/prisma';

export const WORKSPACE_ROLE_KEY = 'workspace_role';

export const RequireWorkspaceRole = (...roles: WorkspaceRole[]) => 
  SetMetadata(WORKSPACE_ROLE_KEY, roles);
