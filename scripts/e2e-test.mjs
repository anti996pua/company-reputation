/**
 * 端到端功能测试 v2
 * 使用 curl（适配 dev server raw TCP 实现）
 * 自主迭代：发现新功能后在此添加对应测试用例
 * 运行：node scripts/e2e-test.mjs [baseUrl]
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const PASSED = [], FAILED = [];

function curl(path) {
  const url = BASE + path;
  const out = execSync(`curl -s -w "\\n%{http_code}\\n%{size_download}\\n%{content_type}" "${url}"`, 
    { timeout: 10000, encoding: 'utf-8' });
  const lines = out.trim().split('\n');
  const body = lines.slice(0, -3).join('\n');
  const status = parseInt(lines[lines.length - 3]);
  const size = parseInt(lines[lines.length - 2]);
  const ct = lines[lines.length - 1];
  return { status, size, ct, body };
}

function assert(label, ok, detail = '') {
  if (ok) { PASSED.push(label); console.log(`  ✅ ${label}`); }
  else { FAILED.push({ label, detail }); console.log(`  ❌ ${label}: ${detail}`); }
}

function check(label, path, contentChecks = {}) {
  try {
    const r = curl(path);
    assert(`${label}: 200`, r.status === 200, `${r.status}`);
    assert(`${label}: 非空`, r.size > 500, `${r.size}B`);
    if (r.status === 200 && r.size > 500) {
      for (const [desc, fn] of Object.entries(contentChecks)) {
        assert(`${label}: ${desc}`, fn(r.body), '(不匹配)');
      }
    }
  } catch (e) {
    assert(`${label}: 请求失败`, false, e.message.slice(0, 80));
  }
}

function countMatches(str, regex) {
  return (str.match(regex) || []).length;
}

async function run() {
  console.log(`\n🔍 端到端测试 v2 — ${BASE}\n`);

  // ── 1. 核心页面可达性 ──
  console.log('── 1. 页面可达性 ──');
  check('首页', '/', {
    '标题含"公司信誉"': b => b.includes('公司信誉'),
    '含搜索框': b => b.includes('search') || b.includes('搜索'),
    '含热门企业': b => b.includes('热门') || b.includes('hot'),
    '含数据统计': b => b.includes('site-stats') && b.includes('stat-number'),
  });
  check('搜索页', '/list.html', {
    '含公司列表': b => b.includes('华为') || b.includes('companyData'),
  });
  check('对比页', '/compare.html', {
    '含对比功能': b => b.includes('对比') || b.includes('compare'),
  });

  // ── 2. 公司/部门/职位详情 ──
  console.log('\n── 2. 详情页 ──');
  check('公司页(华为)', '/c/华为.html', {
    '含评分': b => b.includes('评分') || b.includes('rating'),
    '含对比按钮': b => b.includes('对比'),
    '含子部门': b => b.includes('终端') || b.includes('部门'),
  });
  check('部门页(深度3)', '/c/华为/终端BG/手机产品线/上海研发中心.html', {
    '含部门名': b => b.includes('上海研发中心'),
    '含面包屑': b => b.includes('华为') && b.includes('终端BG'),
  });
  check('职位页', '/c/华为/终端业务部/嵌入式软件工程师.html', {
    '含薪资': b => b.includes('K') || b.includes('薪资'),
    '含技术栈': b => b.includes('C ') || b.includes('RTOS'),
    '含面试流程': b => b.includes('面试'),
  });

  // ── 3. 错误处理 ──
  console.log('\n── 3. 错误处理 ──');
  const r404 = curl('/nonexistent.html');
  assert('不存在路径不是首页', r404.size !== 12851 || r404.status === 404,
    `状态${r404.status}, 大小${r404.size}B(=首页大小${12851}B)`);

  // ── 4. 静态资源 ──
  console.log('\n── 4. 静态资源 ──');
  check('data.js', '/js/data.js', {
    '含公司数据': b => b.includes('companyData'),
    '含华为': b => b.includes('华为'),
    '含职位': b => b.includes('positionData'),
  });
  check('i18n.js', '/js/i18n.js', {
    '含中文': b => b.includes('zh-CN'),
    '含英文': b => b.includes('en'),
    '含至少10种语言': b => {
      // Match language codes in translation object
      var m = b.match(/"site\.title"/g);
      return m && m.length >= 10;
    },
  });
  check('style.css', '/css/style.css', {
    '含暗色模式': b => b.includes('dark') || b.includes('data-theme'),
    '含CSS变量': b => b.includes('--'),
    '含响应式': b => b.includes('@media'),
  });

  // ── 5. HTTP 响应头 ──
  console.log('\n── 5. HTTP 响应 ──');
  const rh = curl('/');
  assert('Content-Type text/html', rh.ct.includes('text/html'), rh.ct);
  assert('charset utf-8', rh.ct.includes('utf-8'), rh.ct);

  // ── 6. 构建产物(本地) ──
  console.log('\n── 6. 构建产物(本地) ──');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dist = join(__dirname, '../dist');
  if (existsSync(dist)) {
    assert('dist/ 存在', true);
    const files = ['index.html', 'compare.html', 'list.html', 'js/data.js', 'js/i18n.js', 'css/style.css'];
    files.forEach(f => assert(`dist/${f}`, existsSync(join(dist, f))));
    assert('公司页已生成', existsSync(join(dist, 'c/华为.html')), '华为页面缺失');
    assert('部门页已生成', existsSync(join(dist, 'c/华为/终端BG/手机产品线/上海研发中心.html')));
    assert('职位页已生成', existsSync(join(dist, 'c/华为/终端业务部/嵌入式软件工程师.html')));
  } else {
    console.log('  ⚠️  dist/ 不存在，跳过');
  }

  // ── 7. Docker 构建可用性 ──
  console.log('\n── 7. Docker 构建 ──');
  const dockerfile = join(__dirname, '../Dockerfile');
  assert('Dockerfile 存在', existsSync(dockerfile));

  // ── 结果 ──
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`  通过: ${PASSED.length}  失败: ${FAILED.length}`);
  if (FAILED.length > 0) {
    console.log(`\n  失败项:`);
    FAILED.forEach(f => console.log(`    ${f.label} → ${f.detail}`));
  }
  console.log(`${'═'.repeat(40)}\n`);
  process.exit(FAILED.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试异常:', e.message); process.exit(1); });
