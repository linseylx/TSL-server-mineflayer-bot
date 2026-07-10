const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const mineflayer = require('mineflayer');
const autoUpdater = require('./auto_updater');
const autoResourcePack = require('../autoResourcePack');
const { normalizeMicrosoftLogin, formatLoginInstruction } = require('./login_parser');

let GLOBAL_CONFIG = {};
let BOT_CONFIG = {};
let BOT_NUM = 0;
let BOT_TYPE = process.env.BOT_TYPE || 'local';
let bot = null;
let reconnecting = false;
let shuttingDown = false;
let pollTimer = null;
let heartbeatTimer = null;
let updateCheckTimer = null;
let isUpdating = false;
let currentTask = null;
let deliveryTeleportConfirm = { playerName: '', at: 0 };
let hasSpawned = false;
let lastFatalLoginError = '';
let chatQueue = Promise.resolve();
let lastChatSentAt = 0;
const recentChatCommands = new Map();

function transportHeaders() {
    const token = BOT_CONFIG.transportToken || GLOBAL_CONFIG.transportToken || process.env.TRANSPORT_TOKEN || '';
    return token ? { 'X-Transport-Token': String(token) } : {};
}

process.on('uncaughtException', (err) => {
    const message = formatTransportError(err);
    if (isTransientSessionJoinError(message)) console.log('[transport-network] ' + message);
    else console.error('[寮傚父]', message);
});

process.on('unhandledRejection', (err) => {
    const message = formatTransportError(err);
    if (isTransientSessionJoinError(message)) console.log('[transport-network] ' + message);
    else console.error('[unhandled-rejection]', message);
});

function adminBase() {
    const baseUrl = BOT_CONFIG.mainBaseUrl || GLOBAL_CONFIG.mainBaseUrl;
    if (baseUrl) return String(baseUrl).replace(/\/+$/, '');
    if (BOT_TYPE === 'cloud') {
        const cloudAdminPort = BOT_CONFIG.mainAdminPort
            || GLOBAL_CONFIG.mainAdminPort
            || BOT_CONFIG.adminPort
            || GLOBAL_CONFIG.adminPort
            || 28474;
        return `http://127.0.0.1:${cloudAdminPort}`;
    }
    const configuredPort = BOT_CONFIG.mainAdminPort
        || GLOBAL_CONFIG.mainAdminPort
        || BOT_CONFIG.adminPort
        || GLOBAL_CONFIG.adminPort
        || BOT_CONFIG.mainPort
        || GLOBAL_CONFIG.mainPort
        || 28474;
    const port = Number(configuredPort) === 28473 ? 28474 : configuredPort;
    const host = BOT_CONFIG.mainHost || GLOBAL_CONFIG.mainHost || 'localhost';
    return `http://${host}${port ? ':' + port : ''}`;
}

async function reportEvent(event, data = null) {
    try {
        await axios.post(`${adminBase()}/api/bot/report`, {
            botNum: BOT_NUM,
            type: BOT_TYPE,
            event,
            data
        }, { timeout: 5000, headers: transportHeaders() });
    } catch (err) {
        console.log(`[HTTP] 涓婃姤澶辫触 (${event}): ${err.message}`);
    }
}

function serializeError(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.message) return String(value.message);
    if (value.reason) return serializeError(value.reason);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function isDuplicateLoginError(value) {
    return /duplicate_login|multiplayer\.disconnect\.duplicate_login/i.test(serializeError(value));
}

function isMinecraftProfileError(value) {
    return /failed to obtain profile data|does the account own minecraft/i.test(serializeError(value));
}

function isTransientSessionJoinError(value) {
    const text = serializeError(value);
    return /Mojang sessionserver 杩炴帴瓒呮椂/i.test(text)
        || /sessionserver\.mojang\.com\/session\/minecraft\/join/i.test(text)
        || (/FetchError|ETIMEDOUT|ECONNRESET|EAI_AGAIN|ENOTFOUND/i.test(text)
            && /sessionserver\.mojang\.com|minecraft\/join/i.test(text));
}

function formatTransportError(value) {
    const text = serializeError(value);
    if (isTransientSessionJoinError(text)) {
        return 'Mojang sessionserver temporary timeout; bot will retry automatically.';
    }
    if (isMinecraftProfileError(text)) {
        return 'This Microsoft account has no Minecraft Java profile. Use an account that owns Java Edition or reset login cache.';
    }
    return text || 'unknown error';
}

async function requestStartPermission() {
    if (!BOT_CONFIG.mainHost && !GLOBAL_CONFIG.mainHost) return true;
    const token = BOT_CONFIG.transportToken || GLOBAL_CONFIG.transportToken || process.env.TRANSPORT_TOKEN || '';
    if (!token) {
        console.error('[transport-auth] transportToken is missing. Set transportToken in core/transport/config.json or TRANSPORT_TOKEN before starting a remote transport bot.');
        return false;
    }

    try {
        console.log(`[鍚姩鎺у埗] 璇锋眰鐧诲綍鏉? ${adminBase()}/api/bot/start-permission`);
        const resp = await axios.post(`${adminBase()}/api/bot/start-permission`, {
            botNum: BOT_NUM,
            type: BOT_TYPE
        }, { timeout: 5000, headers: transportHeaders() });

        if (resp.data?.allowed) {
            console.log(`[鍚姩鎺у埗] 宸茶幏寰楃櫥褰曟潈: ${resp.data?.reason || '鍏佽鍚姩'}`);
            return true;
        }

        console.log(`[鍚姩鎺у埗] 鏈幏寰楃櫥褰曟潈: ${resp.data?.reason || '浜戠鎷掔粷'}`);
        return false;
    } catch (err) {
        const status = err.response?.status;
        const serverError = err.response?.data?.error;
        const message = status ? `${err.message}: ${serverError || 'HTTP ' + status}` : err.message;
        console.log(`[鍚姩鎺у埗] 鏃犳硶纭鐧诲綍鏉? ${message}`);
        if (status === 403) {
            console.error('[transport-auth] Remote transport authentication was rejected. Copy the cloud transport_token.txt value into local core/transport/config.json as transportToken.');
        }
        return false;
    }
}

async function pollCommands() {
    try {
        const resp = await axios.get(`${adminBase()}/api/bot/commands/${BOT_NUM}?type=${encodeURIComponent(BOT_TYPE)}`, {
            timeout: 5000,
            headers: transportHeaders()
        });
        const commands = resp.data?.commands || [];
        for (const item of commands) {
            await handleCommand(item.cmd, item.payload);
        }
    } catch {}
}

async function handleCommand(cmd, payload) {
    console.log(`[鍛戒护] 鏀跺埌: ${cmd}`);
    if (cmd === 'CMD' && payload?.command) {
        if (payload.command === '__cleanup_inventory__') {
            await cleanupInventoryForTask({}, '');
            await reportEvent('command_executed', { command: payload.command });
            return;
        }
        if (bot) {
            await sendChat(payload.command);
            await reportEvent('command_executed', { command: payload.command });
        }
        return;
    }

    if (cmd === 'PREPARE_HANDOFF') {
        const durationMs = Number(payload?.durationMs || 90000);
        console.log('[transport] handoff prepared; waiting for one explicit teleport request, timeout=' + durationMs + 'ms');
        await reportEvent('handoff_prepare', { durationMs });
        return;
    }

    if (cmd === 'STOP' || cmd === 'FORCE_SLEEP') {
        shutdown(cmd === 'FORCE_SLEEP' ? (payload?.reason || 'cloud force sleep') : 'stop command received');
        return;
    }

    if (cmd === 'TRANSPORT' && payload) {
        await handleTransportTask(payload);
    }
}

