/**
 * 多语言引擎生成器
 * 生成 dist/js/i18n.js（运行时翻译+主题切换+语言检测）
 */
import UglifyJS from 'uglify-js';

/**
 * 生成 i18n.js 内容并压缩
 * @param {object} translations - { zh-CN: {...}, en: {...}, ... }
 * @returns {{ code: string, error?: string }}
 */
export function generateI18nJs(translations) {
  const content = `
var translations = ${JSON.stringify(translations)};
var currentLang = (function() {
  var saved = localStorage.getItem('company-lang');
  if (saved) return saved;
  var bl = (navigator.language || navigator.browserLanguage || '').toLowerCase();
  var map = {zh:'zh-CN',en:'en',ja:'ja',ko:'ko',fr:'fr',de:'de',es:'es',pt:'pt',ru:'ru'};
  if (bl === 'zh-tw' || bl === 'zh-hk' || bl === 'zh-mo') return 'zh-TW';
  for (var p in map) { if (bl.indexOf(p) === 0) return map[p]; }
  return 'zh-CN';
})();
function __(key, params) {
  var map = translations[currentLang] || translations['zh-CN'];
  var val = map[key];
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
    } else { el.textContent = text; }
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

  const min = UglifyJS.minify(content);
  if (min.error) return { code: content, error: min.error };
  return { code: min.code };
}

/**
 * 创建模板渲染用的翻译助手函数
 * @param {object} defaultTrans - 默认语言的翻译对象
 * @returns {function} t(key, params) - 模板内使用的翻译函数
 */
export function createTemplateHelper(defaultTrans) {
  return function t(key, params) {
    let val = defaultTrans[key] || key;
    if (params) {
      for (const k in params) {
        val = val.replace('{' + k + '}', params[k]);
      }
    }
    return val;
  };
}
