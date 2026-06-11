# 更新日志

## v4.4 (2026-06-06)

### ⭐ 新增
- Disqus → Giscus 评论系统迁移，基于 GitHub Discussions 的评论区
- 图片图廊分级命名：公司风采/部门风采/职位风采
- 补充 i18n key（compare 翻译补全）

### 🐛 修复
- 实体图片路径改用 lastSegment + img/ 模式
- SVG 显式宽高确保浏览器渲染
- 实体图片 CSS width:100% + object-fit:contain
- html lang 动态切换跟随语言选择
- 删除 images/placeholders/ 空目录

### 🔄 重构
- config.json siteName 改为按语言对象配置
- config.template.json 自动复制机制
- section.images 拆分为 per-entity 变体

### 📖 文档
- 多角色改进 V4 分析
- LESSONS.md 更新 V4 发现

## v4.3 (2026-06-06)

### ⭐ 新增
- 图片架构：公司图标/favicon/实体图片画廊
- zh-TW 语言支持，10 种语言
- Toast 通知替代 alert()
- 所有页面贡献入口
- config.template.json 模板，首次运行时自动复制
- 多语言 siteName/shortName

### 🐛 修复
- a11y tag 修复：span onclick 改为 a 标签
- i18n 硬编码移除
- 补充 6 种语言的缺失翻译 key

### 📖 文档
- 多角色改进 V3 分析

## v4.2 (2026-06-06)

### ⭐ 新增
- 扩展至 9 种界面语言（de/es/fr/ja/ko/pt/ru）
- English 兜底机制（缺失 key 自动回退英文）

## v4.1 (2026-06-06)

### ⭐ 新增
- 多名称国际化（英文名/日文名/别名展示+搜索匹配）
- 标签分类系统（标签 badge + 点击过滤 + 搜索）

## v4.0 (2026-06-06)

### ⭐ 新增
- 任意深度部门嵌套（支持无限层级）
- 职位数据源（薪资/技术栈/面试流程）
- 25 个示例职位（跨公司/部门）
- 跨公司跳槽参考（类似职位自动解析）
- 员工评价 Markdown 区块（date/role/experience/author）
- 员工评价卡片（pros/cons 块）
- 跨公司对比模式（最多 4 家）
- 对比页 localStorage 持久化
- 对比页 URL ?q= 参数
- 对比按钮全站导航
- 源码编辑链接（config.json 配置基地址）
- 实时本地预览 npm run dev
- 文件监听 + 自动重建（< 200ms）
- no-cache HTTP 头

### 🐛 修复
- Disqus 条件加载
- 构建性能优化

## v3.0 (2026-06-06)

### ⭐ 新增
- 部门级数据粒度（公司下可有多级部门）
- 暗色模式（CSS 变量 + prefers-color-scheme + localStorage 持久化）
- Giscus 评论系统（后迁移至 v4.4）
- Docker 部署

## v2.0 (2026-06-06)

### ⭐ 新增
- 重构为 Markdown 数据源 + 静态站点生成架构
- 多语言支持
- 部署需求（Pages + Docker + Vercel）

## v1.0 (2026-06-06)

### ⭐ 初始版本
- Flask + SQLite 版本初始需求文档

---

CHANGELOG 格式遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。