async function handleTransportTask(task) {
    if (!bot) return;

    currentTask = task;
    const { playerName, itemName } = task;
    const quantity = Number(task.quantity || 0);
    console.log('[transport] chest pickup task: ' + itemName + ' x' + quantity + ' -> ' + playerName);
        reportEvent('transport_start', { taskId: task.id, playerName, itemName, quantity, mode: 'chest_pickup' }).catch(() => {});

    try {
        if (!itemName || quantity <= 0) throw new Error('transport task invalid');
        const existingTargetCount = inventoryCount(itemName);
        const allowUseExistingInventory = task?.allowUseExistingInventory === true;
        const needFromChest = allowUseExistingInventory ? Math.max(0, quantity - existingTargetCount) : quantity;
        if (needFromChest > 0 && inventoryHasNonTaskItems(itemName)) {
            console.log('[transport] inventory has non-task items before pickup, cleaning first: target=' + itemName + ', snapshot=' + inventorySnapshot());
            await cleanupInventoryForTask(task, itemName);
        }
        if (existingTargetCount > 0) {
            console.log('[transport] existing target items in inventory: ' + itemName + ' x' + existingTargetCount + ', allowUseExistingInventory=' + allowUseExistingInventory + ', needFromChest=' + needFromChest);
        }
        if (needFromChest > 0 && inventoryCapacityForItem(itemName) < needFromChest) {
            console.log('[transport] inventory capacity is not enough for task, cleaning first: need=' + needFromChest + ', capacity=' + inventoryCapacityForItem(itemName) + ', snapshot=' + inventorySnapshot());
            await cleanupInventoryForTask(task, itemName);
            const capacityAfterCleanup = inventoryCapacityForItem(itemName);
            if (capacityAfterCleanup < needFromChest) {
                throw new Error('transport inventory capacity not enough after cleanup, need=' + needFromChest + ', capacity=' + capacityAfterCleanup + ', snapshot=' + inventorySnapshot());
            }
        }
        if (needFromChest > 0) await prepareWarehousePositionForTask(task);
        const sourceCount = getTaskSources(task).length;
        const pickupTimeoutMs = Math.min(Math.max(sourceCount * 12000 + 10000, 30000), 120000);
        const taken = needFromChest > 0
            ? await withTimeout(withdrawItemsForTask(task, itemName, needFromChest), pickupTimeoutMs, 'pickup timed out, please rescan warehouse')
            : 0;
        if (taken < needFromChest) {
            throw new Error('not enough items in chests, missing ' + (needFromChest - taken) + ', please rescan warehouse');
        }
        const expectedCarried = existingTargetCount + needFromChest;
        const carried = await waitForInventoryAtLeast(itemName, expectedCarried, 2500);
        if (carried < expectedCarried) {
            throw new Error('inventory did not receive enough items after withdraw, carried=' + carried + '/' + expectedCarried + ', snapshot=' + inventorySnapshot());
        }
        console.log('[transport] ready to deliver exact quantity: ' + itemName + ' x' + quantity + ', existing=' + existingTargetCount + ', withdrawn=' + taken + ', carried=' + carried);
        reportEvent('transport_ready_to_tpa', { taskId: task.id, playerName, itemName, quantity, carried }).catch(() => {});

        const deliveryTpaTimeoutMs = Number(BOT_CONFIG.deliveryTpaTimeoutMs || GLOBAL_CONFIG.deliveryTpaTimeoutMs || 240000);
        await requestTeleportToPlayer(playerName, deliveryTpaTimeoutMs, 6);

        await throwItemsToPlayer(playerName, itemName, quantity);
        await reportTransportComplete(true, playerName, itemName, quantity, null, task.id);
    } catch (err) {
        console.log('[transport] failed: ' + err.message);
        reportEvent('transport_failed', { taskId: task.id, playerName, itemName, quantity, error: err.message }).catch(() => {});
        await reportTransportComplete(false, playerName, itemName, quantity, err.message, task.id);
    } finally {
        currentTask = null;
        if (BOT_TYPE === 'cloud') {
            shutdown('cloud task finished');
        }
    }
}

function getTaskSources(task) {
    const list = Array.isArray(task?.sourceLocations) && task.sourceLocations.length > 0
        ? task.sourceLocations
        : (task?.sourceLocation ? [task.sourceLocation] : []);
    const maxSources = Math.max(1, Number(task?.maxSourceAttempts || BOT_CONFIG.maxSourceAttempts || GLOBAL_CONFIG.maxSourceAttempts || 4));
    return list
        .filter(source => Number.isFinite(Number(source?.x)) && Number.isFinite(Number(source?.y)) && Number.isFinite(Number(source?.z)))
        .slice(0, maxSources);
}

function sourceKey(source) {
    return `${Number(source.x)},${Number(source.y)},${Number(source.z)}`;
}

function nearbySourceCandidates(task, sources) {
    const base = sources[0] || task?.sourceLocation;
    if (!base) return [];
    const region = task?.scanRegion || {};
    const baseX = Number(base.x);
    const baseY = Number(base.y);
    const baseZ = Number(base.z);
    const minX = Number.isFinite(Number(region.startX)) ? Math.min(Number(region.startX), Number(region.endX)) : baseX - 8;
    const maxX = Number.isFinite(Number(region.endX)) ? Math.max(Number(region.startX), Number(region.endX)) : baseX + 8;
    const minY = Number.isFinite(Number(region.minY)) ? Math.min(Number(region.minY), Number(region.maxY)) : baseY - 1;
    const maxY = Number.isFinite(Number(region.maxY)) ? Math.max(Number(region.minY), Number(region.maxY)) : baseY + 3;
    const z = Number.isFinite(Number(region.z)) ? Number(region.z) : baseZ;
    const candidates = [];
    const seen = new Set(sources.map(sourceKey));
    const xValues = [];
    for (let offset = 0; offset <= 10; offset += 1) {
        for (const x of [baseX - offset, baseX + offset]) {
            if (x < minX || x > maxX || xValues.includes(x)) continue;
            xValues.push(x);
        }
    }
    for (const x of xValues) {
        for (let y = maxY; y >= minY; y -= 1) {
            const source = { x, y, z };
            const key = sourceKey(source);
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push(source);
        }
    }
    return candidates.slice(0, 80);
}

async function withdrawItemsForTask(task, itemName, quantity) {
    const sources = getTaskSources(task);
    if (sources.length === 0) throw new Error('no chest source location, please rescan warehouse');
    let remaining = quantity;
    let totalTaken = 0;
    for (const source of sources) {
        if (remaining <= 0) break;
        const taken = await withdrawFromChest(source, itemName, remaining);
        remaining -= taken;
        totalTaken += taken;
    }
    if (remaining > 0) {
        const allowNearbySearch = task?.allowNearbySearch === true;
        if (!allowNearbySearch) {
            console.log('[transport] recorded sources are not enough, stop instead of wandering: ' + itemName + ', missing=' + remaining);
            reportEvent('transport_stock_missing', { taskId: task?.id, itemName, missing: remaining, sources }).catch(() => {});
            return totalTaken;
        }
        console.log('[transport] task sources are not enough, searching nearby chests for ' + itemName + ', missing=' + remaining);
        reportEvent('transport_nearby_search', { taskId: task?.id, itemName, missing: remaining, sources }).catch(() => {});
        for (const source of nearbySourceCandidates(task, sources)) {
            if (remaining <= 0) break;
            let taken = 0;
            try {
                taken = await withdrawFromChest(source, itemName, remaining, { optional: true });
            } catch (err) {
                console.log('[transport] nearby chest skipped: (' + source.x + ',' + source.y + ',' + source.z + ') ' + err.message);
            }
            if (taken > 0) {
                console.log('[transport] nearby chest matched stale inventory: (' + source.x + ',' + source.y + ',' + source.z + ') ' + itemName + ' x' + taken);
                remaining -= taken;
                totalTaken += taken;
            }
        }
    }
    return totalTaken;
}

