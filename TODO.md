# 📋 Nest Kanban 开发 TODO 列表

基于当前项目状态分析，按优先级排序的功能开发计划。

## 🎯 项目当前状态

### ✅ 已完成功能

- [x] 基础架构搭建 (NestJS + Fastify + Prisma)
- [x] 用户认证系统 (注册/登录/JWT)
- [x] 数据模型设计 (完整的 Schema)
- [x] 日志系统集成 (Pino)
- [x] 权限守卫框架
- [x] 全局拦截器和验证
- [x] Swagger API 文档集成
- [x] 工作区管理完整功能 (CRUD + 成员管理)

---

## ✅ Phase 1: 工作区管理 (优先级: 🔥 HIGH) - 已完成

### 📁 模块创建

- [x] 创建 `src/workspaces/` 目录结构
- [x] 创建 WorkspaceModule
- [x] 创建 WorkspaceController
- [x] 创建 WorkspaceService

### 📝 DTO 定义

- [x] `CreateWorkspaceDto` - 创建工作区
- [x] `UpdateWorkspaceDto` - 更新工作区
- [x] `WorkspaceQueryDto` - 查询参数
- [x] `InviteMemberDto` - 邀请成员

### 🔌 工作区 CRUD API

- [x] `POST /workspaces` - 创建工作区 ✅ **测试通过**
  - [x] 验证用户权限
  - [x] 自动设置创建者为 OWNER
  - [x] slug 唯一性验证
- [x] `GET /workspaces` - 获取用户工作区列表 ✅ **测试通过**
  - [x] 支持分页
  - [x] 支持搜索过滤
- [x] `GET /workspaces/:id` - 获取工作区详情 ✅ **测试通过**
  - [x] 权限验证
  - [x] 包含成员信息
- [x] `PATCH /workspaces/:id` - 更新工作区 ✅ **测试通过**
  - [x] 只有 OWNER 可以更新
  - [x] 部分更新支持
- [x] `DELETE /workspaces/:id` - 删除工作区 ✅ **测试通过**
  - [x] 只有 OWNER 可以删除
  - [x] 级联删除相关数据

### 👥 工作区成员管理 API

- [x] `POST /workspaces/:id/members` - 邀请成员 ✅ **测试通过**
  - [x] 邮箱邀请功能
  - [x] 角色分配
- [x] `GET /workspaces/:id/members` - 获取成员列表 ✅ **测试通过**
  - [x] 支持角色过滤
  - [x] 分页支持
- [x] `PATCH /workspaces/:id/members/:userId` - 更新成员角色 ✅ **测试通过**
  - [x] 权限验证 (OWNER)
- [x] `DELETE /workspaces/:id/members/:userId` - 移除成员 ✅ **测试通过**
  - [x] 权限验证
  - [x] 不能移除 OWNER

---

## 🛡️ Phase 2: 权限系统完善 (优先级: 🔥 HIGH)

### 🔐 权限服务

- [ ] 创建 `PermissionService`
- [ ] 实现工作区权限检查方法
- [ ] 实现看板权限检查方法
- [ ] 实现权限继承逻辑

### 🛡️ 权限守卫增强

- [ ] 创建 `WorkspaceGuard` - 工作区权限守卫
- [ ] 创建 `BoardGuard` - 看板权限守卫
- [ ] 创建权限装饰器
  - [ ] `@RequireWorkspaceRole(role)`
  - [ ] `@RequireBoardRole(role)`
  - [ ] `@CheckResourceOwnership()`

### 🧪 权限测试

- [ ] 权限服务单元测试
- [ ] 权限守卫集成测试
- [ ] 权限继承逻辑测试

---

## 📋 Phase 3: 看板管理 (优先级: 🔶 MEDIUM)

### 📁 看板模块

- [ ] 创建 `src/boards/` 目录结构
- [ ] 创建 BoardModule
- [ ] 创建 BoardController
- [ ] 创建 BoardService

### 📝 看板 DTO

- [ ] `CreateBoardDto` - 创建看板
- [ ] `UpdateBoardDto` - 更新看板
- [ ] `BoardQueryDto` - 查询参数
- [ ] `BoardMemberDto` - 看板成员

### 🔌 看板 CRUD API

- [ ] `POST /workspaces/:workspaceId/boards` - 创建看板
- [ ] `GET /workspaces/:workspaceId/boards` - 获取看板列表
- [ ] `GET /boards/:id` - 获取看板详情
- [ ] `PUT /boards/:id` - 更新看板
- [ ] `DELETE /boards/:id` - 删除看板

### 👥 看板成员管理

- [ ] `POST /boards/:id/members` - 添加看板成员
- [ ] `GET /boards/:id/members` - 获取看板成员
- [ ] `PUT /boards/:id/members/:userId` - 更新成员角色
- [ ] `DELETE /boards/:id/members/:userId` - 移除成员

