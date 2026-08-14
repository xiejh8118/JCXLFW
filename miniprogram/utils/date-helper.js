/**
 * date-helper.js - 柬埔寨佛历/公历转换 & 日期工具
 * 
 * 柬埔寨使用佛历 (Buddhist Era, BE)，公历年份 + 543 = 佛历年份
 * 新年为每年4月13-15日（宋干节/泼水节）
 */

// 柬埔寨公共假期（公历）
const CAMBODIA_HOLIDAYS = [
  { name: '国际新年', nameKm: 'ទិវាចូលឆ្នាំសកល', month: 1, day: 1 },
  { name: '胜利纪念日', nameKm: 'ទិវាជ័យជំនះ', month: 1, day: 7 },
  { name: '妇女节', nameKm: 'ទិវាសិទ្ធិនារី', month: 3, day: 8 },
  { name: '新年/宋干节', nameKm: 'ចូលឆ្នាំថ្មី', month: 4, day: 14, duration: 3 },
  { name: '劳动节', nameKm: 'ទិវាពលកម្ម', month: 5, day: 1 },
  { name: '国王诞辰', nameKm: 'ព្រះរាជពិធីបុណ្យ', month: 5, day: 14 },
  { name: '立宪节', nameKm: 'ទិវារដ្ឋធម្មនុញ្ញ', month: 9, day: 24 },
  { name: '亡人节', nameKm: 'បុណ្យភ្ជុំបិណ្ឌ', month: 10, day: 1, duration: 3, lunarBased: true },
  { name: '独立日', nameKm: 'ទិវាបុណ្យឯករាជ្យ', month: 11, day: 9 },
  { name: '送水节', nameKm: 'ពិធីបុណ្យអុំទូក', month: 11, day: 1, duration: 3, lunarBased: true },
  { name: '人权日', nameKm: 'ទិវាសិទ្ធិមនុស្ស', month: 12, day: 10 }
];

// 柬埔寨星期名称
const KHMER_DAYS = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

// 柬埔寨月份名称（高棉文）
const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

/**
 * 公历转佛历
 * @param {Date} date
 * @returns {number} 佛历年份
 */
function gregorianToBuddhist(date) {
  return date.getFullYear() + 543;
}

/**
 * 佛历转公历年份
 * @param {number} beYear
 * @returns {number}
 */
function buddhistToGregorian(beYear) {
  return beYear - 543;
}

/**
 * 格式化日期为柬埔寨常用格式
 * @param {Date} date
 * @param {string} format - 'gregorian' | 'buddhist' | 'khmer'
 */
function formatDate(date, format = 'gregorian') {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = date.getDay();

  switch (format) {
    case 'buddhist':
      return `${y + 543}-${m}-${d}`;
    case 'khmer':
      return `ថ្ងៃ${KHMER_DAYS[dayOfWeek]} ទី${d} ខែ${KHMER_MONTHS[date.getMonth()]} ឆ្នាំ${y + 543}`;
    case 'gregorian':
    default:
      return `${y}-${m}-${d}`;
  }
}

/**
 * 格式化日期时间为可读字符串
 */
function formatDateTime(date) {
  const format = formatDate(date);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${format} ${h}:${min}`;
}

/**
 * 计算两个日期相差天数
 */
function daysBetween(date1, date2) {
  const ms = date2.getTime() - date1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * 获取指定日期是柬埔寨的星期几
 */
function getKhmerDayOfWeek(date) {
  return KHMER_DAYS[date.getDay()];
}

/**
 * 判断是否为柬埔寨公共假期
 * @param {Date} date
 * @returns {object|null} 假期信息，非假期返回 null
 */
function isCambodiaHoliday(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  for (const holiday of CAMBODIA_HOLIDAYS) {
    if (holiday.lunarBased) continue; // 阴历节日需要单独算法
    if (holiday.month === m && holiday.day === d) {
      return holiday;
    }
    // 多天假期
    if (holiday.duration > 1) {
      for (let i = 0; i < holiday.duration; i++) {
        const hDate = new Date(date.getFullYear(), holiday.month - 1, holiday.day + i);
        if (hDate.getMonth() + 1 === m && hDate.getDate() === d) {
          return holiday;
        }
      }
    }
  }
  return null;
}

/**
 * 获取未来N天的日期列表
 * @param {number} days
 * @returns {Array}
 */
function getNextDays(days = 7) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    result.push({
      date: d,
      formatted: formatDate(d),
      khmerDay: getKhmerDayOfWeek(d),
      holiday: isCambodiaHoliday(d),
      isToday: i === 0
    });
  }
  return result;
}

/**
 * 将入住退房日期转为"X晚"格式
 */
function formatStay(checkIn, checkOut) {
  const nights = daysBetween(new Date(checkIn), new Date(checkOut));
  return nights > 0 ? nights : 1;
}

module.exports = {
  CAMBODIA_HOLIDAYS,
  KHMER_DAYS,
  KHMER_MONTHS,
  gregorianToBuddhist,
  buddhistToGregorian,
  formatDate,
  formatDateTime,
  daysBetween,
  getKhmerDayOfWeek,
  isCambodiaHoliday,
  getNextDays,
  formatStay
};
