# 留学管理系统开发方案

## 一、项目概述

留学管理系统是一个面向留学中介机构的企业级应用，用于管理学生留学申请全流程。系统支持多角色协作，实现从学生提交申请到最终批复的完整业务闭环。

## 二、技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | React + Vite | Vite 提供更快的开发体验和构建速度 |
| 后端 | Node.js | 轻量高效，与前端技术栈统一，便于JSON处理 |
| 数据库 | PostgreSQL | 关系型数据库，支持复杂查询，JSON类型灵活 |
| ORM | Prisma | 类型安全的数据库访问层，降低SQL维护成本 |
| 文件存储 | OSS (阿里云/腾讯云) | 大文件直传，避免后端带宽瓶颈 |

## 三、角色与权限

| 角色 | 标识 | 职责 |
|------|------|------|
| 学生 | student | 提交留学申请，上传申请材料，查看申请状态 |
| 审查人员 | reviewer | 审核学生资质，评估申请材料 |
| 批复人员 | approver | 为学生申请的院校专业进行占位操作 |
| 学校管理员 | school_admin | 维护本校信息，设置专业名额，查看本校申请 |
| 数据分析师 | analyst | 业务数据统计与分析 |
| 系统管理员 | admin | 系统最高权限，用户账号管理，角色权限配置 |

## 四、核心业务流程

### 4.1 申请流程状态机（含回流机制）

```
[草稿] ──提交──→ [已提交] ──初审通过──→ [待补充材料] ←──材料不全──┐
                         │                                    │
                         │ 格式错误                            │
                         ▼                                    │
                   [待补充材料] ──重新提交──→ [已提交] ──审核通过──→ [已通过] ──批复──→ [已完成]
                         │                                    │
                         │ 逾期未补                           │
                         ▼                                    │
                      [已驳回]                                │
                         │                                    │
                         └────────审查拒绝────────→ [已拒绝] ←─┘
```

### 4.2 业务流程说明

- **材料不全**：审查人员发现缺少必要材料，退回让学生补充
- **格式错误**：文件格式不符合要求（如需要PDF但提交了图片）
- **逾期未补**：学生在规定时间内未补充材料，申请自动驳回
- **审查拒绝**：资质审核不通过，直接拒绝申请

### 4.3 状态流转规则

| 当前状态 | 可执行操作 | 目标状态 | 执行角色 |
|----------|------------|----------|----------|
| draft | submit | submitted | 学生 |
| submitted | request_resubmit | pending_supplement | 审查人员 |
| submitted | review_pass | approved | 审查人员 |
| submitted | review_reject | rejected | 审查人员 |
| pending_supplement | resubmit | submitted | 学生 |
| pending_supplement | expire | rejected | 系统 |
| approved | approve | completed | 批复人员 |

## 五、功能模块

### 5.1 用户与权限模块

- 用户注册、登录、密码管理
- 基于RBAC的权限控制（角色-权限关联）
- **数据行级权限控制**（见5.8）
- 角色管理与权限分配
- 操作审计日志

### 5.2 学生模块

- 留学申请表单填写
- 申请材料上传与管理（直传OSS）
- 申请进度查询
- 申请记录查看
- 补充材料功能

### 5.3 审查模块

- 待审核申请列表（仅展示分配的申请）
- 资质审核操作（通过/要求补充/拒绝）
- 审核意见填写
- 审核历史记录

### 5.4 批复模块

- 待批复申请列表（按学校/专业筛选）
- 院校专业占位操作
- 批复结果记录

### 5.5 学校管理模块

- 学校信息维护（CRUD）
- 专业信息管理
- 名额设置与分配
- **本校申请查询（行级权限隔离）**

### 5.6 数据分析模块

- 申请数据统计
- 各阶段通过率分析
- 学校专业热度分析
- 数据报表导出

### 5.7 系统管理模块

- 用户账号管理
- 角色权限配置
- 系统参数配置
- 数据备份与恢复

### 5.8 数据行级权限控制

#### 权限隔离规则

| 角色 | 数据可见范围 |
|------|--------------|
| 学校管理员 | 仅本校数据（通过 school_id 隔离） |
| 审查人员 | 仅分配给自己的申请 |
| 批复人员 | 仅所负责院校的申请 |
| 数据分析师 | 所有数据（脱敏后） |
| 系统管理员 | 所有数据 |

#### 后端强制校验（示例）

