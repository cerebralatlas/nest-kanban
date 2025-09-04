import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '邮箱或用户名',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  emailOrUsername: string;

  @ApiProperty({
    description: '密码',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
