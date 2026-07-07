const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const jwt = require('jsonwebtoken');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const minecraftData = require('minecraft-data');
const { translateItemName } = require('./utils/itemTranslator');

const SECRET_KEY_FILE = path.join(__dirname, 'secret_key.txt');
let SECRET_KEY;

if (fs.existsSync(SECRET_KEY_FILE)) {
    SECRET_KEY = fs.readFileSync(SECRET_KEY_FILE, 'utf8').trim();
} else {
    SECRET_KEY = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_KEY_FILE, SECRET_KEY);
}

const ADMIN_PASSWORD_FILE = path.join(__dirname, 'admin_password.txt');
const UPDATE_PASSWORD_FILE = path.join(__dirname, 'update_password.txt');
const SECURITY_MIGRATION_FILE = path.join(__dirname, 'data', 'security_migration_2.1.8.done');

function isWeakAdminPassword(password) {
    return !password || ['admin', 'admin123', 'password', '123456', '12345678'].includes(String(password).trim().toLowerCase());
}

function createStrongAdminPassword() {
    return crypto.randomBytes(24).toString('base64url');
}

function loadAdminPassword() {
    if (process.env.ADMIN_PASSWORD && !isWeakAdminPassword(process.env.ADMIN_PASSWORD)) return process.env.ADMIN_PASSWORD;
    if (process.env.ADMIN_PASSWORD && isWeakAdminPassword(process.env.ADMIN_PASSWORD)) {
        console.warn('[SECURITY] Ignored weak ADMIN_PASSWORD environment value.');
    }
    if (fs.existsSync(ADMIN_PASSWORD_FILE)) {
        const password = fs.readFileSync(ADMIN_PASSWORD_FILE, 'utf8').trim();
        if (password && !isWeakAdminPassword(password)) return password;
        console.warn('[SECURITY] Weak or empty admin_password.txt detected, rotating admin password.');
    }
    const generated = createStrongAdminPassword();
    fs.writeFileSync(ADMIN_PASSWORD_FILE, generated + '\n', { mode: 0o600 });
    try { fs.chmodSync(ADMIN_PASSWORD_FILE, 0o600); } catch {}
    console.warn('[SECURITY] Generated a new admin password at admin_password.txt. Read it on the server with: cat /root/mineflayer/admin_password.txt');
    return generated;
}

function writeSecretFile(filePath, value) {
    fs.writeFileSync(filePath, value + '\n', { mode: 0o600 });
    try { fs.chmodSync(filePath, 0o600); } catch {}
}

function runSecurityMigrationOnce() {
    try {
        if (fs.existsSync(SECURITY_MIGRATION_FILE)) return;
        const dataDir = path.dirname(SECURITY_MIGRATION_FILE);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        writeSecretFile(ADMIN_PASSWORD_FILE, createStrongAdminPassword());
        writeSecretFile(UPDATE_PASSWORD_FILE, createStrongAdminPassword());
        SECRET_KEY = crypto.randomBytes(32).toString('hex');
        writeSecretFile(SECRET_KEY_FILE, SECRET_KEY);
        fs.writeFileSync(SECURITY_MIGRATION_FILE, new Date().toISOString() + '\n');
        console.warn('[SECURITY] One-time 2.1.8 migration rotated admin_password.txt, update_password.txt and secret_key.txt. Use cat on server to read new passwords.');
    } catch (error) {
        console.error('[SECURITY] Failed to run one-time security migration:', error.message);
    }
}

runSecurityMigrationOnce();

const ADMIN_PASSWORD = loadAdminPassword();

try {
    if (fs.existsSync(ADMIN_PASSWORD_FILE)) fs.chmodSync(ADMIN_PASSWORD_FILE, 0o600);
    if (fs.existsSync(SECRET_KEY_FILE)) fs.chmodSync(SECRET_KEY_FILE, 0o600);
} catch {}

function safeSecretEqual(actual, expected) {
    const actualBuffer = Buffer.from(String(actual || ''));
    const expectedBuffer = Buffer.from(String(expected || ''));
    if (actualBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function generateAuthToken() {
    return jwt.sign({ timestamp: Date.now(), admin: true }, SECRET_KEY, { expiresIn: '4h' });
}

function generateUserToken(user) {
    return jwt.sign({
        timestamp: Date.now(),
        userId: user.id,
        username: user.username
    }, SECRET_KEY, { expiresIn: '7d' });
}

function verifyAuthToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded && (decoded.admin || decoded.userId || decoded.username);
    } catch {
        return false;
    }
}

function getSocketAuthToken(socket) {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    return authToken || headerToken || '';
}

function getRequestAuthToken(req) {
    const headerToken = req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    return headerToken || '';
}

function requireSocketAuth(socket, next) {
    const token = getSocketAuthToken(socket);
    if (!token || !verifyAuthToken(decodeURIComponent(token))) {
        return next(new Error('unauthorized'));
    }
    next();
}

function requireAuth(req, res, next) {
    const token = getRequestAuthToken(req);
    if (!token || !verifyAuthToken(token)) {
        return res.status(401).json({ success: false, error: '请先登录' });
    }
    next();
}

const WAREHOUSE_FILE = path.join(__dirname, 'data', 'warehouse.json');
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');
const LOG_FILE = path.join(__dirname, 'logs.txt');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'bot_config.json');
const TEMP_LOGIN_FILE = path.join(__dirname, 'data', 'temp_login_codes.json');
const PENDING_REG_FILE = path.join(__dirname, 'data', 'pending_registrations.json');
const PENDING_BIND_FILE = path.join(__dirname, 'data', 'pending_bindings.json');
const PICKUP_LOG_FILE = path.join(__dirname, 'data', 'pickup_logs.jsonl');
const PICKUP_STATS_FILE = path.join(__dirname, 'data', 'pickup_stats.json');
const BOT_LOG_FILE = path.join(__dirname, 'bot_logs.txt');
const TRANSPORT_CONFIG_FILE = path.join(__dirname, 'core', 'transport', 'config.json');
const CONFIG_DIR_FILE = path.join(__dirname, 'config_dir.json');
const CLOUD_SERVER_FILE = path.join(__dirname, 'cloud_server.json');

const { OWNER_TYPES, ITEM_STATUS } = require('./models/types');
const AuctionModule = require('./services/auctionService');

let warehouse = { items: [], chestPositions: [] };
let blacklist = [];
let logs = [];
let botLogs = [];
let mainBotProcess = null;
let mainBotState = { status: 'stopped', health: 20, food: 20, position: null, task: null };
let botConfig = { email: 'Linseylx@outlook.com', host: 'mc.zenoxs.cn', port: 25565, version: '1.21.11' };
let users = [];
let transportBots = {};
let transportBotCommands = [];
let transportBotLoginUrls = {};
let transportBotErrors = {};
let mainBotTransportTasks = [];
let mainBotControlTasks = [];
let rolledBackTransportTaskIds = {};
let localBotLastSeen = {};
let failoverActive = {};
let failoverTimer = null;
let pickupStats = { players: {}, total: { requested: 0, completed: 0, failed: 0, quantity: 0 }, updatedAt: null };
let maintenanceState = {
    enabled: false,
    phase: 'idle',
    blockNewTasks: false,
    targetVersion: null,
    startedAt: null,
    localPackageReady: false,
    localSleepQueue: {}
};
const BOTS_DIR = path.join(__dirname, 'core', 'transport');

let auctionModule = null;

function addLog(message, level = 'info') {
    const timestamp = new Date().toLocaleString('zh-CN');
    const logEntry = `[${timestamp}][${level}] ${message}`;
    logs.push(logEntry);
    if (logs.length > 500) logs = logs.slice(-500);
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
    console.log(`[LOG] ${message}`);
}

