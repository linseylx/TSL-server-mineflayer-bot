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

process.on('uncaughtException', (err) => {
    console.error('[异常]', err.message);
});

function adminBase() {
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
        }, { timeout: 5000 });
    } catch (err) {
        console.log(`[HTTP] 上报失败 (${event}): ${err.message}`);
    }
}

async function requestStartPermission() {
    if (!BOT_CONFIG.mainHost && !GLOBAL_CONFIG.mainHost) return true;

    try {
        console.log(`[启动控制] 请求登录权: ${adminBase()}/api/bot/start-permission`);
        const resp = await axios.post(`${adminBase()}/api/bot/start-permission`, {
            botNum: BOT_NUM,
            type: BOT_TYPE
        }, { timeout: 5000 });

        if (resp.data?.allowed) {
            console.log(`[启动控制] 已获得登录权: ${resp.data?.reason || '允许启动'}`);
            return true;
        }

        console.log(`[启动控制] 未获得登录权: ${resp.data?.reason || '云端拒绝'}`);
        return false;
    } catch (err) {
        console.log(`[启动控制] 无法确认登录权: ${err.message}`);
        return false;
    }
}

async function pollCommands() {
    try {
        const resp = await axios.get(`${adminBase()}/api/bot/commands/${BOT_NUM}?type=${encodeURIComponent(BOT_TYPE)}`, {
            timeout: 5000
        });
        const commands = resp.data?.commands || [];
        for (const item of commands) {
            await handleCommand(item.cmd, item.payload);
        }
    } catch {}
}

async function handleCommand(cmd, payload) {
    console.log(`[命令] 收到: ${cmd}`);
    if (cmd === 'CMD' && payload?.command) {
        if (payload.command === '__cleanup_inventory__') {
            await cleanupInventoryForTask({}, '');
            await reportEvent('command_executed', { command: payload.command });
            return;
        }
        if (bot) {
            bot.chat(payload.command);
            await reportEvent('command_executed', { command: payload.command });
        }
        return;
    }

    if (cmd === 'PREPARE_HANDOFF') {
        const durationMs = Number(payload?.durationMs || 90000);
        startTpAcceptLoop(durationMs);
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

function startTpAcceptLoop(durationMs = 30000) {
    if (!bot || typeof bot.chat !== 'function') return () => {};
    let stopped = false;
    const accept = () => {
        if (stopped || !bot || typeof bot.chat !== 'function') return;
        try {
            bot.chat('/tpaccept');
            console.log('[transport] sent proactive /tpaccept');
        } catch (err) {
            console.log('[transport] proactive /tpaccept failed: ' + err.message);
        }
    };
    accept();
    const timer = setInterval(accept, 2000);
    const timeout = setTimeout(() => {
        stopped = true;
        clearInterval(timer);
    }, durationMs);
    return () => {
        stopped = true;
        clearInterval(timer);
        clearTimeout(timeout);
    };
}

async function handleTransportTask(task) {
    if (!bot) return;

    currentTask = task;
    const { playerName, itemName } = task;
    const quantity = Number(task.quantity || 0);
    console.log('[transport] chest pickup task: ' + itemName + ' x' + quantity + ' -> ' + playerName);
    await reportEvent('transport_start', { taskId: task.id, playerName, itemName, quantity, mode: 'chest_pickup' });

    try {
        if (!itemName || quantity <= 0) throw new Error('transport task invalid');
        const existingTargetCount = inventoryCount(itemName);
        const needFromChest = Math.max(0, quantity - existingTargetCount);
        if (existingTargetCount > 0) {
            console.log('[transport] existing target items in inventory will be used first: ' + itemName + ' x' + existingTargetCount + ', needFromChest=' + needFromChest);
        }
        if (needFromChest > 0 && inventoryCapacityForItem(itemName) < needFromChest) {
            console.log('[transport] inventory capacity is not enough for task, cleaning first: need=' + needFromChest + ', capacity=' + inventoryCapacityForItem(itemName) + ', snapshot=' + inventorySnapshot());
            await cleanupInventoryForTask(task, itemName);
            const capacityAfterCleanup = inventoryCapacityForItem(itemName);
            if (capacityAfterCleanup < needFromChest) {
                throw new Error('transport inventory capacity not enough after cleanup, need=' + needFromChest + ', capacity=' + capacityAfterCleanup + ', snapshot=' + inventorySnapshot());
            }
        }
        const taken = needFromChest > 0 ? await withdrawItemsForTask(task, itemName, needFromChest) : 0;
        if (taken < needFromChest) {
            throw new Error('not enough items in chests, missing ' + (needFromChest - taken) + ', please rescan warehouse');
        }
        const carried = await waitForInventoryAtLeast(itemName, quantity, 2500);
        if (carried < quantity) {
            throw new Error('inventory did not receive enough items after withdraw, carried=' + carried + '/' + quantity + ', snapshot=' + inventorySnapshot());
        }
        console.log('[transport] ready to deliver exact quantity: ' + itemName + ' x' + quantity + ', existing=' + existingTargetCount + ', withdrawn=' + taken + ', carried=' + carried);
        await reportEvent('transport_ready_to_tpa', { taskId: task.id, playerName, itemName, quantity, carried });

        await requestTeleportToPlayer(playerName, 90000, 5);

        await throwItemsToPlayer(playerName, itemName, quantity);
        await reportTransportComplete(true, playerName, itemName, quantity, null, task.id);
    } catch (err) {
        console.error('[transport] failed: ' + err.message);
        await reportEvent('transport_failed', { taskId: task.id, playerName, itemName, quantity, error: err.message });
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
    return list.filter(source => Number.isFinite(Number(source?.x)) && Number.isFinite(Number(source?.y)) && Number.isFinite(Number(source?.z)));
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
        const allowNearbySearch = task?.allowNearbySearch === true || BOT_CONFIG.allowNearbySearch === true || GLOBAL_CONFIG.allowNearbySearch === true;
        if (!allowNearbySearch) {
            console.log('[transport] recorded sources are not enough, stop instead of wandering: ' + itemName + ', missing=' + remaining);
            await reportEvent('transport_stock_missing', { taskId: task?.id, itemName, missing: remaining, sources });
            return totalTaken;
        }
        console.log('[transport] task sources are not enough, searching nearby chests for ' + itemName + ', missing=' + remaining);
        await reportEvent('transport_nearby_search', { taskId: task?.id, itemName, missing: remaining, sources });
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
        }, { timeout: 5000 });
    } catch (err) {
        console.log(`[HTTP] 上报运输完成失败: ${err.message}`);
    }
}

