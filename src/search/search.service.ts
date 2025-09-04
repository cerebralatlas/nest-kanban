import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  SearchQueryDto,
  SearchResultDto,
  SearchResultItemDto,
  ResourceType,
  SortBy,
} from './dto';
import {
  ELASTICSEARCH_INDICES,
  WORKSPACE_INDEX_MAPPING,
  BOARD_INDEX_MAPPING,
  LIST_INDEX_MAPPING,
  CARD_INDEX_MAPPING,
} from './search.config';

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prismaService: PrismaService,
    private readonly logger: LoggerService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async onModuleInit() {
    await this.initializeIndices();
  }

  // 初始化 ES 索引
  async initializeIndices() {
    try {
      const indices = Object.values(ELASTICSEARCH_INDICES);
      
      for (const index of indices) {
        const exists = await this.elasticsearchService.indices.exists({ index });
        
        if (!exists) {
          let mapping;
          switch (index) {
            case ELASTICSEARCH_INDICES.WORKSPACE:
              mapping = WORKSPACE_INDEX_MAPPING;
              break;
            case ELASTICSEARCH_INDICES.BOARD:
              mapping = BOARD_INDEX_MAPPING;
              break;
            case ELASTICSEARCH_INDICES.LIST:
              mapping = LIST_INDEX_MAPPING;
              break;
            case ELASTICSEARCH_INDICES.CARD:
              mapping = CARD_INDEX_MAPPING;
              break;
          }

          await this.elasticsearchService.indices.create({
            index,
            mappings: mapping
          });

          this.logger.info(`Created Elasticsearch index: ${index}`);
        }
      }
    } catch (error) {
      this.logger.logError(error, 'initialize_es_indices');
    }
  }

  // 全局搜索
  async globalSearch(userId: string, query: SearchQueryDto): Promise<SearchResultDto> {
    const startTime = Date.now();

    try {
      // 1. 获取用户可访问的资源
      const accessibleResources = await this.getUserAccessibleResources(userId);

      // 2. 构建搜索查询
      const searchBody = this.buildSearchQuery(query, accessibleResources);

      // 3. 执行搜索
      const response = await this.elasticsearchService.search({
        index: Object.values(ELASTICSEARCH_INDICES).join(','),
        ...searchBody,
      });

      // 4. 处理结果
      const results = this.formatSearchResults(response.hits.hits);
      const facets = this.extractFacets(response.aggregations);

      const searchTime = Date.now() - startTime;

      this.logger.logUserAction(userId, 'global_search', {
        query: query.query,
        resultCount: results.length,
        searchTime,
      });

      return {
        message: '搜索完成',
        results,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: typeof response.hits.total === 'object' ? (response.hits.total as any).value : (response.hits.total as number),
          totalPages: Math.ceil((typeof response.hits.total === 'object' ? (response.hits.total as any).value : (response.hits.total as number)) / (query.limit || 10)),
        },
        facets,
        searchTime,
      };
    } catch (error) {
      this.logger.logError(error, 'global_search', userId);
      throw new Error('搜索失败');
    }
  }

  // 工作区内搜索
  async searchInWorkspace(workspaceId: string, userId: string, query: SearchQueryDto): Promise<SearchResultDto> {
    // 检查权限
    await this.permissionsService.assertWorkspacePermission(userId, workspaceId, 'read');

    const modifiedQuery = {
      ...query,
      workspaceId,
    };

    return this.globalSearch(userId, modifiedQuery);
  }

  // 看板内搜索
  async searchInBoard(boardId: string, userId: string, query: SearchQueryDto): Promise<SearchResultDto> {
    // 检查权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'read');

    const modifiedQuery = {
      ...query,
      boardId,
    };

    return this.globalSearch(userId, modifiedQuery);
  }

  // 构建搜索查询
  private buildSearchQuery(query: SearchQueryDto, accessibleResources: any) {
    const must = [
      {
        multi_match: {
          query: query.query,
          fields: [
            'name^3',      // 工作区、看板、列表名称权重最高
            'title^3',     // 卡片标题权重最高
            'description^2', // 描述权重中等
            'slug',        // slug 权重最低
          ],
          fuzziness: 'AUTO',
          operator: 'and' as any,
        }
      }
    ];

    const filter: any[] = [];

    // 工作区过滤
    if (query.workspaceId) {
      filter.push({
        term: { workspaceId: query.workspaceId }
      });
    }

    // 看板过滤
    if (query.boardId) {
      filter.push({
        term: { boardId: query.boardId }
      });
    }

    // 排序
    let sort;
    switch (query.sortBy) {
      case SortBy.RELEVANCE:
        sort = [{ _score: { order: 'desc' } }];
        break;
      case SortBy.DATE:
        sort = [{ createdAt: { order: 'desc' } }];
        break;
      case SortBy.NAME:
        sort = [{ 'name.keyword': { order: 'asc' } }, { 'title.keyword': { order: 'asc' } }];
        break;
      default:
        sort = [{ _score: { order: 'desc' } }];
    }

    return {
      query: {
        bool: {
          must,
          filter,
        }
      },
      highlight: {
        fields: {
          name: { fragment_size: 150, number_of_fragments: 3 },
          title: { fragment_size: 150, number_of_fragments: 3 },
          description: { fragment_size: 150, number_of_fragments: 3 },
        },
        pre_tags: ['<em>'],
        post_tags: ['</em>'],
      },
      // 暂时移除聚合以简化实现
      sort,
      size: query.limit || 10,
      from: ((query.page || 1) - 1) * (query.limit || 10),
    };
  }

  // 获取用户可访问的资源
  private async getUserAccessibleResources(userId: string) {
    // 获取用户参与的所有工作区
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    const workspaceIds = workspaceMembers.map(wm => wm.workspaceId);

    // 获取用户参与的所有看板（直接成员 + 工作区继承）
    const directBoardMembers = await this.prismaService.boardMember.findMany({
      where: { userId },
      select: { boardId: true }
    });

    const workspaceBoards = await this.prismaService.board.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { id: true }
    });

    const allBoardIds = [
      ...directBoardMembers.map(bm => bm.boardId),
      ...workspaceBoards.map(b => b.id)
    ];

    return {
      workspaceIds,
      boardIds: [...new Set(allBoardIds)], // 去重
      workspaces: workspaceMembers.map(wm => wm.workspace),
    };
  }

  // 格式化搜索结果
  private formatSearchResults(hits: any[]): SearchResultItemDto[] {
    return hits.map(hit => {
      const source = hit._source;
      const highlights = this.extractHighlights(hit.highlight);

      // 确定资源类型
      let type: ResourceType;
      if (hit._index.includes('workspace')) type = ResourceType.WORKSPACE;
      else if (hit._index.includes('board')) type = ResourceType.BOARD;
      else if (hit._index.includes('list')) type = ResourceType.LIST;
      else if (hit._index.includes('card')) type = ResourceType.CARD;
      else type = ResourceType.CARD; // 默认

      return {
        id: source.id,
        type,
        title: source.name || source.title,
        description: source.description,
        highlights,
        context: {
          workspace: source.workspace,
          board: source.board,
          list: source.list,
        },
        metadata: {
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
          createdBy: source.createdBy,
          assignedTo: source.assignee,
        },
        relevanceScore: hit._score,
      };
    });
  }

  // 提取高亮信息
  private extractHighlights(highlight: any): string[] {
    if (!highlight) return [];

    const highlights: string[] = [];
    Object.values(highlight).forEach((fragments: any) => {
      if (Array.isArray(fragments)) {
        highlights.push(...fragments);
      }
    });

    return highlights;
  }

  // 提取聚合信息（简化版本）
  private extractFacets(aggregations: any): any {
    return {
      resourceTypes: [],
      workspaces: [],
      dateRanges: [],
    };
  }

  // 数据同步方法
  async indexWorkspace(workspace: any) {
    try {
      // 获取工作区成员信息用于权限索引
      const members = await this.prismaService.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: {
          user: {
            select: { id: true, username: true, email: true }
          }
        }
      });

      const document = {
        ...workspace,
        memberIds: members.map(m => m.userId),
        memberRoles: members.map(m => ({
          userId: m.userId,
          role: m.role,
        })),
        accessibleBy: members.map(m => m.userId),
      };

      await this.elasticsearchService.index({
        index: ELASTICSEARCH_INDICES.WORKSPACE,
        id: workspace.id,
        document,
      });

      this.logger.info('Indexed workspace to ES', { workspaceId: workspace.id });
    } catch (error) {
      this.logger.logError(error, 'index_workspace');
    }
  }

  async indexBoard(board: any) {
    try {
      // 获取看板的权限信息
      const workspace = await this.prismaService.workspace.findUnique({
        where: { id: board.workspaceId },
        include: {
          members: {
            select: { userId: true }
          }
        }
      });

      const boardMembers = await this.prismaService.boardMember.findMany({
        where: { boardId: board.id },
        select: { userId: true }
      });

      const workspaceMemberIds = workspace?.members.map(m => m.userId) || [];
      const directMemberIds = boardMembers.map(m => m.userId);
      const allAccessibleIds = [...new Set([...workspaceMemberIds, ...directMemberIds])];

      const document = {
        ...board,
        directMemberIds,
        workspaceMemberIds,
        accessibleBy: allAccessibleIds,
        workspace: workspace ? {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        } : null,
      };

      await this.elasticsearchService.index({
        index: ELASTICSEARCH_INDICES.BOARD,
        id: board.id,
        document,
      });

      this.logger.info('Indexed board to ES', { boardId: board.id });
    } catch (error) {
      this.logger.logError(error, 'index_board');
    }
  }

  async indexList(list: any) {
    try {
      // 获取列表的权限信息（继承看板权限）
      const board = await this.prismaService.board.findUnique({
        where: { id: list.boardId },
        include: {
          workspace: {
            include: {
              members: { select: { userId: true } }
            }
          },
          members: { select: { userId: true } }
        }
      });

      if (!board) return;

      const workspaceMemberIds = board.workspace.members.map(m => m.userId);
      const boardMemberIds = board.members.map(m => m.userId);
      const allAccessibleIds = [...new Set([...workspaceMemberIds, ...boardMemberIds])];

      const document = {
        ...list,
        boardId: board.id,
        workspaceId: board.workspaceId,
        accessibleBy: allAccessibleIds,
        workspace: {
          id: board.workspace.id,
          name: board.workspace.name,
          slug: board.workspace.slug,
        },
        board: {
          id: board.id,
          name: board.name,
        },
      };

      await this.elasticsearchService.index({
        index: ELASTICSEARCH_INDICES.LIST,
        id: list.id,
        document,
      });

      this.logger.info('Indexed list to ES', { listId: list.id });
    } catch (error) {
      this.logger.logError(error, 'index_list');
    }
  }

  async indexCard(card: any) {
    try {
      // 获取卡片的完整上下文信息
      const cardWithContext = await this.prismaService.card.findUnique({
        where: { id: card.id },
        include: {
          list: {
            include: {
              board: {
                include: {
                  workspace: {
                    include: {
                      members: { select: { userId: true } }
                    }
                  },
                  members: { select: { userId: true } }
                }
              }
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
            }
          }
        }
      });

      if (!cardWithContext) return;

      const { list } = cardWithContext;
      const { board } = list;
      const { workspace } = board;

      const workspaceMemberIds = workspace.members.map(m => m.userId);
      const boardMemberIds = board.members.map(m => m.userId);
      const allAccessibleIds = [...new Set([...workspaceMemberIds, ...boardMemberIds])];

      const document = {
        ...card,
        listId: list.id,
        boardId: board.id,
        workspaceId: workspace.id,
        accessibleBy: allAccessibleIds,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        },
        board: {
          id: board.id,
          name: board.name,
        },
        list: {
          id: list.id,
          name: list.name,
        },
        assignee: cardWithContext.assignee,
      };

      await this.elasticsearchService.index({
        index: ELASTICSEARCH_INDICES.CARD,
        id: card.id,
        document,
      });

      this.logger.info('Indexed card to ES', { cardId: card.id });
    } catch (error) {
      this.logger.logError(error, 'index_card');
    }
  }

  // 删除索引
  async deleteFromIndex(id: string, type: ResourceType) {
    try {
      const index = ELASTICSEARCH_INDICES[type.toUpperCase()];
      await this.elasticsearchService.delete({
        index,
        id,
      });

      this.logger.info('Deleted from ES index', { id, type });
    } catch (error) {
      // 如果文档不存在，忽略错误
      if (error.meta?.statusCode !== 404) {
        this.logger.logError(error, 'delete_from_index');
      }
    }
  }

  // 批量索引现有数据
  async reindexAllData() {
    this.logger.info('Starting full reindex...');

    try {
      // 索引所有工作区
      const workspaces = await this.prismaService.workspace.findMany();
      for (const workspace of workspaces) {
        await this.indexWorkspace(workspace);
      }

      // 索引所有看板
      const boards = await this.prismaService.board.findMany();
      for (const board of boards) {
        await this.indexBoard(board);
      }

      // 索引所有列表
      const lists = await this.prismaService.list.findMany();
      for (const list of lists) {
        await this.indexList(list);
      }

      // 索引所有卡片
      const cards = await this.prismaService.card.findMany();
      for (const card of cards) {
        await this.indexCard(card);
      }

      this.logger.info('Full reindex completed');
    } catch (error) {
      this.logger.logError(error, 'reindex_all_data');
      throw new Error('重新索引失败');
    }
  }
}
