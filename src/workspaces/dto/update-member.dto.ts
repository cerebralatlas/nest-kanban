import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '../../../generated/prisma';

export class UpdateMemberDto {
  @ApiProperty({
    description: '更新后的角色',
    example: 'MEMBER',
    enum: WorkspaceRole
  })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