async function withdrawFromChest(sourceLocation, itemName, quantity, options = {}) {
    if (!bot?.entity) throw new Error('transport bot not ready');
    const Vec3 = require('vec3').Vec3;
    const chestCenter = new Vec3(Number(sourceLocation.x) + 0.5, Number(sourceLocation.y) + 0.5, Number(sourceLocation.z) + 0.5);
    const currentDistance = bot.entity.position.distanceTo(chestCenter);
    if (currentDistance > 4.6) {
        await moveToPosition(Number(sourceLocation.x), Number(sourceLocation.y), Number(sourceLocation.z) + 1, { timeoutMs: 3500, minTimeoutMs: 900, range: 1.2 });
        await sleep(40);
    } else {
        console.log('[transport] already near source chest, open directly, distance=' + currentDistance.toFixed(2));
    }
    const chestPos = new Vec3(Number(sourceLocation.x), Number(sourceLocation.y), Number(sourceLocation.z));
    const chestBlock = bot.blockAt(chestPos);
    if (!chestBlock) {
        if (options.optional) return 0;
        throw new Error(`??????: (${sourceLocation.x},${sourceLocation.y},${sourceLocation.z})`);
    }
    if (!['chest', 'trapped_chest', 'barrel'].includes(chestBlock.name) && !String(chestBlock.name || '').endsWith('shulker_box')) {
        if (options.optional) return 0;
        throw new Error(`???????: ${chestBlock.name}`);
    }

    await bot.lookAt(chestBlock.position.offset(0.5, 0.5, 0.5));
    await sleep(80);

    let container = null;
    try {
        container = await Promise.race([
            bot.openContainer(chestBlock),
            new Promise((_, reject) => setTimeout(() => reject(new Error('??????')), 5000))
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
    if (!bot?.entity) return;

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
        if (distance <= range + 0.35) return;
        const minTimeoutMs = Number.isFinite(Number(options.minTimeoutMs)) ? Number(options.minTimeoutMs) : 1200;
        const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : Math.min(Math.max(distance * 700, minTimeoutMs), 12000);
        bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, range));

        await Promise.race([
            once(bot, 'goal_reached'),
            once(bot, 'path_reset'),
            sleep(timeoutMs)
        ]);
        bot.pathfinder.setGoal(null);
    } catch (err) {
        console.log(`[移动] pathfinder 失败: ${err.message}`);
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
        bot.chat('/home');
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
            bot.chat(warpCommand);
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
    await moveToPosition(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), { timeoutMs: 2500, minTimeoutMs: 700, range: 1.1 });
    return true;
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
    throw new Error('delivery target did not arrive after /tpa: ' + playerName);
}

