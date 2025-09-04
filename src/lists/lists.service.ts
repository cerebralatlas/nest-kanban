import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  CreateListDto,
  UpdateListDto,
  ListQueryDto,
  ReorderListsDto,
} from './dto';

@Injectable()
export class ListsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private permissionsService: PermissionsService,
  ) {}

  async create(boardId: string, userId: string, createListDto: CreateListDto) {
    // 检查用户是否有在看板中创建列表的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'write');

    const { name } = createListDto;

    try {
      // 获取当前看板中列表的最大排序值
      const maxOrder = await this.prisma.list.aggregate({
        where: { boardId },
        _max: { order: true },
      });

      const newOrder = (maxOrder._max.order || 0) + 1;

      const list = await this.prisma.list.create({
        data: {
          name,
          order: newOrder,
          boardId,
        },
        include: {
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            }
          },
          _count: {
            select: {
              cards: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'create_list', {
        listId: list.id,
        listName: name,
        boardId,
        order: newOrder,
      });

      return {
        message: '列表创建成功',
        list,
      };
    } catch (error) {
      this.logger.logError(error, 'create_list', userId);
      throw new BadRequestException('创建列表失败');
    }
  }

  async findAllByBoard(boardId: string, userId: string, query: ListQueryDto) {
    // 检查用户是否有访问看板的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'read');

    const { search, page = 1, limit = 20, includeCards = false } = query;
    const skip = (page - 1) * limit;

    const where = {
      boardId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const }
      })
    };

    const [lists, total] = await Promise.all([
      this.prisma.list.findMany({
        where,
        include: {
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            }
          },
          ...(includeCards && {
            cards: {
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                assigneeId: true,
                assignee: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                  }
                },
                createdAt: true,
                updatedAt: true,
              },
              orderBy: {
                order: 'asc',
              }
            }
          }),
          _count: {
            select: {
              cards: true,
            }
          }
        },
        orderBy: {
          order: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.list.count({ where }),
    ]);

    return {
      message: '获取列表成功',
      data: lists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(listId: string, userId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
          }
        },
        cards: {
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              }
            },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            order: 'asc',
          }
        },
        _count: {
          select: {
            cards: true,
          }
        }
      }
    });

    if (!list) {
      throw new NotFoundException('列表不存在');
    }

    // 通过列表反查看板权限
    await this.permissionsService.assertBoardPermission(userId, list.boardId, 'read');

    return {
      message: '获取列表详情成功',
      list,
    };
  }

  async update(listId: string, userId: string, updateListDto: UpdateListDto) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) {
      throw new NotFoundException('列表不存在');
    }

    // 通过列表反查看板权限
    await this.permissionsService.assertBoardPermission(userId, list.boardId, 'write');

    try {
      const updatedList = await this.prisma.list.update({
        where: { id: listId },
        data: updateListDto,
        include: {
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            }
          },
          _count: {
            select: {
              cards: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'update_list', {
        listId,
        boardId: list.boardId,
        updates: updateListDto,
      });

      return {
        message: '列表更新成功',
        list: updatedList,
      };
    } catch (error) {
      this.logger.logError(error, 'update_list', userId);
      throw new BadRequestException('更新列表失败');
    }
  }

  async remove(listId: string, userId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { 
        boardId: true,
        order: true,
      }
    });

    if (!list) {
      throw new NotFoundException('列表不存在');
    }

    // 通过列表反查看板权限
    await this.permissionsService.assertBoardPermission(userId, list.boardId, 'write');

    try {
      await this.prisma.$transaction(async (tx) => {
        // 删除列表（会级联删除所有卡片）
        await tx.list.delete({
          where: { id: listId }
        });

        // 更新其他列表的排序（将大于当前order的列表order减1）
        await tx.list.updateMany({
          where: {
            boardId: list.boardId,
            order: { gt: list.order }
          },
          data: {
            order: { decrement: 1 }
          }
        });
      });

      this.logger.logUserAction(userId, 'delete_list', {
        listId,
        boardId: list.boardId,
      });

      return {
        message: '列表删除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'delete_list', userId);
      throw new BadRequestException('删除列表失败');
    }
  }

  async reorderLists(boardId: string, userId: string, reorderDto: ReorderListsDto) {
    // 检查用户是否有在看板中重排序的权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'write');

    const { lists } = reorderDto;

    // 验证所有列表都属于同一看板
    const listIds = lists.map(item => item.id);
    const existingLists = await this.prisma.list.findMany({
      where: {
        id: { in: listIds },
        boardId,
      },
      select: { id: true }
    });

    if (existingLists.length !== listIds.length) {
      throw new BadRequestException('部分列表不属于此看板');
    }

    try {
      // 使用事务批量更新排序
      await this.prisma.$transaction(async (tx) => {
        for (const item of lists) {
          await tx.list.update({
            where: { id: item.id },
            data: { order: item.order }
          });
        }
      });

      this.logger.logUserAction(userId, 'reorder_lists', {
        boardId,
        listCount: lists.length,
        newOrder: lists.map(l => ({ id: l.id, order: l.order })),
      });

      return {
        message: '列表重排序成功',
      };
    } catch (error) {
      this.logger.logError(error, 'reorder_lists', userId);
      throw new BadRequestException('列表重排序失败');
    }
  }

  // 辅助方法：通过列表ID获取看板ID
  async getBoardIdByListId(listId: string): Promise<string> {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) {
      throw new NotFoundException('列表不存在');
    }

    return list.boardId;
  }

  // 辅助方法：验证列表访问权限
  async validateListAccess(listId: string, userId: string, action: 'read' | 'write' | 'admin' | 'delete') {
    const boardId = await this.getBoardIdByListId(listId);
    await this.permissionsService.assertBoardPermission(userId, boardId, action);
    return boardId;
  }
}
