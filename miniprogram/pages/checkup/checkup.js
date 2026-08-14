// pages/checkup/checkup.js
// 合规体检工具 — 免费信息工具，生成体检报告，不涉及交易
// 底部「获取专业解读」唤起微信原生客服会话

Page({
  data: {
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

    // 体检问题（6题，覆盖柬埔寨核心合规风险点）
    questions: [
      {
        id: 'vat_filing',
        title: '增值税(VAT)申报',
        desc: '是否每月按时向GDT申报增值税？',
        options: ['每月按时申报', '偶尔延迟', '未申报过', '不清楚要求']
      },
      {
        id: 'wht_compliance',
        title: '代扣税(WHT)合规',
        desc: '向境外支付服务费时是否代扣税款？',
        options: ['每次都代扣', '部分代扣', '从未代扣', '不了解WHT']
      },
      {
        id: 'salary_tax',
        title: '薪资税(PIT)代扣',
        desc: '外籍员工薪资是否按累进税率代扣PIT？',
        options: ['严格代扣', '按固定比例', '未代扣', '无外籍员工']
      },
      {
        id: 'patent_tax',
        title: '专利税(Patent Tax)',
        desc: '是否已缴纳年度专利税？',
        options: ['每年缴纳', '今年未缴', '从未缴纳', '不清楚']
      },
      {
        id: 'labor_card',
        title: '外籍劳工证',
        desc: '外籍员工是否持有有效劳工证？',
        options: ['全部持有', '部分持有', '均未办理', '无外籍员工']
      },
      {
        id: 'invoice_eft',
        title: '电子发票(EFT)',
        desc: '是否已注册GDT电子发票系统？',
        options: ['已注册使用', '注册未使用', '未注册', '不了解EFT']
      }
    ],
    answers: {},
    currentQ: 0,

    // 体检结果
    report: null,

    // 行业选项
    industries: ['酒店/旅游', '餐饮', '贸易', '建筑/房地产', '制造', '服务', '其他']
  },

  onLoad() {},

  // ===== 步骤控制 =====
  goToStep(e) {
    const step = e.currentTarget.dataset.step;
    if (step === '1' && !this.validateForm()) return;
    this.setData({ step: Number(step), currentQ: 0 });
  },

  validateForm() {
    const { companyName, industry } = this.data.form;
    if (!companyName.trim()) {
      wx.showToast({ title: '请填写企业名称', icon: 'none' });
      return false;
    }
    if (!industry) {
      wx.showToast({ title: '请选择行业', icon: 'none' });
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
  generateReport(answers) {
    const questions = this.data.questions;
    let score = 0;
    const issues = [];
    const recommendations = [];

    questions.forEach((q, i) => {
      const ans = answers[q.id];
      // 0=合规, 1=部分风险, 2=高风险, 3=未知风险
      const riskLevels = [
        { score: 100, level: 'safe', label: '合规' },
        { score: 60, level: 'warning', label: '部分风险' },
        { score: 20, level: 'danger', label: '高风险' },
        { score: 30, level: 'unknown', label: '待确认' }
      ];
      const risk = riskLevels[ans] || riskLevels[3];
      score += risk.score;

      if (risk.level !== 'safe') {
        issues.push({
          title: q.title,
          level: risk.level,
          label: risk.label,
          desc: q.desc
        });
        recommendations.push({
          title: '建议：' + q.title,
          action: this.getRecommendation(q.id)
        });
      }
    });

    score = Math.round(score / questions.length);
    let grade, gradeColor, summary;

    if (score >= 85) {
      grade = 'A';
      gradeColor = '#1D9E75';
      summary = '企业整体合规状况良好，建议保持现有合规水平并持续关注政策更新。';
    } else if (score >= 60) {
      grade = 'B';
      gradeColor = '#EF9F27';
      summary = '企业存在部分合规风险，建议尽快完善相关申报和代扣流程。';
    } else if (score >= 35) {
      grade = 'C';
      gradeColor = '#D85A30';
      summary = '企业合规风险较高，多项关键税务义务未履行，建议尽快进行专业诊断。';
    } else {
      grade = 'D';
      gradeColor = '#E24B4A';
      summary = '企业存在严重合规风险，面临罚款和滞纳金概率较高，强烈建议立即寻求专业支持。';
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
        companyName: this.data.form.companyName,
        date: this.formatDate(new Date())
      }
    });
    wx.vibrateShort({ type: 'medium' });
  },

  getRecommendation(qid) {
    const map = {
      vat_filing: '尽快补报未申报月份，并向GDT申请减免滞纳金',
      wht_compliance: '梳理历史对外支付记录，补代扣税款并申报',
      salary_tax: '重新核算外籍员工薪资税，补报差额',
      patent_tax: '本年度专利税截止前完成缴纳',
      labor_card: '联系劳工部为外籍员工办理劳工证',
      invoice_eft: '向GDT申请EFT系统注册并完成对接'
    };
    return map[qid] || '建议咨询专业顾问';
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
    const text = `【柬税笔记 · 合规体检报告】\n企业：${r.companyName}\n日期：${r.date}\n评级：${r.grade} (${r.score}分)\n\n风险项：\n${issueText || '  无'}\n\n总结：${r.summary}`;
    wx.setClipboardData({ data: text });
    wx.showToast({ title: '报告已复制', icon: 'success' });
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
      title: (r ? r.companyName : '我的企业') + '合规体检报告 · 柬税笔记',
      path: '/pages/checkup/checkup'
    };
  },

  onShareTimeline() {
    const r = this.data.report;
    const levelText = { A: '优秀', B: '良好', C: '有风险', D: '高风险' };
    return {
      title: '我的企业合规评级 ' + (r ? levelText[r.level] || r.level + '级' : '待测') + '，来测测你的',
      query: ''
    };
  }
});
