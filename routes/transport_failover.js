const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { normalizeMicrosoftLogin, DEFAULT_LOGIN_URL } = require('../utils/microsoftLogin');

module.exports = function registerTransportFailover(app, ctx) {
    const {
        transportBots,
        transportBotCommands,
        transportBotLoginUrls,
        transportBotErrors,
        localBotLastSeen,
        failoverActive,
        addLog,
        requireAuth,
        requireTransportAuth,
        adminIO,
        shopIO,
        BOTS_DIR,
        TRANSPORT_CONFIG_FILE,
        warehouse,
        saveWarehouse,
        rollbackTransportStock,
        recordPickupEvent,
        maintenanceState = { enabled: false, blockNewTasks: false, localSleepQueue: {} }
    } = ctx;

    const runtime = {};
    const LOCAL_TIMEOUT_MS = Number(process.env.TRANSPORT_LOCAL_TIMEOUT_MS || 45000);
    const ONLINE_WINDOW_MS = Number(process.env.TRANSPORT_ONLINE_WINDOW_MS || 60000);
    const benignProtocolNoiseLogAt = {};
    const manualStopTransportBots = new Set();
    const updateRestartTransportBots = new Set();

    addLog('[运输接管] transport_failover 路由已加载');

    function normalizeType(type) {
        return type === 'cloud' ? 'cloud' : 'local';
    }

    function runtimeId(type, botNum) {
        return `${normalizeType(type)}:bot${Number(botNum)}`;
    }

    function serializeTransportError(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value.message) return String(value.message);
        if (value.reason) return serializeTransportError(value.reason);
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

function isDuplicateLoginText(value) {
        return /duplicate_login|multiplayer\.disconnect\.duplicate_login/i.test(serializeTransportError(value));
    }

    function formatTransportError(value) {
        const text = serializeTransportError(value);
        if (/failed to obtain profile data|does the account own minecraft/i.test(text)) {
            return '当前微软账号没有可用的 Minecraft Java 档案。请换成已购买 Java 版的账号，或清缓存后重新登录正确账号。';
        }
        return text;
    }

    function isLocalRequest(req) {
        const remote = String(req.ip || req.socket?.remoteAddress || '');
        return remote === '127.0.0.1'
            || remote === '::1'
            || remote === '::ffff:127.0.0.1'
            || remote.endsWith(':127.0.0.1');
    }

    function requireLocalRequest(req, res) {
        if (isLocalRequest(req)) return true;
        res.status(403).json({ success: false, error: 'forbidden' });
        return false;
    }

    function ensureState(botNum) {
        const key = String(Number(botNum));
        if (!runtime[key]) {
            runtime[key] = {
                activeTask: null,
                pendingLocalResume: false,
                local: { online: false, busy: false, lastSeen: null, task: null },
                cloud: { online: false, busy: false, lastSeen: null, task: null }
            };
        }
        return runtime[key];
    }

    function taskCreatedAtMs(task) {
        const value = task?.createdAt ? Date.parse(task.createdAt) : NaN;
        return Number.isFinite(value) ? value : 0;
    }

    function clearStaleActiveTask(botNum) {
        const state = ensureState(botNum);
        if (!state.activeTask) return false;
        const anyBusy = Boolean(state.local.busy || state.local.task || state.cloud.busy || state.cloud.task);
        const activeAge = Date.now() - taskCreatedAtMs(state.activeTask);
        if (!anyBusy && activeAge > 120000) {
            const staleTask = state.activeTask;
            state.activeTask = null;
            state.local.busy = false;
            state.local.task = null;
            state.cloud.busy = false;
            state.cloud.task = null;
            addLog('[transport] cleared stale active task for bot' + botNum + ': ' + (staleTask.itemName || staleTask.displayName || staleTask.id));
            return true;
        }
        return false;
    }

    function loadTransportConfig() {
        try {
            if (fs.existsSync(TRANSPORT_CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(TRANSPORT_CONFIG_FILE, 'utf8'));
                config.bots = Array.isArray(config.bots) ? config.bots : [];
                return config;
            }
        } catch (error) {
            addLog(`[运输接管] 读取运输配置失败: ${error.message}`, 'error');
        }
        return { bots: [] };
    }

    function saveTransportConfig(config) {
        const dir = path.dirname(TRANSPORT_CONFIG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(TRANSPORT_CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    function findBotConfig(botNum, type) {
        const config = loadTransportConfig();
        const botType = normalizeType(type);
        return config.bots.find(bot => Number(bot.num) === Number(botNum) && normalizeType(bot.type) === botType)
            || (botType === 'cloud' ? config.bots.find(bot => Number(bot.num) === Number(botNum)) : null);
    }

    function hasLocalBotConfig(botNum) {
        const config = loadTransportConfig();
        return config.bots.some(bot => Number(bot.num) === Number(botNum) && normalizeType(bot.type) === 'local' && bot.status !== 'disabled');
    }

    function getBotAuthCacheDir(botNum, type, config) {
        const botType = normalizeType(type);
        if (config?.profilesFolder) return path.resolve(config.profilesFolder);
        return path.join(BOTS_DIR, '.auth-cache', botType, 'bot' + Number(botNum));
    }

    function setBotStatus(botNum, type, status) {
        const config = loadTransportConfig();
        const botType = normalizeType(type);
        const bot = config.bots.find(entry => Number(entry.num) === Number(botNum) && normalizeType(entry.type) === botType);
        if (!bot) return;
        bot.status = status;
        saveTransportConfig(config);
    }

    function takeQueuedCommands(botNum, type) {
        const botType = normalizeType(type);
        const key = String(Number(botNum));
        const commands = [];

        if (Array.isArray(transportBotCommands[key])) {
            commands.push(...transportBotCommands[key].splice(0));
        }

        if (Array.isArray(transportBotCommands)) {
            for (let index = transportBotCommands.length - 1; index >= 0; index--) {
                const item = transportBotCommands[index];
                if (!item || Number(item.botNum) !== Number(botNum)) continue;
                if (item.type && normalizeType(item.type) !== botType) continue;
                commands.unshift(item.cmd || item);
                transportBotCommands.splice(index, 1);
            }
        }

        return commands;
    }

    function queueCommand(botNum, command, type) {
        const key = String(Number(botNum));
        if (!transportBotCommands[key]) transportBotCommands[key] = [];
        transportBotCommands[key].push({ ...command, targetType: normalizeType(type) });
    }

    function maintenanceActive() {
        return Boolean(maintenanceState?.enabled);
    }

    function queueLocalSleep(botNum, reason = 'maintenance') {
        if (!maintenanceState.localSleepQueue) maintenanceState.localSleepQueue = {};
        maintenanceState.localSleepQueue[String(Number(botNum))] = { reason, queuedAt: Date.now() };
    }

    function hasUnfinishedTask(botNum) {
        const state = ensureState(botNum);
        return Boolean(state.activeTask || state.local.busy || state.local.task || state.cloud.busy || state.cloud.task);
    }

    function markFailover(botNum, task) {
        const state = ensureState(botNum);
        state.activeTask = task || state.activeTask || state.local.task || null;
        state.pendingLocalResume = true;
        failoverActive[botNum] = {
            active: true,
            startedAt: Date.now(),
            task: state.activeTask,
            sleepSent: false,
            reconnectLogged: false
        };
    }

    function clearFailoverIfIdle(botNum) {
        const state = ensureState(botNum);
        if (!failoverActive[botNum]?.active) return;
        if (state.cloud.busy || state.cloud.task || state.activeTask) return;

        failoverActive[botNum] = null;
        state.pendingLocalResume = false;
        addLog(`[运输接管] Bot #${botNum} 云端任务已空闲，允许本地恢复上线`);
    }

    function captureLoginUrl(botId, output) {
        const login = normalizeMicrosoftLogin(output);
        if (!login.hasLogin) return;
        const idMatch = String(botId || '').match(/^(local|cloud):bot(\d+)$/);
        if (idMatch) {
            const [, type, botNum] = idMatch;
            const slot = ensureState(botNum)[type];
            if (slot?.online || slot?.ready || transportBots[botId]?.status === 'running') {
                addLog(`[运输Bot ${botId}] 已在线，忽略迟到的 Microsoft 登录 URL`);
                return;
            }
        }

        const previous = transportBotLoginUrls[botId] || {};
        const url = login.hasUrl ? login.url : (previous.url || DEFAULT_LOGIN_URL);
        const code = login.hasCode ? login.code : (previous.code || '');

        transportBotLoginUrls[botId] = { url, code, message: login.message, time: new Date().toISOString() };
        adminIO.emit('transportBotLoginUrl', { botId, url, code, message: login.message });
    }

    function isBenignStderr(output) {
        const text = String(output || '');
        return /DeprecationWarning/i.test(text)
            || /\[DEP\d+\]/i.test(text)
            || /punycode module is deprecated/i.test(text)
            || /Use `node --trace-deprecation/i.test(text)
            || /PartialReadError/i.test(text)
            || /Read error for undefined/i.test(text)
            || /packet_world_particles/i.test(text)
            || /protodef[\\/]+src[\\/]+compiler\.js/i.test(text)
            || /duplicate_login|multiplayer\.disconnect\.duplicate_login/i.test(text)
            || /sessionserver\.mojang\.com\/session\/minecraft\/join|FetchError.*ETIMEDOUT|ETIMEDOUT.*sessionserver\.mojang\.com/i.test(text);
    }

    function logBenignStderr(botId, output) {
        const now = Date.now();
        const lastAt = benignProtocolNoiseLogAt[botId] || 0;
        if (now - lastAt < 60000) return;
        benignProtocolNoiseLogAt[botId] = now;
        const text = String(output || '');
        if (/PartialReadError|packet_world_particles|Read error for undefined|protodef[\\/]+src[\\/]+compiler\.js/i.test(text)) {
            addLog(`[TransportBot ${botId}][warning] 已过滤协议粒子包解析噪音（不影响业务，60秒内只提示一次）`, 'warn');
            return;
        }
        if (isDuplicateLoginText(text)) {
            addLog(`[TransportBot ${botId}][warning] 检测到重复登录踢出，已降级为重连提示（不弹启动错误）`, 'warn');
            return;
        }
        if (/sessionserver\.mojang\.com\/session\/minecraft\/join|FetchError.*ETIMEDOUT|ETIMEDOUT.*sessionserver\.mojang\.com/i.test(text)) {
            addLog(`[TransportBot ${botId}][warning] Mojang sessionserver 连接超时，已降级为自动重试提示（不弹启动错误）`, 'warn');
            return;
        }
        addLog(`[TransportBot ${botId}][warning] ${text.slice(0, 240)}`, 'warn');
    }

    function markBotSpawnedFromOutput(botNum, botType, botId, output) {
        const text = String(output || '');
        if (!/\[TRANSPORT_SPAWN_READY\]|\[transport-login\]|configuration\s*->\s*play|bot spawned and online/i.test(text)) return false;
        const slot = ensureState(botNum)[botType];
        slot.online = true;
        slot.ready = true;
        slot.lastSeen = Date.now();
        slot.lastError = '';
        setBotStatus(botNum, botType, 'running');
        delete transportBotErrors[botId];
        adminIO.emit('transportBotEvent', { botNum, type: botType, event: 'spawn', data: { source: 'stdout' } });
        return true;
    }

    function isTransportSlotOnline(botNum, type) {
        const botType = normalizeType(type);
        const botId = runtimeId(botType, botNum);
        const slot = ensureState(botNum)[botType];
        const running = Boolean(transportBots[botId]);
        return Boolean(running && slot.ready && slot.online);
    }

    function startTransportBot(botNum, type, reason = 'manual') {
        const botType = normalizeType(type);
        const botId = runtimeId(botType, botNum);
        const config = findBotConfig(botNum, botType);
        if (!config) {
            addLog(`[运输接管] 未找到 ${botId} 配置，无法启动`, 'error');
            return false;
        }
        if (transportBots[botId]) return true;

        delete transportBotErrors[botId];
        addLog(`[运输接管] 启动 ${botId}，原因: ${reason}`);

        const child = spawn(process.execPath, ['transport_bot.js', TRANSPORT_CONFIG_FILE, String(botNum)], {
            cwd: BOTS_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, BOT_TYPE: botType, NODE_NO_WARNINGS: process.env.NODE_NO_WARNINGS || '1' }
        });

        transportBots[botId] = child;
        setBotStatus(botNum, botType, 'starting');
        const state = ensureState(botNum)[botType];
        state.online = false;
        state.ready = false;
        state.lastSeen = null;
        state.lastError = '';

        child.stdout.on('data', data => {
            const output = data.toString().trim();
            if (!output) return;
            if (isBenignStderr(output)) {
                logBenignStderr(botId, output);
                return;
            }
            addLog(`[运输Bot ${botId}] ${output}`);
            markBotSpawnedFromOutput(botNum, botType, botId, output);
            if (/版本更新完成|更新完成.*重启|update complete/i.test(output)) {
                updateRestartTransportBots.add(botId);
            }
            adminIO.emit('botLog', { type: 'transport', botId, content: output });
            captureLoginUrl(botId, output);
        });

        child.stderr.on('data', data => {
            const output = data.toString().trim();
            if (!output) return;
            if (isBenignStderr(output)) {
                logBenignStderr(botId, output);
                return;
            }
            const formattedError = formatTransportError(output);
            addLog(`[运输Bot ${botId}][错误] ${formattedError}`, 'error');
            adminIO.emit('botLog', { type: 'transport', botId, content: '[错误] ' + formattedError });
            captureLoginUrl(botId, output);
            transportBotErrors[botId] = formattedError.slice(0, 300);
            adminIO.emit('transportBotError', { botId, error: transportBotErrors[botId] });
        });

        child.on('exit', code => {
            delete transportBots[botId];
            setBotStatus(botNum, botType, 'stopped');
            const state = ensureState(botNum);
            state[botType].online = false;
            state[botType].ready = false;
            state[botType].busy = false;
            state[botType].task = null;
            addLog(`[运输Bot ${botId}] 已退出，代码: ${code}`);
            const shouldRestartAfterUpdate = updateRestartTransportBots.has(botId) && !manualStopTransportBots.has(botId);
            updateRestartTransportBots.delete(botId);
            manualStopTransportBots.delete(botId);
            if (shouldRestartAfterUpdate) {
                addLog(`[运输Bot ${botId}] 版本更新退出，3 秒后自动重启`);
                setTimeout(() => startTransportBot(botNum, botType, 'updated-restart'), 3000);
            }
            clearFailoverIfIdle(botNum);
        });

        return true;
    }

    app.get('/api/admin/transport-bots', requireAuth, (req, res) => {
        const config = loadTransportConfig();
        const bots = config.bots.map(bot => {
            const type = normalizeType(bot.type);
            const id = runtimeId(type, bot.num);
            const state = ensureState(bot.num)[type];
            const lastSeenAgeMs = state.lastSeen ? Date.now() - state.lastSeen : null;
            const running = Boolean(transportBots[id]);
            const online = isTransportSlotOnline(bot.num, type);
            const status = online ? 'running' : (running ? 'starting' : 'stopped');
            return {
                ...bot,
                status,
                type,
                id,
                running,
                currentStatus: status,
                loginUrl: transportBotLoginUrls[id],
                lastError: formatTransportError(state.lastError || transportBotErrors[id]),
                failoverActive: Boolean(failoverActive[bot.num]?.active),
                online,
                mcOnline: online,
                ready: Boolean(state.ready),
                lastSeen: state.lastSeen,
                lastSeenAgeMs,
                connectionState: online ? 'spawned' : (running ? 'connecting' : 'stopped'),
                busy: state.busy,
                task: state.task
            };
        });
        res.json(bots);
    });

    app.post('/api/internal/transport/wake', (req, res) => {
        if (!requireLocalRequest(req, res)) return;
        const botNum = Number(req.body.botNum || 1);
        const type = normalizeType(req.body.type || 'local');
        const id = runtimeId(type, botNum);
        const started = transportBots[id] ? true : startTransportBot(botNum, type, req.body.reason || 'task-queued');
        res.json({ success: started, botId: id });
    });

    app.post('/api/internal/transport/assign', (req, res) => {
        if (!requireLocalRequest(req, res)) return;

        const task = req.body?.task;
        if (!task?.id) return res.json({ success: false, error: 'missing task' });

        const config = loadTransportConfig();
        const candidates = config.bots
            .filter(bot => bot && bot.status !== 'disabled')
            .map(bot => ({ ...bot, type: normalizeType(bot.type) }))
            .sort((a, b) => Number(a.num) - Number(b.num) || (a.type === 'local' ? -1 : 1));

        for (const candidate of candidates) {
            const botNum = Number(candidate.num);
            const type = normalizeType(candidate.type);
            clearStaleActiveTask(botNum);
            const state = ensureState(botNum);
            const slot = state[type];
            const online = isTransportSlotOnline(botNum, type);
            const busy = Boolean(slot.busy || slot.task || state.activeTask);
            const cloudAllowed = type !== 'cloud' || !hasLocalBotConfig(botNum) || Boolean(failoverActive[botNum]?.active);
            if (!online || busy || !cloudAllowed) continue;

            const assignedTask = { ...task, botNum, botType: type, status: 'RESERVED_FOR_HANDOFF' };
            state.activeTask = assignedTask;
            slot.busy = true;
            slot.task = assignedTask;
            queueCommand(botNum, { cmd: 'PREPARE_HANDOFF', payload: { durationMs: 90000, taskId: assignedTask.id } }, type);
            addLog('[transport] reserved ' + type + ':bot' + botNum + ' for handoff: ' + (task.displayName || task.itemName) + ' x' + task.quantity + ' -> ' + task.playerName);
            return res.json({
                success: true,
                assigned: true,
                botNum,
                botType: type,
                botName: candidate.gameName || candidate.playerName || candidate.username || candidate.name || (candidate.email ? String(candidate.email).split('@')[0] : '') || 'bot' + botNum,
                task: assignedTask
            });
        }

        const wakeCandidate = candidates.find(candidate => normalizeType(candidate.type) === 'local') || candidates.find(candidate => normalizeType(candidate.type) === 'cloud');
        if (wakeCandidate) startTransportBot(Number(wakeCandidate.num), normalizeType(wakeCandidate.type), 'waiting-transport-task');
        res.json({ success: true, assigned: false, retryAfterMs: 1000, error: '暂无空闲运输 Bot，等待中' });
    });

    app.post('/api/internal/transport/handoff-ready', (req, res) => {
        if (!requireLocalRequest(req, res)) return;
        const task = req.body?.task;
        const botNum = Number(task?.botNum);
        const type = normalizeType(task?.botType);
        if (!task?.id || !botNum) return res.json({ success: false, error: 'missing assigned task' });
        const state = ensureState(botNum);
        const slot = state[type];
        const readyTask = { ...task, status: 'WAITING_PICKUP' };
        state.activeTask = readyTask;
        slot.busy = true;
        slot.task = readyTask;
        queueCommand(botNum, { cmd: 'TRANSPORT', payload: readyTask }, type);
        addLog('[transport] handoff ready, command sent to ' + type + ':bot' + botNum + ': ' + task.itemName + ' x' + task.quantity);
        res.json({ success: true });
    });

    app.post('/api/internal/transport/release', (req, res) => {
        if (!requireLocalRequest(req, res)) return;
        const botNum = Number(req.body?.botNum);
        const type = normalizeType(req.body?.botType);
        if (!botNum) return res.json({ success: false, error: 'missing botNum' });
        const state = ensureState(botNum);
        state[type].busy = false;
        state[type].task = null;
        state.activeTask = null;
        addLog('[transport] reservation released ' + type + ':bot' + botNum + ': ' + (req.body?.reason || ''));
        res.json({ success: true });
    });
    app.post('/api/admin/transport-bots/:id/start', requireAuth, (req, res) => {
        const match = req.params.id.match(/^(?:(local|cloud):)?bot(\d+)$/);
        if (!match) return res.json({ success: false, error: '无效的 Bot ID' });
        const type = normalizeType(match[1] || req.body?.type);
        const botNum = Number(match[2]);
        const started = startTransportBot(botNum, type, 'admin');
        res.json({ success: started, error: started ? undefined : '启动失败，请检查运输 Bot 配置' });
    });

    app.post('/api/admin/transport-bots/:id/stop', requireAuth, (req, res) => {
        const match = req.params.id.match(/^(?:(local|cloud):)?bot(\d+)$/);
        if (!match) return res.json({ success: false, error: '无效的 Bot ID' });
        const type = normalizeType(match[1] || req.body?.type);
        const botNum = Number(match[2]);
        const id = runtimeId(type, botNum);
        manualStopTransportBots.add(id);
        if (transportBots[id]) {
            transportBots[id].kill();
            delete transportBots[id];
        }
        setBotStatus(botNum, type, 'stopped');
        res.json({ success: true });
    });

    app.post('/api/admin/transport-bots/:id/reset-login', requireAuth, (req, res) => {
        const match = req.params.id.match(/^(?:(local|cloud):)?bot(\d+)$/);
        if (!match) return res.json({ success: false, error: 'invalid bot id' });
        const type = normalizeType(match[1] || req.body?.type);
        const botNum = Number(match[2]);
        const id = runtimeId(type, botNum);
        const config = findBotConfig(botNum, type);
        if (!config) return res.json({ success: false, error: 'bot config not found' });

        if (transportBots[id]) {
            transportBots[id].kill();
            delete transportBots[id];
        }

        const authDir = getBotAuthCacheDir(botNum, type, config);
        try {
            if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
            delete transportBotLoginUrls[id];
            delete transportBotErrors[id];
            setBotStatus(botNum, type, 'stopped');
            const started = startTransportBot(botNum, type, 'reset-login');
            addLog('[transport-auth] reset login cache for ' + id + ': ' + authDir);
            res.json({ success: started, authDir, message: started ? 'login cache cleared, bot restarted' : 'login cache cleared, restart failed' });
        } catch (error) {
            addLog('[transport-auth] reset login cache failed for ' + id + ': ' + error.message, 'error');
            res.json({ success: false, error: error.message });
        }
    });

    app.post('/api/admin/transport-bots/:id/command', requireAuth, (req, res) => {
        const match = req.params.id.match(/^(?:(local|cloud):)?bot(\d+)$/);
        if (!match) return res.json({ success: false, error: '无效的 Bot ID' });
        if (!req.body?.command) return res.json({ success: false, error: '请输入命令' });
        const type = normalizeType(match[1] || req.body?.type);
        const botNum = Number(match[2]);
        const botId = runtimeId(type, botNum);
        const state = ensureState(botNum)[type];
        if (!isTransportSlotOnline(botNum, type)) {
            return res.json({ success: false, error: '运输 Bot 未进服，不能发送游戏命令。请等待状态变为“已进服”后再发送。' });
        }
        queueCommand(botNum, { cmd: 'CMD', payload: { command: req.body.command } }, type);
        addLog(`[运输接管] 发送命令给 ${type}:bot${botNum}: ${req.body.command}`);
        res.json({ success: true });
    });

    app.post('/api/bot/start-permission', requireTransportAuth, (req, res) => {
        const botNum = Number(req.body.botNum);
        const type = normalizeType(req.body.type);
        if (!botNum) return res.json({ success: false, allowed: false, reason: '缺少 botNum' });

        const state = ensureState(botNum);
        const failover = failoverActive[botNum];

        if (maintenanceActive() && type === 'local') {
            const hasTask = Boolean(state.activeTask || state.local.busy || state.local.task);
            return res.json({
                success: true,
                allowed: false,
                retryAfterMs: hasTask ? 10000 : 30000,
                reason: hasTask ? '维护模式：本地 Bot 等当前任务结束后休眠' : '维护模式：本地 Bot 暂停上线'
            });
        }

        if (type === 'cloud') {
            const cloudAsPrimary = !hasLocalBotConfig(botNum);
            const allowed = cloudAsPrimary || Boolean(failover?.active && hasUnfinishedTask(botNum));
            return res.json({
                success: true,
                allowed,
                reason: cloudAsPrimary ? '未配置本地 Bot，允许云端 Bot 作为主用上线' : (allowed ? '本地掉线且存在未完成任务，允许云端接管' : '无未完成任务，不允许云端抢登录')
            });
        }

        if (failover?.active && (state.cloud.busy || state.cloud.task || state.activeTask)) {
            state.pendingLocalResume = true;
            return res.json({
                success: true,
                allowed: false,
                retryAfterMs: 10000,
                reason: '云端正在处理接管任务，本地等待云端空闲'
            });
        }

        res.json({ success: true, allowed: true, reason: '允许本地主用上线' });
    });

    app.post('/api/bot/heartbeat', requireTransportAuth, (req, res) => {
        const botNum = Number(req.body.botNum);
        const type = normalizeType(req.body.type);
        if (!botNum) return res.json({ success: false, error: '缺少 botNum' });

        const state = ensureState(botNum);
        const slot = state[type];
        slot.ready = req.body.ready === true;
        slot.lastError = formatTransportError(req.body.lastError);
        slot.online = slot.ready;
        slot.lastSeen = Date.now();
        slot.busy = Boolean(req.body.busy || req.body.task);
        slot.task = req.body.task || null;
        setBotStatus(botNum, type, slot.ready ? 'running' : 'starting');

        if (type === 'local') localBotLastSeen[botNum] = slot.lastSeen;
        if (slot.busy || slot.task) state.activeTask = slot.task || state.activeTask;
        else clearStaleActiveTask(botNum);

        const response = { success: true };

        if (maintenanceActive() && type === 'local') {
            const hasTask = Boolean(slot.busy || slot.task || state.activeTask);
            response.maintenanceMode = true;
            response.blockNewTasks = true;
            if (!hasTask || maintenanceState.localSleepQueue?.[String(botNum)]) {
                response.command = 'FORCE_SLEEP';
                response.reason = '维护模式：云端更新中，本地 Bot 空闲后强制休眠';
                queueLocalSleep(botNum, 'maintenance-idle');
                failoverActive[botNum] = {
                    ...(failoverActive[botNum] || {}),
                    active: true,
                    maintenance: true,
                    sleepSent: true,
                    reconnectLogged: Boolean(failoverActive[botNum]?.reconnectLogged)
                };
            }
        }

        if (type === 'local' && failoverActive[botNum]?.active && (state.cloud.busy || state.cloud.task || state.activeTask)) {
            response.command = 'FORCE_SLEEP';
            response.reason = '云端正在接管未完成任务';
            failoverActive[botNum].sleepSent = true;
        }

        if (type === 'cloud' && !slot.busy && !slot.task) {
            state.activeTask = null;
            clearFailoverIfIdle(botNum);
        }

        res.json(response);
    });

    app.get('/api/bot/commands/:botNum', requireTransportAuth, (req, res) => {
        const botNum = Number(req.params.botNum);
        const type = normalizeType(req.query.type);
        const state = ensureState(botNum);
        const commands = takeQueuedCommands(botNum, type)
            .filter(command => !command.targetType || normalizeType(command.targetType) === type)
            .filter(command => !maintenanceActive() || type !== 'local' || command.cmd !== 'TRANSPORT');

        if (maintenanceActive() && type === 'local') {
            const hasTask = Boolean(state.activeTask || state.local.busy || state.local.task);
            if (!hasTask) {
                queueLocalSleep(botNum, 'maintenance-command-poll');
                commands.push({ cmd: 'FORCE_SLEEP', payload: { reason: 'maintenance' } });
            }
        }

        if (type === 'cloud' && failoverActive[botNum]?.active && state.activeTask) {
            const hasTransport = commands.some(command => command.cmd === 'TRANSPORT');
            if (!hasTransport) commands.push({ cmd: 'TRANSPORT', payload: state.activeTask });
        }

        const transportCommand = commands.find(command => command.cmd === 'TRANSPORT');
        if (transportCommand) {
            state.activeTask = transportCommand.payload;
            state[type].busy = true;
            state[type].task = transportCommand.payload;
        }

        res.json({ success: true, commands });
    });

    app.post('/api/bot/transport/complete', requireTransportAuth, (req, res) => {
        const botNum = Number(req.body.botNum);
        const type = normalizeType(req.body.type);
        const state = ensureState(botNum);
        state[type].busy = false;
        state[type].task = null;
        state.activeTask = null;
        if (!req.body.success && typeof rollbackTransportStock === 'function') {
            rollbackTransportStock(req.body.taskId, req.body.itemName, req.body.quantity, req.body.error || 'transport delivery failed');
        }
        if (typeof recordPickupEvent === 'function') {
            recordPickupEvent(req.body.success ? 'completed' : 'failed', {
                taskId: req.body.taskId,
                playerName: req.body.playerName,
                itemName: req.body.itemName,
                quantity: req.body.quantity,
                success: Boolean(req.body.success),
                error: req.body.error || '',
                botNum,
                botType: type
            });
        }
        if (maintenanceActive() && type === 'local') queueLocalSleep(botNum, 'maintenance-completed');
        addLog(`[运输接管] Bot #${botNum}(${type}) 任务${req.body.success ? '完成' : '失败'}: ${req.body.playerName || ''}`);
        clearFailoverIfIdle(botNum);
        res.json({ success: true });
    });

    app.post('/api/bot/report', requireTransportAuth, (req, res) => {
        const botNum = Number(req.body.botNum);
        const type = normalizeType(req.body.type);
        const event = req.body.event;
        if (botNum) {
            const state = ensureState(botNum);
            const slot = state[type];
            slot.lastSeen = Date.now();
            if (event === 'spawn') {
                slot.online = true;
                slot.ready = true;
                slot.lastError = '';
                setBotStatus(botNum, type, 'running');
                const botId = runtimeId(type, botNum);
                delete transportBotLoginUrls[botId];
                adminIO.emit('transportBotLoginUrl', { botId, url: '', code: '', cleared: true });
            }
            if (event === 'disconnect') {
                slot.online = false;
                slot.ready = false;
                slot.busy = false;
                slot.task = null;
            }
            if (event === 'error' || event === 'kicked') {
                slot.online = false;
                slot.ready = false;
                slot.lastError = formatTransportError(req.body.data?.message || req.body.data?.reason || event);
                setBotStatus(botNum, type, 'starting');
            }
        }
        adminIO.emit('transportBotEvent', { botNum, type, event, data: req.body.data || null });
        res.json({ success: true });
    });

    app.get('/api/admin/bot/failover-status', requireAuth, (req, res) => {
        for (const botNum of Object.keys(runtime)) clearStaleActiveTask(botNum);
        const botList = Object.entries(runtime).map(([botNum, state]) => ({
            botNum: Number(botNum),
            localOnline: Boolean(state.local.ready && state.local.online && state.local.lastSeen && Date.now() - state.local.lastSeen < ONLINE_WINDOW_MS),
            cloudOnline: Boolean(state.cloud.ready && state.cloud.online && state.cloud.lastSeen && Date.now() - state.cloud.lastSeen < ONLINE_WINDOW_MS),
            localBusy: state.local.busy,
            cloudBusy: state.cloud.busy,
            failoverActive: Boolean(failoverActive[botNum]?.active),
            pendingLocalResume: state.pendingLocalResume,
            activeTask: state.activeTask
        }));
        res.json({ success: true, failover: failoverActive, runtime, botList });
    });

    app.post('/api/admin/bot/:botNum/trigger-failover', requireAuth, (req, res) => {
        const botNum = Number(req.params.botNum);
        const state = ensureState(botNum);
        markFailover(botNum, state.activeTask || state.local.task || req.body.task || null);
        const started = startTransportBot(botNum, 'cloud', 'manual-failover');
        res.json({ success: started, failover: failoverActive[botNum] });
    });

    app.post('/api/admin/bot/:botNum/force-sleep', requireAuth, (req, res) => {
        const botNum = Number(req.params.botNum);
        markFailover(botNum, req.body.task || null);
        res.json({ success: true, failover: failoverActive[botNum] });
    });

    setInterval(() => {
        const now = Date.now();
        for (const [botNum, state] of Object.entries(runtime)) {
            const localTimedOut = state.local.lastSeen && now - state.local.lastSeen > LOCAL_TIMEOUT_MS;
            if (!localTimedOut || failoverActive[botNum]?.active) continue;

            state.local.online = false;
            if (!hasUnfinishedTask(botNum)) {
                addLog(`[运输接管] Bot #${botNum} 本地离线但无任务，不启动云端`);
                continue;
            }

            markFailover(botNum, state.activeTask || state.local.task);
            startTransportBot(Number(botNum), 'cloud', 'local-timeout');
        }
    }, 5000);
};
