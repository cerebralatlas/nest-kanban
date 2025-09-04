import type { LoggerOptions } from 'pino';

export function createLoggerConfig(): LoggerOptions {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const baseConfig: LoggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    
    // 通用配置
    redact: {
      paths: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '***REDACTED***',
    },

    // 基础字段
    base: {
      pid: process.pid,
      hostname: require('os').hostname(),
      service: 'nest-kanban',
      version: process.env.npm_package_version || '1.0.0',
    },
  };

  // 开发环境配置
  if (isDevelopment) {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
          levelFirst: true,
          singleLine: false,
        },
      },
    };
  }

  // 生产环境配置
  return {
    ...baseConfig,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers?.['user-agent'],
          'content-type': req.headers?.['content-type'],
        },
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader?.('content-type'),
          'content-length': res.getHeader?.('content-length'),
        },
      }),
      err: (err: Error) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      }),
    },
  };
}
