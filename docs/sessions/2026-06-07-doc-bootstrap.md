# 会话记录：2026-06-07 10:25 - 项目文档体系建立与经验知识库搭建

> 本次会话是系列的第 8 轮。前 7 轮见同目录下的 `2026-06-06-*-*.md`。

## 元信息

- 日期：2026-06-07
- 触发需求：从标准工程视角建立完整本地文档体系，同步修改，遵守工程化约定
- 会话时长：多轮对话

## 需求版本演变

| 版本 | 阶段 | 需求描述 | 对应产出 |
|------|------|----------|----------|
| v1 | 初始 | 建立各种本地文档，从标准工程化角度，同步修改，遵守小提交 | `README.md`、`CONTRIBUTING.md`、`CHANGELOG.md`、`LICENSE`、`.editorconfig`、`.gitattributes` |
| v1.1 | 细化 | 把工程化约定写入 AGENTS.md | `AGENTS.md` 新增"工程化约定"节 |
| v2 | 扩展 | 项目经验跨项目复用 | `~/Work/dev-experience/` 知识库搭建 |
| v2.1 | 细化 | 分类归纳经验，按标签检索 | 9 个类别 28 条经验文件 |
| v2.2 | 细化 | 新项目接入说明 | `README.md`、`INDEX.md` 接入指南 |
| v2.3 | 细化 | AGENTS 沟通约定也要写入 | `00-ai-agent/02-communication-conventions.md` |
| v3 | 变更 | 参考 cz-cli + cz-emoji-conventional 设计更好规范 | `04-enhanced-commit-convention.md`，含 emoji + 工具链 |
| v3.1 | 细化 | 确认提交规范是否已入库 | 确认已有，补充实时新增经验和迭代流程 |
| v4 | 扩展 | 批判性使用经验的原则 | `05-critical-experience-consumption.md` |
| v5 | 扩展 | 会话记录本身也要归档 | 当前文档 + `06-session-recording.md` |

## 关键决策

| 决策 | 选项 | 选择理由 | 放弃的方案 |
|------|------|----------|-----------|
| 经验存放位置 | 独立仓库 vs 项目内部 | 独立仓库跨项目复用 | 项目内部的 LESSONS.md 只存项目特定内容 |
| 经验分类方式 | 数字前缀 vs 按标签 | 数字前缀控制排序和目录浏览 | 纯标签系统不便浏览 |
| 提交格式 | 纯文本 vs emoji 增强 | emoji 增强方便视觉扫读 | 纯文本在 git log 中区分度低 |
| AGENTS.md vs ENGINEERING.md 分工 | AGENTS.md 给 AI 快速参考 | AGENTS 存顶层约定，ENGINEERING 存详细规范 | 重复维护两份 |
| 经验文件格式 | tags front-matter + problem/solution/migration-tips | 统一格式方便解析和阅读 | 自由格式不利于一致性 |

## 产物清单

### 新建文件（项目内）

| 文件 | 说明 |
|------|------|
| `.editorconfig` | 编辑器配置 |
| `.gitattributes` | Git EOL 规范化 |
| `LICENSE` | MIT 许可（更新版权） |
| `README.md` | 项目总览 |
| `CONTRIBUTING.md` | 贡献指南 |
| `CHANGELOG.md` | 版本日志 |
| `docs/sessions/SESSION_TEMPLATE.md` | 会话记录模板 |
| `docs/sessions/2026-06-07-doc-bootstrap.md` | 本文档 |

### 新建文件（知识库）

