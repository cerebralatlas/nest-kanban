# 📋 Nest Kanban

一个基于 NestJS + Fastify + Prisma 构建的现代化看板管理系统后端 API。

## ✨ 功能特性

### 🔐 认证系统

- **用户注册/登录** - 支持邮箱和用户名登录
- **JWT 认证** - 基于 JSON Web Token 的身份验证
- **密码加密** - 使用 bcrypt 安全加密
- **Passport 集成** - 完整的认证策略

### 🏗️ 权限管理

- **工作区权限** - Owner/Member/Viewer 三级权限
- **看板权限** - Admin/Member/Viewer 细粒度控制
- **权限继承** - 工作区权限自动继承到看板
- **灵活覆盖** - 可为特定看板设置独立权限

### 📊 数据模型

- **用户管理** - 完整的用户信息管理
- **工作区** - 团队协作的顶层容器
- **看板** - 项目管理的核心载体
- **列表和卡片** - 灵活的任务组织结构

### 🚀 技术栈

- **NestJS** - 现代化的 Node.js 框架
- **Fastify** - 高性能 HTTP 服务器
- **Prisma** - 类型安全的 ORM
- **PostgreSQL** - 可靠的关系型数据库
- **Pino** - 高性能日志系统

### 📝 日志系统

- **结构化日志** - JSON 格式的生产级日志
- **开发友好** - 彩色格式化的开发环境日志
- **安全脱敏** - 自动隐藏敏感信息
- **性能监控** - API 请求和响应时间记录
- **安全审计** - 登录失败和安全事件记录

## 🛠️ 环境要求

- Node.js >= 18
- PostgreSQL >= 13
- pnpm >= 8

## 📦 安装和启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境配置

创建 `.env` 文件：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/nest_kanban?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Log Level (可选)
LOG_LEVEL="debug"
NODE_ENV="development"
```

### 3. 数据库设置

```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma db push

# (可选) 查看数据库
npx prisma studio
```

### 4. 启动应用

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run start:prod

# 调试模式
pnpm run start:debug
```

## 🧪 测试

```bash
# 单元测试
pnpm run test

# e2e 测试
pnpm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 🔌 API 接口

### 认证接口

#### 用户注册

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "testuser",
  "password": "123456",
  "avatar": "https://example.com/avatar.jpg" // 可选
}
```

#### 用户登录

```http
POST /auth/login
Content-Type: application/json

{
  "emailOrUsername": "user@example.com", // 支持邮箱或用户名
  "password": "123456"
}
```

#### 获取用户信息

```http
GET /auth/profile
Authorization: Bearer <your-jwt-token>
```

## 📁 项目结构

```
src/
├── auth/              # 认证模块
│   ├── dto/          # 数据传输对象
│   ├── strategies/   # Passport 策略
│   └── decorators/   # 自定义装饰器
├── config/           # 配置文件
│   ├── fastify.config.ts
│   └── logger.config.ts
├── guards/           # 全局守卫
├── logger/           # 日志模块
├── prisma/           # 数据库模块
└── decorators/       # 全局装饰器
```

## 🗄️ 数据模型

项目采用简化的权限模型：

- **User** - 用户基础信息
- **Workspace** - 工作区（团队容器）
- **WorkspaceMember** - 工作区成员关系
- **Board** - 看板
- **BoardMember** - 看板成员关系  
- **List** - 列表
- **Card** - 卡片

权限层级：`工作区权限` → `看板权限` → `内容访问`

## 🚀 性能特性

- **Fastify** - 比 Express 快 2-3 倍的 HTTP 服务器
- **Pino** - 高性能结构化日志
- **Prisma** - 类型安全的数据库查询
- **JWT** - 无状态身份验证
- **CORS** - 跨域资源共享支持

## 🔧 开发工具

```bash
# 代码格式化
pnpm run format

# 代码检查
pnpm run lint

# 构建项目
pnpm run build
```
