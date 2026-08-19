/**
 * i18n.js - 多语言管理（中文/英文/高棉文）
 * Cambodian Business Travel Assistant
 */

// 语言包
const locales = {
  'zh-CN': require('./lang/zh-CN.js'),
  'en': require('./lang/en.js'),
  'km': require('./lang/km.js')
};

let currentLocale = 'zh-CN';

/**
 * 初始化语言环境
 */
function initI18n(lang) {
  if (locales[lang]) {
    currentLocale = lang;
  } else {
    currentLocale = 'zh-CN';
  }
}

/**
 * 获取当前语言
 */
function getCurrentLang() {
  return currentLocale;
}

/**
 * 翻译函数
 * @param {string} key - 翻译键，支持点号分隔，如 'order.status.paid'
 * @param {object} params - 插值参数，如 { count: 5 }
 */
function t(key, params) {
  const locale = locales[currentLocale] || locales['zh-CN'];
  let value = getNestedValue(locale, key);

  if (value === undefined) {
    // 回退到中文
    value = getNestedValue(locales['zh-CN'], key);
  }

  if (value === undefined) {
    console.warn(`[i18n] 翻译键未找到: ${key}`);
    return key;
  }

  // 插值替换
  if (params && typeof value === 'string') {
    value = value.replace(/\{(\w+)\}/g, (match, p1) => {
      return params[p1] !== undefined ? params[p1] : match;
    });
  }

  return value;
}

/**
 * 获取整个命名空间对象（页面级文案树）
 * 页面用法：this.setData({ L: getScope('property') })，WXML 用 {{L.xxx}}
 * 支持数组/嵌套对象，未找到时回退中文
 */
function getScope(ns) {
  const locale = locales[currentLocale] || locales['zh-CN'];
  const val = getNestedValue(locale, ns);
  if (val !== undefined) return val;
  return getNestedValue(locales['zh-CN'], ns) || {};
}

/**
 * 三语数据对象取值：pick({ zh:'中文', en:'English', km:'ភាសាខ្មែរ' })
 * 按当前语言返回对应值，缺省回退 zh
 */
function pick(obj, fallback) {
  if (obj === null || obj === undefined) return fallback || '';
  if (typeof obj !== 'object') return obj;
  const lang = currentLocale === 'zh-CN' ? 'zh' : currentLocale;
  const v = obj[lang];
  if (v !== undefined && v !== null && v !== '') return v;
  return obj.zh !== undefined ? obj.zh : (fallback || '');
}

/**
 * 递归转换三语数据对象（数组/嵌套对象中的 {zh,en,km} 全部按当前语言展开）
 * 页面用法：this.setData({ list: pickDeep(rawList) })
 */
function pickDeep(obj) {
  if (Array.isArray(obj)) return obj.map(pickDeep);
  if (obj && typeof obj === 'object') {
    // 是三语对象 {zh,en,km}（且没有业务字段）→ 直接 pick
    if (obj.zh !== undefined && (obj.en !== undefined || obj.km !== undefined) &&
        !('id' in obj) && !('key' in obj)) {
      return pick(obj);
    }
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = pickDeep(obj[k]); });
    return out;
  }
  return obj;
}

/**
 * 获取嵌套对象值
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * 支持的语言列表
 */
function getSupportedLanguages() {
  return [
    { code: 'zh-CN', name: '中文', native: '中文' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'km', name: 'ភាសាខ្មែរ', native: 'ភាសាខ្មែរ' }
  ];
}

module.exports = {
  initI18n,
  getCurrentLang,
  // 兼容别名（部分页面曾误用 getLang/setLang）
  getLang: getCurrentLang,
  setLang: initI18n,
  t,
  getScope,
  pick,
  pickDeep,
  getSupportedLanguages
};
