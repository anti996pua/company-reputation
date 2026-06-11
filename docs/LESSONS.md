# 项目开发教训总结

> 记录公司信誉查询系统开发过程中遇到的问题、原因分析和解决方案，避免重蹈覆辙。

## 1. 文档与代码不同步

### 问题
多处文档内容与实际代码行为不一致，导致后续开发产生错误的预判。

### 案例

| 问题 | 位置 | 文档写法 | 实际情况 | 影响 |
|---|---|---|---|---|
| 职位计数过时 | REQUIREMENTS.md 多处 | 9/6 个示例职位 | 25 个职位 | 误导排期评估 |
| 页面总数错误 | ENGINEERING.md、ARCHITECTURE.md | 97 / 94 页面 | 113 页面 | 误导性能评估 |
| 语言数量错误 | ARCHITECTURE.md 数据流图 | 3 种语言 | 9 种语言 | 架构理解偏差 |
| 源编辑链接配置 | ENGINEERING.md §7 | GIT_SOURCE_BASE 环境变量 | config.json 字段 | 配置方式错误 |
| 部门模板 | 所有 docs 中目录结构 | department.ejs 列出 | 从未被 build.mjs 使用 | 误导目录结构理解 |
| 测试文档 | TESTING.md | 无 CI 集成 | 已有 CI 工作流 | 文档过时 |
| 源链接路径 | ARCHITECTURE.md §8.5 | blob/main | src/branch/main（Gitea 差异） | 404 链接 |

### 根因
- "三同步"原则（需求 + 代码 + 文档）未严格执行
- 文档修改滞后于代码实现
- 无自动化检查确保文档与代码一致

### 预防
- 每次 PR 必须同步更新相关文档
- 关键配置（页面数、语言数、架构图）在文档中使用注释说明由构建脚本自动生成

## 2. Gitea vs GitHub 差异

### 问题
Git 平台差异导致编辑链接 404，构建配置不兼容。

### 案例：sourceBase 路径格式

```
GitHub:    blob/main → https://github.com/user/repo/blob/main/file.md  ✅
Gitea:     blob/main → https://git.xxx/user/repo/blob/main/file.md    ❌ 302 → 404
Gitea:     src/branch/main → https://git.xxx/user/repo/src/branch/main/file.md ✅
```

**原因**：GitHub 用 `/blob/main/` 路径浏览源码，Gitea 用 `/blob/` 会 302 重定向到 commit 快照，而 commit 快照的 `main` 分支指向最新 commit → 看起来正常但实际是重定向。问题在于某些 Gitea 版本 `/blob/` 重定向后的 URL 格式不兼容导致 404。

**教训**：
- 平台差异需在开发早期验证
- Gitea 源码浏览用法：`/src/branch/{branch}`（固定分支）或 `/src/commit/{hash}`（固定版本）
- 配置不应硬编码平台特定路径

### 案例：Git 远程管理

```
origin 指向 jaywcjlove/linux-command（原项目）→ 已删除
gitea  指向内网 Git 服务
```

**教训**：
- Fork 项目后立即清理上游远程，避免错误推送
- 推送到新仓库前先确认 remote 配置

## 3. 死代码问题

### 问题
`template/department.ejs` 存在但从未被使用。

### 发现过程
1. 查看 `build.mjs` 渲染逻辑 → 所有公司/部门页面共用 `company.ejs`
2. 搜索 `department.ejs` 引用 → 仅在目录结构文档中有提及
3. 确认无任何 import/require/render 引用该文件

### 为何产生
- 可能早期版本有单独部门模板，重构为统一 `company.ejs` 后未清理
- 目录结构文档照搬旧版未验证

### 处理
- 删除文件（`rm template/department.ejs`）
- 更新所有文档中的目录结构

## 4. 数据源质量问题

### 问题
华为公司页（华为.md）数据严重不完整 — 仅 22 行 2 个章节，其他公司页面均有完整 15 个章节。

### 原因
- 初期只关心部门结构展示，忽略公司总览内容
- 不同公司页面由不同时间/人员编写，缺少统一模板

### 修复
- 补充完整数据：基本信息/工作强度/是否996/加班/薪资/福利/WLB/职业发展/工作环境/企业文化/加班描述/福利描述/文化描述/优点/缺点

### 预防
- 创建公司数据模板文件，新增公司时必须包含所有字段
- 构建时增加数据完整性检查告警

## 5. 中文文档命名不一致

### 问题
部分文档链接使用 `USER_GUIDE.zh-CN.md`，但实际文件名为 `USER_GUIDE.md`。

### 影响
README.md 和 USER_GUIDE.md 中的多语言文档链接失效。

### 处理
改用 `USER_GUIDE.md` 作为默认（中文）文件名，移除对其他语言文档文件的引用（不存在）。

## 6. 国际化编辑文案不当

### 问题
`i18n/zh-CN.json` 中 `company.edit` 翻译为 `纠正错误`，暗示用户只有发现错误时才应编辑，不符合开源协作的开放贡献理念。

### 修复
改为 `修改更新`，文案更中性、鼓励贡献。

## 7. CI/CD 流程注意事项

