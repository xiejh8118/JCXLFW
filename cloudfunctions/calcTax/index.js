/**
 * calcTax - 云端税务计算（保护敏感逻辑与最新税率数据）
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 柬埔寨税率配置（云端维护，确保实时更新）
const TAX_CONFIG = {
  VAT: {
    standard: 0.10,
    export: 0.00
  },
  WHT: {
    RENTAL:         { rate: 0.10, name: '租金/租赁' },
    SERVICE:        { rate: 0.15, name: '服务费' },
    MANAGEMENT:     { rate: 0.15, name: '管理费' },
    CONSULTING:     { rate: 0.15, name: '咨询费' },
    ROYALTY:        { rate: 0.15, name: '特许权使用费' },
    INTEREST_DEPOSIT:{ rate: 0.04, name: '存款利息' },
    INTEREST_OTHER: { rate: 0.14, name: '其他利息' },
    DIVIDEND:       { rate: 0.14, name: '股息' },
    INSURANCE:      { rate: 0.04, name: '保险' },
    TRANSPORT:      { rate: 0.15, name: '运输' },
    CONSTRUCTION:   { rate: 0.15, name: '建筑工程' },
    COMMISSION:     { rate: 0.15, name: '佣金/中介费' },
    IT_TELECOM:     { rate: 0.15, name: 'IT/电信服务' }
  },
  SALARY_TAX_BRACKETS: [
    { max: 1500000,  rate: 0.00, deduct: 0 },
    { max: 2000000,  rate: 0.05, deduct: 75000 },
    { max: 8500000,  rate: 0.10, deduct: 175000 },
    { max: 12500000, rate: 0.15, deduct: 600000 },
    { max: Infinity, rate: 0.20, deduct: 1225000 }
  ],
  // 每月抵扣基数
  SALARY_MONTHLY_DEDUCTION: 150000,
  // 子女抚养抵扣（每孩）
  CHILD_DEDUCTION: 150000
};

exports.main = async (event, context) => {
  const { type, amount, category, currency = 'KHR', children = 0 } = event;

  if (!type || amount === undefined) {
    return { code: -1, message: '缺少必要参数' };
  }

  try {
    let result;

    switch (type) {
      case 'vat':
        result = calcVAT(Number(amount), event.vatType || 'standard');
        break;
      case 'wht':
        result = calcWHT(Number(amount), category);
        break;
      case 'salary':
        result = calcSalaryTax(Number(amount), Number(children));
        break;
      case 'patent':
        result = calcPatentTax(Number(amount));
        break;
      default:
        return { code: -1, message: `未知计算类型: ${type}` };
    }

    // 记录计算日志（用于审计）
    await logTaxCalculation(type, amount, result);

    return {
      code: 0,
      data: result,
      configVersion: '2025.01'
    };

  } catch (err) {
    console.error('calcTax error:', err);
    return { code: -1, message: err.message || '计算失败' };
  }
};

function calcVAT(amount, type = 'standard') {
  const rate = TAX_CONFIG.VAT[type] || TAX_CONFIG.VAT.standard;
  const taxAmount = Math.round(amount * rate * 100) / 100;
  return {
    type: 'VAT',
    beforeTax: amount,
    taxRate: rate * 100,
    taxAmount,
    afterTax: amount + taxAmount
  };
}

function calcWHT(amount, category) {
  const rule = TAX_CONFIG.WHT[category];
  if (!rule) throw new Error(`未知代扣税类别: ${category}`);
  const taxAmount = Math.round(amount * rule.rate * 100) / 100;
  return {
    type: 'WHT',
    amount,
    category: rule.name,
    categoryKey: category,
    taxRate: rule.rate * 100,
    taxAmount,
    netAmount: amount - taxAmount
  };
}

function calcSalaryTax(monthlySalary, children = 0) {
  const brackets = TAX_CONFIG.SALARY_TAX_BRACKETS;
  let tax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const prevMax = i === 0 ? 0 : brackets[i - 1].max;
    if (monthlySalary > prevMax) {
      const taxableInBracket = Math.min(monthlySalary, bracket.max) - prevMax;
      tax += taxableInBracket * bracket.rate;
    }
  }

  // 抵扣：基础150,000 + 每孩150,000
  const totalDeduction = TAX_CONFIG.SALARY_MONTHLY_DEDUCTION + (children * TAX_CONFIG.CHILD_DEDUCTION);
  const finalTax = Math.max(0, Math.round(tax - totalDeduction));

  return {
    type: 'SALARY',
    monthlySalary,
    annualSalary: monthlySalary * 12,
    monthlyTax: finalTax,
    annualTax: finalTax * 12,
    effectiveRate: ((finalTax / monthlySalary) * 100).toFixed(2),
    deductions: {
      base: TAX_CONFIG.SALARY_MONTHLY_DEDUCTION,
      children: children * TAX_CONFIG.CHILD_DEDUCTION,
      total: totalDeduction
    }
  };
}

function calcPatentTax(annualTurnover) {
  let tier;
  if (annualTurnover <= 250000000) tier = { name: '小型纳税人', amount: 400000 };
  else if (annualTurnover <= 1000000000) tier = { name: '中型纳税人', amount: 800000 };
  else tier = { name: '大型纳税人', amount: 2000000 };

  return {
    type: 'PATENT',
    annualTurnover,
    tier: tier.name,
    taxAmount: tier.amount,
    currency: 'KHR'
  };
}

async function logTaxCalculation(type, amount, result) {
  try {
    const db = cloud.database();
    await db.collection('tax_logs').add({
      data: {
        type,
        input: amount,
        result: JSON.stringify(result),
        createTime: db.serverDate()
      }
    });
  } catch (err) {
    // 日志记录失败不影响结果返回
    console.log('日志写入失败:', err);
  }
}
