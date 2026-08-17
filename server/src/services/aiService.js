/**
 * aiService.js - AI 助手（微信AI生态 / 大模型，可降级）
 * 默认 OpenAI 兼容网关；将 LLM_BASE_URL/KEY 切换为微信AI或元宝网关即"接入微信AI生态"。
 * 无密钥时规则降级：意图识别 + 匹配推荐，仍演示"自然语言 -> 需求单"闭环。
 */
const { match, detectIntent } = require('./matchService');

const SYSTEM_PROMPTS = {
  'zh-CN': '你是 KHMER AI 助手，服务于在柬埔寨的中资企业与出海商务人群。你能理解用户的住宿、企业需求、供应链采购、物业管理等诉求，并帮其生成需求单，在微信小程序内完成闭环。请使用简体中文，简洁专业。',
  'en': 'You are KHMER AI assistant for Chinese-invested enterprises and business travelers in Cambodia. You help with accommodation, enterprise needs, supply chain procurement, and property management, and can create requirement orders that close the loop inside the mini-program. Reply concisely in English.',
  'km': 'អ្នកគឺជាជំនួយការ KHMER AI សម្រាប់សហគ្រាសចិន និងអ្នកធ្វើដំណើរអាជីវកម្មនៅកម្ពុជា។ សូមឆ្លើយក្នុងភាសាខ្មែរដោយសាមញ្ញ។'
};

const FALLBACK_REPLY = {
  'zh-CN': (typeLabel) => `已识别您的需求类型：【${typeLabel}】。我已为您匹配到合适的服务方，可在下方一键生成需求单，进入小程序内闭环（待处理→匹配中→已接单→处理中→已完成→已评价）。`,
  'en': (typeLabel) => `Detected need type: [${typeLabel}]. I matched suitable providers below. Tap to create a requirement order and close the loop inside the mini-program.`,
  'km': (typeLabel) => `បានរកឃើញប្រភេទ៖ [${typeLabel}]។ ខ្ញុំបានផ្គូរអ្នកផ្តល់សេវាហើយ។ សូមបង្កើតសំណើតាមដានក្នុងកម្មវិធី។`
};

const TYPE_LABEL = {
  'zh-CN': { accommodation: '住宿', enterprise: '企业需求', supplychain: '供应链', property: '物业管理' },
  'en': { accommodation: 'Accommodation', enterprise: 'Enterprise', supplychain: 'Supply Chain', property: 'Property' },
  'km': { accommodation: 'ស្នាក់នៅ', enterprise: 'សហគ្រាស', supplychain: 'ផ្គត់ផ្គង់', property: 'អចលនទ្រព្យ' }
};

const GREETING = {
  'zh-CN': '您好，我是 KHMER AI 助手。请描述您的诉求，例如："我们需要在西港租一套团队公寓" 或 "工厂要采购一批钢材"，我会帮您匹配并生成需求单。',
  'en': "Hi, I'm KHMER AI assistant. Describe your need, e.g. \"need a team apartment in Sihanoukville\" or \"procure steel for the factory\" — I'll match and create a requirement order.",
  'km': 'សួស្តី ខ្ញុំជាជំនួយការ KHMER AI។ សូមពិពណ៌នាអំពីតម្រូវការរបស់អ្នក ខ្ញុំនឹងជួយផ្គូរ និងបង្កើតសំណើ។'
};

async function callLLM(messages, lang) {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  if (!base || !key) return null;
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
}

/**
 * @param {object} param0
 * @returns {Promise<{reply:string, suggestedRequirement?:object, candidates?:Array}>}
 */
async function chat({ messages = [], lang = 'zh-CN', openid }) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const langKey = ['zh-CN', 'en', 'km'].includes(lang) ? lang : 'zh-CN';

  // 1) 优先调用大模型（微信AI生态）
  const llmReply = await callLLM(messages, langKey);
  if (llmReply) {
    return { reply: llmReply };
  }

  // 2) 规则降级
  if (!lastUser.trim()) {
    return { reply: GREETING[langKey] };
  }
  const type = detectIntent(lastUser, langKey);
  if (!type) {
    return { reply: GREETING[langKey] };
  }
  const candidates = match(type, lastUser, langKey, 3);
  const label = (TYPE_LABEL[langKey] || TYPE_LABEL['zh-CN'])[type];
  const suggestedRequirement = {
    type,
    title: lastUser.slice(0, 40),
    detail: lastUser
  };
  return {
    reply: FALLBACK_REPLY[langKey](label),
    suggestedRequirement,
    candidates
  };
}

module.exports = { chat };
