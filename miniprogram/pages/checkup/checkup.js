// pages/checkup/checkup.js
// 合规体检工具 — 免费信息工具，生成体检报告，不涉及交易
// 底部「获取专业解读」唤起微信原生客服会话
// 三语：问题库/行业/报告文案全部来自语言包 checkup 命名空间

const { t, getScope } = require('../../utils/i18n.js');
const api = require('../../utils/api.js');

Page({
  data: {
    L: getScope('checkup'),

    // 当前步骤: 0=填写信息, 1=答题, 2=报告
    step: 0,

    // 企业基本信息
    form: {
      companyName: '',
      industry: '',
      employeeCount: '',
      monthlyRevenue: '',
      hasVatRegistration: false,
      hasPatentTax: false,
      hasForeignEmployees: false
    },

    // 体检问题（6题，随语言刷新，覆盖柬埔寨核心合规风险点）
    questions: [],
    answers: {},
    currentQ: 0,

    // 体检结果
    report: null,

    // 行业选项（随语言刷新）
    industries: []
  },

  onLoad() {
    this.refreshLang();
  },

  onShow() {
    this.refreshLang();
  },

  onLanguageChange() {
    this.refreshLang();
  },

  refreshLang() {
    const L = getScope('checkup');
    this.setData({ L, questions: L.questions, industries: L.industries });
    wx.setNavigationBarTitle({ title: L.title });
    // 已生成报告时，风险标签与总结也需跟随语言刷新
    if (this.data.step === 2 && this.data.report) {
      this.generateReport(this.data.answers, true);
    }
  },

  // ===== 步骤控制 =====
  goToStep(e) {
    const step = e.currentTarget.dataset.step;
    if (step === '1' && !this.validateForm()) return;
    this.setData({ step: Number(step), currentQ: 0 });
  },

  validateForm() {
    const { companyName, industry } = this.data.form;
    if (!companyName.trim()) {
      wx.showToast({ title: t('checkup.needCompanyName'), icon: 'none' });
      return false;
    }
    if (!industry) {
      wx.showToast({ title: t('checkup.needIndustry'), icon: 'none' });
      return false;
    }
    return true;
  },

  // ===== 表单输入 =====
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onIndustryChange(e) {
    this.setData({ 'form.industry': this.data.industries[e.detail.value] });
  },

  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // ===== 答题 =====
  onAnswerSelect(e) {
    const { qid, idx } = e.currentTarget.dataset;
    const answers = { ...this.data.answers, [qid]: idx };

    if (this.data.currentQ < this.data.questions.length - 1) {
      this.setData({ answers, currentQ: this.data.currentQ + 1 });
    } else {
      this.setData({ answers });
      this.generateReport(answers);
    }
  },

  prevQuestion() {
    if (this.data.currentQ > 0) {
      this.setData({ currentQ: this.data.currentQ - 1 });
    }
  },

  // ===== 生成体检报告 =====
  generateReport(answers, silent) {
    const questions = this.data.questions;
    const riskLabels = getScope('checkup').riskLabels || {};
    const recs = getScope('checkup').recs || {};
    const recPrefix = t('checkup.recPrefix');
    let score = 0;
    const issues = [];
    const recommendations = [];

    questions.forEach((q, i) => {
      const ans = answers[q.id];
      // 0=合规, 1=部分风险, 2=高风险, 3=未知风险
      const riskLevels = [
        { score: 100, level: 'safe' },
        { score: 60, level: 'warning' },
        { score: 20, level: 'danger' },
        { score: 30, level: 'unknown' }
      ];
      const risk = riskLevels[ans] || riskLevels[3];
      score += risk.score;

      if (risk.level !== 'safe') {
        issues.push({
          title: q.title,
          level: risk.level,
          label: riskLabels[risk.level] || risk.level,
          desc: q.desc
        });
        recommendations.push({
          title: recPrefix + q.title,
          action: recs[q.id] || t('checkup.recFallback')
        });
      }
    });

    score = Math.round(score / questions.length);
    let grade, gradeColor, summary;

    if (score >= 85) {
      grade = 'A';
      gradeColor = '#1D9E75';
      summary = t('checkup.summaryA');
    } else if (score >= 60) {
      grade = 'B';
      gradeColor = '#EF9F27';
      summary = t('checkup.summaryB');
    } else if (score >= 35) {
      grade = 'C';
      gradeColor = '#D85A30';
      summary = t('checkup.summaryC');
    } else {
      grade = 'D';
      gradeColor = '#E24B4A';
      summary = t('checkup.summaryD');
    }

    this.setData({
      step: 2,
      report: {
        score,
        grade,
        gradeColor,
        summary,
        issues,
        recommendations,
        riskItemsTitle: t('checkup.riskItems').replace('{count}', issues.length),
        companyName: this.data.form.companyName,
        date: this.formatDate(new Date())
      }
    });
    if (!silent) wx.vibrateShort({ type: 'medium' });
  },

  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // ===== 报告操作 =====
  onCopyReport() {
    const r = this.data.report;
    if (!r) return;
    const issueText = r.issues.map(i => `  · ${i.title} [${i.label}]`).join('\n');
    const text = `${t('checkup.copyHead')}\n${t('checkup.copyCompany')}${r.companyName}\n${t('checkup.copyDate')}${r.date}\n${t('checkup.copyGrade')}${r.grade} (${r.score}${t('checkup.scoreUnit')})\n\n${t('checkup.copyRisk')}\n${issueText || '  ' + t('checkup.copyNone')}\n\n${t('checkup.copySummary')}${r.summary}`;
    wx.setClipboardData({ data: text });
    wx.showToast({ title: t('checkup.reportCopied'), icon: 'success' });
  },

  onRestart() {
    this.setData({
      step: 0,
      form: {
        companyName: '',
        industry: '',
        employeeCount: '',
        monthlyRevenue: '',
        hasVatRegistration: false,
        hasPatentTax: false,
        hasForeignEmployees: false
      },
      answers: {},
      currentQ: 0,
      report: null
    });
  },

  onShareReport() {
    wx.showShareMenu({ withShareTicket: true });
  },

  onShareAppMessage() {
    const r = this.data.report;
    return {
      title: (r ? r.companyName : t('checkup.myCompany')) + ' ' + t('checkup.shareReportTitle'),
      path: '/pages/checkup/checkup'
    };
  },

  onShareTimeline() {
    const r = this.data.report;
    const gradeText = getScope('checkup').gradeText || {};
    const gradeLabel = r ? (gradeText[r.grade] || r.grade) : t('checkup.pendingTest');
    return {
      title: t('checkup.shareTimeline').replace('{grade}', gradeLabel),
      query: ''
    };
  },

  // 小程序内生成需求单，替代客服咨询按钮，避免被判定为引流
  async createRequirement(e) {
    const { type, title, detail } = e.currentTarget.dataset;
    if (!title) return;
    wx.showLoading({ title: '提交中' });
    try {
      await api.createRequirement({ type, title: title.trim(), detail });
      wx.hideLoading();
      wx.showToast({ title: '已生成需求单', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/requirement/requirement' });
      }, 800);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  }
});
