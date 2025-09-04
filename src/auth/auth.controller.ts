import { Controller, Post, Body, ValidationPipe, Get, UseGuards } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiConflictResponse 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: '用户注册', 
    description: '创建新用户账户' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: '注册成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '用户注册成功' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiConflictResponse({ 
    description: '用户邮箱或用户名已存在' 
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: '用户登录', 
    description: '使用邮箱或用户名登录' 
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: '登录成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '登录成功' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: '用户名或密码错误' 
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '获取用户信息', 
    description: '获取当前登录用户的详细信息' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '获取用户信息成功' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1234567890' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: '未授权，需要有效的 JWT token' 
  })
  async getProfile(@CurrentUser() user: any) {
    return {
      message: '获取用户信息成功',
      user,
    };
  }
}
