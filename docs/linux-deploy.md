# Linux 部署说明

## 进程分工

- 云服务器：运行 Web 商城、后台管理、主 Bot。
- 本地机器：运行本地运输 Bot。
- 云服务器备用运输 Bot：只在本地运输 Bot 掉线且掉线前有任务时接管。
- 禁止同一个 Minecraft 账号在 Windows、本地客户端、Linux 主 Bot 中同时在线，否则会触发 duplicate_login。

## 端口

- 商城前端端口：28473。
- 后台管理端口：28474。
- 生产环境建议用防火墙或反向代理限制 28474，只允许管理员访问。

## 环境变量

建议创建 .env 或在 systemd/PM2 中配置：

```bash
NODE_ENV=production
SHOP_PORT=28473
ADMIN_PORT=28474
BIND_HOST=0.0.0.0
ADMIN_PASSWORD=请改成强密码
UPDATE_AUTO_RESTART=1
```

## 首次启动

```bash
cd /opt/warehouse-bot
npm ci --omit=dev
node server.js
```

后台页面启动主 Bot 后，如果需要微软登录，复制控制台或后台显示的 Microsoft 登录 URL 完成授权。

## systemd 示例

复制 `deploy/warehouse-bot.service` 到 `/etc/systemd/system/warehouse-bot.service` 后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now warehouse-bot
sudo journalctl -u warehouse-bot -f
```

## 更新包规范

外层 zip 必须包含：

```text
manifest.json
cloud_update.zip
local_update.zip
```

`manifest.json` 至少包含：

```json
{
  "schema": "outer-update-v1",
  "version": "1.0.1"
}
```

上传入口：后台管理 -> 系统更新，接口为 `POST /api/update/upload`。执行更新接口为 `POST /api/update/execute`。

## 防重复登录

主 Bot 启动会创建 `data/mainbot.lock.json`。如果同服务器已有主 Bot 进程，新的主 Bot 会退出，避免账号被踢。
如果确认是异常退出留下的旧锁，程序会自动清理失效 PID。

## 安全应急加固

如果后台密码、`secret_key.txt`、服务器文件或 SSH 信息疑似泄露，按下面顺序处理：

```bash
cd /root/mineflayer

# 1. 失效所有旧网页登录 token
mv secret_key.txt secret_key.txt.leaked_$(date +%s) 2>/dev/null || true

# 2. 轮换后台管理密码
openssl rand -base64 32 > admin_password.txt
chmod 600 admin_password.txt

# 3. 重启服务
pm2 restart mineflayer-bot --update-env
pm2 save

# 4. 查看新后台密码
cat admin_password.txt
```

生产环境建议：

- 不要继续使用 `admin123`、`123456` 等弱密码。
- 不要用 root 直接运行 Web 服务，建议创建普通用户运行 PM2。
- 腾讯云安全组不要公开 `28474`，后台管理端口只允许你的固定 IP 访问。
- `/api/server/exec` 已禁用；需要执行 Linux 命令时只走 SSH。
- 文件管理只允许访问项目目录、更新包目录、运输 Bot 配置目录，并屏蔽 `secret_key.txt`、`admin_password.txt`、`.ssh`、私钥文件。
