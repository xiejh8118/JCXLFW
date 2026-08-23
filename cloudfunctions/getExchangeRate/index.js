/**
 * getExchangeRate - 实时汇率获取
 * 
 * 数据源优先级:
 * 1. 外部API实时数据 (如 exchangerate-api.com)
 * 2. 数据库缓存 (< 1小时)
 * 3. 默认汇率
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 缓存有效期（秒）
const CACHE_TTL = 3600;  // 1小时

// 默认汇率���作为降级方案）
const DEFAULT_RATES = {
  USD_KHR: 4100,
  KHR_USD: 1 / 4100,
  CNY_KHR: 570,
  KHR_CNY: 1 / 570,
  USD_CNY: 7.20,
  CNY_USD: 1 / 7.20
};

exports.main = async (event, context) => {
  try {
    // 1. 先查缓存
    const cached = await getCachedRates();
    if (cached) {
      return {
        code: 0,
        data: {
          rates: cached.rates,
          updateTime: cached.updateTime,
          source: 'cache'
        }
      };
    }

    // 2. 调用外部 API
    const freshRates = await fetchExternalRates();
    if (freshRates) {
      // 更新缓存
      await saveCachedRates(freshRates);
      return {
        code: 0,
        data: {
          rates: freshRates,
          updateTime: new Date().toISOString(),
          source: 'api'
        }
      };
    }

    // 3. 降级到默认值
    return {
      code: 0,
      data: {
        rates: DEFAULT_RATES,
        updateTime: new Date().toISOString(),
        source: 'fallback'
      }
    };

  } catch (err) {
    console.error('getExchangeRate error:', err);
    return {
      code: 0,
      data: {
        rates: DEFAULT_RATES,
        updateTime: new Date().toISOString(),
        source: 'fallback_error'
      }
    };
  }
};

/**
 * 从缓存获取汇率
 */
async function getCachedRates() {
  try {
    const result = await db.collection('exchange_rates')
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      const cached = result.data[0];
      const age = (Date.now() - cached.updateTime.getTime()) / 1000;

      if (age < CACHE_TTL) {
        return {
          rates: cached.rates,
          updateTime: cached.updateTime
        };
      }
    }
    return null;
  } catch (err) {
    console.log('缓存读取失败:', err);
    return null;
  }
}

/**
 * 保存汇率到缓存
 */
async function saveCachedRates(rates) {
  try {
    await db.collection('exchange_rates').add({
      data: {
        rates,
        updateTime: db.serverDate()
      }
    });
  } catch (err) {
    console.log('缓存写入失败:', err);
  }
}

/**
 * 调用外部汇率 API
 * 
 * 推荐用以下免费/低成本 API:
 * - exchangerate-api.com (支持USD/KHR)
 * - openexchangerates.org
 * - 或柬埔寨国家银行(NBC)官方汇率
 */
async function fetchExternalRates() {
  try {
    const https = require('https');

    // 示例: 使用 exchangerate-api.com
    const usdKhr = await httpGet(`https://api.exchangerate-api.com/v4/latest/USD`);
    const usdData = JSON.parse(usdKhr);

    if (usdData && usdData.rates) {
      const khrRate = usdData.rates.KHR;
      const cnyRate = usdData.rates.CNY;

      return {
        USD_KHR: khrRate || DEFAULT_RATES.USD_KHR,
        KHR_USD: khrRate ? Math.round((1 / khrRate) * 1000000) / 1000000 : DEFAULT_RATES.KHR_USD,
        CNY_KHR: cnyRate ? Math.round(khrRate / cnyRate * 100) / 100 : DEFAULT_RATES.CNY_KHR,
        KHR_CNY: cnyRate ? Math.round((cnyRate / khrRate) * 1000000) / 1000000 : DEFAULT_RATES.KHR_CNY,
        USD_CNY: cnyRate || DEFAULT_RATES.USD_CNY,
        CNY_USD: cnyRate ? Math.round((1 / cnyRate) * 10000) / 10000 : DEFAULT_RATES.CNY_USD
      };
    }

    return null;
  } catch (err) {
    console.log('外部API调用失败:', err.message);
    return null;
  }
}

/**
 * HTTP GET 请求辅助
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = require('https').get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}
