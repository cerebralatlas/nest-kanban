import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.id;

    // 记录请求开始
    this.logger.debug('Incoming request', {
      method,
      url,
      userAgent,
      userId,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap((data) => {
        // 记录成功响应
        const responseTime = Date.now() - startTime;
        this.logger.logApiRequest(
          method,
          url,
          response.statusCode,
          responseTime,
          userId
        );
      }),
      catchError((error) => {
        // 记录错误响应
        const responseTime = Date.now() - startTime;
        this.logger.logError(error, `${method} ${url}`, userId);
        this.logger.logApiRequest(
          method,
          url,
          error.status || 500,
          responseTime,
          userId
        );
        throw error;
      })
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }
}
