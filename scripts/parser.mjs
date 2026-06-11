/**
 * Markdown 解析器 — 纯函数
 * 解析公司/部门、员工评价、职位 Markdown 文件
 */
import path from 'path';
import { readFileSync } from 'fs';

/**
 * 解析公司/部门 Markdown 文件
 * @param {string} filePath - .md 文件绝对路径
 * @param {string} sourceBase - Git 源链接基地址
 * @param {Function} resolveIcon - 公司图标解析函数 (name) => string
 * @returns {object} CompanyNode
 */
export function parseMdFile(filePath, sourceBase, resolveIcon) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath, '.md');
  const title = lines[0].trim();

  let desc = '';
  let inDesc = false;
  let firstHash = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^=+$/.test(lines[i].trim())) { inDesc = true; continue; }
    if (inDesc && lines[i].trim().startsWith('## ')) { firstHash = i; break; }
    if (inDesc) desc += lines[i] + '\n';
  }
  desc = desc.trim();

  const sections = {};
  let curSec = '', secLines = [];
  for (let i = firstHash; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('## ')) {
      if (curSec) sections[curSec] = secLines.join('\n').trim();
      curSec = t.replace(/^##\s+/, '');
      secLines = [];
    } else if (curSec) secLines.push(lines[i]);
  }
  if (curSec) sections[curSec] = secLines.join('\n').trim();

  const infoLines = (sections['基本信息'] || '').split('\n').map(l => l.trim()).filter(l => l);

  function getInfo(p) {
    const re = new RegExp('^-\\s*' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[：:]\\s*(.+)$');
    for (const l of infoLines) {
      const m = l.match(re);
      if (m) return m[1].trim();
    }
    return '';
  }

  function getScore(s) {
    const m = (sections[s] || '').match(/评分：([\d.]+)\/5/);
    return m ? parseFloat(m[1]) : 0;
  }

  function getText(s) {
    return (sections[s] || '').replace(/^评分：[\d.]+\/5\n*/gm, '').trim();
  }

  const obj = {
    id: 0,
    name: fileName,
    fullName: title,
    nameEn: getInfo('英文名'),
    nameJa: getInfo('日文名'),
    alias: getInfo('别名'),
    aliases: getInfo('别名').split(/[\/,、]/).map(s => s.trim()).filter(Boolean),
    tags: getInfo('标签').split(/[\/,、]/).map(s => s.trim()).filter(Boolean),
    city: getInfo('城市'),
    scale: getInfo('规模') || getInfo('部门规模'),
    establishedYear: parseInt(getInfo('成立')) || 0,
    industry: getInfo('行业') || getInfo('业务范围'),
    website: getInfo('官网'),
    description: desc,
    avgRating: 0,
    reviewCount: 0,
    isDepartment: false,
    depth: 0,
    rootCompany: '',
    parentName: '',
    parentNames: [],
    pathSegments: [],
    parentCompany: '',
    children: [],
    hasChildren: false,
    url: '',
    metrics: {
      workIntensity: getScore('工作强度'),
      overtimeFreq: getScore('加班频率'),
      is996: (sections['是否996'] || '').trim() === '是',
      salaryLevel: getScore('薪资水平'),
      benefitsScore: getScore('福利待遇分'),
      wlbScore: getScore('工作生活平衡'),
      careerGrowth: getScore('职业发展'),
      workEnv: getScore('工作环境'),
      cultureScore: getScore('企业文化分'),
      overtimeDesc: getText('加班情况'),
      benefitsDesc: getText('福利待遇'),
      cultureDesc: getText('企业文化'),
      pros: getText('优点'),
      cons: getText('缺点'),
    }
  };

  const m = obj.metrics;
  const scores = [m.salaryLevel, m.benefitsScore, m.wlbScore, m.careerGrowth, m.workEnv, m.cultureScore];
  obj.avgRating = scores.some(s => s > 0) ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  obj.reviews = parseReviews(sections['员工评价'] || '');
  obj.reviewCount = obj.reviews.length;

  return obj;
}

