import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SecurityModule } from './security/security.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BoardsModule } from './boards/boards.module';
import { ListsModule } from './lists/lists.module';
import { CardsModule } from './cards/cards.module';
import { LoggingInterceptor } from './logger/logger.interceptor';
import { SecurityHeadersMiddleware } from './security/middleware/security-headers.middleware';
import { InputSanitizationInterceptor } from './security/interceptors/input-sanitization.interceptor';

@Module({
  imports: [LoggerModule, PrismaModule, PermissionsModule, SecurityModule, AuthModule, WorkspacesModule, BoardsModule, ListsModule, CardsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InputSanitizationInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer
    //   .apply(SecurityHeadersMiddleware)
    //   .forRoutes('*');
  }
}
