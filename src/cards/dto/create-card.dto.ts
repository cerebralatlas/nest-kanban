import { IsNotEmpty, IsString, IsOptional, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardDto {
  @ApiProperty({
    description: '卡片标题',
    example: '实现用户认证功能',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @ApiProperty({
    description: '卡片描述',
    example: '实现用户注册、登录和JWT认证功能',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '是否自动分配给创建者',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  assignToSelf?: boolean = false;
}