async function requestTeleportToPlayer(playerName, timeoutMs = 90000, maxDistance = 5) {
    if (!/^[A-Za-z0-9_]{1,16}$/.test(String(playerName || ''))) {
        throw new Error('invalid delivery player name: ' + playerName);
    }

    const deadline = Date.now() + timeoutMs;
    let lastTpaAt = 0;
    let attempts = 0;
    while (Date.now() < deadline && currentTask && bot?.entity) {
        if (Date.now() - lastTpaAt >= 7000) {
            attempts += 1;
            bot.chat('/tpa ' + playerName);
            console.log('[transport] sent /tpa ' + playerName + ' attempt=' + attempts);
            reportEvent('delivery_tpa_sent', { taskId: currentTask?.id, playerName, itemName: currentTask?.itemName, quantity: currentTask?.quantity, attempts }).catch(() => {});
            lastTpaAt = Date.now();
        }

        const entity = getVisiblePlayerEntity(playerName);
        if (entity?.position) {
            const distance = bot.entity.position.distanceTo(entity.position);
            if (distance <= maxDistance) {
                console.log('[transport] delivery teleport confirmed near target: ' + playerName + ', distance=' + distance.toFixed(2));
                await sleep(650);
                return entity;
            }
        }
        if (deliveryTeleportConfirm.playerName === playerName && Date.now() - deliveryTeleportConfirm.at < 12000) {
            console.log('[transport] teleport success message received, waiting for player entity: ' + playerName);
        }
        await sleep(250);
    }
    throw new Error('delivery target did not accept /tpa in time: ' + playerName);
}

async function facePlayerFeet(playerName) {
    const entity = getVisiblePlayerEntity(playerName);
    if (!entity) throw new Error('delivery target not visible: ' + playerName);
    await bot.lookAt(entity.position.offset(0, 0.35, 0), true);
    await sleep(40);
    return entity;
}

