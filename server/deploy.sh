#!/bin/bash
# KHMER AI 2.0 一键部署脚本（Ubuntu 22.04 LTS）
# 适用于香港/新加坡轻量服务器，海外主体小程序自建后端。
# 用法：把 server/ 整目录上传到服务器 /tmp/khmer-ai-server 后执行本脚本
#       sudo bash /tmp/khmer-ai-server/deploy.sh

set -e

APP_DIR="/opt/khmer-ai"
SERVICE="khmer-ai"
NODE_MIN="18"

# 默认域名（已按本项目配置）。如需更换：DOMAIN=xxx.com sudo bash deploy.sh
DOMAIN="${DOMAIN:-www.ccbuyhub.com}"

echo "=========================================="
echo "KHMER AI 2.0 后端部署"
echo "域名: $DOMAIN"
echo "目录: $APP_DIR"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 或 root 用户执行"
  exit 1
fi

# 1. 安装 Node.js
if ! command -v node &>/dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt "$NODE_MIN" ]; then
  echo "[1/6] 安装 Node.js ${NODE_MIN}..."
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MIN}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
else
  echo "[1/6] Node.js 已安装: $(node -v)"
fi

# 2. 复制应用到 /opt/khmer-ai
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[2/6] 部署应用到 $APP_DIR..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
cp -r "$SOURCE_DIR"/. "$APP_DIR/"
cd "$APP_DIR"

# 3. 环境变量
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[3/6] 创建 .env（请编辑填写 APPSECRET、LLM_* 等真实值）..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
else
  echo "[3/6] .env 已存在，保留"
fi

# 4. systemd 服务
echo "[4/6] 创建 systemd 服务 $SERVICE..."
cat > /etc/systemd/system/${SERVICE}.service <<EOF
[Unit]
Description=KHMER AI 2.0 Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE"

# 5. 启动服务
echo "[5/6] 启动后端服务..."
systemctl restart "$SERVICE"
sleep 2
systemctl status "$SERVICE" --no-pager || true

# 6. 安装/配置 Nginx + 预备 SSL
echo "[6/6] 安装 Nginx 与 Certbot..."
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
fi
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi

cat > /etc/nginx/sites-available/$SERVICE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/$SERVICE
ln -s /etc/nginx/sites-available/$SERVICE /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "=========================================="
echo "基础部署完成！"
echo "下一步（必须）："
echo "  1. 确保域名 $DOMAIN 已 A 记录解析到本机 IP，且防火墙放通 80/443"
echo "  2. 编辑 $APP_DIR/.env，填入真实 APPSECRET、LLM_* 等"
echo "  3. 申请 HTTPS 证书: sudo certbot --nginx -d $DOMAIN"
echo "  4. 小程序后台「开发设置-服务器域名」添加 https://$DOMAIN"
echo "  5. 前端 api.js 的 BACKEND_BASE 已改为 https://$DOMAIN（本地改好即可）"
echo "  6. 重启后端: sudo systemctl restart $SERVICE"
echo ""
echo "健康检查: https://$DOMAIN/api/health"
echo "=========================================="
