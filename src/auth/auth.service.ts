import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password, avatar } = registerDto;

    this.logger.info('User registration attempt', { email, username });

    // 检查用户是否已存在
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      this.logger.logSecurity('registration_conflict', {
        email,
        username,
        existingField: existingUser.email === email ? 'email' : 'username',
      });
      throw new ConflictException('用户邮箱或用户名已存在');
    }

    try {
      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          avatar,
        },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          createdAt: true,
        }
      });

      this.logger.logUserAction(user.id, 'register', { email, username });
      this.logger.info('User registered successfully', { userId: user.id, email, username });

      return {
        message: '用户注册成功',
        user,
      };
    } catch (error) {
      this.logger.logError(error, 'register', undefined);
      throw new InternalServerErrorException('注册失败，请稍后重试');
    }
  }

  async login(loginDto: LoginDto) {
    const { emailOrUsername, password } = loginDto;

    this.logger.info('User login attempt', { emailOrUsername });

    // 查找用户（支持邮箱或用户名登录）
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      this.logger.logSecurity('login_failed_user_not_found', {
        emailOrUsername,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.logSecurity('login_failed_invalid_password', {
        userId: user.id,
        emailOrUsername,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.logUserAction(user.id, 'login', {
      email: user.email,
      username: user.username,
    });
    this.logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
      }
    });

    return user;
  }
}