```typescript
// 每个查询都必须携带权限过滤条件
async function getApplications(filters, user) {
  const where = { ...filters };

  // 行级权限校验
  switch (user.role) {
    case 'school_admin':
      where.school_id = user.managed_school_id; // 仅查本校
      break;
    case 'reviewer':
      where.reviewer_id = user.id; // 仅查分配的
      break;
    case 'approver':
      where.school_id = { in: user.managed_school_ids }; // 仅负责的学校
      break;
    case 'analyst':
    case 'admin':
      // 无限制
      break;
  }

  return prisma.application.findMany({ where });
}
```

## 六、数据库设计

### 6.1 核心表结构（Prisma Schema）

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  password      String
  role          Role
  email         String?
  phone         String?
  school_id     String?  // 学校管理员关联的学校
  managed_schools String[] // 批复人员负责的学校列表
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  applications  Application[]
  reviews       Review[]
  approvals     Approval[]
}

enum Role {
  student
  reviewer
  approver
  school_admin
  analyst
  admin
}

model School {
  id          String   @id @default(uuid())
  name        String
  country     String
  city        String
  logo        String?
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  majors      Major[]
}

model Major {
  id          String   @id @default(uuid())
  school_id   String
  name        String
  quota       Int      // 名额总数
  enrolled    Int      @default(0) // 已占用
  tuition     Decimal
  requirements String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  school      School   @relation(fields: [school_id], references: [id])
  applications Application[]
}

model Application {
  id            String   @id @default(uuid())
  student_id    String
  major_id      String
  status        ApplicationStatus
  reviewer_id   String?  // 当前负责审查的人员
  applied_at    DateTime?
  reviewed_at   DateTime?
  approved_at   DateTime?
  deadline      DateTime? // 材料补充截止时间
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  student       User     @relation(fields: [student_id], references: [id])
  major         Major    @relation(fields: [major_id], references: [id])
  reviewer      User?    @relation("ReviewerApplications", fields: [reviewer_id], references: [id])
  reviews       Review[]
  approvals     Approval[]
  documents     Document[]
}

enum ApplicationStatus {
  draft
  submitted
  pending_supplement // 待补充材料
  approved
  completed
  rejected
  expired // 逾期未补
}

model Review {
  id            String   @id @default(uuid())
  application_id String
  reviewer_id   String
  action        ReviewAction
  comment       String?
  created_at    DateTime @default(now())

  application   Application @relation(fields: [application_id], references: [id])
  reviewer      User   @relation(fields: [reviewer_id], references: [id])
}

enum ReviewAction {
  request_resubmit
  approve
  reject
}

model Approval {
  id            String   @id @default(uuid())
  application_id String
  approver_id   String
  notes         String?
  created_at    DateTime @default(now())

  application   Application @relation(fields: [application_id], references: [id])
  approver      User   @relation(fields: [approver_id], references: [id])
}

model Document {
  id            String   @id @default(uuid())
  application_id String
  name          String
  url           String   // OSS URL
  size          Int
  mime_type     String
  status        DocumentStatus
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  application   Application @relation(fields: [application_id], references: [id])
}

enum DocumentStatus {
  uploading
  uploaded
  invalid_format
  approved
  rejected
}
```

### 6.2 状态流转

| 当前状态 | 可执行操作 | 目标状态 |
|----------|------------|----------|
| draft | submit | submitted |
| submitted | request_resubmit | pending_supplement |
| submitted | approve | approved |
| submitted | reject | rejected |
| pending_supplement | resubmit | submitted |
| pending_supplement | expire | expired |
| approved | approve | completed |

## 七、技术风险与解决方案

| 风险点 | 解决方案 |
|--------|----------|
| 业务流程缺乏回流机制 | 增加"待补充材料"状态，支持材料不全/格式错误退回 |
| 大文件上传性能瓶颈 | 前端直传OSS，后端仅处理元数据 |
| 行级权限越权漏洞 | 后端强制校验每条查询的school_id/reviewer_id |
| 高并发审批 | 引入消息队列，异步处理 |
| 数据一致性 | 使用事务确保状态流转原子性 |
| 复杂统计报表 | 预计算+定期刷新统计指标 |
| 权限安全 | JWT认证+细粒度权限控制 |
| SQL维护成本爆炸 | 使用Prisma ORM，类型安全，可维护性强 |

## 八、项目结构

```
留学管理/
├── frontend/              # 前端项目 (React + Vite)
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── stores/         # 状态管理 (Zustand/Redux)
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── utils/          # 工具函数
│   │   └── types/          # TypeScript类型
│   ├── vite.config.ts
│   └── package.json
│
├── backend/               # 后端项目 (Node.js + Express/Fastify)
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件（认证、权限、日志）
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   ├── prisma/
│   │   └── schema.prisma   # Prisma数据模型
│   └── package.json
│
└── database/
    └── migrations/         # 数据库迁移脚本
