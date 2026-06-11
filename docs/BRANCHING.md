# 分支策略

> 作者：全体（产品/架构/工程）
> 版本：v1.0
> 状态：生效中

## 分支模型总览

```
develop ──────────────────────────────────────────┐
                                                   ├──→ data ──→ main (展示/生产)
data（用户数据贡献，每天合并）─────────────────────────┘
```

| 分支 | 用途 | 变更范围 | 维护者 | CI 动作 | 部署目标 |
|---|---|---|---|---|---|
| `develop` | 功能开发、Bug 修复、模板/CSS/JS 改动 | 全部（代码 + 数据均可）| 核心开发 | 构建验证 | 无 |
| `data` | 用户提交公司/部门/职位信息 | 仅 `companies/*.md` | 外部贡献者 + 审核 | 构建 + 数据校验 | 无 |
| `main` | 生产展示（GitHub Pages / Docker）| 只从 `data` 合并 | CI + 审核 | 构建 + 部署 | Pages + Docker |

## 分支层级关系

### `develop`（开发分支）

- **基分支**：无（根分支或从 `main` 创建）
- **合并目标**：`data`（功能完成后合并）
- **变更范围**：`scripts/` `template/` `static/` `i18n/` `config.json` `docs/` `companies/`（全部）
- **权限**：需要 PR + 1 人审核 + CI 通过
- **CI 检查**：`npm install && npm run build`
- **工作流**：
  - 从 `develop` 创建 `feature/xxx` 或 `fix/xxx` 分支开发
  - 开发完成后提交 PR → `develop`
  - 审核通过合并后，定期同步到 `data`

