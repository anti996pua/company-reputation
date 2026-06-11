import FS from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import UglifyJS from 'uglify-js';
import { parseMdFile, parseReviews, parsePosition } from './parser.mjs';

const ROOT = process.cwd();
const COMPANIES_DIR = path.resolve(ROOT, 'companies');
const I18N_DIR = path.resolve(ROOT, 'i18n');
const TEMPLATE_DIR = path.resolve(ROOT, 'template');
const STATIC_DIR = path.resolve(ROOT, 'static');
const DIST_DIR = path.resolve(ROOT, 'dist');
const IMAGES_DIR = path.resolve(ROOT, 'images');

// Resolve company icon path
function resolveCompanyIcon(name) {
  const exts = ['.svg', '.png', '.jpg'];
  for (const ext of exts) {
    const fp = path.resolve(IMAGES_DIR, 'companies', name + ext);
    if (FS.existsSync(fp)) return 'img/companies/' + name + ext;
  }
  return 'img/companies/_default.svg';
}

// Load global config (auto-create from template if missing)
const CONFIG_PATH = path.resolve(ROOT, 'config.json');
const CONFIG_TEMPLATE_PATH = path.resolve(ROOT, 'config.template.json');
if (!FS.existsSync(CONFIG_PATH) && FS.existsSync(CONFIG_TEMPLATE_PATH)) {
  FS.copyFileSync(CONFIG_TEMPLATE_PATH, CONFIG_PATH);
  console.log('  → config.json not found, created from config.template.json');
}
const CONFIG = JSON.parse(FS.readFileSync(CONFIG_PATH, 'utf8'));
const BRANCH = process.env.BRANCH || process.env.GITHUB_REF_NAME || 'data';
const GITHUB_SOURCE_BASE = CONFIG.sourceBase.replace('${BRANCH}', BRANCH);

async function readJSON(fp) {
  return JSON.parse(await FS.readFile(fp, 'utf8'));
}

