import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignCardDto {
  @ApiProperty({
    description: '分配给的用户ID（设为null取消分配）',
    example: 'clx1234567890',
    required: false
  })
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