```

## 九、开发周期估算

| 阶段 | 时间 | 说明 |
|------|------|------|
| 需求分析 | 2-3周 | 详细梳理业务流程，确认功能需求 |
| 架构设计 | 2-3周 | 技术选型，数据库设计，接口设计 |
| 核心模块开发 | 10-12周 | 用户权限、申请流程（含回流）、文件上传、行级权限 |
| 辅助模块开发 | 4-6周 | 统计分析、系统管理等辅助功能 |
| 测试与优化 | 3-4周 | 功能测试、性能优化、Bug修复 |

**总计：约5-7个月**

## 十、方案可行性

**评估结果：可行** ✅

改进点：
1. ✅ 技术栈升级为 React+Vite+Prisma，开发体验更好
2. ✅ 业务流程增加回流机制，用户体验大幅提升
3. ✅ 文件直传OSS，避免后端带宽瓶颈
4. ✅ 后端强制行级权限校验，杜绝越权漏洞
5. ✅ Prisma ORM降低SQL维护成本

理由：
1. 技术选型成熟，社区资源丰富
2. 业务流程清晰，易于模块化开发
3. 角色权限明确，便于逐步迭代
4. 适合中小规模团队开发维护

## 十一、开发进度跟踪

### 2026-04-10 项目初始化

#### 已完成 ✅
- Git 仓库初始化
- 后端项目框架 (Node.js + Express + Prisma)
- 数据库 Schema 设计
- JWT 认证服务
- RBAC 权限控制 (含行级权限)
- 申请管理 CRUD + 审核流程
- 前端项目框架 (React + Vite + Tailwind)
- 登录页面 (对接后端 API)
- 仪表盘框架 (静态)
- UI 组件库 (Button/Input/Select)
- Zustand 状态管理
- Axios API 客户端
- 测试数据初始化

#### 待开发功能

##### 高优先级
| # | 功能模块 | 页面/组件 | 说明 |
|---|----------|-----------|------|
| 1 | 仪表盘动态化 | DashboardPage | 根据角色显示不同内容（学生看申请进度，审核人员看待审核列表等） |
| 2 | 申请列表页 | ApplicationListPage | 展示申请列表，支持按状态、学校、专业筛选 |
| 3 | 申请详情页 | ApplicationDetailPage | 查看完整申请信息，支持补充材料/重新提交 |
| 4 | 申请创建页 | ApplicationCreatePage | 学生选择学校/专业，填写申请表单 |
| 5 | 学校管理页 | SchoolManagementPage | 学校管理员增删改查学校和专业 |

##### 中优先级
| # | 功能模块 | 页面/组件 | 说明 |
|---|----------|-----------|------|
| 6 | 审核流程页 | ReviewPage | 审查人员审核申请（通过/要求补充/拒绝） |
| 7 | 批复流程页 | ApprovalPage | 批复人员确认占位操作 |
| 8 | 专业名额管理 | MajorQuotaPage | 设置各专业招生名额，已占位数统计 |
| 9 | 文件上传 | DocumentUpload | 集成 OSS，支持材料文档上传 |

##### 低优先级
| # | 功能模块 | 页面/组件 | 说明 |
|---|----------|-----------|------|
| 10 | 数据统计页 | AnalyticsPage | 分析师看板（申请量、通过率、学校分布等） |
| 11 | 用户管理页 | UserManagementPage | 系统管理员增删改查用户账号 |
| 12 | 角色权限配置 | RolePermissionPage | 动态配置角色权限 |
| 13 | 系统设置页 | SystemSettingsPage | 业务参数配置（deadline、审核流程等） |
| 14 | 操作日志 | AuditLogPage | 记录关键操作便于审计 |

#### 技术债务
| # | 事项 | 说明 |
|---|------|------|
| 1 | 前端路由守卫 | 未登录跳转登录页，角色权限校验 |
| 2 | 后端输入校验 | 完善 Zod Schema |
| 3 | 错误处理 | 统一错误格式 |
| 4 | 单元测试 | 后端/前端测试用例 |

#### 测试账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 学生 | student1 | student123 |

#### 数据库
- PostgreSQL: study_abroad
- 表结构已通过 Prisma Schema 定义
- 测试数据通过 seed.ts 初始化
