# 会话记录：2026-06-06 20:24 - Disqus → Giscus 评论系统迁移 + 最终修复

## 元信息

- 日期：2026-06-06
- 触发需求：将 Disqus 评论系统迁移为 Giscus（基于 GitHub Discussions）
- 会话时长：约 2 小时

## 需求版本演变

| 版本 | 阶段 | 需求描述 | 对应产出 |
|------|------|----------|----------|
| v1 | 初始 | Giscus 替代 Disqus | `feat: Disqus→Giscus 评论系统迁移` |
| v2 | 修复 | 图片渲染修复 + 图片区标题 + i18n key 补全 | `fix: 图片渲染修复` |
| v3 | 修复 | 实体图片路径改用 lastSegment 模式 | `fix: 实体图片路径改用 lastSegment+img/` |
| v4 | 修复 | 图片画廊分级标题（公司/部门/职位风采） | `feat: 图片图廊分级命名` |
| v5 | 修复 | dev server 中文 URL 参数支持 | `fix: dev server 支持原始 UTF-8 中文 URL 参数` |

## 关键决策

| 决策 | 选项 | 选择理由 | 放弃的方案 |
|------|------|----------|-----------|
| 评论系统 | Giscus vs Disqus vs 自建 | Giscus 免费、基于 GitHub | Disqus 付费、自建维护成本高 |
| Giscus 初始化 | 动态创建 script vs data-* 属性 | 动态创建可读取 localStorage | data-* 硬编码语言/主题 |
| 图片路径方案 | lastSegment + /img/ 模式 | HTML 文件与图片目录同级 | 之前用 basePath 拼接 |

## 产物清单

### 新建文件
- `images/companies/more-icons.svg` - 补充图标

### 修改文件
- `config.json` - disqusShortname → giscus 对象
- `config.template.json` - 同步
- `template/company.ejs` - Giscus 条件加载、动态脚本创建、主题/语言同步
- `template/position.ejs` - Giscus 集成
- `static/css/style.css` - Giscus loading 占位
- `scripts/build.mjs` - i18n 主题/语言同步函数
- `i18n/*.json` - disqus→giscus key 重命名
- `docs/*.md` + `AGENTS.md` - 23 处 Disqus→Giscus 文档替换
- `scripts/dev.mjs` - UTF-8 中文 URL 支持

### 提交记录
```
ef90a5401 fix: 实体图片路径改用 lastSegment+img/ 模式
ff29589ec feat: 图片图廊分级命名(公司风采/部门风采/职位风采)+多国语言
c52b4d7b9 feat: Disqus→Giscus 评论系统迁移 + 多角色改进 V4
abda711e9 fix: dev server 支持原始 UTF-8 中文 URL 参数
```

## 未完成/待办

- [x] Giscus 迁移
- [x] 图片路径修复
- [x] 图片分级标题
- [x] dev server 中文 URL
- [x] 文档 23 处同步更新

## 验证记录

- 构建：✅
- Giscus 多语言/主题同步：✅
- 浏览器验证图片显示：✅