async function reportTransportComplete(success, playerName, itemName, quantity, error, taskId) {
    try {
        await axios.post(`${adminBase()}/api/bot/transport/complete`, {
            taskId,
            botNum: BOT_NUM,
            type: BOT_TYPE,
            success,
            playerName,
            itemName: currentTask?.stockItemName || itemName,
            deliveredItemName: itemName,
            stockItemName: currentTask?.stockItemName,
            requestedQuantity: currentTask?.requestedQuantity,
            quantity,
            error
        }, { timeout: 5000, headers: transportHeaders() });
    } catch (err) {
        console.log(`[HTTP] 涓婃姤杩愯緭瀹屾垚澶辫触: ${err.message}`);
    }
}

async function withdrawFromChest(sourceLocation, itemName, quantity, options = {}) {
    if (!bot?.entity) throw new Error('transport bot not ready');
    const Vec3 = require('vec3').Vec3;
    const chestCenter = new Vec3(Number(sourceLocation.x) + 0.5, Number(sourceLocation.y) + 0.5, Number(sourceLocation.z) + 0.5);
    const currentDistance = bot.entity.position.distanceTo(chestCenter);
    if (currentDistance > 4.6) {
        const stand = getChestStandPosition(sourceLocation);
        console.log('[transport] moving to chest stand position: chest=(' + sourceLocation.x + ',' + sourceLocation.y + ',' + sourceLocation.z + ') stand=(' + stand.x + ',' + stand.y + ',' + stand.z + ')');
        let moved = await moveToPosition(stand.x + 0.5, stand.y, stand.z + 0.5, { timeoutMs: 15000, minTimeoutMs: 2500, range: 0.85 });
        await sleep(40);
        let afterMoveDistance = bot.entity.position.distanceTo(chestCenter);
        if (!moved || afterMoveDistance > 4.6) {
            const legacyStand = { x: Number(sourceLocation.x), y: Number(sourceLocation.y), z: Number(sourceLocation.z) + 1 };
            console.log('[transport] primary chest stand failed, retrying 2.2.9 stand: (' + legacyStand.x + ',' + legacyStand.y + ',' + legacyStand.z + ')');
            moved = await moveToPosition(legacyStand.x, legacyStand.y, legacyStand.z, { timeoutMs: 8000, minTimeoutMs: 1200, range: 1.2 });
            await sleep(80);
            afterMoveDistance = bot.entity.position.distanceTo(chestCenter);
        }
        if (!moved || afterMoveDistance > 4.6) {
            const message = `鏈埌杈剧瀛愬彲浜や簰璺濈: target=(${sourceLocation.x},${sourceLocation.y},${sourceLocation.z}) distance=${afterMoveDistance.toFixed(2)}`;
            if (options.optional) {
                console.log('[transport] ' + message);
                return 0;
            }
            throw new Error(message);
        }
    } else {
        console.log('[transport] already near source chest, open directly, distance=' + currentDistance.toFixed(2));
    }
    const chestPos = new Vec3(Number(sourceLocation.x), Number(sourceLocation.y), Number(sourceLocation.z));
    const chestBlock = bot.blockAt(chestPos);
    if (!chestBlock) {
        if (options.optional) return 0;
        throw new Error(`鏈壘鍒扮瀛? (${sourceLocation.x},${sourceLocation.y},${sourceLocation.z})`);
    }
    if (!['chest', 'trapped_chest', 'barrel'].includes(chestBlock.name) && !String(chestBlock.name || '').endsWith('shulker_box')) {
        if (options.optional) return 0;
        throw new Error(`鐩爣鏂瑰潡涓嶆槸瀹瑰櫒: ${chestBlock.name}`);
    }

    const finalDistance = bot.entity.position.distanceTo(chestCenter);
    if (finalDistance > 4.6) {
        const message = `寮€绠卞墠璺濈杩囪繙锛屽凡鍙栨秷: target=(${sourceLocation.x},${sourceLocation.y},${sourceLocation.z}) distance=${finalDistance.toFixed(2)}`;
        if (options.optional) {
            console.log('[transport] ' + message);
            return 0;
        }
        throw new Error(message);
    }

    await bot.lookAt(chestBlock.position.offset(0.5, 0.5, 0.5));
    await sleep(80);

    let container = null;
    try {
        container = await Promise.race([
            bot.openContainer(chestBlock),
            new Promise((_, reject) => setTimeout(() => reject(new Error('open container timeout')), 6000))
        ]);

        const slots = Array.isArray(container.slots) ? container.slots.slice(0, container.inventoryStart || container.inventorySize || 54) : [];
        const available = slots
            .filter(item => item && item.name === itemName)
            .reduce((sum, item) => sum + item.count, 0);
        if (available <= 0) {
            console.log('[transport] source chest has no target item: ' + itemName);
            return 0;
        }

        const beforeCount = inventoryCount(itemName);
        let remaining = Math.min(quantity, available);
        let taken = 0;
        for (const item of slots.filter(entry => entry && entry.name === itemName)) {
            if (remaining <= 0) break;
            const amount = Math.min(item.count, remaining);
            await container.withdraw(item.type, item.metadata, amount);
            remaining -= amount;
            taken += amount;
            await sleep(60);
        }

        const afterCount = await waitForInventoryAtLeast(itemName, beforeCount + taken, 1200);
        if (afterCount < beforeCount + taken) {
            console.log('[transport] withdraw returned but inventory count is low: ' + itemName + ' before=' + beforeCount + ', taken=' + taken + ', after=' + afterCount + ', snapshot=' + inventorySnapshot());
        }
        console.log('[transport] withdrew from chest: ' + itemName + ' x' + taken);
        return taken;
    } finally {
        try { container?.close?.(); } catch {}
    }
}

async function moveToPosition(x, y, z, options = {}) {
    if (!bot?.entity) return false;

    try {
        const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
        if (!bot.pathfinder) bot.loadPlugin(pathfinder);

        const movements = new Movements(bot);
        movements.canDig = false;
        bot.pathfinder.setMovements(movements);
        const Vec3 = require('vec3').Vec3;
        const target = new Vec3(x, y, z);
        const range = Number.isFinite(Number(options.range)) ? Number(options.range) : 1;
        const distance = bot.entity.position.distanceTo(target);
        if (distance <= range + 0.35) return true;
        const minTimeoutMs = Number.isFinite(Number(options.minTimeoutMs)) ? Number(options.minTimeoutMs) : 1200;
        const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : Math.min(Math.max(distance * 700, minTimeoutMs), 12000);
        bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, range));

        const result = await Promise.race([
            once(bot, 'goal_reached').then(() => 'goal_reached'),
            once(bot, 'path_reset').then(() => 'path_reset'),
            sleep(timeoutMs).then(() => 'timeout')
        ]);
        bot.pathfinder.setGoal(null);
        bot.clearControlStates();
        const finalDistance = bot.entity.position.distanceTo(target);
        const reached = finalDistance <= range + 0.75;
        if (!reached) {
            console.log(`[绉诲姩] 鏈埌杈剧洰鏍? result=${result}, target=(${x},${y},${z}), distance=${finalDistance.toFixed(2)}, range=${range}`);
        }
        return reached;
    } catch (err) {
        try { bot.pathfinder?.setGoal?.(null); } catch {}
        try { bot.clearControlStates?.(); } catch {}
        console.log(`[绉诲姩] pathfinder 澶辫触: ${err.message}`);
        return false;
    }
}

async function waitForItems(itemName, quantity, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    let approachedMain = false;
    let lastPickupMove = 0;
    while (Date.now() < deadline) {
        const count = bot?.inventory?.items()
            .filter(entry => itemNameMatches(entry, itemName))
            .reduce((sum, entry) => sum + Number(entry.count || 0), 0) || 0;
        if (count >= quantity) return count;

        if (!approachedMain) {
            approachedMain = true;
            try { await approachMainForHandoff(12000); } catch (err) { console.log('[transport] approach main failed: ' + err.message); }
        }

        if (Date.now() - lastPickupMove > 900) {
            lastPickupMove = Date.now();
            try { await moveToNearestDroppedItem(itemName, 20); } catch (err) { console.log('[transport] move to dropped item failed: ' + err.message); }
        }
        await sleep(200);
    }
    throw new Error('wait handoff items timeout');
}

