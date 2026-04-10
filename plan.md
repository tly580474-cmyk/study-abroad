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

- [x] 用户注册、登录、密码管理
- [x] 基于RBAC的权限控制（角色-权限关联）
- [x] **数据行级权限控制**（见5.8）
- [x] 角色管理与权限分配
- [ ] 操作审计日志

### 5.2 学生模块

- [x] 留学申请表单填写
- [ ] 申请材料上传与管理（直传OSS）
- [x] 申请进度查询
- [x] 申请记录查看
- [ ] 补充材料功能

### 5.3 审查模块

- [ ] 待审核申请列表（仅展示分配的申请）
- [x] 资质审核操作（通过/要求补充/拒绝）
- [x] 审核意见填写
- [x] 审核历史记录

### 5.4 批复模块

- [ ] 待批复申请列表（按学校/专业筛选）
- [x] 院校专业占位操作
- [x] 批复结果记录

### 5.5 学校管理模块

- [x] 学校信息维护（CRUD）
- [ ] 专业信息管理（增删改查）
- [ ] 名额设置与分配
- [x] **本校申请查询（行级权限隔离）**

### 5.6 数据分析模块

- [x] 申请数据统计
- [x] 各阶段通过率分析
- [x] 学校专业热度分析
- [ ] 数据报表导出

### 5.7 系统管理模块

- [x] 用户账号管理
- [ ] 角色权限配置
- [x] 系统参数配置
- [ ] 数据备份与恢复

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
│   │   │   └── ui/        # UI组件 (Button, Input, Select, Card, Modal)
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── stores/         # 状态管理 (Zustand)
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── utils/          # 工具函数
│   │   └── types/          # TypeScript类型
│   ├── vite.config.ts
│   └── package.json
│
├── backend/               # 后端项目 (Node.js + Express)
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

**后端 (Node.js + Express + Prisma)**
- [x] Git 仓库初始化
- [x] 项目框架搭建
- [x] 数据库 Schema 设计
- [x] JWT 认证服务
- [x] RBAC 权限控制 (含行级权限)
- [x] 申请管理 CRUD + 审核流程
- [x] 学校管理 API
- [x] 专业管理 API
- [x] 用户管理 API
- [x] bcrypt 密码加密

**前端 (React + Vite + TypeScript)**
- [x] 项目框架搭建
- [x] Tailwind CSS 配置
- [x] UI 组件库
  - [x] Button
  - [x] Input
  - [x] Select
  - [x] Card
  - [x] Modal
- [x] Zustand 状态管理
- [x] 登录页面 (支持注册)
- [x] 仪表盘 (角色专属视图)
- [x] 申请列表页
- [x] 申请详情页
- [x] 申请创建页
- [x] 学校管理页
- [x] 数据分析页
- [x] 用户管理页
- [x] 系统设置页
- [x] 侧边栏用户菜单

#### 待开发 🔨

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 审查工作台 | /review 独立页面 | 高 |
| 批复工作台 | /approval 独立页面 | 高 |
| 材料上传 | 学生上传申请材料 (OSS) | 中 |
| 专业管理 | 学校专业增删改查 | 中 |
| 材料补充 | 学生补充材料流程 | 中 |
| 自动过期 | 逾期申请自动驳回 | 低 |
| 审计日志 | 操作记录追踪 | 低 |
| 数据导出 | 报表导出功能 | 低 |

### Git 分支策略

```
main          # 主分支 (生产环境)
├── develop   # 开发分支
├── feature/* # 功能分支
└── fix/*     # Bug修复分支
```

### 部署说明

| 环境 | 地址 | 说明 |
|------|------|------|
| 开发环境 | localhost:3000 (后端) / localhost:5173 (前端) | 本地开发 |
| 测试环境 | - | 待配置 |
| 生产环境 | - | 待配置 |
