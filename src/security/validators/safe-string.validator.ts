import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isSafeString', async: false })
export class IsSafeStringConstraint implements ValidatorConstraintInterface {
  validate(text: string): boolean {
    if (typeof text !== 'string') return false;
    
    // 检测潜在的恶意模式
    const dangerousPatterns = [
      // HTML/JavaScript 注入
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      
      // SQL 注入基础模式
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
      /(--|\#|\/\*|\*\/)/,
      
      // 路径遍历
      /(\.\.[\/\\])/,
      
      // 过长字符串（DoS 防护）
      /.{5000,}/,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(text));
  }

  defaultMessage(): string {
    return '输入包含不安全的内容';
  }
}

export function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeStringConstraint,
    });
  };
}

// 安全的邮箱验证
@ValidatorConstraint({ name: 'isSafeEmail', async: false })
export class IsSafeEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    if (typeof email !== 'string') return false;
    
    // 基本邮箱格式验证
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    
    // 长度限制
    if (email.length > 254) return false;
    
    // 检测恶意模式
    const maliciousPatterns = [
      /javascript:/i,
      /<script/i,
      /\bexec\b/i,
      /\beval\b/i,
    ];
    
    return !maliciousPatterns.some(pattern => pattern.test(email));
  }

  defaultMessage(): string {
    return '邮箱格式不安全或无效';
  }
}

export function IsSafeEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeEmailConstraint,
    });
  };
}
