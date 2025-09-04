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
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  AssignCardDto,
  CardQueryDto,
} from './dto';

@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private permissionsService: PermissionsService,
  ) {}

  async create(listId: string, userId: string, createCardDto: CreateCardDto) {
    // 通过列表ID反查看板权限
    const boardId = await this.getBoardIdByListId(listId);
    await this.permissionsService.assertBoardPermission(userId, boardId, 'write');

    const { title, description, assignToSelf = false } = createCardDto;

    try {
      // 获取当前列表中卡片的最大排序值
      const maxOrder = await this.prisma.card.aggregate({
        where: { listId },
        _max: { order: true },
      });

      const newOrder = (maxOrder._max.order || 0) + 1;

      const card = await this.prisma.card.create({
        data: {
          title,
          description,
          order: newOrder,
          listId,
          assigneeId: assignToSelf ? userId : null,
        },
        include: {
          list: {
            select: {
              id: true,
              name: true,
              boardId: true,
              board: {
                select: {
                  id: true,
                  name: true,
                  workspaceId: true,
                }
              }
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'create_card', {
        cardId: card.id,
        cardTitle: title,
        listId,
        boardId,
        assignedToSelf: assignToSelf,
        order: newOrder,
      });

      return {
        message: '卡片创建成功',
        card,
      };
    } catch (error) {
      this.logger.logError(error, 'create_card', userId);
      throw new BadRequestException('创建卡片失败');
    }
  }

  async findAllByList(listId: string, userId: string, query: CardQueryDto) {
    // 通过列表ID反查看板权限
    const boardId = await this.getBoardIdByListId(listId);
    await this.permissionsService.assertBoardPermission(userId, boardId, 'read');

    const { search, page = 1, limit = 20, sortBy = 'order', sortOrder = 'asc', assignedToMe = false, unassigned = false } = query;
    const skip = (page - 1) * limit;

    const where = {
      listId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ]
      }),
      ...(assignedToMe && { assigneeId: userId }),
      ...(unassigned && { assigneeId: null }),
    };

    const [cards, total] = await Promise.all([
      this.prisma.card.findMany({
        where,
        include: {
          list: {
            select: {
              id: true,
              name: true,
              boardId: true,
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.card.count({ where }),
    ]);

    return {
      message: '获取卡片列表成功',
      data: cards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            id: true,
            name: true,
            boardId: true,
            board: {
              select: {
                id: true,
                name: true,
                workspaceId: true,
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    // 通过卡片反查看板权限
    await this.permissionsService.assertBoardPermission(userId, card.list.boardId, 'read');

    return {
      message: '获取卡片详情成功',
      card,
    };
  }

  async update(cardId: string, userId: string, updateCardDto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            boardId: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    // 检查权限：看板 ADMIN/MEMBER 权限 或 卡片分配者
    const boardId = card.list.boardId;
    const hasGeneralPermission = await this.checkBoardWritePermission(userId, boardId);
    const isAssignee = card.assigneeId === userId;

    if (!hasGeneralPermission && !isAssignee) {
      throw new ForbiddenException('无权修改此卡片');
    }

    // 如果更新分配者，验证目标用户是看板成员
    if (updateCardDto.assigneeId !== undefined && updateCardDto.assigneeId !== null) {
      await this.validateAssigneeIsBoardMember(updateCardDto.assigneeId, boardId);
    }

    try {
      const updatedCard = await this.prisma.card.update({
        where: { id: cardId },
        data: updateCardDto,
        include: {
          list: {
            select: {
              id: true,
              name: true,
              boardId: true,
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'update_card', {
        cardId,
        boardId,
        updates: updateCardDto,
        isAssignee,
      });

      return {
        message: '卡片更新成功',
        card: updatedCard,
      };
    } catch (error) {
      this.logger.logError(error, 'update_card', userId);
      throw new BadRequestException('更新卡片失败');
    }
  }

  async remove(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            boardId: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    // 检查权限：看板 ADMIN 权限 或 卡片创建者（这里简化为分配者）
    const boardId = card.list.boardId;
    const hasAdminPermission = await this.checkBoardAdminPermission(userId, boardId);
    const isAssignee = card.assigneeId === userId;

    if (!hasAdminPermission && !isAssignee) {
      throw new ForbiddenException('只有看板管理员或卡片分配者可以删除卡片');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // 删除卡片
        await tx.card.delete({
          where: { id: cardId }
        });

        // 更新其他卡片的排序（将大于当前order的卡片order减1）
        await tx.card.updateMany({
          where: {
            listId: card.listId,
            order: { gt: card.order }
          },
          data: {
            order: { decrement: 1 }
          }
        });
      });

      this.logger.logUserAction(userId, 'delete_card', {
        cardId,
        boardId,
        isAssignee,
      });

      return {
        message: '卡片删除成功',
      };
    } catch (error) {
      this.logger.logError(error, 'delete_card', userId);
      throw new BadRequestException('删除卡片失败');
    }
  }

  async move(cardId: string, userId: string, moveCardDto: MoveCardDto) {
    const { targetListId, targetOrder } = moveCardDto;

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            id: true,
            boardId: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const targetList = await this.prisma.list.findUnique({
      where: { id: targetListId },
      select: { boardId: true }
    });

    if (!targetList) {
      throw new NotFoundException('目标列表不存在');
    }

    // 检查用户是否有移动权限
    const sourceBoardId = card.list.boardId;
    const targetBoardId = targetList.boardId;

    // 如果是跨看板移动，需要验证两个看板的权限
    if (sourceBoardId !== targetBoardId) {
      await this.permissionsService.assertBoardPermission(userId, sourceBoardId, 'write');
      await this.permissionsService.assertBoardPermission(userId, targetBoardId, 'write');
    } else {
      await this.permissionsService.assertBoardPermission(userId, sourceBoardId, 'write');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const sourceListId = card.listId;
        const sourceOrder = card.order;

        // 如果在同一列表内移动
        if (sourceListId === targetListId) {
          if (targetOrder && targetOrder !== sourceOrder) {
            // 同列表内重排序
            if (targetOrder < sourceOrder) {
              // 向前移动：目标位置到原位置之间的卡片order+1
              await tx.card.updateMany({
                where: {
                  listId: sourceListId,
                  order: {
                    gte: targetOrder,
                    lt: sourceOrder,
                  }
                },
                data: { order: { increment: 1 } }
              });
            } else {
              // 向后移动：原位置到目标位置之间的卡片order-1
              await tx.card.updateMany({
                where: {
                  listId: sourceListId,
                  order: {
                    gt: sourceOrder,
                    lte: targetOrder,
                  }
                },
                data: { order: { decrement: 1 } }
              });
            }

            // 更新目标卡片的位置
            await tx.card.update({
              where: { id: cardId },
              data: { order: targetOrder }
            });
          }
        } else {
          // 跨列表移动
          // 1. 更新源列表中后续卡片的排序
          await tx.card.updateMany({
            where: {
              listId: sourceListId,
              order: { gt: sourceOrder }
            },
            data: { order: { decrement: 1 } }
          });

          // 2. 计算目标位置
          const finalTargetOrder = targetOrder || (await this.getNextOrderInList(tx, targetListId));

          // 3. 更新目标列表中后续卡片的排序
          if (targetOrder) {
            await tx.card.updateMany({
              where: {
                listId: targetListId,
                order: { gte: finalTargetOrder }
              },
              data: { order: { increment: 1 } }
            });
          }

          // 4. 移动卡片
          await tx.card.update({
            where: { id: cardId },
            data: {
              listId: targetListId,
              order: finalTargetOrder,
            }
          });
        }
      });

      this.logger.logUserAction(userId, 'move_card', {
        cardId,
        sourceListId: card.listId,
        targetListId,
        sourceBoardId,
        targetBoardId,
        targetOrder,
        isCrossBoard: sourceBoardId !== targetBoardId,
      });

      return {
        message: '卡片移动成功',
      };
    } catch (error) {
      this.logger.logError(error, 'move_card', userId);
      throw new BadRequestException('移动卡片失败');
    }
  }

  async assign(cardId: string, userId: string, assignCardDto: AssignCardDto) {
    const { assigneeId } = assignCardDto;

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            boardId: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    const boardId = card.list.boardId;

    // 检查权限：看板 ADMIN/MEMBER 权限
    await this.permissionsService.assertBoardPermission(userId, boardId, 'write');

    // 如果分配给其他用户，验证目标用户是看板成员
    if (assigneeId && assigneeId !== userId) {
      await this.validateAssigneeIsBoardMember(assigneeId, boardId);
    }

    try {
      const updatedCard = await this.prisma.card.update({
        where: { id: cardId },
        data: { assigneeId },
        include: {
          list: {
            select: {
              id: true,
              name: true,
              boardId: true,
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            }
          }
        }
      });

      this.logger.logUserAction(userId, 'assign_card', {
        cardId,
        boardId,
        assigneeId,
        previousAssigneeId: card.assigneeId,
        isSelfAssignment: assigneeId === userId,
      });

      return {
        message: assigneeId ? '卡片分配成功' : '卡片取消分配成功',
        card: updatedCard,
      };
    } catch (error) {
      this.logger.logError(error, 'assign_card', userId);
      throw new BadRequestException('分配卡片失败');
    }
  }

  // 辅助方法
  private async getBoardIdByListId(listId: string): Promise<string> {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) {
      throw new NotFoundException('列表不存在');
    }

    return list.boardId;
  }

  private async getBoardIdByCardId(cardId: string): Promise<string> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            boardId: true,
          }
        }
      }
    });

    if (!card) {
      throw new NotFoundException('卡片不存在');
    }

    return card.list.boardId;
  }

  private async checkBoardWritePermission(userId: string, boardId: string): Promise<boolean> {
    try {
      await this.permissionsService.assertBoardPermission(userId, boardId, 'write');
      return true;
    } catch {
      return false;
    }
  }

  private async checkBoardAdminPermission(userId: string, boardId: string): Promise<boolean> {
    try {
      await this.permissionsService.assertBoardPermission(userId, boardId, 'admin');
      return true;
    } catch {
      return false;
    }
  }

  private async validateAssigneeIsBoardMember(assigneeId: string, boardId: string): Promise<void> {
    // 检查用户是否是看板成员（直接成员或工作区继承成员）
    const { role } = await this.permissionsService.getUserBoardRole(assigneeId, boardId);
    
    if (!role) {
      throw new BadRequestException('只能将卡片分配给看板成员');
    }
  }

  private async getNextOrderInList(tx: any, listId: string): Promise<number> {
    const maxOrder = await tx.card.aggregate({
      where: { listId },
      _max: { order: true },
    });
    
    return (maxOrder._max.order || 0) + 1;
  }

  // 验证卡片访问权限
  async validateCardAccess(cardId: string, userId: string, action: 'read' | 'write' | 'admin' | 'delete') {
    const boardId = await this.getBoardIdByCardId(cardId);
    await this.permissionsService.assertBoardPermission(userId, boardId, action);
    return boardId;
  }
}
