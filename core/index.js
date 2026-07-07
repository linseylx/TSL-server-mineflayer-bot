const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const vec3 = require('vec3')
const fs = require('fs')
const path = require('path')
const { GoalNear } = require('mineflayer-pathfinder').goals
const EventEmitter = require('events')
const itemTranslator = require('../utils/itemTranslator')
const { normalizeMicrosoftLogin, formatLoginInstruction } = require('../utils/microsoftLogin')

let scanCancelRequested = false

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'bot_config.json');

const INSTANCE_LOCK_DIR = path.join(__dirname, '..', 'data');
const INSTANCE_LOCK_FILE = path.join(INSTANCE_LOCK_DIR, 'mainbot.lock.json');
let instanceLockAcquired = false;

function isProcessAlive(pid) {
  if (!pid || Number(pid) === process.pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function acquireInstanceLock() {
  if (process.env.MAINBOT_ALLOW_DUPLICATE === '1') {
    log('单实例锁', '已通过 MAINBOT_ALLOW_DUPLICATE=1 跳过，仅用于排障', 'yellow');
    return true;
  }

  try {
    if (!fs.existsSync(INSTANCE_LOCK_DIR)) fs.mkdirSync(INSTANCE_LOCK_DIR, { recursive: true });
    const payload = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), cwd: process.cwd() }, null, 2);
    try {
      fs.writeFileSync(INSTANCE_LOCK_FILE, payload, { flag: 'wx' });
      instanceLockAcquired = true;
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let existing = null;
      try { existing = JSON.parse(fs.readFileSync(INSTANCE_LOCK_FILE, 'utf8')); } catch {}
      if (existing && isProcessAlive(existing.pid)) {
        log('单实例锁', '检测到主 Bot 已在运行，PID=' + existing.pid + '，本进程退出以避免 duplicate_login', 'red');
        process.exit(12);
      }
      fs.unlinkSync(INSTANCE_LOCK_FILE);
      fs.writeFileSync(INSTANCE_LOCK_FILE, payload, { flag: 'wx' });
      instanceLockAcquired = true;
      log('单实例锁', '已清理失效锁并继续启动', 'yellow');
      return true;
    }
  } catch (error) {
    log('单实例锁', '无法创建锁文件: ' + error.message, 'red');
    process.exit(13);
  }
}

function releaseInstanceLock() {
  if (!instanceLockAcquired) return;
  try {
    const existing = JSON.parse(fs.readFileSync(INSTANCE_LOCK_FILE, 'utf8'));
    if (Number(existing.pid) === process.pid) fs.unlinkSync(INSTANCE_LOCK_FILE);
  } catch {}
  instanceLockAcquired = false;
}

process.on('exit', releaseInstanceLock);
process.on('SIGINT', () => { releaseInstanceLock(); process.exit(130); });
process.on('SIGTERM', () => { releaseInstanceLock(); process.exit(143); });


const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
}

