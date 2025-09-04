import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { SecurityService } from '../security.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class RequestValidationGuard implements CanActivate {
  constructor(
    private readonly securityService: SecurityService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. 验证请求大小
    this.validateRequestSize(request);
    
    // 2. 验证 User-Agent
    this.validateUserAgent(request);
    
    // 3. 验证请求头
    this.validateHeaders(request);
    
    // 4. 验证 IP 白名单（如果配置了）
    this.validateIPWhitelist(request);
    
    // 5. 检测异常请求模式
    this.detectAnomalousRequests(request);

    return true;
  }

  private validateRequestSize(request: any) {
    const contentLength = request.headers['content-length'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength && parseInt(contentLength) > maxSize) {
      this.logger.logSecurity('request_size_exceeded', {
        contentLength: parseInt(contentLength),
        maxSize,
        ip: request.ip,
        endpoint: `${request.method} ${request.url}`,
      });

      throw new BadRequestException('请求体过大');
    }
  }

  private validateUserAgent(request: any) {
    const userAgent = request.headers['user-agent'];
    
    if (!userAgent) {
      this.logger.logSecurity('missing_user_agent', {
        ip: request.ip,
        endpoint: `${request.method} ${request.url}`,
      });
      
      // 可以选择是否拒绝没有 User-Agent 的请求
      // throw new BadRequestException('缺少 User-Agent 头');
    }

    // 检测已知的恶意 User-Agent 模式
    const maliciousUAPatterns = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /burpsuite/i,
      /acunetix/i,
      /nessus/i,
      /openvas/i,
      /w3af/i,
    ];

    if (userAgent) {
      for (const pattern of maliciousUAPatterns) {
        if (pattern.test(userAgent)) {
          this.logger.logSecurity('malicious_user_agent', {
            userAgent,
            ip: request.ip,
            endpoint: `${request.method} ${request.url}`,
          });

          throw new BadRequestException('检测到可疑的客户端');
        }
      }
    }
  }

  private validateHeaders(request: any) {
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip',
      'x-remote-ip',
      'x-client-ip',
    ];

    // 检查是否有多个 IP 相关头（可能的代理欺骗）
    const ipHeaders = suspiciousHeaders.filter(header => request.headers[header]);
    
    if (ipHeaders.length > 1) {
      this.logger.logSecurity('multiple_ip_headers', {
        headers: ipHeaders.reduce((acc, header) => {
          acc[header] = request.headers[header];
          return acc;
        }, {}),
        ip: request.ip,
      });
    }
  }

  private validateIPWhitelist(request: any) {
    if (!this.securityService.isIPWhitelisted(request.ip)) {
      this.logger.logSecurity('ip_not_whitelisted', {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: `${request.method} ${request.url}`,
      });

      throw new BadRequestException('访问被拒绝');
    }
  }

  private detectAnomalousRequests(request: any) {
    // 检测异常的请求模式
    const url = request.url;
    const method = request.method;
    
    // 检测路径遍历尝试
    if (url.includes('../') || url.includes('..\\')) {
      this.logger.logSecurity('path_traversal_attempt', {
        url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      throw new BadRequestException('非法的路径访问');
    }

    // 检测过长的 URL
    if (url.length > 2000) {
      this.logger.logSecurity('url_too_long', {
        urlLength: url.length,
        ip: request.ip,
        method,
      });

      throw new BadRequestException('请求 URL 过长');
    }

    // 检测异常的 HTTP 方法
    const allowedMethods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(method.toUpperCase())) {
      this.logger.logSecurity('invalid_http_method', {
        method,
        url,
        ip: request.ip,
      });

      throw new BadRequestException('不支持的 HTTP 方法');
    }
  }
}
