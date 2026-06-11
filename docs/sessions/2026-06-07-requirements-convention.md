# 会话记录：2026-06-07 11:20 - 需求管理规范设计

## 元信息

- 日期：2026-06-07
- 触发需求：建立需求管理规范，参考华为 IPD 理念
- 前置会话：`2026-06-07-doc-bootstrap.md`（文档体系建设）

## 需求版本演变

| 版本 | 阶段 | 需求描述 | 对应产出 |
|------|------|----------|----------|
| v1 | 初始 | 设计需求管理规范（分层+优先级+测试追溯） | `04-documentation/04-requirements-management.md` |
| v1.1 | 细化 | 更新 REQUIREMENTS.md 加入规范说明 | 新格式表头+示例行 |
| v1.2 | 细化 | 同步更新 TESTING.md 加入追溯列 | 加"关联需求"列 |

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 分层参考 | 华为 IPD（Epic/Feature/Story/Task）| 成熟的分层体系 |
| 优先级 | P0-P4 五级 | 覆盖阻塞→建议的完整谱系 |
| 测试追溯 | 每个需求关联测试用例 ID | 双向可追溯 |
| 状态符号 | emoji + 文字 | 视觉快速识别 |

## 产物清单

### 新建文件
- `~/Work/dev-experience/categories/04-documentation/04-requirements-management.md` - 需求管理规范

### 修改文件
- `docs/REQUIREMENTS.md` - 新增"需求管理规范"节，更新示例表
- `docs/TESTING.md` - HTTP 测试用例增加"关联需求"列
- `AGENTS.md` - 更新文档导航说明
- 知识库 `INDEX.md` - 新增 requirements 标签

## 未完成/待办

- [ ] 将全部 84 个需求迁移至新格式（当前仅第一表示例更新）
- [ ] 补充 Story/Task 级别的需求条目

## 验证记录

- 构建：待验证
