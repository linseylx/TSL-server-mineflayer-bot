# 仓库 Bot 部署教程

适用版本：`2.1.12`  
部署目标：云服务器运行 Web 后台、商城前端、主 Bot；本地电脑可单独运行运输 Bot 连接云端。

> 文档防伪水印：`WM-WAREHOUSE-BOT-DEPLOY-2.1.12-20260707-PUBLIC`
>
> 校验方式：以 GitHub 仓库中的最新提交为准；任何包含真实服务器 IP、后台密码、SSH 私钥、完整 SSH 公钥、JWT 密钥的版本都不是公开发布版。

## 1. 端口与目录约定

- 前端商城端口：`28473`
- 后台管理端口：`28474`
- 云端项目目录：`/home/mineflayer/app`
- 云端运行用户：`mineflayer`
- 不要使用 `root` 跑 Bot 服务。
- 不要把 `28474` 后台管理端口公开给所有人，至少用防火墙限制 IP。

## 2. 云服务器首次初始化

以下命令先用 `root` 执行。

```bash
# 1) 创建专用用户
useradd -m -s /bin/bash mineflayer
passwd mineflayer

# 2) 创建 SSH 目录
mkdir -p /home/mineflayer/.ssh
chmod 700 /home/mineflayer/.ssh

# 3) 写入你的 SSH 公钥，替换成你自己的完整 ssh-ed25519 公钥
cat > /home/mineflayer/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAA...你的公钥... mineflayer
EOF

chmod 600 /home/mineflayer/.ssh/authorized_keys
chown -R mineflayer:mineflayer /home/mineflayer/.ssh

# 4) 确认 Node 可用
node -v
npm -v
```

如果 `node` 或 `npm` 提示找不到，但服务器面板显示已安装 Node，通常是 PATH 没进普通用户环境。先用 root 找路径：

```bash
find / -name node -type f 2>/dev/null | head
find / -name npm -type f 2>/dev/null | head
```

假设找到的是 `/usr/local/lighthouse/softwares/nodejs/node/bin/node`，则执行：

```bash
cat >> /home/mineflayer/.bashrc <<'EOF'
export PATH=/usr/local/lighthouse/softwares/nodejs/node/bin:$PATH
EOF
chown mineflayer:mineflayer /home/mineflayer/.bashrc
```

然后重新登录 `mineflayer` 用户。

## 3. 安装 PM2

切换到 `mineflayer` 用户后执行：

```bash
npm install -g pm2
pm2 -v
```

如果 `npm install -g pm2` 没权限，说明 Node 安装目录不允许普通用户写入。推荐用 root 安装一次：

```bash
npm install -g pm2
```

再回到 `mineflayer` 用户确认：

```bash
su - mineflayer
pm2 -v
```

## 4. 上传首次部署包

本机 PowerShell 执行，按你的服务器 IP 修改：

```powershell
scp "<本机项目目录>\deploy-packages\warehouse_first_deploy_2.1.11.zip" mineflayer@<服务器IP或域名>:/home/mineflayer/
```

如果你要上传当前 GitHub 包，也可以上传：

```powershell
scp "<本机项目目录>\deploy-packages\github_upload_2.1.12.zip" mineflayer@<服务器IP或域名>:/home/mineflayer/
```

## 5. 首次解压部署

在服务器上用 `mineflayer` 用户执行：

```bash
su - mineflayer
rm -rf /home/mineflayer/app
mkdir -p /home/mineflayer/app
unzip -o /home/mineflayer/warehouse_first_deploy_2.1.11.zip -d /home/mineflayer/app
cd /home/mineflayer/app

# 有 package-lock.json 时用 npm ci；没有时用 npm install
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

pm2 start server.js --name mineflayer
pm2 save
```

如果你上传的是 `github_upload_2.1.12.zip`，解压命令换成：

```bash
unzip -o /home/mineflayer/github_upload_2.1.12.zip -d /home/mineflayer/app
`

## 5.1 GitHub 一键部署（可选）

这一节用于“代码已经上传到 GitHub 后”，服务器直接从 GitHub 拉取并部署。它不是把文件上传到 GitHub，而是在服务器上执行 `git clone`。

前提：已经完成第 2、3 节，服务器存在 `mineflayer` 用户，并且 `node`、`npm`、`pm2` 可用。

先用 `root` 确认服务器有 Git：

```bash
# OpenCloudOS / CentOS / Rocky
sudo dnf install -y git unzip

# Debian / Ubuntu 用这个
# sudo apt update && sudo apt install -y git unzip
```

然后切换到 `mineflayer` 用户，执行下面命令。注意把 `REPO_URL` 改成你的真实 GitHub 仓库地址。

```bash
su - mineflayer

export REPO_URL="https://github.com/<GitHub用户名>/<仓库名>.git"
export APP_DIR="/home/mineflayer/app"

pm2 delete mineflayer 2>/dev/null || true
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

pm2 start server.js --name mineflayer
pm2 save
pm2 status
```

以后更新 GitHub 代码后，服务器可以这样一键更新并重启：

```bash
su - mineflayer
cd /home/mineflayer/app
git pull

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

pm2 restart mineflayer --update-env
pm2 save
pm2 logs mineflayer --lines 80
```

如果仓库是私有仓库，服务器需要配置 GitHub SSH key 或使用 GitHub Token。公开仓库可以直接用 HTTPS 地址。

## 6. 配置 PM2 开机自启

