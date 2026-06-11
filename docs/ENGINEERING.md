# 工程设计文档

> 作者：工程师
> 版本：v4.3

## 1. 开发环境搭建

### 环境要求

- Node.js 16+
- npm

### 快速启动

```bash
npm install
npm run dev           # 实时预览（自动监听 + 自动重建，端口 8080）
# 或静态预览：
npm run build
cd dist && python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 2. 项目目录结构

```
├── companies/              # Markdown 数据源
│   ├── 华为.md             # 公司总览
│   ├── 腾讯.md
│   ├── 华为/               # 部门子目录（任意深度嵌套）
│   │   ├── 终端业务部.md
│   │   ├── 终端业务部/
│   │   │   └── positions/
│   │   │       └── 嵌入式软件工程师.md   # 职位
│   │   ├── 终端BG/
│   │   │   ├── 终端BG.md
│   │   │   └── 手机产品线/
│   │   │       ├── 手机产品线.md
│   │   │       └── 上海研发中心.md      # 深度 3
│   │   └── 云计算.md
│   ├── 腾讯/
│   │   └── IEG/
│   │       ├── IEG.md
│   │       └── 天美工作室.md
│   │       └── positions/               # v4.0 职位
│   │           ├── 嵌入式开发工程师.md
│   │           └── 游戏客户端开发工程师.md
│   └── ...
├── scripts/
│   ├── build.mjs           # 静态站点生成器（Node.js）
│   └── dev.mjs             # 实时预览服务器（v4.0 新增）
├── template/               # EJS 页面模板
│   ├── index.ejs           # 首页
│   ├── list.ejs            # 搜索/列表页
│   ├── company.ejs         # 公司/部门详情页（含部门网格+职位+评价）
│   ├── position.ejs        # 职位详情页（v4.0 新增）
│   └── compare.ejs         # 对比页（v4.0 新增）
├── static/                 # 前端静态资源
│   ├── css/style.css       # 含 v4.0 职位/评价/对比样式
│   └── js/
│       ├── main.js         # 客户端搜索逻辑
│       ├── compare.js      # 【待提取】对比页逻辑目前内联在 compare.ejs 中
├── i18n/                   # 多语言翻译（10 种语言）
│   ├── zh-CN.json
│   ├── zh-TW.json           # v4.3 新增
│   ├── en.json
│   ├── ja.json
│   ├── ko.json              # v4.2 新增
│   ├── fr.json              # v4.2 新增
│   ├── de.json              # v4.2 新增
│   ├── es.json              # v4.2 新增
│   ├── pt.json              # v4.2 新增
│   └── ru.json              # v4.2 新增
├── images/                 # v4.3 版本控制图片
│   ├── project/            # 项目品牌（icon.svg, favicon.svg）
│   ├── companies/          # 公司图标（{name}.svg, _default.svg）
│   └── common/             # 默认占位图
├── uploads/                # v4.3 用户上传（gitignore）
├── config.json             # 构建配置（siteName/shortName/sourceBase）
├── config.template.json    # v4.3 配置模板，config.json 缺失时自动复制
├── docs/                   # 多角色文档
│   ├── ARCHITECTURE.md
│   ├── ENGINEERING.md
│   ├── TESTING.md
│   ├── USER_GUIDE.md
│   └── REQUIREMENTS.md     # 含 v4.0 需求
├── dist/                   # 构建产物（gitignore）
│   ├── index.html
│   ├── list.html
│   ├── compare.html        # v4.0 对比页
│   ├── c/*.html            # 116 个 HTML：22 公司 + 68 部门 + 26 职位
│   ├── js/data.js          # 含公司+部门+职位索引
│   └── js/i18n.js          # 含 10 种语言翻译 + 回退链 + 暗色模式切换
├── .github/workflows/      # CI/CD
│   ├── ci.yml
│   ├── docker.yml
│   └── pages.yml
├── Dockerfile
└── package.json            # v4.0 含 dev 脚本
```

## 3. 数据格式

### Markdown 数据格式（公司/部门）

公司数据以 Markdown 文件存储在 `companies/` 目录，格式如下：

```markdown
公司名称
===

公司简介描述...

## 基本信息

- 英文名：ByteDance
- 城市：北京
- 规模：10000人以上
- 成立：2012
- 行业：互联网/科技
- 官网：https://...

## 工作强度

评分：4.5/5

## 是否996

是

## 加班情况

描述文字...
```

格式规则：
- 第一行为公司名称
- `===` 分隔符（任意数量 `=` 均可，兼容 `===` 和 `================`）
- `## 基本信息` 用 `- 键：值` 格式提取元数据
- `- 标签：` 用 `/` 或 `,` 分隔，解析为标签数组（如 `互联网/大厂/深圳` → `["互联网","大厂","深圳"]`）
- 带评分的章节用 `评分：X.X/5` 格式提取分数
- `是否996` 章节取"是/否"
- 描述性章节（加班情况、福利待遇、企业文化、优点、缺点）取纯文本

### 部门 Markdown 格式（任意深度 v4.0）

部门文件放在 `companies/父公司/` 子目录中，支持任意嵌套：

```
companies/
├── 华为.md            # 公司总览
└── 华为/
    ├── 终端业务部.md  # 部门（父布局：同级有 positions/ 子目录）
    ├── 终端业务部/
    │   └── positions/
    │       └── 嵌入式软件工程师.md
    └── 终端BG/
        ├── 终端BG.md  # 部门（内嵌布局：同名子目录内）
        └── 手机产品线/
            ├── 手机产品线.md
            └── 上海研发中心.md  # 深度 3
```

```markdown
华为 - 终端业务部
===

部门描述...

## 基本信息

- 所属公司：华为          # 必填，关联父公司
- 城市：深圳              # 可与父公司不同
- 部门规模：约 5 万人      # 使用"部门规模"代替"规模"
- 业务范围：手机、平板      # 使用"业务范围"代替"行业"

## 工作强度

评分：4.5/5
```

**关键规则**：
- 部门目录名必须与同名 `.md` 文件匹配（`终端BG/`↔`终端BG.md`）
- 两种布局：
  - **父布局**：`公司/部门.md` 与 `公司/部门/positions/` 同级
  - **内嵌布局**：`公司/部门/部门.md`（`.md` 在子目录内）
- 构建时 `inOwnDir` 检测自动跳过重复段

### 员工评价格式 v4.0

放在公司/部门 `.md` 的 `## 员工评价` 区块：

```markdown
## 员工评价

### 2024-03-15 | 高级工程师 | 3 年 | @huawei_insider

> 进来之前在网上看了很多评价都说压力大，来了之后发现确实如此但也没有传言那么夸张。

评分：4.0/5

**优点**
薪资有竞争力，技术成长快

**缺点**
工作强度大，部门墙严重
```

### 职位 Markdown 格式 v4.0

放在 `companies/公司/部门/positions/` 目录下：

```markdown
嵌入式软件工程师
========================================

负责嵌入式系统驱动与固件开发。

## 基本信息

- 类别：技术
- 职级范围：13-16 级
- 工作地点：深圳/东莞

## 薪资范围

- 13 级：25-35K × 14-16 薪
- 14 级：35-50K × 14-16 薪

## 技术栈

- C / C++ / Rust
- RTOS / Linux Kernel

## 任职要求

- 计算机相关专业本科及以上
- 5 年以上嵌入式开发经验

## 面试流程

1. 简历筛选
2. 在线笔试
3. 技术一面

## 类似职位

- 腾讯/IEG/天美工作室/positions/嵌入式开发工程师 - 腾讯 IEG 嵌入式开发
```

## 4. 构建流程

### `npm run build` → `scripts/build.mjs`

```
companies/*.md + positions/       i18n/*.json
    │                                   │
    ▼                                   ▼
scanTree() (递归扫描)              readJSON()
    │                                   │
    ├─ parseMdFile() → CompanyNode      │
    ├─ parseReviews() → Review[]       │
    ├─ parsePositionsDir() → Position[] │
    └─ positionIndex Map               │
    │                                   │
    └──────────┬────────────────────────┘
               ▼
       build.mjs 合并数据
               │
   ┌───────────┼───────────────┐
   ▼           ▼               ▼
dist/js/data.js  dist/js/i18n.js  dist/*.html
(搜索索引)       (翻译+切换引擎)   (EJS 渲染)
```

关键步骤：
1. `scanTree()` 递归扫描 `companies/` 目录（无深度限制）
2. `parseMdFile()` 解析 Markdown → CompanyNode（公司/部门共用模型）
3. `parseReviews()` 从 `## 员工评价` 区块解析评价
4. `parsePositionsDir()` 扫描 `positions/` 子目录
5. `positionIndex` 构建跨公司职位引用 Map
6. 计算综合评分（6 项指标平均）
7. 渲染 EJS 模板为静态 HTML
8. 压缩 i18n 脚本（UglifyJS）
9. 生成搜索索引数据 `data.js`（含 companyData + positionData + ALL_DATA）

### `npm run dev` → `scripts/dev.mjs` (v4.0 新增)

```
1. 启动 `node:http` 服务（默认 127.0.0.1:8080）
2. 执行一次 `npm run build`
3. 启动 `fs.watch({recursive: true})` 监听：
   - companies/          （数据变更）
   - template/           （模板变更）
   - static/             （静态资源变更）
   - i18n/               （翻译变更）
   - scripts/            （构建脚本变更）
4. 120ms 防抖 → 增量重建 → HTTP no-cache 响应
5. Ctrl+C 优雅退出
```

### 多语言机制

- **构建时**：模板用 `__('key')` 调用翻译，默认输出中文
- **运行时**：`i18n.js` 包含所有 10 种语言的翻译，`switchLang()` 扫描 `data-i18n` 属性替换文本
- **回退链**：zh-TW → zh-CN → en → 原始 key（其他语言：en → 原始 key）
- **参数替换**：`data-i18n-params` 属性传递 JSON 参数（如 `{"company":"华为"}`）
- **siteName/shortName 语言覆盖**：`config.json` 中 `siteName` / `shortName` 支持按语言对象配置，优先级高于 i18n 文件

### 图片资源 v4.3

- **项目品牌**：`images/project/icon.svg` + `favicon.svg`，favicon 嵌入所有页面 `<head>`
- **公司图标**：`images/companies/{name}.svg`，`resolveCompanyIcon()` 按扩展名优先级查找，`_default.svg` 兜底
- **实体图片**：公司/部门/职位 `.md` 文件同级 `img/` 子目录中的图片，构建时自动扫描 `svg|png|jpg|jpeg|gif|webp` 并复制到 `dist/c/{pathSegments}/img/`
- **占位图**：`images/common/{company,dept,position}-placeholder.svg`
- 详情页展示图片画廊（`<div class="image-gallery">`），响应式布局（≥640px 两列）
- `dev.mjs` watch 列表已包含 `images/`

### 暗色模式

- 构建时包含 CSS 双主题（`[data-theme="dark"]`）
- `i18n.js` 内置 `toggleTheme()` 函数
- 默认跟随 `prefers-color-scheme`，用户选择持久化到 `localStorage`

## 5. 常见开发任务

| 任务 | 操作 |
|---|---|
| 修改公司/部门数据 | 编辑 `companies/*.md`，dev 自动重建 |
| 添加新公司 | 在 `companies/` 下创建 `.md` 文件 |
| 添加部门（任意深度） | 在父目录下创建 `.md` + 同名子目录 |
| 添加职位 | 在部门下创建 `positions/职位.md` |
| 添加员工评价 | 在公司/部门 `.md` 中添加 `## 员工评价` 区块 |
| 添加新语言 | 在 `i18n/` 下创建 `{代码}.json`，模板 select 添加选项；如需语言名覆盖在 `config.json` siteName/shortName 添加 |
| 添加公司图标 | 创建 `images/companies/{公司名}.svg` |
| 添加实体图片 | 在 `.md` 同级创建 `img/` 目录放入图片文件，构建自动复制 |
| 修改样式 | `static/css/style.css`，CSS 变量控制主题色 |
| 修改搜索逻辑 | `static/js/main.js` |
| 修改对比逻辑 | `template/compare.ejs`（内联 JS，待抽为独立文件） |
| 集成 Giscus | 在 `config.json` 中添加 `giscus: { repo, repoId, category, categoryId }` 配置（参考 GitHub Giscus 文档获取参数）|
| 配置源编辑链接 | 修改 `config.json` 中的 `sourceBase` 字段 |
| 实时预览 | `npm run dev`（监听变更自动重建） |
| 纯静态预览 | `npm run build && cd dist && python3 -m http.server 8080` |

## 6. 部署方案

`dist/` 目录是纯静态文件：

- **GitHub Pages**：由 `.github/workflows/pages.yml` 自动部署
- **Vercel / Netlify**：设置 `dist/` 为 publish 目录
- **Docker**：项目根目录 `Dockerfile`（多阶段构建 → Nginx）
  ```bash
  docker build -t cr . && docker run -p 8080:80 cr
  ```
- **任意 HTTP 服务器**：`cd dist && python3 -m http.server 8080`

## 7. 源编辑链接配置

"✏️ 编辑"链接的基地址通过 `config.json` 中的 `sourceBase` 字段配置：

```json
{
  "sourceBase": "https://github.com/anti996pua/company-reputation/tree/main/companies"
}
```

构建时 `build.mjs` 读取 `config.json` 拼接 `sourceBase/companies/xxx.md` 生成编辑链接。注意 Gitea 仓库使用 `/src/branch/` 路径（非 `/blob/`），否则 302 重定向到 commit 页面导致 404。

## 8. 分支策略

本项目采用三分支模型（详见 `docs/BRANCHING.md`）：

```
develop ──→ data ──→ main
```

- `develop`：核心功能开发，全部变更允许
- `data`：用户数据贡献，仅允许 `companies/*.md` 变更，CI 强制校验
- `main`：生产部署，仅从 `data` 合并后自动部署

构建时通过 `BRANCH` 环境变量控制 `sourceBase` 中的 `${BRANCH}` 替换。Pages 部署（pages.yml）设 `BRANCH=data` 使编辑链接指向 data 分支；Docker 生产构建默认指向 `main`（Dockerfile 中 `ARG BRANCH=main`），自定义构建可通过 `--build-arg BRANCH=data` 覆盖。

## 9. 性能考量

- 当前（116 个页面：22 公司 + 68 部门 + 26 职位）：搜索 < 10ms，页面 < 1s 加载
- 构建时间 < 2s，增量重建 < 200ms
- 如数据量 > 1000 条：考虑分页加载或按行业拆分搜索索引

## 10. 已知技术债务

| 问题 | 说明 | 建议 |
|---|---|---|
| 对比逻辑内联 | `compare.ejs` 含约 100 行内联 JS，不可缓存、难维护 | 提取为 `static/js/compare.js` |
| 无 404 页面 | 不存在路径返回首页（200） | 添加 `dist/404.html` 并配置 HTTP 服务器 |
| 缺失 Markdown 校验 | 格式错误仅构建期报错，无数据完整性检查 | 添加 `--validate` 模式 |
| 搜索索引全内存 | 21 家公司尚可，> 1000 时性能下降 | 分页/按行业拆分

## 11. 工程化规范

### 11.1 Git 提交规范

#### 提交信息格式

```
[emoji] type(scope): 简短描述（50 字以内）

详细说明（可选，72 字换行）
```

Emoji 用于 `git log --oneline` 的视觉快速扫描，非必需但推荐。

#### type 类型

| type | emoji | 用途 | 示例 |
|------|-------|------|------|
| feat | ✨ | 新功能 | `✨ feat(search): 支持别名匹配` |
| fix | 🐛 | Bug 修复 | `🐛 fix(dev): 原始 UTF-8 中文 URL 参数` |
| docs | 📖 | 文档变更 | `📖 docs: add CONTRIBUTING.md` |
| refactor | ♻️ | 代码重构 | `♻️ refactor(build): 提取 markdown 解析器` |
| perf | ⚡ | 性能优化 | `⚡ perf(search): 索引预编译` |
| test | 🧪 | 测试相关 | `🧪 test: 搜索边界用例` |
| chore | 🔧 | 构建/工具/配置 | `🔧 chore: add .editorconfig` |
| ci | 👷 | CI/CD 配置 | `👷 ci: add GitHub Actions workflow` |
| style | 🎨 | 代码格式 | `🎨 style: 统一缩进为 2 空格` |

#### 提交原则

1. **小提交** — 每个提交只做一件事。一个功能拆成多个逻辑提交，禁止超大混合提交
2. **完整构建** — 提交前运行 `npm run build` 确保不破坏构建
3. **文档同步** — 代码变更同步更新相关文档，不做「只有代码无文档」的提交
4. **不做混合提交** — 不把功能开发和文档修改混在一个提交里

#### 分支命名

| 用途 | 格式 | 示例 |
|------|------|------|
| 数据贡献 | `data/{公司名}` | `data/华为` |
| Bug 修复 | `fix/{描述}` | `fix/search-encoding` |
| 功能开发 | `feat/{描述}` | `feat/compare-mode` |
| 文档 | `docs/{描述}` | `docs/add-readme` |
| 重构 | `refactor/{描述}` | `refactor/build-pipeline` |

### 11.2 编码规范

#### 通用

- **缩进**：2 空格（`.editorconfig` 已配置）
- **编码**：UTF-8
- **换行**：LF
- **文件末尾**：保留一个空行
- **尾部空格**：无（Markdown 除外）

#### JavaScript / Node.js

- **使用 ES 模块**（`.mjs` 后缀或 `package.json` 中 `"type": "module"`）
- **const / let**：优先 `const`，仅在需要重赋值时用 `let`（不用 `var`）
- **命名**：
  - 变量/函数：`camelCase`
  - 常量：`UPPER_SNAKE_CASE`
  - 类：`PascalCase`
  - 文件：`kebab-case.js` / `snake_case.mjs`
- **错误处理**：使用 try-catch，避免吞掉异常
- **日志**：`console.log` 仅用于开发调试，构建脚本使用 `process.stderr` 输出状态

#### CSS

- **CSS 变量**：使用 `--prefix-name` 命名空间（如 `--color-primary`）
- **类名**：`kebab-case`
- **响应式**：移动端优先，断点 `640px` / `1024px`

#### EJS 模板

- 模板中不写 JS 业务逻辑，数据预处理好再传入
- `i18n` 使用 `__('key')` 调用，不硬编码文字
- 模板变量名与 `build.mjs` 传入字段名一致

### 11.3 代码审查原则

1. 每个 PR 至少一名 reviewer 审查后才能合并
2. 审查重点：逻辑正确性、兼容性（现有页面不受影响）、文档同步
3. data 分支的 PR 需额外检查数据格式合规

### 11.4 版本号规范

遵循 [SemVer](https://semver.org/)：

- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能新增
- PATCH: 向下兼容的问题修复