function loadData() {
    if (fs.existsSync(WAREHOUSE_FILE)) {
        try { warehouse = JSON.parse(fs.readFileSync(WAREHOUSE_FILE, 'utf8')); }
        catch { warehouse = { items: [], chestPositions: [] }; }
    }
    if (fs.existsSync(BLACKLIST_FILE)) {
        try { blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8')); }
        catch { blacklist = []; }
    }
    if (fs.existsSync(USERS_FILE)) {
        try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
        catch { users = []; }
    }
    if (fs.existsSync(CONFIG_FILE)) {
        try { botConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
        catch {}
    }
    loadPickupStats();
}

function saveWarehouse() { fs.writeFileSync(WAREHOUSE_FILE, JSON.stringify(warehouse, null, 2)); }
function saveBlacklist() { fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2)); }
function saveUsers() { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }

function ensureDataDir() {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPickupStats() {
    try {
        if (fs.existsSync(PICKUP_STATS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PICKUP_STATS_FILE, 'utf8'));
            if (data && typeof data === 'object') pickupStats = data;
        }
    } catch {}
    pickupStats.players = pickupStats.players && typeof pickupStats.players === 'object' ? pickupStats.players : {};
    pickupStats.total = pickupStats.total && typeof pickupStats.total === 'object'
        ? pickupStats.total
        : { requested: 0, completed: 0, failed: 0, quantity: 0 };
}

function savePickupStats() {
    ensureDataDir();
    pickupStats.updatedAt = new Date().toISOString();
    fs.writeFileSync(PICKUP_STATS_FILE, JSON.stringify(pickupStats, null, 2));
}

function recordPickupEvent(stage, payload = {}) {
    const playerName = String(payload.playerName || payload.gameUsername || 'unknown').trim() || 'unknown';
    const itemName = String(payload.itemName || payload.displayName || '').trim();
    const quantity = Math.max(0, Number(payload.quantity || 0));
    const entry = {
        time: new Date().toISOString(),
        stage,
        playerName,
        itemName,
        quantity,
        taskId: payload.taskId || payload.id || '',
        botNum: payload.botNum,
        botType: payload.botType || payload.type,
        success: payload.success,
        error: payload.error || ''
    };

    ensureDataDir();
    fs.appendFileSync(PICKUP_LOG_FILE, JSON.stringify(entry) + '\n');

    const player = pickupStats.players[playerName] || {
        requested: 0,
        completed: 0,
        failed: 0,
        quantity: 0,
        items: {},
        lastAt: null,
        lastError: ''
    };
    if (stage === 'queued') {
        player.requested += 1;
        pickupStats.total.requested = Number(pickupStats.total.requested || 0) + 1;
    }
    if (stage === 'completed') {
        player.completed += 1;
        player.quantity += quantity;
        pickupStats.total.completed = Number(pickupStats.total.completed || 0) + 1;
        pickupStats.total.quantity = Number(pickupStats.total.quantity || 0) + quantity;
        if (itemName) player.items[itemName] = Number(player.items[itemName] || 0) + quantity;
    }
    if (stage === 'failed') {
        player.failed += 1;
        player.lastError = entry.error;
        pickupStats.total.failed = Number(pickupStats.total.failed || 0) + 1;
    }
    player.lastAt = entry.time;
    pickupStats.players[playerName] = player;
    savePickupStats();

    adminIO.emit('pickupLog', entry);
    adminIO.emit('pickupStats', pickupStats);
    shopIO.emit('pickupLog', toPublicPickupLog(entry));
    shopIO.emit('pickupStats', toPublicPickupStats());
    return entry;
}

function getClientRateKey(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

const publicRateBuckets = new Map();
function publicRateLimit(options = {}) {
    const windowMs = Number(options.windowMs || 60000);
    const max = Number(options.max || 90);
    return (req, res, next) => {
        const now = Date.now();
        const key = `${options.name || 'public'}:${getClientRateKey(req)}`;
        const bucket = publicRateBuckets.get(key) || { resetAt: now + windowMs, count: 0 };
        if (now > bucket.resetAt) {
            bucket.resetAt = now + windowMs;
            bucket.count = 0;
        }
        bucket.count += 1;
        publicRateBuckets.set(key, bucket);
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > max) {
            return res.status(429).json({ success: false, error: '请求过快，请稍后再试' });
        }
        next();
    };
}

const strictLoginRateLimit = publicRateLimit({ name: 'login', max: 8, windowMs: 60000 });

setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of publicRateBuckets.entries()) {
        if (now > bucket.resetAt + 60000) publicRateBuckets.delete(key);
    }
}, 60000).unref?.();

function readPickupLogs({ limit = 80, playerName = '', publicView = false, includeProgress = false } = {}) {
    if (!fs.existsSync(PICKUP_LOG_FILE)) return [];
    const safeLimit = Math.max(1, Math.min(Number(limit) || 80, publicView ? 100 : 500));
    const player = String(playerName || '').trim().toLowerCase();
    const visibleStages = new Set(['completed', 'failed']);
    const lines = fs.readFileSync(PICKUP_LOG_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
    const result = [];
    for (let index = lines.length - 1; index >= 0 && result.length < safeLimit; index -= 1) {
        try {
            const entry = JSON.parse(lines[index]);
            if (player && String(entry.playerName || '').toLowerCase() !== player) continue;
            if (!includeProgress && !visibleStages.has(entry.stage)) continue;
            result.push(publicView ? toPublicPickupLog(entry) : entry);
        } catch {}
    }
    return result;
}

function toPublicPickupLog(entry) {
    return {
        time: entry.time,
        stage: entry.stage,
        playerName: entry.playerName,
        itemName: entry.itemName,
        quantity: Number(entry.quantity || 0),
        success: entry.success,
        error: entry.error ? String(entry.error).slice(0, 120) : ''
    };
}

function toPublicPickupStats() {
    const players = Object.entries(pickupStats.players || {})
        .map(([playerName, stat]) => ({
            playerName,
            requested: Number(stat.requested || 0),
            completed: Number(stat.completed || 0),
            failed: Number(stat.failed || 0),
            quantity: Number(stat.quantity || 0),
            lastAt: stat.lastAt || null,
            topItems: Object.entries(stat.items || {})
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 8)
                .map(([itemName, quantity]) => ({ itemName, quantity: Number(quantity || 0) }))
        }))
        .sort((a, b) => Number(b.quantity) - Number(a.quantity) || String(a.playerName).localeCompare(String(b.playerName)));
    return {
        total: pickupStats.total || { requested: 0, completed: 0, failed: 0, quantity: 0 },
        players,
        updatedAt: pickupStats.updatedAt || null
    };
}

function reloadUsersFromDisk() {
    if (!fs.existsSync(USERS_FILE)) return users;
    try {
        const latest = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (Array.isArray(latest)) users = latest;
    } catch {}
    return users;
}

function isPasswordHash(value) {
    return typeof value === 'string' && value.startsWith('sha256$');
}

function hashUserPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
    return `sha256$${salt}$${hash}`;
}

function verifyUserPassword(user, password) {
    const stored = user?.password || '';
    if (!stored) return false;
    if (!isPasswordHash(stored)) return stored === password;
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const actual = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(actual));
}

function sanitizeUser(user) {
    if (!user || typeof user !== 'object') return null;
    const { password, passwordHash, token, tempToken, sessions, ...safe } = user;
    if (Array.isArray(safe.boundAccounts)) {
        safe.boundAccounts = safe.boundAccounts.map(account => {
            if (typeof account === 'string') return { username: account };
            if (!account || typeof account !== 'object') return account;
            const { token: accountToken, password: accountPassword, tempToken: accountTempToken, ...safeAccount } = account;
            return safeAccount;
        });
    }
    return safe;
}

function validateUserPassword(password) {
    if (!password || typeof password !== 'string') return '请输入密码';
    if (password.length < 6) return '密码至少 6 位';
    if (password.length > 72) return '密码不能超过 72 位';
    return '';
}