function log(prefix, message, color = 'cyan') {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`)
  try { if (typeof sendLogToServer === 'function') sendLogToServer(`[${prefix}] ${message}`) } catch {}
}

let configData = {
    admins: ['Goldfish_lx', 'Linseylx'],
    lock: { isLocked: false },
    construction: { isActive: false }
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            const data = JSON.parse(raw);
            configData = { ...configData, ...data };
            log('配置', `仓库模式: ${configData.warehouseMode || 'PUBLIC'}, 小镇前缀: ${configData.townPrefix || '无'}`, 'green');
        }
    } catch (e) {
        log('配置', `热重载失败，使用当前配置: ${e.message}`, 'yellow');
    }
}

function getConfig() { return configData; }
function isAdmin(username) { return configData.admins?.includes(username) || false; }

loadConfig();

setInterval(() => {
    loadConfig();
}, 30000);

let ipcInterval = null
let serverSocket = null

const monitor = {
    setBotInstance: () => {},
    initSiliao: () => {},
    checkReportFiles: () => {},
    checkPlayerPositions: () => {},
    checkSiliaoFile: () => {},
    saveSiliaoMessage: () => {}
};

const playerTownCache = new Map()

function asPlainText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value.toString === 'function') return value.toString()
  try { return JSON.stringify(value) } catch { return '' }
}

function normalizeTownText(value) {
  return asPlainText(value).replace(/[『』\[\](){}<>]/g, '').trim()
}

function getConfiguredTownName() {
  return normalizeTownText(configData.townPrefix || '[千年科技]') || '千年科技'
}

function rememberTownFromChatMessage(message) {
  const text = asPlainText(message)
  const match = text.match(/^[『\[]([^』\]]+)[』\]]\s*([A-Za-z0-9_]{2,32})\s*>\s*(.*)$/)
  if (!match) return

  const town = normalizeTownText(match[1])
  const username = match[2].trim()
  if (!town || !username) return

  playerTownCache.set(username.toLowerCase(), {
    town,
    prefix: `[${town}]`,
    seenAt: Date.now()
  })
}

function getCachedTown(username) {
  const cached = playerTownCache.get(String(username || '').toLowerCase())
  if (!cached) return null
  if (Date.now() - cached.seenAt > 30 * 60 * 1000) {
    playerTownCache.delete(String(username || '').toLowerCase())
    return null
  }
  return cached
}

function connectToServer() {
  try {
    const io = require('socket.io-client');
    serverSocket = io('http://localhost:3000');
    
    serverSocket.on('connect', () => {
      log('服务器连接', '已连接到服务器', 'green');
    });
    
    serverSocket.on('disconnect', () => {
      log('服务器连接', '与服务器断开连接', 'red');
      setTimeout(connectToServer, 5000);
    });
    
    serverSocket.on('error', (err) => {
      log('服务器连接', `连接错误: ${err.message}`, 'red');
    });
  } catch (e) {
    log('服务器连接', `无法连接到服务器: ${e.message}`, 'red');
  }
}

function sendLogToServer(message) {
  if (serverSocket && serverSocket.connected) {
    serverSocket.emit('botLog', message);
  }
}

function sendStatusToServer(status) {
  if (serverSocket && serverSocket.connected) {
    serverSocket.emit('botStatus', status);
  }
}

function sendIpcStatus() {
  if (process.send && isBotReady()) {
    try {
      const bot = state.bot
      process.send({
        type: 'statusUpdate',
        status: 'ready',
        health: bot.health,
        food: bot.food,
        username: bot.username || '',
        position: {
          x: bot.entity.position.x,
          y: bot.entity.position.y,
          z: bot.entity.position.z
        }
      })
    } catch (e) {
      // 忽略IPC错误
    }
  }
}

function startIpc() {
  stopIpc()
  ipcInterval = setInterval(sendIpcStatus, 2000)
}

function stopIpc() {
  if (ipcInterval) {
    clearInterval(ipcInterval)
    ipcInterval = null
  }
}

function sendIpcLog(message, type = 'info') {
  if (process.send) {
    try {
      process.send({ type: 'log', message, type })
    } catch (e) {
      // 忽略
    }
  }
}

EventEmitter.defaultMaxListeners = 30

const state = {
  bot: null,
  reconnectAttempts: 0,
  lastActivityTime: Date.now(),
  heartbeatInterval: null,
  mcItems: {},
  lmMappings: {}
}

const CONFIG = {
  maxReconnectAttempts: 20,
  reconnectDelay: 5000,
  heartbeatInterval: 30000,
  mcItemsFile: path.join(__dirname, '..', 'data', 'mc_items.json'),
  cacheFile: path.join(__dirname, 'translation_cache.json')
}

let transportTaskPolling = false
let activeTransportTask = null
let transportTaskPollTimer = null
let mainBotControlPolling = false
let reconnectDisabledReason = null

function httpJson(method, port, requestPath, payload = null) {
  return new Promise((resolve, reject) => {
    const http = require('http')
    const body = payload ? JSON.stringify(payload) : ''
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 5000
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {})
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on('timeout', () => req.destroy(new Error('request timeout')))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeChat(message) {
  try {
    if (state.bot && typeof state.bot.chat === 'function') {
      state.bot.chat(message)
    } else {
      log('聊天失败', message, 'yellow')
    }
  } catch (err) {
    log('聊天错误', err.message, 'yellow')
  }
}

function safePrivateMessage(playerName, message) {
  const target = String(playerName || '').trim()
  const text = String(message || '').trim().slice(0, 120)
  if (!/^[A-Za-z0-9_]{1,16}$/.test(target) || !text) {
    appendToChatFile('private message skipped: ' + target)
    return false
  }
  safeChat('/msg ' + target + ' ' + text)
  return true
}

function isBotReady() {
  return state.bot && state.bot._client && state.bot.entity
}

function loadMCItems() {
  try {
    if (fs.existsSync(CONFIG.mcItemsFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.mcItemsFile, 'utf8'))
      state.mcItems = data.items || {}
      log('物品映射', `已加载 ${Object.keys(state.mcItems).length} 条物品翻译`)
    }
  } catch (err) {
    log('物品映射', `加载失败: ${err.message}`, 'yellow')
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CONFIG.cacheFile)) {
      state.lmMappings = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'))
      log('缓存', `已加载 ${Object.keys(state.lmMappings).length} 条自定义翻译`)
    }
  } catch (err) {
    log('缓存', `加载失败: ${err.message}`, 'yellow')
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(state.lmMappings, null, 2))
  } catch (err) {
    log('缓存', `保存失败: ${err.message}`, 'yellow')
  }
}

function extractCustomName(item) {
  if (!item) return ''
  
  if (item.customName) {
    if (typeof item.customName === 'string') return item.customName
    if (item.customName?.text) return item.customName.text
  }
  
  if (item.nbt) {
    try {
      const nbtData = typeof item.nbt === 'string' ? JSON.parse(item.nbt) : item.nbt
      if (nbtData?.tag?.display?.Name) {
        const name = nbtData.tag.display.Name
        if (typeof name === 'string') return name
        if (name?.text) return name.text
      }
    } catch {}
  }
  
  if (item.metadata) {
    try {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      if (meta?.customName) {
        if (typeof meta.customName === 'string') return meta.customName
        if (meta.customName?.text) return meta.customName.text
      }
    } catch {}
  }
  
  return ''
}

function getWarehouseCustomName(item, name) {
  const customName = extractCustomName(item)
  return itemTranslator.shouldUseCustomName(name, customName) ? customName : ''
}

function nbtToPlain(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(nbtToPlain)
  if (typeof value !== 'object') return value
  if (Object.prototype.hasOwnProperty.call(value, 'value') && (Object.prototype.hasOwnProperty.call(value, 'type') || Object.keys(value).length <= 2)) {
    return nbtToPlain(value.value)
  }
  const result = {}
  for (const [key, child] of Object.entries(value)) result[key] = nbtToPlain(child)
  return result
}

function unwrapNbtValue(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(unwrapNbtValue)
  if (typeof value !== 'object') return value
  if (Object.prototype.hasOwnProperty.call(value, 'value') && (Object.prototype.hasOwnProperty.call(value, 'type') || Object.keys(value).length <= 2)) {
    return unwrapNbtValue(value.value)
  }
  const result = {}
  for (const [key, child] of Object.entries(value)) result[key] = unwrapNbtValue(child)
  return result
}

function normalizeContainerItemName(entry) {
  const rawName = entry?.id || entry?.Name || entry?.name || entry?.item || entry?.Item || entry?.itemName || entry?.NameId
  if (!rawName) return ''
  if (typeof rawName === 'string') return rawName.replace(/^minecraft:/, '')
  if (typeof rawName === 'object') return String(rawName.value || rawName.name || '').replace(/^minecraft:/, '')
  return String(rawName).replace(/^minecraft:/, '')
}

function normalizeContainerItemCount(entry) {
  const rawCount = entry?.Count ?? entry?.count ?? entry?.amount ?? entry?.Amount ?? 1
  const count = typeof rawCount === 'object' ? Number(rawCount.value ?? 1) : Number(rawCount)
  return Number.isFinite(count) && count > 0 ? count : 1
}

function normalizeContainerSlot(entry, fallback) {
  const rawSlot = entry?.Slot ?? entry?.slot ?? entry?.slotId ?? fallback
  const slot = typeof rawSlot === 'object' ? Number(rawSlot.value ?? fallback) : Number(rawSlot)
  return Number.isFinite(slot) ? slot : fallback
}

function normalizeShulkerContentEntry(entry, fallbackSlot) {
  const plain = unwrapNbtValue(entry)
  const name = normalizeContainerItemName(plain)
  if (!name || name === 'air') return null
  return {
    name,
    displayName: itemTranslator.translateItemName(name),
    count: normalizeContainerItemCount(plain),
    slot: normalizeContainerSlot(plain, fallbackSlot)
  }
}

function collectContainerLists(value, lists = []) {
  const plain = unwrapNbtValue(value)
  if (plain === null || plain === undefined) return lists
  if (Array.isArray(plain)) {
    if (plain.some(entry => normalizeContainerItemName(unwrapNbtValue(entry)))) lists.push(plain)
    for (const child of plain) collectContainerLists(child, lists)
    return lists
  }
  if (typeof plain !== 'object') return lists

  for (const key of ['Items', 'items', 'container', 'minecraft:container', 'BlockEntityTag']) {
    if (plain[key]) collectContainerLists(plain[key], lists)
  }

  const components = plain.components || plain.Components || plain.tag?.components || plain.tag?.Components
  if (components) {
    for (const key of ['minecraft:container', 'container', 'minecraft:bundle_contents', 'bundle_contents']) {
      if (components[key]) collectContainerLists(components[key], lists)
    }
  }

  return lists
}

function getShulkerContents(item) {
  const itemName = String(item?.name || '').replace(/^minecraft:/, '')
  if (!itemName.endsWith('shulker_box')) return []

  const candidates = []
  for (const source of [item?.nbt, item?.components, item?.componentMap, item?.metadata, item]) {
    try {
      if (!source) continue
      const parsed = typeof source === 'string' ? JSON.parse(source) : source
      collectContainerLists(parsed, candidates)
    } catch {}
  }

  const bestList = candidates
    .map(list => list.map((entry, index) => normalizeShulkerContentEntry(entry, index)).filter(Boolean))
    .filter(list => list.length > 0)
    .sort((a, b) => b.length - a.length)[0] || []

  return bestList.sort((a, b) => a.slot - b.slot)
}

function getShulkerSignature(contents) {
  if (!Array.isArray(contents) || contents.length === 0) return ''
  return contents
    .map(item => `${item.name}:${Number(item.count || 0)}`)
    .sort()
    .join('|')
}

function isShulkerBlockName(name) {
  return String(name || '').replace(/^minecraft:/, '').endsWith('shulker_box')
}

function makeBulkScanKey(primaryName) {
  return 'bulk:' + String(primaryName || '').replace(/^minecraft:/, '')
}

function buildLooseBulkScanItems(items, sourceLocation, sourceBlockName) {
  const groups = new Map()
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.name || isShulkerBlockName(item.name)) continue
    const key = String(item.name || '').replace(/^minecraft:/, '')
    if (!key || key === 'air') continue
    const customName = getWarehouseCustomName(item, key)
    const mapKey = key + '|' + (customName || '')
    const current = groups.get(mapKey) || { name: key, customName, count: 0 }
    current.count += Number(item.count || 0)
    groups.set(mapKey, current)
  }
  return [...groups.values()].filter(group => group.count > 0).map(group => {
    const displayName = itemTranslator.translateItemName(group.name, group.customName)
    const source = {
      ...sourceLocation,
      count: group.count,
      bulkStorageType: 'loose',
      storageItemName: group.name,
      bulkPrimaryName: group.name,
      sourceBlockName
    }
    return {
      __bulkScanItem: true,
      name: group.name,
      displayName: '大宗：' + (displayName || group.name) + '（散装）',
      customName: group.customName || '',
      count: group.count,
      sourceLocation: source,
      locations: [source],
      shulkerContents: [],
      shulkerSignature: makeBulkScanKey(group.name),
      bulk: {
        isBulk: true,
        primaryName: group.name,
        primaryDisplayName: displayName || group.name,
        totalCount: group.count,
        storageType: 'loose',
        unit: 'loose_item'
      }
    }
  })
}

function getBulkInfo(itemName, shulkerContents) {
  const cleanName = String(itemName || '').replace(/^minecraft:/, '')
  if (!cleanName.endsWith('shulker_box')) return null
  const contents = Array.isArray(shulkerContents)
    ? shulkerContents.filter(entry => entry && entry.name && !String(entry.name).replace(/^minecraft:/, '').endsWith('shulker_box'))
    : []
  if (contents.length === 0) return null

  const totals = new Map()
  for (const entry of contents) {
    const name = String(entry.name || '').replace(/^minecraft:/, '')
    if (!name || name === 'air') continue
    totals.set(name, (totals.get(name) || 0) + Number(entry.count || 0))
  }
  if (totals.size === 0) return null

  const [primaryName, primaryCount] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
  const totalCount = [...totals.values()].reduce((sum, count) => sum + count, 0)
  return {
    isBulk: true,
    primaryName,
    primaryDisplayName: itemTranslator.translateItemName(primaryName),
    primaryCount,
    totalCount,
    itemTypes: totals.size,
    unit: 'shulker_box'
  }
}

function isValidTranslation(translation, original) {
  if (!translation || translation.trim() === '') return false
  if (translation.trim().toLowerCase() === original.trim().toLowerCase()) return false
  if (translation.length > 50) return false
  const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  if (emojiRegex.test(translation)) return false
  const asciiOnly = /^[\x20-\x7E]+$/.test(translation)
  if (asciiOnly && translation !== original) return false
  return true
}

async function translateWithLMStudio(name) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF',
        messages: [{ role: 'user', content: `Translate Minecraft item name "${name}" to Chinese, only output the Chinese translation, no emojis` }],
        temperature: 0.01,
        max_tokens: 20
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    if (response.ok) {
      const data = await response.json()
      const translation = data.choices[0]?.message?.content?.trim()
      if (isValidTranslation(translation, name)) {
        state.lmMappings[name] = translation
        saveCache()
        return translation
      }
    }
  } catch {}
  return name
}

async function translateItemName(name) {
  if (!name) return '未知物品'
  const key = name.toLowerCase().trim().replace('minecraft:', '')
  return state.lmMappings[key] || state.mcItems[key] || await translateWithLMStudio(key)
}

const SHULKER_BLOCKS = [
  'shulker_box', 'white_shulker_box', 'orange_shulker_box', 'magenta_shulker_box', 'light_blue_shulker_box',
  'yellow_shulker_box', 'lime_shulker_box', 'pink_shulker_box', 'gray_shulker_box', 'light_gray_shulker_box',
  'cyan_shulker_box', 'purple_shulker_box', 'blue_shulker_box', 'brown_shulker_box', 'green_shulker_box',
  'red_shulker_box', 'black_shulker_box'
]
const CHEST_BLOCKS = ['chest', 'trapped_chest', 'barrel', ...SHULKER_BLOCKS]
const CHAT_FILE = path.join(__dirname, 'chat.txt')

function appendToChatFile(content) {
  try {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const line = `[${timestamp}] ${content}\n`
    fs.appendFileSync(CHAT_FILE, line, 'utf8')
    log('箱子', '信息已保存到 chat.txt', 'green')
  } catch (err) {
    log('文件', `写入失败: ${err.message}`, 'yellow')
  }
}

async function previewChest() {
  if (!isBotReady()) {
    appendToChatFile('Bot未就绪')
    return
  }

  const bot = state.bot
  const entity = bot.entity

  try {
    let chestBlock = null
    
    try {
      const cursorBlock = bot.blockAtCursor(5)
      if (cursorBlock && CHEST_BLOCKS.includes(cursorBlock.name)) {
        chestBlock = cursorBlock
      }
    } catch (e) {}
    
    if (!chestBlock) {
      for (let dist = 1; dist <= 5; dist++) {
        const pos = entity.position.offset(0, 1.6, 0).offset(
          -Math.sin(entity.yaw) * Math.cos(entity.pitch) * dist,
          -Math.sin(entity.pitch) * dist,
          -Math.cos(entity.yaw) * Math.cos(entity.pitch) * dist
        ).floored()
        const block = bot.blockAt(pos)
        if (block && CHEST_BLOCKS.includes(block.name)) {
          chestBlock = block
          break
        }
      }
    }

    if (!chestBlock) {
      appendToChatFile('面前没有找到箱子')
      return
    }

    const chestPos = `(${chestBlock.position.x}, ${chestBlock.position.y}, ${chestBlock.position.z})`
    
    await bot.lookAt(chestBlock.position.offset(0.5, 0.5, 0.5))
    await new Promise(resolve => setTimeout(resolve, 300))

    let container = null
    let lastError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        container = await Promise.race([
          bot.openContainer(chestBlock),
          new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 3000))
        ])
        if (container) break
      } catch (e) {
        lastError = e
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (!container) {
      appendToChatFile(`无法打开箱子 ${chestPos}: ${lastError?.message}`)
      return
    }

    let items = []
    try {
      if (container && container.slots) {
        const slotsArray = Array.isArray(container.slots) ? container.slots : []
        const invSize = container.inventorySize || container.size || 27
        items = slotsArray.slice(0, invSize).filter(slot => slot && slot.type !== 0)
      } else if (container && container.containerItems) {
        const contItems = Array.isArray(container.containerItems) ? container.containerItems : (typeof container.containerItems === 'object' ? Object.values(container.containerItems) : [])
        items = contItems.filter(slot => slot && slot.type !== 0)
      }
    } catch (e) {
      items = []
    }

    if (!items || items.length === 0) {
      appendToChatFile(`箱子 ${chestPos} 是空的`)
    } else {
      const itemNames = items
        .filter(item => item && item.name)
        .map(item => {
          const key = (item.name || '').replace('minecraft:', '')
          const count = item.count || 1
          const customName = getWarehouseCustomName(item, key)
          const displayName = itemTranslator.translateItemName(key, customName)
          return `${displayName} x${count}`
        })
        .join(', ')
      appendToChatFile(`箱子 ${chestPos} 内容: ${itemNames}`)
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      if (typeof container.close === 'function') {
        await container.close()
      }
    } catch (e) {
      // 忽略关闭错误
    }

  } catch (e) {
    log('箱子', `出错: ${e.message}`, 'yellow')
    appendToChatFile(`预览箱子时出错: ${e.message}`)
  }
}

function safeCloseChest(chest) {
  try {
    chest?.close?.()
  } catch {}
}

async function scanNearbyChests() {
  if (!isBotReady()) return

  const pos = state.bot.entity.position
  const range = 10
  const chests = []

  for (let x = -range; x <= range; x++) {
    for (let y = -range; y <= range; y++) {
      for (let z = -range; z <= range; z++) {
        try {
          const block = state.bot.blockAt(pos.offset(x, y, z).floored())
          if (block?.name && CHEST_BLOCKS.includes(block.name)) {
            chests.push({
              type: block.name,
              x: Math.floor(pos.x) + x,
              y: Math.floor(pos.y) + y,
              z: Math.floor(pos.z) + z,
              dist: Math.sqrt(x*x + y*y + z*z)
            })
          }
        } catch {}
      }
    }
  }

  if (chests.length === 0) {
    safeChat('/msg Xigold_lx 周围10格内没有找到箱子')
    return
  }

  chests.sort((a, b) => a.dist - b.dist)
  const list = chests.slice(0, 5).map(c => `${c.type}(${c.x},${c.y},${c.z}) 距离${c.dist.toFixed(1)}格`).join('; ')
  const msg = `找到 ${chests.length} 个箱子: ${list}${chests.length > 5 ? ` 等${chests.length - 5}个...` : ''}`
  safeChat(`/msg Xigold_lx ${msg}`)
}

const COMMANDS = {
  '!箱子': startLoopOpenChest,
  '!chest': startLoopOpenChest,
  '!扫描箱子': scanNearbyChests,
  '!scanchest': scanNearbyChests,
  '!私聊箱子': startPrivateChestSequence,
  '!取货': handlePickupRequest
}

function handleCommand(sender, message) {
  if (handleWelcomeBindCommand(sender, message)) return true

  const cmd = COMMANDS[message]
  if (cmd) {
    cmd(sender)
    return true
  }

  const pickupMatch = message.match(/^!取货\s+(.+)/)
  if (pickupMatch) {
    if (!checkTownPermission(sender)) {
      safeChat(`抱歉 ${sender}，你没有权限使用此功能`)
      return true
    }
    const args = pickupMatch[1].split(/\s+/)
    handlePickupRequest(sender, args)
    return true
  }

  const bugMatch = message.match(/^!bug\s+(.+)/)
  if (bugMatch) {
    handleBugReport(sender, bugMatch[1])
    return true
  }

  return false
}

function normalizeMinecraftUuid(uuid) {
  const raw = String(uuid || '').replace(/-/g, '').trim()
  if (!/^[0-9a-fA-F]{32}$/.test(raw)) return ''
  return raw.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5').toLowerCase()
}

function isValidMinecraftUsername(username) {
  return /^[A-Za-z0-9_]{1,16}$/.test(String(username || '').trim())
}

async function fetchPlayerUuid(playerName) {
  const targetName = String(playerName || '').trim()
  if (!isValidMinecraftUsername(targetName)) {
    throw new Error('玩家名格式错误')
  }

  const onlinePlayer = state.bot?.players?.[targetName]
  const onlineUuid = normalizeMinecraftUuid(onlinePlayer?.uuid)
  if (onlineUuid) return onlineUuid

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const url = 'https://api.mojang.com/users/profiles/minecraft/' + encodeURIComponent(targetName)
    const response = await fetch(url, { signal: controller.signal })
    if (response.status === 204 || response.status === 404) {
      throw new Error('API 未找到该玩家')
    }
    if (!response.ok) {
      throw new Error('API 返回 ' + response.status)
    }
    const profile = await response.json()
    const uuid = normalizeMinecraftUuid(profile?.id)
    if (!uuid) throw new Error('API 返回 UUID 无效')
    return uuid
  } finally {
    clearTimeout(timeout)
  }
}

async function runWelcomeBindCommand(adminName, targetName) {
  try {
    const uuid = await fetchPlayerUuid(targetName)
    safeChat('/tsl bindwelcome ' + uuid)
    appendToChatFile('欢迎绑定完成: ' + adminName + ' -> ' + targetName + ' UUID=' + uuid)
  } catch (err) {
    const message = err?.name === 'AbortError' ? 'UUID API 超时' : err.message
    appendToChatFile('欢迎绑定失败: ' + adminName + ' -> ' + targetName + '，原因: ' + message)
  }
}

function handleWelcomeBindCommand(sender, message) {
  const text = String(message || '').trim()
  const match = text.match(/^!欢迎\s+([A-Za-z0-9_]{1,16})$/)
  if (!match) return false

  if (!String(sender || '').includes('Xigold_lx')) {
    return true
  }

  const targetName = match[1]
  const adminName = 'Xigold_lx'
  runWelcomeBindCommand(adminName, targetName)
  return true
}

function checkTownPermission(playerName) {
  const mode = configData.warehouseMode || 'PUBLIC'
  if (mode === 'PUBLIC') return true

  if (mode === 'TOWN_ONLY') {
    const prefixText = getConfiguredTownName()
    const cachedTown = getCachedTown(playerName)
    if (cachedTown?.town === prefixText) return true

    const player = state.bot?.players[playerName]
    if (!player) return false
    const playerPrefix = asPlainText(player.prefix)
    const tabListName = playerPrefix
      ? playerPrefix + player.username
      : (asPlainText(player.displayName) || playerName)
    const cleanTabName = normalizeTownText(tabListName)

    return cleanTabName.includes(prefixText)
  }

  return true
}

async function handleBugReport(sender, bugDescription) {
  appendToChatFile(`收到Bug报告: ${sender} - ${bugDescription}`)
  
  const bot = state.bot
  const position = bot?.entity?.position
  const posStr = position ? `(${Math.floor(position.x)}, ${Math.floor(position.y)}, ${Math.floor(position.z)})` : '未知'
  
  try {
    const reportData = {
      sender: sender,
      description: bugDescription,
      position: posStr,
      timestamp: Date.now()
    }
    
    if (process.send) {
      process.send({ type: 'bugReport', report: reportData })
    }
    
    const http = require('http')
    const postData = JSON.stringify(reportData)
    
    const options = {
      hostname: 'localhost',
      port: 28474,
      path: '/api/bug-report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = http.request(options, (res) => {
      res.on('data', () => {})
      res.on('end', () => {
        appendToChatFile('Bug报告已发送到服务器')
      })
    })
    
    req.on('error', (e) => {
      appendToChatFile(`发送Bug报告失败: ${e.message}`)
    })
    
    req.write(postData)
    req.end()
    safePrivateMessage(sender, '\u611f\u8c22\u4f60\u7684\u53cd\u9988\uff0cBug \u62a5\u544a\u5df2\u6536\u5230\u3002\uff08\u53cd\u9988\uff09')
  } catch (e) {
    appendToChatFile(`处理Bug报告异常: ${e.message}`)
  }
}

async function startPrivateChestSequence() {
  if (!isBotReady()) {
    appendToChatFile('Bot未就绪')
    return
  }

  const bot = state.bot

  try {
    appendToChatFile('正在执行: /phome anyun_安芸工业区')
    bot.chat('/phome anyun_安芸工业区')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const startX = -20840
    const startY = 61
    const startZ = 11675
    
    appendToChatFile(`正在走路到起始位置: (${startX}, ${startY}, ${startZ})`)
    await moveToPosition(startX, startY, startZ)
    
    const currentPos = bot.entity.position
    appendToChatFile(`已到达位置: (${Math.floor(currentPos.x)}, ${Math.floor(currentPos.y)}, ${Math.floor(currentPos.z)})`)

    appendToChatFile('开始搜索箱子...')
    await openChestsAtZ11637(startX, startZ)

    appendToChatFile('私聊箱子任务完成')
    
  } catch (e) {
    log('私聊箱子', `出错: ${e.message}`, 'yellow')
    appendToChatFile(`私聊箱子任务出错: ${e.message}`)
  }
}

async function openChestsAtZ11637(startX, startZ) {
  const bot = state.bot
  const targetZ = 11637
  const y = 60
  
  await moveToZRow(targetZ, y)
  
  const minX = -20845
  const maxX = -20820
  
  appendToChatFile(`开始打开 z=${targetZ}, y=${y} 的箱子，x 范围: ${minX} 到 ${maxX}`)
  
  for (let x = minX; x <= maxX; x++) {
    const pos = new vec3(x, y, targetZ)
    const block = bot.blockAt(pos)
    
    if (block && CHEST_BLOCKS.includes(block.name)) {
      try {
        appendToChatFile(`找到箱子: (${x}, ${y}, ${targetZ})`)
        
        await moveToXPosition(x - 1, y, targetZ)
        
        await openChestAtPosition(x, y, targetZ)
        
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (e) {
        appendToChatFile(`打开箱子 (${x}, ${y}, ${targetZ}) 失败: ${e.message}`)
      }
    }
  }
  
  appendToChatFile('已完成所有箱子的扫描')
}

async function openChestAtPosition(x, y, z, options = {}) {
  const bot = state.bot
  
  try {
    const chestPos = new vec3(x, y, z)
    let chestBlock = null
    
    appendToChatFile(`尝试打开箱子: (${x}, ${y}, ${z})`)
    
    for (let attempt = 0; attempt < 5; attempt++) {
      chestBlock = bot.blockAt(chestPos)
      if (chestBlock && CHEST_BLOCKS.includes(chestBlock.name)) {
        appendToChatFile(`检测到箱子: ${chestBlock.name}`)
        break
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    if (!chestBlock || !CHEST_BLOCKS.includes(chestBlock.name)) {
      appendToChatFile(`未找到箱子或不是有效箱子类型`)
      return false
    }
    
    const currentPos = bot.entity.position
    const chestCenter = chestBlock.position.offset(0.5, 0.5, 0.5)
    const currentDist = currentPos.distanceTo(chestCenter)
    
    appendToChatFile(`当前距离箱子中心: ${currentDist.toFixed(1)} 格`)
    
    const maxOpenDistance = Number(options.maxOpenDistance) || 4.6
    if (!options.skipMove && currentDist > maxOpenDistance) {
      const standX = x
      const standY = Number.isFinite(Number(options.standY)) ? Number(options.standY) : Math.floor(bot.entity.position.y)
      const standZ = z + 1
      appendToChatFile(`距离太远，移动到箱子旁边: (${standX}, ${standY}, ${standZ})`)
      await moveToPosition(standX, standY, standZ, { timeoutMs: Number(options.moveTimeoutMs) || 2500, minTimeoutMs: 900 })
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    appendToChatFile('正在看向箱子')
    await bot.lookAt(chestCenter)
    await new Promise(resolve => setTimeout(resolve, Number(options.lookDelay) || 50))
    
    const newDist = bot.entity.position.distanceTo(chestCenter)
    appendToChatFile(`看向箱子后距离: ${newDist.toFixed(1)} 格`)
    
    let container = null
    let lastError = null
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        appendToChatFile(`尝试打开箱子 (第 ${attempt + 1}/3 次)`)
        
        container = await Promise.race([
          bot.openContainer(chestBlock),
          new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 3000))
        ])
        
        if (container) {
          appendToChatFile('箱子打开成功')
          break
        }
      } catch (e) {
        lastError = e
        appendToChatFile(`打开失败: ${e.message}`)
        
        if (attempt < 2) {
          appendToChatFile('尝试调整位置后重试')
          const offset = attempt === 0 ? 0.3 : -0.3
          const adjustX = x + offset
          const adjustY = Number.isFinite(Number(options.standY)) ? Number(options.standY) : Math.floor(bot.entity.position.y)
          const adjustZ = z + 1
          await moveToPosition(adjustX, adjustY, adjustZ, { timeoutMs: 1200, minTimeoutMs: 700 })
          await new Promise(resolve => setTimeout(resolve, 80))
          await bot.lookAt(chestCenter)
        }
      }
    }
    
    if (!container) {
      appendToChatFile(`无法打开箱子: ${lastError?.message || '未知错误'}`)
      return false
    }
    
    if (options.returnContainer) {
      appendToChatFile(`箱子 (${x}, ${y}, ${z}) 已打开并返回给调用方`)
      return container
    }

    let items = []
    try {
      if (container && container.slots) {
        const slotsArray = Array.isArray(container.slots) ? container.slots : []
        const invSize = container.inventorySize || container.size || 27
        items = slotsArray.slice(0, invSize).filter(slot => slot && slot.type !== 0)
      } else if (container && container.containerItems) {
        const contItems = Array.isArray(container.containerItems) ? container.containerItems : (typeof container.containerItems === 'object' ? Object.values(container.containerItems) : [])
        items = contItems.filter(slot => slot && slot.type !== 0)
      }
    } catch (e) {
      appendToChatFile(`读取物品失败: ${e.message}`)
    }
    
    if (items && items.length > 0) {
      const sourceLocation = { x, y, z }
      const itemNames = items.map(item => {
        const key = (item.name || '').replace('minecraft:', '')
        const count = item.count || 1
        const customName = getWarehouseCustomName(item, key)
        const displayName = itemTranslator.translateItemName(key, customName)
        return `${displayName} x${count}`
      }).join(', ')
      appendToChatFile(`箱子 (${x}, ${y}, ${z}) 内容: ${itemNames}`)
      
      const scanMode = options.scanMode === 'bulk' ? 'bulk' : 'mixed'
      const sourceBlockName = chestBlock?.name || ''
      const itemsToReport = scanMode === 'bulk' && isShulkerBlockName(sourceBlockName)
        ? buildLooseBulkScanItems(items, sourceLocation, sourceBlockName)
        : items
      const newItems = []
      for (const item of itemsToReport) {
        if (item.__bulkScanItem) {
          if (process.send) process.send({ type: 'newItem', item })
          newItems.push(item)
          continue
        }
        const itemName = item.name || 'unknown'
        const key = itemName.replace('minecraft:', '')
        const customName = getWarehouseCustomName(item, key)
        const displayName = itemTranslator.translateItemName(key, customName)
        const shulkerContents = getShulkerContents(item)
        const shulkerSignature = getShulkerSignature(shulkerContents)
        const bulk = scanMode === 'bulk' ? getBulkInfo(itemName, shulkerContents) : null
        if (scanMode === 'bulk' && !bulk?.isBulk) continue
        const reportName = bulk?.isBulk ? bulk.primaryName : itemName
        const reportCount = bulk?.isBulk ? Number(bulk.totalCount || 0) * Number(item.count || 1) : Number(item.count || 1)
        const reportSignature = bulk?.isBulk ? makeBulkScanKey(bulk.primaryName) : shulkerSignature
        const reportSource = bulk?.isBulk
          ? { ...sourceLocation, count: reportCount, bulkStorageType: 'boxed', storageItemName: itemName, bulkPrimaryName: bulk.primaryName, sourceBlockName }
          : { ...sourceLocation, count: reportCount }
        const finalDisplayName = bulk?.isBulk
          ? `大宗：${bulk.primaryDisplayName || bulk.primaryName}（盒装）`
          : displayName
        const reportItem = {
          name: reportName,
          displayName: finalDisplayName,
          customName: bulk?.isBulk ? '' : customName,
          count: reportCount,
          sourceLocation: reportSource,
          locations: [reportSource],
          shulkerContents,
          shulkerSignature: reportSignature,
          bulk: bulk?.isBulk ? { ...bulk, storageType: 'boxed', storageItemName: itemName } : null
        }
        if (process.send) process.send({ type: 'newItem', item: reportItem })
        newItems.push(reportItem)
      }
      
      if (newItems.length > 0) {
        appendToChatFile(`已通知服务器添加 ${newItems.length} 个新物品到仓库`)
      }
    } else {
      appendToChatFile(`箱子 (${x}, ${y}, ${z}) 是空的`)
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, Number(options.closeDelay) || 50))
      if (typeof container.close === 'function') {
        await container.close()
        appendToChatFile('箱子已关闭')
      }
    } catch (e) {
      appendToChatFile(`关闭箱子失败: ${e.message}`)
    }
    
    return true
    
  } catch (e) {
    appendToChatFile(`openChestAtPosition 异常: ${e.message}`)
    return false
  }
}

async function moveToZRow(targetZ, y) {
  const bot = state.bot
  
  let currentPos = bot.entity.position
  let currentZ = Math.floor(currentPos.z)
  
  appendToChatFile(`当前 z: ${currentZ}, 目标 z: ${targetZ}`)
  
  const dz = targetZ - currentZ
  
  if (dz === 0) {
    appendToChatFile('已在目标 z 行')
    return
  }
  
  appendToChatFile(`需要移动 ${Math.abs(dz)} 格 ${dz > 0 ? '向南' : '向北'}`)
  
  const direction = dz > 0 ? 1 : -1
  
  for (let i = 0; i < Math.abs(dz); i++) {
    currentPos = bot.entity.position
    currentZ = Math.floor(currentPos.z)
    
    if (currentZ === targetZ) {
      appendToChatFile('已到达目标 z 行')
      return
    }
    
    const nextZ = currentZ + direction
    const nextPos = new vec3(Math.floor(currentPos.x), y, nextZ)
    
    await moveOneStep(nextPos)
    
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  appendToChatFile(`到达 z=${targetZ}`)
}

async function moveToXPosition(targetX, y, z) {
  const bot = state.bot
  
  let currentPos = bot.entity.position
  let currentX = Math.floor(currentPos.x)
  
  appendToChatFile(`当前 x: ${currentX}, 目标 x: ${targetX}`)
  
  const dx = targetX - currentX
  
  if (dx === 0) {
    appendToChatFile('已在目标 x 位置')
    return
  }
  
  appendToChatFile(`需要移动 ${Math.abs(dx)} 格 ${dx > 0 ? '向东' : '向西'}`)
  
  const direction = dx > 0 ? 1 : -1
  
  for (let i = 0; i < Math.abs(dx); i++) {
    currentPos = bot.entity.position
    currentX = Math.floor(currentPos.x)
    
    if (currentX === targetX) {
      appendToChatFile('已到达目标 x 位置')
      return
    }
    
    const nextX = currentX + direction
    const nextPos = new vec3(nextX, y, z)
    
    await moveOneStep(nextPos)
    
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  appendToChatFile(`到达 x=${targetX}`)
}

async function moveOneStep(targetPos) {
  const bot = state.bot
  
  return new Promise((resolve) => {
    try {
      if (!bot.pathfinder) {
        resolve()
        return
      }
      
      const { Movements } = require('mineflayer-pathfinder')
      
      const defaultMove = new Movements(bot)
      defaultMove.canDig = false
      
      bot.pathfinder.setMovements(defaultMove)
      
      const timeout = setTimeout(() => {
        bot.pathfinder.setGoal(null)
        bot.removeListener('goal_reached', onGoalReached)
        bot.removeListener('path_reset', onPathReset)
        resolve()
      }, 3000)
      
      const onGoalReached = () => {
        clearTimeout(timeout)
        bot.removeListener('path_reset', onPathReset)
        bot.pathfinder.setGoal(null)
        resolve()
      }
      
      const onPathReset = () => {
        clearTimeout(timeout)
        bot.removeListener('goal_reached', onGoalReached)
        bot.pathfinder.setGoal(null)
        resolve()
      }
      
      bot.once('goal_reached', onGoalReached)
      bot.once('path_reset', onPathReset)
      
      const goal = new GoalNear(targetPos.x, targetPos.y, targetPos.z, 1)
      bot.pathfinder.setGoal(goal)
    } catch (e) {
      resolve()
    }
  })
}

async function searchChestsToTheRight(startPos) {
  const bot = state.bot
  const scanRange = 10
  
  const chestsFound = []
  
  for (let dz = -scanRange; dz <= scanRange; dz++) {
    for (let dx = -scanRange; dx <= scanRange; dx++) {
      const y = 60
      const pos = new vec3(
        Math.floor(startPos.x) + dx,
        y,
        Math.floor(startPos.z) + dz
      )
      const block = bot.blockAt(pos)
      if (block && CHEST_BLOCKS.includes(block.name)) {
        chestsFound.push({
          x: pos.x,
          y: pos.y,
          z: pos.z,
          dx: dx,
          dz: dz
        })
      }
    }
  }

  if (chestsFound.length === 0) {
    appendToChatFile('在 y=60 高度没有找到任何箱子')
    return
  }

  chestsFound.sort((a, b) => {
    if (a.dz !== b.dz) return a.dz - b.dz
    return a.dx - b.dx
  })
  
  appendToChatFile(`找到 ${chestsFound.length} 个箱子 (y=60)，开始依次打开...`)
  
  for (let i = 0; i < chestsFound.length && i < 20; i++) {
    const chest = chestsFound[i]
    
    try {
      appendToChatFile(`正在走向第 ${i + 1} 个箱子: (${chest.x}, ${chest.y}, ${chest.z})`)
      await moveToPosition(chest.x, chest.y, chest.z)
      appendToChatFile(`已到达，开始打开`)
      
      await openChestAtPosition(chest.x, chest.y, chest.z)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (e) {
      appendToChatFile(`第 ${i + 1} 个箱子打开失败: ${e.message}`)
    }
  }
  
  appendToChatFile(`已完成 ${Math.min(chestsFound.length, 20)} 个箱子的扫描`)
}

async function moveToPosition(x, y, z, options = {}) {
  const bot = state.bot
  
  return new Promise((resolve) => {
    try {
      if (!bot.pathfinder) {
        appendToChatFile('pathfinder 插件未加载')
        resolve()
        return
      }
      
      const { Movements } = require('mineflayer-pathfinder')
      
      const defaultMove = new Movements(bot)
      defaultMove.canDig = false
      defaultMove.allowSprinting = true
      defaultMove.allowParkour = false
      defaultMove.allowDoorOpening = true
      
      bot.pathfinder.setMovements(defaultMove)
      
      const currentPos = bot.entity.position
      const targetPos = new vec3(x, y, z)
      const distance = currentPos.distanceTo(targetPos)
      const goalRange = Number.isFinite(Number(options.range)) ? Number(options.range) : 1
      
      appendToChatFile(`移动中: 距离目标 ${distance.toFixed(1)} 格`)
      
      const minTimeoutMs = Number.isFinite(Number(options.minTimeoutMs)) ? Number(options.minTimeoutMs) : 5000
      const maxTimeoutMs = Number.isFinite(Number(options.maxTimeoutMs)) ? Number(options.maxTimeoutMs) : 30000
      const computedTimeoutMs = Math.min(Math.max(distance * 1000, minTimeoutMs), maxTimeoutMs)
      const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : computedTimeoutMs
      const timeoutId = setTimeout(() => {
        bot.pathfinder.setGoal(null)
        bot.removeListener('goal_reached', onGoalReached)
        bot.removeListener('path_reset', onPathReset)
        appendToChatFile(`移动到 (${x}, ${y}, ${z}) 超时，当前位置: (${Math.floor(currentPos.x)}, ${Math.floor(currentPos.y)}, ${Math.floor(currentPos.z)})`)
        resolve()
      }, timeoutMs)
      
      const onGoalReached = () => {
        clearTimeout(timeoutId)
        bot.removeListener('path_reset', onPathReset)
        bot.pathfinder.setGoal(null)
        const finalPos = bot.entity.position
        appendToChatFile(`已到达位置: (${Math.floor(finalPos.x)}, ${Math.floor(finalPos.y)}, ${Math.floor(finalPos.z)})`)
        resolve()
      }
      
      const onPathReset = () => {
        clearTimeout(timeoutId)
        bot.removeListener('goal_reached', onGoalReached)
        bot.pathfinder.setGoal(null)
        appendToChatFile(`路径被重置，当前位置: (${Math.floor(currentPos.x)}, ${Math.floor(currentPos.y)}, ${Math.floor(currentPos.z)})`)
        resolve()
      }
      
      bot.once('goal_reached', onGoalReached)
      bot.once('path_reset', onPathReset)
      
      const goal = new GoalNear(x, y, z, goalRange)
      bot.pathfinder.setGoal(goal)
      
    } catch (e) {
      appendToChatFile(`移动出错: ${e.message}`)
      resolve()
    }
  })
}

function handleTpaRequest(username, isTpahere) {
  if (!state.bot?._client) {
    log('TPA', '客户端未就绪，无法处理传送请求', 'yellow')
    return
  }

  if (username !== 'Xigold_lx') {
    safeChat('/tpdeny')
    log('TPA', `${username} 请求${isTpahere ? 'tpahere' : 'tpa'}，非管理员已拒绝`, 'yellow')
    return
  }

  const cfg = getConfig()
  const mode = cfg.lock?.isLocked ? '锁定' : cfg.construction?.isActive ? '施工' : '正常'

  safeChat('/tpaccept')
  log('TPA', `${mode}模式 - ${username} 请求${isTpahere ? 'tpahere' : 'tpa'}，已接受`, 'green')
}

function extractSenderFromMessage(msgStr) {
  const patterns = [
    /『(.*?)』(.*?)\s*>/,
    /<([a-zA-Z0-9_]+)>/,
    /([a-zA-Z0-9_]+)\s+请求传送/,
    /([a-zA-Z0-9_]+)\s*请求传送到你的位置/,
    /([a-zA-Z0-9_]+)\s+请求你传送到他的位置/
  ]
  
  for (const pattern of patterns) {
    const match = msgStr.match(pattern)
    if (match) {
      return (match[2] || match[1]).trim()
    }
  }
  return null
}

function processTpaRequest(fullMessage) {
  const sender = extractSenderFromMessage(fullMessage)
  if (!sender) return

  if (fullMessage.includes('请求传送到你的位置')) {
    handleTpaRequest(sender, false)
  } else if (fullMessage.includes('请求你传送到他的位置')) {
    handleTpaRequest(sender, true)
  }
}

function handleTpaMessage(message) {
  if (!isBotReady()) return
  const msgStr = typeof message === 'string' ? message : message.toString()
  processTpaRequest(msgStr)
}

function setupBotEvents(bot) {
  bot.on('chat', (username, message) => {
    if (!bot._client) return
    handleCommand(username, message)
    if (username === 'Xigold_lx' && message.includes('tpa')) {
      processTpaRequest(`${username} 请求传送到你的位置`)
    }
  })

  bot.on('systemChat', handleTpaMessage)
  bot.on('message', handleTpaMessage)

  bot.on('login', () => {
    log('登录成功', '已成功登录服务器', 'green')
    state.reconnectAttempts = 0
    state.lastActivityTime = Date.now()
    startHeartbeat()
    
    if (process.send) {
      process.send({ type: 'loginComplete' })
    }
  })

  bot.on('spawn', () => {
    log('已生成', '角色已生成在世界中', 'green')
    state.lastActivityTime = Date.now()
    startIpc()
    if (!transportTaskPollTimer) {
      transportTaskPollTimer = setInterval(() => {
        pollMainBotControlTask().catch(() => {})
        ensureFoodReady(false).catch(() => {})
        pollMainBotTransportTasks().catch(() => {})
      }, 5000)
    }
    sendIpcLog('Bot已生成', 'success')
    
    if (process.send) {
      process.send({ type: 'spawnComplete' })
    }
  })

  bot.on('playerCollect', (entity) => {
    if (entity.username === bot.username) {
      const inventory = bot.inventory.items()
      if (inventory.length > 0) {
        const lastItem = inventory[inventory.length - 1]
        const key = (lastItem.name || '').replace('minecraft:', '')
        const displayName = itemTranslator.translateItemName(key)
        
        appendToChatFile(`Bot捡起物品: ${displayName} x${lastItem.count}`)
        
        if (process.send) {
          process.send({
            type: 'newItem',
            item: {
              name: lastItem.name,
              displayName: displayName,
              count: lastItem.count
            }
          })
        }
      }
    }
  })

  bot.on('error', (err) => {
    log('错误', `${err.message} (${err.code || '未知'})`, 'red')
  })

  bot.on('kicked', (reason) => {
    const reasonStr = typeof reason === 'object' ? (reason.reason || reason.text || JSON.stringify(reason)) : String(reason)
    log('被踢出', reasonStr, 'red')
    if (/duplicate_login/i.test(reasonStr)) {
      reconnectDisabledReason = 'duplicate_login'
      log('重复登录', '账号已在其它位置在线，停止自动重连；请关闭另一端后再启动', 'red')
      return
    }
    scheduleReconnect()
  })

  bot.on('end', () => {
    log('断开', '连接已断开', 'yellow')
    state.bot = null
    stopHeartbeat()
    stopIpc()
    sendIpcLog('Bot已断开连接', 'warning')
    scheduleReconnect()
  })

  bot.on('packetError', (err) => {
    log('数据包错误', err.message, 'yellow')
  })

  bot.on('health', () => { state.lastActivityTime = Date.now() })
  bot.on('playerJoined', () => { state.lastActivityTime = Date.now() })
  bot.on('playerLeft', () => { state.lastActivityTime = Date.now() })

  bot.on('whisper', (username, message) => {
    monitor.saveSiliaoMessage(username, message)
    
    log('私聊消息', `收到来自 ${username} 的消息: "${message}"`, 'blue')
    
    if (handleWelcomeBindCommand(username, message)) return
    handleBindVerification(username, message)
  })
  
  bot.on('messagestr', (message) => {
    log('消息字符串', `"${message}"`, 'yellow')
    
    rememberTownFromChatMessage(message)

    handleTpaMessage(message)
    
    const whisperMatch = message.match(/^\[(.*?)\s*➥\s*.*?\]\s*(.+)$/)
    if (whisperMatch) {
      const [, sender, content] = whisperMatch
      if (sender.includes('Xigold_lx')) {
        handleCommand(sender, content.trim())
      }
    }
    
    const atMatch = message.match(/^\[([^\]]+)\s*[→➥]\s*([^\]]+)\]\s*(.+)$/)
    if (atMatch) {
      const sender = atMatch[1].trim()
      const receiver = atMatch[2].trim()
      const content = atMatch[3].trim()
      
      if (receiver.toLowerCase() === bot.username.toLowerCase()) {
        log('频道@消息', `${sender} 在频道@了我: "${content}"`, 'green')
        handleBindVerification(sender, content)
      }
    }
  })
}

function handleBindVerification(username, message) {
  let code = message.trim().toUpperCase()
  
  const parts = message.trim().split(' ')
  if (parts.length === 2 && (parts[0] === '登录' || parts[0].toLowerCase() === 'login')) {
    code = parts[1].toUpperCase()
  }
  
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return
  }
  
  let playerUuid = null
  let playerTown = null
  let playerPrefix = null
  const cachedTown = getCachedTown(username)

  if (isBotReady() && state.bot.players[username]) {
    playerUuid = state.bot.players[username].uuid
    const player = state.bot.players[username]
    playerPrefix = asPlainText(player.prefix)
    const prefixText = getConfiguredTownName()
    const tabListName = playerPrefix
      ? playerPrefix + player.username
      : (asPlainText(player.displayName) || username)
    const tabTownMatched = normalizeTownText(tabListName).includes(prefixText)

    if (cachedTown) {
      playerTown = cachedTown.town
      playerPrefix = playerPrefix || cachedTown.prefix
    } else {
      playerTown = tabTownMatched ? prefixText : '??'
    }

    log('????', `????? ${username} ?UUID: ${playerUuid}, ??: ${playerTown}, ??: ${playerPrefix}`, 'green')
  } else if (cachedTown) {
    playerTown = cachedTown.town
    playerPrefix = cachedTown.prefix
  }
  try {
    const fs = require('fs')
    const path = require('path')
    const pendingFile = path.join(__dirname, '..', 'data', 'pending_bindings.json')
    const usersFile = path.join(__dirname, '..', 'data', 'users.json')
    const pendingRegFile = path.join(__dirname, '..', 'data', 'pending_registrations.json')
    const tempLoginFile = path.join(__dirname, '..', 'data', 'temp_login_codes.json')
    
    let users = []
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile, 'utf8'))
    }
    
    let tempLogins = {}
    if (fs.existsSync(tempLoginFile)) {
      tempLogins = JSON.parse(fs.readFileSync(tempLoginFile, 'utf8'))
    }
    
    log('绑定验证', `读取临时登录文件: ${tempLoginFile}`, 'blue')
    log('绑定验证', `临时登录记录数: ${Object.keys(tempLogins).length}`, 'blue')
    if (Object.keys(tempLogins).length > 0) {
      log('绑定验证', `可用验证码: ${Object.keys(tempLogins).join(', ')}`, 'blue')
    }
    
    if (tempLogins[code]) {
      tempLogins[code].username = username
      tempLogins[code].uuid = playerUuid || 'unknown'
      tempLogins[code].verified = true
      tempLogins[code].verifiedAt = Date.now()
      
      fs.writeFileSync(tempLoginFile, JSON.stringify(tempLogins, null, 2))
      
      try {
        const http = require('http')
        const postData = JSON.stringify({ code, username, uuid: playerUuid, town: playerTown, prefix: playerPrefix })
        const options = {
          hostname: 'localhost',
          port: 28474,
          path: '/api/bot/temp-login-verified',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
        const req = http.request(options, (res) => { res.resume(); res.on('end', () => {}) })
        req.on('error', () => {})
        req.write(postData)
        req.end()
      } catch {}
      
      if (isBotReady()) {
        state.bot.chat(`/msg ${username} 网页登录成功，请回到网页继续使用。`)
      }
      
      appendToChatFile(`玩家 ${username} (UUID: ${playerUuid}) 使用临时验证码 ${code} 完成登录验证`)
      log('绑定验证', `临时登录验证成功: ${username} - ${code}`, 'green')
      return
    }
    
    let pendingReg = {}
    if (fs.existsSync(pendingRegFile)) {
      pendingReg = JSON.parse(fs.readFileSync(pendingRegFile, 'utf8'))
    }
    
    if (pendingReg[code] && pendingReg[code].password) {
      pendingReg[code].username = username
      pendingReg[code].uuid = playerUuid || 'unknown'
      pendingReg[code].verifiedAt = Date.now()
      
      fs.writeFileSync(pendingRegFile, JSON.stringify(pendingReg, null, 2))
      
      if (isBotReady()) {
        state.bot.chat(`/msg ${username} 网页登录成功，请回到网页继续使用。`)
      }
      
      appendToChatFile(`玩家 ${username} (UUID: ${playerUuid}) 使用验证码 ${code} 完成注册验证`)
      log('绑定验证', `注册验证成功: ${username} - ${code}`, 'green')
      return
    }
    
    if (fs.existsSync(pendingFile)) {
      const pendingBindings = JSON.parse(fs.readFileSync(pendingFile, 'utf8'))
      
      if (pendingBindings[code]) {
        const binding = pendingBindings[code]
        
        const user = users.find(u => u.id === binding.userId)
        if (user) {
          if (!user.boundAccounts) {
            user.boundAccounts = []
          }
          
          const isAlreadyBound = user.boundAccounts.some(account => 
            account.username === username || account.uuid === playerUuid
          )
          
          if (!isAlreadyBound) {
            user.boundAccounts.push({
              username: username,
              uuid: playerUuid || 'unknown',
              town: playerTown || '未知',
              prefix: playerPrefix || '',
              boundAt: new Date().toISOString()
            })
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
            
            delete pendingBindings[code]
            fs.writeFileSync(pendingFile, JSON.stringify(pendingBindings, null, 2))
            
            if (isBotReady()) {
              state.bot.chat(`/msg ${username} 绑定成功！你的游戏账号已绑定到仓库系统。`)
            }
            
            appendToChatFile(`玩家 ${username} (UUID: ${playerUuid}) 使用验证码 ${code} 成功绑定账号`)
          } else {
            if (isBotReady()) {
              state.bot.chat(`/msg ${username} 该游戏账号已绑定过了。`)
            }
          }
        }
      }
    }
  } catch (e) {
    log('绑定验证', `处理验证码失败: ${e.message}`, 'yellow')
  }
}

function startHeartbeat() {
  stopHeartbeat()
  state.heartbeatInterval = setInterval(() => {
    if (!isBotReady()) return
    const idleTime = (Date.now() - state.lastActivityTime) / 1000
    if (idleTime > 300) {
      log('心跳', `长时间无活动，已 ${idleTime.toFixed(0)} 秒`, 'yellow')
    }
    if (state.bot._client.socket?.readyState === 'open') {
      log('心跳', `连接状态正常 (延迟: ${state.bot._client.ping || '未知'}ms)`)
    }
  }, CONFIG.heartbeatInterval)
}

function stopHeartbeat() {
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval)
    state.heartbeatInterval = null
  }
}

function scheduleReconnect() {
  if (reconnectDisabledReason) {
    log('重连', '已停止自动重连: ' + reconnectDisabledReason, 'red')
    return
  }
  if (state.reconnectAttempts >= CONFIG.maxReconnectAttempts) {
    log('重连', `已达到最大重连次数 (${CONFIG.maxReconnectAttempts})，停止重连`, 'red')
    return
  }

  state.reconnectAttempts++
  const delay = Math.min(Math.pow(2, state.reconnectAttempts - 1), 32) * CONFIG.reconnectDelay + Math.random() * 5000
  
  log('重连', `等待 ${(delay / 1000).toFixed(1)} 秒后尝试重连... (第 ${state.reconnectAttempts} 次)`, 'yellow')
  
  setTimeout(() => {
    log('重连', '尝试重新连接...', 'blue')
    createBot()
  }, delay)
}

function createBot() {
  if (state.bot && state.bot._client) {
    log('启动保护', '已有主 Bot 客户端实例，跳过重复 createBot', 'yellow')
    return
  }
  loadConfig()
  const cfg = getConfig()

  state.bot = mineflayer.createBot({
    host: cfg.host || cfg.server?.host || 'mc.zenoxs.cn',
    port: cfg.port || cfg.server?.port || 25565,
    username: cfg.email || cfg.server?.username || cfg.server?.email || 'Goldfish_lx@outlook.com',
    auth: cfg.auth || cfg.server?.auth || 'microsoft',
    version: cfg.version || cfg.server?.version || '1.21.11',
    onMsaCode: (data) => {
      const login = normalizeMicrosoftLogin(data)
      console.log(`[LOGIN_URL] ${login.url}`)
      console.log(`[LOGIN_CODE] ${login.code || ''}`)
      console.log(`[LOGIN_STEP] ${formatLoginInstruction(login)}`)
      if (login.message) console.log(`[LOGIN_HINT] ${login.message}`)
    }
  })

  const bot = state.bot
  
  try {
    const autoResourcePack = require('./autoResourcePack');
    bot.loadPlugin(autoResourcePack);
  } catch (e) {
    console.log('[警告] autoResourcePack 插件未找到，跳过加载');
  }
  bot.loadPlugin(pathfinder)

  monitor.setBotInstance(bot)
  monitor.initSiliao()

  const checkInterval = cfg.fileMonitor?.checkInterval || 3000
  setInterval(() => {
    monitor.checkReportFiles()
    monitor.checkPlayerPositions()
    monitor.checkSiliaoFile()
  }, checkInterval)

  setupBotEvents(bot)
}

let loopOpenChestActive = false

async function startLoopOpenChest() {
  if (!isBotReady()) {
    appendToChatFile('Bot未就绪')
    return
  }
  
  if (loopOpenChestActive) {
    appendToChatFile('循环开箱已在进行中')
    return
  }
  
  loopOpenChestActive = true
  
  try {
    const bot = state.bot
    
    appendToChatFile('[DEBUG] 准备执行传送命令')
    appendToChatFile('[DEBUG] 命令: /phome anyun_安芸工业区')
    bot.chat('/phome anyun_安芸工业区')
    appendToChatFile('[DEBUG] 命令已发送')
    
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    const afterTpPos = bot.entity.position
    appendToChatFile(`传送后位置: (${Math.floor(afterTpPos.x)}, ${Math.floor(afterTpPos.y)}, ${Math.floor(afterTpPos.z)})`)
    
    const expectedX = -20840
    const expectedZ = 11678
    const distanceToTarget = Math.sqrt(
      Math.pow(afterTpPos.x - expectedX, 2) + 
      Math.pow(afterTpPos.z - expectedZ, 2)
    )
    
    if (distanceToTarget > 100) {
      appendToChatFile(`距离目标区域太远 (${distanceToTarget.toFixed(1)}格)，重新传送...`)
      bot.chat('/phome anyun_安芸工业区')
      await new Promise(resolve => setTimeout(resolve, 8000))
      
      const reTpPos = bot.entity.position
      appendToChatFile(`重新传送后位置: (${Math.floor(reTpPos.x)}, ${Math.floor(reTpPos.y)}, ${Math.floor(reTpPos.z)})`)
    }
    
    const firstPosX = -20840
    const firstPosY = 61
    const firstPosZ = 11678
    
    appendToChatFile(`\n第一步: 移动到位置 (${firstPosX}, ${firstPosY}, ${firstPosZ})`)
    await moveToPosition(firstPosX, firstPosY, firstPosZ)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const afterFirstMove = bot.entity.position
    appendToChatFile(`到达位置: (${Math.floor(afterFirstMove.x)}, ${Math.floor(afterFirstMove.y)}, ${Math.floor(afterFirstMove.z)})`)
    
    const secondPosX = -20840
    const secondPosY = 61
    const secondPosZ = 11675
    
    appendToChatFile(`\n第二步: 移动到位置 (${secondPosX}, ${secondPosY}, ${secondPosZ})`)
    await moveToPosition(secondPosX, secondPosY, secondPosZ)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const afterSecondMove = bot.entity.position
    appendToChatFile(`到达位置: (${Math.floor(afterSecondMove.x)}, ${Math.floor(afterSecondMove.y)}, ${Math.floor(afterSecondMove.z)})`)
    
    const startX = -20840
    const endX = -20818
    const minY = 60
    const maxY = 64
    const z = 11673
    
    appendToChatFile(`\n开始扫描区域: x ${startX} ~ ${endX}, y ${minY} ~ ${maxY}, z=${z}`)
    appendToChatFile('扫描顺序: 先y方向从低到高，再x方向从左到右')
    
    const chests = []
    for (let x = startX; x <= endX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const chestPos = new vec3(x, y, z)
        const chestBlock = bot.blockAt(chestPos)
        if (chestBlock && CHEST_BLOCKS.includes(chestBlock.name)) {
          chests.push({ x, y, z })
          appendToChatFile(`发现箱子: (${x}, ${y}, ${z})`)
        }
      }
    }
    
    if (chests.length === 0) {
      appendToChatFile('该区域没有找到任何箱子')
      loopOpenChestActive = false
      return
    }
    
    appendToChatFile(`共找到 ${chests.length} 个箱子，开始逐个打开...`)
    
    let chestCount = 0
    
    for (let x = startX; x <= endX; x++) {
      if (!loopOpenChestActive) break
      
      appendToChatFile(`\n=== 处理第 ${x - startX + 1} 列 (x=${x}) ===`)
      
      for (let y = minY; y <= maxY; y++) {
        if (!loopOpenChestActive) break
        
        const chestPos = new vec3(x, y, z)
        const chestBlock = bot.blockAt(chestPos)
        
        if (!chestBlock || !CHEST_BLOCKS.includes(chestBlock.name)) {
          continue
        }
        
        appendToChatFile(`\n正在处理箱子: (${x}, ${y}, ${z})`)
        
        const standX = x
        const standY = y
        const standZ = z + 1
        
        const currentPos = bot.entity.position
        const distance = currentPos.distanceTo(new vec3(standX, standY, standZ))
        
        // 只有在第一列或距离太远时才移动
        if (x === startX || distance > 1.5) {
          appendToChatFile(`距离 ${distance.toFixed(1)} 格，需要移动`)
          appendToChatFile(`移动到箱子旁边: (${standX}, ${standY}, ${standZ})`)
          await moveToPosition(standX, standY, standZ)
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        const opened = await openChestAtPosition(x, y, z)
        
        if (opened) {
          chestCount++
          appendToChatFile(`成功记录箱子 #${chestCount}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      appendToChatFile(`列 x=${x} 处理完成`)
    }
    
    appendToChatFile(`\n完成！共成功打开 ${chestCount} 个箱子`)
  } catch (e) {
    appendToChatFile(`出错: ${e.message}`)
  } finally {
    loopOpenChestActive = false
  }
}

