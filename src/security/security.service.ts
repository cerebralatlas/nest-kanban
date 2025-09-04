import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SecurityService {
  constructor(private readonly logger: LoggerService) {}

  // SQL 注入防护 - 验证和清理数据库查询参数
  validateDatabaseInput(input: any, context: string): boolean {
    if (typeof input === 'string') {
      return this.validateStringInput(input, context);
    }
    
    if (typeof input === 'object' && input !== null) {
      for (const [key, value] of Object.entries(input)) {
        if (!this.validateDatabaseInput(value, `${context}.${key}`)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private validateStringInput(input: string, context: string): boolean {
    // SQL 注入检测模式
    const sqlInjectionPatterns = [
      // 基本 SQL 关键词
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/i,
      
      // SQL 注释
      /(--|\#|\/\*|\*\/)/,
      
      // SQL 操作符组合
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /(\bAND\b\s+\d+\s*=\s*\d+)/i,
      
      // 引号注入
      /('.*'|".*")/,
      
      // 分号（SQL 语句分隔符）
      /;.*(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      
      // 十六进制注入
      /0x[0-9a-f]+/i,
      
      // 函数调用注入
      /\b(CHAR|ASCII|SUBSTRING|CONCAT|CAST|CONVERT)\s*\(/i,
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(input)) {
        this.logger.logSecurity('sql_injection_attempt', {
          pattern: pattern.toString(),
          input: input.substring(0, 200),
          context,
        });
        return false;
      }
    }

    return true;
  }

  // 验证文件上传（如果有文件上传功能）
  validateFileUpload(filename: string, mimetype: string, size: number): boolean {
    // 允许的文件类型
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ];

    // 危险文件扩展名
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com',
      '.js', '.vbs', '.jar', '.php', '.asp', '.jsp',
      '.sh', '.py', '.rb', '.pl',
    ];

    // 检查 MIME 类型
    if (!allowedMimeTypes.includes(mimetype)) {
      this.logger.logSecurity('invalid_file_type', {
        filename,
        mimetype,
        size,
      });
      return false;
    }

    // 检查文件扩展名
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (dangerousExtensions.includes(extension)) {
      this.logger.logSecurity('dangerous_file_extension', {
        filename,
        extension,
        mimetype,
      });
      return false;
    }

    // 检查文件大小（10MB 限制）
    const maxSize = 10 * 1024 * 1024;
    if (size > maxSize) {
      this.logger.logSecurity('file_size_exceeded', {
        filename,
        size,
        maxSize,
      });
      return false;
    }

    return true;
  }

  // 验证 IP 地址是否在白名单中（可选功能）
  isIPWhitelisted(ip: string): boolean {
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    
    if (whitelist.length === 0) return true; // 如果没有配置白名单，允许所有IP
    
    return whitelist.some(whitelistIP => {
      if (whitelistIP.includes('/')) {
        // CIDR 格式支持
        return this.isIPInCIDR(ip, whitelistIP);
      }
      return ip === whitelistIP.trim();
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // 简单的 CIDR 检查实现
    // 生产环境建议使用专门的库如 ipaddr.js
    try {
      const [network, prefix] = cidr.split('/');
      const networkParts = network.split('.').map(Number);
      const ipParts = ip.split('.').map(Number);
      const prefixLength = parseInt(prefix, 10);
      
      // 简化实现，只支持 /24 网段
      if (prefixLength === 24) {
        return networkParts[0] === ipParts[0] && 
               networkParts[1] === ipParts[1] && 
               networkParts[2] === ipParts[2];
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // 检测异常用户行为
  detectAnomalousActivity(userId: string, activity: string, metadata: any): boolean {
    // 这里可以实现更复杂的异常检测逻辑
    // 例如：短时间内大量操作、异常的访问模式等
    
    this.logger.logUserAction(userId, activity, {
      ...metadata,
      timestamp: new Date().toISOString(),
      type: 'security_audit',
    });

    return true;
  }
}
