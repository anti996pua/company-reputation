import FS from 'fs-extra';
import Path from 'path';
import { fileURLToPath } from 'url';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));
const COMPANIES_DIR = Path.resolve(__dirname, '..', 'companies');
const CONSTRAINTS = {
  maxAvgRating: 5,
  minAvgRating: 0,
  requiredSections: ['行业', '标签', '描述'],
  requiredPositionSections: ['薪资范围', '技术栈', '技能要求', '面试流程', '类似职位'],
};

let errors = [];
let warnings = [];
let stats = { companies: 0, departments: 0, positions: 0 };

function addError(file, msg) { errors.push(`  ❌ ${file}: ${msg}`); }
function addWarning(file, msg) { warnings.push(`  ⚠️  ${file}: ${msg}`); }

function parseMdFile(filePath) {
  const content = FS.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract title (first non-empty line)
  let title = '';
  for (const line of lines) {
    if (line.trim()) { title = line.trim(); break; }
  }

  // Find === separator and description
  const sepIdx = lines.findIndex(l => /^={3,}$/.test(l.trim()));
  if (sepIdx === -1) { addError(filePath, '缺少 === 分隔线'); return null; }

  const desc = lines.slice(sepIdx + 1).find(l => l.trim() && !l.startsWith('#')) || '';
  const rest = lines.slice(sepIdx + 1);

  // Extract sections (## 标题)
  const sections = {};
  let currentSection = '';
  for (const line of rest) {
    const m = line.match(/^##\s+(.+)/);
    if (m) { currentSection = m[1].trim(); sections[currentSection] = []; }
    else if (currentSection) { sections[currentSection].push(line); }
  }

  return { title, desc, sections, lines };
}

function getSectionText(sections, name) {
  const section = sections[name];
  if (!section) return '';
  return section.join('\n').trim();
}

function validateCompany(filePath) {
  const parsed = parseMdFile(filePath);
  if (!parsed) return;
  const { title, sections } = parsed;
  stats.companies++;

  for (const req of CONSTRAINTS.requiredSections) {
    if (!sections[req]) addWarning(filePath, `公司 "${title}" 缺少 "${req}" 章节`);
  }

  if (sections['评分']) {
    const scoresSection = sections['评分'].join('\n');
    // Check specific metric scores
    const metrics = ['综合评分', '工作强度', '加班频率', '薪资水平',
      '福利待遇分', '工作生活平衡', '职业发展', '工作环境', '企业文化分'];
    for (const m of metrics) {
      const match = scoresSection.match(new RegExp(`${m}\\s*[:：]\\s*([\\d.]+)`));
      if (match) {
        const val = parseFloat(match[1]);
        if (val > CONSTRAINTS.maxAvgRating || val < CONSTRAINTS.minAvgRating) {
          addWarning(filePath, `公司 "${title}" 的 ${m} 评分为 ${val}，超出合理范围`);
        }
      }
    }
  }

  if (sections['员工评价']) {
    const reviewText = sections['员工评价'].join('\n');
    const reviewBlocks = reviewText.split(/^### /m).slice(1);
    for (const block of reviewBlocks) {
      const lines = block.split('\n').filter(l => l.trim());
      // Check review format: date | role | experience | author
      const headerMatch = lines[0] && lines[0].match(/([\d-]+)\s*\|/);
      if (!headerMatch) addWarning(filePath, `员工评价格式异常（缺少日期）`);
    }
  }
}

function validatePosition(filePath, parentPath) {
  const parsed = parseMdFile(filePath);
  if (!parsed) return;
  const { title, sections } = parsed;
  stats.positions++;

  for (const req of CONSTRAINTS.requiredPositionSections) {
    if (!sections[req]) addWarning(filePath, `职位 "${title}" 缺少 "${req}" 章节`);
  }

  if (sections['薪资范围']) {
    const salaryText = sections['薪资范围'].join('\n');
    if (!/\d{2,}[Kk]/.test(salaryText) && !/\d{4,}/.test(salaryText)) {
      addWarning(filePath, `职位 "${title}" 薪资范围格式异常: "${salaryText.trim().slice(0, 30)}"`);
    }
  }
}

function scanDir(dirPath, depth) {
  let entries;
  try {
    entries = FS.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) { return; }

  for (const entry of entries) {
    const fullPath = Path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'positions') {
        // Position directory
        const positionFiles = FS.readdirSync(fullPath)
          .filter(f => f.endsWith('.md'))
          .sort();
        for (const pf of positionFiles) {
          validatePosition(Path.join(fullPath, pf), dirPath);
        }
      } else {
        scanDir(fullPath, depth + 1);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (depth === 0) {
        validateCompany(fullPath);
      } else {
        // Check if it's in a positions subdirectory
        const parentDir = Path.basename(Path.dirname(fullPath));
        if (parentDir !== 'positions') {
          stats.departments++;
        }
      }
    }
  }
}

// Also scan positions in companies directly (not just nested)
function scanPositions(dirPath) {
  const posDir = Path.join(dirPath, 'positions');
  if (FS.existsSync(posDir)) {
    const files = FS.readdirSync(posDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      validatePosition(Path.join(posDir, f), dirPath);
    }
  }

  // Recurse into subdirectories
  let entries;
  try { entries = FS.readdirSync(dirPath, { withFileTypes: true }); }
  catch (e) { return; }

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'positions') {
      scanPositions(Path.join(dirPath, entry.name));
    }
  }
}

console.log('\n🔍 数据校验开始...\n');

// Validate all companies (depth 0)
scanDir(COMPANIES_DIR, 0);

// Validate all positions (in positions/ dirs at any depth)
scanPositions(COMPANIES_DIR);

// Summary
console.log(`📊 统计: ${stats.companies} 公司, ${stats.departments} 部门, ${stats.positions} 职位\n`);

if (errors.length > 0) {
  console.log('❌ 校验失败:\n' + errors.join('\n') + '\n');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('⚠️  警告（不影响构建，但建议修复）:\n' + warnings.join('\n') + '\n');
}

console.log('✅ 数据校验通过！\n');
