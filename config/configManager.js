const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

const defaultConfig = {
    server: { host: "mc.zenoxs.cn", port: 25565, username: "linseylx", auth: "microsoft", version: "1.21.11" },
    bot: { name: "TSL Bot", version: "3.0.0", isDebug: false },
    whitelist: { adminWhitelist: ["Xigold_lx"], operatorWhitelist: ["Xigold_lx"] },
    registeredAdmins: {},
    registeredOperators: {},
    groups: {},
    viewDistance: { maxViewDistance: 64, minViewDistance: 10, currentViewDistance: 64, enableExperimental: true, debug: false },
    fileMonitor: { checkInterval: 3000, logLevel: "normal" },
    positionTracker: { logLevel: "minimal" },
    construction: { isActive: false, startedAt: null, startedBy: null, reason: "" },
    lock: { isLocked: false, lockedAt: null, lockedBy: null, reason: "" },
    logs: []
};

let config = { ...defaultConfig };

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            config = { ...defaultConfig, ...data };
            config.whitelist = { ...defaultConfig.whitelist, ...(data.whitelist || {}) };
            config.viewDistance = { ...defaultConfig.viewDistance, ...(data.viewDistance || {}) };
            config.construction = { ...defaultConfig.construction, ...(data.construction || {}) };
            config.lock = { ...defaultConfig.lock, ...(data.lock || {}) };
            config.registeredAdmins = data.registeredAdmins || {};
            config.registeredOperators = data.registeredOperators || {};
            config.groups = data.groups || {};
        }
    } catch (e) {
        console.log('[Config] 加载配置失败:', e.message);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (e) {
        console.log('[Config] 保存配置失败:', e.message);
    }
}

function addLog(action, details) {
    const entry = `[${new Date().toLocaleString()}] [${action}] Bot: ${details}`;
    config.logs.unshift(entry);
    if (config.logs.length > 500) config.logs = config.logs.slice(0, 500);
    saveConfig();
}

function isAdmin(username) {
    if (!username) return false;
    return config.whitelist.adminWhitelist.includes(username) || config.registeredAdmins[username] === true;
}

function isOperator(username) {
    if (!username) return false;
    return isAdmin(username) || config.whitelist.operatorWhitelist.includes(username) || config.registeredOperators[username] === true;
}

function getConfig() {
    return config;
}

function updateConfig(updates) {
    config = { ...config, ...updates };
    saveConfig();
}

module.exports = {
    loadConfig,
    saveConfig,
    addLog,
    isAdmin,
    isOperator,
    getConfig,
    updateConfig,
    getDefaultConfig: () => ({ ...defaultConfig })
};