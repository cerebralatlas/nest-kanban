# Nest Kanban

企业级看板管理系统后端 API，基于 NestJS + Fastify + Prisma 构建。

## 项目概述

这是一个功能完整的看板管理系统，支持多团队协作、细粒度权限控制和完整的任务管理工作流。系统采用现代化的技术栈和企业级的架构设计，可直接投入生产环境使用。

## 核心功能

### 认证与授权

- 用户注册和登录系统
- JWT 认证和 Passport 策略
- 四层级权限继承机制
- 混合权限模型（角色权限 + 个人所有权）

### 业务功能

- 工作区管理：创建、管理团队工作空间
- 看板管理：项目看板的完整生命周期
- 列表管理：任务列表的组织和排序
- 卡片管理：任务的创建、分配、移动和跟踪

### 技术特性

- 高性能 Fastify 服务器
- 类型安全的 Prisma ORM
- 结构化 Pino 日志系统
- 完整的 Swagger API 文档
- 企业级安全审计

## 系统架构

### 整体架构图

### 数据模型关系图

### 权限继承架构

## 环境要求

- Node.js >= 18
- PostgreSQL >= 13
- pnpm >= 8

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd nest-kanban
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 环境配置

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kanban?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
LOG_LEVEL="debug"
NODE_ENV="development"
```

### 4. 数据库初始化

```bash
npx prisma generate
npx prisma db push
```

### 5. 启动应用

```bash
pnpm run start:dev
```

应用将在 <http://localhost:3000> 启动，Swagger 文档可在 <http://localhost:3000/api-docs> 访问。

## API 文档

### 主要端点

#### 认证相关

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/profile` - 获取用户信息

#### 工作区管理

- `POST /workspaces` - 创建工作区
- `GET /workspaces` - 获取工作区列表
- `GET /workspaces/:id` - 获取工作区详情
- `PATCH /workspaces/:id` - 更新工作区
- `DELETE /workspaces/:id` - 删除工作区

#### 工作区成员

- `POST /workspaces/:id/members` - 邀请成员
- `GET /workspaces/:id/members` - 获取成员列表
- `PATCH /workspaces/:id/members/:userId` - 更新成员角色
- `DELETE /workspaces/:id/members/:userId` - 移除成员

#### 看板管理

- `POST /workspaces/:workspaceId/boards` - 创建看板
- `GET /workspaces/:workspaceId/boards` - 获取看板列表
- `GET /boards/:id` - 获取看板详情
- `PATCH /boards/:id` - 更新看板
- `DELETE /boards/:id` - 删除看板

#### 看板成员

- `POST /boards/:id/members` - 添加看板成员
- `GET /boards/:id/members` - 获取看板成员
- `PATCH /boards/:id/members/:userId` - 更新成员角色
- `DELETE /boards/:id/members/:userId` - 移除成员

#### 列表管理

- `POST /boards/:boardId/lists` - 创建列表
- `GET /boards/:boardId/lists` - 获取列表
- `GET /lists/:id` - 获取列表详情
- `PATCH /lists/:id` - 更新列表
- `DELETE /lists/:id` - 删除列表
- `PATCH /boards/:boardId/lists/reorder` - 重排序列表

#### 卡片管理

- `POST /lists/:listId/cards` - 创建卡片
- `GET /lists/:listId/cards` - 获取卡片列表
- `GET /cards/:id` - 获取卡片详情
- `PATCH /cards/:id` - 更新卡片
- `DELETE /cards/:id` - 删除卡片
- `PATCH /cards/:id/move` - 移动卡片
- `PATCH /cards/:id/assign` - 分配卡片

完整的 API 文档请访问：<http://localhost:3000/api-docs>

## 项目结构

```
src/
├── auth/                 # 认证模块
│   ├── dto/             # 认证相关 DTO
│   ├── strategies/      # JWT 策略
│   └── decorators/      # 用户装饰器
├── workspaces/          # 工作区模块
│   ├── dto/             # 工作区 DTO
│   ├── workspaces.controller.ts
│   ├── workspaces.service.ts
│   └── workspaces.module.ts
├── boards/              # 看板模块
│   ├── dto/             # 看板 DTO
│   ├── boards.controller.ts
│   ├── boards.service.ts
│   └── boards.module.ts
├── lists/               # 列表模块
│   ├── dto/             # 列表 DTO
│   ├── lists.controller.ts
│   ├── lists.service.ts
│   └── lists.module.ts
├── cards/               # 卡片模块
│   ├── dto/             # 卡片 DTO
│   ├── cards.controller.ts
│   ├── cards.service.ts
│   └── cards.module.ts
├── permissions/         # 权限模块
│   ├── permissions.service.ts
│   └── permissions.module.ts
├── guards/              # 全局守卫
│   ├── jwt-auth.guard.ts
│   ├── workspace.guard.ts
│   ├── board.guard.ts
│   └── resource-ownership.guard.ts
├── decorators/          # 全局装饰器
├── config/              # 配置文件
├── logger/              # 日志模块
├── prisma/              # 数据库模块
└── main.ts              # 应用入口
```

## 权限系统

### 权限角色

#### 工作区角色

- **OWNER**: 工作区所有者，拥有所有权限
- **MEMBER**: 工作区成员，可以创建和编辑内容
- **VIEWER**: 工作区访客，只能查看内容

#### 看板角色

- **ADMIN**: 看板管理员，可以管理看板和成员
- **MEMBER**: 看板成员，可以编辑内容
- **VIEWER**: 看板访客，只能查看内容

### 权限继承规则

1. **工作区 OWNER** → 自动继承所有看板的 **ADMIN** 权限
2. **工作区 MEMBER** → 自动继承所有看板的 **MEMBER** 权限
3. **工作区 VIEWER** → 自动继承所有看板的 **VIEWER** 权限
4. **看板直接权限** > **工作区继承权限**（权限覆盖）
5. **卡片分配者** 拥有对分配给自己卡片的特殊编辑权限

### 个人所有权

卡片系统支持个人所有权概念：

- 任何用户都可以编辑分配给自己的卡片
- 即使是 VIEWER 角色也可以修改自己的卡片
- 这突破了传统角色限制，提供更灵活的协作体验

## 技术特性

### 高性能架构

- **Fastify**: 比 Express 快 2-3 倍的 HTTP 服务器
- **Prisma**: 类型安全的数据库访问，优化查询性能
- **事务处理**: 关键操作使用数据库事务确保一致性
- **索引优化**: 针对排序和查询的数据库索引优化

### 安全特性

- **JWT 认证**: 无状态的身份验证机制
- **密码加密**: 使用 bcrypt 进行密码哈希
- **权限验证**: 每个 API 都有严格的权限检查
- **安全审计**: 完整的操作日志和安全事件记录
- **输入验证**: 使用 class-validator 进行数据验证

### 开发体验

- **TypeScript**: 100% 类型安全
- **Swagger 文档**: 完整的 API 文档和测试界面
- **模块化设计**: 清晰的模块边界和依赖关系
- **错误处理**: 统一的错误响应格式
- **日志系统**: 结构化日志便于调试和监控

## 开发和部署

### 开发命令

```bash
# 开发模式（热重载）
pnpm run start:dev

# 生产构建
pnpm run build

# 生产模式
pnpm run start:prod

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format

# 运行测试
pnpm run test
```

### 数据库管理

```bash
# 查看数据库
npx prisma studio

# 重置数据库
npx prisma db push --force-reset

# 生成客户端
npx prisma generate
```
