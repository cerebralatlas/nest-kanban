import { Global, Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RequestValidationGuard } from './guards/request-validation.guard';
import { InputSanitizationInterceptor } from './interceptors/input-sanitization.interceptor';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

@Global()
@Module({
  providers: [
    SecurityService,
    RateLimitGuard,
    RequestValidationGuard,
    InputSanitizationInterceptor,
    SecurityHeadersMiddleware,
  ],
  exports: [
    SecurityService,
    RateLimitGuard,
    RequestValidationGuard,
    InputSanitizationInterceptor,
    SecurityHeadersMiddleware,
  ],
})
export class SecurityModule {}