#### 分支命名规范

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feature/` | 新功能 | `feature/i18n-compare` |
| `fix/` | Bug 修复 | `fix/basePath-missing` |
| `refactor/` | 重构 | `refactor/extract-compare-js` |
| `chore/` | 工具/配置变更 | `chore/update-ci` |

### `data`（数据贡献分支）

- **基分支**：`develop`（始终基于最新 `develop`）
- **合并目标**：`main`（数据积累到一定程度后合并）
- **变更范围**：**仅** `companies/*.md`（含子目录）
- **权限**：需要 PR + 审核 + CI 通过 + 文件类型检查
- **CI 检查**：
  - `npm install && npm run build`
  - `node scripts/validate-data.mjs`（数据字段完整性检查）
  - 仅 `companies/` 目录文件被修改
- **工作流**：
  - 外部贡献者（用户）从 `data` 创建 `user/xxx` 分支
  - 仅添加/修改 `companies/` 下的 Markdown 文件
  - 提交 PR → `data`
  - 审核者检查数据质量后合并

#### 用户贡献流程（详细）

```bash
# 1. 克隆仓库，切换到 data 分支
git clone <repo-url>
cd company-reputation
git checkout data

# 2. 创建自己的分支
git checkout -b user/add-huawei-department

# 3. 添加/修改公司数据
#    companies/华为.md              （公司基本信息）
#    companies/华为/终端BG.md        （部门信息）
#    companies/华为/终端BG/positions/（职位信息）

# 4. 本地验证
npm run build

# 5. 提交并推送
git add companies/
git commit -m "data: 添加华为终端BG"
git push origin user/add-huawei-department

# 6. 在 Gitea/GitHub 上创建 PR → data 分支
```

#### 数据贡献必须遵守的规则

1. **只修改 `companies/` 目录**：任何对其他目录的修改将导致 CI 拒绝
2. **Markdown 格式正确**：标题行 + `===` 分隔 + `##` 章节
3. **必需字段完整**：公司名、行业、城市、标签（详见 `docs/USER_GUIDE.md`）
4. **不得破坏构建**：`npm run build` 必须通过
5. **新公司需添加英文名/日文名/别名**：便于多语言搜索
6. **部门可任意深度嵌套**：子目录可嵌套多层
7. **职位放在 `positions/` 目录**：每个职位一个 `.md` 文件

#### 数据审核清单

审核者在合并 PR 前检查：

- [ ] 仅修改 `companies/` 目录
- [ ] 文件名编码正确（UTF-8）
- [ ] 必需字段齐全（行业/标签/描述）
- [ ] `npm run build` 通过
- [ ] `node scripts/validate-data.mjs` 通过
- [ ] 无重复公司名
- [ ] 数据合理（评分 1-5、非虚构信息）

### `main`（展示分支 / 生产分支）

- **基分支**：`data`
- **合并目标**：无（生产末端）
- **变更范围**：无直接修改，仅从 `data` 合并
- **权限**：仅 CI + 管理员可合并
- **CI 检查**：`npm install && npm run build && npm test（如有）`
- **部署**：合并后自动部署到 GitHub Pages + Docker 镜像构建推送
- **保护规则**：
  - 需要 PR + 2 人审核
  - 所有 CI 检查必过
  - 禁止直接推送

## 完整工作流示例

### 场景：新增一个功能 + 用户添加数据 + 上线

```
Step 1: 开发新功能
  develop:  git checkout -b feature/position-salary-chart
  develop:  修改 template/position.ejs, static/js/main.js
  develop:  git commit → PR → develop (CI 检查通过 → 合并)

Step 2: 同步代码到 data 分支
  data:     git checkout data && git merge develop
  data:     git push

Step 3: 用户添加公司数据
  data:     git checkout -b user/add-xiaomi-department
  data:     修改 companies/小米/手机部.md
  data:     git commit → PR → data (CI 检查: 构建 + 数据校验 → 合并)

Step 4: 用户再添加一条数据
  data:     git checkout -b user/add-tencent-position
  data:     添加 companies/腾讯/IEG/positions/
  data:     git commit → PR → data (CI 检查通过 → 合并)

Step 5: 数据积累到一定程度，上线发布
  main:     git checkout main && git merge data
  main:     (自动触发 Pages + Docker 部署)
```

### 场景：紧急修复生产 Bug

```
main:     git checkout -b hotfix/rating-display-error
hotfix:   修改 template/company.ejs
hotfix:   git commit → PR → main (紧急审核 → 合并 → 自动部署)
hotfix:   PR → develop (同步修复到开发分支)
develop:  合并后同步到 data
```

### 场景：代码变更后需要同步 data 分支

```
# 方式一：直接合并（推荐）
git checkout data
git merge develop
git push origin data

# 方式二：Rebase（需要强制推送，慎用）
git checkout data
git rebase develop
git push --force-with-lease origin data
```

推荐使用方式一（merge），保持提交历史清晰。

## CI 配置

### develop 分支 CI

```yaml
on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: npm run build
      - name: Verify dist output
        run: |
          test -d dist
          test -f dist/index.html
          echo "Pages: $(find dist -name '*.html' | wc -l)"
```

### data 分支 CI

```yaml
on:
  push:
    branches: [data]
  pull_request:
    branches: [data]

jobs:
  build-and-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要获取所有提交以检查文件变更
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: npm run build
      - name: Validate data files
        run: node scripts/validate-data.mjs
      - name: Check only companies/ changed
        run: |
          if [ "${{ github.event_name }}" == "pull_request" ]; then
            CHANGED=$(git diff --name-only origin/data..HEAD)
            if echo "$CHANGED" | grep -v '^companies/' | grep -q .; then
              echo "❌ PR 包含 companies/ 以外的文件修改："
              echo "$CHANGED" | grep -v '^companies/'
              exit 1
            fi
            echo "✅ 仅 companies/ 目录有变更"
          fi
      - name: Verify dist output
        run: |
          test -d dist
          test -f dist/index.html
          echo "Pages: $(find dist -name '*.html' | wc -l)"
```

### main 分支 CI + 部署

```yaml
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: npm run build
      - name: Full validation
        run: |
          node scripts/validate-data.mjs
          test -f dist/index.html
          test -f dist/list.html
          test -f dist/compare.html
          echo "Pages: $(find dist -name '*.html' | wc -l)"
      - name: Deploy to Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 配置文件

### config.json（分支相关配置）

```json
{
  "sourceBase": "https://github.com/anti996pua/company-reputation/tree/${BRANCH}/companies",
  "giscus": {
    "repo": "owner/company-reputation",
    "repoId": "R_kgDOEXAMPLE",
    "category": "Announcements",
    "categoryId": "DIC_kwDOEXAMPLE"
  },
  "devServer": {
    "host": "127.0.0.1",
    "port": 8080
  },
  "branches": {
    "develop": {
      "description": "开发分支 — 功能开发与Bug修复",
      "allowedChanges": "all",
      "ciType": "build-only",
      "deployTarget": "none"
    },
    "data": {
      "description": "数据贡献分支 — 用户添加公司/部门/职位",
      "allowedChanges": "companies/*.md only",
      "ciType": "build + validate",
      "deployTarget": "none"
    },
    "main": {
      "description": "展示分支 — 生产环境",
      "allowedChanges": "merge only from data",
      "ciType": "build + validate + deploy",
      "deployTarget": "pages + docker"
    }
  }
}
```

## 分支同步策略

### develop → data 同步频率

- **每次 feature 合并到 develop 后**：创建 PR（develop → data）同步代码
- **最迟每周同步一次**：确保 data 分支不落后 develop 太多

### data → main 合并条件

- **数据量达到阈值**：新数据贡献 ≥ 5 条，或
- **距离上次发布 ≥ 2 周**，或
- **紧急数据需要上线**（如公司辟谣/重要更正）

## 故障恢复

| 场景 | 处理方式 |
|---|---|
| data 分支被污染（非 companies 变更）| 回滚 data 到上一个干净 commit，重新同步 develop |
| main 部署后发现问题 | 从 main 创建 hotfix 分支修复后合并回 main，再同步到 develop |
| develop 与 data 合并冲突 | 在 data 分支上手动解决冲突后提交 |
| CI 误判 | 检查 PR 实际变更文件列表，手动触发 CI 重跑 |
