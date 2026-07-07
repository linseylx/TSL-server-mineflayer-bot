const fs = require('fs');
const path = require('path');
const { normalizeItemName, shouldUseCustomName, translateItemName } = require('../utils/itemTranslator');

module.exports = function registerAdminTools(app, ctx) {
    const {
        warehouse,
        requireAuth,
        saveWarehouse,
        shopIO,
        adminIO,
        addLog,
        TRANSPORT_CONFIG_FILE
    } = ctx;

    function readJson(filePath, fallback) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch {}
        return fallback;
    }

    function writeJson(filePath, data) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    function translatedName(name) {
        return translateItemName(name);
    }

    function isShulkerBoxName(name) {
        return String(name || '').replace(/^minecraft:/, '').endsWith('shulker_box');
    }

    function isLegacyEmptyShulkerAggregate(item) {
        return isShulkerBoxName(item?.name)
            && (!Array.isArray(item.shulkerContents) || item.shulkerContents.length === 0)
            && !item.shulkerSignature
            && Number(item.stock || 0) > 1;
    }

    function adminItem(item) {
        const translated = translatedName(item.name);
        const customDisplayName = shouldUseCustomName(item.name, item.customName) ? item.customName : '';
        return {
            ...item,
            displayName: customDisplayName || translated || item.displayName || item.name
        };
    }

    function publicItem(item) {
        const translated = adminItem(item);
        return {
            name: translated.name,
            displayName: translated.displayName,
            customName: translated.customName || '',
            stock: Number(translated.stock || 0),
            price: Number(translated.price || 0),
            icon: translated.icon,
            public: translated.public !== false,
            shulkerContents: Array.isArray(translated.shulkerContents)
                ? translated.shulkerContents.map(entry => ({
                    name: entry.name,
                    displayName: translatedName(entry.name) || entry.displayName || entry.name,
                    count: Number(entry.count || 0)
                }))
                : []
        };
    }

    app.get('/api/warehouse', requireAuth, (req, res) => {
        res.json((warehouse.items || []).filter(item => item.public !== false && Number(item.stock || 0) > 0 && !isLegacyEmptyShulkerAggregate(item)).map(publicItem));
    });

    app.get('/api/warehouse/admin', requireAuth, (req, res) => {
        res.json((warehouse.items || []).map(adminItem));
    });

    app.post('/api/admin/warehouse/retranslate', requireAuth, (req, res) => {
        let updated = 0;
        const unresolved = [];

        for (const item of warehouse.items || []) {
            const key = normalizeItemName(item.name);
            const translated = translateItemName(item.name);
            if (!translated || translated === key) {
                unresolved.push(key);
                continue;
            }
            if (!shouldUseCustomName(item.name, item.customName) && item.customName) {
                item.customName = '';
                updated += 1;
            }
            if (!shouldUseCustomName(item.name, item.customName) && item.displayName !== translated) {
                item.displayName = translated;
                updated += 1;
            }
        }

        if (updated > 0) {
            saveWarehouse();
            shopIO?.emit('warehouseUpdate');
            adminIO?.emit('warehouseUpdate', warehouse);
        }

        addLog(`[翻译修复] 已重算仓库物品显示名 ${updated} 个，未匹配 ${unresolved.length} 个`);
        res.json({ success: true, updated, unresolved: unresolved.slice(0, 50) });
    });

    app.get('/api/admin/transport-config', requireAuth, (req, res) => {
        const config = readJson(TRANSPORT_CONFIG_FILE, { bots: [] });
        res.json({
            success: true,
            config: {
                host: config.host || '',
                port: config.port || 25565,
                version: config.version || '',
                mainHost: config.mainHost || '',
                mainPort: config.mainPort || 28473,
                mainAdminPort: config.mainAdminPort || 28474,
                pollInterval: config.pollInterval || 5000,
                heartbeatInterval: config.heartbeatInterval || 30000
            }
        });
    });

    app.post('/api/admin/transport-config', requireAuth, (req, res) => {
        const config = readJson(TRANSPORT_CONFIG_FILE, { bots: [] });
        const allowed = ['host', 'version', 'mainHost'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) config[key] = String(req.body[key]).trim();
        }

        for (const key of ['port', 'mainPort', 'mainAdminPort', 'pollInterval', 'heartbeatInterval']) {
            if (req.body[key] !== undefined && req.body[key] !== '') {
                const value = Number(req.body[key]);
                const isPort = key.toLowerCase().includes('port');
                if (!Number.isInteger(value) || value <= 0 || (isPort && value > 65535)) {
                    return res.json({ success: false, error: `${key} 不是有效数值` });
                }
                config[key] = value;
            }
        }

        if (!Array.isArray(config.bots)) config.bots = [];
        writeJson(TRANSPORT_CONFIG_FILE, config);
        addLog(`[运输配置] 已更新 mainHost=${config.mainHost || ''}, mainAdminPort=${config.mainAdminPort || ''}`);
        res.json({ success: true, config });
    });
};
