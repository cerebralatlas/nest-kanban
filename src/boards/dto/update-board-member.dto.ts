import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BoardRole } from '../../../generated/prisma';

export class UpdateBoardMemberDto {
  @ApiProperty({
    description: '更新后的看板角色',
    example: 'MEMBER',
    enum: BoardRole
  })
  @IsEnum(BoardRole)
  role: BoardRole;
}
