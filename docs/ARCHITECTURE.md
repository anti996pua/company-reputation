# 架构分析文档

> 作者：架构师
> 版本：v4.3

## 1. 系统概述

公司信誉查询系统是一个纯静态企业口碑查询平台，用户可搜索公司、查看信誉评分、浏览部门详情、查看职位信息、阅读员工评价、跨公司对比。**无需数据库、无需运行时服务**，构建产物直接托管到任意 HTTP 服务器即可运行。

本项目参考 [linux-command](https://github.com/jaywcjlove/linux-command) 的核心模式：**Markdown 数据源 → 构建脚本 → 静态 HTML 输出**。

## 2. 技术选型

| 层次 | 技术 | 选型理由 |
|---|---|---|
| 构建工具 | Node.js + EJS | 构建时渲染 HTML，部署零运行时依赖 |
| 数据存储 | Markdown 文件 | 用户可直接编辑 `.md` 文件添加/修改数据 |
| 前端渲染 | 预渲染静态 HTML | 无客户端框架，SEO 友好，加载极快 |
| 搜索 | 客户端 JS 模糊匹配 | 全量数据嵌入 `data.js`，即时搜索，零服务器负载 |
| 评论区 | Giscus (GitHub Discussions) | 基于 GitHub Discussions 的评论，免去自建审核系统 |
| 多语言 | JSON 翻译 + 客户端切换 | 10 种语言（中文/English/日本語/한국어/Français/Deutsch/Español/Português/Русский/繁體中文），构建时嵌入 |
| 样式 | 纯 CSS (无框架) | 轻量级，CSS 变量实现主题切换 |
| 部署 | 任意静态托管 / Nginx / Docker | GitHub Pages、Vercel、Netlify 等 |

## 3. 数据流

```
                    ┌────────────────────────────────────────┐
                    │  数据源：Markdown 文件                  │
                    │  companies/*.md              (公司)     │
                    │  companies/*/**/*.md         (部门嵌套) │
                    │  companies/*/**/positions/*.md (职位)  │
                    └──────────┬─────────────────────────────┘
                               │ 读取
                               ▼
                    ┌────────────────────────────────────────┐
                    │  构建脚本 scripts/build.mjs            │
                    │                                        │
                    │  scanTree()    递归扫描任意深度         │
                    │  parseMdFile() 解析公司/部门          │
                    │  parseReviews() 解析员工评价           │
                    │  parsePosition() 解析职位              │
                    │  parsePositionsDir() 扫描 positions/  │
                    │  render        EJS 渲染 HTML          │
                    │  output        data.js + i18n.js     │
                    └──────────┬─────────────────────────────┘
                               │ 输出
                               ▼
                    ┌────────────────────────────────────────┐
                    │  构建产物 dist/                         │
                    │                                        │
                    │  index.html                  (首页)     │
                    │  list.html                   (搜索页)   │
                    │  compare.html                (对比页)   │
                    │  c/华为.html                 (公司)     │
                    │  c/华为/终端BG/手机产品线.html (深部门) │
                    │  c/华为/终端业务部/嵌入式软件工程师.html (职位)│
                    │  js/data.js                  (搜索索引) │
                    │  js/i18n.js                  (翻译+切换)│
                    │  css/style.css               (样式)     │
                    └──────────┬─────────────────────────────┘
                               │ 部署
                               ▼
                    ┌────────────────────────────────────────┐
                    │  静态 HTTP 服务器                       │
                    │  Nginx / GitHub Pages / Vercel         │
                    └────────────────────────────────────────┘

                    浏览器端运行：
                    ┌─────────────────────────────────────────┐
│  data.js (公司+部门+职位)               │
│  i18n.js (9 种语言 + 主题切换)          │
                    │  main.js (客户端搜索 + 高亮)            │
                    │  compare.js (对比页逻辑)                 │
                    │  Giscus (基于 GitHub Discussions)      │
                    └─────────────────────────────────────────┘
```

**v4.0 实时预览**：开发时 `npm run dev` 启动 `scripts/dev.mjs`，用 `fs.watch` 监听源文件，变更后增量重建，HTTP 服务带 `Cache-Control: no-cache`。

## 4. 数据模型设计

### Markdown 文件 → 数据对象

公司数据从 Markdown 文件解析为 JavaScript 对象供 EJS 模板使用：

```
CompanyNode {
  id, name, fullName, nameEn, alias,
  city, scale, establishedYear, industry, website,
  description, avgRating, reviewCount,
  isDepartment, parentCompany, depth, pathSegments,
  departments: [CompanyNode],   // 仅父公司有
  positions:  [PositionNode],   // 直属职位
  hasDepartments: boolean, hasPositions: boolean,
  positionCount: number,        // 含子部门
  url, sourcePath, sourceUrl,   // 生成页面路径 + GitHub 编辑链接
  metrics: {
    workIntensity, overtimeFreq, is996,
    salaryLevel, benefitsScore, wlbScore,
    careerGrowth, workEnv, cultureScore,
    overtimeDesc, benefitsDesc, cultureDesc,
    pros, cons
  },
  reviews: [Review]              // v4.0 员工评价
}

PositionNode {
  id, name, fullName, company, department,
  category, levelRange, location, headcount,
  description, salaryRanges: [{level, range, stocks?}],
  techStack: [string],
  requirements: [string],
  interviewSteps: [string],
  similarPositions: [{path, title, url}],
  url, sourcePath, sourceUrl
}

Review {
  date, role, experience, author,
  comment, rating, pros, cons
}
```

### 搜索索引

构建时从完整数据提取精简索引 `dist/js/data.js`：

```javascript
var companyData = [ /* 公司 + 部门 + 职位 */ ];
var positionData = [ /* 职位（独立索引） */ ];
var ALL_DATA = [ /* 合并 */ ];
// 单条: {id, n, p, d, city, scale, industry, avgRating, isDept, parent, type, level, location}
```

### 综合评分

评分 = (薪资水平 + 福利待遇 + 工作生活平衡 + 职业发展 + 工作环境 + 企业文化) ÷ 6，保留一位小数。

### 跨公司职位索引 (PositionIndex) v4.0

构建时构建一个 Map：`pathSegments.join('/') → PositionNode`，供所有职位的"## 类似职位"区块反查。

## 5. 搜索设计

搜索完全在**客户端**执行（`static/js/main.js`），无需服务器参与。

搜索策略采用**分层匹配 + 降级模糊**：

1. **精确匹配**：搜索词完全等于名称 → 权重 100
2. **前缀匹配**：名称以搜索词开头 → 权重 80
3. **包含匹配**：名称包含搜索词 → 权重 60
4. **描述匹配**：描述中包含搜索词 → 权重 30
5. **城市/行业匹配** → 权重 20
6. **模糊降级**：以上均不匹配时，使用字符级模糊匹配 > 60% 兜底

排序规则：权重降序 → 点评数降序。

搜索结果同时包含**公司**和**部门**，部门结果带父公司标签和蓝色竖线标识。

## 6. 页面路由

| 路径 | 说明 |
|---|---|
| `/index.html` | 首页：搜索框 + 热门企业 + 行业标签 |
| `/list.html` | 搜索页/公司列表 |
| `/compare.html` | 对比页（v4.0）：最多 4 家公司并排比较 |
| `/c/{公司}.html` | 公司详情页 |
| `/c/{公司}/{部门}.html` | 部门详情页（深度 1） |
| `/c/{公司}/{一级}/{二级}.html` | 深度 2 部门（如 终端BG/手机产品线） |
| `/c/{公司}/{一级}/{二级}/{三级}.html` | 深度 3 部门（如 手机产品线/上海研发中心） |
| `/c/{公司}/{部门}/positions/{职位}.html` | 职位详情页（v4.0） |
| 任意深度部门下都有 `positions/` 职位 | 跨深度可递归 |

## 7. 页面结构

### 首页 (index.ejs)
- 大尺寸搜索框 + 引导文案
- 热门企业卡片网格（前 8 家）
- 行业标签列表
- 搜索建议下拉框（200ms 防抖）

### 公司/部门详情页 (company.ejs)
- 面包屑导航（深度 ≥ 1 时显示）
- 公司基本信息（名称、英文名、行业、城市、规模）
- 综合评分圆环
- 🔀 对比按钮（加入对比列表）
- ✏️ 源码编辑链接
- **如果有子部门**：子部门网格卡片列表（**只显示直接子级**）
- **招聘职位**区（v4.0）：本部门 + 子部门所有职位
- **员工评价**区（v4.0）：员工评论卡（pros/cons 块）
- **如果没有部门**：8 项指标条形图 + 详细描述
- 996 警告条、优点/缺点区块
- Giscus 评论区

### 部门详情页 (department.ejs)
- 与公司详情页结构相同，**标题/面包屑/标签反映部门层级**
- 通过 `effectiveSegments` 计算 parent name，避免"部门 下属部门"重复

### 职位详情页 (position.ejs) v4.0
- Hero 区（类别/职级/地点 badge）
- 薪资范围表格（按职级展开）
- 技术栈 tags
- 任职要求清单
- 面试流程编号步骤
- **类似职位**区（解析自 `## 类似职位` Markdown 区块）
- 🔀 对比 + ✏️ 编辑链接
- Giscus 评论区

### 对比页 (compare.ejs) v4.0
- 搜索框（搜索所有公司/部门）
- 已选列表（最多 4 个，可移除）
- 15 行对比表：评分、城市、规模、行业、8 项指标、职位数
- 支持 URL `?q=华为,腾讯` 直接打开
- localStorage key `company-compare` 持久化

## 8. 关键设计决策

### 8.1 部门嵌套 v4.0
大公司在 `companies/` 下建子目录，支持**任意深度嵌套**：
- `companies/华为.md` + `companies/华为/终端BG.md` + `companies/华为/终端BG/手机产品线.md` + `companies/华为/终端BG/手机产品线/上海研发中心.md`
- 构建脚本用 `scanTree()` 递归扫描，`path.relative(COMPANIES_DIR, dirPath).split(path.sep)` 计算 pathSegments
- 部门目录名必须与同名 `.md` 文件匹配
- 两种布局都支持：
  - **父布局**：`公司/部门.md` + `公司/部门/positions/`
  - **内嵌布局**：`公司/部门/部门.md` + `公司/部门/positions/`
- 通过 `inOwnDir` 检测跳过重复段，避免"部门 - 部门"标签

### 8.2 职位 (Position) v4.0
- 子目录名固定为 `positions/`
- 在 `scanTree()` 递归结束后检测 `subSubdirs`
- 找到 `positions/` 后调用 `parsePositionsDir()` 读取所有职位 `.md`
- 通过 `positionsOwner.positions = positionNodes.slice(beforeCount)` 关联到正确部门（避免同名部门职位串台）
- URL 去掉 `positions/` 段：`c/华为/终端业务部/嵌入式软件工程师.html`
- 跨公司引用：`## 类似职位` 区块格式 `- path - title`，通过 `positionIndex` Map 反查 URL

### 8.3 职位数聚合
- 每个节点（公司/部门）的 `positionCount` 字段为**递归聚合**（含子部门所有职位）
- 顶层公司显示全公司总职位数，而非仅直属职位
- 数据通过 `computePositionCount()` 递归计算

### 8.4 员工评价 (Reviews) v4.0
- Markdown 区块 `## 员工评价`，多条评价用 `### date | role | experience | author` 分割
- 单条评价包含：date/role/experience/author + `>` 引言 + `评分：X.X/5` + `**优点**` / `**缺点**` 块
- 解析为对象数组 `node.reviews`，模板遍历渲染卡片
- 错误评价跳过单条不影响构建

### 8.5 跨公司对比 v4.0
- localStorage key `company-compare` 存储对比列表（最多 4 个 `id`）
- 每个公司/部门/职位页有 🔀 按钮加入对比
- 对比页 `compare.html` 通过 `?q=id1,id2` 接收初始列表（用于分享链接）
- 数据源：`ALL_DATA`（合并 companyData + positionData）
- 表格用 CSS grid 实现，每行 1+N 列（1 个标签列 + N 个数据列）
- **注意**：对比页逻辑直接内联在 `template/compare.ejs` 中（约 100 行 JS），未抽成独立文件。这会增加模板复杂度、不利于缓存和测试。建议后续重构为 `static/js/compare.js`

### 8.6 源码编辑链接 v4.0
- `config.json` 中的 `sourceBase` 字段配置仓库基地址
- 注意 Gitea 必须用 `/src/branch/` 而非 `/blob/`（`/blob/` 会导致 302 重定向到 commit 页面，源文件变为 commit 快照而非最新版本）
- 每个 Markdown 文件在解析时记录 `path.relative(COMPANIES_DIR, filePath)` 作为 `sourcePath`
- 模板渲染时输出 `✏️` 链接 `<a href="sourceBase/companies/sourcePath" target="_blank">`

### 8.7 实时本地预览 v4.0
- `scripts/dev.mjs` 启动 `node:fs.watch({recursive: true})` 监听 `companies/template/static/i18n/scripts/images`
- 变更后 120ms 防抖触发 `npm run build` 等价流程
- HTTP 服务带 `Cache-Control: no-cache` 防止浏览器缓存
- 端口默认 8080，可通过 `PORT` / `HOST` 环境变量覆盖
- 优雅处理 SIGINT / SIGTERM

### 8.8 Toast 通知 v4.3
- 替换原生 `alert()`，用 DOM 写入 `.toast-container` 实现非阻塞通知
- 添加/移除/清空对比列表时触发，2.5s 自动消失
- CSS 动画：从右侧滑入，淡出消失
- i18n key：`compare.alreadyAdded/added/removed/cleared`

### 8.9 暗色模式
CSS 变量双主题，通过 `[data-theme="dark"]` 选择器切换：
- 默认跟随 `prefers-color-scheme` 系统偏好
- 手动切换后持久化到 `localStorage`
- 所有颜色值全覆盖（背景、表面色、文字、边框、警告色、标签色等）
- v4.0 全面适配：职位页、对比页、员工评价卡

### 8.10 多语言 v4.2
- 翻译文件：`i18n/{lang}.json`（当前 10 种语言：zh-CN, en, ja, ko, fr, de, es, pt, ru, zh-TW）
- 语言数量**无上限**，只需在 `i18n/` 下添加 `{lang}.json` 文件即可自动加载
- 新增语言默认从 `config.json` 或 English 兜底，无需修改构建代码
- zh-TW 回退链：zh-TW → zh-CN → en → 原始 key
- `siteName`/`shortName` 支持 `config.json` 按语言覆盖，优先级高于 i18n 文件
- 客户端运行时切换 (`switchLang()`)
- `data-i18n` 属性标记可翻译元素
- `data-i18n-params` 支持参数替换（如 `"{company} 的部门"`）
- **English 兜底**：当某个 key 在当前语言中缺失时，自动回退到 English 翻译，避免显示原始 key 名

### 8.11 多名称国际化 v4.1
公司/部门支持多语言名称，通过 `## 基本信息` 中的 `- 英文名：`、`- 日文名：`、`- 别名：` 字段设置：
- 页面展示中文名的同时显示英文名和日文名
- 搜索结果中同时展示别名（如"ByteDance"）
- 搜索时匹配所有名称变体（中文/英文/日文/别名）
- 数据字段 `nameEn`、`nameJa`、`aliases[]` 嵌入 `data.js`

### 8.12 标签分类系统 v4.1
- 公司/部门/职位通过 `- 标签：` 字段设置分类标签（如 `互联网/大厂/深圳`）
- 标签用 `/` 或 `,` 分隔，解析为数组 `tags[]`
- 公司/部门/职位页展示标签为可点击 badge
- 点击标签跳转到 `list.html?tag=xxx`，自动搜索该标签
- 搜索结果中也展示标签，支持点击过滤

### 8.13 部门搜索展示 v4.1

### 8.14 图片架构 v4.3

**目录布局**：
```
images/
  project/           — 项目品牌图标（icon.svg, favicon.svg），版本控制
  companies/         — 公司图标 40×40 SVG 命名 `{name}.svg`，`_default.svg` 兜底
  common/            — 实体默认占位图（company-placeholder.svg / dept-placeholder.svg / position-placeholder.svg）
uploads/             — 用户上传图片（．gitignore）
```

**实体图片**（公司/部门/职位）：
- 存放在 `.md` 文件同级目录的 `img/` 子目录中
- 如 `companies/华为/img/cover.svg` → `dist/c/华为/img/cover.svg`
- 职位图片：`companies/华为/终端业务部/嵌入式软件工程师/img/screenshot.png`（需在 `.md` 同层创建同名目录）
- `build.mjs` 扫描 `svg|png|jpg|jpeg|gif|webp` 扩展名，复制到 `dist/c/{pathSegments}/img/`
- 实体对象注入 `entity.images[]` 数组，模板遍历 `<img>` 渲染图片画廊

**公司图标**：
- `resolveCompanyIcon(name)` 按 `{name}.svg` → `.png` → `.jpg` → `_default.svg` 层级查找
- 详情页 header 40×40，搜索结果 24×24，页脚 20×20
- 项目 favicon：`images/project/favicon.svg` 嵌入所有页面 `<head>`
搜索结果中部门条目显示完整名称（"华为 - 终端业务部"），带父公司标签和蓝色竖线标识，与公司结果区分。

## 9. 非功能需求

| 需求 | 指标 | 实现方式 |
|---|---|---|
| 构建时间 | < 2s | 22 家公司 + 68 部门 + 26 职位（116 页面），全量构建 |
| 页面加载 | < 1s | 纯静态 HTML，无运行时依赖 |
| 搜索响应 | < 10ms | 内存数据，JS 全量搜索 |
| 增量重建 | < 200ms | `fs.watch` 触发增量构建 |
| 构建产物大小 | ~ 700KB | 116 个 HTML + CSS + JS + 图片 |
| 部署复杂度 | 1 条命令 | `python3 -m http.server 8080` |
| 开发体验 | 1 条命令 | `npm run dev` 自动监听+重建 |

## 10. 多角色文档体系

| 文档 | 适用角色 | 内容 |
|---|---|---|
| `docs/REQUIREMENTS.md` | 产品经理 | 完整需求条款、功能清单、追溯矩阵 |
| `docs/ARCHITECTURE.md` | 架构师 | 技术选型、系统架构、数据设计 |
| `docs/ENGINEERING.md` | 工程师 | 开发环境、目录结构、实现细节 |
| `docs/TESTING.md` | 测试工程师 | 测试策略、测试用例、边界条件 |
| `docs/USER_GUIDE.md` | 用户/贡献者 | 功能介绍、使用说明、QA |

## 11. 安全考量

- XSS 防护：EJS `<%= %>` 自动转义模板变量
- 评论安全：由 Giscus (GitHub) 托管，平台负责反垃圾和审核
- 纯静态：无服务器端执行入口，攻击面极小
