# company-reputation

公司信誉查询系统 — 基于 Markdown 数据源的静态站点，可搜索、多语言、无数据库。

## 命令

| 命令 | 作用 |
|---|---|
| `npm install` | 安装构建依赖 |
| `npm run build` | 构建静态站点（解析 `companies/*.md` → `dist/`） |
| `npm start` | `build` 的别名 |
| `npm run dev` | 实时本地预览（监听 companies/ template/ static/ i18n/，自动重建 + HTTP 服务，端口 8080） |
| `cd dist && python3 -m http.server 8080` | 纯静态预览（无自动重建） |
| `docker build -t cr . && docker run -p 8080:80 cr` | 构建并运行 Docker 镜像 |
| `node scripts/validate-data.mjs` | 数据完整性校验 |

## 分支策略（三分支模型）

详见 `docs/BRANCHING.md`。三个分支形成质量门禁流水线：

```
develop (开发) ──→ data (数据贡献) ──→ main (展示/生产)
```

| 分支 | 用途 | 允许变更 | CI 检查 | 部署 |
|---|---|---|---|---|
| `develop` | 核心功能开发、Bug 修复 | 全部 | 构建验证 | 无 |
| `data` | 用户提交公司/部门/职位 | 仅 `companies/*.md` | 构建+数据校验+文件类型检查 | 无 |
| `main` | 生产部署 | 仅从 data 合并 | 全量验证+部署 | Pages + Docker |

编辑链接（`✏️`）中的 `sourceBase` 会根据 `BRANCH` 环境变量自动替换 `${BRANCH}` 为当前分支名，默认 `data`（用户贡献分支）。CI 构建 main 分支时通过 `BRANCH=data` 环境变量覆盖到 data 分支。Docker 生产构建默认指向 `main`（`Dockerfile` 中 `ARG BRANCH=main`）。

## CI/CD

GitHub Actions 工作流（`.github/workflows/`）：

| 工作流 | 触发分支 | 功能 |
|---|---|---|
| `ci.yml` | develop/data/main + PR | 三分支差异化检查（develop=仅构建，data=+校验，main=+全量验证）|
| `docker.yml` | main / v* tag | 构建 Docker 镜像 → 推送 GHCR |
| `pages.yml` | main | 构建 → 数据校验 → 部署 GitHub Pages |

### Docker 自动化测试（opencode 自主调用）

修改代码后，AI 应自主执行 Docker 测试验证功能完整性：
1. 确保本地 Docker 运行中
2. 执行 `bash scripts/docker-test.sh`
3. 测试全部通过 → 确认功能正常
4. 有失败项 → 分析原因并修正后重新测试

Docker 镜像推送到 `ghcr.io/appotry/company-reputation`，标签策略：
- `main` 分支 → `latest`
- `v1.2.3` tag → `1.2.3`, `1.2`, `latest`
- 每次 push → `sha-{短提交}`

Pages 部署需要先在 GitHub 仓库 Settings → Pages 中启用 Actions 部署源。

## 项目结构

