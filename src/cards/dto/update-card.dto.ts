import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCardDto {
  @ApiPropertyOptional({
    description: '卡片标题',
    example: '实现用户认证功能',
    minLength: 1
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({
    description: '卡片描述',
    example: '实现用户注册、登录和JWT认证功能'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '分配用户ID（设为null取消分配）',
    example: 'clx1234567890'
  })
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