---

## 📝 Phase 4: 列表管理 (优先级: 🔶 MEDIUM)

### 📁 列表模块

- [ ] 创建 `src/lists/` 目录结构
- [ ] 创建 ListModule
- [ ] 创建 ListController
- [ ] 创建 ListService

### 📝 列表 DTO

- [ ] `CreateListDto` - 创建列表
- [ ] `UpdateListDto` - 更新列表
- [ ] `ReorderListDto` - 列表排序

### 🔌 列表 CRUD API

- [ ] `POST /boards/:boardId/lists` - 创建列表
- [ ] `GET /boards/:boardId/lists` - 获取列表
- [ ] `PUT /lists/:id` - 更新列表
- [ ] `DELETE /lists/:id` - 删除列表
- [ ] `PUT /lists/:id/reorder` - 列表排序

---

## 🎯 Phase 5: 卡片管理 (优先级: 🔶 MEDIUM)

### 📁 卡片模块

- [ ] 创建 `src/cards/` 目录结构
- [ ] 创建 CardModule
- [ ] 创建 CardController
- [ ] 创建 CardService

### 📝 卡片 DTO

- [ ] `CreateCardDto` - 创建卡片
- [ ] `UpdateCardDto` - 更新卡片
- [ ] `MoveCardDto` - 移动卡片
- [ ] `AssignCardDto` - 分配卡片

### 🔌 卡片 CRUD API

- [ ] `POST /lists/:listId/cards` - 创建卡片
- [ ] `GET /lists/:listId/cards` - 获取卡片列表
- [ ] `GET /cards/:id` - 获取卡片详情
- [ ] `PUT /cards/:id` - 更新卡片
- [ ] `DELETE /cards/:id` - 删除卡片
- [ ] `PUT /cards/:id/move` - 移动卡片
- [ ] `PUT /cards/:id/assign` - 分配卡片

---

## 🔧 Phase 6: 功能增强 (优先级: 🔷 LOW)

### 📊 数据统计

- [ ] 工作区统计信息
- [ ] 看板统计信息
- [ ] 用户活动统计

### 🔍 搜索功能

- [ ] 全局搜索 API
- [ ] 工作区内搜索
- [ ] 看板内搜索

### 📱 实时功能

- [ ] WebSocket 集成
- [ ] 实时协作更新
- [ ] 在线用户状态

### 📧 通知系统

- [ ] 邮件通知服务
- [ ] 卡片分配通知
- [ ] 截止日期提醒

---

## 🧪 Phase 7: 测试和文档 (优先级: 🔷 LOW)

### 🧪 测试覆盖

- [ ] 单元测试补充
- [ ] 集成测试编写
- [ ] E2E 测试完善
- [ ] 性能测试

### 📚 API 文档

- [ ] Swagger/OpenAPI 集成
- [ ] API 文档完善
- [ ] 示例代码添加

### 🔒 安全增强

- [ ] 请求频率限制
- [ ] 输入验证加强
- [ ] 安全头配置
- [ ] SQL 注入防护

---

## 📅 预估时间表

| Phase | 功能模块 | 预估时间 | 依赖关系 |
|-------|----------|----------|----------|
| 1 | 工作区管理 | 3-4 天 | 无 |
| 2 | 权限系统 | 2-3 天 | Phase 1 |
| 3 | 看板管理 | 2-3 天 | Phase 1, 2 |
| 4 | 列表管理 | 1-2 天 | Phase 3 |
| 5 | 卡片管理 | 2-3 天 | Phase 4 |
| 6 | 功能增强 | 3-5 天 | Phase 5 |
| 7 | 测试文档 | 2-3 天 | 所有 Phase |

**总预估时间：15-23 天**

---

## 📝 开发注意事项

### 🎯 开发原则

- **渐进式开发** - 每个 Phase 都能独立运行和测试
- **权限优先** - 所有 API 都要有适当的权限控制
- **数据一致性** - 使用事务确保数据完整性
- **错误处理** - 统一的错误响应格式
- **日志记录** - 关键操作都要有日志

### 🔧 技术要求

- 所有 API 都要有输入验证
- 使用 DTO 进行数据传输
- 实现适当的分页和排序
- 遵循 RESTful API 设计规范
- 编写必要的单元测试

### 📋 完成标准

- [ ] 功能正常运行
- [ ] 权限验证通过
- [ ] 单元测试覆盖
- [ ] API 文档更新
- [ ] 错误处理完善

---

**最后更新：** 2025-01-15
**状态：** 🟢 Phase 1 已完成
**当前 Phase：** Phase 2 - 权限系统完善
**下一步：** 实现权限服务和守卫增强

### 🎯 **立即可用功能**

- 用户注册和登录
- 工作区完整的 CRUD 操作
- 工作区成员管理
- Swagger API 文档
- 完整的权限控制