```
├── companies/           # Markdown 数据源（公司 + 部门 + 职位）
│   ├── 华为.md          # 公司总览
│   ├── 腾讯.md
│   └── 华为/
│       ├── 终端业务部.md    # 部门（可放在子目录内）
│       ├── 终端业务部/
│       │   └── positions/
│       │       └── 嵌入式软件工程师.md   # 职位
│       └── 终端BG/
│           ├── 终端BG.md
│           └── 手机产品线/        # 支持任意深度嵌套
│               ├── 手机产品线.md
│               └── 上海研发中心.md
├── scripts/
│   └── build.mjs       # 构建脚本：递归扫描 + EJS 渲染 + 静态 HTML
├── template/            # EJS 模板
│   ├── index.ejs       # 首页（搜索 + 热门企业 + 行业标签）
│   ├── list.ejs        # 搜索结果页
│   ├── company.ejs     # 公司/部门详情页（部门列表、职位、员工评价、对比）
│   ├── position.ejs    # 职位详情页（薪资范围、技术栈、面试流程、类似职位）
│   └── compare.ejs     # 公司对比页
├── .editorconfig        # 编辑器配置
├── .gitattributes       # Git 属性（EOL 规范化）
├── .gitignore           # Git 忽略规则
├── LICENSE              # MIT 开源许可
├── README.md            # 项目总览
├── CONTRIBUTING.md      # 贡献指南
├── CHANGELOG.md         # 版本更新日志
├── config.json          # 构建配置（sourceBase 等）
├── i18n/                # 多语言翻译（zh-CN/en/ja/ko/fr/de/es/pt/ru）
├── static/              # CSS / JS 资源
├── docs/                # 多角色文档
│   ├── REQUIREMENTS.md    # 需求文档（含所有模块/优先级/状态）
│   ├── ARCHITECTURE.md    # 架构分析文档
│   ├── ENGINEERING.md     # 工程设计文档（含工程化规范）
│   ├── TESTING.md         # 测试分析文档
│   ├── USER_GUIDE.md      # 用户使用指南
│   ├── LESSONS.md         # 开发教训总结
│   └── sessions/           # AI 会话归档 + 需求版本演变
├── dist/                # 构建产物（gitignore）
└── package.json
```

## 关键细节

- **Git 远程**：双远程
  - `gitea` → 内网 Git 服务（保留完整开发历史）
  - `github` → git@anti996pua:anti996pua/company-reputation.git（`main` 分支，干净历史）
- **sourceBase 配置**：`config.json` 控制 ✏️ 编辑链接基地址，指向 GitHub
- **死代码注意**：`template/department.ejs` 已删除；`build.mjs` 中公司+部门共用 `company.ejs`

- **Node >= 16**，仅需 `ejs`、`fs-extra`、`uglify-js` 三个依赖
- **无 lockfile**（遵循原项目惯例，`package-lock.json` 在 `.gitignore` 中）
- **Markdown 格式**：标题行 + `===` 分隔（任意数量 `=`）+ 描述 + `##` 章节
- **递归嵌套**：子目录可无限嵌套，部门 `.md` 与同名子目录可放在同一层
- **职位支持**：部门下创建 `positions/` 子目录，放职位 `.md` 文件
- **暗色模式**：CSS 变量 + `prefers-color-scheme` + `localStorage` 持久化
- **客户端搜索**：全量数据嵌入前端（`data.js`），即时搜索无需服务器
- **跨公司对比**：每个公司/部门页面有 🔀 对比按钮，最多选 4 家公司
- **跨公司跳槽参考**：职位页面有「类似职位」区，通过 `positionIndex` Map 解析双向链接
- **员工评价**：Markdown 中 `## 员工评价` 区块，格式 `### date | role | experience | author`，后跟 `>` 引言、`评分: X.X/5`、`**优点**` / `**缺点**` 块
- **无自动化测试**（手工功能测试为主，见 `docs/TESTING.md`）
- **CI 集成**：`.github/workflows/ci.yml` 自动构建验证
- **Giscus 评论**：替换 Disqus，通过 `config.giscus` 对象配置（repo/repoId/category/categoryId）；空值隐藏评论区。动态创建 script 标签，从 localStorage 读语言/主题初始化
- **图片图廊分级标题**：`section.images.company`（公司风采）、`section.images.department`（部门风采）、`section.images.position`（职位风采），10 种语言
- **Dev server**：使用 `net.createServer`（裸 TCP）替代 `http.createServer`，支持原始 UTF-8 中文 URL 参数；`insecureHTTPParser` 不足以绕过 Node HTTP parser 对非 ASCII URL 的拒绝

## 工程化约定

### Git 提交规范

提交信息格式遵循 Conventional Commits + Emoji 增强：

```
[emoji] type(scope): 简短描述（50 字以内）
```

