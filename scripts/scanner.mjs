/**
 * 目录递归扫描器
 * 扫描 companies/ 目录，递归解析 Markdown 文件并返回节点树
 */
import path from 'path';
import FS from 'fs-extra';
import { parseMdFile, parsePosition } from './parser.mjs';

/**
 * 递归扫描 companies/ 目录
 * @param {string} dirPath - 当前扫描目录
 * @param {number} depth - 当前深度(顶层=0)
 * @param {object} ctx - 上下文 { COMPANIES_DIR, GITHUB_SOURCE_BASE, resolveCompanyIcon, ROOT }
 * @returns {Promise<Array>} 节点数组
 */
export async function scanTree(dirPath, depth, ctx) {
  const { COMPANIES_DIR, GITHUB_SOURCE_BASE, resolveCompanyIcon, ROOT } = ctx;
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
    if (d.name === 'positions') continue;
    const childLevelNodes = await scanTree(path.resolve(dirPath, d.name), depth + 1, ctx);
    const parentNode = levelNodes.find(n => n.name === d.name);
    if (parentNode && childLevelNodes.length > 0) {
      parentNode.children = childLevelNodes;
      parentNode.hasChildren = true;
    } else if (childLevelNodes.length > 0) {
      levelNodes.push(...childLevelNodes);
    }
    const positionsOwner = levelNodes.find(n => n.name === d.name) || (childLevelNodes.length > 0 ? (childLevelNodes.find(n => n.name === d.name) || childLevelNodes[0]) : null);
    const subSubdirs = await FS.readdir(path.resolve(dirPath, d.name), { withFileTypes: true });
    const positionsInSub = subSubdirs.find(sd => sd.isDirectory() && sd.name === 'positions');
    if (positionsInSub && positionsOwner) {
      const posDir = path.resolve(dirPath, d.name, positionsInSub.name);
      const beforeCount = positionNodes.length;
      await parsePositionsDir(posDir, positionsOwner);
      positionsOwner.positions = positionNodes.slice(beforeCount);
    }
  }
  return levelNodes;
}
