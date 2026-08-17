// 从 utils/data.js 生成云数据库种子数据（JSON 数组格式，供云控制台导入）
// 用法：node build-seed.mjs
import {
  taxLaws,
  travelSpots,
  specialties,
  chatKnowledge
} from './utils/data.js'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('db', { recursive: true })

const files = {
  'db/tax_law.json': taxLaws,
  'db/travel_spot.json': travelSpots,
  'db/specialty.json': specialties,
  'db/qa.json': chatKnowledge
}

for (const [file, data] of Object.entries(files)) {
  // 云数据库导入要求每个文档为独立 JSON 对象，且不能带 _id（由云端生成）
  const cleaned = data.map(({ _id, _openid, ...rest }) => rest)
  writeFileSync(file, JSON.stringify(cleaned, null, 2), 'utf-8')
  console.log(`✓ 已生成 ${file}（${cleaned.length} 条）`)
}
console.log('全部种子数据生成完成。')
