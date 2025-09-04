import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // 安全头配置
    const securityHeaders = {
      // 防止点击劫持
      'X-Frame-Options': 'DENY',
      
      // 防止 MIME 类型嗅探
      'X-Content-Type-Options': 'nosniff',
      
      // XSS 保护
      'X-XSS-Protection': '1; mode=block',
      
      // 严格传输安全（HTTPS）
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // 内容安全策略
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Swagger 需要内联脚本
        "style-src 'self' 'unsafe-inline'",  // Swagger 需要内联样式
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'",
      ].join('; '),
      
      // 推荐人策略
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // 权限策略
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
      ].join(', '),
      
      // 移除服务器信息
      'Server': 'NestJS',
      
      // API 版本
      'X-API-Version': process.env.npm_package_version || '1.0.0',
    };

    // 设置安全头
    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.header(header, value);
    });

    // 移除可能泄露信息的头
    res.removeHeader('X-Powered-By');
    
    next();
  }
}
