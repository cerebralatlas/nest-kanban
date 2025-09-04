export const ELASTICSEARCH_INDICES = {
  WORKSPACE: 'kanban-workspaces',
  BOARD: 'kanban-boards',
  LIST: 'kanban-lists',
  CARD: 'kanban-cards',
} as const;

export const WORKSPACE_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    description: { 
      type: 'text',
      analyzer: 'standard'
    },
    slug: { type: 'keyword' },
    ownerId: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // 权限相关字段
    memberIds: { type: 'keyword' }, // 所有成员ID列表
    memberRoles: { // 成员角色映射
      type: 'object',
      properties: {
        userId: { type: 'keyword' },
        role: { type: 'keyword' }
      }
    }
  }
};

export const BOARD_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    description: { 
      type: 'text',
      analyzer: 'standard'
    },
    workspaceId: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // 权限相关字段
    accessibleBy: { type: 'keyword' }, // 可访问的用户ID列表
    directMemberIds: { type: 'keyword' }, // 看板直接成员
    workspaceMemberIds: { type: 'keyword' }, // 工作区继承成员
  }
};

export const LIST_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    order: { type: 'integer' },
    boardId: { type: 'keyword' },
    workspaceId: { type: 'keyword' }, // 冗余字段便于权限过滤
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // 权限相关字段
    accessibleBy: { type: 'keyword' },
  }
};

export const CARD_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    title: { 
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    description: { 
      type: 'text',
      analyzer: 'standard'
    },
    order: { type: 'integer' },
    listId: { type: 'keyword' },
    boardId: { type: 'keyword' }, // 冗余字段便于权限过滤
    workspaceId: { type: 'keyword' }, // 冗余字段便于权限过滤
    assigneeId: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // 权限相关字段
    accessibleBy: { type: 'keyword' },
    // 关联信息（便于搜索结果显示）
    workspace: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        slug: { type: 'keyword' }
      }
    },
    board: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' }
      }
    },
    list: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' }
      }
    },
    assignee: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        username: { type: 'keyword' },
        email: { type: 'keyword' }
      }
    }
  }
};
