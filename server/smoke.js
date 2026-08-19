// 临时冒烟测试：用 Node 原生 http 直连后端（绕过 curl/代理）
const http = require('http');
const PORT = process.env.PORT || 8787;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: '127.0.0.1', port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    }, res => {
      let s = ''; res.on('data', d => s += d);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(s) }); } catch (e) { resolve({ status: res.statusCode, body: s }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const out = {};
  out.health = await req('GET', '/api/health');
  const login = await req('POST', '/api/auth/login', { code: 'dev-openid-123' });
  const token = login.body?.data?.token;
  out.login = { status: login.status, token };
  out.create = await req('POST', '/api/requirement', { type: 'accommodation', title: '西港团队公寓', detail: '需要3间' }, token);
  out.list = await req('GET', '/api/requirement?lang=zh-CN', null, token);
  const id = out.create.body?.data?.id;
  if (id) {
    out.status = await req('PUT', `/api/requirement/${id}/status`, { status: 'matching', note: '开始匹配' }, token);
    out.rate = await req('POST', `/api/requirement/${id}/rate`, { rating: 5 }, token);
  }
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error('TEST ERR', e); process.exit(1); });
