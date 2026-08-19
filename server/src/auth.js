/**
 * auth.js - 微信登录鉴权
 * /api/auth/login: wx.login code -> 微信 code2Session 换 openid -> 签发 HMAC token
 * 本地开发模式（未配 APPSECRET）: code 直接当 openid 使用
 */
const crypto = require('crypto');
const APPID = process.env.APPID || '';
const APPSECRET = process.env.APPSECRET || '';

function hmacToken(openid) {
  return crypto.createHmac('sha256', APPSECRET || 'dev-secret').update(openid).digest('hex');
}

async function codeToOpenid(code) {
  if (!APPSECRET) {
    // 本地开发模式：code 直接作为 openid（便于离线演示）
    return code || 'dev-openid';
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.openid) return data.openid;
  throw new Error(data.errmsg || 'code2Session 失败');
}

/**
 * 校验 token，返回 openid 或 null
 */
function verifyToken(token) {
  if (!token) return null;
  try {
    if (!APPSECRET) return token; // 本地开发模式：token 即 openid
    const idx = token.lastIndexOf('.');
    const openid = token.slice(0, idx);
    const sign = token.slice(idx + 1);
    return hmacToken(openid) === sign ? openid : null;
  } catch (e) {
    return null;
  }
}

module.exports = { codeToOpenid, hmacToken, verifyToken };
