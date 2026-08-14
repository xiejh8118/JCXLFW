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
  t,
  getSupportedLanguages
};