function isAirForStanding(block) {
    return !block || ['air', 'cave_air', 'void_air'].includes(block.name);
}

function getChestStandPosition(sourceLocation) {
    const Vec3 = require('vec3').Vec3;
    const x = Number(sourceLocation.x);
    const y = Number(sourceLocation.y);
    const z = Number(sourceLocation.z);
    const current = bot?.entity?.position;
    const yValues = [
        current ? Math.floor(current.y) : y,
        y,
        y - 1,
        y + 1
    ].filter((value, index, array) => Number.isFinite(value) && array.indexOf(value) === index);
    const candidates = [];
    for (const standY of yValues) {
        candidates.push(
            { x, y: standY, z: z + 1 },
            { x, y: standY, z: z - 1 },
            { x: x + 1, y: standY, z },
            { x: x - 1, y: standY, z }
        );
    }
    const valid = candidates.filter(pos => {
        const feet = bot.blockAt(new Vec3(pos.x, pos.y, pos.z));
        const head = bot.blockAt(new Vec3(pos.x, pos.y + 1, pos.z));
        const ground = bot.blockAt(new Vec3(pos.x, pos.y - 1, pos.z));
        return isAirForStanding(feet)
            && isAirForStanding(head)
            && ground
            && !isUnsafeLandingBlock(ground);
    });
    const list = valid.length ? valid : candidates;
    return list
        .map(pos => ({
            ...pos,
            distance: current ? current.distanceTo(new Vec3(pos.x + 0.5, pos.y, pos.z + 0.5)) : 0,
            reach: new Vec3(pos.x + 0.5, pos.y + 1, pos.z + 0.5).distanceTo(new Vec3(x + 0.5, y + 0.5, z + 0.5))
        }))
        .sort((a, b) => (a.reach - b.reach) || (a.distance - b.distance))[0];
}

async function prepareWarehousePositionForTask(task) {
    if (!bot?.entity?.position) return;
    const sources = getTaskSources(task);
    if (sources.length === 0) return;

    const Vec3 = require('vec3').Vec3;
    const nearestDistance = sources.reduce((best, source) => {
        const chestCenter = new Vec3(Number(source.x) + 0.5, Number(source.y) + 0.5, Number(source.z) + 0.5);
        return Math.min(best, bot.entity.position.distanceTo(chestCenter));
    }, Infinity);
    if (nearestDistance <= 24) return;

    const warpCommand = String(task?.warpCommand || '').trim();
    if (warpCommand) {
        console.log('[transport] far from source chests, warping to warehouse first: distance=' + nearestDistance.toFixed(2) + ', command=' + warpCommand);
        await sendChat(warpCommand, { minGapMs: 1800, dedupeMs: 2000 });
        await sleep(Number(BOT_CONFIG.warpWaitMs || GLOBAL_CONFIG.warpWaitMs || 5500));
        try { bot.clearControlStates?.(); } catch {}
        return;
    }

    if (nearestDistance > 80) {
        throw new Error('bot is far from warehouse source and no warpCommand is configured, distance=' + nearestDistance.toFixed(2) + ', please rescan warehouse area');
    }
}

function chatMinIntervalMs(options = {}) {
    const configured = Number(BOT_CONFIG.chatMinIntervalMs || GLOBAL_CONFIG.chatMinIntervalMs || 1800);
    return Number.isFinite(Number(options.minGapMs)) ? Number(options.minGapMs) : configured;
}

function sendChat(message, options = {}) {
    const command = String(message || '').trim();
    if (!command) return Promise.resolve(false);
    const dedupeMs = Number.isFinite(Number(options.dedupeMs)) ? Number(options.dedupeMs) : 1200;
    const previousAt = recentChatCommands.get(command) || 0;
    if (dedupeMs > 0 && Date.now() - previousAt < dedupeMs) {
        console.log('[transport-chat] skipped duplicate command: ' + command);
        return Promise.resolve(false);
    }

    chatQueue = chatQueue.then(async () => {
        if (!bot || typeof bot.chat !== 'function') throw new Error('bot chat is not ready');
        const gap = chatMinIntervalMs(options);
        const waitMs = Math.max(0, gap - (Date.now() - lastChatSentAt));
        if (waitMs > 0) await sleep(waitMs);
        bot.chat(command);
        lastChatSentAt = Date.now();
        recentChatCommands.set(command, lastChatSentAt);
        for (const [key, at] of recentChatCommands) {
            if (Date.now() - at > 60000) recentChatCommands.delete(key);
        }
        console.log('[transport-chat] sent: ' + command);
        return true;
    }).catch(err => {
        console.log('[transport-chat] failed: ' + err.message + ' command=' + command);
        return false;
    });
    return chatQueue;
}

function inventoryCount(itemName) {
    return bot?.inventory?.items()
        .filter(entry => itemNameMatches(entry, itemName))
        .reduce((sum, entry) => sum + Number(entry.count || 0), 0) || 0;
}

function inventorySnapshot() {
    try {
        return bot?.inventory?.items()
            .map(entry => `${entry.name} x${entry.count}`)
            .join(', ') || 'empty';
    } catch (err) {
        return 'snapshot failed: ' + err.message;
    }
}

function getItemMaxStackSize(itemName) {
    const cleanName = String(itemName || '').replace(/^minecraft:/, '');
    const registryItem = bot?.registry?.itemsByName?.[cleanName];
    const stackSize = Number(registryItem?.stackSize || 64);
    return Number.isFinite(stackSize) && stackSize > 0 ? stackSize : 64;
}

function inventoryCapacityForItem(itemName) {
    if (!bot?.inventory) return 0;
    const maxStack = getItemMaxStackSize(itemName);
    const matchingRoom = bot.inventory.items()
        .filter(entry => itemNameMatches(entry, itemName))
        .reduce((sum, entry) => sum + Math.max(0, maxStack - Number(entry.count || 0)), 0);
    const emptySlots = typeof bot.inventory.emptySlotCount === 'function'
        ? bot.inventory.emptySlotCount()
        : Math.max(0, 36 - bot.inventory.items().length);
    return matchingRoom + emptySlots * maxStack;
}

function inventoryHasNonTaskItems(targetItemName) {
    return bot?.inventory?.items().some(item => !shouldKeepInventoryItemForTask(item, targetItemName)) || false;
}

function shouldKeepInventoryItemForTask(item, targetItemName) {
    if (!item) return false;
    if (itemNameMatches(item, targetItemName)) return true;
    const name = String(item.name || '');
    return name === 'golden_carrot';
}

async function cleanupInventoryForTask(task, targetItemName) {
    if (!bot?.entity) return;
    console.log('[transport] cleanup inventory before pickup, keep target=' + targetItemName);
    try {
        await sendChat('/home', { minGapMs: 1800, dedupeMs: 2000 });
        await sleep(4500);
    } catch (err) {
        console.log('[transport] /home before cleanup failed: ' + err.message);
    }

    for (const item of [...bot.inventory.items()]) {
        if (shouldKeepInventoryItemForTask(item, targetItemName)) continue;
        try {
            await tossWithTimeout(item, Number(item.count || 0), 'cleanup ' + item.name);
            await sleep(80);
        } catch (err) {
            console.log('[transport] cleanup drop failed: ' + item.name + ' x' + item.count + ' - ' + err.message);
        }
    }

    const warpCommand = String(task?.warpCommand || '').trim();
    if (warpCommand) {
        try {
            await sendChat(warpCommand, { minGapMs: 1800, dedupeMs: 2000 });
            console.log('[transport] returned to warehouse after cleanup: ' + warpCommand);
            await sleep(4500);
        } catch (err) {
            console.log('[transport] warp after cleanup failed: ' + err.message);
        }
    }
    console.log('[transport] cleanup done, capacity=' + inventoryCapacityForItem(targetItemName) + ', snapshot=' + inventorySnapshot());
}

async function waitForInventoryAtLeast(itemName, expected, timeoutMs = 4000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const count = inventoryCount(itemName);
        if (count >= expected) return count;
        await sleep(100);
    }
    const count = inventoryCount(itemName);
    return count;
}

