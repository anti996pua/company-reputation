# 公司信誉查询系统

> 基于 Markdown 数据源的静态站点 — 查公司、看口碑、避雷区

[![Build](https://github.com/jaywcjlove/linux-command/workflows/Build/badge.svg)](https://github.com/jaywcjlove/linux-command/actions)
[![Docker](https://github.com/jaywcjlove/linux-command/workflows/Docker/badge.svg)](https://github.com/jaywcjlove/linux-command/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 特性

- **零数据库** — 所有数据来源于 Markdown 文件，静态站点即查即用
- **全文搜索** — 即时搜索，无需服务器端支持
- **10 种语言** — zh-CN / zh-TW / en / ja / ko / fr / de / es / pt / ru
- **公司/部门/职位三级数据** — 支持任意深度嵌套
- **多维度评分** — 工作强度、加班频率、薪资水平、福利待遇等 8 项指标
- **员工评价** — 员工匿名评价，含优缺点和评分
- **跨公司对比** — 最多 4 家公司横向对比
- **跨公司跳槽参考** — 类似职位自动关联
- **暗色模式** — 系统跟随 + 手动切换
- **Giscus 评论** — 基于 GitHub Discussions 的评论区
- **Docker 部署** — 一键容器化部署

## 快速开始

```bash
# 安装依赖
npm install

# 构建静态站点
npm run build

# 本地预览
npm run dev
# → http://127.0.0.1:8080/
```

## 项目结构

```
├── companies/           # Markdown 数据源（公司 + 部门 + 职位）
├── scripts/             # 构建脚本
├── template/            # EJS 模板
├── static/              # CSS / JS 资源
├── i18n/                # 多语言翻译
├── images/              # 图片资源
├── config.json          # 构建配置
├── dist/                # 构建产物
└── docs/                # 项目文档
    ├── REQUIREMENTS.md
    ├── ARCHITECTURE.md
    ├── ENGINEERING.md
    ├── TESTING.md
    ├── USER_GUIDE.md
    └── LESSONS.md
```

## 文档导航

| 文档 | 适用对象 | 内容 |
|---|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 产品/开发 | 需求、优先级、状态跟踪 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构师 | 技术选型、数据流、设计决策 |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | 工程师 | 开发环境、构建流程、编码规范 |
| [docs/TESTING.md](docs/TESTING.md) | 测试 | 测试策略、测试用例 |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | 用户 | 功能介绍、数据格式说明 |
| [docs/LESSONS.md](docs/LESSONS.md) | 全体 | 开发教训、常见陷阱 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献者 | 如何添加/修改公司数据 |
| [AGENTS.md](AGENTS.md) | AI 助手 | 项目上下文、操作流程 |

## 数据贡献

公司、部门、职位数据以 Markdown 格式存放在 `companies/` 目录下，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

```bash
# 构建
npm run build

# 实时预览（自动监听变化）
npm run dev

# 数据校验
node scripts/validate-data.mjs
```

## 部署

### Docker

```bash
docker build -t company-reputation .
docker run -p 8080:80 company-reputation
```

### GitHub Pages

项目已配置 GitHub Actions 自动部署到 Pages。详见 `.github/workflows/pages.yml`。

## 分支策略

采用三分支工作流：

```
develop (开发) ──→ data (数据贡献) ──→ main (生产)
```

详见 [docs/BRANCHING.md](docs/BRANCHING.md) 和 [AGENTS.md](AGENTS.md)。

## 许可

[MIT](LICENSE)
