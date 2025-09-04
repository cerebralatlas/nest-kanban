import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsSafeString, IsSafeEmail } from '../../security/validators/safe-string.validator';

export class RegisterDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  @IsSafeEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    minLength: 3,
    maxLength: 30
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和短横线'
  })
  @IsSafeString()
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '密码必须包含大小写字母、数字和特殊字符'
  })
  password: string;

  @ApiProperty({
    description: '用户头像URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i, {
    message: '头像必须是有效的图片URL'
  })
  @IsSafeString()
  avatar?: string;
}
