/**
 * matchService.js - 按需求类型做住宿/供应链/物业匹配推荐
 */
const { PROVIDERS } = require('../db');

const KIND_MAP = {
  accommodation: 'accommodation',
  enterprise: 'supplychain',   // 企业需求默认匹配供应链供应商
  supplychain: 'supplychain',
  property: 'property'
};

function localizeName(p, lang) {
  if (lang === 'en') return p.name_en;
  if (lang === 'km') return p.name_km;
  return p.name_zh;
}

/**
 * 匹配推荐
 * @param {string} type 需求类型
 * @param {string} query 用户描述/关键词
 * @param {string} lang 语言
 */
function match(type, query = '', lang = 'zh-CN', limit = 5) {
  const kind = KIND_MAP[type] || 'supplychain';
  const rows = PROVIDERS.filter(p => p.kind === kind);
  const q = (query || '').toLowerCase();

  const scored = rows.map(p => {
    let score = p.rating; // 基础分=评分
    const hay = ((p.tags || '') + ' ' + (p.desc_zh || '') + ' ' + (p.city || '')).toLowerCase();
    (p.tags || '').split(',').forEach(t => {
      const tt = t.trim().toLowerCase();
      if (tt && q.includes(tt)) score += 2;
    });
    if (q && hay.includes(q)) score += 1;
    return { ...p, score, name: localizeName(p, lang), matchScore: score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * 意图识别（关键词 -> 需求类型）
 */
function detectIntent(text = '', lang = 'zh-CN') {
  const t = (text || '').toLowerCase();
  const rules = [
    { type: 'property', keys: ['物业', '抄表', '报修', '维修', '保洁', '安保', 'property', 'maintenance', 'meter'] },
    { type: 'accommodation', keys: ['住宿', '酒店', '公寓', '长住', 'hotel', 'accommodation', 'apartment', 'stay'] },
    { type: 'supplychain', keys: ['供应链', '建材', '机电', '采购', '供应', 'supply', 'material', 'procure'] },
    { type: 'enterprise', keys: ['企业', '需求', '招标', '合作', 'enterprise', 'business', 'tender'] }
  ];
  for (const r of rules) {
    if (r.keys.some(k => t.includes(k))) return r.type;
  }
  return null;
}

module.exports = { match, detectIntent, localizeName };
