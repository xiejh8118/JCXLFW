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
const PROVIDERS = [
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

// 名称本地化（接口按语言返回供应商名）
function localizeName(p, lang) {
  if (lang === 'en') return p.name_en;
  if (lang === 'km') return p.name_km;
  return p.name_zh;
}

// ============ 需求单操作 ============
function genOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KHMER-${ymd}-${rand}`;
}

function insertRequirement({ type, title, detail, contact, openid }) {
  const now = Date.now();
  const row = {
    id: requirements.length ? Math.max(...requirements.map(r => r.id)) + 1 : 1,
    order_no: genOrderNo(),
    type, title, detail: detail || '', contact: contact || '',
    status: 'pending',
    openid,
    matched_ids: [],
    status_history: [{ status: 'pending', note: '创建需求单', at: now }],
    created_at: now,
    updated_at: now
  };
  requirements.push(row);
  save();
  return row;
}

function listRequirements({ openid, status, type }) {
  return requirements.filter(r =>
    r.openid === openid &&
    (!status || r.status === status) &&
    (!type || r.type === type)
  ).sort((a, b) => b.created_at - a.created_at);
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

module.exports = { PROVIDERS, localizeName, insertRequirement, listRequirements, getRequirement, updateRequirement, genOrderNo, getPropertyState, savePropertyState };
