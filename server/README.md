# KHMER AI 2.0 后端（server/）

零依赖 Node 服务（仅用内置 `http`/`crypto`/`fs`），数据落地 JSON 文件，便于海外轻量部署。

## 本地运行
```bash
cd server
cp .env.example .env      # 按需填写 APPID/APPSECRET/LLM_*
node src/index.js         # 默认 :3000，可用 PORT=8787 指定
```
健康检查：`GET /api/health`

## 接口
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/login` | `wx.login` code → openid + token（dev 模式 code 即 openid） |
| POST | `/api/ai/chat` | AI 助手：`{messages, lang}` → `{reply, suggestedRequirement?, candidates?}` |
| POST | `/api/match` | 匹配推荐：`{type, query, lang}` |
| GET | `/api/requirement?lang=&status=&type=` | 我的需求单列表 |
| POST | `/api/requirement` | 创建需求单 `{type,title,detail,contact}` |
| GET | `/api/requirement/:id` | 详情 |
| PUT | `/api/requirement/:id/status` | 推进状态 `{status,note,matchedIds}` |
| POST | `/api/requirement/:id/rate` | 评价 `{rating,comment}` |

闭环状态：`pending→matching→accepted→processing→completed→rated`

## AI 接入（微信AI生态 / 大模型）
默认 `LLM_BASE_URL` 为空时启用**规则降级**（意图识别 + 匹配推荐），离线可演示。
要"接入微信AI生态"：在 `.env` 填入微信AI/元宝提供的 OpenAI 兼容网关：
```
LLM_BASE_URL=https://<wechat-ai-gateway>
LLM_API_KEY=<your-key>
LLM_MODEL=<model>
```

## 生产部署（香港/新加坡轻量服务器）

### 1. 准备服务器
- 购买腾讯云国际站/阿里云国际 **香港或新加坡** 节点轻量应用服务器。
- 镜像选 **Ubuntu 22.04 LTS Server**。
- 域名解析到服务器公网 IP；小程序 request 合法域名要求 **HTTPS**。

### 2. 上传并执行一键部署脚本
```bash
# 本地把 server/ 目录打包上传到服务器，例如：
# scp -r server root@你的服务器IP:/tmp/khmer-ai-server

# 登录服务器后执行
sudo bash /tmp/khmer-ai-server/deploy.sh
```
脚本会自动：安装 Node.js 18、复制应用到 `/opt/khmer-ai`、创建 systemd 服务 `khmer-ai`、安装 Nginx 并配置反代。

### 3. 申请 HTTPS 证书
推荐使用 Let's Encrypt：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d khmer-ai.yourdomain.com
```
或手动把证书配到 `/etc/nginx/sites-available/khmer-ai`（参考 `nginx-example.conf`）。

### 4. 配置环境变量
```bash
sudo nano /opt/khmer-ai/.env
# 填入：APPSECRET（小程序后台获取）、LLM_BASE_URL/LLM_API_KEY/LLM_MODEL（微信AI网关）
sudo systemctl restart khmer-ai
```

### 5. 小程序后台配置
- mp.weixin.qq.com → 开发 → 开发设置 → 服务器域名 → request 合法域名 → 添加 `https://你的域名`。
- 前端 `miniprogram/utils/api.js` 的 `BACKEND_BASE` 改为 `https://你的域名`。

### 6. 常用命令
```bash
sudo systemctl status khmer-ai      # 查看状态
sudo systemctl restart khmer-ai     # 重启后端
sudo journalctl -u khmer-ai -f      # 查看实时日志
```

## 海外部署要点
1. 部署到**海外节点**（如新加坡/香港 VPS），保留服务器物理位置证明。
2. 绑定 **HTTPS 域名**（小程序 request 合法域名仅支持 https）。
3. 小程序后台「开发 → 开发设置 → 服务器域名」添加该域名到 **request 合法域名**。
4. 前端 `miniprogram/utils/api.js` 的 `BACKEND_BASE` 改为该域名。
5. 正式环境填 `APPSECRET`，登录改为 HMAC token 校验。
