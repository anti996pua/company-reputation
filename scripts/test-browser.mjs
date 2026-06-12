/**
 * 浏览器端到端测试 — 通过 Chrome DevTools Protocol
 * 覆盖搜索、语言切换、暗色模式、响应式布局
 *
 * 依赖: Chrome 已启动 --remote-debugging-port=9222
 * 运行: node scripts/test-browser.mjs
 */
import { WebSocket } from 'ws';
import { writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:8080';
const DEBUG_PORT = 9222;
let PASSED = 0, FAILED = 0;

function assert(label, ok, detail) {
  if (ok) { PASSED++; console.log(`  ✅ ${label}`); }
  else { FAILED++; console.log(`  ❌ ${label}: ${detail || ''}`); }
}

// Get a persistent CDP session for one tab
async function createSession() {
  const tabs = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then(r => r.json());
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((r, rej) => { ws.on('open', r); ws.on('error', rej); });

  let msgId = 1;
  const pending = {};

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.id && pending[msg.id]) {
        pending[msg.id](msg.result);
        delete pending[msg.id];
      }
    } catch(e) {}
  });

  async function send(method, params) {
    const id = msgId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r) => { pending[id] = r; });
  }

  async function evalJS(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  }

  async function navigate(url) {
    await send('Page.enable', {});
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 3000));
  }

  async function setViewport(w, h) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 640 });
    await new Promise(r => setTimeout(r, 500));
  }

  function close() { ws.close(); }

  return { send, evalJS, navigate, setViewport, close };
}

async function run() {
  console.log(`\n🔍 浏览器端到端测试 — ${BASE}\n`);
  let ses;

  // ── 1. 首页 ──
  console.log('── 1. 首页 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/');
  let title = await ses.evalJS('document.title');
  assert('页面标题正确', title && title.includes('公司信誉'));
  let hasSearch = await ses.evalJS('document.querySelector("input[type=text]") !== null');
  assert('搜索框存在', hasSearch);
  ses.close();

  // ── 2. 公司详情页 ──
  console.log('\n── 2. 公司详情页 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/c/华为.html');
  title = await ses.evalJS('document.title');
  assert('公司页加载', title && title.includes('华为'));
  let hasRating = await ses.evalJS('document.body.innerText.length > 500');
  assert('评分信息存在（页面完整加载）', hasRating);
  ses.close();

  // ── 3. 部门页(深度3) ──
  console.log('\n── 3. 部门嵌套页 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/c/华为/终端BG/手机产品线/上海研发中心.html');
  let body = await ses.evalJS('document.body.innerText');
  assert('深度3部门加载', body.includes('上海研发中心'));
  assert('面包屑存在', body.includes('华为') && body.includes('终端BG'));
  ses.close();

  // ── 4. 职位页 ──
  console.log('\n── 4. 职位页 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/c/华为/终端业务部/嵌入式软件工程师.html');
  body = await ses.evalJS('document.body.innerText');
  assert('职位页加载', body.includes('嵌入式'));
  assert('薪资信息存在', body.includes('K'));
  ses.close();

  // ── 5. 搜索功能 ──
  console.log('\n── 5. 搜索功能 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/list.html?q=华为');
  let results = await ses.evalJS('document.querySelectorAll(".result-item").length');
  assert('搜索结果 > 0', results > 0, `找到 ${results} 条`);
  ses.close();

  // ── 6. 多语言切换 ──
  console.log('\n── 6. 语言切换 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/');
  // Switch to English
  await ses.evalJS('switchLang("en")');
  await new Promise(r => setTimeout(r, 800));
  let enNav = await ses.evalJS('document.querySelector("nav a:first-child")?.textContent');
  assert('切换到英文', enNav === 'Home', `实际: ${enNav}`);
  // Switch back to Chinese
  await ses.evalJS('switchLang("zh-CN")');
  await new Promise(r => setTimeout(r, 800));
  let zhNav = await ses.evalJS('document.querySelector("nav a:first-child")?.textContent');
  assert('切换回中文', zhNav === '首页', `实际: ${zhNav}`);
  ses.close();

  // ── 7. 暗色模式 ──
  console.log('\n── 7. 暗色模式 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/');
  await ses.evalJS('toggleTheme()');
  await new Promise(r => setTimeout(r, 300));
  let theme = await ses.evalJS('document.documentElement.getAttribute("data-theme")');
  assert('切换到暗色模式', theme === 'dark', `实际: ${theme}`);
  await ses.evalJS('toggleTheme()');
  await new Promise(r => setTimeout(r, 300));
  theme = await ses.evalJS('document.documentElement.getAttribute("data-theme")');
  assert('切换回亮色模式', theme === 'light', `实际: ${theme}`);
  ses.close();

  // ── 8. 响应式视图 ──
  console.log('\n── 8. 响应式视图 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/');
  await ses.setViewport(375, 812);
  await new Promise(r => setTimeout(r, 1000));
  let vp = await ses.evalJS('document.querySelector("meta[name=viewport]")?.getAttribute("content")');
  assert('viewport meta 存在', vp && vp.includes('width'));
  // Reset
  await ses.setViewport(1280, 720);
  ses.close();

  // ── 9. 404 页面 ──
  console.log('\n── 9. 404 页面 ──');
  ses = await createSession();
  await ses.navigate(BASE + '/nonexistent.html');
  body = await ses.evalJS('document.body.innerText');
  assert('404 页面显示 404', body.includes('404'));
  ses.close();

  // ── 结果 ──
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`  通过: ${PASSED}  失败: ${FAILED}`);
  console.log(`${'═'.repeat(40)}\n`);
  process.exit(FAILED > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试异常:', e.message); process.exit(1); });
