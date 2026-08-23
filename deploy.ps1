# deploy.ps1 - 在 PowerShell 中部署 khmer-ai 后端到 43.129.21.17
# 用法（PowerShell 中）：
#   cd D:\ZIEC\JCXLFW\cambodia-biz-travel
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
$ErrorActionPreference = "Stop"

$SSH_USER  = "root"
$SSH_HOST  = "43.129.21.17"
$REMOTE_DIR = "/opt/khmer-ai"
$LOCAL      = "D:\ZIEC\JCXLFW\cambodia-biz-travel\server"

# 定位 Git for Windows 自带客户端（避免 PATH 没配）
$gitBin = "C:\Program Files\Git\usr\bin"
$ssh   = if (Test-Path "$gitBin\ssh.exe")   { "$gitBin\ssh.exe" }   else { "ssh" }
$scp   = if (Test-Path "$gitBin\scp.exe")   { "$gitBin\scp.exe" }   else { "scp" }
$rsync = if (Test-Path "$gitBin\rsync.exe") { "$gitBin\rsync.exe" } else { "rsync" }

Write-Host ">> 本地 server : $LOCAL"
Write-Host ">> 目标        : ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}"

# 1) 同步后端代码（排除 data/ 与 node_modules/，保护线上工单数据与已装依赖）
if (Get-Command $rsync -ErrorAction SilentlyContinue) {
    & $rsync -avz --exclude='node_modules' --exclude='data' --exclude='*.log' "$LOCAL/" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/server/"
} else {
    Write-Host ">> rsync 不可用，改用 scp 递归传 src / package.json / .env"
    & $scp -r "$LOCAL\src" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/server/"
    & $scp "$LOCAL\package.json" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/server/" 2>$null
    & $scp "$LOCAL\.env" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/server/" 2>$null
}

# 2) 远程重启 + 健康检查
Write-Host ">> 重启 khmer-ai"
& $ssh "${SSH_USER}@${SSH_HOST}" "systemctl restart khmer-ai; sleep 2; systemctl status khmer-ai --no-pager | head -6; echo '--- health ---'; curl -s http://127.0.0.1:3000/api/health"
Write-Host ">> 部署完成"