async function runScanTest(payload = {}) {
  if (!isBotReady()) {
    const result = { success: false, mode: payload.mode || 'unknown', message: 'Bot 未就绪' }
    if (process.send) process.send({ type: 'scanTestResult', result })
    return result
  }

  const mode = payload.mode || 'nearby'
  const bot = state.bot
  const startedAt = Date.now()
  let result = { success: true, mode, message: '扫描测试已完成' }

  try {
    if (mode === 'nearby') {
      const range = Number(payload.range) || 10
      const pos = bot.entity.position
      const chests = []

      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          for (let dz = -range; dz <= range; dz++) {
            const block = bot.blockAt(pos.offset(dx, dy, dz).floored())
            if (block?.name && CHEST_BLOCKS.includes(block.name)) {
              chests.push({
                type: block.name,
                x: block.position.x,
                y: block.position.y,
                z: block.position.z,
                distance: Number(pos.distanceTo(block.position.offset(0.5, 0.5, 0.5)).toFixed(2))
              })
            }
          }
        }
      }

      chests.sort((a, b) => a.distance - b.distance)
      result = {
        success: true,
        mode,
        count: chests.length,
        chests: chests.slice(0, 20),
        message: `附近 ${range} 格找到 ${chests.length} 个箱子/桶`
      }
    } else if (mode === 'position') {
      const x = Number(payload.x)
      const y = Number(payload.y)
      const z = Number(payload.z)
      if (![x, y, z].every(Number.isFinite)) {
        throw new Error('单点扫描缺少有效 x/y/z')
      }
      const opened = await openChestAtPosition(x, y, z)
      result = { success: !!opened, mode, position: { x, y, z }, message: opened ? '单点箱子打开成功' : '单点箱子打开失败' }
    } else if (mode === 'area' || mode === 'configured') {
      const scanAreas = Array.isArray(payload.scanAreas) ? payload.scanAreas.filter(Boolean) : []
      if (scanAreas.length === 0) {
        throw new Error('没有可用扫描区域')
      }
      await scanSpecifiedChests(scanAreas, { maxChests: Number(payload.maxChests) || 20 })
      result = { success: true, mode, areaCount: scanAreas.length, message: `区域扫描完成：${scanAreas.map(a => a.name || a.id).join(', ')}` }
    } else {
      throw new Error(`未知扫描测试模式: ${mode}`)
    }
  } catch (e) {
    result = { success: false, mode, message: e.message }
  }

  result.durationMs = Date.now() - startedAt
  appendToChatFile(`[扫描测试] ${result.message}`)
  if (process.send) process.send({ type: 'scanTestResult', result })
  return result
}