const MC_DATA_VERSION = '1.21.11';
let mcDataCache = null;
function getMcData() {
    if (!mcDataCache) mcDataCache = minecraftData(MC_DATA_VERSION);
    return mcDataCache;
}

function getItemMaxStackSize(itemName) {
    const clean = String(itemName || '').replace(/^minecraft:/, '');
    if (!clean) return 64;
    try {
        const item = getMcData().itemsByName[clean];
        if (Number.isFinite(Number(item?.stackSize)) && Number(item.stackSize) > 0) return Number(item.stackSize);
    } catch {}
    if (clean.endsWith('shulker_box')) return 1;
    if (/(bucket|egg|snowball|ender_pearl|sign)$/.test(clean)) return 16;
    return 64;
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

function isBulkWarehouseItem(item) {
    return Boolean(item?.bulk?.isBulk || String(item?.shulkerSignature || '').startsWith('bulk:'));
}

function getBulkLocationSummary(item) {
    const locations = Array.isArray(item?.locations) ? item.locations : [];
    const looseLocations = locations.filter(loc => loc?.bulkStorageType === 'loose' && Number(loc.count || 0) > 0);
    const boxedLocations = locations.filter(loc => loc?.bulkStorageType === 'boxed' && Number(loc.count || 0) > 0);
    const looseStock = looseLocations.reduce((sum, loc) => sum + Number(loc.count || 0), 0);
    const boxedStock = boxedLocations.reduce((sum, loc) => sum + Number(loc.count || 0), 0);
    const stackSize = getItemMaxStackSize(item?.name);
    return {
        isBulk: isBulkWarehouseItem(item),
        primaryName: item?.bulk?.primaryName || item?.name,
        primaryDisplayName: translateItemName(item?.name, item?.customName) || item?.displayName || item?.name,
        looseStock,
        boxedStock,
        looseLocations: looseLocations.length,
        boxedLocations: boxedLocations.length,
        boxThreshold: stackSize * 27,
        storageTypes: {
            loose: looseStock > 0,
            boxed: boxedStock > 0
        }
    };
}

function withTranslatedDisplayName(item) {
    return {
        ...item,
        stackSize: getItemMaxStackSize(item.name),
        maxClaimQuantity: Math.min(Number(item.stock || 0), getItemMaxStackSize(item.name) * 27),
        displayName: translateItemName(item.name, item.customName) || item.displayName || item.name,
        shulkerContents: Array.isArray(item.shulkerContents)
            ? item.shulkerContents.filter(entry => entry && entry.name && String(entry.name).replace(/^minecraft:/, '') !== 'air').map(entry => ({
                ...entry,
                displayName: translateItemName(entry.name) || entry.displayName || entry.name
            }))
            : []
    };
}

function toPublicWarehouseItem(item) {
    const translated = withTranslatedDisplayName(item);
    const bulk = getBulkLocationSummary(item);
    return {
        name: translated.name,
        displayName: translated.displayName,
        customName: translated.customName || '',
        stock: Number(translated.stock || 0),
        price: Number(translated.price || 0),
        icon: translated.icon,
        public: translated.public !== false,
        stackSize: translated.stackSize,
        maxClaimQuantity: translated.maxClaimQuantity,
        bulk: bulk.isBulk ? bulk : null,
        shulkerContents: Array.isArray(translated.shulkerContents)
            ? translated.shulkerContents.map(entry => ({
                name: entry.name,
                displayName: entry.displayName,
                count: Number(entry.count || 0)
            }))
            : []
    };
}

const SHOP_PORT = Number(process.env.SHOP_PORT || 28473);
const ADMIN_PORT = Number(process.env.ADMIN_PORT || 28474);
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

const shopApp = express();
shopApp.disable('x-powered-by');
shopApp.use(cors({ origin: '*' }));
shopApp.use(express.json());
const shopServer = http.createServer(shopApp);
const shopIO = new Server(shopServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
const PUBLIC_SHOP_SOCKET_EVENTS = new Set([
    'warehouseUpdate',
    'pickupLog',
    'pickupStats',
    'scanComplete',
    'systemStatus',
    'auction_event'
]);
const emitPublicShopEvent = shopIO.emit.bind(shopIO);
shopIO.emit = (event, ...args) => {
    if (!PUBLIC_SHOP_SOCKET_EVENTS.has(String(event))) {
        console.warn(`[SECURITY] Blocked public shop socket event: ${String(event)}`);
        return false;
    }
    return emitPublicShopEvent(event, ...args);
};

const adminApp = express();
adminApp.disable('x-powered-by');
adminApp.use(cors({ origin: '*' }));
adminApp.use(express.json());
const cookieParser = require('cookie-parser');
adminApp.use(cookieParser());
const adminServer = http.createServer(adminApp);
const adminIO = new Server(adminServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
adminIO.use(requireSocketAuth);

const systemStatus = {
    scanning: false,
    scanMessage: '',
    scanStartedAt: null,
    lastScanAt: null,
    maintenance: false,
    maintenancePhase: 'idle',
    updatedAt: new Date().toISOString()
};

function getSystemStatus() {
    return {
        ...systemStatus,
        maintenance: Boolean(maintenanceState.enabled),
        maintenancePhase: maintenanceState.phase || 'idle'
    };
}

function setSystemStatus(patch = {}) {
    Object.assign(systemStatus, patch, {
        maintenance: Boolean(maintenanceState.enabled),
        maintenancePhase: maintenanceState.phase || 'idle',
        updatedAt: new Date().toISOString()
    });
    const status = getSystemStatus();
    adminIO.emit('systemStatus', status);
    shopIO.emit('systemStatus', status);
    return status;
}

function broadcastSystemStatus() {
    return setSystemStatus({});
}

shopApp.use('/shop', express.static(path.join(__dirname, 'public-shop')));
shopApp.get('/', (req, res) => res.redirect('/shop'));

shopApp.get('/api/warehouse', publicRateLimit({ name: 'warehouse', max: 80, windowMs: 60000 }), (req, res) => {
    const items = warehouse.items
        .filter(item => item.public !== false && Number(item.stock || 0) > 0 && !isLegacyEmptyShulkerAggregate(item))
        .map(toPublicWarehouseItem)
        .sort((a, b) => {
            const aIsShulker = String(a.name || '').replace(/^minecraft:/, '').endsWith('shulker_box');
            const bIsShulker = String(b.name || '').replace(/^minecraft:/, '').endsWith('shulker_box');
            const aHasContents = Array.isArray(a.shulkerContents) && a.shulkerContents.length > 0;
            const bHasContents = Array.isArray(b.shulkerContents) && b.shulkerContents.length > 0;
            const aRank = aIsShulker ? 1 : 0;
            const bRank = bIsShulker ? 1 : 0;
            if (aRank !== bRank) return aRank - bRank;
            if (aIsShulker && bIsShulker && aHasContents !== bHasContents) return aHasContents ? -1 : 1;
            return String(a.displayName || a.name || '').localeCompare(String(b.displayName || b.name || ''), 'zh-Hans-CN');
        });
    res.setHeader('Cache-Control', 'public, max-age=8, stale-while-revalidate=30');
    res.json(items);
});

shopApp.get('/api/pickup/stats', publicRateLimit({ name: 'pickup-stats', max: 60, windowMs: 60000 }), (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    res.json({ success: true, stats: toPublicPickupStats() });
});

shopApp.get('/api/pickup/logs', publicRateLimit({ name: 'pickup-logs', max: 60, windowMs: 60000 }), (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=8, stale-while-revalidate=30');
    res.json({
        success: true,
        logs: readPickupLogs({
            limit: req.query.limit || 80,
            playerName: req.query.playerName || '',
            publicView: true,
            includeProgress: req.query.includeProgress === '1'
        })
    });
});

shopApp.get('/api/system/status', (req, res) => {
    res.json({ success: true, status: getSystemStatus() });
});

shopApp.get('/api/item/:id', publicRateLimit({ name: 'item-detail', max: 120, windowMs: 60000 }), (req, res) => {
    const item = warehouse.items.find(i => i.id === req.params.id);
    if (!item || item.public === false || Number(item.stock || 0) <= 0) return res.json(null);
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    res.json(toPublicWarehouseItem(item));
});

shopApp.get('/api/item/translate/:name', (req, res) => {
    const name = req.params.name;
    const translated = translateItemName(name);
    res.json({ success: true, name, displayName: translated });
});

shopApp.get('/api/server/info', (req, res) => {
    const isLocal = fs.existsSync(path.join(__dirname, 'local_server_flag.txt')) || 
                   fs.existsSync(path.join(__dirname, 'bots', 'local_bot_flag')) ||
                   process.env.SERVER_TYPE === 'local';
    res.json({
        success: true,
        isLocalServer: isLocal,
        serverType: isLocal ? 'local' : 'cloud',
        hostname: require('os').hostname(),
        platform: process.platform,
        shopPort: SHOP_PORT,
        warehouseMode: botConfig.warehouseMode || 'PUBLIC',
        showPrice: botConfig.warehouseMode !== 'TOWN_ONLY'
    });
});

shopApp.get('/api/admin-url', (req, res) => {
    res.json({
        success: false,
        error: '后台管理地址不公开，请从管理入口访问'
    });
});

const publicAdminProxyAllowList = [
    /^\/api\/public\/mainbot-info$/,
    /^\/api\/user\/temp-login\/generate-code$/,
    /^\/api\/user\/temp-login\/verify$/,
    /^\/api\/user\/login$/,
    /^\/api\/user\/register\/generate-code$/,
    /^\/api\/user\/register\/complete$/,
    /^\/api\/user\/info$/,
    /^\/api\/user\/bind\/list$/,
    /^\/api\/user\/bind\/generate$/,
    /^\/api\/user\/bind\/verify$/,
    /^\/api\/user\/bind\/unbind$/,
    /^\/api\/user\/change-password$/,
    /^\/api\/user\/claim$/,
    /^\/api\/user\/withdraw$/
];

shopApp.use('/api', async (req, res, next) => {
    if (!publicAdminProxyAllowList.some(pattern => pattern.test(req.originalUrl.split('?')[0]))) {
        return next();
    }

    try {
        const target = `http://127.0.0.1:${ADMIN_PORT}${req.originalUrl}`;
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers.Authorization = req.headers.authorization;
        if (req.headers.cookie) headers.Cookie = req.headers.cookie;

        const upstream = await fetch(target, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
        });

        res.status(upstream.status);
        const setCookie = upstream.headers.get('set-cookie');
        if (setCookie) res.setHeader('set-cookie', setCookie);
        const contentType = upstream.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return res.json(await upstream.json());
        }
        res.send(await upstream.text());
    } catch (error) {
        res.status(502).json({ success: false, error: '内部服务连接失败' });
    }
});

adminApp.use('/', express.static(path.join(__dirname, 'public-desktop')));

adminApp.post('/api/login', strictLoginRateLimit, (req, res) => {
    const { password } = req.body;
    res.clearCookie('authToken');
    if (safeSecretEqual(password, ADMIN_PASSWORD)) {
        const token = generateAuthToken();
        res.json({ success: true, token, expiresIn: 4 * 60 * 60 });
    } else {
        res.status(401).json({ success: false, error: '密码错误' });
    }
});

adminApp.get('/api/auth/check', (req, res) => {
    const token = getRequestAuthToken(req);
    const authenticated = Boolean(token && verifyAuthToken(token));
    res.status(authenticated ? 200 : 401).json({ success: authenticated, authenticated });
});

adminApp.post('/api/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ success: true });
});