async function waitForInventoryAtMost(itemName, expected, timeoutMs = 2500) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const count = inventoryCount(itemName);
        if (count <= expected) return count;
        await sleep(80);
    }
    return inventoryCount(itemName);
}

function withTimeout(promise, timeoutMs, message) {
    let timer = null;
    return Promise.race([
        promise.finally(() => {
            if (timer) clearTimeout(timer);
        }),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(message || 'operation timed out')), timeoutMs);
        })
    ]);
}

function getEntityDroppedItem(entity) {
    if (!entity || typeof entity.getDroppedItem !== 'function') return null;
    try {
        return entity.getDroppedItem();
    } catch {
        return null;
    }
}

function findNearestDroppedItem(itemName, maxDistance = 14) {
    if (!bot?.entity?.position) return null;
    let best = null;
    for (const entity of Object.values(bot.entities || {})) {
        if (!entity?.position) continue;
        const item = getEntityDroppedItem(entity);
        if (!itemNameMatches(item, itemName)) continue;
        const distance = bot.entity.position.distanceTo(entity.position);
        if (distance > maxDistance) continue;
        if (!best || distance < best.distance) best = { entity, item, distance };
    }
    return best;
}

async function moveToNearestDroppedItem(itemName, maxDistance = 14) {
    const target = findNearestDroppedItem(itemName, maxDistance);
    if (!target) return false;
    const pos = target.entity.position;
    console.log('[transport] dropped item found, moving to pickup: ' + target.item.name + ' x' + target.item.count + ', distance=' + target.distance.toFixed(2));
    return await moveToPosition(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), { timeoutMs: 2500, minTimeoutMs: 700, range: 1.1 });
}

function isAirLikeBlock(block) {
    return !block || ['air', 'cave_air', 'void_air'].includes(block.name);
}

function isSoftFlatSurface(block) {
    return block && /carpet|snow|moss_carpet/.test(block.name || '');
}

function isUnsafeLandingBlock(block) {
    if (!block) return true;
    return /water|lava|fire|cactus|campfire|magma|sweet_berry|chest|barrel|shulker|hopper|rail|trapdoor|fence|wall|glass_pane|iron_bars/.test(block.name || '');
}

function isFlatLandingPosition(pos) {
    if (!bot?.blockAt) return false;
    const Vec3 = require('vec3').Vec3;
    const y = Math.floor(pos.y);
    const x = Math.floor(pos.x);
    const z = Math.floor(pos.z);
    const feet = bot.blockAt(new Vec3(x, y, z));
    const head = bot.blockAt(new Vec3(x, y + 1, z));
    const below = bot.blockAt(new Vec3(x, y - 1, z));
    const hasGround = (below && below.boundingBox === 'block' && !isUnsafeLandingBlock(below)) || isSoftFlatSurface(below) || isSoftFlatSurface(feet);
    const feetClear = isAirLikeBlock(feet) || isSoftFlatSurface(feet);
    const headClear = isAirLikeBlock(head);
    return hasGround && feetClear && headClear;
}

function getBackwardProbePosition(distance = 0.45) {
    if (!bot?.entity?.position) return null;
    const yaw = bot.entity.yaw;
    return bot.entity.position.offset(Math.sin(yaw) * distance, 0, Math.cos(yaw) * distance);
}

function canStepBackwardSafely() {
    const probe = getBackwardProbePosition(0.55);
    return Boolean(probe && isFlatLandingPosition(probe));
}

async function assertSafeThrowLandingToPlayer(playerName) {
    const player = bot.players[playerName];
    if (!player || !player.entity?.position) {
        throw new Error('throw target not visible: ' + playerName);
    }
    const target = player.entity.position;
    const candidates = [
        target,
        target.offset(1, 0, 0),
        target.offset(-1, 0, 0),
        target.offset(0, 0, 1),
        target.offset(0, 0, -1)
    ];
    if (!candidates.some(pos => isFlatLandingPosition(pos))) {
        console.log('[transport] target landing is not flat/safe, continue toss anyway: ' + playerName);
        return false;
    }
    return true;
}

function findVisibleMainEntity() {
    const names = configuredMainNames();
    for (const name of names) {
        const player = bot?.players?.[name];
        if (player?.entity?.position) return { name, entity: player.entity };
    }
    return null;
}

async function approachMainForHandoff(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    let moved = false;
    while (Date.now() < deadline && currentTask && bot?.entity) {
        const main = findVisibleMainEntity();
        if (!main) {
            await sleep(250);
            continue;
        }

        const distance = bot.entity.position.distanceTo(main.entity.position);
        console.log('[transport] main visible for handoff: ' + main.name + ', distance=' + distance.toFixed(2));
        if (distance <= 3.2) return;

        await bot.lookAt(main.entity.position.offset(0, 1.5, 0));
        await sleep(120);
        try {
            bot.setControlState('forward', true);
            const moveDeadline = Date.now() + 1800;
            while (Date.now() < moveDeadline && currentTask && bot?.entity) {
                const latestMain = findVisibleMainEntity();
                if (!latestMain) break;
                const latestDistance = bot.entity.position.distanceTo(latestMain.entity.position);
                if (latestDistance <= 2.8) break;
                await bot.lookAt(latestMain.entity.position.offset(0, 1.5, 0));
                await sleep(100);
            }
        } finally {
            try { bot.setControlState('forward', false); } catch {}
        }
        moved = true;
        const finalMain = findVisibleMainEntity();
        const finalDistance = finalMain ? bot.entity.position.distanceTo(finalMain.entity.position).toFixed(2) : 'unknown';
        console.log('[transport] moved forward for handoff, distance=' + finalDistance);
        return;
    }
    if (!moved) console.log('[transport] main not visible, keep waiting for tossed items');
}

function getVisiblePlayerEntity(playerName) {
    const player = bot?.players?.[playerName];
    return player?.entity?.position ? player.entity : null;
}

async function waitForPlayerNearby(playerName, timeoutMs = 60000, maxDistance = 6) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && currentTask && bot?.entity) {
        const entity = getVisiblePlayerEntity(playerName);
        if (entity?.position) {
            const distance = bot.entity.position.distanceTo(entity.position);
            if (distance <= maxDistance) {
                console.log('[transport] delivery target nearby: ' + playerName + ', distance=' + distance.toFixed(2));
                return entity;
            }
            console.log('[transport] delivery target visible but far: ' + playerName + ', distance=' + distance.toFixed(2));
        }
        await sleep(250);
    }
    throw new Error('player ' + playerName + ' did not accept /tpa in time; delivery paused.');
}

async function requestTeleportToPlayer(playerName, timeoutMs = 90000, maxDistance = 5) {
    if (!/^[A-Za-z0-9_]{1,16}$/.test(String(playerName || ''))) {
        throw new Error('invalid delivery player name: ' + playerName);
    }

    const deadline = Date.now() + timeoutMs;
    let lastTpaAt = 0;
    let attempts = 0;
    let lastReminderAt = 0;
    while (Date.now() < deadline && currentTask && bot?.entity) {
        if (Date.now() - lastTpaAt >= 5000) {
            attempts += 1;
            await sendChat('/tpa ' + playerName, { minGapMs: 2200, dedupeMs: 4500 });
            console.log('[transport] sent /tpa ' + playerName + ' attempt=' + attempts);
            reportEvent('delivery_tpa_sent', { taskId: currentTask?.id, playerName, itemName: currentTask?.itemName, quantity: currentTask?.quantity, attempts }).catch(() => {});
            lastTpaAt = Date.now();
            if (Date.now() - lastReminderAt >= 30000 || attempts === 1) {
                try {
                    await sendChat('/msg ' + playerName + ' Warehouse transport bot is delivering. Please type /tpaccept.', { minGapMs: 2200, dedupeMs: 25000 });
                } catch {}
                lastReminderAt = Date.now();
            }
        }

        const entity = getVisiblePlayerEntity(playerName);
        if (entity?.position) {
            const distance = bot.entity.position.distanceTo(entity.position);
            if (distance <= maxDistance) {
                console.log('[transport] delivery teleport confirmed near target: ' + playerName + ', distance=' + distance.toFixed(2));
                await sleep(120);
                return entity;
            }
        }
        if (deliveryTeleportConfirm.playerName === playerName && Date.now() - deliveryTeleportConfirm.at < 12000) {
            console.log('[transport] teleport success message received, waiting for player entity: ' + playerName);
        }
        await sleep(250);
    }
    throw new Error('player ' + playerName + ' did not accept /tpa in time; delivery paused.');
}