process.on('message', async (msg) => {
  if (msg.type === 'cancelScan') {
    requestScanCancel()
  } else if (msg.type === 'scanWarehouse') {
    scanCancelRequested = false
    const { scanAreas } = msg
    if (scanAreas && scanAreas.length > 0) {
      if (process.send) {
        process.send({ type: 'task', task: '正在扫描仓库区域...' })
      }
      await scanSpecifiedChests(scanAreas)
      if (process.send) {
        process.send({ type: 'task', task: null })
      }
    }
  } else if (msg.type === 'scanTest') {
    scanCancelRequested = false
    if (process.send) {
      process.send({ type: 'task', task: '正在执行扫描测试...' })
    }
    await runScanTest(msg.payload || {})
    if (process.send) {
      process.send({ type: 'task', task: null })
    }
  } else if (msg.type === 'transportTask') {
    const { task } = msg
    if (task) {
      if (process.send) {
        process.send({ type: 'task', task: `正在准备运输任务...` })
      }
      await handleTransportTask(task)
      if (process.send) {
        process.send({ type: 'task', task: null })
      }
    }
  }
})

async function pollMainBotControlTask() {
  if (mainBotControlPolling || !isBotReady()) return
  mainBotControlPolling = true
  try {
    const resp = await httpJson('GET', 28474, '/api/internal/mainbot/control-task')
    if (resp && resp.task) await handleMainBotControlTask(resp.task)
  } catch (err) {
    appendToChatFile('??? Bot ??????: ' + err.message)
  } finally {
    mainBotControlPolling = false
  }
}

