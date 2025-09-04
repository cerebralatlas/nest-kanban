import { Module, Global } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      } : undefined,
      requestTimeout: 60000,
      pingTimeout: 60000,
      sniffOnStart: false,
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, PrismaService],
  exports: [SearchService],
})
export class SearchModule {}