let tempLoginCodes = {};

function loadTempLoginCodes() {
    const legacyFile = path.join(__dirname, 'temp_login_codes.json');
    const merged = {};
    for (const filePath of [legacyFile, TEMP_LOGIN_FILE]) {
        try {
            if (fs.existsSync(filePath)) {
                Object.assign(merged, JSON.parse(fs.readFileSync(filePath, 'utf8')));
            }
        } catch {}
    }
    tempLoginCodes = merged;
    if (Object.keys(tempLoginCodes).length > 0) saveTempLoginCodes();
}

function saveTempLoginCodes() {
    fs.writeFileSync(TEMP_LOGIN_FILE, JSON.stringify(tempLoginCodes, null, 2));
}

loadTempLoginCodes();

function generateShortCode() {
    return crypto.randomBytes(5).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
}

adminApp.post('/api/user/temp-login/generate-code', strictLoginRateLimit, (req, res) => {
    const code = generateShortCode();
    const expires = Date.now() + 5 * 60 * 1000;
    tempLoginCodes[code] = { expires, used: false, verified: false };
    
    saveTempLoginCodes();
    
    res.json({ success: true, code });
});

adminApp.post('/api/user/temp-login/verify', strictLoginRateLimit, (req, res) => {
    const { code } = req.body;
    const temp = tempLoginCodes[code];
    
    if (!temp) {
        try {
            if (fs.existsSync(TEMP_LOGIN_FILE)) {
                const fileData = JSON.parse(fs.readFileSync(TEMP_LOGIN_FILE, 'utf8'));
                if (fileData[code]) {
                    if (fileData[code].verified) {
                        tempLoginCodes[code] = { ...fileData[code], used: true };
                        saveTempLoginCodes();
                        const user = ensureUserForGameAccount({
                            username: fileData[code].username,
                            uuid: fileData[code].uuid,
                            town: fileData[code].town,
                            prefix: fileData[code].prefix
                        });
                        saveUsers();
                        const token = generateUserToken(user);
                        return res.json({ success: true, token, username: fileData[code].username, town: fileData[code].town, user: sanitizeUser(user) });
                    } else {
                        return res.json({ success: false, error: 'waiting' });
                    }
                }
            }
        } catch {}
        return res.json({ success: false, error: '验证码不存在' });
    }
    
    if (temp.used) {
        return res.json({ success: false, error: '验证码已使用' });
    }
    
    if (Date.now() > temp.expires) {
        delete tempLoginCodes[code];
        saveTempLoginCodes();
        return res.json({ success: false, error: '验证码已过期' });
    }
    
    if (!temp.verified) {
        return res.json({ success: false, error: 'waiting' });
    }
    
    temp.used = true;
    saveTempLoginCodes();
    const user = ensureUserForGameAccount({
        username: temp.username,
        uuid: temp.uuid,
        town: temp.town,
        prefix: temp.prefix
    });
    saveUsers();
    const token = generateUserToken(user);
    res.json({ success: true, token, username: temp.username, town: temp.town, user: sanitizeUser(user) });
});

adminApp.post('/api/user/login', strictLoginRateLimit, (req, res) => {
    const { username, password } = req.body;
    reloadUsersFromDisk();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.json({ success: false, error: '用户不存在' });
    }
    
    if (!verifyUserPassword(user, password)) {
        return res.json({ success: false, error: '密码错误' });
    }

    if (!isPasswordHash(user.password)) {
        user.password = hashUserPassword(password);
        saveUsers();
    }
    
    const token = generateUserToken(user);
    res.json({ success: true, token, user: sanitizeUser(user) });
});

function loadPendingRegistrations() {
    const legacyFile = path.join(__dirname, 'pending_registrations.json');
    if (!fs.existsSync(PENDING_REG_FILE) && fs.existsSync(legacyFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
            fs.writeFileSync(PENDING_REG_FILE, JSON.stringify(data, null, 2));
            return data;
        } catch {}
    }
    if (fs.existsSync(PENDING_REG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PENDING_REG_FILE, 'utf8'));
        } catch {
            return {};
        }
    }
    return {};
}