async function handleMainBotControlTask(task) {
  if (!task || !task.action) return
  appendToChatFile('control task start: ' + task.action)
  if (task.action === 'eat') {
    await ensureFoodReady(true)
    appendToChatFile('control task done: eat')
    return
  }
  if (task.action === 'clearInventory') {
    await clearInventoryKeepOneStack(task.keepItem || 'golden_carrot', Number(task.keepCount || 64))
    appendToChatFile('control task done: clearInventory')
    return
  }
  if (task.action === 'sendMessage') {
    const playerName = String(task.playerName || '').trim()
    const message = String(task.message || '').trim()
    if (!/^[A-Za-z0-9_]{1,16}$/.test(playerName) || !message) {
      appendToChatFile('control task skipped: invalid sendMessage payload')
      return
    }
    safePrivateMessage(playerName, message)
    appendToChatFile('control task done: sendMessage to ' + playerName)
  }
}

function getInventoryCount(itemName) {
  if (!isBotReady()) return 0
  return state.bot.inventory.items()
    .filter(item => itemNameMatches(item, itemName))
    .reduce((sum, item) => sum + Number(item.count || 0), 0)
}

async function notifyAdmin(message, level = 'warning') {
  try {
    await httpJson('POST', 28474, '/api/internal/mainbot/notice', { message, level })
  } catch {}
}

