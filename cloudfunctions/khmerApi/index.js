/**
 * khmerApi 云函数 - KHMER AI 2.0 / 编号 KHMER-1.1.1
 * 国际版云开发（Tencent Cloud International）部署，免 request 域名白名单。
 * 功能：AI 助手（可降级）+ 供应链/住宿/物业匹配 + 需求单闭环（CRUD + 状态流转）。
 * 鉴权：OPENID 由云函数自动从微信上下文获取，无需前端 wx.login 换 token。
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COL_PROVIDERS = 'providers';
const COL_REQ = 'requirements';

// ============ 供应商/服务目录（种子，首次自动写入云数据库）============
const PROVIDERS = [
  // ---- 住宿 ----
  { kind: 'accommodation', name_zh: '金边中鼎国际酒店', name_en: 'Phnom Penh Zhongding Intl Hotel', name_km: 'សណ្ឋាគារអន្តរជាតិចុងឌីងភ្នំពេញ', city: 'Phnom Penh', tags: '酒店,商务,长住,中资', rating: 4.8, price_info: 'USD 45/晚起', contact: 'tel:012-xxx', desc_zh: '中资企业定点长住酒店，含发票与商务中心。' },
  { kind: 'accommodation', name_zh: '西港海景公寓', name_en: 'Sihanoukville Seaview Apartment', name_km: 'អាផែរទិដ្ឋភាពសមុទ្រសីហនុ', city: 'Sihanoukville', tags: '公寓,长住,海景,团队', rating: 4.5, price_info: 'USD 380/月', contact: 'tel:013-xxx', desc_zh: '适合工程团队月租，近港区。' },
  { kind: 'accommodation', name_zh: '暹粒商务宾馆', name_en: 'Siem Reap Business Inn', name_km: 'សណ្ឋាគារអាជីវកម្មសៀមរាប', city: 'Siem Reap', tags: '酒店,商务,旅游', rating: 4.6, price_info: 'USD 32/晚起', contact: 'tel:014-xxx', desc_zh: '近景区，商务出行优选。' },
  // ---- 供应链 ----
  { kind: 'supplychain', name_zh: '中华建材柬埔寨仓', name_en: 'Zhonghua Building Materials KH', name_km: 'សម្ភារៈសំណង់ចុងហួរ', city: 'Phnom Penh', tags: '建材,钢材,水泥,批发', rating: 4.7, price_info: '询价', contact: 'tel:015-xxx', desc_zh: '钢材水泥批发，支持项目集采。' },
  { kind: 'supplychain', name_zh: '泛亚机电设备', name_en: 'Pan-Asia M&E Equipment', name_km: 'ឧបករណ៍អគ្គិសនីប៉ានអាស៊ី', city: 'Phnom Penh', tags: '机电,设备,发电机,安装', rating: 4.6, price_info: '询价', contact: 'tel:016-xxx', desc_zh: '发电机与机电安装，含售后。' },
  { kind: 'supplychain', name_zh: '金边办公耗材供应', name_en: 'Phnom Penh Office Supply', name_km: 'ផ្គត់ផ្គង់ការិយាល័យភ្នំពេញ', city: 'Phnom Penh', tags: '办公,耗材,IT,打印', rating: 4.4, price_info: '询价', contact: 'tel:017-xxx', desc_zh: '办公IT耗材一站采购。' },
  { kind: 'supplychain', name_zh: '中柬食品进口', name_en: 'Sino-KH Food Import', name_km: 'នាំចូលអាហារចិន-ខ្មែរ', city: 'Phnom Penh', tags: '食品,进口,粮油,团餐', rating: 4.5, price_info: '询价', contact: 'tel:018-xxx', desc_zh: '中资食堂粮油团餐供应。' },
  // ---- 物业（中鼎物业）----
  { kind: 'property', name_zh: '中鼎物业·抄表巡检', name_en: 'ZD Property · Meter & Inspection', name_km: 'អចលនទ្រព្យចុងឌីង·អេឡិចត្រិក', city: 'Phnom Penh', tags: '抄表,巡检,水电,工单', rating: 4.9, price_info: '按单', contact: 'tel:019-xxx', desc_zh: '水电抄表、设备巡检、报修工单。' },
  { kind: 'property', name_zh: '中鼎物业·工程维修', name_en: 'ZD Property · Maintenance', name_km: 'អចលនទ្រព្យចុងឌីង·ជួសជុល', city: 'Phnom Penh', tags: '维修,空调,水电,工单', rating: 4.8, price_info: '按单', contact: 'tel:020-xxx', desc_zh: '空调水电维修，驻场响应。' },
  { kind: 'property', name_zh: '中鼎物业·保洁安保', name_en: 'ZD Property · Cleaning & Security', name_km: 'អចលនទ្រព្យចុងឌីង·សម្អាតសន្តិសុខ', city: 'Sihanoukville', tags: '保洁,安保,园区,工单', rating: 4.7, price_info: '按月', contact: 'tel:021-xxx', desc_zh: '园区保洁与安保派驻。' }
];

const KIND_MAP = {
  accommodation: 'accommodation',
  enterprise: 'supplychain',
  supplychain: 'supplychain',
  property: 'property'
};

const TYPE_LABEL = {
  'zh-CN': { accommodation: '住宿', enterprise: '企业需求', supplychain: '供应链', property: '物业管理' },
  'en': { accommodation: 'Accommodation', enterprise: 'Enterprise', supplychain: 'Supply Chain', property: 'Property' },
  'km': { accommodation: 'ស្នាក់នៅ', enterprise: 'សហគ្រាស', supplychain: 'ផ្គត់ផ្គង់', property: 'អចលនទ្រព្យ' }
};

const SYSTEM_PROMPTS = {
  'zh-CN': '你是 KHMER AI 助手，服务于在柬埔寨的中资企业与出海商务人群。你能理解用户的住宿、企业需求、供应链采购、物业管理等诉求，并帮其生成需求单，在微信小程序内完成闭环。请使用简体中文，简洁专业。',
  'en': 'You are KHMER AI assistant for Chinese-invested enterprises and business travelers in Cambodia. You help with accommodation, enterprise needs, supply chain procurement, and property management, and can create requirement orders that close the loop inside the mini-program. Reply concisely in English.',
  'km': 'អ្នកគឺជាជំនួយការ KHMER AI សម្រាប់សហគ្រាសចិន និងអ្នកធ្វើដំណើរអាជីវកម្មនៅកម្ពុជា។ សូមឆ្លើយក្នុងភាសាខ្មែរដោយសាមញ្ញ។'
};

const FALLBACK_REPLY = {
  'zh-CN': (label) => `已识别您的需求类型：【${label}】。我已为您匹配到合适的服务方，可在下方一键生成需求单，进入小程序内闭环（待处理→匹配中→已接单→处理中→已完成→已评价）。`,
  'en': (label) => `Detected need type: [${label}]. I matched suitable providers below. Tap to create a requirement order and close the loop inside the mini-program.`,
  'km': (label) => `បានរកឃើញប្រភេទ៖ [${label}]។ ខ្ញុំបានផ្គូរអ្នកផ្តល់សេវាហើយ។ សូមបង្កើតសំណើតាមដានក្នុងកម្មវិធី។`
};

const GREETING = {
  'zh-CN': '您好，我是 KHMER AI 助手。请描述您的诉求，例如："我们需要在西港租一套团队公寓" 或 "工厂要采购一批钢材"，我会帮您匹配并生成需求单。',
  'en': "Hi, I'm KHMER AI assistant. Describe your need, e.g. \"need a team apartment in Sihanoukville\" or \"procure steel for the factory\" — I'll match and create a requirement order.",
  'km': 'សួស្តី ខ្ញុំជាជំនួយការ KHMER AI។ សូមពិពណ៌នាអំពីតម្រូវការរបស់អ្នក ខ្ញុំនឹងជួយផ្គូរ និងបង្កើតសំណើ។'
};

// ============ 工具 ============
function localizeName(p, lang) {
  if (lang === 'en') return p.name_en;
  if (lang === 'km') return p.name_km;
  return p.name_zh;
}
function detectIntent(text = '', lang) {
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
function genOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KHMER-${ymd}-${rand}`;
}

// ============ 种子 ============
async function ensureSeed() {
  try {
    const c = await db.collection(COL_PROVIDERS).count();
    if (c.total === 0) {
      for (const p of PROVIDERS) {
        await db.collection(COL_PROVIDERS).add({ data: p });
      }
    }
  } catch (e) {
    console.warn('ensureSeed skip:', e.message);
  }
}

// ============ 匹配 ============
async function match(type, query = '', lang = 'zh-CN', limit = 5) {
  const kind = KIND_MAP[type] || 'supplychain';
  const res = await db.collection(COL_PROVIDERS).where({ kind }).get();
  const rows = res.data || [];
  const q = (query || '').toLowerCase();
  const scored = rows.map(p => {
    let score = p.rating || 0;
    const hay = ((p.tags || '') + ' ' + (p.desc_zh || '') + ' ' + (p.city || '')).toLowerCase();
    (p.tags || '').split(',').forEach(t => {
      const tt = t.trim().toLowerCase();
      if (tt && q && hay.includes(tt)) score += 2;
    });
    if (q && hay.includes(q)) score += 1;
    return { id: p._id, kind: p.kind, name: localizeName(p, lang), city: p.city, tags: p.tags, rating: p.rating, price_info: p.price_info, contact: p.contact, desc: localizeName(p, lang) === p.name_zh ? p.desc_zh : p.desc_zh, matchScore: score };
  });
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

// ============ AI ============
async function callLLM(messages, lang) {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS['zh-CN'] }, ...messages],
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

async function aiChat({ messages = [], lang = 'zh-CN' }) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const langKey = ['zh-CN', 'en', 'km'].includes(lang) ? lang : 'zh-CN';

  const llmReply = await callLLM(messages, langKey);
  if (llmReply) return { reply: llmReply };

  if (!lastUser.trim()) return { reply: GREETING[langKey] };
  const type = detectIntent(lastUser, langKey);
  if (!type) return { reply: GREETING[langKey] };
  const candidates = await match(type, lastUser, langKey, 3);
  const label = (TYPE_LABEL[langKey] || TYPE_LABEL['zh-CN'])[type];
  const suggestedRequirement = { type, title: lastUser.slice(0, 40), detail: lastUser };
  return { reply: FALLBACK_REPLY[langKey](label), suggestedRequirement, candidates };
}

// ============ 需求单闭环 ============
async function createRequirement({ type, title, detail, contact, openid }) {
  const now = Date.now();
  const row = {
    order_no: genOrderNo(),
    type, title, detail: detail || '', contact: contact || '',
    status: 'pending',
    openid,
    matched_ids: [],
    status_history: [{ status: 'pending', note: '创建需求单', at: now }],
    created_at: now,
    updated_at: now
  };
  const res = await db.collection(COL_REQ).add({ data: row });
  return { ...row, _id: res._id };
}

async function listRequirements({ openid, status, type, lang = 'zh-CN' }) {
  const cond = { openid };
  if (status) cond.status = status;
  if (type) cond.type = type;
  const res = await db.collection(COL_REQ).where(cond).orderBy('created_at', 'desc').get();
  return (res.data || []).map(r => ({ ...r, statusLabel: STATUS_LABELS[lang] ? STATUS_LABELS[lang][r.status] : r.status }));
}

async function getRequirement(id, openid) {
  const res = await db.collection(COL_REQ).doc(id).get();
  const r = res.data;
  if (!r || r.openid !== openid) return null;
  return r;
}

async function advanceRequirement(id, openid, { status, note, matchedIds }) {
  const r = await getRequirement(id, openid);
  if (!r) return null;
  const patch = { status, updated_at: Date.now() };
  if (matchedIds) patch.matched_ids = matchedIds;
  patch.status_history = _.push({ status, note: note || '', at: Date.now() });
  await db.collection(COL_REQ).doc(id).update({ data: patch });
  const updated = await getRequirement(id, openid);
  return updated;
}

async function rateRequirement(id, openid, { rating, comment }) {
  const patch = { rating, comment: comment || '', updated_at: Date.now() };
  patch.status_history = _.push({ status: 'rated', note: '用户评价', at: Date.now() });
  patch.status = 'rated';
  await db.collection(COL_REQ).doc(id).update({ data: patch });
  return getRequirement(id, openid);
}

const STATUS_LABELS = {
  'zh-CN': { pending: '待处理', matching: '匹配中', accepted: '已接单', processing: '处理中', completed: '已完成', rated: '已评价' },
  'en': { pending: 'Pending', matching: 'Matching', accepted: 'Accepted', processing: 'Processing', completed: 'Completed', rated: 'Rated' },
  'km': { pending: 'រង់ចាំ', matching: 'កំពុងផ្គូរ', accepted: 'accepted', processing: 'កំពុងដំណើរការ', completed: 'រួចរាល់', rated: 'បានវាយតម្លៃ' }
};

// ============ 入口 ============
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID || 'dev-openid';
  const action = (event.action || '').toLowerCase();
  const payload = event.payload || {};

  try {
    await ensureSeed();

    switch (action) {
      case 'ai.chat':
        return ok(await aiChat({ messages: payload.messages, lang: payload.lang, openid }));
      case 'match':
        return ok(await match(payload.type, payload.query, payload.lang, payload.limit || 5));
      case 'requirement.create':
        if (!payload.type || !payload.title) return fail('缺少 type/title');
        return ok(await createRequirement({ ...payload, openid }));
      case 'requirement.list':
        return ok(await listRequirements({ openid, status: payload.status, type: payload.type, lang: payload.lang }));
      case 'requirement.get':
        return ok(await getRequirement(payload.id, openid));
      case 'requirement.advance':
        return ok(await advanceRequirement(payload.id, openid, payload));
      case 'requirement.rate':
        return ok(await rateRequirement(payload.id, openid, payload));
      default:
        return fail('未知 action: ' + action);
    }
  } catch (e) {
    return fail(e.message || 'server error');
  }
};

function ok(data) { return { code: 0, data }; }
function fail(message) { return { code: 1, message }; }
