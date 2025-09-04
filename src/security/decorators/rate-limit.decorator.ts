import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../guards/rate-limit.guard';

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

// 预定义的频率限制装饰器
export const AuthRateLimit = () => RateLimit({ 
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5,                   // 最多5次尝试
  message: '登录尝试过于频繁，请15分钟后再试'
});

export const CreateRateLimit = () => RateLimit({ 
  windowMs: 60 * 1000,      // 1分钟
  max: 20,                  // 最多20次创建
  message: '创建操作过于频繁，请稍后再试'
});

export const StrictRateLimit = () => RateLimit({ 
  windowMs: 60 * 1000,      // 1分钟
  max: 5,                   // 最多5次
  message: '操作过于频繁，请稍后再试'
});