async function ensureFoodReady(forceEat = false) {
  if (!isBotReady()) return false
  const bot = state.bot
  const food = Number(bot.food ?? 20)
  const carrotCount = getInventoryCount('golden_carrot')
  if (carrotCount < 8) {
    await notifyAdmin('? Bot ??????????? ' + carrotCount + ' ??????', 'warning')
    appendToChatFile('??????????? ' + carrotCount + ' ????????')
  }
  if (!forceEat && food >= 20) return true
  const carrot = bot.inventory.items().find(item => itemNameMatches(item, 'golden_carrot'))
  if (!carrot) return false
  try {
    await bot.equip(carrot, 'hand')
    await bot.consume()
    appendToChatFile('??????????????')
    return true
  } catch (err) {
    appendToChatFile('???????: ' + err.message)
    return false
  }
}

async function tossStackWithTimeout(item, count, label = '') {
  if (!item || count <= 0) return
  if (Number.isInteger(item.slot)) {
    try {
      await Promise.race([
        state.bot.clickWindow(item.slot, 1, 4),
        new Promise((_, reject) => setTimeout(() => reject(new Error('click drop timeout ' + label)), 2500))
      ])
      await sleep(250)
      return
    } catch (err) {
      appendToChatFile('click drop failed, fallback toss: ' + label + ' - ' + err.message)
    }
  }

  let settled = false
  try {
    state.bot.toss(item.type, item.metadata, count, err => {
      settled = true
      if (err) appendToChatFile('fallback toss callback error: ' + label + ' - ' + err.message)
    })
    await sleep(700)
    if (!settled) appendToChatFile('fallback toss no callback, continue: ' + label)
  } catch (err) {
    appendToChatFile('fallback toss failed: ' + label + ' - ' + err.message)
  }
}

async function clearInventoryKeepOneStack(keepItem = 'golden_carrot', keepCount = 64) {
  if (!isBotReady()) return
  appendToChatFile('clear inventory start, keep one stack: ' + keepItem)
  let keepRemaining = keepCount
  const items = state.bot.inventory.items().slice()
  for (const item of items) {
    const isKeep = itemNameMatches(item, keepItem)
    if (isKeep && keepRemaining > 0) {
      keepRemaining -= Math.min(keepRemaining, item.count)
      appendToChatFile('keep stack: ' + item.name + ' x' + item.count + ', remaining keep=' + keepRemaining)
      continue
    }

    try {
      await tossStackWithTimeout(item, item.count, item.name)
      appendToChatFile('dropped stack: ' + item.name + ' x' + item.count)
      await sleep(300)
    } catch (err) {
      appendToChatFile('drop stack failed, continue: ' + item.name + ' x' + item.count + ' - ' + err.message)
    }
  }
  appendToChatFile('clear inventory done, kept up to one stack: ' + keepItem)
}

async function handleTransportTask(task) {
  if (!isBotReady()) {
    appendToChatFile('\u4e3b Bot \u672a\u5c31\u7eea\uff0c\u65e0\u6cd5\u6267\u884c\u53d6\u8d27\u4efb\u52a1')
    await reportMainTransportFailure(task, '\u4e3b Bot \u672a\u5c31\u7eea')
    return
  }

  activeTransportTask = task
  const itemName = task.itemName
  const quantity = Number(task.quantity || 0)

  try {
    if (!itemName || quantity <= 0) throw new Error('\u53d6\u8d27\u4efb\u52a1\u53c2\u6570\u65e0\u6548')
    appendToChatFile('\u4e3b Bot \u5f00\u59cb\u534f\u52a9\u8fd0\u8f93 Bot \u53d6\u8d27: ' + (task.displayName || itemName) + ' x' + quantity + ' -> ' + task.playerName)
    await ensureFoodReady(false)

    const assigned = await waitForTransportAssignment(task)
    task.botNum = assigned.botNum
    task.botType = assigned.botType
    task.botName = assigned.botName || ('bot' + assigned.botNum)
    appendToChatFile('\u5df2\u6309\u7f16\u53f7\u5206\u914d\u7a7a\u95f2\u8fd0\u8f93 Bot: ' + task.botType + ':bot' + task.botNum)

    if (task.warpCommand) {
      appendToChatFile('\u6267\u884c\u4ed3\u5e93\u4f20\u9001: ' + task.warpCommand)
      safeChat(task.warpCommand)
      await sleep(Number(task.warpWaitMs) || 1800)
    }

    const handoffPosition = getTransportHandoffPosition(task)
    appendToChatFile('\u4e3b Bot \u5230\u7bb1\u5b50\u65c1\u7b49\u8fd0\u8f93 Bot: (' + handoffPosition.x + ',' + handoffPosition.y + ',' + handoffPosition.z + ')')
    await moveToPosition(handoffPosition.x, handoffPosition.y, handoffPosition.z, { timeoutMs: 3500, minTimeoutMs: 900, range: 1.2 })
    await sleep(120)

    let transportArrived = false
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      safeChat('/tpahere ' + task.botName)
      appendToChatFile('\u5df2\u53d1\u9001 /tpahere ' + task.botName + '\uff0c\u7b49\u5f85\u8fd0\u8f93 Bot \u5230\u7bb1\u5b50\u65c1\uff0c\u7b2c ' + attempt + '/3 \u6b21')
      transportArrived = await waitForPlayerEntity(task.botName, 20000, 5)
      if (transportArrived) break
      appendToChatFile('\u672a\u68c0\u6d4b\u5230\u8fd0\u8f93 Bot ' + task.botName + ' \u5230\u573a\uff0c\u51c6\u5907\u91cd\u53d1 /tpahere')
    }
    if (!transportArrived) {
      throw new Error('\u8fd0\u8f93 Bot \u672a\u4f20\u9001\u5230\u7bb1\u5b50\u65c1\uff0c\u5df2\u505c\u6b62\u53d6\u8d27\u907f\u514d\u4e22\u5931\uff1b\u8bf7\u68c0\u67e5\u8fd0\u8f93 Bot \u662f\u5426\u81ea\u52a8 /tpaccept')
    }

    await httpJson('POST', 28474, '/api/internal/transport/handoff-ready', { task })
    appendToChatFile('\u5df2\u901a\u77e5\u8fd0\u8f93 Bot \u81ea\u884c\u7ffb\u7bb1\u53d6\u8d27\uff0c\u4e3b Bot \u4e0d\u518d\u53d6\u8d27')
    safeChat('/phome anyun_\u5b89\u82b8\u5de5\u4e1a\u533a')
  } catch (err) {
    appendToChatFile('\u4e3b Bot \u534f\u52a9\u8fd0\u8f93\u53d6\u8d27\u5931\u8d25: ' + err.message)
    if (task && task.botNum) {
      try { await httpJson('POST', 28474, '/api/internal/transport/release', { botNum: task.botNum, botType: task.botType, reason: err.message }) } catch {}
    }
    await reportMainTransportFailure(task, err.message)
  } finally {
    activeTransportTask = null
  }
}

