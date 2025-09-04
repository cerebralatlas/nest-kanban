import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class InputSanitizationInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // 检查和清理请求体
    if (request.body) {
      this.sanitizeObject(request.body, request);
    }

    // 检查和清理查询参数
    if (request.query) {
      this.sanitizeObject(request.query, request);
    }

    // 检查和清理路径参数
    if (request.params) {
      this.sanitizeObject(request.params, request);
    }

    return next.handle();
  }

  private sanitizeObject(obj: any, request: any, path = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        // 检测潜在的恶意输入
        this.detectMaliciousInput(value, currentPath, request);
        
        // 清理输入
        obj[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        this.sanitizeObject(value, request, currentPath);
      }
    }
  }

  private detectMaliciousInput(input: string, fieldPath: string, request: any) {
    const maliciousPatterns = [
      // SQL 注入模式
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\bOR\b.*\bLIKE\b)/i,
      
      // XSS 模式
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b[^>]*>/i,
      
      // 路径遍历
      /(\.\.[\/\\]){2,}/,
      /(\.\.\\|\.\.\/)/,
      
      // 命令注入
      /(\b(eval|exec|system|shell_exec|passthru)\b)/i,
      /(\$\(|\`)/,
      
      // LDAP 注入
      /(\*\))|(\|\()|(\&\()/,
      
      // 过长输入（可能的 DoS 攻击）
      /.{10000,}/, // 超过10000字符
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(input)) {
        this.logger.logSecurity('malicious_input_detected', {
          pattern: pattern.toString(),
          input: input.substring(0, 200), // 只记录前200字符
          fieldPath,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          userId: request.user?.id,
          endpoint: `${request.method} ${request.url}`,
        });

        throw new BadRequestException(`检测到潜在的恶意输入: ${fieldPath}`);
      }
    }
  }

  private sanitizeString(input: string): string {
    return input
      // 移除潜在的 HTML 标签
      .replace(/<[^>]*>/g, '')
      // 移除潜在的脚本内容
      .replace(/javascript:/gi, '')
      // 移除 SQL 注释
      .replace(/--.*$/gm, '')
      .replace(/\/\*.*?\*\//g, '')
      // 限制长度
      .substring(0, 5000)
      // 移除首尾空白
      .trim();
  }
}
