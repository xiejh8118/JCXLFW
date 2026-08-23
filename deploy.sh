#!/usr/bin/env bash
# 部署脚本：把本地 server 改动同步到 43.129.21.17 并重启 khmer-ai
# 用法（本机 Git Bash 执行）：
#   bash deploy.sh
# 前置：SSH 能连上服务器（建议配 ~/.ssh/id_rsa 免密；否则每次输密码）
#
# ===== 按需修改下面 3 个变量 =====
SSH_USER="root"                 # 服务器登录用户名
SSH_HOST="43.129.21.17"
REMOTE_DIR="/opt/khmer-ai"      # 服务器上项目根目录（含 server/ 子目录）
# ==================================

set -e
LOCAL_SERVER="$(cd "$(dirname "$0")/server" && pwd)"
echo ">> 本地 server 目录: $LOCAL_SERVER"
echo ">> 目标: $SSH_USER@$SSH_HOST:$REMOTE_DIR"

# 1) 同步后端代码
#    注意：--exclude='data' 保护服务器上的真实工单数据（requirements.json / room_stays.json），不被 --delete 清掉
#    --exclude='node_modules' 服务器已有依赖不重复传；如需更新依赖，登录后手动 npm install
rsync -avz --delete \
  --exclude='node_modules' --exclude='data' --exclude='*.log' --exclude='server.log' \
  "$LOCAL_SERVER/" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/server/"

# 2) 远程重启服务（自动识别 systemctl / pm2 / supervisor）
ssh "$SSH_USER@$SSH_HOST" bash -s <<'REMOTE'
set -e
cd "$REMOTE_DIR"
echo ">> 安装/确认依赖（如有新增）"
cd server && (npm install --omit=dev || npm install) >/dev/null 2>&1; cd ..

echo ">> 重启 khmer-ai"
if systemctl list-unit-files 2>/dev/null | grep -q '^khmer-ai'; then
  (command -v sudo >/dev/null 2>&1 && sudo systemctl restart khmer-ai) || systemctl restart khmer-ai
  systemctl status khmer-ai --no-pager | head -5
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart khmer-ai || pm2 start server/src/index.js --name khmer-ai
  pm2 logs khmer-ai --lines 10 --nostream
elif command -v supervisorctl >/dev/null 2>&1; then
  supervisorctl restart khmer-ai
else
  echo "未识别到服务管理器，尝试 pkill node 后手动起（请按需调整）："
  pkill -f "server/src/index.js" || true
  nohup node server/src/index.js > server.log 2>&1 &
fi
echo ">> 健康检查"
sleep 2
curl -s http://127.0.0.1:3000/api/health || echo "health 接口无响应（确认端口）"
REMOTE

echo ">> 部署完成"