Emoji 用于 `git log --oneline` 视觉快速扫描，非必需但推荐。

| type | emoji | 用途 |
|------|-------|------|
| feat | ✨ | 新功能 |
| fix | 🐛 | Bug 修复 |
| docs | 📖 | 文档变更 |
| refactor | ♻️ | 代码重构 |
| perf | ⚡ | 性能优化 |
| test | 🧪 | 测试相关 |
| ci | 👷 | CI/CD 配置 |
| chore | 🔧 | 构建/工具/配置 |
| style | 🎨 | 代码格式 |

**提交原则**：
1. **小提交** — 每个提交只做一件事，禁止超大混合提交
2. **构建验证** — 提交前必须 `npm run build` 通过
3. **文档同步** — 代码变更同步更新相关文档
4. **不做混合提交** — 功能开发和文档修改不混在一个提交里

**分支命名**：

| 用途 | 格式 |
|------|------|
| 数据贡献 | `data/{公司名}` |
| Bug 修复 | `fix/{描述}` |
| 功能开发 | `feat/{描述}` |
| 文档 | `docs/{描述}` |
| 重构 | `refactor/{描述}` |

### 编码规范

- **缩进**：2 空格（`.editorconfig` 已配置）
- **编码**：UTF-8，LF 换行
- **JavaScript**：ES 模块（`.mjs`），`const` 优先，`camelCase` 命名
- **CSS**：CSS 变量 `--prefix-name`，`kebab-case` 类名，移动端优先
- **EJS 模板**：不写业务逻辑，使用 `__('key')` 调用 i18n
- **错误处理**：try-catch 不吞异常
- **版本号**：[SemVer](https://semver.org/)（MAJOR.MINOR.PATCH）

### 代码审查

- 每个 PR 至少一名 reviewer
- 审查重点：逻辑正确性、向后兼容、文档同步
- data 分支 PR 额外校验数据格式

## 需求实现工作流

> **所有需求实现必须三同步**：需求文档 + 代码 + 使用说明同时更新

| 步骤 | 操作 | 涉及文档 |
|---|---|---|
| 1. 需求分析 | 分析用户需求 → 定优先级 (P0/P1/P2) → 排期 | `docs/REQUIREMENTS.md` |
| 2. 架构设计 | 评估影响范围 → 设计实现方案 | `docs/ARCHITECTURE.md` |
| 3. 编码实现 | 修改代码 + 数据源 | `scripts/`、`template/`、`companies/` 等 |
| 4. 文档同步 | 更新需求状态 + 工程细节 + 用户说明 | `docs/REQUIREMENTS.md` + `docs/ARCHITECTURE.md` + `docs/ENGINEERING.md` + `docs/USER_GUIDE.md` (根据影响范围选) |
| 5. 验证 | 构建 (`npm run build`) + 预览查看 | dist/ 产物 |
| 6. 归档 | 更新 AGENTS.md 摘要 + TODO 清零 | `AGENTS.md` |

## 提交前全量验证清单

> 每次提交代码前，必须执行以下所有步骤，确保修改不引入回归、文档与代码一致。

| # | 检查项 | 操作 | 通过标准 |
|---|---|---|---|---|
| 0 | 实时预览验证 | 检查 dev server 是否存活：`lsof -i :8080`；若已死则重启：`nohup npm run dev > /tmp/dev-server.log 2>&1 &`，等待 2s 后 `curl http://127.0.0.1:8080/` | HTTP 200，日志无报错 |
| 1 | 构建验证 | `npm run build` | exit 0，无报错 |
| 2 | 功能测试 | 手动验证本次修改涉及的所有功能（如搜索、详情页、对比等） | 功能行为符合预期 |
| 3 | 需求冲突检查 | 对比 `docs/REQUIREMENTS.md`，确认新实现不否定或破坏已有需求 | 无冲突；如有冲突则记录方案并更新需求 |
| 4 | 全量一致性检查 | 通读所有 docs（REQUIREMENTS/ARCHITECTURE/ENGINEERING/TESTING/USER_GUIDE），逐条核对与实际代码一致 | 所有数据、配置、页面数、功能描述准确 |
| 5 | 教训记录 | 将本次开发中遇到的问题、根因、解决方案写入 `docs/LESSONS.md` | 问题有分析、有预防措施 |
| 6 | AGENTS 同步 | 更新 `AGENTS.md` 中的摘要、TODO、关键细节 | 反映当前项目状态 |

## 多角色持续改进法

> 项目优化应采用多角色交叉分析，避免单一视角盲区。每次大版本迭代前执行一次。每个角色按「范围→清单→产出→沟通」四步执行。

### 通用工作流程

```
1. 准备阶段：通读所有 docs + 关键代码（约 10 分钟）
2. 独立分析：每个角色按本角色的检查清单依次执行（约 15 分钟/角色）
3. 汇总阶段：用统一格式记录所有发现 → 分类定级 → 交叉比对
4. 修复 + 归档：修复问题 → 更新相关文档 → 经验录入 LESSONS.md
```

**发现记录格式**：

| 编号 | 角色 | 发现 | 文件位置 | 类型 | 严重度 | 关联角色 |
|---|---|---|---|---|---|---|
| F-001 | 测试 | 简述问题 | `file:line` | bug/改进/债务/文档 | P0/P1/P2 | 工程师、架构师 |

**严重度定义**：
- **P0**：功能异常/数据错误/安全风险 — 必须立即修复
- **P1**：功能缺失/体验问题/文档偏差 — 本轮修复
- **P2**：技术债务/优化建议 — 记录待排期

---

### 核心角色分析

| 角色 | 关注点 | 检查范围 | 产出 |
|---|---|---|---|
| 测试工程师 | 功能完整性、边界条件、回归覆盖 | 全部页面 + data.js + 搜索逻辑 | TESTING.md 增量、测试报告 |
| 架构师 | 技术选型、耦合度、扩展性、数据流 | build.mjs + 模板 + 前端 JS | ARCHITECTURE.md 增量、优化需求 |
| 工程师 | 实现与文档一致性、代码质量、技术债务 | 构建产物 + 文档对照 | ENGINEERING.md 增量、修复 |
| 产品经理 | 需求完整度、用户流程、优先级排序 | REQUIREMENTS.md + 用户端页面 | REQUIREMENTS.md 追溯矩阵更新 |

#### 1. 测试工程师

**范围**：`template/*.ejs` + `static/js/main.js` + `dist/js/data.js` + `dist/js/i18n.js` + 实时 HTTP 响应

**检查清单**：
- [ ] 每类页面（首页/搜索/公司/部门/职位/对比）HTTP 200
- [ ] 搜索匹配所有名称变体（中文/英文/日文/别名/标签）
- [ ] 部门搜索结果带父公司标签和蓝色竖线标识
- [ ] 对比页：添加/移除/上限 4 家/URL 参数/localStorage 持久化
- [ ] 职位页：薪资/技术栈/要求/流程/类似职位全部渲染
- [ ] 员工评价：格式正确/日期排序/优点/缺点
- [ ] 多语言：切换/持久化/参数替换/English 兜底
- [ ] 暗色模式：切换/持久化/系统跟随
- [ ] 标签点击：跳转搜索并预填 tag 参数
- [ ] 所有静态资源（css/js）HTTP 200
- [ ] 构建产物 page 数与预期一致
- [ ] 边界：搜索空字符串/超长输入/特殊字符

**发现输出**：更新 `docs/TESTING.md` 的测试用例表、新增边界测试用例、记录未覆盖场景

#### 2. 架构师

**范围**：`scripts/build.mjs` + `scripts/dev.mjs` + `template/*.ejs` + `static/js/main.js` + `config.json`

**检查清单**：
- [ ] 数据流是否清晰（Markdown → data.js/HTML → 客户端渲染）
- [ ] 模块耦合度：构建/模板/前端逻辑职责边界是否清晰
- [ ] 扩展性：新公司/新语言/新页面类型添加需要改几个文件
- [ ] 技术选型：当前技术（Node/EJS/pure CSS）是否仍然适合项目规模
- [ ] 内联代码：模板中有没有不应存在的 JS 逻辑（应外提）
- [ ] 死代码/无用文件/遗留注释
- [ ] 错误处理：构建失败/数据缺失/网络错误的兜底
- [ ] 构建策略：增量/全量/缓存机制设计
- [ ] 安全性：XSS 转义/sourceUrl 注入防范
- [ ] 客户端 JS 体积：data.js 大小增长趋势

**发现输出**：更新 `docs/ARCHITECTURE.md` 的设计决策、新增架构优化需求、记录架构级决策

#### 3. 工程师

**范围**：全部代码（scripts/template/static） vs 全部文档（所有 `docs/`）

**检查清单**：
- [ ] 目录结构文档（项目结构图）与实际文件系统一致
- [ ] 数据格式文档（字段名/类型/来源）与解析代码一致
- [ ] 构建步骤文档与 `build.mjs` 实际流程一致
- [ ] 所有文档中的数字（页面数/公司数/职位数/语言数）与实际构建产物一致
- [ ] 模板中使用的变量名与构建传入的数据对象字段名一致
- [ ] i18n key 名称与模板中的 `__('key')` / `data-i18n` 调用一致
- [ ] 构建产物路径与模板引用的资源路径一致（`basePath` 计算）
- [ ] 权限/配置管理方式文档与实际一致（env var vs config.json）
- [ ] 代码注释与实际实现一致（特别是标记 v4.0/v4.1/v4.2 的部分）
- [ ] 变量命名/文件命名风格一致（无拼写错误、风格统一）

**发现输出**：更新 `docs/ENGINEERING.md` 的分歧点、修复代码与文档不一致、记录技术债务

#### 4. 产品经理

**范围**：`docs/REQUIREMENTS.md` + 用户端所有页面（用户视角）+ `docs/USER_GUIDE.md`

**检查清单**：
- [ ] 所有需求（功能/非功能/数据/多语言/部署）的状态标注与实现一致
- [ ] 已实现功能清单与需求追溯矩阵匹配
- [ ] 用户操作流程（搜索→详情→对比→职位）是否完整顺畅
- [ ] USER_GUIDE.md 的操作步骤与页面实际交互一致
- [ ] 缺少的需求/功能缺口（用户可能想要但未实现的）
- [ ] 优先级排序是否需要调整（P0/P1/P2 划分是否合理）
- [ ] 未来扩展方向是否需要更新（已实现的转为「已实现」）
- [ ] 术语表是否需要补充

**发现输出**：更新 `docs/REQUIREMENTS.md`（状态/优先级/追溯矩阵）、更新 `docs/USER_GUIDE.md`（操作说明）、标记新需求

---

### 扩展分析角色

以下角色根据项目阶段和需求选择性执行，并非每次大迭代必需。

| 角色 | 适用时机 | 关注点 | 检查清单 |
|---|---|---|---|---|
| **UX/UI 设计师** | 任何 UI 可见的迭代 | 操作效率、信息层级、视觉一致性、触达便捷性、交互反馈 | 展开清单见下文 |
| **安全工程师** | 涉及外部依赖或用户数据的迭代 | XSS、依赖漏洞、CSP、内容注入、信息泄露 | [ ] 模板 `<%= %>` 正确转义用户数据 [ ] Giscus 脚本 CSP 兼容 [ ] sourceUrl 无 `javascript:` 注入 [ ] package.json 依赖无已知 CVE [ ] 静态文件无敏感信息泄露 |
| **DevOps 工程师** | 部署配置变更时 | CI/CD 流程、Docker 优化、部署验证、环境一致性 | [ ] CI 构建时长是否可接受 [ ] Docker 镜像大小是否优化（多阶段构建） [ ] Pages/Docker/Vercel 三个目标平台均可部署 [ ] 部署后访问所有关键页面 200 [ ] 环境变量/配置覆盖机制 |
| **性能工程师** | 数据量级变化时 | 构建时间、页面加载、搜索响应、产物体积 | [ ] `npm run build` 耗时 < 2s [ ] 首页 FCP < 1s [ ] 搜索响应 < 10ms [ ] data.js + i18n.js 合计量 < 100KB [ ] HTML 文件合计大小 < 500KB [ ] JS/CSS 是否可进一步压缩 |
| **数据分析师** | 数据源变更时 | 数据完整性、字段覆盖率、公司间一致性、异常值 | [ ] 所有公司的数据字段完整度统计 [ ] 评分分布是否合理（有无异常值） [ ] 各部门数据齐全 [ ] 职位数据覆盖面 [ ] 员工评价数量和质量 |
| **本地化工程师** | 多语言相关迭代 | i18n 完整性、翻译质量、RTL 支持、文化适配 | [ ] 所有键在各语言文件中都有翻译 [ ] English 兜底无显示原始 key 名的情况 [ ] 参数替换（`{company}`）在所有语言中正常工作 [ ] 日期/数字格式本地化 [ ] 9 种语言切换后无布局错位 |
| **文档工程师** | 任何迭代 | 文档完整性、可读性、一致性、导航结构 | [ ] 所有 docs 文件存在且链接正确 [ ] 各文档之间的交叉引用有效 [ ] 文档版本号与实际版本一致 [ ] 无过时/矛盾的信息 [ ] 文档对目标读者有明确的难易度匹配 |

---

### UX/UI 设计师详细检查清单

**范围**：`template/*.ejs` + `static/css/style.css` + `static/js/main.js` + 移动端预览

**核心关注**：操作效率、信息层级、视觉一致性、触达便捷性、交互反馈

**检查清单**：

#### A. 操作效率（用户 UI 操作方式快捷与否）
- [ ] **核心操作路径**：从首页到公司详情需 ≤ 2 次点击（搜索框选 → 点选/回车）
- [ ] **对比操作**：添加公司到对比列表需 ≤ 2 次点击，移除 ≤ 1 次
- [ ] **语言切换**：切换语言后页面内容立即生效，无需手动刷新
- [ ] **暗色切换**：主题切换 ≤ 1 次点击且立即生效
- [ ] **搜索即显**：输入搜索关键词后结果即时（< 30ms）显示，无额外点击
- [ ] **搜索降级方案**：支持回车确认跳转、清空按钮、键盘上下选择
- [ ] **标签过滤**：点击标签后直接跳转搜索结果，减少用户重复输入
- [ ] **返回导航**：详情页有返回搜索/首页的可见入口（面包屑/返回按钮）
- [ ] **最短操作路径分析**：用户从进入站点到完成某任务的最少步骤数（应有最优路径文档）

#### B. 触达便捷性（Fitts 定律）
- [ ] **搜索框突出**：搜索框位于首屏视觉焦点区域（左上/中央），占宽 ≥ 60%
- [ ] **关键按钮大小**：对比、搜索、语言选择等交互元素高度 ≥ 40px（移动端 ≥ 44px）
- [ ] **点击间距**：相邻可点击元素间距 ≥ 8px（移动端 ≥ 12px），防止误触
- [ ] **拇指热区**：移动端底部导航/操作按钮在屏幕下半部（拇指自然覆盖区域）
- [ ] **高频操作就近**：使用频度最高的操作（搜索、语言切换）靠近页面顶部/右下角
- [ ] **对比悬浮窗口**：对比抽屉在页面固定区域（底部/侧边），无需翻页查找

#### C. 视觉一致性
- [ ] **按钮风格统一**：同类按钮（所有对比按钮、所有编辑链接）外观一致（icon + 文字 + 圆角 + 悬停效果）
- [ ] **emoji 使用一致**：同一个语义使用同一个 emoji（🔀 = 对比，✏️ = 编辑），不混用
- [ ] **i18n 全覆盖**：按钮文字、title、alt 全部使用翻译 key，无任何硬编码中文
- [ ] **字体大小层次**：标题(h1/h2/h3)、正文、辅助文字有明确的大小梯度（≥ 2px 级差）
- [ ] **卡片样式统一**：公司卡片/部门卡片/职位卡片在间距、圆角、阴影上保持一致
- [ ] **暗色/亮色双模**：所有元素在两种模式下都经过人工校验，无白字白底、黑字黑底

#### D. 信息层级
- [ ] **首屏关键信息**：公司名称/评分/一句话描述在首屏可见，无需滚动
- [ ] **信息密度控制**：每卡片信息量 ≤ 5 行文本（超过折叠/展开）
- [ ] **内容分组清晰**：使用分隔线/背景色/间距区分信息块（基本信息/薪资/评价）
- [ ] **阅读顺序**：自然阅读顺序（Z 型/F 型）信息排布，评分等关键数据优先
- [ ] **数据可视化**：评分评分用星级/数字突出，对比表用颜色高亮优势项

#### E. 交互反馈
- [ ] **点击反馈**：所有可点击元素有 hover（桌面）/ active（移动）视觉状态变化
- [ ] **加载状态**：搜索有 "搜索中..." 提示（尽管是本地搜索，考虑大 data.js）
- [ ] **空状态引导**：搜索无结果时显示建议操作（检查拼写/换关键词/浏览热门公司）
- [ ] **对比操作反馈**：添加/移除公司时有 toast 提示（"已加入对比"/"已移除"）
- [ ] **上限提醒**：对比达到 4 家上限时明确提示用户
- [ ] **错误兜底**：页面加载失败/数据断裂时有防错显示（"数据加载异常，请刷新重试"）

#### F. 键盘与无障碍（a11y 基础）
- [ ] **Tab 导航**：所有交互元素可通过 Tab 键顺序访问
- [ ] **Focus 可见**：所有 focusable 元素有 focus-visible 轮廓样式
- [ ] **ARIA 标签**：搜索框有 `aria-label="搜索公司/部门/职位"`，对比按钮有 `aria-label`
- [ ] **语义化 HTML**：使用 `<nav>`、`<main>`、`<section>` 等语义标签
- [ ] **高对比度**：所有文本与背景色对比度 > 4.5:1（WCAG AA）

#### G. 移动端响应式
- [ ] **≤ 640px 无溢出**：所有卡片、表格、导航栏在最小宽度不横向滚动
- [ ] **表格响应式**：对比表等复杂表格在小屏有横向滚动或卡片式折叠方案
- [ ] **字体缩放**：设置 `font-size: 100%`（用户可缩放），不使用固定 px
- [ ] **meta viewport**：`<meta name="viewport" content="width=device-width">` 存在

**发现输出**：更新 `docs/ENGINEERING.md` 的前端优化建议、报告操作效率瓶颈、标记视觉不一致

---

### 执行步骤（详细版）

1. **准备（5 分钟）**
   - 确认当前迭代范围（哪些模块被修改）
   - 收集基线数据：`npm run build` 日志、dist/ 文件列表、`npm ls` 依赖
   - 确保 dev server 存活：实时预览可用

2. **核心角色分析（各 15 分钟）**
   - 按「测试 → 架构 → 工程 → 产品」顺序依次执行
   - 每个角色对照自己的检查清单逐项检查
   - 发现记录到统一表格（格式见上）

3. **汇总交叉分析（10 分钟）**
   - 合并所有角色的发现表，去掉重复项
   - 识别跨角色发现（一个问题影响多个角色）
   - 按严重度排序：P0 > P1 > P2
   - 确定修复优先级和负责人

4. **修复与归档**
   - P0 问题立即修复
   - P1 问题在本轮迭代中修复
   - P2 问题记录到 `docs/REQUIREMENTS.md` 的 EXT 列表
   - 所有修复验收 → 构建验证 → 更新 LESSONS.md

5. **版本收尾**
   - 确认所有检查清单项已关闭
   - 更新 AGENTS.md 摘要
   - 提交代码

---

### 跨角色发现联动示例

一个典型的多角色交叉发现链条：

```
[测试] 发现搜索职位结果标识不清
  → [架构] 确认 data.js 中位置数据缺少 isPosition 字段用于前端渲染
    → [工程] 修复 data.js 生成逻辑 + 更新 main.js 搜索渲染
      → [产品] 更新 USER_GUIDE.md 中关于搜索功能说明
        → [文档] 确认所有 docs 已同步
```

这种链条式发现比单角色发现更深入，能同时修复功能、架构、文档多个层次的问题。

## 编码纪律

遵循 [Karpathy 编码纪律](https://github.com/multica-ai/andrej-karpathy-skills)（思考优先 / 简约优先 / 精准修改 / 目标驱动）。编码任务中通过 `skill(name="karpathy-guidelines")` 加载。

编码完成后，对核心逻辑、安全敏感、并发代码执行 **Grill-me（对抗式审查）**：切换为挑剔审查者人格，穷举找出所有缺陷，修复后再审查，循环达标为止。详见 skill 第 5 节。

## Superpowers-zh 中文工作流技能

本项目集成 [superpowers-zh](https://github.com/jnMetaCode/superpowers-zh) 中文技能集。以下是本项目中适用的技能和调用时机：

| 技能 | 调用时机 |
|------|----------|
| `brainstorming` | 任何创造性工作、新功能设计之前 — 先探索用户意图和需求 |
| `chinese-documentation` | 编写或更新中文文档、README |
| `chinese-commit-conventions` | 提交 git commit（中文项目） |
| `chinese-code-review` | 代码审查且团队使用中文沟通 |
| `systematic-debugging` | 遇到任何 bug、测试失败或异常行为 — 在提修复方案之前执行 |
| `verification-before-completion` | 在宣称工作完成、提交或创建 PR 之前 — 必须运行验证命令 |
| `writing-plans` | 多步骤任务有规格说明或需求时 — 在写代码之前 |
| `dispatching-parallel-agents` | 面对 2 个以上可独立进行的任务时 |
| `requesting-code-review` | 完成任务、实现重要功能或合并前 |
| `receiving-code-review` | 收到代码审查反馈后、实施建议之前 |
| `test-driven-development` | 实现任何功能或修复 bug 之前 — 先写测试 |
| `mcp-builder` | 构建 MCP 服务器/工具 |

使用方式：`skill(name="skill-name")` 加载对应技能后按指引执行。

## 经验知识库

路径：`~/Work/dev-experience/`（[gateway skill](~/.agents/skills/dev-experience/SKILL.md) 自动加载）
本项目标签：`static-site`, `frontend`, `search`, `automation`

## 文档导航

| 文档 | 适用角色 | 链接 |
|---|---|---|
| `docs/REQUIREMENTS.md` | 产品经理 | 所有需求、优先级、状态、追溯矩阵（含需求管理规范） |
| `docs/ARCHITECTURE.md` | 架构师 | 技术选型、数据流、决策记录 |
| `docs/ENGINEERING.md` | 工程师 | 开发环境、目录结构、构建流程、编码规范 |
| `docs/USER_GUIDE.md` | 用户/贡献者 | 功能介绍、数据格式、常见问题 |
| `docs/TESTING.md` | 测试工程师 | 测试策略、测试用例 |
| `docs/LESSONS.md` | 全体 | 开发教训、常见陷阱、预防措施 |
| `docs/sessions/` | 全体 | AI 会话记录、需求版本演变、决策回溯 |
