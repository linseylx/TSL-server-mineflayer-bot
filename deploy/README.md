# deploy 目录

- `warehouse-bot.service`：Linux systemd 服务文件，默认工作目录 `/opt/warehouse-bot`。
- 部署时先上传项目代码，不上传 `node_modules`。
- Linux 上执行 `npm ci --omit=dev` 后再启动服务。
- 28474 是后台管理端口，必须用防火墙或反向代理限制访问。