async function pollMainBotTransportTasks() {
  if (transportTaskPolling || activeTransportTask || !isBotReady()) return
  transportTaskPolling = true
  try {
    const resp = await httpJson('GET', 28474, '/api/internal/mainbot/transport-task')
    if (resp && resp.task) await handleTransportTask(resp.task)
  } catch (err) {
    appendToChatFile('\u62c9\u53d6\u4e3b Bot \u53d6\u8d27\u4efb\u52a1\u5931\u8d25: ' + err.message)
  } finally {
    transportTaskPolling = false
  }
}

function getTransportHandoffPosition(task) {
  const firstStart = Array.isArray(task?.startPositions) ? task.startPositions.find(Boolean) : null
  const source = task?.sourceLocation || (Array.isArray(task?.sourceLocations) ? task.sourceLocations[0] : null) || {}
  const current = state.bot?.entity?.position
  const x = Number.isFinite(Number(task?.handoffX)) ? Number(task.handoffX)
    : Number.isFinite(Number(source.x)) ? Number(source.x)
    : Number.isFinite(Number(firstStart?.x)) ? Number(firstStart.x)
    : Math.floor(current?.x || 0)
  const y = Number.isFinite(Number(task?.handoffY)) ? Number(task.handoffY)
    : Number.isFinite(Number(source.y)) ? Number(source.y)
    : Number.isFinite(Number(firstStart?.y)) ? Number(firstStart.y)
    : Math.floor(current?.y || 61)
  const z = Number.isFinite(Number(task?.handoffZ)) ? Number(task.handoffZ)
    : Number.isFinite(Number(source.z)) ? Number(source.z) + 1
    : 11678
  return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }
}

async function waitForTransportAssignment(task) {
  while (isBotReady()) {
    const resp = await httpJson('POST', 28474, '/api/internal/transport/assign', { task })
    if (resp && resp.assigned) return resp
    appendToChatFile((resp && resp.error) || '\u6682\u65e0\u7a7a\u95f2\u8fd0\u8f93 Bot\uff0c\u7b49\u5f85\u4e2d')
    await sleep(Number(resp && resp.retryAfterMs) || 5000)
  }
  throw new Error('\u4e3b Bot \u79bb\u7ebf\uff0c\u65e0\u6cd5\u7b49\u5f85\u8fd0\u8f93 Bot')
}

async function reportMainTransportFailure(task, error) {
  try {
    await httpJson('POST', 28474, '/api/internal/mainbot/transport-failed', {
      taskId: task && task.id,
      playerName: task && task.playerName,
      itemName: task && task.itemName,
      stockItemName: task && task.stockItemName,
      quantity: task && task.quantity,
      requestedQuantity: task && task.requestedQuantity,
      error
    })
  } catch {}
}

function itemNameMatches(entry, itemName) {
  if (!entry || !itemName) return false
  const expected = String(itemName).replace(/^minecraft:/, '')
  const actual = String(entry.name || '').replace(/^minecraft:/, '')
  return actual === expected
}

async function withdrawItemsForTransport(task, itemName, quantity) {
  const sources = Array.isArray(task.sourceLocations) && task.sourceLocations.length > 0 ? task.sourceLocations : (task.sourceLocation ? [task.sourceLocation] : [])
  if (sources.length === 0) throw new Error('\u6ca1\u6709\u53ef\u7528\u7bb1\u5b50\u5750\u6807\uff0c\u8bf7\u91cd\u65b0\u626b\u63cf\u4ed3\u5e93')

  let remaining = quantity
  for (const source of sources) {
    if (remaining <= 0) break
    const taken = await withdrawFromChestAt(source, itemName, remaining)
    remaining -= taken
  }
  if (remaining > 0) throw new Error('\u7bb1\u5b50\u8d27\u7269\u4e0d\u8db3\uff0c\u7f3a\u5c11 ' + remaining + ' \u4e2a\uff0c\u8bf7\u7ba1\u7406\u5458\u91cd\u65b0\u626b\u63cf\u4ed3\u5e93')
}

async function withdrawFromChestAt(source, itemName, quantity) {
  const bot = state.bot
  const x = Number(source.x)
  const y = Number(source.y)
  const z = Number(source.z)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error('\u7bb1\u5b50\u5750\u6807\u65e0\u6548')

  await moveToPosition(x, y, z + 1)
  await sleep(250)
  const chestPos = new vec3(x, y, z)
  const chestBlock = bot.blockAt(chestPos)
  if (!chestBlock || !CHEST_BLOCKS.includes(chestBlock.name)) throw new Error('\u672a\u627e\u5230\u7bb1\u5b50: (' + x + ',' + y + ',' + z + ')')

  await bot.lookAt(chestBlock.position.offset(0.5, 0.5, 0.5))
  await sleep(150)

  let container = null
  try {
    container = await Promise.race([
      bot.openContainer(chestBlock),
      new Promise((_, reject) => setTimeout(() => reject(new Error('\u6253\u5f00\u7bb1\u5b50\u8d85\u65f6')), 5000))
    ])

    const inventorySize = container.inventoryStart || container.inventorySize || container.size || 54
    const slots = Array.isArray(container.slots) ? container.slots.slice(0, inventorySize) : []
    const available = slots.filter(slot => itemNameMatches(slot, itemName)).reduce((sum, slot) => sum + Number(slot.count || 0), 0)
    if (available <= 0) return 0

    let taken = 0
    for (const slot of slots.filter(slot => itemNameMatches(slot, itemName))) {
      if (taken >= quantity) break
      const amount = Math.min(Number(slot.count || 0), quantity - taken)
      await container.withdraw(slot.type, slot.metadata, amount)
      taken += amount
      await sleep(150)
    }
    appendToChatFile('\u4ece\u7bb1\u5b50 (' + x + ',' + y + ',' + z + ') \u53d6\u51fa ' + itemName + ' x' + taken)
    return taken
  } finally {
    try { if (container && container.close) container.close() } catch {}
  }
}

async function waitForInventoryItems(itemName, quantity, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const count = state.bot.inventory.items().filter(item => itemNameMatches(item, itemName)).reduce((sum, item) => sum + item.count, 0)
    if (count >= quantity) return count
    await sleep(250)
  }
  throw new Error('\u80cc\u5305\u672a\u6536\u5230\u8db3\u591f\u7269\u54c1: ' + itemName + ' x' + quantity)
}

async function waitForPlayerEntity(playerName, timeoutMs = 15000, maxDistance = 6) {
  const deadline = Date.now() + timeoutMs
  let lastDistanceLogAt = 0
  while (Date.now() < deadline) {
    const player = state.bot?.players?.[playerName]
    const botPosition = state.bot?.entity?.position
    const playerPosition = player?.entity?.position
    if (botPosition && playerPosition) {
      const distance = botPosition.distanceTo(playerPosition)
      if (distance <= maxDistance) {
        appendToChatFile('运输 Bot ' + playerName + ' 已到场，距离 ' + distance.toFixed(1) + ' 格')
        return true
      }
      if (Date.now() - lastDistanceLogAt > 2500) {
        appendToChatFile('运输 Bot ' + playerName + ' 尚未到身边，当前距离 ' + distance.toFixed(1) + ' 格，要求 ≤' + maxDistance + ' 格')
        lastDistanceLogAt = Date.now()
      }
    }
    await sleep(500)
  }
  return false
}

function getPlayerDistance(playerName) {
  const player = state.bot?.players?.[playerName]
  const botPosition = state.bot?.entity?.position
  const playerPosition = player?.entity?.position
  if (!botPosition || !playerPosition) return null
  return botPosition.distanceTo(playerPosition)
}

async function facePlayer(playerName) {
  const player = state.bot.players[playerName]
  if (!player || !player.entity) {
    appendToChatFile('\u672a\u770b\u5230\u73a9\u5bb6/Bot ' + playerName + '\uff0c\u76f4\u63a5\u539f\u5730\u4e22\u51fa')
    return false
  }
  await state.bot.lookAt(player.entity.position.offset(0, 1.6, 0))
  await sleep(300)
  return true
}

async function facePlayerForThrow(playerName) {
  const player = state.bot.players[playerName]
  if (!player || !player.entity) return false
  await state.bot.lookAt(player.entity.position.offset(0, 0.8, 0))
  await sleep(200)
  return true
}

function isAirLikeBlock(block) {
  return !block || ['air', 'cave_air', 'void_air'].includes(block.name)
}

function isSoftFlatSurface(block) {
  return block && /carpet|snow|moss_carpet/.test(block.name || '')
}

function isUnsafeLandingBlock(block) {
  if (!block) return true
  return /water|lava|fire|cactus|campfire|magma|sweet_berry|chest|barrel|shulker|hopper|rail|trapdoor|fence|wall|glass_pane|iron_bars/.test(block.name || '')
}

function isFlatLandingPosition(pos) {
  const y = Math.floor(pos.y)
  const x = Math.floor(pos.x)
  const z = Math.floor(pos.z)
  const feet = state.bot.blockAt(new vec3(x, y, z))
  const head = state.bot.blockAt(new vec3(x, y + 1, z))
  const below = state.bot.blockAt(new vec3(x, y - 1, z))
  const hasGround = (below && below.boundingBox === 'block' && !isUnsafeLandingBlock(below)) || isSoftFlatSurface(below) || isSoftFlatSurface(feet)
  const feetClear = isAirLikeBlock(feet) || isSoftFlatSurface(feet)
  const headClear = isAirLikeBlock(head)
  return hasGround && feetClear && headClear
}

async function assertSafeThrowLandingToPlayer(playerName) {
  const player = state.bot.players[playerName]
  if (!player || !player.entity?.position) {
    throw new Error('throw target not visible: ' + playerName)
  }
  const target = player.entity.position
  const candidates = [
    target,
    target.offset(1, 0, 0),
    target.offset(-1, 0, 0),
    target.offset(0, 0, 1),
    target.offset(0, 0, -1)
  ]
  const safe = candidates.some(pos => isFlatLandingPosition(pos))
  if (!safe) {
    throw new Error('target landing is not flat/safe, stopped toss: ' + playerName)
  }
}

async function stepBackFromLookDirection(blocks) {
  const bot = state.bot
  const yaw = bot.entity.yaw
  const target = bot.entity.position.offset(Math.sin(yaw) * blocks, 0, Math.cos(yaw) * blocks)
  appendToChatFile('面向目标后退 ' + blocks + ' 格到: (' + Math.floor(target.x) + ',' + Math.floor(bot.entity.position.y) + ',' + Math.floor(target.z) + ')')
  await moveToPosition(Math.floor(target.x), Math.floor(bot.entity.position.y), Math.floor(target.z))
  await sleep(300)
}

