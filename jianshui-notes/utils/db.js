/**
 * 柬税笔记 - 云开发数据库服务
 *
 * 设计原则：云数据库优先，本地静态数据兜底。
 * - 已开通云开发并正确配置 env、集合与权限后，页面读取云端数据（可在云后台实时管理）。
 * - 未开通 / env 未配置 / 读取失败时，自动回退到 utils/data.js 的静态数据，保证小程序始终可用。
 *
 * 集合名称（需与云后台导入的种子数据一致）：
 *   tax_law     -> 柬埔寨税法
 *   travel_spot -> 柬埔寨旅游景点
 *   specialty   -> 柬埔寨特产
 *   qa          -> 柬埔寨问答知识库
 */

import {
  taxLaws as taxLawsStatic,
  travelSpots as travelSpotsStatic,
  specialties as specialtiesStatic,
  chatKnowledge as chatKnowledgeStatic
} from './data'

// 云数据库集合名称
const COLLECTIONS = {
  taxLaw: 'tax_law',
  travelSpot: 'travel_spot',
  specialty: 'specialty',
  qa: 'qa'
}

// 判断云能力是否可用：只有 app.js 中 wx.cloud.init 成功后才为 true
function cloudReady() {
  return globalThis.__cloudInited === true
}

/**
 * 通用读取：按 id 升序，最多 100 条。
 * 任何异常都回退到静态数据，不影响页面渲染。
 */
async function fetchList(collection, fallback) {
  if (!cloudReady()) return fallback
  try {
    const res = await wx.cloud
      .database()
      .collection(collection)
      .orderBy('id', 'asc')
      .limit(100)
      .get()
    if (res && res.data && res.data.length) return res.data
    return fallback
  } catch (err) {
    console.warn(`[db] 读取集合 ${collection} 失败，已回退本地数据：`, err)
    return fallback
  }
}

// ==================== 对外数据接口 ====================

export async function getTaxLaws() {
  return fetchList(COLLECTIONS.taxLaw, taxLawsStatic)
}

export async function getTravelSpots() {
  return fetchList(COLLECTIONS.travelSpot, travelSpotsStatic)
}

export async function getSpecialties() {
  return fetchList(COLLECTIONS.specialty, specialtiesStatic)
}

export async function getChatKnowledge() {
  return fetchList(COLLECTIONS.qa, chatKnowledgeStatic)
}
