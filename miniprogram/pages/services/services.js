// pages/services/services.js
// 合规版服务展示页 — 纯信息展示，所有交易通过客服会话完成

const i18n = require('../../utils/i18n.js');

Page({
  data: {
    // 当前语言
    lang: 'zh-CN',
    languageLabel: '中文',

    // 服务标签页
    activeTab: 0,
    tabs: ['酒店住宿', '签证服务', '财税代办'],

    // 酒店信息
    hotels: [
      {
        id: 'h001',
        name: '金边索菲特酒店',
        nameEn: 'Sofitel Phnom Penh',
        city: '金边',
        star: 5,
        refPrice: '￥680起/晚',
        tags: ['商务中心', '泳池', '健身房', '接机'],
        desc: '位于金边市中心，毗邻使馆区，适合商务出差。201间客房，配全套会议设施。'
      },
      {
        id: 'h002',
        name: '暹粒吴哥莱佛士酒店',
        nameEn: 'Raffles Grand Hotel d\'Angkor',
        city: '暹粒',
        star: 5,
        refPrice: '￥850起/晚',
        tags: ['近吴哥窟', '历史建筑', ' spa', '接机'],
        desc: '距吴哥窟仅15分钟车程，法式殖民风格建筑，适合商务考察+文化旅游。'
      },
      {
        id: 'h003',
        name: '西哈努克港假日酒店',
        nameEn: 'Holiday Inn Sihanoukville',
        city: '西哈努克',
        star: 4,
        refPrice: '￥420起/晚',
        tags: ['海滨', '会议厅', '性价比'],
        desc: '西港核心地段，适合特区企业出差，配中型会议室和商务中心。'
      },
      {
        id: 'h004',
        name: '金边铂尔曼酒店',
        nameEn: 'Pullman Phnom Penh Arcadia',
        city: '金边',
        star: 5,
        refPrice: '￥550起/晚',
        tags: ['高楼景观', '屋顶泳池', '商务配套'],
        desc: '244间客房，位于KK大厦，直通购物中心，适合长期商务驻留。'
      }
    ],

    // 签证类型
    visaTypes: [
      {
        id: 'v001',
        name: '商务签证（EB）',
        duration: '单次入境，可延期',
        refFee: '￥280（含服务费）',
        stayDays: '30天起，可续签',
        materials: ['护照原件（6个月以上）', '2寸白底照片2张', '中方公司营业执照', '柬方邀请函', '往返机票预订单'],
        processingDays: '3-5个工作日',
        note: '商务签证可在柬境内续签为6个月/12个月长期签证'
      },
      {
        id: 'v002',
        name: '工作签证（EB延期）',
        duration: '6个月或12个月',
        refFee: '￥1,500起（含劳工证）',
        stayDays: '180天/365天',
        materials: ['有效护照', '劳工证（由我方代办）', '雇主聘用合同', '健康证明'],
        processingDays: '7-10个工作日',
        note: '需先办理劳工证，我方提供劳工证+工作签证一站式服务'
      },
      {
        id: 'v003',
        name: '电子签证（e-Visa）',
        duration: '单次入境',
        refFee: '￥200',
        stayDays: '30天',
        materials: ['护照扫描件', '数码照片', '信用卡支付'],
        processingDays: '3个工作日',
        note: '仅限旅游目的，不可在柬境内续签为工作签证'
      }
    ],

    // 财税服务
    taxServices: [
      {
        id: 't001',
        name: '公司注册代办',
        refFee: '￥3,500起',
        cycle: '15-20个工作日',
        includes: ['核名', '营业执照', '税务登记', '印章刻制', '银行开户协助'],
        desc: '提供 LLC / PLC 两种公司类型注册，含中柬双语文件准备'
      },
      {
        id: 't002',
        name: '月度记账报税',
        refFee: '￥800/月起',
        cycle: '每月10日前完成',
        includes: ['账务处理', 'VAT申报', '预扣税申报', '薪资税申报', '月度财务报表'],
        desc: '熟悉柬埔寨GDT税务系统，确保合规申报，避免罚款'
      },
      {
        id: 't003',
        name: '年度审计协助',
        refFee: '￥5,000起',
        cycle: '财年结束后3个月内',
        includes: ['财务数据整理', '审计资料准备', '与审计师对接', '审计报告翻译'],
        desc: '协助对接柬埔寨注册审计师（KICPA），完成法定年度审计'
      },
      {
        id: 't004',
        name: '劳工证代办',
        refFee: '￥1,200/人',
        cycle: '10-15个工作日',
        includes: ['劳工部申请', '健康检查预约', '工作卡办理', '外籍配额确认'],
        desc: '每年9月前需完成续办，逾期罚款$500/人'
      }
    ],

    // 当前展开的服务详情
    expandedHotel: '',
    expandedVisa: '',
    expandedTax: ''
  },

  onLoad(options) {
    if (options.source) {
      // 从客服消息卡片进入，可定位到对应服务
      const tabMap = { hotel: 0, visa: 1, tax: 2 };
      this.setData({ activeTab: tabMap[options.source] || 0 });
    }
    this.updateLanguage();
  },

  onShow() {
    this.updateLanguage();
  },

  updateLanguage() {
    const lang = i18n.getLang();
    const labels = { 'zh-CN': '中文', 'en': 'EN', 'km': 'ខ្មែរ' };
    this.setData({ lang, languageLabel: labels[lang] || '中文' });
  },

  // 切换标签
  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.index });
  },

  // 展开/收起酒店详情
  toggleHotel(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedHotel: this.data.expandedHotel === id ? '' : id });
  },

  // 展开/收起签证详情
  toggleVisa(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedVisa: this.data.expandedVisa === id ? '' : id });
  },

  // 展开/收起财税服务详情
  toggleTax(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedTax: this.data.expandedTax === id ? '' : id });
  },

  // 语言切换
  onLangSwitch() {
    const langs = ['zh-CN', 'en', 'km'];
    const current = langs.indexOf(this.data.lang);
    const next = langs[(current + 1) % langs.length];
    i18n.setLang(next);
    this.updateLanguage();
  },

  onShareAppMessage() {
    const tabs = ['hotel', 'visa', 'tax'];
    const tab = tabs[this.data.activeTab] || 'hotel';
    return {
      title: '柬埔寨商务服务 - 酒店住宿·签证办理·财税代办',
      path: '/pages/services/services?source=' + tab
    };
  }
});