| 文件 | 类别 |
|------|------|
| `00-ai-agent/01-agents-structure.md` | AGENTS 结构 |
| `00-ai-agent/02-communication-conventions.md` | 沟通约定 |
| `00-ai-agent/03-project-type-tagging.md` | 项目标签体系 |
| `00-ai-agent/04-advice-from-session.md` | 会话建议总结 |
| `00-ai-agent/05-critical-experience-consumption.md` | 经验批判性使用 |
| `00-ai-agent/06-session-recording.md` | 会话记录规范 |
| `01-static-site/01-markdown-source.md` | Markdown 数据源 |
| `01-static-site/02-dev-server-encoding.md` | Dev server 编码 |
| `02-frontend/01-no-harcode-i18n.md` | i18n 零硬编码 |
| `02-frontend/02-dark-mode.md` | 暗色模式 |
| `02-frontend/03-responsive-table.md` | 响应式表格 |
| `02-frontend/04-toast.md` | Toast 通知 |
| `02-frontend/05-a11y-basics.md` | 无障碍基础 |
| `03-git-workflow/01-small-commits.md` | 小提交（更新） |
| `03-git-workflow/02-three-branch-model.md` | 三分支 |
| `03-git-workflow/03-conventional-commits.md` | Conventional Commits |
| `03-git-workflow/04-enhanced-commit-convention.md` | 增强版提交规范 |
| `04-documentation/01-triple-sync.md` | 三同步 |
| `04-documentation/02-multi-role-review.md` | 多角色审查 |
| `04-documentation/03-doc-bootstrap-workflow.md` | 文档初始化工作流 |
| `05-ci-cd/01-build-first.md` | 构建前置 |
| `05-ci-cd/02-docker-multi-stage.md` | Docker 多阶段 |
| `05-ci-cd/03-gh-pages-setup.md` | Pages 部署 |
| `06-i18n/01-multi-lang-fallback.md` | 多语言回退 |
| `06-i18n/02-language-selector.md` | 语言选择器 |
| `07-data/01-data-proximity.md` | 数据就近 |
| `07-data/02-validation.md` | 数据校验 |
| `08-testing/01-boundary-search.md` | 搜索边界测试 |
| `08-testing/02-no-404-page.md` | 404 页面 |
| `99-general/01-silent-failure.md` | 静默失败 |
| `99-general/02-dead-code.md` | 死代码 |
| `99-general/03-platform-diff.md` | 平台差异 |
| `99-general/04-config-layers.md` | 配置分层 |
| `templates/AGENTS.template.md` | AGENTS 模板 |
| `INDEX.md` | 知识库索引 |
| `README.md` | 知识库使用说明 |
| `projects/company-reputation/tags.txt` | 项目标签 |
| `projects/company-reputation/notes.md` | 项目绑定映射 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `AGENTS.md` | 工程化约定 + 经验库引用 + 沟通约定 |
| `docs/ENGINEERING.md` | 新增 §11 工程化规范 + emoji 提交格式 |
| `CONTRIBUTING.md` | emoji 提交格式同步 |
| `docs/LESSONS.md` | 新增 §16 可迁移经验总结 + 知识库交叉引用 |

### 提交记录（项目 main 分支）

```
6c919982a chore: add .editorconfig and .gitattributes
336d2c615 chore: add MIT LICENSE
73dd80bfd docs: add README.md with project overview and documentation navigation
2e842c30a docs: add CONTRIBUTING.md with data format and contribution workflow
a21407a20 docs: add CHANGELOG.md with version history
9167c2c7d docs(engineering): add git conventions and coding standards
3e796c9de docs(agents): add engineering conventions section and sync project structure
3860f50a0 docs(lessons): add transferable engineering patterns summary
946606c0b docs: integrate with cross-project experience knowledge base
a40f2a489 docs(agents): add reference to AI agent workflow conventions and template
f356ad916 docs(agents): add reference to doc bootstrap workflow pattern
0535358d7 docs: migrate commit convention to emoji-enhanced format
f4eafa66e docs: sync CONTRIBUTING.md commit convention with emoji format
61af6225e docs(agents): add reference to experience capture and iteration workflow
e7bc89c8b docs(agents): add reference to critical experience consumption framework
```

### 提交记录（知识库 master 分支）

```
812f788 initial: cross-project experience knowledge base
e673826 docs: add usage guide for new projects
1cf6332 feat(agents): add AI agent workflow category and AGENTS.md template
5c8f8f9 docs: add project doc bootstrap workflow pattern
a1db22d docs(agents): add session advice summary
40e771b feat(git): add enhanced commit convention with emoji + commitizen + commitlint
feaedc5 docs: add real-time experience capture and iteration workflow
df99f6c feat(agents): add critical experience consumption framework
```

## 未完成/待办

- [ ] 将 `~/Work/dev-experience/` 推送到远程 git 仓库
- [ ] 后续项目初始化时验证知识库的可用性
- [ ] 补充更多类别（backend、mobile、security 等）的经验
- [ ] 考虑添加脚本自动检查经验文件的 tags 和格式完整性

## 会话系列索引

| # | 日期 | 主题 | 文件 |
|---|------|------|------|
| 1 | 06-06 02:35 | 项目初始重构 v3.0 | `2026-06-06-v3-rebuild.md` |
| 2 | 06-06 04:52 | v4.0/v4.2 核心功能开发 | `2026-06-06-v4-features.md` |
| 3 | 06-06 11:35 | 多角色分析 V1-V3 质量审计 | `2026-06-06-multi-role-analysis.md` |
| 4 | 06-06 12:19 | 三分支模型 + 贡献指南 | `2026-06-06-three-branch.md` |
| 5 | 06-06 12:41 | 站点配置 + P1 修复 + 图片架构初版 | `2026-06-06-site-config-and-images.md` |
| 6 | 06-06 13:55 | 图片 + zh-TW + Toast + 多角色 V4 | `2026-06-06-image-zhTW-toast.md` |
| 7 | 06-06 20:24 | Disqus → Giscus 迁移 + 最终修复 | `2026-06-06-giscus-migration.md` |
| 8 | 06-07 10:25 | 文档体系建立 + 经验知识库搭建 | 本文档 |

## 验证记录

- 构建：✅ 每次 `npm run build` 均通过（116 页面）
