// pages/privacy/privacy.js - 隐私政策（三语，内联文案）
const { getCurrentLang } = require('../../utils/i18n.js');

const CONTENT = {
  'zh-CN': {
    title: '隐私政策',
    updated: '更新日期：2026年8月',
    blocks: [
      { h: '一、我们收集的信息', p: '为向您提供商旅后勤服务，本小程序会收集以下信息：\n• 微信登录标识（openid），用于标识您的账号；\n• 您主动提交的需求内容、联系方式、物业台账等经营数据。' },
      { h: '二、信息的使用', p: '我们仅将信息用于：需求匹配与供应商对接、物业工单处理、客服与必要通知。我们不会将信息用于与上述无关的目的。' },
      { h: '三、信息的存储与安全', p: '数据存储于境外服务器，我们采取合理的加密与访问控制措施保护您的信息。' },
      { h: '四、信息的共享', p: '我们不会向无关第三方出售您的个人信息；为完成您的需求，可能将必要信息对接给相应供应商或服务方。' },
      { h: '五、您的权利', p: '您可通过小程序客服联系我们，查询、更正或删除您的个人信息。' },
      { h: '六、联系我们', p: '如对本政策有疑问，请通过小程序内"客服"与我们联系。' }
    ]
  },
  'en': {
    title: 'Privacy Policy',
    updated: 'Last updated: August 2026',
    blocks: [
      { h: '1. Information We Collect', p: 'To provide business-travel logistics services, this mini-program collects:\n• WeChat login identifier (openid) to identify your account;\n• Business data you submit, such as requests, contacts, and property records.' },
      { h: '2. How We Use Information', p: 'We use information only for: request matching and provider connection, property work-order handling, customer service, and necessary notices. We do not use it for unrelated purposes.' },
      { h: '3. Storage & Security', p: 'Data is stored on overseas servers. We apply reasonable encryption and access controls to protect your information.' },
      { h: '4. Sharing', p: 'We do not sell your personal information to unrelated third parties. To fulfill your requests, necessary information may be shared with relevant providers or service parties.' },
      { h: '5. Your Rights', p: 'You may contact us via in-app customer service to access, correct, or delete your personal information.' },
      { h: '6. Contact', p: 'For questions about this policy, please reach us through the in-app "Customer Service".' }
    ]
  },
  'km': {
    title: 'គោលការណ៍ឯកជនភាព',
    updated: 'ធ្វើបច្ចុប្បន្នភាព៖ សីហា 2026',
    blocks: [
      { h: '១. ព័ត៌មានដែលយើងប្រមូល', p: 'ដើម្បីផ្តល់សេវាភស្តុភារអាជីវកម្ម កម្មវិធីនេះប្រមូល៖\n• អត្តសញ្ញាណចូល WeChat (openid) ដើម្បីកំណត់គណនីរបស់អ្នក;\n• ទិន្នន័យអាជីវកម្មដែលអ្នកដាក់ស្នើ ដូចជា សំណើ ទំនាក់ទំនង និងបញ្ជីអចលនទ្រព្យ។' },
      { h: '២. របៀបប្រើប្រាស់ព័ត៌មាន', p: 'យើងប្រើព័ត៌មានតែសម្រាប់៖ ការផ្គូផ្គងសំណើ និងការតភ្ជាប់អ្នកផ្គត់ផ្គង់ ការដោះស្រាយការងារអចលនទ្រព្យ សេវាអតិថិជន និងការជូនដំណឹងចាំបាច់។ យើងមិនប្រើវាសម្រាប់គោលបំណងផ្សេងទេ។' },
      { h: '៣. ការរក្សាទុក និងសុវត្ថិភាព', p: 'ទិន្នន័យត្រូវបានរក្សាទុកនៅម៉ាស៊ីនបម្រើបរទេស។ យើងអនុវត្តការអ៊ិនគ្រីប និងការត្រួតពិនិត្យចូលចេញសមរម្យដើម្បីការពារព័ត៌មានរបស់អ្នក។' },
      { h: '៤. ការចែករំលែក', p: 'យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកទៅភាគីទីបីដែលគ្មានទំនាក់ទំនងទេ។ ដើម្បីបំពេញសំណើរបស់អ្នក ព័ត៌មានចាំបាច់អាចត្រូវបានចែករំលែកជាមួយអ្នកផ្គត់ផ្គង់ ឬភាគីសេវាកម្មដែលពាក់ព័ន្ធ។' },
      { h: '៥. សិទ្ធិរបស់អ្នក', p: 'អ្នកអាចទាក់ទងយើងតាមរយៈសេវាអតិថិជនក្នុងកម្មវិធី ដើម្បីមើល កែតម្រូវ ឬលុបព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក។' },
      { h: '៦. ទំនាក់ទំនង', p: 'សម្រាប់សំណួរអំពីគោលការណ៍នេះ សូមទាក់ទងយើងតាមរយៈ "សេវាអតិថិជន" ក្នុងកម្មវិធី។' }
    ]
  }
};

Page({
  data: {
    title: '',
    updated: '',
    blocks: []
  },

  onLoad() {
    this.render();
  },

  onLanguageChange() {
    this.render();
  },

  render() {
    const lang = getCurrentLang();
    const c = CONTENT[lang] || CONTENT['zh-CN'];
    this.setData({ title: c.title, updated: c.updated, blocks: c.blocks });
    wx.setNavigationBarTitle({ title: c.title });
  }
});