async function scanTree(dirPath, depth) {
  const entries = await FS.readdir(dirPath, { withFileTypes: true });
  const mdFiles = entries.filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  const subdirs = entries.filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  const levelNodes = [];
  const positionNodes = [];

  for (const f of mdFiles) {
    const fileAbs = path.resolve(dirPath, f.name);
    const node = parseMdFile(fileAbs, GITHUB_SOURCE_BASE, resolveCompanyIcon);
    node.fileAbs = fileAbs;

    const relDir = path.relative(COMPANIES_DIR, dirPath);
    const segments = relDir ? relDir.split(path.sep) : [];
    // Convention: if the .md shares the name of the immediate parent dir
    // (e.g. 华为/终端业务部/终端业务部.md), treat the parent dir as the
    // "logical" location — drop the duplicate segment from both path
    // and parent-name resolution.
    const inOwnDir = segments.length > 0 && node.name === segments[segments.length - 1];
    const effectiveSegments = inOwnDir ? segments.slice(0, -1) : segments;
    const pathSegments = [...effectiveSegments, node.name];

    node.depth = depth;
    node.isDepartment = depth > 0;
    node.rootCompany = depth === 0 ? node.name : effectiveSegments[0];
    node.parentName = effectiveSegments.length > 0 ? effectiveSegments[effectiveSegments.length - 1] : '';
    node.parentNames = effectiveSegments;
    node.pathSegments = pathSegments;
    node.parentCompany = depth === 0 ? '' : effectiveSegments[0];
    node.children = [];
    node.hasChildren = false;
    node.positions = [];
    node.sourcePath = path.relative(ROOT, fileAbs);
    node.sourceUrl = GITHUB_SOURCE_BASE + '/' + node.sourcePath.split(path.sep).map(s => encodeURIComponent(s)).join('/');

    levelNodes.push(node);
  }

  // Helper: parse position .md files from a `positions/` directory
  // and attach them to the given owner dept.
  async function parsePositionsDir(posDirAbs, ownerDept) {
    const posFiles = (await FS.readdir(posDirAbs))
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b, 'zh'));
    const relDir = path.relative(COMPANIES_DIR, posDirAbs).replace(/\/positions$/, '');
    const segments = relDir ? relDir.split(path.sep) : [];
    for (const pf of posFiles) {
      const fileAbs = path.resolve(posDirAbs, pf);
      const content = FS.readFileSync(fileAbs, 'utf8');
      const lines = content.split('\n');
      let desc = '';
      let inDesc = false;
      for (let i = 1; i < lines.length; i++) {
        if (/^=+$/.test(lines[i].trim())) { inDesc = true; continue; }
        if (inDesc && lines[i].trim().startsWith('## ')) break;
        if (inDesc) desc += lines[i] + '\n';
      }
      desc = desc.trim();
      const sections = {};
      let curSec = '';
      let secLines = [];
      let started = false;
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('## ')) {
          if (curSec) sections[curSec] = secLines.join('\n').trim();
          curSec = t.replace(/^##\s+/, '');
          secLines = [];
          started = true;
        } else if (started && curSec) {
          secLines.push(line);
        }
      }
      if (curSec) sections[curSec] = secLines.join('\n').trim();

      const posName = path.basename(pf, '.md');
      const pos = parsePosition(fileAbs, sections, desc);
      pos.fileAbs = fileAbs;
      pos.depth = ownerDept.depth + 1;
      pos.pathSegments = [...segments, posName];
      pos.parentName = ownerDept.name;
      pos.parentCompany = ownerDept.rootCompany || ownerDept.name;
      pos.rootCompany = ownerDept.rootCompany || ownerDept.name;
      pos.sourcePath = path.relative(ROOT, fileAbs);
      pos.sourceUrl = GITHUB_SOURCE_BASE + '/' + pos.sourcePath.split(path.sep).map(s => encodeURIComponent(s)).join('/');
      positionNodes.push(pos);
    }
  }

  for (const d of subdirs) {
    if (d.name === 'positions') continue; // handled at parent level
    // Recurse into regular subdirs (sub-departments)
    const childLevelNodes = await scanTree(path.resolve(dirPath, d.name), depth + 1);
    const parentNode = levelNodes.find(n => n.name === d.name);
    if (parentNode && childLevelNodes.length > 0) {
      // The subdir's levelNodes are all children of the parent (e.g.
      // 华为/ contains 6 dept .md files — all are children of 华为.md)
      parentNode.children = childLevelNodes;
      parentNode.hasChildren = true;
    } else if (childLevelNodes.length > 0) {
      // No matching .md in this level (e.g. dept .md is inside the subdir
      // but our layout doesn't allow that here) — add the first as
      // a top-level child
      levelNodes.push(...childLevelNodes);
    }
    // Check for `positions/` subdir inside the subdir. Owner = matching
    // .md in levelNodes (parent layout: 公司/部门.md + 部门/positions/)
    // or deptNode (subdir layout: 公司/部门/部门.md + 部门/positions/).
    const positionsOwner = levelNodes.find(n => n.name === d.name) || (childLevelNodes.length > 0 ? (childLevelNodes.find(n => n.name === d.name) || childLevelNodes[0]) : null);
    const subSubdirs = await FS.readdir(path.resolve(dirPath, d.name), { withFileTypes: true });
    const positionsInSub = subSubdirs.find(sd => sd.isDirectory() && sd.name === 'positions');
    if (positionsInSub && positionsOwner) {
      const posDir = path.resolve(dirPath, d.name, positionsInSub.name);
      // Remember position count BEFORE parsing, so we can slice the
      // newly-pushed positions by index rather than by name (which
      // could collide between depts with the same name in different
      // companies).
      const beforeCount = positionNodes.length;
      await parsePositionsDir(posDir, positionsOwner);
      positionsOwner.positions = positionNodes.slice(beforeCount);
    }
  }

  return levelNodes;
}

