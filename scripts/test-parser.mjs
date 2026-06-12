/**
 * Parser 单元测试
 * 运行：node scripts/test-parser.mjs
 */
import { parseReviews, parsePosition } from './parser.mjs';
import { strict as assert } from 'node:assert';

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// ── parseReviews ──
console.log('\n── parseReviews ──');

test('空文本返回空数组', () => {
  assert.deepEqual(parseReviews(''), []);
  assert.deepEqual(parseReviews(null), []);
  assert.deepEqual(parseReviews(undefined), []);
});

test('单条评价解析', () => {
  const input = `### 2024-03-15 | 高级工程师 | 3 年 | @user

> 工作环境不错，团队氛围好

评分：4.0/5

**优点**
薪资有竞争力

**缺点**
工作强度大`;
  const r = parseReviews(input);
  assert.equal(r.length, 1);
  assert.equal(r[0].date, '2024-03-15');
  assert.equal(r[0].role, '高级工程师');
  assert.equal(r[0].experience, '3 年');
  assert.equal(r[0].author, '@user');
  assert.equal(r[0].rating, 4.0);
  assert.ok(r[0].comment.includes('工作环境不错'));
  assert.ok(r[0].pros.includes('薪资有竞争力'));
  assert.ok(r[0].cons.includes('工作强度大'));
});

test('多条评价', () => {
  const input = `### 2024-01-01 | 工程师 | 2 年 | @a

评分：3.5/5

### 2024-06-01 | 经理 | 5 年 | @b

评分：4.5/5`;
  const r = parseReviews(input);
  assert.equal(r.length, 2);
  assert.equal(r[0].rating, 3.5);
  assert.equal(r[1].rating, 4.5);
});

test('缺失字段不崩溃', () => {
  const input = `### 2024-01-01 |||`;
  const r = parseReviews(input);
  assert.equal(r.length, 1);
  assert.equal(r[0].date, '2024-01-01');
  assert.equal(r[0].author, '匿名');
  assert.equal(r[0].rating, 0);
});

test('匿名评价', () => {
  const input = `### 2024-05-20 | 前端 | 1 年 |

评分：3.0/5`;
  const r = parseReviews(input);
  assert.equal(r.length, 1);
  assert.equal(r[0].author, '匿名');
});

test('评分格式兼容', () => {
  const input = `### 2024-01-01 | dev | 2y | @x

评分：4/5`;
  const r = parseReviews(input);
  assert.equal(r[0].rating, 4);
});

// ── parsePosition ──
console.log('\n── parsePosition ──');

test('完整职位解析', () => {
  const sections = {
    '基本信息': `- 类别：技术
- 职级范围：13-16 级
- 工作地点：深圳`,
    '薪资范围': `- 13 级：25-35K × 14-16 薪
- 14 级：35-50K × 14-16 薪`,
    '技术栈': `- C / C++ / Rust
- RTOS / Linux Kernel`,
    '技能要求': `- 计算机相关专业
- 5 年以上经验`,
    '面试流程': `1. 简历筛选
2. 技术面试`,
    '类似职位': `- 腾讯/IEG/positions/嵌入式开发 - 腾讯嵌入式`
  };
  const p = parsePosition('/test/embedded.md', sections, '负责嵌入式开发');
  assert.equal(p.name, 'embedded');
  assert.equal(p.positionCategory, '技术');
  assert.equal(p.levelRange, '13-16 级');
  assert.deepEqual(p.salaryRanges.length, 2);
  assert.equal(p.techStack.length >= 2, true);
  assert.equal(p.requirements.length, 2);
});

test('空字段不崩溃', () => {
  const p = parsePosition('/test/pos.md', {}, '测试职位');
  assert.equal(p.name, 'pos');
  assert.equal(p.salaryRanges.length, 0);
});

// ── 结果 ──
console.log(`\n${'═'.repeat(40)}`);
console.log(`  通过: ${passed}  失败: ${failed}`);
console.log(`${'═'.repeat(40)}\n`);
process.exit(failed > 0 ? 1 : 0);
