/**
 * 跨公司对比功能
 * 依赖: data.js (ALL_DATA), i18n.js (__函数)
 */
var COMPARE_KEY = 'company-compare';
var MAX_COMPARE = 4;
var compareList = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');

function escAttr(s) { return String(s).replace(/'/g, "\\'"); }

function showToast(msg) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() { el.classList.add('toast-out'); }, 2000);
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
}

function compareAdd(name) {
  if (compareList.indexOf(name) >= 0) {
    showToast(name + ' ' + (__('compare.alreadyAdded') || '已在对比列表中'));
    return;
  }
  if (compareList.length >= MAX_COMPARE) {
    showToast(__(/* @i18n */ 'compare.max', {max: MAX_COMPARE}) || '最多只能对比 ' + MAX_COMPARE + ' 家公司');
    return;
  }
  compareList.push(name);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
  renderCompare();
  showToast(name + ' ' + (__('compare.added') || '已加入对比'));
}

function compareRemove(name) {
  compareList = compareList.filter(function(n) { return n !== name; });
  localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
  renderCompare();
  showToast(name + ' ' + (__('compare.removed') || '已移除'));
}

function compareClear() {
  compareList = [];
  localStorage.setItem(COMPARE_KEY, '[]');
  renderCompare();
  showToast(__(/* @i18n */ 'compare.cleared') || '已清空所有公司');
}

function renderCompare() {
  var table = document.getElementById('compareTable');
  if (compareList.length === 0) {
    table.innerHTML = '<div class="compare-empty">' + (__('compare.empty') || '还没有选公司') + '</div>';
    return;
  }
  var data = (typeof ALL_DATA !== 'undefined') ? ALL_DATA : (window.ALL_DATA || []);
  if (!data || data.length === 0) {
    table.innerHTML = '<div class="compare-empty">' + (__('compare.loading') || '数据加载中...') + '</div>';
    return;
  }
  window._compareRetry = window._compareRetry || 0;
  var picked = compareList.map(function(name) {
    return data.find(function(d) { return d.fullName === name || d.name === name || d.n === name; });
  }).filter(Boolean);

  if (picked.length !== compareList.length && window._compareRetry < 20) {
    window._compareRetry++;
    setTimeout(renderCompare, 100);
    return;
  }
  window._compareRetry = 0;

  var rows = [
    {label: __('compare.label.company'), getValue: function(c) { return '<a href="' + c.url + '">' + c.fullName + '</a><br><a href="javascript:void(0)" onclick="compareRemove(\'' + escAttr(c.fullName) + '\')" style="color:var(--color-danger);font-size:12px;">' + (__('compare.remove') || '✕ 移除') + '</a>'; }, isHeader: true},
    {label: __('compare.label.overallRating'), getValue: function(c) { return c.avgRating > 0 ? '<div class="compare-cell-rating">' + c.avgRating.toFixed(1) + '</div><div style="font-size:12px;color:var(--color-text-secondary);">/5.0</div>' : '—'; }},
    {label: __('compare.label.industry'), getValue: function(c) { return c.industry || '—'; }},
    {label: __('compare.label.city'), getValue: function(c) { return c.city || '—'; }},
    {label: __('compare.label.scale'), getValue: function(c) { return c.scale || '—'; }},
    {label: __('compare.label.established'), getValue: function(c) { return c.establishedYear || '—'; }},
    {label: __('compare.label.nine996'), getValue: function(c) { return c.metrics && c.metrics.workIntensity > 0 ? c.metrics.workIntensity.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.overtimeFreq'), getValue: function(c) { return c.metrics && c.metrics.overtimeFreq > 0 ? c.metrics.overtimeFreq.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.salaryLevel'), getValue: function(c) { return c.metrics && c.metrics.salaryLevel > 0 ? c.metrics.salaryLevel.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.benefits'), getValue: function(c) { return c.metrics && c.metrics.benefitsScore > 0 ? c.metrics.benefitsScore.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.wlb'), getValue: function(c) { return c.metrics && c.metrics.wlbScore > 0 ? c.metrics.wlbScore.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.careerGrowth'), getValue: function(c) { return c.metrics && c.metrics.careerGrowth > 0 ? c.metrics.careerGrowth.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.workEnv'), getValue: function(c) { return c.metrics && c.metrics.workEnv > 0 ? c.metrics.workEnv.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.culture'), getValue: function(c) { return c.metrics && c.metrics.cultureScore > 0 ? c.metrics.cultureScore.toFixed(1) + '/5' : '—'; }},
    {label: __('compare.label.positionCount'), getValue: function(c) { return (__('compare.positionsCount', {count: c.positionCount || 0}) || (c.positionCount || 0) + ' 个职位'); }},
  ];
  var html = '';
  rows.forEach(function(r) {
    html += '<div class="compare-row"><div class="compare-label">' + r.label + '</div><div class="compare-cells">';
    picked.forEach(function(c) {
      var v = r.getValue(c);
      var isHead = r.isHeader ? ' font-weight:600;' : '';
      html += '<div class="compare-cell" style="' + isHead + '">' + v + '</div>';
    });
    html += '</div></div>';
  });
  table.innerHTML = html;
}

// Initialize: search input binding
document.addEventListener('DOMContentLoaded', function() {
  var compareInput = document.getElementById('compareInput');
  var compareSuggest = document.getElementById('compareSuggest');
  if (!compareInput) return;

  compareInput.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    if (!q) { compareSuggest.style.display = 'none'; return; }
    var data = (typeof ALL_DATA !== 'undefined') ? ALL_DATA : (window.ALL_DATA || []);
    var matches = data.filter(function(d) { return d.depth === 0 && d.fullName.toLowerCase().indexOf(q) >= 0; }).slice(0, 10);
    if (matches.length === 0) { compareSuggest.style.display = 'none'; return; }
    compareSuggest.innerHTML = matches.map(function(m) {
      return '<a href="javascript:void(0)" onclick="compareAdd(\'' + escAttr(m.fullName) + '\');document.getElementById(\'compareInput\').value=\'\';document.getElementById(\'compareSuggest\').style.display=\'none\';">' + m.fullName + ' <span style="color:var(--color-text-secondary);font-size:12px;">' + (m.industry || '') + '</span></a>';
    }).join('');
    compareSuggest.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.compare-suggest') && !e.target.closest('#compareInput')) {
      compareSuggest.style.display = 'none';
    }
  });

  var qs = new URLSearchParams(window.location.search).get('q');
  if (qs) {
    var names = qs.split(',').map(function(s) { return decodeURIComponent(s.trim()); });
    names.forEach(function(n) { compareAdd(n); });
  }

  renderCompare();
});
