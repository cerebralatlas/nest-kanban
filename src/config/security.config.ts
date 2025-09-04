export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  cors: {
    enabled: boolean;
    origin: string[] | boolean;
    credentials: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    hsts: boolean;
  };
  validation: {
    enableSqlInjectionProtection: boolean;
    enableXssProtection: boolean;
    maxRequestSize: number;
  };
}

export function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15分钟
      max: isProduction ? 100 : 1000, // 生产环境更严格
    },
    cors: {
      enabled: true,
      origin: isProduction 
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
      credentials: true,
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: isProduction,
      hsts: isProduction,
    },
    validation: {
      enableSqlInjectionProtection: true,
      enableXssProtection: true,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
    },
  };
}