async function backAwayFromPlayer(playerName, targetDistance = 2.8) {
    const entity = getVisiblePlayerEntity(playerName);
    if (!entity || !bot?.entity?.position) return;
    const distance = bot.entity.position.distanceTo(entity.position);
    if (distance >= targetDistance - 0.2) return;
    try {
        bot.setControlState('back', true);
        const deadline = Date.now() + 650;
        while (Date.now() < deadline && bot?.entity) {
            const latest = getVisiblePlayerEntity(playerName);
            if (!latest?.position) break;
            await bot.lookAt(latest.position.offset(0, 0.1, 0), true);
            if (!canStepBackwardSafely()) {
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
}

async function tossItemsTowardPlayerFeet(playerName, itemName, quantity) {
    if (!bot?.entity) throw new Error('transport bot not ready, cannot toss to player');
    await facePlayerFeet(playerName);
    await sleep(80);

    let remaining = quantity;
    const items = bot.inventory.items().filter(entry => itemNameMatches(entry, itemName));
    for (const item of items) {
        if (remaining <= 0) break;
        const amount = Math.min(item.count, remaining);
        await facePlayerFeet(playerName);
        await tossWithTimeout(item, amount, 'delivery to ' + playerName);
        remaining -= amount;
        if (remaining > 0) await sleep(20);
    }
    if (remaining > 0) throw new Error('not enough items to toss to player, remaining ' + remaining);
}

async function throwItemsToPlayer(playerName, itemName, quantity) {
    try {
        await assertSafeThrowLandingToPlayer(playerName);
        await facePlayerFeet(playerName);
        await backAwayFromPlayer(playerName, 3.4);
        await sleep(120);
        await facePlayerFeet(playerName);
        await tossItemsTowardPlayerFeet(playerName, itemName, quantity);
        console.log('[transport] tossed toward player feet for ' + playerName + ': ' + itemName + ' x' + quantity);
    } finally {
        try {
            try {
                bot.setControlState('back', true);
                setTimeout(() => {
                    try { bot.setControlState('back', false); } catch {}
                }, 650);
            } catch {}
            bot.chat('/home');
            console.log('[transport] returned /home immediately after delivery attempt');
        } catch (err) {
            console.log('[transport] /home after delivery failed: ' + err.message);
        } finally {
            setTimeout(() => {
                try { bot.setControlState('back', false); } catch {}
            }, 900);
        }
    }
}

async function dropItemsAtFeet(itemName, quantity) {
    if (!bot?.entity) throw new Error('transport bot not ready, cannot drop at feet');
    await bot.lookAt(bot.entity.position.offset(0, -1, 0));
    await sleep(150);

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
        await sleep(250);
    }
    if (remaining > 0) throw new Error('not enough items to drop at feet, remaining ' + remaining);
}

async function tossWithTimeout(item, amount, label = '') {
    let settled = false;
    await Promise.race([
        new Promise((resolve, reject) => {
            bot.toss(item.type, item.metadata, amount, (err) => {
                settled = true;
                err ? reject(err) : resolve();
            });
        }),
        new Promise(resolve => setTimeout(resolve, 2500))
    ]);
    if (!settled) {
        console.log('[transport] toss callback timeout, continue: ' + (label || item.name) + ' x' + amount);
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

let lastTpAcceptAt = 0;
function autoAcceptTpaMessage(message) {
    const text = String(message || '');
    if (!currentTask) return;
    if (/no valid teleport request/i.test(text)) return;

    const deliveryPlayer = String(currentTask.playerName || '');
    if (deliveryPlayer && (
        text.includes('?? ' + deliveryPlayer + ' ??????')
        || text.includes('sent a teleport request to ' + deliveryPlayer)
    )) {
        return;
    }
    if (deliveryPlayer && (
        text.includes('???? ' + deliveryPlayer + ' ???')
        || text.includes('teleported to ' + deliveryPlayer)
    )) {
        deliveryTeleportConfirm = { playerName: deliveryPlayer, at: Date.now() };
        console.log('[transport] delivery teleport message confirmed: ' + text.slice(0, 160));
        return;
    }

    const hasRequest = /tpa|tpahere|tpaccept|teleport|request/i.test(text) || text.includes('??') || text.includes('??');
    if (!hasRequest) return;

    const names = configuredMainNames();
    const relatedToTask = names.some(name => text.includes(name)) || text.includes(deliveryPlayer) || text.includes('??') || text.includes('??');
    if (!relatedToTask) return;

    const now = Date.now();
    if (now - lastTpAcceptAt < 1500) return;
    lastTpAcceptAt = now;
    bot.chat('/tpaccept');
    console.log('[transport] auto accepted teleport request: ' + text.slice(0, 160));
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => pollCommands().catch(() => {}), BOT_CONFIG.pollInterval || GLOBAL_CONFIG.pollInterval || 5000);
    pollCommands().catch(() => {});
}

function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(async () => {
        try {
            const resp = await axios.post(`${adminBase()}/api/bot/heartbeat`, {
                botId: `${BOT_TYPE}:bot${BOT_NUM}`,
                botNum: BOT_NUM,
                type: BOT_TYPE,
                status: hasSpawned && bot?.entity && !lastFatalLoginError ? 'online' : 'connecting',
                ready: Boolean(hasSpawned && bot?.entity && !lastFatalLoginError),
                lastError: lastFatalLoginError,
                health: bot?.health || 0,
                food: bot?.food || 0,
                busy: !!currentTask,
                task: currentTask,
                version: autoUpdater.currentVersion()
            }, { timeout: 5000 });

            if (resp.data?.command === 'FORCE_SLEEP') {
                shutdown(resp.data.reason || '云端要求休眠');
            }
        } catch (err) {
            console.log(`[心跳] 上报失败: ${err.message}`);
        }
    }, BOT_CONFIG.heartbeatInterval || GLOBAL_CONFIG.heartbeatInterval || 30000);
}

async function checkAndUpdate() {
    if (isUpdating) return;
    if (!BOT_CONFIG.mainHost && !GLOBAL_CONFIG.mainHost) return;

    isUpdating = true;
    try {
        const success = await autoUpdater.performUpdate(
            BOT_CONFIG.mainHost || GLOBAL_CONFIG.mainHost,
            BOT_CONFIG.mainAdminPort || GLOBAL_CONFIG.mainAdminPort || BOT_CONFIG.mainPort || GLOBAL_CONFIG.mainPort || 28474
        );
        if (success) {
            shutdown('版本更新完成，准备重启');
        }
    } catch (err) {
        console.log(`[更新] 检查失败: ${err.message}`);
    } finally {
        isUpdating = false;
    }
}

function createBot() {
    const host = BOT_CONFIG.host || GLOBAL_CONFIG.host;
    const port = BOT_CONFIG.port || GLOBAL_CONFIG.port || 25565;
    const version = BOT_CONFIG.version || GLOBAL_CONFIG.version || '1.21.11';
    const profilesFolder = BOT_CONFIG.profilesFolder
        || GLOBAL_CONFIG.profilesFolder
        || path.join(__dirname, '.auth-cache', BOT_TYPE, `bot${BOT_NUM}`);
    let spawned = false;
    hasSpawned = false;
    lastFatalLoginError = '';

    console.log(`[transport-connect] createBot ${host}:${port} version=${version}`);
    console.log(`[transport-auth] account=${BOT_CONFIG.email} cache=${profilesFolder}`);

    bot = mineflayer.createBot({
        host,
        port,
        username: BOT_CONFIG.email,
        auth: 'microsoft',
        version,
        profilesFolder,
        onMsaCode: (data) => {
            const login = normalizeMicrosoftLogin(data);
            console.log(`[LOGIN_URL] ${login.url}`);
            console.log(`[LOGIN_CODE] ${login.code || ''}`);
            console.log(`[LOGIN_STEP] ${formatLoginInstruction(login)}`);
            if (login.message) console.log(`[LOGIN_HINT] ${login.message}`);
        }
    });

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
    bot._client?.on('kick_disconnect', packet => console.error('[transport-kick-packet]', JSON.stringify(packet)));
    bot._client?.on('disconnect', packet => console.error('[transport-disconnect-packet]', JSON.stringify(packet)));

    bot.on('login', () => {
        console.log('[transport-login] protocol login ok, waiting spawn');
    });

    bot.on('spawn', () => {
        spawned = true;
        hasSpawned = true;
        lastFatalLoginError = '';
        console.log('[TRANSPORT_SPAWN_READY]');
        console.log('[??] ??????');
        reportEvent('spawn');
        startPolling();
        startHeartbeat();

        if (updateCheckTimer) clearInterval(updateCheckTimer);
        updateCheckTimer = setInterval(() => checkAndUpdate().catch(() => {}), 60 * 60 * 1000);
        setTimeout(() => checkAndUpdate().catch(() => {}), 10000);
    });

    bot.on('error', (err) => {
        lastFatalLoginError = err.message || String(err);
        console.error('[??]', err.message);
        reportEvent('error', { message: err.message });
    });

    bot.on('kicked', (reason) => {
        lastFatalLoginError = typeof reason === 'string' ? reason : JSON.stringify(reason);
        console.error('[transport-kicked]', typeof reason === 'string' ? reason : JSON.stringify(reason));
        reportEvent('kicked', { reason });
    });

    bot.on('end', () => {
        hasSpawned = false;
        console.log('[??] ?????');
        reportEvent('disconnect');
        if (!shuttingDown && !reconnecting) {
            reconnecting = true;
            setTimeout(async () => {
                reconnecting = false;
                const allowed = await requestStartPermission();
                if (allowed) createBot();
                else shutdown('????????');
            }, 5000);
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
    console.log(`[退出] ${reason}`);
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
        console.error('无法读取配置文件:', err.message);
        process.exit(1);
    }

    BOT_NUM = parseInt(process.argv[3], 10);
    if (Number.isNaN(BOT_NUM)) {
        console.error('请指定 Bot 编号。用法: node transport_bot.js <configPath> <botNum>');
        process.exit(1);
    }

    BOT_TYPE = process.env.BOT_TYPE || 'local';
    BOT_CONFIG = GLOBAL_CONFIG.bots.find(entry => entry.num === BOT_NUM && (entry.type || 'local') === BOT_TYPE)
        || GLOBAL_CONFIG.bots.find(entry => entry.num === BOT_NUM);

    if (!BOT_CONFIG) {
        console.error(`未找到编号 ${BOT_NUM} 的运输 Bot`);
        process.exit(1);
    }

    console.log(`[启动] 运输 Bot #${BOT_NUM} (${BOT_TYPE === 'cloud' ? '云端备用' : '本地主用'})`);
    console.log(`[配置] Minecraft: ${BOT_CONFIG.host || GLOBAL_CONFIG.host}:${BOT_CONFIG.port || GLOBAL_CONFIG.port}`);
    console.log(`[配置] 后台: ${adminBase()}`);

    const allowed = await requestStartPermission();
    if (!allowed) {
        shutdown('未获得登录权，避免抢号');
        return;
    }

    createBot();
})();
