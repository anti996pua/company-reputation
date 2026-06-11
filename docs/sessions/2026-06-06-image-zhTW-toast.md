# 会话记录：2026-06-06 13:55 - 图片架构完善 + zh-TW + Toast + 多角色 V4

## 元信息

- 日期：2026-06-06
- 触发需求：完善图片系统、添加 zh-TW 语言、Toast 替代 alert()
- 会话时长：约 40 分钟

## 需求版本演变

| 版本 | 阶段 | 需求描述 | 对应产出 |
|------|------|----------|----------|
| v1 | 初始 | 图片架构 + zh-TW + toast + config.template | `feat: 图片架构 + zh-TW + toast` |
| v2 | 补充 | 贡献指南模板添加示例图片 | `feat: 贡献指南模板添加示例图片` |
| v3 | 修复 | 实体图片路径修复 + html lang 动态切换 | `fix: 实体图片路径修复` |
| v4 | 审计 | 多角色改进 V4 发现与修复 | `fix: 图片渲染修复` |

## 关键决策

| 决策 | 选项 | 选择理由 | 放弃的方案 |
|------|------|----------|-----------|
| 图片就近原则 | 实体图片放 .md 同级 img/ 目录 | 就近管理，贡献者只关注局部 | 集中放 images/ |
| zh-TW 回退链 | zh-TW → zh-CN → en → key | 最大化翻译覆盖 | 独立维护全部翻译 |
| Toast 方案 | 纯 CSS 动画 Toast | 轻量无依赖 | 第三方库 |

## 产物清单

### 新建文件
- `i18n/zh-TW.json` - 繁体中文翻译
- `images/companies/*.svg` - 各公司图标
- `images/common/*.svg` - 占位图

### 修改文件
- `scripts/build.mjs` - 图片扫描复制、多语言回退逻辑
- `template/company.ejs` - 图片画廊、Toast 容器、Giscus 条件加载
- `template/position.ejs` - 图片画廊、Toast 容器
- `template/index.ejs` - 贡献入口、Toast
- `template/list.ejs` - Toast、a11y tag 修复
- `static/css/style.css` - 图片样式、Toast 样式
- `docs/LESSONS.md` - 新增 §13
- `i18n/*.json` - 补充翻译 key

### 提交记录
```
d0184b1be feat: 图片架构 + zh-TW + toast + config.template + docs 同步
ce4fd5b55 feat: 贡献指南模板添加示例图片
d3dde5f6e fix: 实体图片路径修复 + html lang 动态切换 + 多角色分析发现修复
d2a6483a8 fix: 图片渲染修复 + 图片区标题 + i18n key
55208a5a4 fix: 图片渲染修复 + 多角色分析 V4 + LESSONS 更新
```

## 未完成/待办

- [x] 图片就近存放
- [x] zh-TW 语言
- [x] Toast 通知
- [x] 实体图片路径修复
- [x] html lang 动态切换
- [x] 多角色 V4 发现修复

## 验证记录

- 构建：✅
