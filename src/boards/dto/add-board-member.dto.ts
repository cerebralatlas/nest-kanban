import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BoardRole } from '../../../generated/prisma';

export class AddBoardMemberDto {
  @ApiProperty({
    description: '邀请用户的邮箱',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '用户在看板中的角色',
    example: 'MEMBER',
    enum: BoardRole
  })
  @IsEnum(BoardRole)
  role: BoardRole;
}
