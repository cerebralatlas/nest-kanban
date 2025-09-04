import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '../../logger/logger.service';

// 频率限制配置
export interface RateLimitConfig {
  windowMs: number;  // 时间窗口（毫秒）
  max: number;       // 最大请求次数
  message?: string;  // 自定义错误消息
}

// 默认配置
const DEFAULT_RATE_LIMITS = {
  // 认证相关接口
  auth: { windowMs: 15 * 60 * 1000, max: 10 },      // 15分钟内最多10次
  // 创建操作
  create: { windowMs: 60 * 1000, max: 30 },          // 1分钟内最多30次
  // 查询操作
  read: { windowMs: 60 * 1000, max: 100 },           // 1分钟内最多100次
  // 更新操作
  update: { windowMs: 60 * 1000, max: 50 },          // 1分钟内最多50次
  // 删除操作
  delete: { windowMs: 60 * 1000, max: 10 },          // 1分钟内最多10次
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
  ) {
    // 定期清理过期的计数记录
    setInterval(() => this.cleanupExpiredCounts(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // 获取配置
    const config = this.getRateLimitConfig(context);
    if (!config) return true;

    // 生成键值
    const key = this.generateKey(request, config);
    
    // 检查频率限制
    const now = Date.now();
    const record = this.requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      // 新的时间窗口
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      
      this.setRateLimitHeaders(response, config, 1);
      return true;
    }

    if (record.count >= config.max) {
      // 超过限制
      this.logger.logSecurity('rate_limit_exceeded', {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        userId: request.user?.id,
        endpoint: `${request.method} ${request.url}`,
        currentCount: record.count,
        limit: config.max,
      });

      this.setRateLimitHeaders(response, config, record.count, true);
      
      throw new HttpException(
        config.message || '请求过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 增加计数
    record.count++;
    this.setRateLimitHeaders(response, config, record.count);
    
    return true;
  }

  private getRateLimitConfig(context: ExecutionContext): RateLimitConfig | null {
    // 从装饰器获取自定义配置
    const customConfig = this.reflector.getAllAndOverride<RateLimitConfig>('rateLimit', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (customConfig) return customConfig;

    // 根据 HTTP 方法使用默认配置
    const request = context.switchToHttp().getRequest();
    const method = request.method.toLowerCase();
    const url = request.url;

    // 认证接口特殊处理
    if (url.includes('/auth/')) {
      return DEFAULT_RATE_LIMITS.auth;
    }

    // 根据 HTTP 方法选择配置
    switch (method) {
      case 'post':
        return DEFAULT_RATE_LIMITS.create;
      case 'get':
        return DEFAULT_RATE_LIMITS.read;
      case 'patch':
      case 'put':
        return DEFAULT_RATE_LIMITS.update;
      case 'delete':
        return DEFAULT_RATE_LIMITS.delete;
      default:
        return DEFAULT_RATE_LIMITS.read;
    }
  }

  private generateKey(request: any, config: RateLimitConfig): string {
    // 如果用户已登录，使用用户ID，否则使用IP
    const identifier = request.user?.id || request.ip;
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    
    return `rate_limit:${identifier}:${endpoint}:${config.windowMs}`;
  }

  private setRateLimitHeaders(response: any, config: RateLimitConfig, current: number, exceeded = false) {
    response.header('X-RateLimit-Limit', config.max.toString());
    response.header('X-RateLimit-Remaining', Math.max(0, config.max - current).toString());
    response.header('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());
    
    if (exceeded) {
      response.header('Retry-After', Math.ceil(config.windowMs / 1000).toString());
    }
  }

  private cleanupExpiredCounts() {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
