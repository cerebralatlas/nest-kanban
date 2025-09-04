import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
import { createLoggerConfig } from '../config/logger.config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino(createLoggerConfig());
  }

  /**
   * 获取原始的 Pino logger 实例
   */
  getLogger(): pino.Logger {
    return this.logger;
  }

  /**
   * 创建子日志器，用于特定模块或上下文
   */
  child(bindings: pino.Bindings): pino.Logger {
    return this.logger.child(bindings);
  }

  // NestJS LoggerService 接口实现
  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  // 扩展的日志方法
  info(message: string, meta?: Record<string, any>) {
    this.logger.info(meta, message);
  }

  fatal(message: string, meta?: Record<string, any>) {
    this.logger.fatal(meta, message);
  }

  trace(message: string, meta?: Record<string, any>) {
    this.logger.trace(meta, message);
  }

  // 业务日志方法
  logUserAction(userId: string, action: string, details?: Record<string, any>) {
    this.logger.info({
      type: 'user_action',
      userId,
      action,
      ...details,
    }, `User ${userId} performed action: ${action}`);
  }

  logApiRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: string) {
    this.logger.info({
      type: 'api_request',
      method,
      url,
      statusCode,
      responseTime,
      userId,
    }, `${method} ${url} - ${statusCode} (${responseTime}ms)`);
  }

  logError(error: Error, context?: string, userId?: string) {
    this.logger.error({
      type: 'application_error',
      context,
      userId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }, `Error in ${context}: ${error.message}`);
  }

  logSecurity(event: string, details: Record<string, any>) {
    this.logger.warn({
      type: 'security_event',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }, `Security event: ${event}`);
  }

  // 性能监控
  logPerformance(operation: string, duration: number, details?: Record<string, any>) {
    this.logger.info({
      type: 'performance',
      operation,
      duration,
      ...details,
    }, `Performance: ${operation} took ${duration}ms`);
  }
}