function savePendingRegistrations(data) {
    fs.writeFileSync(PENDING_REG_FILE, JSON.stringify(data, null, 2));
}

function loadPendingBindings() {
    const legacyFile = path.join(__dirname, 'pending_bindings.json');
    if (!fs.existsSync(PENDING_BIND_FILE) && fs.existsSync(legacyFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
            fs.writeFileSync(PENDING_BIND_FILE, JSON.stringify(data, null, 2));
            return data;
        } catch {}
    }
    if (fs.existsSync(PENDING_BIND_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PENDING_BIND_FILE, 'utf8'));
        } catch {
            return {};
        }
    }
    return {};
}

function savePendingBindings(data) {
    fs.writeFileSync(PENDING_BIND_FILE, JSON.stringify(data, null, 2));
}

adminApp.post('/api/user/register/generate-code', strictLoginRateLimit, (req, res) => {
    const { password } = req.body;
    const passwordError = validateUserPassword(password);
    if (passwordError) {
        return res.json({ success: false, error: passwordError });
    }
    const code = generateShortCode();
    const expires = Date.now() + 5 * 60 * 1000;
    const pendingReg = loadPendingRegistrations();
    pendingReg[code] = { password: hashUserPassword(password), expires, username: null, uuid: null };
    savePendingRegistrations(pendingReg);
    
    res.json({ success: true, code });
});

adminApp.post('/api/user/register/complete', strictLoginRateLimit, (req, res) => {
    const { code } = req.body;
    reloadUsersFromDisk();
    const pendingReg = loadPendingRegistrations();
    const pending = pendingReg[code];
    
    if (!pending) {
        return res.json({ success: false, error: '验证码不存在' });
    }
    
    if (Date.now() > pending.expires) {
        delete pendingReg[code];
        savePendingRegistrations(pendingReg);
        return res.json({ success: false, error: '验证码已过期' });
    }
    
    if (!pending.username) {
        return res.json({ success: false, error: '等待游戏内验证...' });
    }
    
    const existingUser = users.find(u => u.username === pending.username);
    if (existingUser) {
        delete pendingReg[code];
        savePendingRegistrations(pendingReg);
        return res.json({ success: false, error: '该游戏账号已注册' });
    }
    
    const newUser = {
        id: pending.uuid || Date.now().toString(36),
        username: pending.username,
        password: pending.password,
        token: null,
        createdAt: new Date().toISOString(),
        boundAccounts: [{ username: pending.username, uuid: pending.uuid, boundAt: new Date().toISOString() }],
        tempToken: null
    };
    
    users.push(newUser);
    saveUsers();
    
    delete pendingReg[code];
    savePendingRegistrations(pendingReg);
    
    res.json({ success: true, username: pending.username, token: generateUserToken(newUser), user: sanitizeUser(newUser) });
});

let userSessions = {};

