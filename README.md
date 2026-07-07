# Warehouse Bot

Mineflayer warehouse bot with Web admin and shop UI.

## Safe GitHub package

This package intentionally excludes runtime secrets, logs, node_modules, backups and bot auth caches.

Excluded examples:
- admin_password.txt
- update_password.txt
- secret_key.txt
- data/users.json
- data/temp_login_codes.json
- core/transport/.auth-cache/

## First setup

1. Copy example configs before running:

```bash
cp data/bot_config.example.json data/bot_config.json
cp data/warehouse.example.json data/warehouse.json
cp core/transport/config.example.json core/transport/config.json
npm ci --omit=dev
node server.js
```

2. On first start the app generates passwords. Read them on the server only:

```bash
cat admin_password.txt
cat update_password.txt
```
