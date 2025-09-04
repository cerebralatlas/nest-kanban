import { FastifyAdapter } from '@nestjs/platform-fastify';
import { createLoggerConfig } from './logger.config';
import { getSecurityConfig } from './security.config';

export function createFastifyAdapter(): FastifyAdapter {
  const securityConfig = getSecurityConfig();
  
  const options = {
    logger: createLoggerConfig(),
    // 提高性能的配置
    caseSensitive: false,
    ignoreTrailingSlash: true,
    
    // 安全配置
    bodyLimit: securityConfig.validation.maxRequestSize, // 10MB
    maxParamLength: 500,    // 限制路径参数长度
    
    // 连接安全配置
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
    requestIdHeader: 'x-request-id', // 请求追踪
    requestIdLogLabel: 'reqId',
    
    // 信任代理配置（生产环境）
    trustProxy: process.env.NODE_ENV === 'production',
    
    // 禁用 X-Powered-By 头
    disableRequestLogging: false,
    
    // HTTP/2 支持
    http2: false, // 可根据需要启用
    
    // 请求解析配置
    ignoreDuplicateSlashes: true,
  };

  return new FastifyAdapter(options);
}