async function facePlayerFeet(playerName) {
    const entity = getVisiblePlayerEntity(playerName);
    if (!entity) throw new Error('delivery target not visible: ' + playerName);
    await bot.lookAt(entity.position.offset(0, 0.08, 0), true);
    await sleep(20);
    return entity;
}

async function backAwayFromPlayer(playerName, targetDistance = 2.8) {
    const entity = getVisiblePlayerEntity(playerName);
    if (!entity || !bot?.entity?.position) return false;
    const distance = bot.entity.position.distanceTo(entity.position);
    if (distance >= targetDistance - 0.2) return true;
    try {
        bot.setControlState('back', true);
        const deadline = Date.now() + 1100;
        const forceBackUntil = Date.now() + 360;
        while (Date.now() < deadline && bot?.entity) {
            const latest = getVisiblePlayerEntity(playerName);
            if (!latest?.position) break;
            await bot.lookAt(latest.position.offset(0, 0.1, 0), true);
            if (Date.now() > forceBackUntil && !canStepBackwardSafely()) {
                console.log('[transport] narrow path detected, stop backing away to avoid falling');
                break;
            }
            if (bot.entity.position.distanceTo(latest.position) >= targetDistance) break;
            await sleep(40);
        }
    } finally {
        try { bot.setControlState('back', false); } catch {}
    }
    await sleep(40);
    const latest = getVisiblePlayerEntity(playerName);
    return Boolean(latest?.position && bot?.entity?.position && bot.entity.position.distanceTo(latest.position) >= targetDistance - 0.25);
}

