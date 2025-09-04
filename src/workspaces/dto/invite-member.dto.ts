import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '../../../generated/prisma';

export class InviteMemberDto {
  @ApiProperty({
    description: '邀请用户的邮箱',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '用户在工作区中的角色',
    example: 'MEMBER',
    enum: WorkspaceRole
  })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
