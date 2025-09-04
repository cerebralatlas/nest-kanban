import { FastifyAdapter } from '@nestjs/platform-fastify';
import { createLoggerConfig } from './logger.config';

export function createFastifyAdapter(): FastifyAdapter {
  const options = {
    logger: createLoggerConfig(),
    // 提高性能的配置
    caseSensitive: false,
    ignoreTrailingSlash: true,
    // 请求体大小限制
    bodyLimit: 10 * 1024 * 1024, // 10MB
    // 连接超时
    connectionTimeout: 30000,
    // Keep-alive 超时
    keepAliveTimeout: 5000,
  };

  return new FastifyAdapter(options);
}