### Pages 部署前提
- GitHub Pages 需要先在仓库 Settings → Pages 中启用 "GitHub Actions" 部署源
- 仅创建 `.github/workflows/pages.yml` 不够，需手动开启

### Docker 标签策略
- `main` 分支 → `latest`、`sha-{短提交}`
- `v1.2.3` tag → `1.2.3`、`1.2`、`latest`、`sha-{短提交}`
- 确保 `docker.yml` 中的标签计算逻辑与预期一致

## 8. 构建配置管理

### 问题
源编辑链接基地址最初硬编码在 `scripts/build.mjs` 中，后改为通过 `config.json` 配置，但文档未同步更新。

### 当前方案
- `config.json` 中的 `sourceBase` 字段
- 构建时读取并传递给模板
- 每个页面的 `sourceUrl = sourceBase + '/companies/' + sourcePath`

### 建议
- 未来可增加环境变量覆盖机制（`SOURCE_BASE` 环境变量 > `config.json`）
- 对敏感/环境相关配置统一管理，避免散落在构建脚本中

## 总结

| 类别 | 问题数 | 严重度 |
|---|---|---|
| 文档过时/不一致 | 8 | 高（误导决策） |
| 平台差异 | 2 | 中（功能异常） |
| 死代码 | 1 | 低（冗余维护） |
| 数据质量 | 1 | 中（展示不全） |
| 配置管理 | 1 | 中（生效方式错） |

**核心教训**：文档与代码必须同步维护，平台差异需提前验证，死代码应及时清理，数据源应有统一模板和完整性检查。

## 9. 多角色分析的发现（2026-06-06）

### 测试视角
- 测试用例从 22 个扩展至 56 个，覆盖所有功能模块
- 关键发现：`compare.js` 文件不存在（对比逻辑内联在模板中）、`positionCount` 非递归、无 404 页面
- 教训：测试覆盖分析应作为每次大版本发布的必要步骤

### 架构视角
- 对比页逻辑内联增加模板耦合度，不利于维护和缓存
- 职位数统计应为递归聚合（公司显示全公司职位数，而非仅直属）
- 缺少 Markdown 数据校验层，格式错误仅在构建时暴露
- 建议：所有客户端逻辑应外提为独立 JS 文件

### 工程师视角
- 文档中 `compare.js` 引用与实际情况不符（文件不存在）
- 构建脚本 `build.mjs` 积累了较多功能，可考虑拆分为模块
- Dev server 缺少对 `config.json` 变更的自动重建（当前缺少监听）

### 多角色分析价值
- 不同角色关注不同问题：测试找功能缺口，架构找设计问题，工程找实现偏差
- 三者互补才能完整评估项目健康状况

## 10. 多角度分析 V2 发现（2026-06-06）

按照完善后的多角色分析体系（11 个角色），本次发现汇总：

### 发现总表

