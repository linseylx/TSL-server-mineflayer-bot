# Linux 文件目录适配

## 推荐部署目录

生产环境统一放在：

```text
/opt/warehouse-bot/
├── server.js
├── package.json
├── package-lock.json
├── version.json
├── data/                    # 业务数据：库存、用户、主 Bot 配置、锁文件
├── core/                    # 主 Bot 与运输 Bot 代码
│   └── transport/
│       ├── config.json      # 运输 Bot 配置
│       └── .auth-cache/     # 运输 Bot 微软登录缓存
├── routes/                  # 后台 API
├── public-desktop/          # 后台 UI
├── public-shop/             # 商城 UI
├── updates/                 # 上传后的待更新包
├── deploy-packages/         # 本地 Bot 更新下载包
├── backups/                 # 云端更新自动备份
├── logs.txt
└── node_modules/            # Linux 上 npm ci 生成，不建议上传
```

## 目录规则

- 代码里统一使用 `path.join(__dirname, ...)`，不写死 Windows 盘符。
- Linux 服务工作目录必须是 `/opt/warehouse-bot`，否则相对日志和旧兼容文件会落错位置。
- `node_modules` 不打包上传，在 Linux 执行 `npm ci --omit=dev`。
- `data/`、`core/transport/.auth-cache/`、`secret_key.txt`、`admin_password.txt` 属于服务器状态文件，不要被更新包覆盖。

## 云端与本地配置

云服务器上的 Web/后台/主 Bot：

```bash
cd /opt/warehouse-bot
npm ci --omit=dev
ADMIN_PASSWORD='强密码' BIND_HOST=0.0.0.0 node server.js
```

本地运输 Bot 连接云服务器时，`core/transport/config.json` 的 `mainHost` 不能是 `localhost`，必须改成云服务器 IP 或域名：

```json
{
  "mainHost": "你的云服务器IP或域名",
  "mainAdminPort": 28474
}
```

如果运输 Bot 跟 Web/后台跑在同一台 Linux 上，`mainHost` 才能用 `localhost`。