function getDeliveryCandidatePositions(playerName, targetDistance = 3.0) {
    const entity = getVisiblePlayerEntity(playerName);
    if (!entity?.position || !bot?.entity?.position) return [];
    const Vec3 = require('vec3').Vec3;
    const playerPos = entity.position;
    const botPos = bot.entity.position;
    const dx = botPos.x - playerPos.x;
    const dz = botPos.z - playerPos.z;
    const length = Math.sqrt(dx * dx + dz * dz) || 1;
    const baseX = dx / length;
    const baseZ = dz / length;
    const angles = [0, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI * 0.75, -Math.PI * 0.75, Math.PI];
    const distances = [targetDistance, targetDistance + 0.45, Math.max(2.55, targetDistance - 0.35)];
    const candidates = [];
    const seen = new Set();
    for (const distance of distances) {
        for (const angle of angles) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rx = baseX * cos - baseZ * sin;
            const rz = baseX * sin + baseZ * cos;
            const pos = new Vec3(playerPos.x + rx * distance, playerPos.y, playerPos.z + rz * distance);
            const key = `${Math.floor(pos.x * 10)},${Math.floor(pos.y * 10)},${Math.floor(pos.z * 10)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (isFlatLandingPosition(pos)) candidates.push(pos);
        }
    }
    return candidates;
}

async function moveToAlternativeThrowPosition(playerName, targetDistance = 3.0) {
    const candidates = getDeliveryCandidatePositions(playerName, targetDistance);
    for (const pos of candidates) {
        try {
            console.log('[transport] trying alternative throw position: ' + pos.x.toFixed(2) + ',' + pos.y.toFixed(2) + ',' + pos.z.toFixed(2));
            const moved = await moveToPosition(pos.x, pos.y, pos.z, { timeoutMs: 2200, minTimeoutMs: 700, range: 0.65 });
            if (!moved) continue;
            const entity = getVisiblePlayerEntity(playerName);
            if (!entity?.position || !bot?.entity?.position) continue;
            const distance = bot.entity.position.distanceTo(entity.position);
            if (distance >= targetDistance - 0.35 && distance <= targetDistance + 1.2) {
                console.log('[transport] alternative throw position reached, distance=' + distance.toFixed(2));
                return true;
            }
        } catch (err) {
            console.log('[transport] alternative throw position failed: ' + err.message);
        }
    }
    return false;
}

async function ensurePlayerThrowPosition(playerName, targetDistance = 3.0) {
    const backed = await backAwayFromPlayer(playerName, targetDistance);
    if (backed) return true;
    console.log('[transport] cannot back away enough, trying side/diagonal throw position');
    const moved = await moveToAlternativeThrowPosition(playerName, targetDistance);
    if (!moved) {
        const entity = getVisiblePlayerEntity(playerName);
        const distance = entity?.position && bot?.entity?.position ? bot.entity.position.distanceTo(entity.position) : -1;
        console.log('[transport] no alternative throw position found, continue with current distance=' + distance.toFixed(2));
    }
    return moved;
}

async function tossItemsTowardPlayerFeet(playerName, itemName, quantity) {
    if (!bot?.entity) throw new Error('transport bot not ready, cannot toss to player');
    await facePlayerFeet(playerName);
    await sleep(10);

    let remaining = quantity;
    const items = bot.inventory.items().filter(entry => itemNameMatches(entry, itemName));
    for (const item of items) {
        if (remaining <= 0) break;
        const amount = Math.min(item.count, remaining);
        const beforeCount = inventoryCount(itemName);
        await facePlayerFeet(playerName);
        await tossWithTimeout(item, amount, 'delivery to ' + playerName);
        const afterCount = await waitForInventoryAtMost(itemName, beforeCount - amount, 1800);
        if (afterCount > beforeCount - amount) {
            throw new Error('delivery toss not confirmed, inventory still has ' + afterCount + '/' + beforeCount + ' for ' + itemName);
        }
        remaining -= amount;
        if (remaining > 0) await sleep(10);
    }
    if (remaining > 0) throw new Error('not enough items to toss to player, remaining ' + remaining);
}

async function throwItemsToPlayer(playerName, itemName, quantity) {
    let tossed = false;
    try {
        await assertSafeThrowLandingToPlayer(playerName);
        await facePlayerFeet(playerName);
        const positioned = await ensurePlayerThrowPosition(playerName, 3.0);
        if (!positioned) console.log('[transport] throw position is not ideal, tossing anyway to avoid holding player items');
        await sleep(20);
        await facePlayerFeet(playerName);
        await tossItemsTowardPlayerFeet(playerName, itemName, quantity);
        tossed = true;
        console.log('[transport] tossed precisely toward player feet for ' + playerName + ': ' + itemName + ' x' + quantity);
    } catch (err) {
        const remaining = Math.min(inventoryCount(itemName), quantity);
        if (remaining <= 0) {
            tossed = true;
            console.log('[transport] delivery toss reported error but no target items remain, treat as delivered: ' + err.message);
            return;
        }
        console.log('[transport] precise toss failed, dropping remaining items at feet as fallback: ' + itemName + ' x' + remaining + ', reason=' + err.message);
        await dropItemsAtFeet(itemName, remaining);
        const stillCarried = await waitForInventoryAtMost(itemName, 0, 1800);
        if (stillCarried > 0) throw new Error('delivery fallback drop failed, still carrying ' + stillCarried + ' ' + itemName + ', original=' + err.message);
        tossed = true;
        console.log('[transport] dropped remaining items at feet for ' + playerName + ': ' + itemName + ' x' + remaining);
    } finally {
        try { bot.setControlState('back', false); } catch {}
        if (tossed) {
            try {
                await sleep(250);
                await sendChat('/home', { minGapMs: 1800, dedupeMs: 2000 });
                console.log('[transport] returned /home after confirmed delivery toss');
            } catch (err) {
                console.log('[transport] /home after delivery failed: ' + err.message);
            }
        }
    }
}

async function dropItemsAtFeet(itemName, quantity) {
    if (!bot?.entity) throw new Error('transport bot not ready, cannot drop at feet');
    await bot.lookAt(bot.entity.position.offset(0, -1, 0));
    await sleep(40);

    let remaining = quantity;
    const items = bot.inventory.items().filter(entry => itemNameMatches(entry, itemName));
    for (const item of items) {
        if (remaining <= 0) break;
        const amount = Math.min(item.count, remaining);
        if (amount === item.count && Number.isInteger(item.slot)) {
            await Promise.race([
                bot.clickWindow(item.slot, 1, 4),
                new Promise((_, reject) => setTimeout(() => reject(new Error('drop at feet timeout: ' + item.name)), 2500))
            ]);
        } else {
            await tossWithTimeout(item, amount, 'drop at feet');
        }
        remaining -= amount;
        await sleep(40);
    }
    if (remaining > 0) throw new Error('not enough items to drop at feet, remaining ' + remaining);
}

async function tossWithTimeout(item, amount, label = '') {
    let settled = false;
    const result = await Promise.race([
        new Promise((resolve, reject) => {
            bot.toss(item.type, item.metadata, amount, (err) => {
                settled = true;
                err ? reject(err) : resolve();
            });
        }),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
    ]);
    if (!settled || result === 'timeout') {
        throw new Error('toss callback timeout: ' + (label || item.name) + ' x' + amount);
    }
}

function itemNameMatches(entry, itemName) {
    if (!entry || !itemName) return false;
    const expected = String(itemName).replace(/^minecraft:/, '');
    const actual = String(entry.name || '').replace(/^minecraft:/, '');
    return actual === expected;
}

async function stepBackFromLookDirection(blocks) {
    if (!bot?.entity) return;
    const yaw = bot.entity.yaw;
    const target = bot.entity.position.offset(Math.sin(yaw) * blocks, 0, Math.cos(yaw) * blocks);
    await moveToPosition(Math.floor(target.x), Math.floor(bot.entity.position.y), Math.floor(target.z));
    await sleep(300);
}

function configuredMainNames() {
    const values = [
        GLOBAL_CONFIG.mainBotName,
        GLOBAL_CONFIG.mainUsername,
        GLOBAL_CONFIG.mainAccount,
        BOT_CONFIG.mainBotName,
        BOT_CONFIG.mainUsername,
        BOT_CONFIG.mainAccount,
        'Linseylx',
        'Linsey_lx',
        'Xigold_lx'
    ];
    return values.filter(Boolean).map(value => String(value).split('@')[0]);
}

function includesAny(text, words) {
    return words.some(word => text.includes(word));
}

function mentionsAnyName(text, names) {
    return names.some(name => name && text.includes(name));
}

let lastTpAcceptAt = 0;
function autoAcceptTpaMessage(message) {
    const text = String(message || '');
    const lowerText = text.toLowerCase();
    if (/no valid teleport request/i.test(text)) return;

    const deliveryPlayer = String(currentTask?.playerName || '');
    const deliveryLower = deliveryPlayer.toLowerCase();
    if (deliveryPlayer && deliveryLower && (
        lowerText.includes(('sent a teleport request to ' + deliveryPlayer).toLowerCase())
        || lowerText.includes(('request sent to ' + deliveryPlayer).toLowerCase())
        || (lowerText.includes(deliveryLower) && /request\s+sent|sent\s+request|tpa\s+sent/.test(lowerText))
    )) {
        return;
    }
    if (deliveryPlayer && deliveryLower && (
        lowerText.includes(('teleported to ' + deliveryPlayer).toLowerCase())
        || lowerText.includes(('you teleported to ' + deliveryPlayer).toLowerCase())
        || (lowerText.includes(deliveryLower) && /\b(teleported|accepted|success|arrived)\b/.test(lowerText))
    )) {
        deliveryTeleportConfirm = { playerName: deliveryPlayer, at: Date.now() };
        console.log('[transport] delivery teleport message confirmed: ' + text.slice(0, 160));
        return;
    }

    const botName = String(bot?.username || BOT_CONFIG.email || '').split('@')[0].toLowerCase();
    const mentionsThisBot = Boolean(botName && lowerText.includes(botName));
    const incomingRequest = /(?:has\s+requested\s+(?:that\s+)?you\s+teleport|has\s+requested\s+to\s+teleport\s+to\s+you|sent\s+you\s+a\s+teleport\s+request|teleport\s+request\s+from)/i.test(text)
        || text.includes('\u8bf7\u6c42\u4f20\u9001\u5230\u4f60\u7684\u4f4d\u7f6e')
        || text.includes('\u8bf7\u4f60\u4f20\u9001\u5230\u4ed6\u7684\u4f4d\u7f6e')
        || (mentionsThisBot && text.includes('\u8bf7\u6c42') && text.includes('\u4f20\u9001'));
    if (!incomingRequest) return;

    const now = Date.now();
    if (now - lastTpAcceptAt < 60000) return;
    lastTpAcceptAt = now;
    sendChat('/tpaccept', { minGapMs: 5000, dedupeMs: 60000 }).catch(() => {});
    console.log('[transport] accepted explicit incoming teleport request: ' + text.slice(0, 160));
}
function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    const configuredInterval = Number(BOT_CONFIG.pollInterval || GLOBAL_CONFIG.pollInterval || 1000);
    const pollInterval = Math.min(Math.max(Number.isFinite(configuredInterval) ? configuredInterval : 1000, 250), 1000);
    pollTimer = setInterval(() => pollCommands().catch(() => {}), pollInterval);
    pollCommands().catch(() => {});
}

function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const sendHeartbeat = async () => {
        try {
            const resp = await axios.post(`${adminBase()}/api/bot/heartbeat`, {
                botId: `${BOT_TYPE}:bot${BOT_NUM}`,
                botNum: BOT_NUM,
                type: BOT_TYPE,
                status: hasSpawned && bot?.entity && !lastFatalLoginError ? 'online' : 'connecting',
                ready: Boolean(hasSpawned && bot?.entity && !lastFatalLoginError),
                lastError: serializeError(lastFatalLoginError),
                health: bot?.health || 0,
                food: bot?.food || 0,
                busy: !!currentTask,
                task: currentTask,
                version: autoUpdater.currentVersion()
            }, { timeout: 5000, headers: transportHeaders() });

            if (resp.data?.command === 'FORCE_SLEEP') {
                shutdown(resp.data.reason || 'force sleep by cloud');
            }
        } catch (err) {
            console.log(`[蹇冭烦] 涓婃姤澶辫触: ${err.message}`);
        }
    };
    const configuredInterval = Number(BOT_CONFIG.heartbeatInterval || GLOBAL_CONFIG.heartbeatInterval || 5000);
    const heartbeatInterval = Math.min(Math.max(Number.isFinite(configuredInterval) ? configuredInterval : 5000, 3000), 10000);
    heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval);
    sendHeartbeat().catch(() => {});
}

async function checkAndUpdate() {
    if (isUpdating) return;
    if (!BOT_CONFIG.mainHost && !GLOBAL_CONFIG.mainHost) return;

    isUpdating = true;
    try {
        const success = await autoUpdater.performUpdate(
            BOT_CONFIG.mainHost || GLOBAL_CONFIG.mainHost,
            BOT_CONFIG.mainAdminPort || GLOBAL_CONFIG.mainAdminPort || BOT_CONFIG.mainPort || GLOBAL_CONFIG.mainPort || 28474,
            { baseUrl: BOT_CONFIG.mainBaseUrl || GLOBAL_CONFIG.mainBaseUrl, headers: transportHeaders() }
        );
        if (success) {
            shutdown('local update completed, restart transport bot');
        }
    } catch (err) {
        console.log(`[鏇存柊] 妫€鏌ュけ璐? ${err.message}`);
    } finally {
        isUpdating = false;
    }
}

function resolveMinecraftVersion(configuredVersion) {
    const value = String(configuredVersion || '').trim();
    if (!value || value === 'auto' || value === 'false') return false;
    try {
        require('minecraft-data')(value);
        return value;
    } catch (err) {
        console.log(`[transport-connect] unsupported minecraft version "${value}", fallback to auto protocol detection`);
        return false;
    }
}

function createBot() {
    const host = BOT_CONFIG.host || GLOBAL_CONFIG.host;
    const port = BOT_CONFIG.port || GLOBAL_CONFIG.port || 25565;
    const configuredVersion = BOT_CONFIG.version || GLOBAL_CONFIG.version || 'auto';
    const version = resolveMinecraftVersion(configuredVersion);
    const profilesFolder = BOT_CONFIG.profilesFolder
        || GLOBAL_CONFIG.profilesFolder
        || path.join(__dirname, '.auth-cache', BOT_TYPE, `bot${BOT_NUM}`);
    let spawned = false;
    hasSpawned = false;
    lastFatalLoginError = '';

    console.log(`[transport-connect] createBot ${host}:${port} version=${version || 'auto'} configured=${configuredVersion}`);
    console.log(`[transport-auth] account=${BOT_CONFIG.email} cache=${profilesFolder}`);

    const botOptions = {
        host,
        port,
        username: BOT_CONFIG.email,
        auth: 'microsoft',
        profilesFolder,
        onMsaCode: (data) => {
            const login = normalizeMicrosoftLogin(data);
            console.log(`[LOGIN_URL] ${login.url}`);
            console.log(`[LOGIN_CODE] ${login.code || ''}`);
            console.log(`[LOGIN_STEP] ${formatLoginInstruction(login)}`);
            if (login.message) console.log(`[LOGIN_HINT] ${login.message}`);
        }
    };
    if (version) botOptions.version = version;

    bot = mineflayer.createBot(botOptions);

    console.log('[transport-connect] mineflayer client created');

    try {
        bot.loadPlugin(autoResourcePack);
        console.log('[resource-pack] auto accept plugin loaded');
    } catch (err) {
        console.log(`[resource-pack] plugin load failed: ${err.message}`);
    }

    bot._client?.on('connect', () => console.log('[transport-connect] tcp connected'));
    bot._client?.on('state', (newState, oldState) => console.log(`[transport-state] ${oldState || 'unknown'} -> ${newState}`));
    bot._client?.on('session', session => console.log(`[transport-auth] session=${session?.selectedProfile?.name || 'unknown'}`));
    bot._client?.on('error', err => {
        const message = formatTransportError(err);
        if (isTransientSessionJoinError(message)) console.log('[transport-network] ' + message);
        else console.error('[transport-client-error] ' + message);
    });
    bot._client?.on('kick_disconnect', packet => {
        const text = serializeError(packet);
        const line = '[transport-kick-packet] ' + text;
        if (isDuplicateLoginError(text)) console.log(line);
        else console.error(line);
    });
    bot._client?.on('disconnect', packet => {
        const text = serializeError(packet);
        const line = '[transport-disconnect-packet] ' + text;
        if (isDuplicateLoginError(text)) console.log(line);
        else console.error(line);
    });

    bot.on('login', () => {
        console.log('[transport-login] protocol login ok, waiting spawn');
    });

    bot.on('spawn', () => {
        spawned = true;
        hasSpawned = true;
        lastFatalLoginError = '';
        console.log('[TRANSPORT_SPAWN_READY]');
        console.log('[transport] bot spawned and online');
        reportEvent('spawn');
        startPolling();
        startHeartbeat();

        if (updateCheckTimer) clearInterval(updateCheckTimer);
        updateCheckTimer = setInterval(() => checkAndUpdate().catch(() => {}), 5 * 60 * 1000);
        setTimeout(() => checkAndUpdate().catch(() => {}), 10000);
    });

    bot.on('error', (err) => {
        const raw = serializeError(err);
        const message = formatTransportError(raw);
        lastFatalLoginError = message;
        if (isTransientSessionJoinError(raw)) {
            console.log('[transport-network] ' + message);
            reportEvent('warning', { message });
            return;
        }
        if (isMinecraftProfileError(raw)) {
            console.error('[transport-auth-error] ' + message);
            reportEvent('error', { message });
            shutdown(message);
            return;
        }
        console.error('[寮傚父]', message);
        reportEvent('error', { message });
    });

    bot.on('kicked', (reason) => {
        lastFatalLoginError = serializeError(reason);
        const line = '[transport-kicked] ' + lastFatalLoginError;
        if (isDuplicateLoginError(lastFatalLoginError)) console.log(line);
        else console.error(line);
        reportEvent('kicked', { reason: lastFatalLoginError });
    });

    bot.on('end', () => {
        hasSpawned = false;
        console.log('[鐘舵€乚 杩愯緭 Bot 宸叉柇寮€');
        reportEvent('disconnect');
        if (!shuttingDown && !reconnecting) {
            reconnecting = true;
            const reconnectDelay = isDuplicateLoginError(lastFatalLoginError) ? 15000 : 5000;
            setTimeout(async () => {
                reconnecting = false;
                const allowed = await requestStartPermission();
                if (allowed) createBot();
                else shutdown('cloud denied transport start');
            }, reconnectDelay);
        }
    });

    bot.on('chat', (username, message) => {
        if (username !== bot.username) {
            reportEvent('chat', { username, message });
            autoAcceptTpaMessage(username + ' ' + message);
        }
    });
    bot.on('message', autoAcceptTpaMessage);
    bot.on('messagestr', autoAcceptTpaMessage);

    setTimeout(() => {
        if (!spawned && !shuttingDown) {
            console.log('[transport-diagnostic] not spawned after 20s; check login URL/auth cache/network/server whitelist');
        }
    }, 20000);
}
function shutdown(reason) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[閫€鍑篯 ${reason}`);
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (updateCheckTimer) clearInterval(updateCheckTimer);
    try { bot?.quit(reason); } catch {}
    setTimeout(() => process.exit(0), 800);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function once(emitter, event) {
    return new Promise(resolve => emitter.once(event, resolve));
}

(async () => {
    const configPath = process.argv[2] || require('path').join(__dirname, 'config.json');

    try {
        GLOBAL_CONFIG = JSON.parse(await fs.readFile(configPath, 'utf8'));
    } catch (err) {
        console.error('鏃犳硶璇诲彇閰嶇疆鏂囦欢:', err.message);
        process.exit(1);
    }

    BOT_NUM = parseInt(process.argv[3], 10);
    if (Number.isNaN(BOT_NUM)) {
        console.error('璇锋寚瀹?Bot 缂栧彿銆傜敤娉? node transport_bot.js <configPath> <botNum>');
        process.exit(1);
    }

    BOT_TYPE = process.env.BOT_TYPE || 'local';
    BOT_CONFIG = GLOBAL_CONFIG.bots.find(entry => entry.num === BOT_NUM && (entry.type || 'local') === BOT_TYPE)
        || GLOBAL_CONFIG.bots.find(entry => entry.num === BOT_NUM);

    if (!BOT_CONFIG) {
        console.error(`鏈壘鍒扮紪鍙?${BOT_NUM} 鐨勮繍杈?Bot`);
        process.exit(1);
    }

    console.log(`[鍚姩] 杩愯緭 Bot #${BOT_NUM} (${BOT_TYPE === 'cloud' ? '浜戠澶囩敤' : '鏈湴涓荤敤'})`);
    console.log(`[閰嶇疆] Minecraft: ${BOT_CONFIG.host || GLOBAL_CONFIG.host}:${BOT_CONFIG.port || GLOBAL_CONFIG.port}`);
    console.log(`[閰嶇疆] 鍚庡彴: ${adminBase()}`);

    const allowed = await requestStartPermission();
    if (!allowed) {
        shutdown('start permission denied');
        return;
    }

    createBot();
})();