先用 `mineflayer` 用户生成启动命令：

```bash
pm2 startup systemd -u mineflayer --hp /home/mineflayer
```

PM2 会输出一行 `sudo env PATH=... pm2 startup ...` 或 `env PATH=... pm2 startup ...` 命令。复制那一整行，用 `root` 执行。

然后回到 `mineflayer` 用户保存进程：

```bash
pm2 save
```

验证：

```bash
pm2 status
systemctl status pm2-mineflayer --no-pager
```

## 7. 防火墙放行端口

腾讯云安全组放行：

- `28473/tcp`：商城前端，可公网访问。
- `28474/tcp`：后台管理，建议只允许你的本机公网 IP 访问。

服务器系统防火墙如果启用，也需要放行：

```bash
# firewalld
sudo firewall-cmd --permanent --add-port=28473/tcp
sudo firewall-cmd --permanent --add-port=28474/tcp
sudo firewall-cmd --reload
```

OpenCloudOS 如果没有启用 firewalld，可以只配腾讯云安全组。

## 8. 访问地址

- 商城前端：`http://<服务器IP或域名>:28473/`
- 后台管理：`http://<服务器IP或域名>:28474/`（仅限管理员 IP 访问，不建议公开）
- 后台密码不要写进公开 README。需要时在服务器上 `cat` 配置文件查看。

常用检查命令：

```bash
pm2 status
pm2 logs mineflayer --lines 100
curl -I http://127.0.0.1:28473/
curl -I http://127.0.0.1:28474/
```

## 9. 更新包部署

更新包标准结构：

```text
warehouse_update_x.x.x.zip
├── manifest.json
├── cloud_update.zip
└── local_update.zip
```

上传更新包：

```powershell
scp "<本机项目目录>\deploy-packages\warehouse_update_2.1.12.zip" mineflayer@<服务器IP或域名>:/home/mineflayer/
```

服务器手动更新：

```bash
su - mineflayer
cd /home/mineflayer/app
mkdir -p /home/mineflayer/update_2.1.12
unzip -o /home/mineflayer/warehouse_update_2.1.12.zip -d /home/mineflayer/update_2.1.12
unzip -o /home/mineflayer/update_2.1.12/cloud_update.zip -d /home/mineflayer/app

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

pm2 restart mineflayer --update-env
pm2 save
```

确认版本：

```bash
cat /home/mineflayer/app/version.json
pm2 logs mineflayer --lines 80
```

## 10. 回滚方法

如果更新后无法访问，先看日志：

```bash
pm2 logs mineflayer --lines 200
```

如果有备份目录，例如 `/home/mineflayer/backups/app_时间`，执行：

```bash
pm2 stop mineflayer
mv /home/mineflayer/app /home/mineflayer/app_bad_$(date +%Y%m%d_%H%M%S)
cp -a /home/mineflayer/backups/你的备份目录 /home/mineflayer/app
cd /home/mineflayer/app
npm install --omit=dev
pm2 start server.js --name mineflayer
pm2 save
```

没有备份时，重新解压上一个可用版本的首次部署包或完整包。

## 11. 本地运输 Bot 配置

本地运输 Bot 不需要运行 Web，只需要配置连接云端后台。

配置文件：

```text
core/transport/config.json
```

关键字段：

```json
{
  "mainHost": "<服务器IP或域名>",
  "mainPort": 28474
}
```

本地启动方式按项目实际脚本执行。如果没有单独脚本，可先用：

```powershell
node .\core\transport\transport_bot.js
```

本地运输 Bot 需要能访问云端 `28474`，否则无法接收任务和更新。

## 12. 常见问题

### npm: command not found

原因：Node 没进当前用户 PATH。用 root 找 Node 路径，再写入 `/home/mineflayer/.bashrc`。

### pm2: command not found

原因：PM2 没装，或 PATH 不对。执行：

```bash
npm install -g pm2
```

### Permission denied: /root/mineflayer

原因：你在 `mineflayer` 用户下访问了 `/root`。项目必须放在：

```text
/home/mineflayer/app
```

### npm ci 报没有 package-lock.json

改用：

```bash
npm install --omit=dev
```

### 更新后页面没变化

执行：

```bash
pm2 restart mineflayer --update-env
pm2 save
```

然后浏览器强制刷新：`Ctrl + F5`。

### 登录链接或验证码看不到

查看 PM2 日志：

```bash
pm2 logs mineflayer --lines 150
```

后台控制台也应显示登录 URL 和验证码；如果没有，先确认 Bot 进程没有崩溃。

## 13. 安全要求

- 后台 `28474` 不要全网开放。
- 不要把 `secret_key.txt`、后台密码、SSH 私钥上传 GitHub。
- 更新包只能上传自己打包的文件，不要运行陌生更新包。
- 禁止保留任意文件读取、任意命令执行这类调试接口。
- 每次疑似泄露后必须更换后台密码、JWT 密钥、SSH 密钥。

## 14. GitHub 上传前检查

这一节不是部署命令，只是提醒你：公开上传 GitHub 前要过滤隐私文件，避免泄露 IP、密码、密钥、日志和本机路径。

不要上传：

```text
node_modules/
server.out.log
server.err.log
logs.txt
secret_key.txt
.env
backups/
local_backups/
```

建议上传：

```text
config/
core/
data/ 示例配置
deploy/
docs/
public-desktop/
public-shop/
routes/
utils/
package.json
package-lock.json
server.js
version.json
README.md
```

