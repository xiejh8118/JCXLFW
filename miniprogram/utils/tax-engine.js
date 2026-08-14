/**
 * tax-engine.js - 柬埔寨税规计算引擎
 * 
 * 柬埔寨主要税种:
 * - VAT (增值税): 标准税率 10%
 * - WHT (代扣税): 根据服务类型 4%/10%/14%/15%
 * - TOB (营业税): 根据行业 0-5%
 * - Salary Tax (薪资税): 累进税率 0-20%
 * - Minimum Tax: 年营业额 1%，独立于损益表
 */

const TAX_RULES = {
  // 增值税 (Value Added Tax)
  VAT: {
    standard: 0.10,      // 标准税率 10%
    export: 0.00,        // 出口 0%
    description: '增值税'
  },

  // 代扣税 (Withholding Tax) - 根据服务类型
  WHT: {
    RENTAL:          { rate: 0.10, name: '租金/租赁' },
    SERVICE:         { rate: 0.15, name: '服务费' },
    MANAGEMENT:      { rate: 0.15, name: '管理费' },
    CONSULTING:      { rate: 0.15, name: '咨询费' },
    ROYALTY:         { rate: 0.15, name: '特许权使用费' },
    INTEREST_DEPOSIT:{ rate: 0.04, name: '存款利息' },
    INTEREST_OTHER:  { rate: 0.14, name: '其他利息' },
    DIVIDEND:        { rate: 0.14, name: '股息' },
    INSURANCE:       { rate: 0.04, name: '保险' },
    TRANSPORT:       { rate: 0.15, name: '运输' },
    CONSTRUCTION:    { rate: 0.15, name: '建筑工程' },
    COMMISSION:      { rate: 0.15, name: '佣金/中介' },
    IT_TELECOM:      { rate: 0.15, name: 'IT/电信服务' }
  },

  // 薪资税累进表 (Salary Tax - Progressive Rates)
  SALARY_TAX_BRACKETS_KHR: [
    { max: 1500000,  rate: 0.00, deduct: 0 },
    { max: 2000000,  rate: 0.05, deduct: 75000 },
    { max: 8500000,  rate: 0.10, deduct: 175000 },
    { max: 12500000, rate: 0.15, deduct: 600000 },
    { max: Infinity, rate: 0.20, deduct: 1225000 }
  ],

  // 专利税 (Patent Tax / Annual Business Registration)
  PATENT: {
    SMALL:  { min: 0,        max: 250000000,  amount: 400000,  name: '小型纳税人' },
    MEDIUM: { min: 250000001, max: 1000000000, amount: 800000,  name: '中型纳税人' },
    LARGE:  { min: 1000000001, max: Infinity,  amount: 2000000, name: '大型纳税人' }
  }
};

/**
 * 计算增值税
 * @param {number} amount - 不含税金额
 * @param {string} type - 'standard' | 'export'
 * @returns {object} { beforeTax, taxRate, taxAmount, afterTax }
 */
function calcVAT(amount, type = 'standard') {
  const rate = TAX_RULES.VAT[type] || TAX_RULES.VAT.standard;
  const taxAmount = Math.round(amount * rate * 100) / 100;
  return {
    beforeTax: amount,
    taxRate: rate * 100,
    taxAmount: taxAmount,
    afterTax: amount + taxAmount
  };
}

/**
 * 从含税金额反推增值税
 * @param {number} amountIncl - 含税金额
 * @param {string} type - 'standard' | 'export'
 */
function calcVATReverse(amountIncl, type = 'standard') {
  const rate = TAX_RULES.VAT[type] || TAX_RULES.VAT.standard;
  const beforeTax = Math.round(amountIncl / (1 + rate) * 100) / 100;
  const taxAmount = Math.round((amountIncl - beforeTax) * 100) / 100;
  return {
    beforeTax,
    taxRate: rate * 100,
    taxAmount,
    afterTax: amountIncl
  };
}

/**
 * 计算代扣税
 * @param {number} amount - 支付金额
 * @param {string} category - WHT类别键名
 * @returns {object}
 */
function calcWHT(amount, category) {
  const rule = TAX_RULES.WHT[category];
  if (!rule) {
    throw new Error(`未知代扣税类别: ${category}`);
  }
  const taxAmount = Math.round(amount * rule.rate * 100) / 100;
  return {
    amount,
    category: rule.name,
    taxRate: rule.rate * 100,
    taxAmount,
    netAmount: amount - taxAmount
  };
}

/**
 * 获取所有代扣税类别
 */
function getWHTCategories() {
  return Object.entries(TAX_RULES.WHT).map(([key, val]) => ({
    key,
    name: val.name,
    rate: val.rate * 100
  }));
}

/**
 * 计算薪资税
 * @param {number} monthlySalaryKHR - 月薪(瑞尔)
 * @returns {object}
 */
function calcSalaryTax(monthlySalaryKHR) {
  const brackets = TAX_RULES.SALARY_TAX_BRACKETS_KHR;
  let tax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const prevMax = i === 0 ? 0 : brackets[i - 1].max;
    if (monthlySalaryKHR > prevMax) {
      const taxableInBracket = Math.min(monthlySalaryKHR, bracket.max) - prevMax;
      tax += taxableInBracket * bracket.rate;
    } else {
      break;
    }
  }

  // 月抵扣基数: 150,000 瑞尔
  const monthlyDeduction = 150000;
  const taxAfterDeduction = tax - monthlyDeduction;
  const finalTax = Math.max(0, Math.round(taxAfterDeduction));

  return {
    monthlySalary: monthlySalaryKHR,
    annualSalary: monthlySalaryKHR * 12,
    monthlyTax: finalTax,
    annualTax: finalTax * 12,
    effectiveRate: ((finalTax / monthlySalaryKHR) * 100).toFixed(2),
    deduction: monthlyDeduction
  };
}

/**
 * 计算专利税
 * @param {number} annualTurnoverKHR - 年营业额(瑞尔)
 */
function calcPatentTax(annualTurnoverKHR) {
  let tier;
  for (const key of ['SMALL', 'MEDIUM', 'LARGE']) {
    const t = TAX_RULES.PATENT[key];
    if (annualTurnoverKHR >= t.min && annualTurnoverKHR <= t.max) {
      tier = { ...t, key };
      break;
    }
  }
  return {
    annualTurnover: annualTurnoverKHR,
    tier: tier.name,
    taxAmount: tier.amount,
    currency: 'KHR'
  };
}

/**
 * 多币种税收计算（支持 USD/KHR/CNY 互转）
 */
function calcWithConversion(amount, fromCurrency, calcFn, exchangeRates) {
  // 所有内部计算统一用 KHR
  const amountInKHR = fromCurrency === 'KHR' ? amount :
    fromCurrency === 'USD' ? amount * exchangeRates.USD_KHR :
    amount * exchangeRates.CNY_KHR;

  const result = calcFn(amountInKHR);

  return {
    ...result,
    amounts: {
      KHR: result.taxAmount || result.monthlyTax || result.taxAmount,
      USD: convertFromKHR(result.taxAmount || result.monthlyTax, exchangeRates.USD_KHR),
      CNY: convertFromKHR(result.taxAmount || result.monthlyTax, exchangeRates.CNY_KHR)
    }
  };
}

function convertFromKHR(amountKHR, rate) {
  return Math.round((amountKHR / rate) * 100) / 100;
}

module.exports = {
  TAX_RULES,
  calcVAT,
  calcVATReverse,
  calcWHT,
  getWHTCategories,
  calcSalaryTax,
  calcPatentTax,
  calcWithConversion
};
