/**
 * db.js - 零依赖数据层（JSON 文件持久化）
 * 供应商目录常驻内存；需求单落地 data/requirements.json（原子写）
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const REQ_FILE = path.join(DATA_DIR, 'requirements.json');

let requirements = [];
try {
  requirements = JSON.parse(fs.readFileSync(REQ_FILE, 'utf8') || '[]');
} catch (e) {
  requirements = [];
}

function save() {
  fs.writeFileSync(REQ_FILE, JSON.stringify(requirements, null, 2));
}

// ============ 供应商/服务目录（用于匹配）============
const SEED_PROVIDERS = [
  // ---- 住宿 ----
  { id: 1, kind: 'accommodation', name_zh: '金边中鼎国际酒店', name_en: 'Phnom Penh Zhongding Intl Hotel', name_km: 'សណ្ឋាគារអន្តរជាតិចុងឌីងភ្នំពេញ', city: 'Phnom Penh', tags: '酒店,商务,长住,中资', rating: 4.8, price_info: 'USD 45/晚起', contact: 'tel:012-xxx', desc_zh: '中资企业定点长住酒店，含发票与商务中心。' },
  { id: 2, kind: 'accommodation', name_zh: '西港海景公寓', name_en: 'Sihanoukville Seaview Apartment', name_km: 'អាផែរទិដ្ឋភាពសមុទ្រសីហនុ', city: 'Sihanoukville', tags: '公寓,长住,海景,团队', rating: 4.5, price_info: 'USD 380/月', contact: 'tel:013-xxx', desc_zh: '适合工程团队月租，近港区。' },
  { id: 3, kind: 'accommodation', name_zh: '暹粒商务宾馆', name_en: 'Siem Reap Business Inn', name_km: 'សណ្ឋាគារអាជីវកម្មសៀមរាប', city: 'Siem Reap', tags: '酒店,商务,旅游', rating: 4.6, price_info: 'USD 32/晚起', contact: 'tel:014-xxx', desc_zh: '近景区，商务出行优选。' },
  // ---- 供应链 ----
  { id: 11, kind: 'supplychain', name_zh: '中华建材柬埔寨仓', name_en: 'Zhonghua Building Materials KH', name_km: 'សម្ភារៈសំណង់ចុងហួរ', city: 'Phnom Penh', tags: '建材,钢材,水泥,批发', rating: 4.7, price_info: '询价', contact: 'tel:015-xxx', desc_zh: '钢材水泥批发，支持项目集采。' },
  { id: 12, kind: 'supplychain', name_zh: '泛亚机电设备', name_en: 'Pan-Asia M&E Equipment', name_km: 'ឧបករណ៍អគ្គិសនីប៉ានអាស៊ី', city: 'Phnom Penh', tags: '机电,设备,发电机,安装', rating: 4.6, price_info: '询价', contact: 'tel:016-xxx', desc_zh: '发电机与机电安装，含售后。' },
  { id: 13, kind: 'supplychain', name_zh: '金边办公耗材供应', name_en: 'Phnom Penh Office Supply', name_km: 'ផ្គត់ផ្គង់ការិយាល័យភ្នំពេញ', city: 'Phnom Penh', tags: '办公,耗材,IT,打印', rating: 4.4, price_info: '询价', contact: 'tel:017-xxx', desc_zh: '办公IT耗材一站采购。' },
  { id: 14, kind: 'supplychain', name_zh: '中柬食品进口', name_en: 'Sino-KH Food Import', name_km: 'នាំចូលអាហារចិន-ខ្មែរ', city: 'Phnom Penh', tags: '食品,进口,粮油,团餐', rating: 4.5, price_info: '询价', contact: 'tel:018-xxx', desc_zh: '中资食堂粮油团餐供应。' },
  // ---- 物业（中鼎物业）----
  { id: 21, kind: 'property', name_zh: '中鼎物业·抄表巡检', name_en: 'ZD Property · Meter & Inspection', name_km: 'អចលនទ្រព្យចុងឌីង·អេឡិចត្រិក', city: 'Phnom Penh', tags: '抄表,巡检,水电,工单', rating: 4.9, price_info: '按单', contact: 'tel:019-xxx', desc_zh: '水电抄表、设备巡检、报修工单。' },
  { id: 22, kind: 'property', name_zh: '中鼎物业·工程维修', name_en: 'ZD Property · Maintenance', name_km: 'អចលនទ្រព្យចុងឌីង·ជួសជុល', city: 'Phnom Penh', tags: '维修,空调,水电,工单', rating: 4.8, price_info: '按单', contact: 'tel:020-xxx', desc_zh: '空调水电维修，驻场响应。' },
  { id: 23, kind: 'property', name_zh: '中鼎物业·保洁安保', name_en: 'ZD Property · Cleaning & Security', name_km: 'អចលនទ្រព្យចុងឌីង·សម្អាតសន្តិសុខ', city: 'Sihanoukville', tags: '保洁,安保,园区,工单', rating: 4.7, price_info: '按月', contact: 'tel:021-xxx', desc_zh: '园区保洁与安保派驻。' }
];

// 供应商持久化（支持入驻）
const PROV_FILE = path.join(DATA_DIR, 'providers.json');
let providers = null;
function loadProviders() {
  if (providers) return providers;
  try { providers = JSON.parse(fs.readFileSync(PROV_FILE, 'utf8') || 'null'); } catch (e) { providers = null; }
  if (!Array.isArray(providers) || !providers.length) {
    providers = SEED_PROVIDERS.map(p => ({ ...p }));
    saveProviders();
  }
  return providers;
}
function saveProviders() { fs.writeFileSync(PROV_FILE, JSON.stringify(providers, null, 2)); }
function listProviders() { return loadProviders(); }
function getProvider(id) { return loadProviders().find(p => p.id === Number(id)); }
function insertProvider(p) {
  const arr = loadProviders();
  const id = arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  const row = { id, created_at: Date.now(), ...p };
  arr.push(row); saveProviders(); return row;
}
// 需求 type -> 供应商 kind 映射
const TYPE_TO_KIND = { accommodation: 'accommodation', enterprise: 'accommodation', logistics: 'supplychain', supplychain: 'supplychain', property: 'property', visa: 'accommodation' };
// 需求 type -> 闭环模块（PDF 四大模块：酒店服务 / 维修报修 / 前台咨询）
const TYPE_TO_MODULE = { accommodation: 'hotel', supplychain: 'hotel', property: 'repair', enterprise: 'frontdesk', frontdesk: 'frontdesk' };
// 各模块 SLA（分钟）：酒店/维修 30 分钟未接单预警；前台咨询 24 小时内反馈
const MODULE_SLA = { hotel: 30, repair: 30, frontdesk: 24 * 60 };
// 状态流转中（未闭环）才计入超时
const OPEN_STATUSES = ['pending', 'matching', 'accepted', 'processing', 'returned'];
function matchProviders(type, lang) {
  const kind = TYPE_TO_KIND[type] || type;
  const arr = loadProviders();
  const scored = arr.map(p => {
    let score = 0;
    if (p.kind === kind) score += 3;
    const tags = (p.tags || '').split(/[,，]/).map(t => t.trim());
    if (tags.includes(kind)) score += 2;
    return { p, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const suffix = lang === 'en' ? 'en' : lang === 'km' ? 'km' : 'zh';
  return scored.slice(0, 6).map(x => ({
    id: x.p.id,
    name: localizeName(x.p, lang),
    kind: x.p.kind,
    city: x.p.city,
    tags: x.p.tags,
    rating: x.p.rating,
    price_info: x.p.price_info,
    contact: x.p.contact,
    desc: x.p['desc_' + suffix] || ''
  }));
}

// 名称本地化（接口按语言返回供应商名）
function localizeName(p, lang) {
  if (lang === 'en') return p.name_en;
  if (lang === 'km') return p.name_km;
  return p.name_zh;
}

// 供应商对外序列化（B3/B4：tags 转数组、rating 给默认值、按语言返回 desc）
function serializeProvider(p, lang) {
  const suffix = lang === 'en' ? 'en' : lang === 'km' ? 'km' : 'zh';
  const tags = (p.tags || '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
  return {
    id: p.id,
    name: localizeName(p, lang),
    kind: p.kind,
    city: p.city || '',
    tags,                                   // 数组，解决标签逐字符渲染
    rating: typeof p.rating === 'number' ? p.rating : 0,   // 解决新入驻 rating=undefined
    price_info: p.price_info || '',
    contact: p.contact || '',
    desc: p['desc_' + suffix] || ''         // 解决描述空白
  };
}

// ============ 需求单操作 ============
function genOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KHMER-${ymd}-${rand}`;
}

function insertRequirement({ type, title, detail, contact, openid, module, room_no, expected_time, priority }) {
  const now = Date.now();
  // B1：提交即自动匹配供应商，写入 matched_ids，打通"提交→匹配→查看"闭环
  const matched_ids = matchProviders(type).map(x => x.id);
  // 闭环模块归属 + SLA 截止时间（用于超时预警）
  const mod = module || TYPE_TO_MODULE[type] || 'hotel';
  const slaMinutes = MODULE_SLA[mod] || 30;
  const row = {
    id: requirements.length ? Math.max(...requirements.map(r => r.id)) + 1 : 1,
    order_no: genOrderNo(),
    type, title, detail: detail || '', contact: contact || '',
    status: 'pending',
    module: mod,
    room_no: room_no || '',
    expected_time: expected_time || '',
    priority: priority || 'normal',
    assigned_to: '',
    return_count: 0,
    sla_deadline: now + slaMinutes * 60000,
    sla_alerted: false,
    openid,
    matched_ids,
    quote: '',
    remark: '',
    status_history: [{ status: 'pending', note: '创建需求单', at: now }],
    created_at: now,
    updated_at: now
  };
  requirements.push(row);
  save();
  return row;
}

function listRequirements({ openid, status, type, module }) {
  return requirements.filter(r =>
    r.openid === openid &&
    (!status || r.status === status) &&
    (!type || r.type === type) &&
    (!module || r.module === module)
  ).sort((a, b) => b.created_at - a.created_at);
}

// 超时扫描：标记已超期且尚未预警的工单（供定时任务统一预警）
function scanOverdue() {
  const now = Date.now();
  let count = 0;
  for (const r of requirements) {
    if (r.sla_alerted) continue;
    if (OPEN_STATUSES.includes(r.status) && r.sla_deadline && now > r.sla_deadline) {
      r.sla_alerted = true;
      r.updated_at = now;
      count++;
    }
  }
  if (count) save();
  return count;
}

function getRequirement(id, openid) {
  return requirements.find(r => r.id === Number(id) && r.openid === openid);
}

function updateRequirement(id, openid, patch) {
  const row = getRequirement(id, openid);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: Date.now() });
  save();
  return row;
}

// ============ 后台管理（不限 openid）============
function listAllRequirements() {
  return requirements.slice().sort((a, b) => b.created_at - a.created_at);
}
function getRequirementAdmin(id) {
  return requirements.find(r => r.id === Number(id));
}
function updateRequirementAdmin(id, patch) {
  const row = getRequirementAdmin(id);
  if (!row) return null;
  Object.assign(row, patch, { updated_at: Date.now() });
  save();
  return row;
}

// ============ 物业工作台状态（公司级共享一份，云端持久化）============
const PROP_FILE = path.join(DATA_DIR, 'property.json');
let propertyState = null;

function loadProperty() {
  if (propertyState) return propertyState;
  try {
    propertyState = JSON.parse(fs.readFileSync(PROP_FILE, 'utf8') || 'null');
  } catch (e) {
    propertyState = null;
  }
  return propertyState;
}

function getPropertyState() {
  return loadProperty();
}

function savePropertyState(state) {
  propertyState = state || {};
  fs.writeFileSync(PROP_FILE, JSON.stringify(propertyState, null, 2));
  return propertyState;
}

// ============ 多语言 FAQ（智能客服，规则匹配，非 AI）============
const FAQS = [
  { id: 1, keywords: ['入住', 'checkin', 'check-in', 'ចូលស្នាក់នៅ'], q_zh: '几点可以入住？', a_zh: '标准入住时间 14:00，退房 12:00。企业团队长住可与前台协商灵活时间。', q_en: 'What time is check-in?', a_en: 'Standard check-in 14:00, check-out 12:00. Long-stay corporate teams can negotiate flexible times with the front desk.', q_km: 'ពេលណាអាចចូលស្នាក់នៅ?', a_km: 'ពេលចូលស្នាក់នៅស្តង់ដារ ១៤:០០ និងចេញ ១២:០០។ ក្រុមសហគ្រាសអាចពិភាក្សាពេលវេលាជាមួយផ្ទះសណ្ឋាគារ។' },
  { id: 2, keywords: ['物流', '仓储', '行李', '设备', '配送', 'logistics', 'storage', 'luggage', 'delivery', 'ឡូជីស្ទីក', 'ឃ្លាំង'], q_zh: '设备/行李怎么暂存和配送？', a_zh: '可在入住时把设备、行李交由酒店后勤统一暂存，填写需求单选择"物流仓储"，我们会安排仓储与配送到工地/办公室。', q_en: 'How to store and deliver equipment/luggage?', a_en: 'Hand equipment/luggage to hotel logistics for unified storage on check-in. Submit a "Logistics" request and we arrange warehousing and delivery to site/office.', q_km: 'រក្សាទុកនិងដឹកជញ្ជូនសម្ភារៈ/ឥវ៉ាន់យ៉ាងដូចម្តេច?', a_km: 'ប្រគល់សម្ភារៈ/ឥវ៉ាន់ឱ្យឡូជីស្ទីកសណ្ឋាគាររក្សាទុកពេលចូលស្នាក់នៅ។ ដាក់សំណើ "ឡូជីស្ទីក" ហើយយើងរៀបចំឃ្លាំងនិងដឹកជញ្ជូនទៅការដ្ឋាន/ការិយាល័យ។' },
  { id: 3, keywords: ['物业', '报修', '维修', '水电', 'property', 'repair', 'maintenance', 'អចលនទ្រព្យ', 'ជួសជុល'], q_zh: '房间设施坏了怎么报修？', a_zh: '在「中鼎物业工作台」提交工单，选择报修类型，工程维修团队会驻场响应。', q_en: 'How to report a broken facility?', a_en: 'Submit a ticket in "ZD Property Console", choose repair type; the maintenance team responds on-site.', q_km: 'រាយការណ៍កន្លែងខូចយ៉ាងដូចម្តេច?', a_km: 'ដាក់ពាក្យក្នុង "ផ្ទាំងគ្រប់គ្រងអចលនទ្រព្យ" ជ្រើសប្រភេទជួសជុល ក្រុមជួសជុលឆ្លើយតបនៅកន្លែង។' },
  { id: 4, keywords: ['发票', '开票', 'invoice', 'វិក័យបត្រ'], q_zh: '可以开发票吗？', a_zh: '酒店住宿与物业服务可开具发票，请在需求单备注开票信息，或联系前台。', q_en: 'Can I get an invoice?', a_en: 'Hotel stay and property services can issue invoices. Note billing info in the request or contact the front desk.', q_km: 'អាចទទួលវិក័យបត្របានទេ?', a_km: 'សណ្ឋាគារនិងសេវាអចលនទ្រព្យអាចចេញវិក័យបត្របាន។ សរសេរព័ត៌មានវិក័យបត្រក្នុងសំណើ ឬទំនាក់ទំនងផ្ទះសណ្ឋាគារ។' },
  { id: 5, keywords: ['长住', '月租', '团队', 'long', 'monthly', 'team', 'ស្នាក់នៅយូរ', 'ជួលប្រចាំខែ', 'ក្រុម'], q_zh: '企业团队可以长住吗？', a_zh: '支持企业团队长住与月租公寓，金边/西港/暹粒均有合作房源，可走企业协议价。', q_en: 'Can corporate teams stay long-term?', a_en: 'Yes. Long-stay and monthly apartments supported; partnered rooms in Phnom Penh/Sihanoukville/Siem Reap with corporate rates.', q_km: 'ក្រុមសហគ្រាសអាចស្នាក់នៅយូរបានទេ?', a_km: 'បាទ/ចាស។ គាំទ្រស្នាក់នៅយូរនិងជួលអាផែរប្រចាំខែ មានបន្ទប់ដៃគូនៅភ្នំពេញ/សីហនុ/សៀមរាបក្នុងតម្លៃសហគ្រាស។' }
];
function matchFaq(query, lang) {
  if (!query) return null;
  const q = String(query).toLowerCase();
  let best = null, bestScore = 0;
  for (const f of FAQS) {
    let score = 0;
    for (const kw of (f.keywords || [])) {
      if (q.includes(String(kw).toLowerCase())) score += 2;
    }
    if (score > bestScore) { bestScore = score; best = f; }
  }
  if (!best || bestScore === 0) return null;
  const suffix = lang === 'en' ? 'en' : lang === 'km' ? 'km' : 'zh';
  return { id: best.id, question: best['q_' + suffix], answer: best['a_' + suffix] };
}

// ============ 房态管理（住宿闭环核心：订房→收款→入住→退房）============
const ROOM_FILE = path.join(DATA_DIR, 'room_stays.json');
let roomStays = [];
try {
  roomStays = JSON.parse(fs.readFileSync(ROOM_FILE, 'utf8') || '[]');
} catch (e) {
  roomStays = [];
}
function saveRoomStays() {
  fs.writeFileSync(ROOM_FILE, JSON.stringify(roomStays, null, 2));
}

function insertRoomStay({ requirement_id, room_no, openid, guest_name, guest_contact, payment }) {
  const now = Date.now();
  const row = {
    id: roomStays.length ? Math.max(...roomStays.map(r => r.id)) + 1 : 1,
    room_no: room_no || '',
    requirement_id: requirement_id || null,
    openid: openid || '',
    guest_name: guest_name || '',
    guest_contact: guest_contact || '',
    status: 'reserved',                 // reserved → checked_in → checked_out
    check_in_at: 0,
    check_out_at: 0,
    payment: payment && typeof payment === 'object'
      ? { amount: payment.amount || '', paid: payment.paid || '', method: payment.method || '', paid_at: payment.paid_at || 0, received_by: payment.received_by || '' }
      : { amount: '', paid: '', method: '', paid_at: 0, received_by: '' },
    created_at: now,
    updated_at: now
  };
  roomStays.push(row);
  saveRoomStays();
  return row;
}

function listRoomStays({ status, room_no, openid } = {}) {
  return roomStays.filter(r =>
    (!status || r.status === status) &&
    (!room_no || r.room_no === room_no) &&
    (!openid || r.openid === openid)
  ).sort((a, b) => b.updated_at - a.updated_at);
}

function getRoomStay(id) {
  return roomStays.find(r => r.id === Number(id));
}
// 通过订房需求单查房态（客人端展示用）
function getRoomStayByRequirement(requirement_id) {
  if (!requirement_id) return null;
  return roomStays.find(r => r.requirement_id === Number(requirement_id)) || null;
}
// 通过房号查历史房态（维修单按房号引用展示）
function getRoomStayByRoom(room_no) {
  if (!room_no) return [];
  return roomStays.filter(r => r.room_no === room_no).sort((a, b) => b.updated_at - a.updated_at);
}

function updateRoomStay(id, patch) {
  const row = getRoomStay(id);
  if (!row) return null;
  // 状态流转自动补时间戳：办理入住 / 退房
  if (patch.status === 'checked_in' && !patch.check_in_at) patch.check_in_at = Date.now();
  if (patch.status === 'checked_out' && !patch.check_out_at) patch.check_out_at = Date.now();
  Object.assign(row, patch, { updated_at: Date.now() });
  saveRoomStays();
  return row;
}

module.exports = { listProviders, getProvider, insertProvider, matchProviders, matchFaq, FAQS, localizeName, serializeProvider, insertRequirement, listRequirements, getRequirement, updateRequirement, listAllRequirements, getRequirementAdmin, updateRequirementAdmin, genOrderNo, getPropertyState, savePropertyState, scanOverdue, TYPE_TO_MODULE, MODULE_SLA, OPEN_STATUSES, insertRoomStay, listRoomStays, getRoomStay, getRoomStayByRequirement, getRoomStayByRoom, updateRoomStay };
