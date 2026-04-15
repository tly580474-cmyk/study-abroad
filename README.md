# 留学管理系统

> 面向留学中介机构的企业级应用，管理学生留学申请全流程

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18-green)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![Prisma](https://img.shields.io/badge/Prisma-5.3-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 项目简介

留学管理系统是一个功能完善的留学申请管理平台，支持多角色协作，实现从学生提交申请到最终批复的完整业务闭环。系统包含用户权限管理、申请流程控制、校际评价论坛等核心模块。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + Vite | 现代化前端开发框架 |
| UI | Tailwind CSS | 响应式样式设计 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 富文本编辑 | Tiptap | 支持图片/视频/YouTube嵌入 |
| 后端 | Node.js + Express | 高性能 RESTful API |
| ORM | Prisma | 类型安全的数据库访问 |
| 数据库 | PostgreSQL | 关系型数据库 |
| 认证 | JWT | 无状态身份验证 |

## 核心功能

### 用户与权限

- [x] 用户注册、登录、密码管理
- [x] 基于 RBAC 的权限控制
- [x] 数据行级权限控制
- [x] 多角色支持（学生/审查/批复/学校管理/分析/系统管理）

### 申请流程

- [x] 留学申请表单填写
- [x] 申请材料上传（存储到数据库）
- [x] 申请进度查询
- [x] 多级审核流程（含材料补充回流机制）
- [x] 院校专业占位与批复

### 校际评价与论坛

- [x] 学校评价（1-5星评分 + 文字评价）
- [x] 学校宣传发布（公告/新闻/招生信息）
- [x] 富文本编辑器（支持图片、视频、YouTube嵌入）
- [x] 论坛帖子发布与评论
- [x] 帖子点赞与浏览统计
- [x] 搜索和分类过滤

### 学校管理

- [x] 学校信息维护
- [x] 专业信息管理
- [x] 名额设置与分配
- [x] 本校申请查询（行级权限隔离）

### 数据分析

- [x] 申请数据统计
- [x] 各阶段通过率分析
- [x] 学校专业热度分析

## 业务流程

### 申请状态机

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

### 角色与职责

| 角色 | 职责 |
|------|------|
| 学生 | 提交申请，上传材料，查看状态 |
| 审查人员 | 审核资质，评估材料 |
| 批复人员 | 院校专业占位操作 |
| 学校管理员 | 维护本校信息，管理名额 |
| 数据分析师 | 业务数据统计 |
| 系统管理员 | 账号管理，权限配置 |

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 16+
- npm 10+

### 安装部署

```bash
# 克隆项目
git clone <repository-url>
cd 留学管理

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 配置数据库
cd ../backend
cp .env.example .env
# 编辑 .env 配置数据库连接

# 初始化数据库
npx prisma db push
npx prisma generate

# 启动后端服务
npm run dev

# 启动前端服务 (新终端)
cd ../frontend
npm run dev
```

### 访问地址

- 前端: http://localhost:5173
- 后端 API: http://localhost:3000

## 项目结构

```
留学管理/
├── backend/                    # 后端服务
│   ├── prisma/               # 数据库 Schema
│   │   └── schema.prisma
│   └── src/
│       ├── controllers/      # 路由控制器
│       ├── middleware/        # 中间件 (认证/权限)
│       ├── routes/            # 路由定义
│       ├── services/          # 业务逻辑
│       └── utils/             # 工具函数
│
├── frontend/                  # 前端应用
│   └── src/
│       ├── components/        # UI 组件
│       │   ├── ui/           # 基础组件
│       │   └── layout/       # 布局组件
│       ├── pages/            # 页面组件
│       ├── services/         # API 服务
│       ├── stores/           # 状态管理
│       └── types/            # TypeScript 类型
│
└── plan.md                   # 开发方案文档
```

## 数据行级权限

系统实现严格的行级权限控制，确保数据隔离：

| 角色 | 数据可见范围 |
|------|--------------|
| 学校管理员 | 仅本校数据 |
| 审查人员 | 仅分配的申请 |
| 批复人员 | 仅负责的院校 |
| 数据分析师 | 所有数据（脱敏） |
| 系统管理员 | 所有数据 |

## 开发进度

### 已完成模块

- [x] 用户与权限模块
- [x] 学生申请模块
- [x] 审查工作台
- [x] 批复工作台
- [x] 学校管理
- [x] 数据分析
- [x] 校际评价与论坛
- [x] 富文本编辑器（图片/视频/YouTube）

### 待开发功能

- [ ] 操作审计日志
- [ ] 数据报表导出
- [ ] 角色权限配置页面
- [ ] 数据备份与恢复
- [ ] 精华/置顶功能
- [ ] 消息通知系统

## 数据库模型

主要数据模型：

- **User** - 用户账号与角色
- **School** - 学校信息
- **Major** - 专业信息与名额
- **Application** - 留学申请
- **Document** - 申请材料
- **SchoolReview** - 学校评价
- **ForumPost** - 论坛帖子
- **PostComment** - 帖子评论
- **SchoolPost** - 学校宣传
- **Media** - 媒体文件

## 技术特点

1. **类型安全** - 全栈 TypeScript，Prisma 生成类型
2. **权限严密** - RBAC + 行级权限双重控制
3. **富媒体支持** - Tiptap 富文本编辑器支持多媒体
4. **流程完整** - 申请状态机覆盖所有业务场景
5. **数据隔离** - 多租户数据隔离设计

## License

MIT License
