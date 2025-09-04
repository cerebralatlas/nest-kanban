import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { LoggingInterceptor } from './logger/logger.interceptor';

@Module({
  imports: [LoggerModule, PrismaModule, PermissionsModule, AuthModule, WorkspacesModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