/**
 * 解析员工评价 Markdown 区块
 * @param {string} text - "## 员工评价" 区块内容
 * @returns {Array<{date,role,experience,author,rating,comment,pros,cons}>}
 */
export function parseReviews(text) {
  if (!text) return [];
  const reviews = [];
  const blocks = text.split(/^### /m).slice(1);
  for (const block of blocks) {
    const lines = block.split('\n');
    const header = lines[0].trim();
    const parts = header.split('|').map(s => s.trim());
    let rating = 0, comment = '', pros = '', cons = '';
    let currentField = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const ratingMatch = line.match(/^评分[：:]\s*([\d.]+)\s*\/\s*5/);
      if (ratingMatch) { rating = parseFloat(ratingMatch[1]); continue; }
      if (/^(\*\*)?优点/.test(line)) { currentField = 'pros'; continue; }
      if (/^(\*\*)?缺点/.test(line)) { currentField = 'cons'; continue; }
      if (line.startsWith('>')) {
        comment += line.replace(/^>\s*/, '') + '\n';
      } else if (currentField === 'pros') {
        pros += line.replace(/^:\s*/, '') + '\n';
      } else if (currentField === 'cons') {
        cons += line.replace(/^:\s*/, '') + '\n';
      }
    }
    reviews.push({
      date: parts[0] || '',
      role: parts[1] || '',
      experience: parts[2] || '',
      author: parts[3] || '匿名',
      rating,
      comment: comment.trim(),
      pros: pros.trim(),
      cons: cons.trim(),
    });
  }
  return reviews;
}

/**
 * 解职位 Markdown sections
 * @param {string} filePath - .md 文件路径（用于提取文件名）
 * @param {object} sections - 已解析的 ## 章节对象
 * @param {string} desc - 职位简介
 * @returns {object} PositionNode
 */
export function parsePosition(filePath, sections, desc) {
  const baseInfo = sections['基本信息'] || '';
  const infoLines = baseInfo.split('\n').map(l => l.trim()).filter(l => l);
  const descLines = desc.split('\n').map(l => l.trim()).filter(l => l);

  function getInfo(p) {
    for (const l of infoLines) {
      if (l.startsWith('- ' + p + '：')) return l.replace('- ' + p + '：', '').trim();
      const m = l.match(new RegExp('^' + p + '[：:]\\s*(.+)$'));
      if (m) return m[1].trim();
    }
    for (const l of descLines) {
      const m = l.match(new RegExp('^' + p + '[：:]\\s*(.+)$'));
      if (m) return m[1].trim();
    }
    return '';
  }

  const salaryRanges = [];
  for (const line of (sections['薪资范围'] || '').split('\n')) {
    const m = line.match(/^[\s\-\*]+([A-Za-z0-9\u4e00-\u9fa5\- ]+)\s*[:：]\s*(.+)$/);
    if (m) salaryRanges.push({ level: m[1].trim(), salary: m[2].trim() });
  }

  const techStack = (sections['技术栈'] || '').split(/[,,、\n]/).map(s => s.trim()).filter(Boolean);
  const requirements = (sections['技能要求'] || '').split('\n').map(l => l.trim()).filter(l => l);
  const interview = (sections['面试流程'] || '').split('\n').map(l => l.trim()).filter(l => l);

  const similarPositions = [];
  for (const line of (sections['类似职位'] || '').split('\n')) {
    const m = line.match(/^[\s\-\*]+(.+?)\s*[\-]\s*(.+)$/);
    if (m) similarPositions.push({ path: m[1].trim(), title: m[2].trim() });
  }

  return {
    name: path.basename(filePath, '.md'),
    fullName: path.basename(filePath, '.md'),
    isPosition: true,
    positionCategory: getInfo('类别'),
    levelRange: getInfo('职级范围'),
    workLocation: getInfo('工作地点'),
    jobDescription: desc,
    salaryRanges,
    requirements,
    interviewProcess: interview,
    techStack,
    similarPositions,
    tags: getInfo('标签').split(/[\/,、]/).map(s => s.trim()).filter(Boolean),
  };
}