async function tossItems(itemName, quantity) {
  let remaining = quantity
  const items = state.bot.inventory.items().filter(item => itemNameMatches(item, itemName))
  for (const item of items) {
    if (remaining <= 0) break
    const amount = Math.min(item.count, remaining)
    await new Promise((resolve, reject) => {
      state.bot.toss(item.type, item.metadata, amount, err => err ? reject(err) : resolve())
    })
    remaining -= amount
    await sleep(500)
  }
  if (remaining > 0) throw new Error('\u4e22\u51fa\u6570\u91cf\u4e0d\u8db3\uff0c\u5269\u4f59 ' + remaining)
}

async function dropItemsAtFeet(itemName, quantity) {
  const bot = state.bot
  if (!bot?.entity) throw new Error('Bot未就绪，无法脚下丢物品')
  await bot.lookAt(bot.entity.position.offset(0, -2, 0), true)
  await bot.look(bot.entity.yaw, Math.PI / 2, true)
  appendToChatFile('\u4e3b Bot \u5df2\u5f3a\u5236\u4f4e\u5934\uff0c\u51c6\u5907\u811a\u4e0b\u4e22\u8d27')
  await sleep(300)

  let remaining = quantity
  const items = bot.inventory.items().filter(item => itemNameMatches(item, itemName))
  for (const item of items) {
    if (remaining <= 0) break
    const amount = Math.min(item.count, remaining)
    await bot.look(bot.entity.yaw, Math.PI / 2, true)
    await sleep(50)
    if (amount === item.count && Number.isInteger(item.slot)) {
      await Promise.race([
        bot.clickWindow(item.slot, 1, 4),
        new Promise((_, reject) => setTimeout(() => reject(new Error('drop at feet timeout: ' + item.name)), 2500))
      ])
    } else {
      await new Promise((resolve, reject) => {
        bot.toss(item.type, item.metadata, amount, err => err ? reject(err) : resolve())
      })
    }
    remaining -= amount
    if (remaining > 0) await sleep(60)
  }
  if (remaining > 0) throw new Error('脚下丢出数量不足，剩余 ' + remaining)
}

async function scanSpecifiedChests(scanAreas, options = {}) {
  scanCancelRequested = false
  if (!isBotReady()) {
    appendToChatFile('Bot未就绪')
    return
  }

  const bot = state.bot

  appendToChatFile(`开始扫描仓库区域`)

  if (!scanAreas || scanAreas.length === 0) {
    appendToChatFile('未配置扫描区域')
    return
  }

  let totalChestsFound = 0
  let totalChestsScanned = 0

  for (const area of scanAreas) {
    assertScanNotCancelled()
    appendToChatFile(`\n=== 扫描区域: ${area.name} ===`)
    
    if (area.warpCommand) {
      appendToChatFile(`执行传送命令: ${area.warpCommand}`)
      bot.chat(area.warpCommand)
      await new Promise(resolve => setTimeout(resolve, Number(area.warpWaitMs) || 1800))
    }

    if (area.startPositions && area.startPositions.length > 0) {
      for (let i = 0; i < area.startPositions.length; i++) {
        assertScanNotCancelled()
        const pos = area.startPositions[i]
        appendToChatFile(`移动到起始位置 ${i + 1}: (${pos.x}, ${pos.y}, ${pos.z})`)
        await moveToPosition(pos.x, pos.y, pos.z)
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    }

    if (!area.scanRegion) {
      appendToChatFile('未配置扫描区域范围，跳过')
      continue
    }

    let { startX, endX, minY, maxY, z, minZ, maxZ } = area.scanRegion
    const scanMode = area.scanMode === 'bulk' ? 'bulk' : 'mixed'
    const zValues = scanMode === 'bulk'
      ? (() => {
          const a = Number.isFinite(Number(minZ)) ? Number(minZ) : Number(z)
          const b = Number.isFinite(Number(maxZ)) ? Number(maxZ) : Number(z)
          const from = Math.min(a, b)
          const to = Math.max(a, b)
          const values = []
          for (let value = from; value <= to; value++) values.push(value)
          return values
        })()
      : [Number(z)]
    if (startX === -20839 && endX === -20818 && Number(zValues[0]) === 11673) startX = -20840
    const standY = Number.isFinite(Number(area.standY))
      ? Number(area.standY)
      : Number(area.startPositions?.[0]?.y ?? Math.floor(bot.entity.position.y))
    const scanMoveDelayMs = Number.isFinite(Number(area.scanMoveDelayMs)) ? Number(area.scanMoveDelayMs) : 140
    const scanChestDelayMs = Number.isFinite(Number(area.scanChestDelayMs)) ? Number(area.scanChestDelayMs) : 90
    const scanLookDelayMs = Number.isFinite(Number(area.lookDelayMs)) ? Number(area.lookDelayMs) : 140
    const scanCloseDelayMs = Number.isFinite(Number(area.closeDelayMs)) ? Number(area.closeDelayMs) : 90
    appendToChatFile(`扫描范围: x ${startX}~${endX}, y ${minY}~${maxY}, z=${z}`)
    appendToChatFile(`扫描顺序: ${area.scanOrder === 'y-desc' ? '从上到下' : '从下到上'}`)

    const chestsToScan = []

    const containerOrder = Array.isArray(area.containerOrder) && area.containerOrder.length > 0 ? area.containerOrder : ['chest', 'shulker']
    const allowChest = !Array.isArray(area.containerTypes) || area.containerTypes.includes('chest')
    const allowShulker = !Array.isArray(area.containerTypes) || area.containerTypes.includes('shulker')
    function containerRank(name) {
      const type = isShulkerBlockName(name) ? 'shulker' : 'chest'
      const idx = containerOrder.indexOf(type)
      return idx === -1 ? 99 : idx
    }
    function shouldScanBlock(block) {
      if (!block || !CHEST_BLOCKS.includes(block.name)) return false
      if (isShulkerBlockName(block.name)) return allowShulker
      return allowChest
    }
    for (let x = startX; x <= endX; x++) {
      assertScanNotCancelled()
      for (const scanZ of zValues) {
        const standPos = new vec3(x, standY, scanZ + 1)
        if (bot.entity.position.distanceTo(standPos) > 1.8) {
          await moveToPosition(x, standY, scanZ + 1, { timeoutMs: 1400, minTimeoutMs: 450, range: 1.25 })
        }
        await new Promise(resolve => setTimeout(resolve, scanMoveDelayMs))
        if (area.scanOrder === 'y-desc') {
          for (let y = maxY; y >= minY; y--) {
            const chestPos = new vec3(x, y, scanZ)
            const chestBlock = bot.blockAt(chestPos)
            if (shouldScanBlock(chestBlock)) {
              chestsToScan.push({ x, y, z: scanZ, rank: containerRank(chestBlock.name) })
              appendToChatFile(`发现容器: (${x}, ${y}, ${scanZ}) ${chestBlock.name}`)
            }
          }
        } else {
          for (let y = minY; y <= maxY; y++) {
            const chestPos = new vec3(x, y, scanZ)
            const chestBlock = bot.blockAt(chestPos)
            if (shouldScanBlock(chestBlock)) {
              chestsToScan.push({ x, y, z: scanZ, rank: containerRank(chestBlock.name) })
              appendToChatFile(`发现容器: (${x}, ${y}, ${scanZ}) ${chestBlock.name}`)
            }
          }
        }
      }
    }
    chestsToScan.sort((a, b) => (a.rank - b.rank) || (a.x - b.x) || (a.z - b.z) || (b.y - a.y))

    totalChestsFound += chestsToScan.length

    if (chestsToScan.length === 0) {
      appendToChatFile('该区域没有找到任何箱子')
      continue
    }

    appendToChatFile(`共找到 ${chestsToScan.length} 个箱子，开始逐个打开...`)

    let scanList = chestsToScan
    const maxChests = Number(options.maxChests) || 0
    if (maxChests > 0) {
      const remaining = Math.max(0, maxChests - totalChestsScanned)
      scanList = chestsToScan.slice(0, remaining)
      appendToChatFile(`测试模式限制：本次最多扫描 ${maxChests} 个箱子，当前区域扫描 ${scanList.length} 个`)
      if (scanList.length === 0) break
    }

    for (const pos of scanList) {
      assertScanNotCancelled()
      const { x, y, z } = pos
      appendToChatFile(`扫描箱子: (${x}, ${y}, ${z})`)

      try {
        const standPos = new vec3(x, standY, z + 1)
        if (bot.entity.position.distanceTo(standPos) > 2.0) {
          await moveToPosition(x, standY, z + 1, { timeoutMs: 1400, minTimeoutMs: 450, range: 1.25 })
          await new Promise(resolve => setTimeout(resolve, scanMoveDelayMs))
        }
        await openChestAtPosition(x, y, z, { skipMove: true, standY, maxOpenDistance: 4.8, lookDelay: scanLookDelayMs, closeDelay: scanCloseDelayMs, scanMode })
        totalChestsScanned++
      } catch (e) {
        appendToChatFile(`扫描箱子 (${x}, ${y}, ${z}) 失败: ${e.message}`)
      }

      await new Promise(resolve => setTimeout(resolve, scanChestDelayMs))
    }

    appendToChatFile(`区域 ${area.name} 扫描完成`)
  }

  appendToChatFile(`\n=== 扫描全部完成 ===`)
  appendToChatFile(`发现箱子: ${totalChestsFound} 个`)
  appendToChatFile(`成功扫描: ${totalChestsScanned} 个`)
  
  if (process.send) {
    process.send({ type: 'scanComplete' })
  }
}

function requestScanCancel() {
  scanCancelRequested = true
  try {
    state.bot?.pathfinder?.setGoal(null)
    state.bot?.clearControlStates?.()
  } catch {}
  appendToChatFile('已收到停止扫描指令，正在安全停止移动')
}

function assertScanNotCancelled() {
  if (!scanCancelRequested) return
  try {
    state.bot?.pathfinder?.setGoal(null)
    state.bot?.clearControlStates?.()
  } catch {}
  throw new Error('扫描已手动停止')
}
async function handlePickupRequest(sender, args) {
  if (!isBotReady()) {
    appendToChatFile('Bot未就绪')
    return
  }

  const bot = state.bot

  if (!args || args.length < 2) {
    appendToChatFile('取货命令格式: !取货 <物品名称> <数量>')
    return
  }

  const itemName = args[0]
  const quantity = parseInt(args[1])

  if (isNaN(quantity) || quantity <= 0) {
    appendToChatFile('数量必须大于0')
    return
  }

  appendToChatFile(`收到取货请求: ${itemName} x${quantity}`)

  const warehouseData = loadWarehouseData()
  const item = warehouseData.items.find(i => i.name === itemName || i.displayName === itemName)

  if (!item) {
    appendToChatFile(`未找到物品: ${itemName}`)
    return
  }

  if (!item.chestLocation) {
    appendToChatFile(`物品 ${itemName} 没有记录存放位置，请先扫描仓库`)
    return
  }

  if (item.stock < quantity) {
    appendToChatFile(`库存不足，当前库存: ${item.stock}`)
    return
  }

  const { x, y, z } = item.chestLocation
  appendToChatFile(`物品存放在: (${x}, ${y}, ${z})`)

  try {
    await moveToPosition(x, y, z + 1)
    await new Promise(resolve => setTimeout(resolve, 300))

    const container = await openChestAtPosition(x, y, z, { returnContainer: true })
    if (!container) {
      appendToChatFile('无法打开箱子')
      return
    }

    let taken = 0
    const slots = Array.isArray(container.slots)
      ? container.slots
      : (Array.isArray(container.inventory?.slots) ? container.inventory.slots : [])
    const inventorySize = container.inventorySize || container.size || container.inventory?.size || 27
    const normalizedName = itemName.replace(/^minecraft:/, '')
    const expectedNames = new Set([itemName, normalizedName, `minecraft:${normalizedName}`])

    for (let i = 0; i < inventorySize && taken < quantity; i++) {
      const slot = slots[i]
      if (slot && expectedNames.has(slot.name)) {
        const takeAmount = Math.min(slot.count, quantity - taken)
        await bot.clickWindow(i, 0, 0)
        taken += takeAmount
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    await container.close()

    if (taken === 0) {
      appendToChatFile('箱子中未找到物品')
      return
    }

    appendToChatFile(`成功取出 ${itemName} x${taken}`)

    await dispatchTransportBot(sender, itemName, taken)

  } catch (e) {
    appendToChatFile(`取货失败: ${e.message}`)
  }
}

async function dispatchTransportBot(playerName, itemName, quantity) {
  appendToChatFile('\u65e7\u804a\u5929\u53d6\u8d27\u5165\u53e3\u5df2\u505c\u7528: ' + playerName + ' ' + itemName + ' x' + quantity + '\u3002\u8bf7\u4ece Web \u5546\u57ce\u4e0b\u5355\uff0c\u7531\u4e3b Bot \u961f\u5217\u6267\u884c\u3002')
}


function loadWarehouseData() {
  try {
    const data = fs.readFileSync('warehouse.json', 'utf8')
    return JSON.parse(data)
  } catch {
    return { items: [] }
  }
}

loadMCItems()
loadCache()
acquireInstanceLock()
createBot()
