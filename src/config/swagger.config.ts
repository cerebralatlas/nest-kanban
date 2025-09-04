import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupSwagger(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Nest Kanban API')
    .setDescription('现代化看板管理系统 API 文档')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入 JWT token',
        in: 'header',
      },
      'JWT-auth', // 这个 key 在控制器中使用
    )
    .addTag('auth', '用户认证相关接口')
    .addTag('workspaces', '工作区管理接口')
    .addTag('boards', '看板管理接口')
    .addTag('lists', '列表管理接口')
    .addTag('cards', '卡片管理接口')
    .addServer('http://localhost:3000', '开发环境')
    .addServer('https://api.example.com', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持认证状态
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Nest Kanban API Docs',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui-custom.css',
  });
}
