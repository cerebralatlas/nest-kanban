import { SetMetadata } from '@nestjs/common';
import { BoardRole } from '../../generated/prisma';

export const BOARD_ROLE_KEY = 'board_role';

export const RequireBoardRole = (...roles: BoardRole[]) => 
  SetMetadata(BOARD_ROLE_KEY, roles);