function getAccountUsername(account) {
    return typeof account === 'string' ? account : account?.username;
}
function normalizeTownName(value) {
    return String(value || '')
        .replace(/[\[\]\uFF08\uFF09(){}<>\u300E\u300F\u3010\u3011]/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function getConfiguredTownName() {
    return normalizeTownName(botConfig.townPrefix || botConfig.town || '\u5343\u5E74\u79D1\u6280') || '\u5343\u5E74\u79D1\u6280';
}

function getBoundAccount(user, gameUsername) {
    return (user?.boundAccounts || []).find(account => getAccountUsername(account) === gameUsername);
}

function validateWarehouseTownAccess(user, gameUsername) {
    if (botConfig.warehouseMode !== 'TOWN_ONLY') return null;
    const account = getBoundAccount(user, gameUsername);
    if (!account) return '\u8BF7\u9009\u62E9\u5DF2\u7ED1\u5B9A\u7684\u6E38\u620F\u8D26\u53F7';
    if (typeof account === 'string') return null;

    const expectedTown = getConfiguredTownName();
    const accountTown = normalizeTownName(account.town || account.prefix || '');
    if (!accountTown || accountTown === '??' || accountTown === '\u672A\u77E5') return null;
    if (accountTown !== expectedTown) {
        return '\u8BE5\u8D26\u53F7\u4E0D\u5C5E\u4E8E\u5F53\u524D\u5C0F\u9547\uFF1A\u9700\u8981 ' + expectedTown + '\uFF0C\u5F53\u524D ' + accountTown;
    }
    return null;
}

function findUserByGameUsername(username) {
    reloadUsersFromDisk();
    return users.find(user => user.username === username || (user.boundAccounts || []).some(account => getAccountUsername(account) === username));
}

function ensureUserForGameAccount(account) {
    const username = account.username;
    let user = findUserByGameUsername(username);
    if (!user) {
        const existingId = account.uuid && users.some(entry => entry.id === account.uuid);
        user = {
            id: existingId ? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` : (account.uuid || Date.now().toString(36)),
            username,
            password: '',
            token: null,
            createdAt: new Date().toISOString(),
            boundAccounts: [],
            tempToken: null
        };
        users.push(user);
    }

    if (!user.username || user.username === 'admin') user.username = username;
    if (!Array.isArray(user.boundAccounts)) user.boundAccounts = [];

    const accountInfo = {
        username,
        uuid: account.uuid || null,
        town: account.town || '\u672A\u77E5',
        prefix: account.prefix || '',
        boundAt: new Date().toISOString()
    };

    const existingIndex = user.boundAccounts.findIndex(entry => getAccountUsername(entry) === username);
    if (existingIndex === -1) {
        user.boundAccounts.push(accountInfo);
    } else if (typeof user.boundAccounts[existingIndex] === 'string') {
        user.boundAccounts[existingIndex] = accountInfo;
    } else {
        user.boundAccounts[existingIndex] = {
            ...user.boundAccounts[existingIndex],
            uuid: account.uuid || user.boundAccounts[existingIndex].uuid || null,
            town: account.town || user.boundAccounts[existingIndex].town || '\u672A\u77E5',
            prefix: account.prefix || user.boundAccounts[existingIndex].prefix || ''
        };
    }

    return user;
}
function getUserFromToken(token) {
    reloadUsersFromDisk();
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (decoded.userId) {
            return users.find(u => u.id === decoded.userId);
        }
        if (decoded.username) {
            return users.find(u => u.username === decoded.username);
        }
        if (decoded.admin) {
            return { id: 'admin', username: '管理员', createdAt: new Date().toISOString(), boundAccounts: [] };
        }
    } catch {}
    return null;
}

adminApp.get('/api/user/info', requireAuth, (req, res) => {
    reloadUsersFromDisk();
    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);
    if (user) {
        res.json({ success: true, user: {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            boundAccounts: user.boundAccounts || []
        }});
    } else {
        res.json({ success: true, user: { username: '管理员', createdAt: new Date().toISOString(), boundAccounts: [] } });
    }
});

adminApp.get('/api/user/bind/list', requireAuth, (req, res) => {
    reloadUsersFromDisk();
    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);
    if (user) {
        const accounts = (user.boundAccounts || []).map(acc => {
            if (typeof acc === 'string') {
                return { username: acc, town: '未知', uuid: null };
            }
            return acc;
        });
        res.json({ success: true, accounts });
    } else {
        res.json({ success: true, accounts: [] });
    }
});

adminApp.post('/api/user/bind/generate', requireAuth, (req, res) => {
    reloadUsersFromDisk();
    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);
    if (!user || user.id === 'admin') {
        return res.json({ success: false, error: '请先用玩家账号登录后再绑定' });
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = Date.now() + 5 * 60 * 1000;
    const pendingBindings = loadPendingBindings();
    pendingBindings[code] = { expires, userId: user.id };
    savePendingBindings(pendingBindings);
    
    res.json({ success: true, code });
});

adminApp.post('/api/user/bind/verify', requireAuth, (req, res) => {
    const { code, gameUsername, town, uuid } = req.body;
    reloadUsersFromDisk();
    if (!code || !gameUsername) {
        return res.json({ success: false, error: '缺少验证码或游戏用户名' });
    }

    const pendingBindings = loadPendingBindings();
    const pending = pendingBindings[code];

    if (!pending) {
        const token = getRequestAuthToken(req);
        const tokenUser = getUserFromToken(token);
        const alreadyBound = tokenUser && (tokenUser.boundAccounts || []).some(account => getAccountUsername(account) === gameUsername);
        if (alreadyBound) {
            return res.json({ success: true, accounts: tokenUser.boundAccounts || [] });
        }
        return res.json({ success: false, error: '验证码不存在或已被 Bot 完成绑定，请刷新账号列表确认' });
    }

    if (Date.now() > pending.expires) {
        delete pendingBindings[code];
        savePendingBindings(pendingBindings);
        return res.json({ success: false, error: '验证码已过期' });
    }

    const token = getRequestAuthToken(req);
    const tokenUser = getUserFromToken(token);
    const user = tokenUser && tokenUser.id !== 'admin' ? tokenUser : users.find(entry => entry.id === pending.userId);

    if (!user) {
        return res.json({ success: false, error: '找不到当前登录用户' });
    }

    if (!Array.isArray(user.boundAccounts)) user.boundAccounts = [];
    const existing = user.boundAccounts.find(account => getAccountUsername(account) === gameUsername);
    if (!existing) {
        user.boundAccounts.push({
            username: gameUsername,
            town: town || '\u672A\u77E5',
            uuid: uuid || null,
            boundAt: new Date().toISOString()
        });
        saveUsers();
    }

    delete pendingBindings[code];
    savePendingBindings(pendingBindings);

    res.json({ success: true, accounts: user.boundAccounts });
});

adminApp.post('/api/user/bind/unbind', requireAuth, (req, res) => {
    const { username } = req.body;
    reloadUsersFromDisk();
    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);
    
    if (!user) {
        return res.json({ success: false, error: '用户未登录' });
    }
    
    if (!user.boundAccounts || !Array.isArray(user.boundAccounts)) {
        return res.json({ success: false, error: '无绑定账号' });
    }
    
    const idx = user.boundAccounts.findIndex(a => typeof a === 'string' ? a === username : a.username === username);
    if (idx === -1) {
        return res.json({ success: false, error: '账号不存在' });
    }
    
    user.boundAccounts.splice(idx, 1);
    saveUsers();
    res.json({ success: true });
});

adminApp.post('/api/user/change-password', requireAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    reloadUsersFromDisk();
    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);
    
    if (!user) {
        return res.json({ success: false, error: '用户未登录' });
    }
    
    if (!verifyUserPassword(user, oldPassword)) {
        return res.json({ success: false, error: '原密码错误' });
    }
    
    const passwordError = validateUserPassword(newPassword);
    if (passwordError) {
        return res.json({ success: false, error: passwordError });
    }
    
    user.password = hashUserPassword(newPassword);
    saveUsers();
    res.json({ success: true });
});

function normalizeSourceLocation(loc, fallbackCount = 0) {
    if (!loc || !Number.isFinite(Number(loc.x)) || !Number.isFinite(Number(loc.y)) || !Number.isFinite(Number(loc.z))) return null;
    return {
        x: Number(loc.x),
        y: Number(loc.y),
        z: Number(loc.z),
        count: Number(loc.count || loc.stock || fallbackCount || 0),
        bulkStorageType: loc.bulkStorageType || '',
        storageItemName: loc.storageItemName || '',
        bulkPrimaryName: loc.bulkPrimaryName || '',
        sourceBlockName: loc.sourceBlockName || ''
    };
}

function getItemSourceLocation(item, options = {}) {
    const locations = getItemSourceLocations(item, options);
    if (locations.length > 0) return locations[0];
    const source = normalizeSourceLocation(item.sourceLocation || item.location || item.chest || item, Number(item.stock || 0));
    return source;
}

function getItemSourceLocations(item, options = {}) {
    const storageType = options.storageType || '';
    if (Array.isArray(item.locations)) {
        return item.locations
            .map(loc => normalizeSourceLocation(loc))
            .filter(Boolean)
            .filter(loc => Number(loc.count || 0) > 0)
            .filter(loc => !storageType || loc.bulkStorageType === storageType);
    }
    const source = normalizeSourceLocation(item.sourceLocation || item.location || item.chest || item, Number(item.stock || 0));
    if (!source) return [];
    if (storageType && source.bulkStorageType !== storageType) return [];
    return [source];
}

function getDefaultScanAreaForItem(item, sourceLocation = null) {
    const location = sourceLocation || getItemSourceLocation(item);
    const areas = Array.isArray(warehouse.scanAreas) ? warehouse.scanAreas : [];
    if (!location) return areas.find(area => area.enabled !== false) || null;
    return areas.find(area => {
        const region = area.scanRegion || {};
        const startX = Math.min(Number(region.startX), Number(region.endX));
        const endX = Math.max(Number(region.startX), Number(region.endX));
        const minY = Math.min(Number(region.minY), Number(region.maxY));
        const maxY = Math.max(Number(region.minY), Number(region.maxY));
        const minZ = area.scanMode === 'bulk' ? Math.min(Number(region.minZ ?? region.z), Number(region.maxZ ?? region.z)) : Number(region.z);
        const maxZ = area.scanMode === 'bulk' ? Math.max(Number(region.minZ ?? region.z), Number(region.maxZ ?? region.z)) : Number(region.z);
        return location.z >= minZ
            && location.z <= maxZ
            && location.x >= startX
            && location.x <= endX
            && location.y >= minY
            && location.y <= maxY;
    }) || areas.find(area => area.enabled !== false) || null;
}

function prepareTransportFulfillment(item, requestedQuantity) {
    const stackSize = getItemMaxStackSize(item.name);
    const threshold = stackSize * 27;
    const requested = Number(requestedQuantity || 0);
    if (!isBulkWarehouseItem(item)) {
        const locations = getItemSourceLocations(item);
        return { itemName: item.name, displayName: item.displayName || item.name, quantity: requested, sourceLocations: locations, sourceLocation: locations[0] || null, mode: 'normal' };
    }
    const wantBox = requested >= threshold;
    const storageType = wantBox ? 'boxed' : 'loose';
    const locations = getItemSourceLocations(item, { storageType });
    if (locations.length === 0) {
        const fallback = getItemSourceLocations(item);
        return { error: '大宗库存没有可用的' + (wantBox ? '盒装' : '散装') + '来源，请重新扫描大宗区域', sourceLocations: fallback };
    }
    const first = locations[0];
    const actualItemName = wantBox ? (first.storageItemName || item.bulk?.storageItemName || 'shulker_box') : item.name;
    const actualQuantity = wantBox ? Math.max(1, Math.ceil(requested / threshold)) : requested;
    return {
        itemName: actualItemName,
        stockItemName: item.name,
        displayName: (item.displayName || item.name) + (wantBox ? '（盒装）' : '（散装）'),
        quantity: actualQuantity,
        requestedQuantity: requested,
        sourceLocations: locations,
        sourceLocation: first,
        bulkMode: wantBox ? 'boxed' : 'loose',
        mode: 'bulk'
    };
}

function queueTransportTask({ playerName, item, quantity, source }) {
    const fulfillment = prepareTransportFulfillment(item, quantity);
    if (fulfillment.error) throw new Error(fulfillment.error);
    const scanArea = getDefaultScanAreaForItem(item, fulfillment.sourceLocation);
    const task = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        playerName,
        itemName: fulfillment.itemName,
        stockItemName: fulfillment.stockItemName || item.name,
        displayName: fulfillment.displayName || item.displayName || item.name,
        quantity: fulfillment.quantity,
        requestedQuantity: fulfillment.requestedQuantity || quantity,
        source,
        bulkMode: fulfillment.bulkMode || '',
        sourceLocation: fulfillment.sourceLocation,
        sourceLocations: fulfillment.sourceLocations,
        warpCommand: scanArea?.warpCommand || '',
        startPositions: scanArea?.startPositions || [],
        scanRegion: scanArea?.scanRegion || null,
        status: 'WAITING_MAIN_BOT',
        createdAt: new Date().toISOString()
    };

    mainBotTransportTasks.push(task);
    while (mainBotTransportTasks.length > 200) mainBotTransportTasks.shift();
    addLog('[运输任务] 已加入主 Bot 取货队列: ' + task.displayName + ' x' + task.quantity + ' -> ' + playerName + (task.sourceLocation ? ' @ (' + task.sourceLocation.x + ',' + task.sourceLocation.y + ',' + task.sourceLocation.z + ')' : '，但没有箱子坐标，请重新扫描仓库'));
    recordPickupEvent('queued', { ...task, itemName: task.stockItemName, taskId: task.id });
    adminIO.emit('transportTaskQueued', task);
    return task;
}

function rollbackTransportStock(taskId, itemName, quantity, error) {
    const rollbackKey = taskId || `${itemName}:${Date.now()}`;
    if (rolledBackTransportTaskIds[rollbackKey]) return false;
    rolledBackTransportTaskIds[rollbackKey] = Date.now();
    for (const [key, time] of Object.entries(rolledBackTransportTaskIds)) {
        if (Date.now() - time > 24 * 60 * 60 * 1000) delete rolledBackTransportTaskIds[key];
    }

    const item = warehouse.items.find(entry => entry.name === itemName);
    if (!item || !Number.isFinite(Number(quantity))) return false;
    const shortageError = /not enough items|missing \d+|no target item|please rescan warehouse|source chest has no target item/i.test(String(error || ''));
    if (shortageError) {
        item.stock = 0;
        item.locations = [];
        item.sourceLocation = null;
        saveWarehouse();
        shopIO.emit('warehouseUpdate');
        adminIO.emit('warehouseUpdate', warehouse);
        addLog('[\u8FD0\u8F93\u4EFB\u52A1] \u5E93\u5B58\u6570\u636E\u8FC7\u671F\uFF0C\u5DF2\u4E34\u65F6\u4E0B\u67B6: ' + itemName + '\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u4ED3\u5E93' + (error ? '\uFF0C\u539F\u56E0: ' + error : ''), 'error');
        adminIO.emit('mainBotNotice', { message: itemName + ' 库存数据过期，已临时下架，请重新扫描仓库', level: 'error', time: new Date().toISOString() });
        return true;
    }
    item.stock = Number(item.stock || 0) + Number(quantity);
    saveWarehouse();
    shopIO.emit('warehouseUpdate');
    adminIO.emit('warehouseUpdate', warehouse);
    addLog('[\u8FD0\u8F93\u4EFB\u52A1] \u5DF2\u56DE\u6EDA\u5E93\u5B58: ' + itemName + ' x' + quantity + (error ? '，原因: ' + error : ''), 'error');
    return true;
}

adminApp.get('/api/internal/mainbot/transport-task', (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '');
    if (!ip.includes('127.0.0.1') && ip !== '::1') {
        return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const task = mainBotTransportTasks.shift() || null;
    if (task) {
        task.status = 'RUNNING_MAIN_BOT';
        addLog('[\u8FD0\u8F93\u4EFB\u52A1] \u4E3B Bot \u5DF2\u9886\u53D6\u53D6\u8D27\u4EFB\u52A1: ' + task.displayName + ' x' + task.quantity + ' -> ' + task.playerName);
    }
    res.json({ success: true, task });
});

adminApp.post('/api/internal/mainbot/transport-failed', (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '');
    if (!ip.includes('127.0.0.1') && ip !== '::1') {
        return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const { taskId, playerName, itemName, stockItemName, requestedQuantity, quantity, error } = req.body || {};
    rollbackTransportStock(taskId, stockItemName || itemName, requestedQuantity || quantity, error);
    recordPickupEvent('failed', { taskId, playerName, itemName, quantity, error });
    addLog('[\u8FD0\u8F93\u4EFB\u52A1] \u4E3B Bot \u53D6\u8D27\u5931\u8D25\uFF0C\u5DF2\u56DE\u6EDA\u5E93\u5B58: ' + (taskId || '') + ' ' + (error || ''), 'error');
    adminIO.emit('transportTaskFailed', { taskId, itemName, quantity, error });
    res.json({ success: true });
});

adminApp.get('/api/internal/mainbot/control-task', (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '');
    if (!ip.includes('127.0.0.1') && ip !== '::1') {
        return res.status(403).json({ success: false, error: 'forbidden' });
    }
    res.json({ success: true, task: mainBotControlTasks.shift() || null });
});

adminApp.post('/api/internal/mainbot/control-task', requireAuth, (req, res) => {
    const action = String(req.body?.action || '');
    if (!['eat', 'clearInventory', 'sendMessage'].includes(action)) {
        return res.json({ success: false, error: '不支持的主 Bot 操作' });
    }
    if (action === 'sendMessage') {
        const playerName = String(req.body?.playerName || '').trim();
        const message = String(req.body?.message || '').trim();
        if (!/^[A-Za-z0-9_]{1,16}$/.test(playerName)) {
            return res.json({ success: false, error: '玩家名格式不正确' });
        }
        if (!message || message.length > 120) {
            return res.json({ success: false, error: '消息不能为空且不能超过120字' });
        }
        const task = {
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            action,
            playerName,
            message,
            createdAt: new Date().toISOString()
        };
        mainBotControlTasks.push(task);
        while (mainBotControlTasks.length > 50) mainBotControlTasks.shift();
        addLog('[主Bot控制] 已加入私聊任务: ' + playerName);
        return res.json({ success: true, task });
    }
    const task = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        action,
        keepItem: req.body?.keepItem || 'golden_carrot',
        keepCount: Number(req.body?.keepCount || 64),
        createdAt: new Date().toISOString()
    };
    mainBotControlTasks.push(task);
    while (mainBotControlTasks.length > 50) mainBotControlTasks.shift();
    addLog('[主Bot控制] 已加入控制任务: ' + action);
    res.json({ success: true, task });
});

adminApp.post('/api/internal/mainbot/notice', (req, res) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '');
    if (!ip.includes('127.0.0.1') && ip !== '::1') {
        return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const message = String(req.body?.message || '');
    const level = req.body?.level || 'warning';
    if (message) {
        addLog('[mainbot-notice] ' + message, level === 'error' ? 'error' : 'warning');
        adminIO.emit('mainBotNotice', { message, level, time: new Date().toISOString() });
    }
    res.json({ success: true });
});

function handleUserItemRequest(req, res, source) {
    const { itemName, quantity, gameUsername } = req.body;
    const count = Number(quantity);
    const item = warehouse.items.find(i => i.name === itemName && (source === 'claim' ? i.public !== false : i.public === false));

    if (!item) {
        return res.json({ success: false, error: source === 'claim' ? '\u5546\u54C1\u4E0D\u5B58\u5728\u6216\u4E0D\u662F\u516C\u5171\u7269\u54C1' : '\u5546\u54C1\u4E0D\u5B58\u5728\u6216\u4E0D\u662F\u79C1\u6709\u7269\u54C1' });
    }

    if (!Number.isFinite(count) || count < 1) {
        return res.json({ success: false, error: '\u8BF7\u8F93\u5165\u6709\u6548\u6570\u91CF' });
    }

    const stackSize = getItemMaxStackSize(item.name);
    const maxQuantity = stackSize * 27;
    if (count > maxQuantity) {
        return res.json({ success: false, error: '\u6bcf\u6b21\u53ea\u80fd\u9886\u53d6\u4e00\u79cd\u7269\u54c1\uff0c\u6570\u91cf\u4e0d\u80fd\u8d85\u8fc7 27 \u7ec4\uff08\u5f53\u524d\u7269\u54c1\u6700\u591a ' + maxQuantity + '\u4e2a\uff09' });
    }

    if (Number(item.stock || 0) < count) {
        return res.json({ success: false, error: '\u5E93\u5B58\u4E0D\u8DB3\uFF1A\u5F53\u524D\u5E93\u5B58 ' + Number(item.stock || 0) + '\uFF0C\u9700\u8981 ' + count + '\u3002\u8BF7\u7BA1\u7406\u5458\u91CD\u65B0\u626B\u63CF\u4ED3\u5E93\u540E\u518D\u53D6\u8D27\u3002' });
    }

    if (!getItemSourceLocation(item)) {
        return res.json({ success: false, error: '\u5E93\u5B58\u6CA1\u6709\u7BB1\u5B50\u5750\u6807\uFF0C\u8BF7\u7BA1\u7406\u5458\u91CD\u65B0\u626B\u63CF\u4ED3\u5E93\u540E\u518D\u53D6\u8D27\u3002' });
    }

    const token = getRequestAuthToken(req);
    const user = getUserFromToken(token);

    if (!user) {
        return res.json({ success: false, error: '\u8BF7\u5148\u767B\u5F55' });
    }

    if (!gameUsername) {
        return res.json({ success: false, error: '\u8BF7\u9009\u62E9\u8981\u63A5\u6536\u7269\u54C1\u7684\u6E38\u620F\u8D26\u53F7' });
    }

    const townError = validateWarehouseTownAccess(user, gameUsername);
    if (townError) {
        return res.json({ success: false, error: townError });
    }

    item.stock = Number(item.stock || 0) - count;
    let task;
    try {
        task = queueTransportTask({ playerName: gameUsername, item, quantity: count, source });
    } catch (err) {
        item.stock = Number(item.stock || 0) + count;
        return res.json({ success: false, error: err.message });
    }
    saveWarehouse();
    shopIO.emit('warehouseUpdate');
    adminIO.emit('warehouseUpdate', warehouse);

    res.json({ success: true, task });
}

adminApp.post('/api/user/claim', requireAuth, (req, res) => {
    handleUserItemRequest(req, res, 'claim');
});

adminApp.post('/api/user/withdraw', requireAuth, (req, res) => {
    handleUserItemRequest(req, res, 'withdraw');
});

adminApp.get('/api/admin/pickup/stats', requireAuth, (req, res) => {
    res.json({ success: true, stats: pickupStats });
});

adminApp.get('/api/admin/pickup/logs', requireAuth, (req, res) => {
    res.json({
        success: true,
        logs: readPickupLogs({
            limit: req.query.limit || 300,
            playerName: req.query.playerName || '',
            publicView: false,
            includeProgress: req.query.includeProgress === '1'
        })
    });
});

loadData();

auctionModule = new AuctionModule({
    items: warehouse.items,
    broadcastEvent: (event, data) => {
        adminIO.emit('auction_event', { event, data });
        shopIO.emit('auction_event', { event, data });
    },
    saveData: () => {
        saveWarehouse();
    }
});

function isLocalRequest(req) {
    const remote = String(req.ip || req.socket?.remoteAddress || '');
    return remote === '127.0.0.1'
        || remote === '::1'
        || remote === '::ffff:127.0.0.1'
        || remote.endsWith(':127.0.0.1');
}

adminApp.post('/api/bot/temp-login-verified', strictLoginRateLimit, (req, res) => {
    if (!isLocalRequest(req)) {
        return res.status(403).json({ success: false, error: 'forbidden' });
    }
    const { code, username, uuid, town, prefix } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(normalizedCode)) {
        return res.status(400).json({ success: false, error: 'invalid code' });
    }
    if (!/^[A-Za-z0-9_]{1,16}$/.test(String(username || ''))) {
        return res.status(400).json({ success: false, error: 'invalid username' });
    }
    const temp = tempLoginCodes[normalizedCode];
    if (!temp) return res.status(404).json({ success: false, error: 'code not found' });
    if (temp.used) return res.status(409).json({ success: false, error: 'code used' });
    if (Date.now() > Number(temp.expires || 0)) {
        delete tempLoginCodes[normalizedCode];
        saveTempLoginCodes();
        return res.status(410).json({ success: false, error: 'code expired' });
    }
    temp.username = username;
    temp.uuid = uuid || null;
    temp.town = town || '';
    temp.prefix = prefix || '';
    temp.verified = true;
    temp.verifiedAt = Date.now();
    saveTempLoginCodes();
    adminIO.emit('tempLoginVerified', { code: normalizedCode, username, uuid, town, prefix });
    shopIO.emit('tempLoginVerified', { code: normalizedCode, username, uuid, town, prefix });
    res.json({ success: true });
});

adminApp.get('/api/admin/users', requireAuth, (req, res) => {
    reloadUsersFromDisk();
    res.json(users.map(sanitizeUser));
});

adminApp.get('/api/admin/api-key', requireAuth, (req, res) => {
    res.status(410).json({ success: false, error: 'api key export disabled' });
});

require('./routes/transport_failover.js')(adminApp, {
    transportBots, transportBotCommands, transportBotLoginUrls, transportBotErrors,
    localBotLastSeen, failoverActive,
    addLog, requireAuth, adminIO, shopIO, BOTS_DIR, TRANSPORT_CONFIG_FILE,
    warehouse, saveWarehouse,
    rollbackTransportStock,
    recordPickupEvent,
    maintenanceState
});

require('./routes/update_manager.js')(adminApp, {
    addLog, requireAuth, maintenanceState, setSystemStatus, broadcastSystemStatus
});

require('./routes/admin_tools.js')(adminApp, {
    warehouse, requireAuth, saveWarehouse, shopIO, adminIO, addLog, TRANSPORT_CONFIG_FILE
});

require('./routes/admin.js')(adminApp, {
    warehouse, blacklist, users, logs, botLogs,
    mainBotProcess, mainBotState, botConfig,
    transportBots, transportBotCommands, transportBotLoginUrls, transportBotErrors,
    localBotLastSeen, failoverActive, failoverTimer,
    addLog, saveWarehouse, saveBlacklist, saveUsers,
    requireAuth, shopIO, adminIO, BOTS_DIR, TRANSPORT_CONFIG_FILE, CONFIG_FILE,
    CONFIG_DIR_FILE, CLOUD_SERVER_FILE,
    tempLoginCodes, saveTempLoginCodes, mainBotControlTasks,
    auctionModule, OWNER_TYPES, ITEM_STATUS,
    setSystemStatus, broadcastSystemStatus, getSystemStatus
});

adminApp.get('/api/system/status', requireAuth, (req, res) => {
    res.json({ success: true, status: getSystemStatus() });
});

shopServer.listen(SHOP_PORT, BIND_HOST, () => {
    console.log(`\n=== 商城服务器启动 ===`);
    console.log(`端口: ${SHOP_PORT}`);
    console.log(`访问地址: http://${BIND_HOST === '0.0.0.0' ? '服务器IP' : BIND_HOST}:${SHOP_PORT}/shop`);
    console.log(`API地址: http://${BIND_HOST === '0.0.0.0' ? '服务器IP' : BIND_HOST}:${SHOP_PORT}/api/warehouse`);
    console.log(`========================\n`);
});

adminServer.listen(ADMIN_PORT, BIND_HOST, () => {
    console.log(`\n=== OS管理服务器启动 ===`);
    console.log(`端口: ${ADMIN_PORT}`);
    console.log(`访问地址: http://${BIND_HOST === '0.0.0.0' ? '服务器IP' : BIND_HOST}:${ADMIN_PORT}/`);
    console.log(`安全级别: 最高（需要登录认证）`);
    console.log(`=========================\n`);
});