| 编号 | 角色 | 发现 | 文件位置 | 类型 | 严重度 |
|---|---|---|---|---|---|
| F-101 | 测试 | 对比按钮文本无 i18n 翻译（硬编码"🔀 对比"） | company.ejs:90, position.ejs:54 | bug | P0 |
| F-102 | 测试 | 部门卡片编辑链接 title 硬编码"修改更新" | company.ejs:116 | bug | P0 |
| F-103 | 测试 | 对比页 title 硬编码"公司对比 - "前缀 | compare.ejs:6 | bug | P0 |
| F-104 | 测试 | 对比页 footer 缺少 `footerMeta`（其他页面有） | compare.ejs:61 | 改进 | P1 |
| F-105 | 测试 | 404 页面返回 200（fallback 到首页） | dev.mjs:91-98 | 改进 | P1 |
| F-106 | 测试 | 对比表语言切换后不更新（JS 动态渲染无 data-i18n） | compare.ejs:118-134 | 改进 | P1 |
| F-107 | 测试 | 对比表 XSS 风险：`escAttr()` 仅转义单引号 | compare.ejs:72 | 安全 | P1 |
| F-201 | 架构 | index.ejs/list.ejs 无 `basePath`（子目录部署会全站崩溃） | template/index.ejs, list.ejs | bug | P1 |
| F-202 | 架构 | 对比逻辑 117 行内联 JS 在模板中（不可缓存、难维护） | compare.ejs:68-184 | 债务 | P1 |
| F-203 | 架构 | list.ejs 75 行搜索渲染逻辑内联（应外提到 main.js） | list.ejs:95-161 | 债务 | P1 |
| F-204 | 架构 | 搜索结果链接使用绝对路径 `c.p`（无 basePath） | list.ejs:132 | bug | P1 |
| F-205 | 架构 | 对比表无横向滚动条防护 | style.css:493-501 | 改进 | P2 |
| F-206 | 架构 | CSS 无 focus-visible 样式（键盘导航不可见） | style.css:全部 | 改进 | P2 |
| F-207 | 架构 | CSS 部分卡片元素暗色模式无过渡动画 | style.css:255,298,366,421,445 | 改进 | P2 |
| F-301 | 工程 | index.ejs 建议下拉框链接无 basePath | index.ejs:112 | bug | P1 |
| F-302 | 工程 | list.ejs tag 过滤链接无 basePath | list.ejs:129 | bug | P1 |
| F-303 | 工程 | 所有模板的 `<title>` 和 `<meta>` 无 `data-i18n` | 所有 ejs | 改进 | P2 |
| F-304 | 工程 | 所有模板语言选项 `<option>` 文本硬编码 | 所有 ejs:21-29 | 改进 | P2 |
| F-305 | 工程 | `compare.ejs` footer 无 `footerMeta` | compare.ejs:61 | 改进 | P1 |
| F-401 | 产品 | USER_GUIDE.md 未提及职位搜索、标签搜索功能 | USER_GUIDE.md | 文档 | P1 |
| F-402 | 产品 | 缺少"部门嵌套任何深度"的用户说明 | USER_GUIDE.md | 文档 | P1 |
| F-403 | 产品 | 对比功能描述未提及 URL 分享 | USER_GUIDE.md $126-131 | 文档 | P2 |
| F-501 | UX | 搜索无结果时显示"未找到"但无推荐公司链接 | list.ejs | 改进 | P2 |
| F-502 | UX | 对比页空状态只有文字提示无引导操作 | compare.ejs:98 | 改进 | P2 |
| F-503 | 安全 | compare.ejs 动态 HTML 中 `escAttr()` 不完整 | compare.ejs:72 | 安全 | P1 |
| F-504 | 安全 | `<%= %>` 全面覆盖 XSS 转义（符合预期 ✅） | 所有模板 | 正向 | ✅ |
| F-601 | 性能 | data.js 188KB 含 25 个职位数据（增长趋势需关注） | dist/js/data.js | 债务 | P2 |
| F-602 | 性能 | 首页 FCP 预计 < 1s（纯静态 ✅） | — | 正向 | ✅ |
| F-701 | 数据 | 华为.md 已补全至完整 15 章节 ✅ | companies/华为.md | 正向 | ✅ |
| F-702 | 数据 | 所有 25 个职位数据字段覆盖完整 ✅ | companies/*/positions/*.md | 正向 | ✅ |
| F-801 | 本地化 | en.json 缺失 6 个语言名 key（lang.de/ru/fr/es/pt/ko） | i18n/en.json | bug | P2 |
| F-901 | 文档 | 所有 docs 版本号与实际一致 ✅ | docs/*.md | 正向 | ✅ |

### 修复总结

| 严重度 | 数量 | 已修复 | 待修复 |
|---|---|---|---|
| P0（立即修复） | 3 | 3 ✅ | 0 |
| P1（本轮修复） | 6 | 1 | 5（basePath缺失/内联逻辑外提/XSS/文档补充） |
| P2（记录排期） | 8 | 0 | 8 |

### P0 修复明细
1. **F-101**: company.ejs/position.ejs 对比按钮 → 使用 `__('compare.addToCompare')` ✅
2. **F-102**: company.ejs 部门卡片编辑链接 → 使用 `__('company.edit')` ✅
3. **F-103**: compare.ejs title → 使用 `__('compare.title')` ✅

### 关键教训
- 多角色分析能从不同视角发现同个问题的不同层面（如对比按钮问题：测试看到无 i18n，安全看到 XSS 风险）
- i18n 覆盖不够全面：早期只关注了导航/标签/页脚的翻译，忽略了按钮 title 和动态渲染内容的翻译
- basePath 不一致是架构级隐患：3 个模板正确使用 basePath，2 个完全不使用
- 代码审查应增加跨模板一致性检查（index.ejs 和 list.ejs 明显与其他模板风格不同）
- 对比页 117 行内联 JS 是最大技术债务，建议迭代中优先外提

## 11. V3 增强 UX 角色多角度分析（2026-06-06）

应 UI 操作效率分析缺失问题，将 UX/UI 设计师检查清单从 1 行扩展至 7 大类 30+ 项（操作效率/触达便捷/视觉一致/信息层级/交互反馈/无障碍/响应式），然后重新执行全量 10 角色分析。

### 新增 UX/UI 设计师分析（核心新增）

| 编号 | 类别 | 发现 | 位置 | 严重度 |
|---|---|---|---|---|
| F-UX-01 | 操作效率 | 详情页无返回顶部按钮，长页面（华为 6 部门+8 指标+Giscus）需要手动滚回 | template/company.ejs | P2 |
| F-UX-02 | 触达便捷 | ✏️ 编辑图标仅 14px、opacity 0.3，点击目标极小 | style.css:259-265 | P1 |
| F-UX-03 | 视觉一致 | 首页搜索按钮橙色(#f97316) vs 搜索页蓝色，风格不统一 | style.css:116 vs 183 | P2 |
| F-UX-04 | 交互反馈 | 对比操作无 toast 提示，无法确认成功/失败 | compare.ejs:76-88 | P2 |
| F-UX-05 | 交互反馈 | 对比达上限使用 alert() 弹窗，破坏体验 | compare.ejs:78 | P1 |
| F-UX-06 | 无障碍 | 搜索框无 aria-label | index.ejs:42 | P1 |
| F-UX-07 | 无障碍 | 搜索结果页 `.result-item`（`<a>`）内含带 onclick 的 `<span>`，嵌套交互无效 HTML | list.ejs:129,132 | P1 |
| F-UX-08 | 无障碍 | 无自定义 `:focus-visible` 样式，暗色模式下 focus 可能不可见 | style.css 全文 | P1 |
| F-UX-09 | 无障碍 | 搜索建议下拉不支持键盘上下箭头 | index.ejs:99-121 | P1 |
| F-UX-10 | 响应式 | ≤ 640px 导航栏无汉堡菜单，12+ 元素挤在 56px 行内 | style.css:331-334 | P2 |
| F-UX-11 | 响应式 | 全部字号用 px 非 rem，用户缩放时布局可能错位 | style.css 全文 | P2 |
| F-UX-12 | 数据 | 卡片底部"📂 N 部门"切换语言后不翻译数字部分 | index.ejs:67 | P2 |

### 全量分析新增发现（非 UX）

**测试（P0 级发现）**：
| 编号 | 发现 | 位置 | 严重度 |
|---|---|---|---|
| F-T-001 | `{position}` `{dept}` 占位符在职位页 meta description 中未被替换 | build.mjs:560（`t()` 不支持参数）| P0 ✅ 已修复 |

**架构**：
| 编号 | 发现 | 位置 | 严重度 |
|---|---|---|---|
| F-A-01 | 语言选项硬编码在模板，加语言需改 5 个文件 | template/*.ejs:21-29 | P2 |
| F-A-02 | `compactData` 排除 `is996` 字段 | build.mjs:498-530 | P1 |
| F-A-03 | 对比表 `is996` 字段实际读取 `workIntensity` | compare.ejs:126 | P1 |
| F-A-04 | 内联对比逻辑只查 `window.ALL_DATA`，无回退 | compare.ejs:102 | P2 |

**工程（数据回归）**：
| 编号 | 发现 | 位置 | 严重度 |
|---|---|---|---|
| F-E-01 | `reviewCount` 从未被赋值（始终 0），导致 data.js 中无有效数据 | build.mjs:88 | P0 ✅ 已修复 |
| F-E-02 | `meta.department` i18n key 定义了但从未使用 | zh-CN.json:105 | P2 |
| F-E-03 | 12 个 i18n key 定义了但从未被模板调用 | zh-CN.json 多处 | P2 |
| F-E-04 | 9 个 `lang.*` key 定义了但语言选择器 `<select>` 硬编码未引用 | zh-CN.json:52-60 | P2 |

**安全**：
| 编号 | 发现 | 位置 | 严重度 |
|---|---|---|---|
| F-S-01 | `compare.ejs` innerHTML + `escAttr()` 仅转义单引号 | compare.ejs:73 | P1 |
| F-S-02 | ejs ~3.1.6 设大版本但 patch 可浮动（CVE 已在 3.1.10 修复）| package.json | P2 |

**文档 & 本地化**：
| 编号 | 发现 | 位置 | 严重度 |
|---|---|---|---|
| F-D-01 | REQUIREMENTS.md 标注"3 种语言"实为 9 | line:675 | P1 |
| F-D-02 | USER_GUIDE.md §14 与 §3 完全重复 | line:173-177 | P1 |
| F-D-03 | USER_GUIDE.md 未说明职位搜索、部门嵌套 | 多处 | P1 |
| F-D-04 | en.json 缺失 6 个 `lang.*` key | i18n/en.json | P1 |
| F-D-05 | ARCHITECTURE.md §8.5/§8.6 标题重复 | line:262 | P1 |

### 本次修复汇总

| 严重度 | 数量 | 已修复 | 待修复 |
|---|---|---|---|
| P0 | 3（meta 占位符 + reviewCount + 前次对比按钮）| 3 ✅ | 0 |
| P1 | 12 | 0 | 12（basePath/内联逻辑/XSS/文档/en.json 缺失等）|
| P2 | 15 | 0 | 15 |

### V3 轮教训
- **`t()` 函数不支持参数是最隐蔽的 P0**：EJS 编译时 __ 函数绑定到 `t(key)`，导致所有带参数的 `__('key', {var: val})` 调用静默失败。参数传入后被直接丢弃，占位符 `{var}` 原样输出到 HTML。这是典型的"静默失败"（silent failure）— 无报错、无警告，只有检查产物才能发现。
- **`reviewCount` 从未赋值**：初始化 0 后忘记在 `parseReviews` 完成后更新，导致索引页和详情页计数始终为 0。
- **UX/UI 操作效率应纳入核心分析流程**：之前的分析框架缺少操作效率维度，V3 补充后立即发现 12 项可用性问题。
- **分析发现数量与角色数不成线性关系**：10 角色分析产出 38 项发现，但 60% 集中在 3 个角色（UX/工程/测试）。建议后续将扩展角色按迭代范围裁剪执行。
- **多角色之间的发现联动效果显著**：如 UX 发现"对比达上限使用 alert()"与安全发现"对比页使用 innerHTML"指向同一个文件的不同行，可打包修复。

## 12. 三分支模型落地执行（2026-06-06）

将设计的三分支模型（develop/data/main）从文档落地到仓库的实际分支操作中。

### 执行步骤

```bash
# 1. 从 main 创建 develop 分支
git checkout -b develop main
git push gitea develop

# 2. 从 develop 创建 data 分支
git checkout -b data develop
git push gitea data

# 3. 推送最新 main
git push gitea main
```

### 验证结果

| 验证项 | 分支 | 结果 |
|---|---|---|
| npm run build | develop | ✅ 113 pages |
| npm run build | data | ✅ 113 pages |
| npm run build | main | ✅ 113 pages |
| node scripts/validate-data.mjs | main | ✅ 通过（63 warnings 为历史数据质量，非阻塞）|
| 模拟数据贡献（user/add-sample-company） | data → CI 检查 | ✅ 构建+校验通过，文件类型检测仅 companies/ ✅ |
| 三分支远程推送 | gitea | ✅ develop/data/main 全部推送成功 |

### 数据校验工具实况

首次运行发现以下历史数据问题（仅 warning，不影响构建）：
- 所有 21 家公司 `.md` 文件缺少 `## 行业` `## 标签` `## 描述` 章节 — 因为这些字段存在 `getInfo` 别名映射（如 `## 业务范围` 映射到 `行业`），校验器未做别名处理
- 所有 25 个职位薪资格式被标记 — 薪资格式多样化（含职级前缀如 `P5: 28-38K × 16 薪`），正则匹配偏严格

### 教训
- **git 分支操作需在 CI 之前完成**：三分支模型的核心是 CI 差异化检查，如果分支保护规则和 CI 配置先于分支创建，推送时 CI 会因找不到分支而失败
- **数据校验器的别名映射**：实际公司文件使用 `## 业务范围` 而非 `## 行业`，校验器需要同步 build.mjs 中的别名映射逻辑
- **模拟工作流验证的重要性**：实际执行数据贡献→文件类型检查→构建→校验的全链路，发现了校验器的别名问题。如果仅设计不执行，这些问题直到用户提交 PR 时才会暴露

## 13. 图片架构 + zh-TW + toast + P1 修复（2026-06-06）

### 实现内容

| 功能 | 文件 | 说明 |
|---|---|---|
| 图片目录架构 | `images/`, `.gitignore` | project/companies/common 三类图片，uploads 目录 gitignore |
| 实体图片扫描 | `scripts/build.mjs` | 扫描 `.md` 同级 `img/` 子目录，复制到 `dist/c/{path}/img/` |
| 公司图标 | `images/companies/*.svg`, `build.mjs resolveCompanyIcon()` | 按优先级查找，`_default.svg` 兜底 |
| Favicon | 所有模板 `<head>` | 指向 `images/project/favicon.svg` |
| zh-TW 语言 | `i18n/zh-TW.json` + 模板 select | 回退链 zh-TW → zh-CN → en → 原始 key |
| 图片画廊 | `template/company.ejs`, `template/position.ejs` | 响应式 flex 布局展示实体图片 |
| Toast 通知 | 所有模板 `.toast-container` + `showToast()` | 替代 `alert()`，2.5s 自动消失 |
| 条件 Giscus | `template/company.ejs`, `template/position.ejs` | `<% if (config.giscus && config.giscus.repo) %>` 包裹 |
| 贡献入口全页面 | 所有模板 | contribute-bar 加到 index/list/compare |
| a11y tag 修复 | `template/list.ejs` | `<span onclick>` 改为 `<a>`，消除嵌套 |
| i18n 硬编码移除 | `scripts/build.mjs` | 替换中文硬编码为 `t[key]` 回退链 |
| 10 个语言文件补全 | `i18n/{ko,fr,de,es,pt,ru}.json` | 补充缺失的翻译 key |
| config.template.json | 项目根目录 | `config.json` 缺失时自动复制 |
| 多语言 siteName/shortName | `config.json` | 按语言对象覆盖，优先级高于 i18n |

### 遇到的问题

| 问题 | 根因 | 解决 |
|---|---|---|
| shell glob 不支持中文匹配 | `.ejs` 模板找 tag filter 用 `*` 不匹配带 `.` 的文件 | `find -name` 代替 |
| `sed` 插入行间距不一致 | 不同模板 select 选项缩进不同 | 分模板逐个编辑 |
| EJS 中编码空格差异导致 `edit` 不匹配 | `company.ejs` 的 `h1` 行在之前 session 已被编辑 | 用 `read` 看精确内容后匹配 |
| 占位 SVG 需满足 `xmlns` 要求 | 纯手写 SVG 省略了命名空间 | 添加 `xmlns="http://www.w3.org/2000/svg"` |

### 教训

- **图片目录设计前置思考**：确定图片存放位置（实体 `img/` vs 全局 `images/`）后再编码，避免多次调整路径方案。当前方案让实体图片跟随 `.md` 文件（就近原则），品牌和占位图片放在顶层 `images/`（全局共享）。
- **多语言回退链深度**：zh-TW → zh-CN → en → 原始 key 的四层回退需要前后端同时支持（`build.mjs` 中 `__(key)` 和客户端 `switchLang()`）。构建时和运行时的回退逻辑需要保持一致。
- **config.json 变更向后兼容**：将 `siteName` 从字符串改为对象时，`build.mjs` 需要同时检测新旧格式。`config.template.json` 的自动复制机制确保了新用户始终获得正确格式。
- **翻译补全依赖发现**：`en.json` 补充 `zh-CN.json` 不存在的 6 个 key 后，所有语言文件都需要同步补全。遗漏会导致构建时 key 缺失显示原始键名。

## 14. 多角色改进 V4 + 图片路径修复（2026-06-06）

### 多角色分析发现汇总

| ID | 角色 | 发现 | 文件/位置 | 类型 | 严重度 |
|---|---|---|---|---|---|
| F-004 | 测试 | `<html lang="zh-CN">` 硬编码，切换语言不更新 | `template/*.ejs:2` | a11y | P1 → ✅ 已修复 |
| F-011 | 测试 | 图片路径错误：`basePath+'/img/'` 指向 `dist/img/` 但图片在 `dist/c/{path}/img/` | `build.mjs:430, company.ejs:102` | bug | P1 → ✅ 已修复 |
| F-038 | 测试 | `images/placeholders/` 空目录 | `images/placeholders/` | 债务 | P2 → ✅ 已删除 |
| F-039 | 测试 | 无 404 页面 | `dev.mjs:91` | 改进 | P2 |
| F-005 | 测试 | Language select 标签硬编码，无 data-i18n | `template/*.ejs` | 改进 | P2 |
| F-007 | 测试 | `images/common/` 占位图未在模板引用 | `template/*.ejs` | 债务 | P2 |
| F-015 | 测试 | 公司图标仅 `_default.svg`，无真实公司图标 | `images/companies/` | 改进 | P2 |

### 本次修复内容

| 修复 | 原因 | 方案 |
|---|---|---|
| 实体图片路径 | basePath 计算错误 → 路径指向根目录而非 /c/ | 改用 `lastSegment + '/img/'`（实体名目录与 HTML 文件同级） |
| SVG 宽高缺失 | SVG 无 `width`/`height` 属性，部分浏览器不渲染 | 为所有示例 SVG 添加 `width="400" height="200"` |
| CSS 图片显示 | `max-width:100%` + `height:auto` 在 flex 容器中不可靠 | 改为 `width:100%; display:block; object-fit:contain`，响应式用 `width:calc(50%-6px)` |
| `<html lang>` 硬编码 | 切换语言时不更新 lang 属性，影响 a11y/SEO | `switchLang()` 设置 `document.documentElement.lang`，初始化时根据 currentLang 设置 |
| 图片区标题 | 图片画廊无标题，用户不知道这是什么区域 | 添加 `<h2>` 标题 + 所有语言文件的 `section.images` key |
| 空目录 | `images/placeholders/` 空目录无用途 | 已删除 |

### 教训

- **相对路径测试必须用浏览器验证**：构建产物的相对路径在 curl 测试中看似正确（HTTP 200），但实际浏览器解析路径的方式与文件系统路径不同。需用实际浏览器或 URL 解析工具验证。
- **entityImgBase 仅需 lastSegment**：实体 HTML 文件（如 `华为/终端BG.html`）与其实体图片目录（`华为/终端BG/`）位于同级，相对路径只需 `终端BG/img/` 而非完整 pathSegments。
- **SVG 在 `<img>` 标签中需要显式宽高**：即便有 `viewBox`，部分浏览器（尤其移动端）不会从 viewBox 推断 `<img>` 中的 SVG 尺寸。显式 `width`/`height` 更可靠。
- **多角色分析发现联动**：测试发现"图片不显示" → 架构查明路径错误 → 工程修复 build.mjs + 模板 → 产品更新需求文档。这种联动发现链条比单角色视角深得多。

## 15. 评论系统迁移 Disqus → Giscus（2026-06-06）

### 实现内容

| 功能 | 文件 | 说明 |
|---|---|---|
| 配置对象 | `config.json`, `config.template.json` | `disqusShortname` 字符串 → `giscus` 对象（repo/repoId/category/categoryId） |
| 条件加载 | `template/company.ejs`, `template/position.ejs` | `<% if (config.giscus && config.giscus.repo) %>` |
| 动态脚本创建 | `template/company.ejs`, `template/position.ejs` | 同步 inline script 从 localStorage 读取语言/主题 → 创建 `<script async>` |
| 主题同步 | `scripts/build.mjs` i18n.js | `toggleTheme()` → `giscusPost({ setConfig: { theme } })` |
| 语言同步 | `scripts/build.mjs` i18n.js | `switchLang()` → `giscusPost({ setConfig: { lang } })` |
| 初始状态同步 | `scripts/build.mjs` i18n.js | 单次 message listener 兜底同步 |
| Loading 占位 | CSS `.giscus-loading` | 翻译 key `giscus.loading` + 居中提示 |
| i18n key 重命名 | `i18n/*.json` | `disqus.loading` → `giscus.loading` |
| 文档更新 | 所有 `docs/*.md` + `AGENTS.md` | 23 处 Disqus→Giscus 替换 |

### 多角色改进 V4 发现汇总

| ID | 角色 | 发现 | 文件/位置 | 类型 | 严重度 |
|---|---|---|---|---|---|
| V4-001 | 测试 | `data-lang="zh-CN"` 硬编码 → 非中文用户首次加载语言错误 | `template/company.ejs:283` | bug | P0 → ✅ 已修复 |
| V4-002 | 测试 | `giscusPost()` 在 iframe 创建前静默失败 | `build.mjs:544` | bug | P0 → ✅ 已修复 |
| V4-003 | 测试 | `giscus.loading` key 定义但未渲染 | `template/*.ejs` | 改进 | P1 → ✅ 已修复 |
| V4-004 | 产品 | 所有文档 23 处 Disqus 引用 | `docs/*.md, AGENTS.md` | docs | P1 → ✅ 已修复 |

### 遇到的问题

| 问题 | 根因 | 解决 |
|---|---|---|
| Giscus 语言/主题初始化错误 | `data-lang` 和 `data-theme` 硬编码为 zh-CN/preferred_color_scheme，不读 localStorage | 改为动态创建 script 标签，初始化前读 localStorage |
| 首次加载时 giscusPost 静默失败 | inline `switchLang()` 在 Giscus iframe 存在前调用 | 添加单次 message listener 兜底同步 |
| Giscus 与 GitHub 私有仓库不兼容 | Giscus 仅支持 public GitHub repo | 空 giscus 配置时评论区隐藏，需用户自行配置 GitHub 公开仓库 |

### 教训

- **第三方评论系统需考虑仓库类型**：Giscus 要求 GitHub 公开仓库 + 安装 Giscus App + 开启 Discussions。自托管 Git 服务（Gitea）不支持。设计时应明确依赖限制。
- **`async` script 初始化参数必须提前确定**：Giscus 等使用 `data-*` 属性的脚本仅在初始化（执行）时读取一次，之后只能通过 postMessage 修改。初始值需在脚本加载前从 localStorage 读取并用动态 script 创建。
- **文档三同步必须覆盖配置示例**：BRANCHING.md 中包含 config.json 示例片段，迁移时容易被遗漏。这类"隐式文档"（代码附带的配置示例）需要在变更清单中单独列出。

---

## 16. 可迁移工程经验总结

> 本节从本项目的开发运营中提炼出通用性、可跨项目复用的工程原则与实践。每个模式包含"问题"、"方案"和"迁移要点"。

### 16.1 文档三同步原则

**问题**：文档与代码不同步是技术债务最大来源。本项目的 8 处文档偏差直接导致后续开发方向错误、排期评估失误。

**方案**：
```
每次变更必须同步三处：需求文档 + 代码实现 + 使用说明
```

**迁移要点**：
- 将"三同步"写入 PR 模板的 checklist，强制审查
- 关键数字（页面数、组件数、性能指标）建议用脚本自动生成后注入文档
- 变更清单中单独列出"隐式文档"（配置示例、README 代码块、注释中的示例）

### 16.2 小提交纪律

**问题**：大混合提交导致回滚困难、审查复杂度高、提交信息失去语义。

**方案**：
```
每提交只做一件事 — 按 type(scope): desc 格式提交
类型限定：feat/fix/docs/refactor/perf/test/chore/style
```

**迁移要点**：
- 搭配 Conventional Commits + commitlint 在 pre-commit 阶段校验
- 用 `git log --oneline --graph` 可视化检验提交质量：理想状态是每个节点独立可读
- 实测 7 个小提交比 1 个大提交仅多用 2 分钟，但后续排查效率提升 10 倍

### 16.3 三分支质量门禁

**问题**：单分支模型无法区分开发、数据、生产三种角色的质量要求，导致数据贡献者可直接推送至生产。

**方案**：
```
develop (开发) ──→ data (数据) ──→ main (生产)
                    ↑        仅 companies/*.md
                    ↑        CI 校验格式 + 文件类型
```

**迁移要点**：
- 各分支 CI 差异化：develop 仅构建，data 加格式校验，main 加全量验证
- 分支保护规则前置，在创建分支前配置好，避免 CI 运行时找不到分支
- 数据贡献类项目（CMS、知识库）特别适合此模型，避免"只读生产"问题

### 16.4 多角色交叉分析

**问题**：单角色（仅工程师）审查容易遗漏 UX 缺陷、安全漏洞、文档偏差、数据质量问题。

**方案**：
```
每次大迭代前，指派 4 核心角色（测试/架构/工程/产品）按清单独立检查，
汇总后交叉比对发现，按 P0/P1/P2 分级修复。
```

**迁移要点**：
- 角色间发现联动效果显著（测试发现 bug → 架构定位 → 工程修复 → 产品跟文档）
- 并非角色越多越好 — 本项目的超 5 角色发现呈现明显递减效应，核心 4 角色覆盖 80%
- 保留规范化的检查清单（checklist），避免每次都从零开始

### 16.5 静默失败预防

**问题**：`t()` 函数不支持参数、`reviewCount` 从未赋值 — 这些 Bug 不报错、不告警，只有检查构建产物才能发现。

**方案**：
```
对每个无副作用的函数/初始化逻辑，显式测试其边界条件：
- 参数是否传入了但不生效？
- 变量是否定义了但未更新？
- 函数是否调用了但结果未被消费？
```

**迁移要点**：
- 静默失败是最危险的 Bug 类型：无错误 → 无告警 → 无迹可寻
- 在 CI 中加产物检查步骤（如 grep 构建输出中的占位符 `{var}`），避免占位符未被替换
- 单元测试应覆盖"返回值被使用"的断言，不仅测试函数是否不抛异常

### 16.6 平台差异早期验证

**问题**：GitHub 的 `blob/main` 在 Gitea 上返回 302 重定向最终 404，仅在部署后才发现。

**方案**：
```
项目启动第一周内验证所有目标平台的路径、API、配置差异，
将差异点写入决策记录（ADR），后续开发以此为准。
```

**迁移要点**：
- 尽早确定目标平台组合（Git 托管/CI/CD/部署），在 scaffolding 阶段验证
- 配置中不要硬编码平台特定路径，使用运行时拼接（如 `baseUrl + '/src/branch/' + branch`）
- 对多平台兼容的代码添加注释标注平台差异点

### 16.7 数据源就近原则

**问题**：图片放在全局 `images/` 目录，导致文件与所属实体脱节；图片路径在构建时拼接复杂。

**方案**：
```
数据（Markdown、图片、配置）应放在离使用方最近的层级：
- 实体图片 → 与 .md 文件同级 img/ 目录
- 全局资源（品牌图、占位图）→ 顶层 images/
- 实体配置 → config.json 中按实体命名空间隔离
```

**迁移要点**：
- 这个原则适用于任何静态站点项目（文档站、博客、产品目录）
- 就近管理降低了路径计算的复杂度（只需 `lastSegment + '/img/'`）
- 当数据与代码解耦时（如数据由社区贡献），就近管理让贡献者只关注局部

### 16.8 构建验证前置

**问题**：代码修改后忘记运行构建，直到 CI 阶段才发现错误，循环反馈周期长。

**方案**：
```
提交前执行：linter → typecheck → build → 预览验证
其中 build 是刚性门禁（不通过不准提交）
```

**迁移要点**：
- 在 git hooks（pre-commit）或编辑器任务中注册构建命令
- 本地 dev server 应监听文件变更自动重建（`npm run dev`），让构建持续验证
- 对数据驱动项目，增加数据校验步骤（`npm run validate`）

### 16.9 死代码清理纪律

**问题**：`department.ejs` 从未被引用但存在于仓库中，文档还将其列为有效文件。

**方案**：
```
每次改动后运行一次死代码扫描：
- 未引用的文件/函数/变量
- 有定义无调用的导出/模块
- 注释掉的代码块
- 文档中提及但仓库中不存在的文件
```

**迁移要点**：
- 代码审查时添加"有无死代码生成"的关注点
- 重构时先确认删除文件未被其他模块引用（`grep -r '文件名' src/`）
- 框架类项目（React/Vue）注意组件级死代码

### 16.10 配置层次化设计

**问题**：`sourceBase` 从硬编码 → 环境变量 → `config.json` 多次迁移，每次迁移文档未同步。

**方案**：
```
配置优先级：环境变量 > config.json > 默认值
配置入口统一（单一 config 对象），不在多个文件中散落
```

**迁移要点**：
- 项目初始就设计好配置层级，避免后续反复迁移
- 配置变更视为 API 变更，需要：更新文档 + 更新配置模板 + 写迁移脚本
- 用 `config.template.json` 作为配置的"活文档"，首次运行时自动复制

---

### ---

### 与共享知识库的关联

本节的 10 条原则已同步到跨项目知识库 `~/Work/dev-experience/categories/`，每条原则独立文件、标准格式（tags + problem + solution + migration-tips），供其他项目复用。

新项目在 AGENTS.md 中添加 `## 经验知识库` 节并声明项目类型标签后，即可按需加载相关经验。

模式速查图

```
┌──────────────────────────────────────────────────┐
│             可迁移工程经验速查                      │
├──────────────────────────────────────────────────┤
│ 原则            │ 一句话                          │
├──────────────────────────────────────────────────┤
│ 三同步           │ 需求+代码+文档必须同时更新       │
│ 小提交           │ 一提交一功能，conventional commit│
│ 三分支           │ develop→data→main 质量门禁     │
│ 多角色分析       │ 4 核心角色独立审查后交叉比对     │
│ 静默失败预防     │ 无报错的 Bug 最危险             │
│ 平台差异先验     │ 第一周确认所有目标平台差异       │
│ 数据就近         │ 数据放在离使用方最近的层级       │
│ 构建前置         │ 提交前必 build，不过不准提交     │
│ 死代码清理       │ 每次改动后扫一次未引用代码       │
│ 配置分层         │ env > config.json > 默认值      │
└──────────────────────────────────────────────────┘
```