async function build() {
  await FS.emptyDir(DIST_DIR);
  await FS.ensureDir(path.resolve(DIST_DIR, 'c'));
  await FS.ensureDir(path.resolve(DIST_DIR, 'css'));
  await FS.ensureDir(path.resolve(DIST_DIR, 'js'));

  // Recursive scan
  const rootNodes = await scanTree(COMPANIES_DIR, 0);

  // Flatten for ID assignment and search index
  const allNodes = [];
  const allPositions = [];
  function flatten(nodes) {
    for (const n of nodes) {
      allNodes.push(n);
      if (n.positions && n.positions.length) {
        for (const p of n.positions) allPositions.push(p);
      }
      flatten(n.children);
    }
  }
  flatten(rootNodes);

  // Assign IDs
  allNodes.forEach((n, idx) => { n.id = idx + 1; });
  allPositions.forEach((p, idx) => { p.id = allNodes.length + idx + 1; });

  // Compute recursive position count (includes sub-department positions)
  function computePositionCount(node) {
    let count = (node.positions || []).length;
    for (const child of node.children) {
      count += computePositionCount(child);
    }
    node.positionCount = count;
    return count;
  }
  for (const n of rootNodes) {
    computePositionCount(n);
  }

  // Compute URL, basePath, and entity image base path
  const allEntities = [...allNodes, ...allPositions];
  for (const n of allNodes) {
    const encoded = n.pathSegments.map(s => encodeURIComponent(s));
    n.url = `/c/${encoded.join('/')}.html`;
    n.basePath = '../'.repeat(n.pathSegments.length).replace(/\/$/, '');
    n.icon = resolveCompanyIcon(n.rootCompany);
    // Entity images are in a dir named after the entity at the same level as the .html file
    n.entityImgBase = encodeURIComponent(n.pathSegments[n.pathSegments.length - 1]) + '/img/';
  }
  for (const p of allPositions) {
    const encoded = p.pathSegments.map(s => encodeURIComponent(s));
    p.url = `/c/${encoded.join('/')}.html`;
    p.basePath = '../'.repeat(p.pathSegments.length).replace(/\/$/, '');
    p.icon = resolveCompanyIcon(p.pathSegments[0]);
    p.entityImgBase = encodeURIComponent(p.pathSegments[p.pathSegments.length - 1]) + '/img/';
  }

  // Scan and copy entity images (company/dept/position)
  const IMG_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const entity of allEntities) {
    const relImgDir = path.join('c', ...entity.pathSegments, 'img');
    const distImgDir = path.resolve(DIST_DIR, relImgDir);
    entity.images = [];
    // Try multiple source locations: check actual file-adjacent dir first,
    // fall back to pathSegments-based dir.
    let sourceImgDir = null;
    if (entity.fileAbs) {
      const nameDir = path.resolve(path.dirname(entity.fileAbs), entity.pathSegments[entity.pathSegments.length - 1], 'img');
      if (await FS.pathExists(nameDir)) sourceImgDir = nameDir;
    }
    if (!sourceImgDir) {
      const segDir = path.resolve(COMPANIES_DIR, ...entity.pathSegments, 'img');
      if (await FS.pathExists(segDir)) sourceImgDir = segDir;
    }
    if (sourceImgDir) {
      const files = await FS.readdir(sourceImgDir);
      const imgFiles = files.filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase())).sort();
      entity.images = imgFiles;
      await FS.ensureDir(distImgDir);
      for (const f of imgFiles) {
        await FS.copyFile(path.resolve(sourceImgDir, f), path.resolve(distImgDir, f));
      }
    }
  }

  // Build position lookup by source-relative path for cross-references
  const positionIndex = new Map();
  for (const p of allPositions) {
    const rel = p.pathSegments.join('/');
    positionIndex.set(rel, p);
  }
  // Resolve similarPositions to actual position objects
  for (const p of allPositions) {
    p.similarPositionsResolved = p.similarPositions.map(ref => {
      const key = ref.path + '/' + ref.title;
      const found = positionIndex.get(key);
      if (!found) return null;
      return {
        title: found.fullName,
        url: found.url,
        deptName: ref.path.split('/').pop(),
        companyName: ref.path.split('/')[0],
      };
    }).filter(Boolean);
  }

  const companies = rootNodes;
  const deptCount = allNodes.length - companies.length;
  const positionCount = allPositions.length;
  const totalReviews = allNodes.reduce((sum, n) => sum + (n.reviewCount || 0), 0);
  const totalImages = allEntities.filter(e => e.images && e.images.length > 0).length;
  console.log(`  → Parsed ${companies.length} companies, ${deptCount} departments, ${positionCount} positions (${allNodes.length + allPositions.length} total pages)`);

  // Load translations
  const i18nFiles = (await FS.readdir(I18N_DIR)).filter(f => f.endsWith('.json'));
  const translations = {};
  for (const f of i18nFiles) {
    const lang = f.replace('.json', '');
    translations[lang] = await readJSON(path.resolve(I18N_DIR, f));
  }
  const langKeys = Object.keys(translations);
  console.log(`  → Loaded ${langKeys.length} languages: ${langKeys.join(', ')}`);

  // Override translations with config.json values (user-customizable site name / repo URL / short name)
  const siteNames = (CONFIG.siteName && typeof CONFIG.siteName === 'object') ? CONFIG.siteName : {};
  const shortNames = (CONFIG.shortName && typeof CONFIG.shortName === 'object') ? CONFIG.shortName : {};
  const repoUrl = CONFIG.repoUrl || '';
  for (const lang of langKeys) {
    const t = translations[lang];
    // Per-language siteName override: if config has a name for this language, use it;
    // otherwise preserve the existing i18n translation (don't overwrite).
    if (siteNames[lang]) {
      const customName = siteNames[lang];
      t['site.title'] = customName;
      t['site.footer'] = customName + (t['site.footer'] ? t['site.footer'].replace(/^[^-—]+/, '') : '');
      t['site.description'] = customName + (t['site.description'] ? t['site.description'].replace(/^[^-—]+/, '') : '');
    }
    t['site.shortName'] = shortNames[lang] || shortNames['en'] || 'CR';
    t['site.repoUrl'] = repoUrl;
    t['contribute.title'] = t['contribute.title'] || 'Contribute Data';
    t['contribute.desc'] = t['contribute.desc'] || 'Add new company, department or position';
    t['compare.alreadyAdded'] = t['compare.alreadyAdded'] || 'already in comparison';
    t['compare.added'] = t['compare.added'] || 'added to comparison';
    t['compare.removed'] = t['compare.removed'] || 'removed from comparison';
    t['compare.cleared'] = t['compare.cleared'] || 'All companies cleared';
  }

  // Industries from root-level company data
  const industries = [...new Set(companies.map(c => c.industry))].filter(Boolean).sort();

  // --- Generate dist/js/i18n.js ---
  const i18nJsContent = `
var translations = ${JSON.stringify(translations)};
var currentLang = (function() {
  var saved = localStorage.getItem('company-lang');
  if (saved) return saved;
  var bl = (navigator.language || navigator.browserLanguage || '').toLowerCase();
  var map = {zh:'zh-CN',en:'en',ja:'ja',ko:'ko',fr:'fr',de:'de',es:'es',pt:'pt',ru:'ru'};
  // zh-TW detection: navigator language 'zh-TW' or 'zh-HK' → zh-TW
  if (bl === 'zh-tw' || bl === 'zh-hk' || bl === 'zh-mo') return 'zh-TW';
  for (var p in map) { if (bl.indexOf(p) === 0) return map[p]; }
  return 'zh-CN';
})();
function __(key, params) {
  var map = translations[currentLang] || translations['zh-CN'];
  var val = map[key];
  // zh-TW fallback: zh-TW → zh-CN → en → key
  if (val === undefined && currentLang === 'zh-TW') { val = (translations['zh-CN'] || {})[key]; }
  if (val === undefined) { val = (translations['en'] || {})[key] || key; }
  if (params) { for (var k in params) { val = val.replace('{' + k + '}', params[k]); } }
  return val;
}
function giscusPost(msg) {
  var f = document.querySelector('iframe.giscus-frame');
  if (f) f.contentWindow.postMessage({ giscus: msg }, 'https://giscus.app');
}
function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('company-lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var params = null;
    var paramsAttr = el.getAttribute('data-i18n-params');
    if (paramsAttr) { try { params = JSON.parse(paramsAttr); } catch(e) {} }
    var text = __(key, params);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.setAttribute('placeholder', text);
    } else {
      el.textContent = text;
    }
  });
  document.querySelectorAll('.lang-switch').forEach(function(el) {
    el.textContent = __(el.getAttribute('data-lang-key'));
  });
  giscusPost({ setConfig: { lang: lang } });
}
document.documentElement.lang = currentLang;
var savedTheme = localStorage.getItem('company-theme');
if (savedTheme) { document.documentElement.setAttribute('data-theme', savedTheme); }
else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
function toggleTheme() {
  var html = document.documentElement;
  var cur = html.getAttribute('data-theme') || 'light';
  var next = cur === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('company-theme', next);
  giscusPost({ setConfig: { theme: next } });
}
// Sync Giscus with saved state on initial load (one-shot, in case dynamic script missed)
var _giscusSynced = false;
window.addEventListener('message', function(e) {
  if (e.origin !== 'https://giscus.app') return;
  if (_giscusSynced) return;
  _giscusSynced = true;
  var t = localStorage.getItem('company-theme');
  if (t) giscusPost({ setConfig: { theme: t } });
  var l = localStorage.getItem('company-lang');
  if (l) giscusPost({ setConfig: { lang: l } });
});`.trim();

  const i18nMin = UglifyJS.minify(i18nJsContent);
  if (i18nMin.error) { console.error('i18n minify error:', i18nMin.error); process.exit(1); }
  await FS.outputFile(path.resolve(DIST_DIR, 'js', 'i18n.js'), i18nMin.code);

  // --- Generate dist/js/data.js ---
  const compactData = allNodes.map(n => ({
    id: n.id,
    n: n.fullName,
    p: n.url,
    d: (n.description || '').slice(0, 120),
    city: n.city || '',
    scale: n.scale || '',
    industry: n.industry || '',
    avgRating: n.avgRating,
    reviewCount: n.reviewCount || 0,
    isDept: n.depth > 0,
    parent: n.depth > 0 ? n.parentName : '',
    positionCount: n.positionCount || (n.positions || []).length,
    name: n.name || n.fullName,
    fullName: n.fullName,
    nameEn: n.nameEn || '',
    nameJa: n.nameJa || '',
    aliases: n.aliases || [],
    tags: n.tags || [],
    url: n.url,
    icon: n.icon || '',
    establishedYear: n.establishedYear || '',
    depth: n.depth || 0,
    metrics: n.metrics ? {
      workIntensity: n.metrics.workIntensity || 0,
      overtimeFreq: n.metrics.overtimeFreq || 0,
      salaryLevel: n.metrics.salaryLevel || 0,
      benefitsScore: n.metrics.benefitsScore || 0,
      wlbScore: n.metrics.wlbScore || 0,
      careerGrowth: n.metrics.careerGrowth || 0,
      workEnv: n.metrics.workEnv || 0,
      cultureScore: n.metrics.cultureScore || 0
    } : null
  }));
  const compactPositions = allPositions.map(p => ({
    id: p.id,
    n: p.fullName,
    p: p.url,
    d: (p.jobDescription || '').slice(0, 120),
    city: p.workLocation || '',
    industry: p.positionCategory || '',
    isPosition: true,
    parent: p.parentName,
    tags: p.tags || [],
    nameEn: p.nameEn || '',
    nameJa: p.nameJa || '',
    aliases: p.aliases || []
  }));
  const allData = [...compactData, ...compactPositions];
  await FS.outputFile(path.resolve(DIST_DIR, 'js', 'data.js'),
    `var companyData = ${JSON.stringify(compactData)};\n` +
    `var positionData = ${JSON.stringify(compactPositions)};\n` +
    `var ALL_DATA = ${JSON.stringify(allData)};`);

  // Copy static assets
  await FS.copy(path.resolve(STATIC_DIR, 'css'), path.resolve(DIST_DIR, 'css'));
  await FS.copy(path.resolve(STATIC_DIR, 'js'), path.resolve(DIST_DIR, 'js'));
  if (await FS.pathExists(path.resolve(STATIC_DIR, 'img'))) {
    await FS.copy(path.resolve(STATIC_DIR, 'img'), path.resolve(DIST_DIR, 'img'));
  }
  // Copy images directory (project branding + company icons)
  if (await FS.pathExists(IMAGES_DIR)) {
    await FS.copy(IMAGES_DIR, path.resolve(DIST_DIR, 'img'));
  }

  // Template helpers
  const defaultTrans = translations['zh-CN'] || {};
  function t(key, params) {
    let val = defaultTrans[key] || key;
    if (params) { for (const k in params) { val = val.replace('{' + k + '}', params[k]); } }
    return val;
  }

  const renderOpts = { companies, industries, t, __: t, config: CONFIG, siteData: { companies: companies.length, departments: deptCount, positions: positionCount, reviews: totalReviews, images: totalImages, languages: langKeys.length } };

  async function renderTpl(name, outPath, extra) {
    const fp = path.resolve(TEMPLATE_DIR, name);
    const html = await ejs.renderFile(fp, { ...renderOpts, ...extra }, { filename: fp });
    await FS.outputFile(outPath, html);
    console.log(`  → ${path.relative(DIST_DIR, outPath)}`);
  }

  // Render index + list
  await renderTpl('index.ejs', path.resolve(DIST_DIR, 'index.html'), { basePath: '' });
  await renderTpl('list.ejs', path.resolve(DIST_DIR, 'list.html'), { basePath: '' });

  // Render all node pages (companies + departments at any depth)
  for (const n of allNodes) {
    const dirSegments = n.pathSegments.slice(0, -1);
    const outDir = path.resolve(DIST_DIR, 'c', ...dirSegments);
    const outFile = path.resolve(outDir, n.pathSegments[n.pathSegments.length - 1] + '.html');
    await FS.ensureDir(outDir);
    await renderTpl('company.ejs', outFile, {
      company: n,
      basePath: n.basePath,
      isDeptPage: n.depth > 0
    });
  }

  // Render position pages
  for (const p of allPositions) {
    const dirSegments = p.pathSegments.slice(0, -1);
    const outDir = path.resolve(DIST_DIR, 'c', ...dirSegments);
    const outFile = path.resolve(outDir, p.pathSegments[p.pathSegments.length - 1] + '.html');
    await FS.ensureDir(outDir);
    // Find parent dept
    const parentDept = allNodes.find(n => n.name === p.parentName && n.pathSegments.length === p.pathSegments.length - 1);
    await renderTpl('position.ejs', outFile, {
      position: p,
      parentDept: parentDept || null,
      basePath: p.basePath
    });
  }

  // Render compare page
  await renderTpl('compare.ejs', path.resolve(DIST_DIR, 'compare.html'), { basePath: '' });
  await renderTpl('404.ejs', path.resolve(DIST_DIR, '404.html'), { basePath: '' });

  console.log(`\n✅ Build complete! ${allNodes.length} dept pages + ${positionCount} position pages (${allNodes.length + positionCount} total), ${langKeys.length} languages.`);
  console.log(`   Output: ${DIST_DIR}/`);
}

build().catch(err => { console.error('Build failed:', err); process.exit(1); });
