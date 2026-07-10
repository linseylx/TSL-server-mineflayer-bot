const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const {
  normalizeMicrosoftLogin,
  DEFAULT_LOGIN_URL,
} = require("../utils/microsoftLogin");
module.exports = function (app, ctx) {
  const {
    warehouse,
    blacklist,
    users,
    logs,
    botLogs,
    mainBotProcess,
    mainBotState,
    botConfig,
    transportBots,
    transportBotCommands,
    transportBotLoginUrls,
    transportBotErrors,
    localBotLastSeen,
    failoverActive,
    failoverTimer,
    addLog,
    saveWarehouse,
    saveBlacklist,
    saveUsers,
    requireAuth,
    shopIO,
    adminIO,
    BOTS_DIR,
    TRANSPORT_CONFIG_FILE,
    CONFIG_FILE,
    CONFIG_DIR_FILE,
    CLOUD_SERVER_FILE,
    tempLoginCodes,
    saveTempLoginCodes,
    mainBotControlTasks = [],
    setSystemStatus = () => {},
    broadcastSystemStatus = () => {},
  } = ctx;
  let _mainBotProcess = mainBotProcess;
  let _mainBotState = mainBotState;
  let latestMainBotLoginUrl = null;
  let _scanItems = {};
  let _lastScanTestResult = null;
  function normalizeScanCustomName(value) {
    return value === undefined || value === null ? "" : String(value);
  }
  function normalizeShulkerSignature(value) {
    return value === undefined || value === null ? "" : String(value);
  }
  function scanItemKey(name, customName, shulkerSignature) {
    return `${name}|${normalizeScanCustomName(customName)}|${normalizeShulkerSignature(shulkerSignature)}`;
  }
  function findWarehouseItemForScan(scannedItem) {
    return warehouse.items.find(
      (i) =>
        i.name === scannedItem.name &&
        normalizeScanCustomName(i.customName) ===
          normalizeScanCustomName(scannedItem.customName) &&
        normalizeShulkerSignature(i.shulkerSignature) ===
          normalizeShulkerSignature(scannedItem.shulkerSignature),
    );
  }
  function isScanManagedWarehouseItem(item) {
    return item && item.public !== false && item.scanManaged !== false;
  }
  function mergeScannedWarehouseItem(existingItem, scannedItem) {
    const preserved = existingItem || {};
    return {
      ...preserved,
      id: preserved.id || scannedItem.id,
      name: scannedItem.name,
      displayName:
        scannedItem.displayName ||
        preserved.displayName ||
        scannedItem.name.replace("minecraft:", ""),
      customName: scannedItem.customName || "",
      shulkerContents: Array.isArray(scannedItem.shulkerContents)
        ? scannedItem.shulkerContents
        : [],
      shulkerSignature: scannedItem.shulkerSignature || "",
      bulk: scannedItem.bulk || preserved.bulk || null,
      stock: Number(scannedItem.stock) || 0,
      sourceLocation: scannedItem.sourceLocation || null,
      locations: Array.isArray(scannedItem.locations)
        ? scannedItem.locations
        : [],
      price: Number.isFinite(Number(preserved.price))
        ? Number(preserved.price)
        : 0,
      public: preserved.public !== undefined ? preserved.public : true,
      scanManaged: true,
      createdAt: preserved.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  function toScanNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function notifyScanAreasUpdated() {
    if (adminIO) adminIO.emit("scanAreasUpdated", warehouse.scanAreas || []);
  }
  let configDir = path.dirname(CONFIG_FILE);
  let cloudServerConfig = { url: "", apiKey: "", connected: false };
  function loadConfigDir() {
    if (fs.existsSync(CONFIG_DIR_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(CONFIG_DIR_FILE, "utf8"));
        configDir = data.dir || path.dirname(CONFIG_FILE);
      } catch {}
    }
  }
  function saveConfigDir(dir) {
    configDir = dir;
    fs.writeFileSync(CONFIG_DIR_FILE, JSON.stringify({ dir }, null, 2));
  }
  function loadCloudServer() {
    if (fs.existsSync(CLOUD_SERVER_FILE)) {
      try {
        cloudServerConfig = JSON.parse(
          fs.readFileSync(CLOUD_SERVER_FILE, "utf8"),
        );
      } catch {}
    }
  }
  function saveCloudServer(config) {
    cloudServerConfig = { ...cloudServerConfig, ...config };
    fs.writeFileSync(
      CLOUD_SERVER_FILE,
      JSON.stringify(cloudServerConfig, null, 2),
    );
  }
  function getTransportConfigPath() {
    return (
      TRANSPORT_CONFIG_FILE || path.join(configDir, "transport_config.json")
    );
  }
  loadConfigDir();
  loadCloudServer();
  app.post("/api/bot/temp-login-verified", (req, res) => {
    const { code, username, uuid, town, prefix } = req.body;
    if (tempLoginCodes[code]) {
      tempLoginCodes[code].username = username;
      tempLoginCodes[code].uuid = uuid;
      tempLoginCodes[code].town = town;
      tempLoginCodes[code].prefix = prefix;
      tempLoginCodes[code].verified = true;
      tempLoginCodes[code].verifiedAt = Date.now();
      if (saveTempLoginCodes) {
        saveTempLoginCodes();
      }
    }
    if (adminIO) {
      adminIO.emit("tempLoginVerified", { code, username, uuid, town, prefix });
    }
    if (shopIO) {
      shopIO.emit("tempLoginVerified", { code, username, uuid, town, prefix });
    }
    res.json({ success: true });
  });
  app.get("/api/warehouse/admin", requireAuth, (req, res) => {
    res.json(warehouse.items);
  });
  app.get("/api/admin/scan-areas", requireAuth, (req, res) => {
    res.json({ success: true, scanAreas: warehouse.scanAreas || [] });
  });
  app.post("/api/admin/scan-areas/add", requireAuth, (req, res) => {
    const {
      name,
      warpCommand,
      startPositions,
      scanRegion,
      scanOrder,
      enabled,
      scanMode,
      containerTypes,
      containerOrder,
    } = req.body;
    if (!name || !scanRegion)
      return res.json({ success: false, error: "请填写名称和扫描区域" });
    const newArea = {
      id: Date.now().toString(),
      name,
      warpCommand: warpCommand || "",
      startPositions: startPositions || [],
      scanRegion: {
        startX: parseInt(scanRegion.startX) || 0,
        endX: parseInt(scanRegion.endX) || 0,
        minY: parseInt(scanRegion.minY) || 0,
        maxY: parseInt(scanRegion.maxY) || 0,
        z: parseInt(scanRegion.z) || 0,
        minZ: toScanNumber(scanRegion.minZ, parseInt(scanRegion.z) || 0),
        maxZ: toScanNumber(scanRegion.maxZ, parseInt(scanRegion.z) || 0),
      },
      scanMode: scanMode === "bulk" ? "bulk" : "mixed",
      containerTypes:
        Array.isArray(containerTypes) && containerTypes.length
          ? containerTypes
          : ["chest", "shulker"],
      containerOrder:
        Array.isArray(containerOrder) && containerOrder.length
          ? containerOrder
          : ["chest", "shulker"],
      scanOrder: scanOrder || "y-desc",
      enabled: enabled !== undefined ? enabled : true,
      createdAt: new Date().toISOString(),
    };
    if (!warehouse.scanAreas) warehouse.scanAreas = [];
    warehouse.scanAreas.push(newArea);
    saveWarehouse();
    addLog(`添加扫描区域: ${name}`);
    res.json({ success: true, scanArea: newArea });
  });
  app.post("/api/admin/scan-areas/update", requireAuth, (req, res) => {
    const {
      id,
      name,
      warpCommand,
      startPositions,
      scanRegion,
      scanOrder,
      enabled,
      scanMode,
      containerTypes,
      containerOrder,
    } = req.body;
    if (!id) return res.json({ success: false, error: "缺少区域ID" });
    const areas = warehouse.scanAreas || [];
    const idx = areas.findIndex((a) => a.id === id);
    if (idx === -1) return res.json({ success: false, error: "区域不存" });
    if (name) areas[idx].name = name;
    if (warpCommand !== undefined) areas[idx].warpCommand = warpCommand;
    if (startPositions !== undefined)
      areas[idx].startPositions = startPositions;
    if (scanRegion) {
      areas[idx].scanRegion = {
        startX: toScanNumber(scanRegion.startX, areas[idx].scanRegion.startX),
        endX: toScanNumber(scanRegion.endX, areas[idx].scanRegion.endX),
        minY: toScanNumber(scanRegion.minY, areas[idx].scanRegion.minY),
        maxY: toScanNumber(scanRegion.maxY, areas[idx].scanRegion.maxY),
        z: toScanNumber(scanRegion.z, areas[idx].scanRegion.z),
        minZ: toScanNumber(
          scanRegion.minZ,
          areas[idx].scanRegion.minZ ?? areas[idx].scanRegion.z,
        ),
        maxZ: toScanNumber(
          scanRegion.maxZ,
          areas[idx].scanRegion.maxZ ?? areas[idx].scanRegion.z,
        ),
      };
    }
    if (scanMode) areas[idx].scanMode = scanMode === "bulk" ? "bulk" : "mixed";
    if (Array.isArray(containerTypes))
      areas[idx].containerTypes = containerTypes;
    if (Array.isArray(containerOrder))
      areas[idx].containerOrder = containerOrder;
    if (scanOrder) areas[idx].scanOrder = scanOrder;
    if (enabled !== undefined) areas[idx].enabled = enabled;
    saveWarehouse();
    addLog(`更新扫描区域: ${name || areas[idx].name}`);
    res.json({ success: true, scanArea: areas[idx] });
  });
  app.post("/api/admin/scan-areas/delete", requireAuth, (req, res) => {
    const { id } = req.body;
    if (!id) return res.json({ success: false, error: "缺少区域ID" });
    const areas = warehouse.scanAreas || [];
    const idx = areas.findIndex((a) => a.id === id);
    if (idx === -1) return res.json({ success: false, error: "区域不存" });
    const deleted = areas.splice(idx, 1)[0];
    saveWarehouse();
    addLog(`删除扫描区域: ${deleted.name}`);
    res.json({ success: true });
  });
  app.post("/api/admin/add-item", requireAuth, (req, res) => {
    const { name, price, stock, displayName, public: isPublic } = req.body;
    if (!name) return res.json({ success: false, error: "请输入物品名" });
    const item = {
      id: Date.now().toString(),
      name,
      displayName: displayName || name.replace("minecraft:", ""),
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      icon: `https://blocksitems.com/api/v1/items/${encodeURIComponent(name)}/icon`,
      public: isPublic !== undefined ? isPublic : true,
      createdAt: new Date().toISOString(),
    };
    warehouse.items.push(item);
    saveWarehouse();
    shopIO.emit("warehouseUpdate");
    addLog(`添加商品: ${name}`);
    res.json({ success: true, item });
  });
  app.post("/api/admin/update-item", requireAuth, (req, res) => {
    const { id, name, price, stock, displayName, public: isPublic } = req.body;
    const item = warehouse.items.find((i) => i.id === id);
    if (!item) return res.json({ success: false, error: "商品不存" });
    if (name) item.name = name;
    if (displayName) item.displayName = displayName;
    if (price !== undefined) item.price = Number(price);
    if (stock !== undefined) item.stock = Number(stock);
    if (isPublic !== undefined) item.public = isPublic;
    saveWarehouse();
    shopIO.emit("warehouseUpdate");
    res.json({ success: true });
  });
  app.post("/api/admin/remove-item", requireAuth, (req, res) => {
    const { id } = req.body;
    const index = warehouse.items.findIndex((i) => i.id === id);
    if (index === -1) return res.json({ success: false, error: "商品不存" });
    const item = warehouse.items[index];
    warehouse.items.splice(index, 1);
    saveWarehouse();
    addLog(`删除商品: ${item.name}`);
    shopIO.emit("warehouseUpdate");
    res.json({ success: true });
  });
  app.post("/api/admin/blacklist/add", requireAuth, (req, res) => {
    const { playerName, reason } = req.body;
    if (!playerName) return res.json({ success: false, error: "请输入玩家名" });
    if (blacklist.find((b) => b.name === playerName)) {
      return res.json({ success: false, error: "玩家已在黑名单中" });
    }
    blacklist.push({
      name: playerName,
      reason: reason || "违规",
      addedAt: new Date().toISOString(),
    });
    saveBlacklist();
    addLog(`添加黑名�? ${playerName}`);
    res.json({ success: true });
  });
  app.post("/api/admin/blacklist/remove", requireAuth, (req, res) => {
    const { playerName } = req.body;
    const index = blacklist.findIndex((b) => b.name === playerName);
    if (index === -1)
      return res.json({ success: false, error: "玩家不在黑名单中" });
    blacklist.splice(index, 1);
    saveBlacklist();
    addLog(`移除黑名�? ${playerName}`);
    res.json({ success: true });
  });
  app.get("/api/admin/blacklist", requireAuth, (req, res) => {
    res.json(blacklist);
  });
  function startMainBot() {
    addLog("启动主Bot...");
    _mainBotState.status = "starting";
    adminIO.emit("mainBotState", _mainBotState);
    const mainBotProc = spawn(process.execPath, ["core/index.js"], {
      cwd: path.join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });
    _mainBotProcess = mainBotProc;
    mainBotProc.stdout.on("data", (data) => {
      const output = data.toString().trim();
      addLog(`[主Bot] ${output}`);
      botLogs.push(output);
      while (botLogs.length > 500) botLogs.shift();
      adminIO.emit("botLog", { type: "main", content: output });
      const login = normalizeMicrosoftLogin(output);
      if (login.hasLogin && _mainBotState.status !== "online") {
        const previous = latestMainBotLoginUrl || {};
        const url = login.hasUrl
          ? login.url
          : previous.url || DEFAULT_LOGIN_URL;
        const code = login.hasCode ? login.code : previous.code || "";
        latestMainBotLoginUrl = {
          url,
          code,
          message: login.message,
          time: new Date().toISOString(),
        };
        adminIO.emit("mainBotLoginUrl", latestMainBotLoginUrl);
      }
    });
    mainBotProc.stderr.on("data", (data) => {
      const output = data.toString().trim();
      addLog(`[主Bot][错误] ${output}`);
      botLogs.push("[错误] " + output);
      while (botLogs.length > 500) botLogs.shift();
      adminIO.emit("botLog", { type: "main", content: "[错误] " + output });
    });
    mainBotProc.on("message", (msg) => {
      if (msg.type === "microsoftLogin") {
        const login = normalizeMicrosoftLogin(msg.login || {});
        latestMainBotLoginUrl = {
          url: login.url || DEFAULT_LOGIN_URL,
          code: login.code || "",
          message: msg.login?.instruction || login.message || "",
          time: new Date().toISOString(),
        };
        _mainBotState.status = "login_required";
        addLog(`[主Bot] Microsoft 登录验证：${latestMainBotLoginUrl.message}`);
        adminIO.emit("mainBotLoginUrl", latestMainBotLoginUrl);
      } else if (msg.type === "scanComplete") {
        _mainBotState.task = null;
        addLog("扫描完成");
        const scanKeys = Object.keys(_scanItems);
        if (scanKeys.length > 0) {
          const scannedItems = Object.values(_scanItems);
          const scannedByKey = new Map(
            scannedItems.map((scannedItem) => [
              scanItemKey(
                scannedItem.name,
                scannedItem.customName,
                scannedItem.shulkerSignature,
              ),
              scannedItem,
            ]),
          );
          const previousItems = Array.isArray(warehouse.items)
            ? warehouse.items
            : [];
          const preservedItems = previousItems.filter(
            (item) => !isScanManagedWarehouseItem(item),
          );
          const nextItems = [...preservedItems];
          let updatedCount = 0;
          let addedCount = 0;
          for (const scannedItem of scannedItems) {
            const existingItem = findWarehouseItemForScan(scannedItem);
            nextItems.push(
              mergeScannedWarehouseItem(existingItem, scannedItem),
            );
            if (existingItem) updatedCount++;
            else addedCount++;
          }
          const removedCount = previousItems.filter(
            (item) =>
              isScanManagedWarehouseItem(item) &&
              !scannedByKey.has(
                scanItemKey(item.name, item.customName, item.shulkerSignature),
              ),
          ).length;
          warehouse.items = nextItems;
          saveWarehouse();
          addLog(
            "\u626b\u63cf\u5b8c\u6210\uff0c\u5df2\u6309\u672c\u6b21\u626b\u63cf\u5237\u65b0\u5e93\u5b58\uff1a\u66f4\u65b0 " +
              updatedCount +
              " \u79cd\uff0c\u65b0\u589e " +
              addedCount +
              " \u79cd\uff0c\u79fb\u9664\u65e7\u5e93\u5b58 " +
              removedCount +
              " \u79cd\uff0c\u5171 " +
              scannedItems.length +
              " \u79cd\u7269\u54c1",
          );
        }
        adminIO.emit("warehouseUpdate", warehouse);
        shopIO.emit("warehouseUpdate");
        setSystemStatus({
          scanning: false,
          scanMessage: "\u626b\u63cf\u5b8c\u6210",
          lastScanAt: new Date().toISOString(),
        });
        adminIO.emit("scanComplete", {
          success: true,
          itemCount: Object.keys(_scanItems).length,
          at: new Date().toISOString(),
        });
        shopIO.emit("scanComplete", {
          success: true,
          itemCount: Object.keys(_scanItems).length,
          at: new Date().toISOString(),
        });
      } else if (msg.type === "newItem") {
        const item = msg.item;
        if (item && item.name) {
          const key = scanItemKey(
            item.name,
            item.customName,
            item.shulkerSignature,
          );
          if (_scanItems[key]) {
            _scanItems[key].stock =
              (_scanItems[key].stock || 0) + (item.count || 1);
            if (item.sourceLocation) {
              _scanItems[key].sourceLocation = item.sourceLocation;
              _scanItems[key].locations = _scanItems[key].locations || [];
              const existingLoc = _scanItems[key].locations.find(
                (loc) =>
                  loc.x === item.sourceLocation.x &&
                  loc.y === item.sourceLocation.y &&
                  loc.z === item.sourceLocation.z,
              );
              if (existingLoc) {
                existingLoc.count =
                  (existingLoc.count || 0) + (item.count || 1);
              } else {
                _scanItems[key].locations.push({
                  ...item.sourceLocation,
                  count: item.count || 1,
                });
              }
            }
          } else {
            _scanItems[key] = {
              id:
                Date.now().toString(36) + Math.random().toString(36).substr(2),
              name: item.name,
              displayName:
                item.displayName || item.name.replace("minecraft:", ""),
              customName: item.customName,
              shulkerContents: item.shulkerContents || [],
              shulkerSignature: item.shulkerSignature || "",
              stock: item.count || 1,
              sourceLocation: item.sourceLocation || item.chest || null,
              locations: item.sourceLocation
                ? [{ ...item.sourceLocation, count: item.count || 1 }]
                : [],
              price: 0,
              public: true,
              createdAt: new Date().toISOString(),
            };
          }
        }
      } else if (msg.type === "scanTestResult") {
        _mainBotState.task = null;
        _lastScanTestResult = msg.result || null;
        addLog(
          "[scanTest] " + (msg.result?.message || JSON.stringify(msg.result)),
        );
        adminIO.emit("scanTestResult", msg.result);
      } else if (msg.type === "scanFailed") {
        _mainBotState.task = null;
        const error = String(msg.error || "扫描失败");
        addLog(`[扫描失败] ${error}`, "error");
        setSystemStatus({ scanning: false, scanMessage: error });
        adminIO.emit("scanComplete", { success: false, error, at: new Date().toISOString() });
      } else if (msg.type === "statusUpdate") {
        _mainBotState = {
          ..._mainBotState,
          status: msg.status === "ready" ? "online" : msg.status,
          health: msg.health,
          food: msg.food,
          username: msg.username || _mainBotState.username,
          position: msg.position,
        };
      } else if (msg.type === "task") {
        _mainBotState.task = msg.task;
      } else if (msg.type === "loginComplete") {
        _mainBotState.status = "online";
        latestMainBotLoginUrl = null;
        adminIO.emit("mainBotLoginUrl", { url: "", code: "", cleared: true });
      } else if (msg.type === "transportTask") {
        handleTransportTask(msg.task);
      }
      adminIO.emit("mainBotState", _mainBotState);
    });
    mainBotProc.on("exit", () => {
      addLog("主Bot已停");
      _mainBotProcess = null;
      _mainBotState.status = "offline";
      adminIO.emit("mainBotState", _mainBotState);
    });
  }
  app.post("/api/admin/mainbot/start", requireAuth, (req, res) => {
    if (_mainBotProcess)
      return res.json({ success: false, error: "主Bot已在运行" });
    startMainBot();
    res.json({ success: true });
  });
  app.post("/api/admin/mainbot/stop", requireAuth, (req, res) => {
    if (_mainBotProcess) {
      _mainBotProcess.kill("SIGTERM");
      _mainBotProcess = null;
      _mainBotState = {
        status: "offline",
        health: 20,
        food: 20,
        position: null,
        task: null,
      };
      adminIO.emit("mainBotState", _mainBotState);
      addLog("停止主Bot");
    }
    res.json({ success: true });
  });
  app.post("/api/bot/toggle", requireAuth, (req, res) => {
    if (_mainBotProcess) {
      _mainBotProcess.kill("SIGTERM");
      _mainBotProcess = null;
      _mainBotState = {
        status: "offline",
        health: 20,
        food: 20,
        position: null,
        task: null,
      };
      adminIO.emit("mainBotState", _mainBotState);
      addLog("停止主Bot");
      res.json({ success: true, status: "offline" });
    } else {
      startMainBot();
      res.json({ success: true, status: "starting" });
    }
  });
  app.post("/api/admin/mainbot/scan", requireAuth, (req, res) => {
    if (!_mainBotProcess)
      return res.json({ success: false, error: "\u4E3BBot\u672A\u8FD0\u884C" });
    const body = req.body || {};
    const mode = body.mode || "configured";
    _mainBotState.task =
      mode === "configured"
        ? "\u6B63\u5728\u626B\u63CF\u4ED3\u5E93..."
        : `\u6B63\u5728\u6267\u884C\u626B\u63CF\u6D4B\u8BD5: ${mode}`;
    setSystemStatus({
      scanning: true,
      scanMessage:
        mode === "configured" && !body.test
          ? "\u6b63\u5728\u626b\u63cf\u4ed3\u5e93\uff0c\u5546\u57ce\u5e93\u5b58\u53ef\u80fd\u6682\u65f6\u4e0d\u53ef\u7528"
          : `\u6b63\u5728\u6267\u884c\u626b\u63cf\u6d4b\u8bd5: ${mode}`,
      scanStartedAt: new Date().toISOString(),
    });
    adminIO.emit("mainBotState", _mainBotState);
    _scanItems = {};
    const enabledAreas = (warehouse.scanAreas || []).filter((a) => a.enabled);
    if (mode === "configured" && !body.test) {
      if (enabledAreas.length === 0) {
        _mainBotState.task = null;
        setSystemStatus({ scanning: false, scanMessage: "没有启用的扫描区域" });
        return res.json({ success: false, error: "没有启用的扫描区域" });
      }
      addLog("\u5F00\u59CB\u626B\u63CF\u4ED3\u5E93");
      _mainBotProcess.send({ type: "scanWarehouse", scanAreas: enabledAreas });
      return res.json({ success: true, mode });
    }
    let scanAreas = enabledAreas;
    if (mode === "area" && body.areaId) {
      scanAreas = enabledAreas.filter((a) => a.id === body.areaId);
    }
    addLog(`[\u626B\u63CF\u6D4B\u8BD5] \u5F00\u59CB\u6267\u884C: ${mode}`);
    _mainBotProcess.send({
      type: "scanTest",
      payload: { ...body, mode, scanAreas },
    });
    res.json({ success: true, mode });
  });
  app.post("/api/admin/mainbot/scan/cancel", requireAuth, (req, res) => {
    if (!_mainBotProcess)
      return res.json({ success: false, error: "\u4E3BBot\u672A\u8FD0\u884C" });
    try {
      _mainBotProcess.send({ type: "cancelScan" });
      _mainBotState.task = null;
      setSystemStatus({ scanning: false, scanMessage: "已请求停止扫描" });
      adminIO.emit("mainBotState", _mainBotState);
      addLog("\u5DF2\u53D1\u9001\u505C\u6B62\u626B\u63CF\u6307\u4EE4");
      res.json({ success: true });
    } catch (err) {
      res.json({
        success: false,
        error: "\u505C\u6B62\u626B\u63CF\u5931\u8D25: " + err.message,
      });
    }
  });
  app.get("/api/admin/console/status", requireAuth, (req, res) => {
    res.json({
      success: true,
      mainBotState: _mainBotState,
      mainBotLoginUrl: latestMainBotLoginUrl,
      transportBotLoginUrls,
      transportBotErrors,
      botLogs: botLogs.slice(-200),
      logs: logs.slice(-200),
      scanTestResult: _lastScanTestResult,
    });
  });
  app.get("/api/admin/config", requireAuth, (req, res) => {
    res.json(botConfig);
  });
  app.get("/api/public/mainbot-info", (req, res) => {
    res.json({
      name: botConfig.name || "",
      email: botConfig.email,
      host: botConfig.host,
      port: botConfig.port,
      version: botConfig.version,
      status: _mainBotState.status,
      username: _mainBotState.username || "",
    });
  });
  app.get("/api/admin/warehouse-mode", requireAuth, (req, res) => {
    res.json({
      success: true,
      mode: botConfig.warehouseMode || "PUBLIC",
      townPrefix: botConfig.townPrefix || "",
    });
  });
  app.post("/api/admin/warehouse-mode", requireAuth, (req, res) => {
    const { mode, townPrefix } = req.body;
    if (mode && ["PUBLIC", "TOWN_ONLY"].includes(mode)) {
      botConfig.warehouseMode = mode;
    }
    if (townPrefix !== undefined) {
      botConfig.townPrefix = townPrefix;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2));
    addLog(`更新仓库模式: ${mode}, 小镇前缀: ${townPrefix}`);
    res.json({
      success: true,
      mode: botConfig.warehouseMode,
      townPrefix: botConfig.townPrefix,
    });
  });
  app.get("/api/admin/api-key", requireAuth, (req, res) => {
    const secretKeyFile = path.join(__dirname, "..", "secret_key.txt");
    let apiKey = "";
    if (fs.existsSync(secretKeyFile)) {
      apiKey = fs.readFileSync(secretKeyFile, "utf8").trim();
    }
    res.json({ success: true, apiKey });
  });
  app.post("/api/admin/config/update", requireAuth, (req, res) => {
    const { name, email, host, port, version, warehouseMode, townPrefix } =
      req.body;
    if (name) botConfig.name = name;
    if (email) botConfig.email = email;
    if (host) botConfig.host = host;
    if (port) botConfig.port = parseInt(port);
    if (version) botConfig.version = version;
    if (warehouseMode) botConfig.warehouseMode = warehouseMode;
    if (townPrefix !== undefined) botConfig.townPrefix = townPrefix;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2));
    addLog(`更新配置: ${JSON.stringify(botConfig)}`);
    try {
      if (adminIO) {
        adminIO.emit("configUpdated", botConfig);
      }
    } catch (e) {}
    res.json({ success: true });
  });
  function loadTransportConfig() {
    const configPath = TRANSPORT_CONFIG_FILE || getTransportConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        config.bots = Array.isArray(config.bots) ? config.bots : [];
        return config;
      } catch {
        return { bots: [] };
      }
    }
    return { bots: [] };
  }
  function saveTransportConfig(config) {
    const configPath = TRANSPORT_CONFIG_FILE || getTransportConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  async function syncToCloud() {
    if (!cloudServerConfig.url || !cloudServerConfig.apiKey) return false;
    try {
      const config = loadTransportConfig();
      let serverUrl = cloudServerConfig.url;
      if (
        !serverUrl.startsWith("http://") &&
        !serverUrl.startsWith("https://")
      ) {
        serverUrl = "http://" + serverUrl;
      }
      const response = await fetch(`${serverUrl}/api/cloud/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cloudServerConfig.apiKey}`,
        },
        body: JSON.stringify({ transportConfig: config }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  function getNextBotId() {
    let maxId = 1;
    if (fs.existsSync(BOTS_DIR)) {
      const dirs = fs.readdirSync(BOTS_DIR).filter((d) => d.startsWith("bot"));
      dirs.forEach((dir) => {
        const match = dir.match(/bot(\d+)/);
        if (match) {
          const id = parseInt(match[1]);
          if (id > maxId) maxId = id;
        }
      });
    }
    return maxId + 1;
  }
  app.get("/api/admin/transport-bots", requireAuth, (req, res) => {
    const config = loadTransportConfig();
    const bots = config.bots.map((bot) => ({
      ...bot,
      id: `bot${bot.num}`,
      running: transportBots[`bot${bot.num}`] ? true : false,
      currentStatus: bot.status || "stopped",
      loginUrl: transportBotLoginUrls[`bot${bot.num}`],
      lastError: transportBotErrors[`bot${bot.num}`],
    }));
    res.json(bots);
  });
  app.post(
    "/api/admin/transport-bots/create",
    requireAuth,
    async (req, res) => {
      const { num, email, host, port, version } = req.body;
      if (!email) return res.json({ success: false, error: "请输入邮" });
      const botNum = parseInt(num) || getNextBotId();
      const config = loadTransportConfig();
      const exists = config.bots.some((b) => b.num === botNum);
      if (exists) return res.json({ success: false, error: "Bot已存" });
      const newBot = {
        num: botNum,
        email: email,
        host: host || "mc.zenoxs.cn",
        port: parseInt(port) || 25565,
        version: version || "1.20.4",
        status: "stopped",
        createdAt: new Date().toISOString(),
      };
      config.bots.push(newBot);
      saveTransportConfig(config);
      addLog(`创建运输Bot #${botNum}: ${email}`);
      const synced = await syncToCloud();
      if (synced) addLog(`已同步到云服务器`);
      res.json({ success: true, bot: newBot, synced });
    },
  );
  app.post(
    "/api/admin/transport-bots/:id/delete",
    requireAuth,
    async (req, res) => {
      const botId = req.params.id;
      const match = botId.match(/^bot(\d+)$/);
      if (!match) return res.json({ success: false, error: "无效的Bot ID" });
      const botNum = parseInt(match[1]);
      const config = loadTransportConfig();
      const idx = config.bots.findIndex((b) => b.num === botNum);
      if (idx === -1) return res.json({ success: false, error: "Bot不存" });
      if (transportBots[botId]) {
        transportBots[botId].kill();
        delete transportBots[botId];
      }
      config.bots.splice(idx, 1);
      saveTransportConfig(config);
      addLog(`删除运输Bot: ${botId}`);
      const synced = await syncToCloud();
      if (synced) addLog(`已同步到云服务器`);
      res.json({ success: true, synced });
    },
  );
  app.post(
    "/api/admin/transport-bots/update",
    requireAuth,
    async (req, res) => {
      const { id, num, email, host, port, version } = req.body;
      const match = id.match(/^bot(\d+)$/);
      if (!match) return res.json({ success: false, error: "无效的Bot ID" });
      const botNum = parseInt(match[1]);
      const config = loadTransportConfig();
      const idx = config.bots.findIndex((b) => b.num === botNum);
      if (idx === -1) return res.json({ success: false, error: "Bot不存" });
      if (num && num !== botNum) {
        const exists = config.bots.some(
          (b) => b.num === num && b.num !== botNum,
        );
        if (exists) return res.json({ success: false, error: "Bot编号已存" });
        config.bots[idx].num = num;
        addLog(`修改运输Bot编号: #${botNum} -> #${num}`);
      }
      if (email) config.bots[idx].email = email;
      if (host) config.bots[idx].host = host;
      if (port) config.bots[idx].port = parseInt(port);
      if (version) config.bots[idx].version = version;
      saveTransportConfig(config);
      addLog(`更新运输Bot #${config.bots[idx].num}`);
      const synced = await syncToCloud();
      if (synced) addLog(`已同步到云服务器`);
      res.json({ success: true, synced });
    },
  );
  function startTransportBot(botId, botNum) {
    const config = loadTransportConfig();
    const botConfig = config.bots.find((b) => b.num === botNum);
    if (!botConfig) return;
    delete transportBotLoginUrls[botId];
    delete transportBotErrors[botId];
    addLog(`启动运输Bot: ${botId}`);
    const botProcess = spawn(
      "node",
      ["transport_bot.js", getTransportConfigPath(), botNum],
      {
        cwd: BOTS_DIR,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, BOT_TYPE: botConfig.type || "local" },
      },
    );
    transportBots[botId] = botProcess;
    botProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      addLog(`[运输Bot ${botId}] ${output}`);
      const loginMatch = output.match(
        /https?:\/\/www\.microsoft\.com\/link.*?(\w{8})/,
      );
      if (loginMatch) {
        transportBotLoginUrls[botId] = {
          url: loginMatch[0],
          code: loginMatch[1],
        };
        adminIO.emit("transportBotLoginUrl", {
          botId,
          url: loginMatch[0],
          code: loginMatch[1],
        });
      }
      const errorMatch = output.match(
        /Error|error|Failed|failed|Exception|exception/i,
      );
      if (errorMatch && output.length > 10) {
        transportBotErrors[botId] = output.substring(0, 200);
        adminIO.emit("transportBotError", {
          botId,
          error: transportBotErrors[botId],
        });
      }
    });
    botProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      addLog(`[运输Bot ${botId}][错误] ${output}`);
      const loginMatch = output.match(
        /https?:\/\/www\.microsoft\.com\/link.*?(\w{8})/,
      );
      if (loginMatch) {
        transportBotLoginUrls[botId] = {
          url: loginMatch[0],
          code: loginMatch[1],
        };
        adminIO.emit("transportBotLoginUrl", {
          botId,
          url: loginMatch[0],
          code: loginMatch[1],
        });
      }
      transportBotErrors[botId] = output.substring(0, 200);
      adminIO.emit("transportBotError", {
        botId,
        error: transportBotErrors[botId],
      });
    });
    botProcess.on("exit", () => {
      addLog(`运输Bot已停�? ${botId}`);
      delete transportBots[botId];
      adminIO.emit("transportBotStatus", { botId, status: "stopped" });
      const cfg = loadTransportConfig();
      const idx = cfg.bots.findIndex((b) => b.num === botNum);
      if (idx !== -1) {
        cfg.bots[idx].status = "stopped";
        saveTransportConfig(cfg);
      }
    });
    const cfg = loadTransportConfig();
    const idx = cfg.bots.findIndex((b) => b.num === botNum);
    if (idx !== -1) {
      cfg.bots[idx].status = "starting";
      saveTransportConfig(cfg);
    }
  }
  app.post("/api/admin/transport-bots/:id/start", requireAuth, (req, res) => {
    const botId = req.params.id;
    const match = botId.match(/^bot(\d+)$/);
    if (!match) return res.json({ success: false, error: "无效的Bot ID" });
    const botNum = parseInt(match[1]);
    if (transportBots[botId])
      return res.json({ success: false, error: "Bot已在运行" });
    startTransportBot(botId, botNum);
    res.json({ success: true });
  });
  app.post("/api/admin/transport-bots/:id/stop", requireAuth, (req, res) => {
    const botId = req.params.id;
    if (transportBots[botId]) {
      transportBots[botId].kill();
      delete transportBots[botId];
      addLog(`停止运输Bot: ${botId}`);
    }
    res.json({ success: true });
  });
  app.post("/api/admin/transport-bots/:id/command", requireAuth, (req, res) => {
    const botId = req.params.id;
    const { command } = req.body;
    if (!command) return res.json({ success: false, error: "请输入命" });
    const match = botId.match(/^bot(\d+)$/);
    if (!match) return res.json({ success: false, error: "无效的Bot ID" });
    const botNum = parseInt(match[1]);
    if (!transportBotCommands[botNum]) transportBotCommands[botNum] = [];
    transportBotCommands[botNum].push({ cmd: "CMD", payload: { command } });
    addLog(`发送命令给运输Bot #${botNum}: ${command}`);
    res.json({ success: true });
  });
  app.post("/api/server/exec", requireAuth, (req, res) => {
    addLog("已拒绝服务器终端命令接口调用");
    res
      .status(403)
      .json({
        success: false,
        error: "服务器终端命令接口已禁用，请使用 SSH/PM2 管理服务",
      });
  });
  app.get("/api/logs", requireAuth, (req, res) => {
    res.json(logs.slice(-100));
  });
  app.get("/api/bot/logs", requireAuth, (req, res) => {
    res.json(botLogs.slice(-100));
  });
  app.get("/api/admin/users", requireAuth, (req, res) => {
    res.json(users);
  });
  app.post("/api/admin/user/rename", requireAuth, (req, res) => {
    const { oldUsername, newUsername } = req.body;
    if (!oldUsername || !newUsername) {
      return res.json({ success: false, error: "参数不完" });
    }
    let updated = false;
    for (const user of users) {
      if (user.boundAccounts && Array.isArray(user.boundAccounts)) {
        for (let i = 0; i < user.boundAccounts.length; i++) {
          const account = user.boundAccounts[i];
          const accountName =
            typeof account === "string" ? account : account.username;
          if (accountName === oldUsername) {
            if (typeof account === "string") {
              user.boundAccounts[i] = newUsername;
            } else {
              account.username = newUsername;
            }
            updated = true;
            break;
          }
        }
        if (updated) break;
      }
    }
    if (!updated) {
      return res.json({ success: false, error: "未找到该用户" });
    }
    saveUsers();
    addLog(`修改玩家�? ${oldUsername} -> ${newUsername}`);
    res.json({ success: true });
  });
  app.post("/api/admin/user/balance", requireAuth, (req, res) => {
    const { playerName, amount } = req.body;
    const user = users.find((u) => u.name === playerName);
    if (!user) return res.json({ success: false, error: "用户不存" });
    user.balance = (user.balance || 0) + Number(amount);
    saveUsers();
    addLog(`余额变更: ${playerName} +${amount}`);
    res.json({ success: true, balance: user.balance });
  });
  const multer = require("multer");
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = req.body.path ? path.join("/", req.body.path) : "/";
      if (!fs.existsSync(uploadPath))
        fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => cb(null, file.originalname),
  });
  const upload = multer({ storage: storage });
  function resolvePath(userPath) {
    const platform = process.platform;
    let normalizedPath = path.normalize(userPath).replace(/^[\/\\]+/, "");
    console.log(
      "[DEBUG] resolvePath input:",
      userPath,
      "normalized:",
      normalizedPath,
    );
    if (platform === "win32") {
      const homeDir =
        process.env.USERPROFILE || process.env.HOMEPATH || "C:\\Users\\Public";
      const desktopDir = path.join(homeDir, "Desktop");
      const rootDir = "C:\\";
      const projectDir = path.join(__dirname, "..");
      if (
        normalizedPath === "" ||
        normalizedPath === "/" ||
        normalizedPath === "computer"
      ) {
        return "root";
      } else if (normalizedPath === "root") {
        return "root";
      } else if (
        normalizedPath.startsWith("root/") ||
        normalizedPath.startsWith("root\\")
      ) {
        const subPath = normalizedPath.replace(/^root[\/\\]/, "");
        if (!subPath) return "root";
        if (subPath.match(/^[A-Za-z]:/)) {
          return path.resolve(subPath);
        }
        if (subPath.toLowerCase() === "desktop") {
          return desktopDir;
        }
        return path.join(rootDir, subPath);
      } else if (
        normalizedPath.match(/^[A-Za-z](\/|\\)/) ||
        normalizedPath.match(/^[A-Za-z]$/)
      ) {
        const driveLetter = normalizedPath[0].toUpperCase();
        const rest = normalizedPath.substring(1).replace(/^[\/\\]+/, "");
        if (!rest) {
          return path.resolve(driveLetter + ":\\");
        }
        return path.resolve(driveLetter + ":\\" + rest);
      } else if (normalizedPath === "mineflayer") {
        return projectDir;
      } else if (
        normalizedPath.startsWith("mineflayer/") ||
        normalizedPath.startsWith("mineflayer\\\\")
      ) {
        return path.join(
          projectDir,
          normalizedPath.replace(/^mineflayer[\\/\\\\]/, ""),
        );
      } else if (normalizedPath === "deploy") {
        return path.join(projectDir, "deploy-packages");
      } else if (
        normalizedPath.startsWith("deploy/") ||
        normalizedPath.startsWith("deploy\\\\")
      ) {
        return path.join(
          projectDir,
          "deploy-packages",
          normalizedPath.replace(/^deploy[\\/\\\\]/, ""),
        );
      } else if (normalizedPath === "transport-config") {
        return path.join(projectDir, "core", "transport");
      } else if (
        normalizedPath.startsWith("transport-config/") ||
        normalizedPath.startsWith("transport-config\\\\")
      ) {
        return path.join(
          projectDir,
          "core",
          "transport",
          normalizedPath.replace(/^transport-config[\\/\\\\]/, ""),
        );
      } else if (normalizedPath === "home") {
        return homeDir;
      } else if (
        normalizedPath.startsWith("home/") ||
        normalizedPath.startsWith("home\\")
      ) {
        return path.join(homeDir, normalizedPath.replace(/^home[\/\\]/, ""));
      } else if (normalizedPath === "desktop") {
        return desktopDir;
      } else if (
        normalizedPath.startsWith("desktop/") ||
        normalizedPath.startsWith("desktop\\")
      ) {
        return path.join(
          desktopDir,
          normalizedPath.replace(/^desktop[\/\\]/, ""),
        );
      } else if (normalizedPath === "etc") {
        return path.join(rootDir, "Windows", "System32", "config");
      } else if (normalizedPath.startsWith("etc/")) {
        return path.join(
          rootDir,
          "Windows",
          "System32",
          "config",
          normalizedPath.replace(/^etc[\/\\]/, ""),
        );
      } else if (normalizedPath === "var") {
        return path.join(rootDir, "ProgramData");
      } else if (normalizedPath.startsWith("var/")) {
        return path.join(
          rootDir,
          "ProgramData",
          normalizedPath.replace(/^var[\/\\]/, ""),
        );
      } else if (normalizedPath === "opt") {
        return path.join(rootDir, "Program Files");
      } else if (normalizedPath.startsWith("opt/")) {
        return path.join(
          rootDir,
          "Program Files",
          normalizedPath.replace(/^opt[\/\\]/, ""),
        );
      } else if (normalizedPath.match(/^[A-Za-z]:/)) {
        return path.resolve(normalizedPath);
      }
      return path.resolve(normalizedPath);
    } else {
      const resolved = path.join("/", normalizedPath);
      if (!resolved.startsWith("/")) return null;
      return resolved;
    }
  }
  const SAFE_FILE_ROOTS = {
    mineflayer: { name: "Mineflayer", dir: path.resolve(__dirname, "..") },
    deploy: {
      name: "更新包",
      dir: path.resolve(__dirname, "..", "deploy-packages"),
    },
    "transport-config": {
      name: "运输Bot配置",
      dir: path.resolve(__dirname, "..", "core", "transport"),
    },
  };
  const SENSITIVE_FILE_NAMES = new Set([
    "secret_key.txt",
    "admin_password.txt",
    ".env",
  ]);
  function isSensitiveFilePath(filePath) {
    const normalized = String(filePath || "")
      .replace(/\\/g, "/")
      .toLowerCase();
    const base = path.basename(normalized);
    return (
      SENSITIVE_FILE_NAMES.has(base) ||
      normalized.includes("/.ssh/") ||
      normalized.endsWith("/authorized_keys") ||
      normalized.endsWith("/id_rsa") ||
      normalized.endsWith("/id_ed25519")
    );
  }
  function resolveSafeFilePath(userPath) {
    const raw = String(userPath || "/").replace(/\\/g, "/");
    const normalized = path.posix.normalize("/" + raw).replace(/^\/+/, "");
    if (
      !normalized ||
      normalized === "." ||
      normalized === "root" ||
      normalized === "computer"
    )
      return { root: true };
    const parts = normalized.split("/").filter(Boolean);
    const rootKey = parts.shift();
    const root = SAFE_FILE_ROOTS[rootKey];
    if (!root) return null;
    const target = path.resolve(root.dir, parts.join(path.sep));
    const base = path.resolve(root.dir);
    if (target !== base && !target.startsWith(base + path.sep)) return null;
    if (isSensitiveFilePath(target)) return null;
    return {
      rootKey,
      root,
      target,
      virtualPath: "/" + [rootKey, ...parts].join("/"),
    };
  }
  function safeFileEntry(rootKey, root, target) {
    const stat = fs.statSync(target);
    const rel = path.relative(root.dir, target).replace(/\\/g, "/");
    return {
      name: path.basename(target),
      path: "/" + [rootKey, rel].filter(Boolean).join("/"),
      type: stat.isDirectory() ? "directory" : "file",
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    };
  }
  app.get("/api/files/sidebar-tree", requireAuth, (req, res) => {
    res.json({
      success: true,
      tree: {
        "/computer": {
          name: "受限文件区",
          icon: "🛡️",
          children: Object.entries(SAFE_FILE_ROOTS).map(([key, root]) => ({
            path: "/" + key,
            name: root.name,
            icon: "📁",
          })),
        },
      },
    });
  });
  app.get("/api/files/list", requireAuth, (req, res) => {
    const resolved = resolveSafeFilePath(req.query.path || "/");
    if (!resolved)
      return res.status(403).json({ success: false, error: "路径不允许" });
    if (resolved.root) {
      const files = Object.entries(SAFE_FILE_ROOTS)
        .filter(([, root]) => fs.existsSync(root.dir))
        .map(([key, root]) => {
          const stat = fs.statSync(root.dir);
          return {
            name: root.name,
            path: "/" + key,
            type: "directory",
            isDirectory: true,
            isFile: false,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          };
        });
      return res.json({ success: true, files });
    }
    try {
      if (!fs.existsSync(resolved.target))
        return res.status(404).json({ success: false, error: "路径不存在" });
      const stat = fs.statSync(resolved.target);
      if (!stat.isDirectory())
        return res.json({
          success: true,
          files: [
            safeFileEntry(resolved.rootKey, resolved.root, resolved.target),
          ],
        });
      const files = fs
        .readdirSync(resolved.target)
        .filter(
          (name) => !isSensitiveFilePath(path.join(resolved.target, name)),
        )
        .map((name) =>
          safeFileEntry(
            resolved.rootKey,
            resolved.root,
            path.join(resolved.target, name),
          ),
        )
        .sort(
          (a, b) =>
            b.isDirectory - a.isDirectory || a.name.localeCompare(b.name),
        );
      res.json({ success: true, files });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/files/info", requireAuth, (req, res) => {
    const resolved = resolveSafeFilePath(req.query.path || "/");
    if (!resolved || resolved.root)
      return res.status(403).json({ success: false, error: "路径不允许" });
    try {
      if (!fs.existsSync(resolved.target))
        return res.status(404).json({ success: false, error: "路径不存在" });
      const stat = fs.statSync(resolved.target);
      res.json({
        success: true,
        info: {
          name: path.basename(resolved.target),
          path: resolved.virtualPath,
          size: stat.size,
          type: stat.isDirectory() ? "directory" : "file",
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          accessedAt: stat.atime.toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/files/read", requireAuth, (req, res) => {
    const resolved = resolveSafeFilePath(req.query.path || "/");
    if (!resolved || resolved.root) return res.status(403).send("路径不允许");
    try {
      if (!fs.existsSync(resolved.target))
        return res.status(404).send("文件不存在");
      const stat = fs.statSync(resolved.target);
      if (stat.isDirectory()) return res.status(400).send("不能读取目录");
      if (stat.size > 1024 * 1024) return res.status(413).send("文件过大");
      res
        .type("text/plain; charset=utf-8")
        .send(fs.readFileSync(resolved.target, "utf8"));
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/files/download", requireAuth, (req, res) => {
    const resolved = resolveSafeFilePath(req.query.path || "/");
    if (!resolved || resolved.root) return res.status(403).send("路径不允许");
    try {
      if (!fs.existsSync(resolved.target))
        return res.status(404).send("文件不存在");
      const stat = fs.statSync(resolved.target);
      if (stat.isDirectory()) return res.status(400).send("不能下载目录");
      res.download(resolved.target);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.post("/api/files/upload", requireAuth, (req, res) =>
    res
      .status(403)
      .json({
        success: false,
        error: "文件管理上传已禁用，请使用系统更新上传入口",
      }),
  );
  app.use("/api/files", requireAuth, (req, res) =>
    res.status(403).json({ success: false, error: "文件管理写操作已禁用" }),
  );
  app.get("/api/files/list", requireAuth, (req, res) => {
    const userPath = req.query.path || "/";
    console.log("[DEBUG] files/list called with userPath:", userPath);
    const resolvedPath = resolvePath(userPath);
    console.log("[DEBUG] resolvedPath:", resolvedPath);
    console.log(
      "[DEBUG] fs.existsSync(resolvedPath):",
      resolvedPath !== "root" && fs.existsSync(resolvedPath),
    );
    if (!resolvedPath) return res.json({ success: false, error: "非法路径" });
    try {
      if (resolvedPath === "root") {
        const drives = [];
        if (process.platform === "win32") {
          for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
            const drive = String.fromCharCode(i) + ":/";
            if (fs.existsSync(drive)) {
              drives.push({
                name: String.fromCharCode(i) + ":",
                path: "/" + String.fromCharCode(i),
                type: "directory",
                isDirectory: true,
                size: 0,
                mtime: null,
              });
            }
          }
        } else {
          const rootDirs = ["/", "/root", "/home", "/etc", "/var"];
          rootDirs.forEach((dir) => {
            if (fs.existsSync(dir)) {
              const stat = fs.statSync(dir);
              drives.push({
                name: dir,
                path: "root" + dir,
                type: "directory",
                isDirectory: true,
                size: stat.size,
                mtime: stat.mtime.toISOString(),
              });
            }
          });
        }
        res.json({ success: true, files: drives });
        return;
      }
      if (!fs.existsSync(resolvedPath))
        return res.json({ success: false, error: "路径不存" });
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory())
        return res.json({ success: false, error: "不是目录" });
      const files = fs.readdirSync(resolvedPath).map((name) => {
        try {
          const fullPath = path.join(resolvedPath, name);
          const stat = fs.statSync(fullPath);
          return {
            name,
            path: userPath + (userPath === "/" ? "" : "/") + name,
            type: stat.isDirectory() ? "directory" : "file",
            isDirectory: stat.isDirectory(),
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          };
        } catch {
          return {
            name,
            path: userPath + (userPath === "/" ? "" : "/") + name,
            type: "file",
            isDirectory: false,
            size: 0,
            mtime: null,
          };
        }
      });
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      res.json({ success: true, files });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.get("/api/files/sidebar-tree", requireAuth, (req, res) => {
    const platform = process.platform;
    const homeDir =
      platform === "win32"
        ? process.env.USERPROFILE || process.env.HOMEPATH || "C:\\Users\\Public"
        : process.env.HOME || "/home";
    const desktopDir =
      platform === "win32"
        ? path.join(homeDir, "Desktop")
        : path.join(homeDir, "Desktop");
    const treeData = {
      "/computer": { name: "此电脑", icon: "🖥", children: [] },
      "/config": {
        name: "应用配置",
        icon: "⚙️",
        children: [
          { path: "/mineflayer", name: "Mineflayer", icon: "🤖" },
          { path: "/deploy", name: "部署配置", icon: "📦" },
          { path: "/transport-config", name: "运输Bot配置目录", icon: "📄" },
        ],
      },
    };
    if (platform === "win32") {
      for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
        const drive = String.fromCharCode(i) + ":/";
        if (fs.existsSync(drive)) {
          const drivePath = "/" + String.fromCharCode(i);
          const driveItem = {
            path: drivePath,
            name: String.fromCharCode(i) + ":",
            icon: "💿",
            children: [],
          };
          const commonFolders = [
            { name: "Users", path: drivePath + "/Users" },
            { name: "Program Files", path: drivePath + "/Program Files" },
            { name: "Windows", path: drivePath + "/Windows" },
            { name: "TSL bot", path: drivePath + "/TSL bot" },
            { name: "Mineflayer bot", path: drivePath + "/Mineflayer bot" },
          ];
          commonFolders.forEach((folder) => {
            const winPath =
              String.fromCharCode(i) +
              ":\\" +
              folder.path.substring(3).replace(/\//g, "\\");
            if (fs.existsSync(winPath)) {
              driveItem.children.push({
                path: folder.path,
                name: folder.name,
                icon: "📁",
              });
            }
          });
          treeData["/computer"].children.push(driveItem);
        }
      }
      if (fs.existsSync(desktopDir)) {
        treeData["/computer"].children.push({
          path: "/desktop",
          name: "桌面",
          icon: "🖥",
        });
      }
    } else {
      const linuxDirs = [
        { name: "root 目录", path: "/root", icon: "👤" },
        { name: "用户目录", path: "/home", icon: "👥" },
        { name: "系统配置", path: "/etc", icon: "⚙️" },
        { name: "运行时数", path: "/var", icon: "📊" },
        { name: "应用程序", path: "/opt", icon: "📦" },
      ];
      linuxDirs.forEach((dir) => {
        if (fs.existsSync(dir.path)) {
          treeData["/computer"].children.push(dir);
        }
      });
    }
    res.json({ success: true, data: treeData });
  });
  app.post("/api/files/mkdir", requireAuth, (req, res) => {
    const { path: userPath } = req.body;
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.json({ success: false, error: "非法路径" });
    try {
      if (fs.existsSync(resolvedPath))
        return res.json({ success: false, error: "目录已存" });
      fs.mkdirSync(resolvedPath, { recursive: true });
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/files/create", requireAuth, (req, res) => {
    const { path: userPath } = req.body;
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.json({ success: false, error: "非法路径" });
    try {
      if (fs.existsSync(resolvedPath))
        return res.json({ success: false, error: "文件已存" });
      fs.writeFileSync(resolvedPath, "");
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/files/delete", requireAuth, (req, res) => {
    const { path: userPath } = req.body;
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.json({ success: false, error: "非法路径" });
    try {
      if (!fs.existsSync(resolvedPath))
        return res.json({ success: false, error: "路径不存" });
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory())
        fs.rmSync(resolvedPath, { recursive: true, force: true });
      else fs.unlinkSync(resolvedPath);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/files/rename", requireAuth, (req, res) => {
    const { oldPath, newPath } = req.body;
    const resolvedOldPath = resolvePath(oldPath);
    const resolvedNewPath = resolvePath(newPath);
    if (!resolvedOldPath || !resolvedNewPath)
      return res.json({ success: false, error: "非法路径" });
    try {
      if (!fs.existsSync(resolvedOldPath))
        return res.json({ success: false, error: "源路径不存在" });
      fs.renameSync(resolvedOldPath, resolvedNewPath);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/files/copy", requireAuth, (req, res) => {
    const { source, destination } = req.body;
    const resolvedSource = resolvePath(source);
    const resolvedDest = resolvePath(destination);
    if (!resolvedSource || !resolvedDest)
      return res.json({ success: false, error: "非法路径" });
    try {
      if (!fs.existsSync(resolvedSource))
        return res.json({ success: false, error: "源路径不存在" });
      const copyRecursive = (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          const files = fs.readdirSync(src);
          files.forEach((file) => {
            const curSrc = path.join(src, file);
            const curDest = path.join(dest, file);
            copyRecursive(curSrc, curDest);
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      copyRecursive(resolvedSource, resolvedDest);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/files/move", requireAuth, (req, res) => {
    const { source, destination } = req.body;
    const resolvedSource = resolvePath(source);
    const resolvedDest = resolvePath(destination);
    if (!resolvedSource || !resolvedDest)
      return res.json({ success: false, error: "非法路径" });
    try {
      if (!fs.existsSync(resolvedSource))
        return res.json({ success: false, error: "源路径不存在" });
      fs.renameSync(resolvedSource, resolvedDest);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.get("/api/files/info", requireAuth, (req, res) => {
    const userPath = req.query.path || "/";
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.json({ success: false, error: "非法路径" });
    try {
      if (!fs.existsSync(resolvedPath))
        return res.json({ success: false, error: "路径不存" });
      const stats = fs.statSync(resolvedPath);
      res.json({
        success: true,
        info: {
          name: path.basename(resolvedPath),
          path: userPath,
          absolutePath: resolvedPath,
          size: stats.size,
          type: stats.isDirectory() ? "directory" : "file",
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          accessedAt: stats.atime.toISOString(),
        },
      });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post(
    "/api/files/upload",
    requireAuth,
    upload.single("file"),
    (req, res) => {
      try {
        if (!req.file)
          return res.json({ success: false, error: "没有上传文件" });
        res.json({ success: true, filename: req.file.filename });
      } catch (err) {
        res.json({ success: false, error: err.message });
      }
    },
  );
  app.get("/api/files/download", requireAuth, (req, res) => {
    const userPath = req.query.path || "/";
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.status(400).send("非法路径");
    try {
      if (!fs.existsSync(resolvedPath)) return res.status(404).send("文件不存");
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) return res.status(400).send("不能下载目录");
      res.download(resolvedPath);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/files/read", requireAuth, (req, res) => {
    const userPath = req.query.path || "/";
    const resolvedPath = resolvePath(userPath);
    if (!resolvedPath) return res.status(400).send("非法路径");
    try {
      if (!fs.existsSync(resolvedPath)) return res.status(404).send("文件不存");
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) return res.status(400).send("不能读取目录");
      const content = fs.readFileSync(resolvedPath, "utf8");
      res.send(content);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });
  app.get("/api/bot/list", requireAuth, (req, res) => {
    const config = loadTransportConfig();
    const bots = config.bots.map((bot) => ({
      id: `bot${bot.num}`,
      num: bot.num,
      email: bot.email,
      status: bot.status || "stopped",
      server: bot.host || "",
      running: transportBots[`bot${bot.num}`] ? true : false,
    }));
    res.json({ success: true, bots });
  });
  app.post("/api/bot/toggle-transport", requireAuth, (req, res) => {
    const { id } = req.body;
    const match = id.match(/^bot(\d+)$/);
    if (!match) return res.json({ success: false, error: "无效的Bot ID" });
    const botNum = parseInt(match[1]);
    const botId = id;
    if (transportBots[botId]) {
      transportBots[botId].kill();
      delete transportBots[botId];
      addLog(`停止运输Bot: ${botId}`);
      res.json({ success: true, status: "stopped" });
    } else {
      startTransportBot(botId, botNum);
      res.json({ success: true, status: "starting" });
    }
  });
  app.post("/api/bot/create", requireAuth, async (req, res) => {
    const { id, email } = req.body;
    const botNum = parseInt(id);
    if (!botNum || !email)
      return res.json({ success: false, error: "缺少参数" });
    const config = loadTransportConfig();
    const exists = config.bots.some((b) => b.num === botNum);
    if (exists) return res.json({ success: false, error: "Bot已存" });
    const newBot = {
      num: botNum,
      email: email,
      host: "mc.zenoxs.cn",
      port: 25565,
      version: "1.20.4",
      status: "stopped",
      createdAt: new Date().toISOString(),
    };
    config.bots.push(newBot);
    saveTransportConfig(config);
    addLog(`创建运输Bot #${botNum}: ${email}`);
    const synced = await syncToCloud();
    if (synced) addLog(`已同步到云服务器`);
    res.json({ success: true, synced });
  });
  app.post("/api/bot/update", requireAuth, async (req, res) => {
    const { id, newNum, email, host, port, version } = req.body;
    const match = id.match(/^bot(\d+)$/);
    if (!match) return res.json({ success: false, error: "无效的Bot ID" });
    const botNum = parseInt(match[1]);
    const config = loadTransportConfig();
    const idx = config.bots.findIndex((b) => b.num === botNum);
    if (idx === -1) return res.json({ success: false, error: "Bot不存" });
    if (newNum && newNum !== botNum) {
      const exists = config.bots.some(
        (b) => b.num === newNum && b.num !== botNum,
      );
      if (exists) return res.json({ success: false, error: "Bot编号已存" });
      config.bots[idx].num = newNum;
      addLog(`修改运输Bot编号: #${botNum} -> #${newNum}`);
    }
    if (email) config.bots[idx].email = email;
    if (host) config.bots[idx].host = host;
    if (port) config.bots[idx].port = parseInt(port);
    if (version) config.bots[idx].version = version;
    saveTransportConfig(config);
    addLog(`更新运输Bot #${config.bots[idx].num}`);
    const synced = await syncToCloud();
    if (synced) addLog(`已同步到云服务器`);
    res.json({ success: true, synced });
  });
  app.post("/api/bot/delete", requireAuth, async (req, res) => {
    const { id } = req.body;
    const match = id.match(/^bot(\d+)$/);
    if (!match) return res.json({ success: false, error: "无效的Bot ID" });
    const botNum = parseInt(match[1]);
    if (transportBots[id]) {
      transportBots[id].kill();
      delete transportBots[id];
    }
    const config = loadTransportConfig();
    const idx = config.bots.findIndex((b) => b.num === botNum);
    if (idx === -1) return res.json({ success: false, error: "Bot不存" });
    config.bots.splice(idx, 1);
    saveTransportConfig(config);
    addLog(`删除运输Bot #${botNum}`);
    const synced = await syncToCloud();
    if (synced) addLog(`已同步到云服务器`);
    res.json({ success: true, synced });
  });
  app.post("/api/bug-report", (req, res) => {
    const { sender, description, position, timestamp } = req.body;
    if (!sender || !description) {
      return res.json({ success: false, error: "缺少参数" });
    }
    if (description.length > 1000) {
      return res.json({ success: false, error: "描述过长，最�?000字符" });
    }
    if (sender.length > 50) {
      return res.json({ success: false, error: "用户名过" });
    }
    const report = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      sender,
      description,
      position: position || "未知",
      timestamp: timestamp || Date.now(),
      createdAt: new Date().toISOString(),
    };
    addLog(`[Bug报告] ${sender}: ${description} (位置: ${position})`);
    const reportFile = path.join(__dirname, "..", "data", "bug_reports.json");
    let reports = [];
    if (fs.existsSync(reportFile)) {
      try {
        reports = JSON.parse(fs.readFileSync(reportFile, "utf8"));
      } catch {}
    }
    reports.push(report);
    fs.writeFileSync(reportFile, JSON.stringify(reports, null, 2));
    res.json({ success: true, reportId: report.id });
  });
  app.get("/api/admin/bug-reports", requireAuth, (req, res) => {
    const reports = readBugReports().map(withBugStatus);
    res.json({
      success: true,
      reports: reports.slice(-50).reverse(),
      status: bugReportStatus,
    });
  });
  app.post("/api/bot/report", (req, res) => {
    const { botNum, event, data } = req.body;
    if (!botNum || !event) return res.json({ success: false });
    if (event === "heartbeat") {
      localBotLastSeen[botNum] = Date.now();
    }
    addLog(`[Bot #${botNum}] ${event}: ${JSON.stringify(data || {})}`);
    res.json({ success: true });
  });
  app.get("/api/bot/commands/:botNum", (req, res) => {
    const botNum = parseInt(req.params.botNum);
    const commands = transportBotCommands[botNum] || [];
    transportBotCommands[botNum] = [];
    res.json({ success: true, commands });
  });
  app.post("/api/bot/heartbeat", (req, res) => {
    const { botId, botNum, status, task, timestamp, taskProgress } = req.body;
    if (!botId || !botNum)
      return res.json({ success: false, error: "缺少参数" });
    const now = Date.now();
    localBotLastSeen[botNum] = now;
    const response = { success: true };
    if (failoverActive[botNum]?.active) {
      response.command = "FORCE_SLEEP";
      response.reason = "云端已接管任";
      if (!failoverActive[botNum].sleepSent) {
        failoverActive[botNum].sleepSent = true;
        addLog(`[强制休眠] 通知本地Bot #${botNum} 进入休眠状态`);
      }
    }
    res.json(response);
  });
  let botTasks = {};
  app.post("/api/bot/task", (req, res) => {
    const { botId, botNum, taskType, details, timestamp } = req.body;
    if (!botId || !botNum || !taskType)
      return res.json({ success: false, error: "缺少参数" });
    if (!botTasks[botNum]) botTasks[botNum] = [];
    botTasks[botNum].push({
      botId,
      botNum,
      taskType,
      details,
      timestamp: timestamp || Date.now(),
      receivedAt: Date.now(),
    });
    if (botTasks[botNum].length > 100)
      botTasks[botNum] = botTasks[botNum].slice(-100);
    addLog(`[任务上报] Bot #${botNum}: ${taskType}`);
    res.json({ success: true });
  });
  app.get("/api/bot/tasks/:botNum", requireAuth, (req, res) => {
    const botNum = req.params.botNum;
    const tasks = botTasks[botNum] || [];
    res.json({ success: true, tasks });
  });
  let _failoverTimer = failoverTimer;
  function startFailoverMonitor() {
    addLog("[????] ????????? transport_failover.js ??????");
  }
  app.post("/api/bot/failover/complete", requireAuth, (req, res) => {
    const { botNum } = req.body;
    if (!botNum) return res.json({ success: false, error: "缺少参数" });
    failoverActive[botNum] = null;
    addLog(`[故障转移] Bot #${botNum} 云端任务完成，允许本地Bot重新启动`);
    res.json({ success: true });
  });
  startFailoverMonitor();
  let deployStatus = {
    state: "idle",
    progress: 0,
    message: "",
    folder: "",
    nodeInstalled: false,
    depsInstalled: false,
    serverRunning: false,
    urls: [],
    error: "",
  };
  app.get("/api/deploy/status", requireAuth, (req, res) => {
    res.json({ success: true, status: deployStatus });
  });
  app.post("/api/deploy/select-folder", requireAuth, (req, res) => {
    const { folder } = req.body;
    if (!folder) return res.json({ success: false, error: "请选择文件" });
    try {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      deployStatus = {
        state: "selected",
        progress: 0,
        message: "已选择部署目录",
        folder,
        nodeInstalled: false,
        depsInstalled: false,
        serverRunning: false,
        urls: [],
        error: "",
      };
      addLog(`选择部署目录: ${folder}`);
      res.json({ success: true, folder });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.post("/api/deploy/download-node", requireAuth, (req, res) => {
    const { folder } = req.body || {};
    const targetFolder = folder || deployStatus.folder;
    if (!targetFolder)
      return res.json({ success: false, error: "请先选择部署目录" });
    deployStatus.state = "downloading";
    deployStatus.progress = 10;
    deployStatus.message = "正在下载Node.js...";
    adminIO.emit("deployStatus", deployStatus);
    const nodeVersion = "18.19.0";
    const nodeDir = path.join(targetFolder, "node");
    const nodeExe = path.join(nodeDir, "node.exe");
    const npmCmd = path.join(nodeDir, "npm.cmd");
    if (fs.existsSync(nodeExe) && fs.existsSync(npmCmd)) {
      deployStatus.state = "node-ready";
      deployStatus.progress = 40;
      deployStatus.message = "Node.js已安";
      deployStatus.nodeInstalled = true;
      adminIO.emit("deployStatus", deployStatus);
      addLog("Node.js已存在，跳过下载");
      return res.json({ success: true, message: "Node.js已安" });
    }
    const platform = process.platform;
    let downloadUrl = "";
    if (platform === "win32") {
      downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-win-x64.zip`;
    } else if (platform === "linux") {
      downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.xz`;
    } else if (platform === "darwin") {
      downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-x64.tar.gz`;
    }
    if (!downloadUrl) {
      deployStatus.error = "不支持的平台";
      adminIO.emit("deployStatus", deployStatus);
      return res.json({ success: false, error: "不支持的平台" });
    }
    const http = require("https");
    const url = require("url");
    const parsedUrl = url.parse(downloadUrl);
    deployStatus.message = "正在下载Node.js，请稍�?..";
    adminIO.emit("deployStatus", deployStatus);
    const request = http.get(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        headers: { "User-Agent": "Mozilla/5.0" },
      },
      (response) => {
        if (response.statusCode !== 200) {
          deployStatus.error = `下载失败: HTTP ${response.statusCode}`;
          adminIO.emit("deployStatus", deployStatus);
          return res.json({ success: false, error: deployStatus.error });
        }
        const totalBytes = parseInt(response.headers["content-length"]);
        let downloadedBytes = 0;
        const zipPath = path.join(targetFolder, "node.zip");
        const zipStream = fs.createWriteStream(zipPath);
        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          deployStatus.progress =
            10 + Math.round((downloadedBytes / totalBytes) * 20);
          deployStatus.message = `下载�? ${Math.round((downloadedBytes / totalBytes) * 100)}%`;
          adminIO.emit("deployStatus", deployStatus);
        });
        response.on("end", () => {
          deployStatus.progress = 35;
          deployStatus.message = "正在解压Node.js...";
          adminIO.emit("deployStatus", deployStatus);
          try {
            const AdmZip = require("adm-zip");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(targetFolder, true);
            const extractedDir = path.join(
              targetFolder,
              `node-v${nodeVersion}-${platform === "win32" ? "win" : platform}-x64`,
            );
            if (fs.existsSync(extractedDir)) {
              fs.renameSync(extractedDir, nodeDir);
            }
            fs.unlinkSync(zipPath);
            deployStatus.state = "node-ready";
            deployStatus.progress = 40;
            deployStatus.message = "Node.js安装完成";
            deployStatus.nodeInstalled = true;
            adminIO.emit("deployStatus", deployStatus);
            addLog(`Node.js安装完成: ${nodeDir}`);
            res.json({ success: true, nodePath: nodeDir });
          } catch (err) {
            deployStatus.error = `解压失败: ${err.message}`;
            adminIO.emit("deployStatus", deployStatus);
            res.json({ success: false, error: deployStatus.error });
          }
        });
        response.pipe(zipStream);
      },
    );
    request.on("error", (err) => {
      deployStatus.error = `下载错误: ${err.message}`;
      adminIO.emit("deployStatus", deployStatus);
      res.json({ success: false, error: deployStatus.error });
    });
    res.json({ success: true, message: "开始下载Node.js" });
  });
  app.post("/api/deploy/install-deps", requireAuth, (req, res) => {
    const { folder } = req.body || {};
    const targetFolder = folder || deployStatus.folder;
    if (!targetFolder)
      return res.json({ success: false, error: "请先选择部署目录" });
    deployStatus.state = "installing";
    deployStatus.progress = 45;
    deployStatus.message = "正在安装依赖...";
    adminIO.emit("deployStatus", deployStatus);
    const nodeDir = path.join(targetFolder, "node");
    const nodeExe = path.join(nodeDir, "node.exe");
    const npmCmd = path.join(nodeDir, "npm.cmd");
    const packageJson = {
      name: "tsl-server",
      version: "1.0.0",
      description: "TSL Bot Management System",
      main: "server.js",
      scripts: { start: "node server.js", dev: "node server.js" },
      dependencies: {
        express: "^4.18.2",
        "socket.io": "^4.7.2",
        cors: "^2.8.5",
        jsonwebtoken: "^9.0.2",
        "adm-zip": "^0.5.10",
        "cookie-parser": "^1.4.6",
        mineflayer: "^4.14.0",
        "mineflayer-pathfinder": "^2.1.1",
        "prismarine-viewer": "^1.28.0",
      },
    };
    fs.writeFileSync(
      path.join(targetFolder, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );
    const npmPath =
      platform === "win32" ? npmCmd : path.join(nodeDir, "bin", "npm");
    const npmProcess = spawn(npmPath, ["install"], {
      cwd: targetFolder,
      env: {
        ...process.env,
        PATH: nodeDir + path.delimiter + process.env.PATH,
      },
    });
    npmProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output.includes("added") || output.includes("packages")) {
        deployStatus.progress = Math.min(90, deployStatus.progress + 2);
      }
      deployStatus.message = output.substring(0, 50);
      adminIO.emit("deployStatus", deployStatus);
    });
    npmProcess.stderr.on("data", (data) => {
      console.log("[NPM Error]", data.toString());
    });
    npmProcess.on("close", (code) => {
      if (code === 0) {
        deployStatus.state = "deps-ready";
        deployStatus.progress = 90;
        deployStatus.message = "依赖安装完成";
        deployStatus.depsInstalled = true;
        adminIO.emit("deployStatus", deployStatus);
        addLog("依赖安装完成");
        res.json({ success: true, message: "依赖安装完成" });
      } else {
        deployStatus.error = `npm安装失败，退出码: ${code}`;
        adminIO.emit("deployStatus", deployStatus);
        res.json({ success: false, error: deployStatus.error });
      }
    });
    setTimeout(() => {
      if (deployStatus.state === "installing") {
        res.json({ success: true, message: "正在安装依赖，请等待完成" });
      }
    }, 2000);
  });
  app.post("/api/deploy/copy-files", requireAuth, (req, res) => {
    const { folder } = req.body || {};
    const targetFolder = folder || deployStatus.folder;
    if (!targetFolder)
      return res.json({ success: false, error: "请先选择部署目录" });
    deployStatus.state = "copying";
    deployStatus.progress = 92;
    deployStatus.message = "正在复制项目文件...";
    adminIO.emit("deployStatus", deployStatus);
    try {
      const sourceDir = __dirname;
      const projectRoot = path.dirname(sourceDir);
      const filesToCopy = [
        "server.js",
        "core/index.js",
        "package.json",
        "data/warehouse.json",
        "blacklist.json",
        "data/users.json",
        "data/bot_config.json",
        "logs.txt",
        "bot_logs.txt",
        "routes/admin.js",
      ];
      filesToCopy.forEach((file) => {
        const srcPath = path.join(projectRoot, file);
        const destPath = path.join(targetFolder, file);
        if (fs.existsSync(srcPath)) {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir))
            fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      });
      const publicDirs = ["public-shop", "public-desktop", "bots"];
      publicDirs.forEach((dir) => {
        const srcPath = path.join(projectRoot, dir);
        const destPath = path.join(targetFolder, dir);
        if (fs.existsSync(srcPath)) {
          copyDir(srcPath, destPath);
        }
      });
      deployStatus.state = "files-copied";
      deployStatus.progress = 95;
      deployStatus.message = "项目文件复制完成";
      adminIO.emit("deployStatus", deployStatus);
      addLog(`项目文件已复制到: ${targetFolder}`);
      res.json({ success: true, message: "项目文件复制完成" });
    } catch (err) {
      deployStatus.error = `复制文件失败: ${err.message}`;
      adminIO.emit("deployStatus", deployStatus);
      res.json({ success: false, error: deployStatus.error });
    }
  });
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  let deployedServerProcess = null;
  app.post("/api/deploy/start-server", requireAuth, (req, res) => {
    const { folder, domain } = req.body || {};
    const targetFolder = folder || deployStatus.folder;
    if (!targetFolder)
      return res.json({ success: false, error: "请先选择部署目录" });
    if (deployedServerProcess) {
      deployedServerProcess.kill();
      deployedServerProcess = null;
    }
    const platform = process.platform;
    const botsDir = path.join(targetFolder, "bots");
    const logsDir = path.join(targetFolder, "logs");
    const deployConfigDir = path.join(targetFolder, "deploy_config");
    if (!fs.existsSync(botsDir)) fs.mkdirSync(botsDir, { recursive: true });
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    if (!fs.existsSync(deployConfigDir))
      fs.mkdirSync(deployConfigDir, { recursive: true });
    const transportConfigPath = path.join(
      deployConfigDir,
      "transport_config.json",
    );
    if (!fs.existsSync(transportConfigPath)) {
      fs.writeFileSync(
        transportConfigPath,
        JSON.stringify({ bots: [] }, null, 2),
      );
    }
    const deployInfo = {
      deployedFolder: targetFolder,
      configDir: deployConfigDir,
      platform: platform,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(__dirname, "deployed_info.json"),
      JSON.stringify(deployInfo, null, 2),
    );
    deployStatus.state = "starting";
    deployStatus.progress = 97;
    deployStatus.message = "正在启动服务�?..";
    deployStatus.configDir = deployConfigDir;
    adminIO.emit("deployStatus", deployStatus);
    const nodeDir = path.join(targetFolder, "node");
    const nodeExe =
      platform === "win32"
        ? path.join(nodeDir, "node.exe")
        : path.join(nodeDir, "bin", "node");
    deployedServerProcess = spawn(nodeExe, ["server.js"], {
      cwd: targetFolder,
      env: { ...process.env, SERVER_TYPE: "deployed", DOMAIN: domain || "" },
    });
    deployedServerProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("[Deployed Server]", output);
      const shopPortMatch = output.match(/端口:\s*(\d+)/);
      const urlMatch = output.match(/访问地址:\s*(http[^\n]+)/);
      if (urlMatch) {
        const urls = output.match(/http[^\n]+/g) || [];
        deployStatus.urls = urls;
      }
      if (output.includes("启动")) {
        deployStatus.state = "running";
        deployStatus.progress = 100;
        deployStatus.message = "服务器启动成";
        deployStatus.serverRunning = true;
        deployStatus.urls = [
          `http://localhost:28473/shop`,
          `http://localhost:28474/`,
          domain ? `https://${domain}/shop` : "",
          domain ? `https://${domain}/admin` : "",
        ].filter(Boolean);
        adminIO.emit("deployStatus", deployStatus);
        addLog(`部署服务器启动成�? ${deployStatus.urls.join(", ")}`);
      }
    });
    deployedServerProcess.stderr.on("data", (data) => {
      const error = data.toString();
      console.error("[Deployed Server Error]", error);
      const loginUrlMatch = error.match(
        /https?:\/\/www\.microsoft\.com\/link[^ ]+/,
      );
      if (loginUrlMatch) {
        adminIO.emit("deployedServerLoginUrl", {
          url: loginUrlMatch[0],
          serverType: "deployed",
        });
      }
      deployStatus.error = error.substring(0, 100);
      adminIO.emit("deployStatus", deployStatus);
    });
    deployedServerProcess.on("close", (code) => {
      deployStatus.state = "stopped";
      deployStatus.serverRunning = false;
      deployStatus.message = `服务器已停止，退出码: ${code}`;
      adminIO.emit("deployStatus", deployStatus);
      addLog(`部署服务器停止，退出码: ${code}`);
    });
    setTimeout(() => {
      res.json({ success: true, message: "服务器正在启" });
    }, 1000);
  });
  app.post("/api/deploy/stop-server", requireAuth, (req, res) => {
    if (deployedServerProcess) {
      deployedServerProcess.kill();
      deployedServerProcess = null;
      deployStatus.state = "stopped";
      deployStatus.serverRunning = false;
      deployStatus.message = "服务器已停止";
      adminIO.emit("deployStatus", deployStatus);
      addLog("部署服务器已停止");
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "服务器未运行" });
    }
  });
  app.post("/api/deploy/extract-url", requireAuth, (req, res) => {
    const { folder } = req.body || {};
    const targetFolder = folder || deployStatus.folder;
    if (!targetFolder)
      return res.json({ success: false, error: "请先选择部署目录" });
    const logFile = path.join(targetFolder, "bot_logs.txt");
    const urls = [];
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf8");
      const urlMatches =
        content.match(/https?:\/\/www\.microsoft\.com\/link[^ ]+/g) || [];
      urls.push(...urlMatches);
      const errorMatches = content.match(/Error[^ ]+[^\n]+/g) || [];
      errorMatches.forEach((err) => {
        if (err.length > 50)
          urls.push("[ERROR] " + err.substring(0, 50) + "...");
      });
    }
    deployStatus.urls = urls;
    adminIO.emit("deployStatus", deployStatus);
    res.json({ success: true, urls });
  });
  app.post("/api/deploy/full", requireAuth, (req, res) => {
    const { folder, domain } = req.body;
    deployStatus = {
      state: "starting",
      progress: 0,
      message: "开始一键部�?..",
      folder,
      nodeInstalled: false,
      depsInstalled: false,
      serverRunning: false,
      urls: [],
      error: "",
    };
    adminIO.emit("deployStatus", deployStatus);
    (async () => {
      try {
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
        deployStatus.state = "downloading";
        deployStatus.progress = 5;
        deployStatus.message = "下载Node.js...";
        adminIO.emit("deployStatus", deployStatus);
        await downloadNodeJS(folder);
        deployStatus.state = "installing";
        deployStatus.progress = 45;
        deployStatus.message = "安装依赖...";
        adminIO.emit("deployStatus", deployStatus);
        await installDeps(folder);
        deployStatus.state = "copying";
        deployStatus.progress = 90;
        deployStatus.message = "复制项目文件...";
        adminIO.emit("deployStatus", deployStatus);
        const projectRoot = path.dirname(__dirname);
        copyDir(projectRoot, folder);
        deployStatus.state = "starting";
        deployStatus.progress = 95;
        deployStatus.message = "启动服务�?..";
        adminIO.emit("deployStatus", deployStatus);
        await startDeployedServer(folder, domain);
        deployStatus.state = "running";
        deployStatus.progress = 100;
        deployStatus.message = "一键部署完成！";
        deployStatus.serverRunning = true;
        deployStatus.urls = [
          `http://localhost:28473/shop`,
          `http://localhost:28474/`,
          domain ? `https://${domain}/shop` : "",
          domain ? `https://${domain}/admin` : "",
        ].filter(Boolean);
        adminIO.emit("deployStatus", deployStatus);
        addLog(`一键部署完�? ${folder}`);
      } catch (err) {
        deployStatus.state = "error";
        deployStatus.error = err.message;
        adminIO.emit("deployStatus", deployStatus);
        addLog(`一键部署失�? ${err.message}`);
      }
    })();
    res.json({ success: true, message: "开始一键部" });
  });
  function downloadNodeJS(folder) {
    return new Promise((resolve, reject) => {
      const nodeVersion = "18.19.0";
      const nodeDir = path.join(folder, "node");
      const nodeExe = path.join(nodeDir, "node.exe");
      if (fs.existsSync(nodeExe)) {
        deployStatus.nodeInstalled = true;
        resolve();
        return;
      }
      const platform = process.platform;
      let downloadUrl = "";
      if (platform === "win32") {
        downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-win-x64.zip`;
      } else if (platform === "linux") {
        downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.xz`;
      } else if (platform === "darwin") {
        downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-darwin-x64.tar.gz`;
      }
      if (!downloadUrl) {
        reject(new Error("不支持的平台"));
        return;
      }
      const http = require("https");
      const url = require("url");
      const parsedUrl = url.parse(downloadUrl);
      const request = http.get(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          headers: { "User-Agent": "Mozilla/5.0" },
        },
        (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }
          const totalBytes = parseInt(response.headers["content-length"]);
          let downloadedBytes = 0;
          const zipPath = path.join(folder, "node.zip");
          const zipStream = fs.createWriteStream(zipPath);
          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;
            deployStatus.progress =
              10 + Math.round((downloadedBytes / totalBytes) * 30);
            adminIO.emit("deployStatus", deployStatus);
          });
          response.on("end", () => {
            try {
              const AdmZip = require("adm-zip");
              const zip = new AdmZip(zipPath);
              zip.extractAllTo(folder, true);
              const extractedDir = path.join(
                folder,
                `node-v${nodeVersion}-${platform === "win32" ? "win" : platform}-x64`,
              );
              if (fs.existsSync(extractedDir)) {
                fs.renameSync(extractedDir, nodeDir);
              }
              fs.unlinkSync(zipPath);
              deployStatus.nodeInstalled = true;
              resolve();
            } catch (err) {
              reject(err);
            }
          });
          response.pipe(zipStream);
        },
      );
      request.on("error", reject);
    });
  }
  function installDeps(folder) {
    return new Promise((resolve, reject) => {
      const nodeDir = path.join(folder, "node");
      const npmPath =
        platform === "win32"
          ? path.join(nodeDir, "npm.cmd")
          : path.join(nodeDir, "bin", "npm");
      const packageJson = {
        name: "tsl-server",
        version: "1.0.0",
        description: "TSL Bot Management System",
        main: "server.js",
        scripts: { start: "node server.js" },
        dependencies: {
          express: "^4.18.2",
          "socket.io": "^4.7.2",
          cors: "^2.8.5",
          jsonwebtoken: "^9.0.2",
          "adm-zip": "^0.5.10",
          "cookie-parser": "^1.4.6",
          mineflayer: "^4.14.0",
          "mineflayer-pathfinder": "^2.1.1",
          "prismarine-viewer": "^1.28.0",
        },
      };
      fs.writeFileSync(
        path.join(folder, "package.json"),
        JSON.stringify(packageJson, null, 2),
      );
      const npmProcess = spawn(npmPath, ["install"], {
        cwd: folder,
        env: {
          ...process.env,
          PATH: nodeDir + path.delimiter + process.env.PATH,
        },
      });
      npmProcess.stdout.on("data", (data) => {
        const output = data.toString();
        if (output.includes("added") || output.includes("packages")) {
          deployStatus.progress = Math.min(88, deployStatus.progress + 2);
          adminIO.emit("deployStatus", deployStatus);
        }
      });
      npmProcess.on("close", (code) => {
        if (code === 0) {
          deployStatus.depsInstalled = true;
          resolve();
        } else {
          reject(new Error(`npm安装失败，退出码: ${code}`));
        }
      });
      npmProcess.on("error", reject);
    });
  }
  function startDeployedServer(folder, domain) {
    return new Promise((resolve) => {
      const nodeDir = path.join(folder, "node");
      const nodeExe =
        platform === "win32"
          ? path.join(nodeDir, "node.exe")
          : path.join(nodeDir, "bin", "node");
      deployedServerProcess = spawn(nodeExe, ["server.js"], {
        cwd: folder,
        env: { ...process.env, SERVER_TYPE: "deployed", DOMAIN: domain || "" },
      });
      deployedServerProcess.stdout.on("data", (data) => {
        const output = data.toString();
        if (output.includes("启动")) {
          resolve();
        }
      });
      setTimeout(resolve, 5000);
    });
  }
  app.get("/api/config/dir", requireAuth, (req, res) => {
    res.json({ success: true, dir: configDir });
  });
  app.post("/api/config/dir/set", requireAuth, (req, res) => {
    const { dir } = req.body;
    if (!dir) return res.json({ success: false, error: "请提供目录路" });
    const resolvedPath = path.resolve(dir);
    if (
      !fs.existsSync(resolvedPath) ||
      !fs.statSync(resolvedPath).isDirectory()
    ) {
      return res.json({ success: false, error: "目录不存" });
    }
    saveConfigDir(resolvedPath);
    addLog(`设置配置目录: ${resolvedPath}`);
    res.json({ success: true, dir: resolvedPath });
  });
  app.post("/api/config/dir/scan", requireAuth, (req, res) => {
    const { dir } = req.body;
    const scanDir = dir ? path.resolve(dir) : configDir;
    if (!fs.existsSync(scanDir) || !fs.statSync(scanDir).isDirectory()) {
      return res.json({ success: false, error: "目录不存" });
    }
    const transportConfigPath = path.join(scanDir, "transport_config.json");
    const hasTransportConfig = fs.existsSync(transportConfigPath);
    let botCount = 0;
    if (hasTransportConfig) {
      try {
        const config = JSON.parse(fs.readFileSync(transportConfigPath, "utf8"));
        botCount = config.bots?.length || 0;
      } catch {}
    }
    res.json({
      success: true,
      dir: scanDir,
      hasTransportConfig,
      botCount,
      files: fs.readdirSync(scanDir).slice(0, 50),
    });
  });
  app.post("/api/config/unzip", requireAuth, (req, res) => {
    const { zipPath, targetDir } = req.body;
    if (!zipPath || !targetDir)
      return res.json({ success: false, error: "缺少参数" });
    const resolvedZip = path.resolve(zipPath);
    const resolvedTarget = path.resolve(targetDir);
    if (!fs.existsSync(resolvedZip))
      return res.json({ success: false, error: "压缩文件不存" });
    try {
      if (!fs.existsSync(resolvedTarget))
        fs.mkdirSync(resolvedTarget, { recursive: true });
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(resolvedZip);
      zip.extractAllTo(resolvedTarget, true);
      addLog(`解压配置文件: ${zipPath} -> ${targetDir}`);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
  app.get("/api/cloud/server", requireAuth, (req, res) => {
    res.json({
      success: true,
      config: {
        url: cloudServerConfig.url,
        connected: cloudServerConfig.connected,
      },
    });
  });
  app.post("/api/cloud/server/connect", requireAuth, async (req, res) => {
    const { url, apiKey } = req.body;
    if (!url || !apiKey) return res.json({ success: false, error: "缺少参数" });
    let serverUrl = url;
    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
      serverUrl = "http://" + serverUrl;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${serverUrl}/api/cloud/ping`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        saveCloudServer({ url: serverUrl, apiKey, connected: true });
        addLog(`连接云服务器成功: ${serverUrl}`);
        const synced = await syncToCloud();
        res.json({ success: true, synced });
      } else {
        const statusText = response.statusText || "未知错误";
        res.json({
          success: false,
          error: `连接失败 (${response.status}): ${statusText}`,
          portHint: getPortHint(serverUrl),
        });
      }
    } catch (err) {
      let errorMsg = err.message;
      if (err.name === "AbortError") {
        errorMsg = "连接超时";
      } else if (err.code === "ECONNREFUSED") {
        errorMsg = "连接被拒";
      } else if (err.code === "ENOTFOUND") {
        errorMsg = "无法解析服务器地址";
      }
      res.json({
        success: false,
        error: `${errorMsg}，请检查云服务器配置`,
        portHint: getPortHint(serverUrl),
      });
    }
  });
  function getPortHint(serverUrl) {
    try {
      const urlObj = new URL(serverUrl);
      const port = urlObj.port || (urlObj.protocol === "https:" ? "443" : "80");
      return `请确保云服务器的${port}端口已开放，并且服务器正在运行。\n\n云服务器端口配置建议：\n- 管理端口: ${port}\n- 确保防火�?安全组允许入站连接到该端口\n- 如果使用反向代理，请配置正确的端口转发`;
    } catch {
      return "请确保云服务器的端口已开放，并且服务器正在运行";
    }
  }
  app.post("/api/cloud/sync", requireAuth, async (req, res) => {
    const synced = await syncToCloud();
    res.json({ success: synced });
  });
  app.post("/api/cloud/sync/receive", (req, res) => {
    const apiKey = req.headers["authorization"]?.replace("Bearer ", "");
    if (apiKey !== cloudServerConfig.apiKey) {
      return res.status(401).json({ success: false, error: "未授" });
    }
    const { transportConfig } = req.body;
    if (transportConfig) {
      saveTransportConfig(transportConfig);
      addLog("收到云服务器同步的配");
    }
    res.json({ success: true });
  });
  app.get("/api/cloud/ping", (req, res) => {
    res.json({ success: true, message: "云服务器在线", timestamp: Date.now() });
  });
  app.get("/api/deploy/info", requireAuth, (req, res) => {
    const deployedInfoPath = path.join(__dirname, "deployed_info.json");
    if (fs.existsSync(deployedInfoPath)) {
      try {
        const info = JSON.parse(fs.readFileSync(deployedInfoPath, "utf8"));
        res.json({ success: true, deployed: true, info });
      } catch {
        res.json({ success: true, deployed: false });
      }
    } else {
      res.json({ success: true, deployed: false });
    }
  });
  let transportQueue = [];
  let botStatusMap = {};
  function handleTransportTask(task) {
    transportQueue.push(task);
    addLog(
      `添加运输任务: ${task.itemName} x${task.quantity} -> ${task.playerName}`,
    );
    dispatchNextTask();
  }
  function dispatchNextTask() {
    if (transportQueue.length === 0) return;
    const availableBot = getAvailableTransportBot();
    if (!availableBot) {
      addLog("没有可用的货运Bot，任务排队中");
      return;
    }
    const task = transportQueue.shift();
    assignTaskToBot(availableBot, task);
  }
  function getAvailableTransportBot() {
    const config = loadTransportConfig();
    const sortedBots = [...config.bots].sort((a, b) => a.num - b.num);
    for (const bot of sortedBots) {
      if (bot.status === "running" && !botStatusMap[bot.num]?.busy) {
        return bot;
      }
    }
    return null;
  }
  function assignTaskToBot(bot, task) {
    botStatusMap[bot.num] = { busy: true, task };
    addLog(`分配任务给货运Bot #${bot.num}: ${task.itemName} x${task.quantity}`);
    const cmd = {
      cmd: "TRANSPORT",
      payload: {
        playerName: task.playerName,
        itemName: task.itemName,
        quantity: task.quantity,
        sourceLocation: task.sourceLocation,
      },
    };
    transportBotCommands.push({ botNum: bot.num, cmd });
    while (transportBotCommands.length > 100) transportBotCommands.shift();
  }
  app.post("/api/bot/transport/complete", (req, res) => {
    const { botNum, success, playerName } = req.body;
    if (botStatusMap[botNum]) {
      botStatusMap[botNum].busy = false;
      botStatusMap[botNum].task = null;
    }
    if (success) {
      addLog(`货运Bot #${botNum} 完成任务: 送货�?${playerName}`);
    } else {
      addLog(`货运Bot #${botNum} 任务失败: ${playerName}`);
    }
    dispatchNextTask();
    res.json({ success: true });
  });
  if (ctx.auctionModule) {
    const auction = ctx.auctionModule;
    app.get("/api/auction/items", requireAuth, (req, res) => {
      res.json({ success: true, items: auction.getListedItems() });
    });
    app.get("/api/auction/item/status", requireAuth, (req, res) => {
      const { itemId } = req.query;
      if (!itemId) return res.json({ success: false, error: "缺少itemId" });
      res.json({ success: true, data: auction.getItemStatus(itemId) });
    });
    app.post("/api/auction/item/list", requireAuth, async (req, res) => {
      const { itemId, sellerUuid, price, quantity, itemSnapshot } = req.body;
      if (!itemId || !sellerUuid || !price) {
        return res.json({ success: false, error: "缺少必要参数" });
      }
      const result = await auction.listItem({
        itemId,
        sellerUuid,
        price,
        quantity,
        itemSnapshot,
      });
      res.json(result);
    });
    app.post("/api/auction/item/delist", requireAuth, async (req, res) => {
      const { itemId, sellerUuid } = req.body;
      if (!itemId || !sellerUuid) {
        return res.json({ success: false, error: "缺少必要参数" });
      }
      const result = await auction.delistItem({ itemId, sellerUuid });
      res.json(result);
    });
    app.post("/api/auction/item/buy", requireAuth, async (req, res) => {
      const { itemId, buyerUuid, price, quantity } = req.body;
      if (!itemId || !buyerUuid || !price) {
        return res.json({ success: false, error: "缺少必要参数" });
      }
      const result = await auction.buyItem({
        itemId,
        buyerUuid,
        price,
        quantity,
      });
      res.json(result);
    });
    app.get("/api/auction/price/recommend", requireAuth, (req, res) => {
      const { itemType, nbt } = req.query;
      if (!itemType) return res.json({ success: false, error: "缺少itemType" });
      const recommendedPrice = auction.getRecommendedPrice(
        itemType,
        nbt ? JSON.parse(nbt) : null,
      );
      const priceRange = auction.getPriceRange(
        itemType,
        nbt ? JSON.parse(nbt) : null,
      );
      res.json({ success: true, recommendedPrice, priceRange });
    });
    app.get("/api/auction/stats", requireAuth, (req, res) => {
      const stats = auction.transactionManager.getStats();
      res.json({ success: true, stats });
    });
    app.post("/api/auction/guideline", requireAuth, (req, res) => {
      const { prices } = req.body;
      if (!prices || typeof prices !== "object") {
        return res.json({ success: false, error: "参数格式错误" });
      }
      auction.setGuidelinePrices(prices);
      res.json({ success: true });
    });
  }
  const AdmZip = require("adm-zip");
  const VERSION_FILE = path.join(__dirname, "..", "version.json");
  const UPDATE_DIR = path.join(__dirname, "..", "updates");
  const BACKUP_DIR = path.join(__dirname, "..", "backups");
  const DEPLOY_PACKAGES_DIR = path.join(__dirname, "..", "deploy-packages");
  let updateStatus = {
    inProgress: false,
    step: "idle",
    message: "",
    currentVersion: "1.0.0",
    targetVersion: null,
    maintenanceMode: false,
  };
  function loadVersion() {
    try {
      if (fs.existsSync(VERSION_FILE)) {
        const data = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
        updateStatus.currentVersion = data.version || "1.0.0";
      }
    } catch {}
  }
  loadVersion();
  function saveVersion(version) {
    updateStatus.currentVersion = version;
    fs.writeFileSync(
      VERSION_FILE,
      JSON.stringify({ version, updatedAt: new Date().toISOString() }, null, 2),
    );
  }
  function isPathSafe(targetPath, baseDir) {
    const resolved = path.resolve(targetPath);
    const resolvedBase = path.resolve(baseDir);
    return resolved.startsWith(resolvedBase);
  }
  function enterMaintenanceMode() {
    updateStatus.maintenanceMode = true;
    addLog("[更新系统] 进入维护模式，所有本地Bot将收到FORCE_SLEEP指令");
    for (const botNum of Object.keys(localBotLastSeen)) {
      failoverActive[botNum] = {
        active: true,
        reconnectLogged: false,
        sleepSent: false,
        maintenance: true,
      };
    }
  }
  function exitMaintenanceMode() {
    updateStatus.maintenanceMode = false;
    for (const botNum of Object.keys(failoverActive)) {
      if (failoverActive[botNum]?.maintenance) {
        failoverActive[botNum] = null;
      }
    }
    addLog("[更新系统] 退出维护模式，系统恢复正常");
  }
  app.get("/api/update/status", requireAuth, (req, res) => {
    res.json({ success: true, status: updateStatus });
  });
  app.get("/api/update/version", (req, res) => {
    res.json({ success: true, version: updateStatus.currentVersion });
  });
  app.post("/api/update/maintenance", requireAuth, (req, res) => {
    const { enabled } = req.body;
    if (enabled) {
      enterMaintenanceMode();
    } else {
      exitMaintenanceMode();
    }
    res.json({ success: true, maintenanceMode: updateStatus.maintenanceMode });
  });
  app.post(
    "/api/update/upload",
    requireAuth,
    upload.single("updateFile"),
    (req, res) => {
      if (!req.file) {
        return res.json({ success: false, error: "未上传文" });
      }
      updateStatus.inProgress = true;
      updateStatus.step = "uploading";
      updateStatus.message = "正在接收更新�?..";
      try {
        if (!fs.existsSync(UPDATE_DIR)) {
          fs.mkdirSync(UPDATE_DIR, { recursive: true });
        }
        const tempZipPath = path.join(UPDATE_DIR, `upload_${Date.now()}.zip`);
        fs.writeFileSync(tempZipPath, req.file.buffer);
        let zip;
        try {
          zip = new AdmZip(tempZipPath);
        } catch (e) {
          fs.unlinkSync(tempZipPath);
          updateStatus.inProgress = false;
          updateStatus.step = "idle";
          return res.json({
            success: false,
            error: "ZIP文件损坏: " + e.message,
          });
        }
        const entries = zip.getEntries();
        let hasCloudUpdate = false;
        let hasLocalUpdate = false;
        let versionInfo = null;
        for (const entry of entries) {
          if (
            entry.entryName === "cloud_update/" ||
            entry.entryName.startsWith("cloud_update/")
          ) {
            hasCloudUpdate = true;
          }
          if (
            entry.entryName === "local_update/" ||
            entry.entryName.startsWith("local_update/")
          ) {
            hasLocalUpdate = true;
          }
          if (
            entry.entryName === "version.json" ||
            entry.entryName.endsWith("/version.json")
          ) {
            try {
              versionInfo = JSON.parse(entry.getData().toString("utf8"));
            } catch {}
          }
        }
        if (!versionInfo || !versionInfo.version) {
          fs.unlinkSync(tempZipPath);
          updateStatus.inProgress = false;
          updateStatus.step = "idle";
          return res.json({ success: false, error: "更新包缺少version.json" });
        }
        updateStatus.targetVersion = versionInfo.version;
        for (const entry of entries) {
          const fullPath = path.join(UPDATE_DIR, entry.entryName);
          if (!isPathSafe(fullPath, UPDATE_DIR)) {
            fs.unlinkSync(tempZipPath);
            updateStatus.inProgress = false;
            updateStatus.step = "idle";
            return res.json({
              success: false,
              error: "检测到Zip Slip攻击，已拒绝",
            });
          }
        }
        const extractDir = path.join(
          UPDATE_DIR,
          `pending_${versionInfo.version}`,
        );
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });
        zip.extractAllTo(extractDir, true);
        fs.unlinkSync(tempZipPath);
        updateStatus.step = "uploaded";
        updateStatus.message = `更新包已验证，版�? ${versionInfo.version}`;
        updateStatus.inProgress = false;
        res.json({
          success: true,
          version: versionInfo.version,
          hasCloudUpdate,
          hasLocalUpdate,
          message: "更新包上传成功，请确认后执行更新",
        });
      } catch (err) {
        updateStatus.inProgress = false;
        updateStatus.step = "idle";
        updateStatus.message = "更新失败: " + err.message;
        res.json({ success: false, error: err.message });
      }
    },
  );
  app.post("/api/update/execute", requireAuth, async (req, res) => {
    if (updateStatus.inProgress) {
      return res.json({ success: false, error: "更新正在进行" });
    }
    if (!updateStatus.targetVersion) {
      return res.json({
        success: false,
        error: "没有待执行的更新，请先上传更新包",
      });
    }
    res.json({ success: true, message: "更新已启动，请查看状" });
    (async () => {
      try {
        updateStatus.inProgress = true;
        updateStatus.step = "maintenance";
        updateStatus.message = "进入维护模式...";
        enterMaintenanceMode();
        await new Promise((r) => setTimeout(r, 6000));
        updateStatus.step = "backup";
        updateStatus.message = "正在备份当前版本...";
        if (!fs.existsSync(BACKUP_DIR)) {
          fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        const backupPath = path.join(
          BACKUP_DIR,
          `backup_${updateStatus.currentVersion}_${Date.now()}`,
        );
        const baseDir = path.join(__dirname, "..");
        const filesToBackup = [
          "server.js",
          "index.js",
          "package.json",
          "routes/",
          "bots/",
          "public-desktop/",
        ];
        if (!fs.existsSync(backupPath)) {
          fs.mkdirSync(backupPath, { recursive: true });
        }
        for (const file of filesToBackup) {
          const src = path.join(baseDir, file);
          const dst = path.join(backupPath, file);
          if (fs.existsSync(src)) {
            const stat = fs.statSync(src);
            if (stat.isDirectory()) {
              fs.cpSync(src, dst, { recursive: true });
            } else {
              fs.copyFileSync(src, dst);
            }
          }
        }
        updateStatus.step = "updating";
        updateStatus.message = "正在更新云端服务...";
        const pendingDir = path.join(
          UPDATE_DIR,
          `pending_${updateStatus.targetVersion}`,
        );
        const cloudUpdateDir = path.join(pendingDir, "cloud_update");
        if (fs.existsSync(cloudUpdateDir)) {
          const cloudFiles = fs.readdirSync(cloudUpdateDir);
          for (const file of cloudFiles) {
            const src = path.join(cloudUpdateDir, file);
            const dst = path.join(baseDir, file);
            if (fs.existsSync(src)) {
              if (fs.statSync(src).isDirectory()) {
                fs.cpSync(src, dst, { recursive: true });
              } else {
                fs.copyFileSync(src, dst);
              }
            }
          }
        }
        saveVersion(updateStatus.targetVersion);
        updateStatus.step = "complete";
        updateStatus.message = `更新完成，版�? ${updateStatus.targetVersion}，即将重启服务`;
        addLog(
          `[更新系统] 更新完成，版本从 ${updateStatus.currentVersion} 升级�?${updateStatus.targetVersion}`,
        );
        setTimeout(() => {
          process.exit(0);
        }, 3000);
      } catch (err) {
        updateStatus.inProgress = false;
        updateStatus.step = "failed";
        updateStatus.message = "更新失败: " + err.message;
        addLog("[更新系统] 更新失败: " + err.message);
        exitMaintenanceMode();
      }
    })();
  });
  app.get("/api/update/local/download", (req, res) => {
    const { version } = req.query;
    const targetVersion = version || updateStatus.currentVersion;
    if (!fs.existsSync(DEPLOY_PACKAGES_DIR)) {
      fs.mkdirSync(DEPLOY_PACKAGES_DIR, { recursive: true });
    }
    const dateStr = new Date().toISOString().split("T")[0];
    const localZipPath = path.join(
      DEPLOY_PACKAGES_DIR,
      `${dateStr}_local_update_${targetVersion}.zip`,
    );
    const localUpdateDir = path.join(
      UPDATE_DIR,
      `pending_${targetVersion}`,
      "local_update",
    );
    if (fs.existsSync(localZipPath)) {
      res.download(localZipPath, `local_update_${targetVersion}.zip`);
      return;
    }
    if (fs.existsSync(localUpdateDir)) {
      try {
        const zip = new AdmZip();
        zip.addLocalFolder(localUpdateDir);
        zip.writeZip(localZipPath);
        res.download(localZipPath, `local_update_${targetVersion}.zip`);
      } catch (err) {
        res
          .status(500)
          .json({ success: false, error: "打包失败: " + err.message });
      }
      return;
    }
    res.status(404).json({ success: false, error: "本地更新包不存在" });
  });
  app.post("/api/update/rollback", requireAuth, (req, res) => {
    const backupDirs = fs.existsSync(BACKUP_DIR)
      ? fs
          .readdirSync(BACKUP_DIR)
          .filter((d) => d.startsWith("backup_"))
          .sort()
          .reverse()
      : [];
    if (backupDirs.length === 0) {
      return res.json({ success: false, error: "没有可用的备" });
    }
    const latestBackup = path.join(BACKUP_DIR, backupDirs[0]);
    const baseDir = path.join(__dirname, "..");
    try {
      const files = fs.readdirSync(latestBackup);
      for (const file of files) {
        const src = path.join(latestBackup, file);
        const dst = path.join(baseDir, file);
        if (fs.statSync(src).isDirectory()) {
          fs.cpSync(src, dst, { recursive: true });
        } else {
          fs.copyFileSync(src, dst);
        }
      }
      addLog("[更新系统] 回滚到上一版本成功");
      setTimeout(() => {
        process.exit(0);
      }, 2000);
      res.json({ success: true, message: "回滚成功，服务即将重" });
    } catch (err) {
      res.json({ success: false, error: "回滚失败: " + err.message });
    }
  });
  app.get("/api/update/backups", requireAuth, (req, res) => {
    const backupDirs = fs.existsSync(BACKUP_DIR)
      ? fs
          .readdirSync(BACKUP_DIR)
          .filter((d) => d.startsWith("backup_"))
          .sort()
          .reverse()
      : [];
    res.json({ success: true, backups: backupDirs });
  });
  let bugReportStatus = {};
  const BUG_REPORT_FILE = path.join(
    __dirname,
    "..",
    "data",
    "bug_reports.json",
  );
  const BUG_STATUS_FILE = path.join(__dirname, "..", "bug_status.json");
  const CLOSED_BUG_STATUSES = new Set([
    "resolved",
    "rejected",
    "done",
    "processed",
    "closed",
  ]);
  function readBugReports() {
    let reports = [];
    if (fs.existsSync(BUG_REPORT_FILE)) {
      try {
        reports = JSON.parse(fs.readFileSync(BUG_REPORT_FILE, "utf8"));
      } catch {}
    }
    return Array.isArray(reports) ? reports : [];
  }
  function withBugStatus(report) {
    const statusInfo = bugReportStatus[report.id] || {};
    return {
      ...report,
      status: statusInfo.status || "pending",
      statusUpdatedAt: statusInfo.updatedAt || null,
    };
  }
  function isBugReportOpen(report) {
    const status = String(
      (bugReportStatus[report.id] || {}).status || "pending",
    );
    return !CLOSED_BUG_STATUSES.has(status);
  }
  function formatBugExportLine(report, index) {
    const createdAt =
      report.createdAt ||
      (report.timestamp
        ? new Date(report.timestamp).toISOString()
        : "未知时间");
    return [
      "#" + (index + 1) + " " + (report.id || "无ID"),
      "玩家: " + (report.sender || "未知"),
      "时间: " + createdAt,
      "位置: " + (report.position || "未知"),
      "状态: " + ((bugReportStatus[report.id] || {}).status || "pending"),
      "反馈: " + String(report.description || "").replace(/\r?\n/g, " "),
    ].join("\n");
  }
  function queueBugThanksMessage(report) {
    const playerName = String(report?.sender || "").trim();
    if (!/^[A-Za-z0-9_]{1,16}$/.test(playerName)) {
      addLog("[Bug追踪] 反馈玩家名不可私聊，已跳过感谢消息: " + playerName);
      return false;
    }
    mainBotControlTasks.push({
      id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      action: "sendMessage",
      playerName,
      message: "感谢你的反馈，Bug 报告已处理。（反馈）",
      createdAt: new Date().toISOString(),
    });
    while (mainBotControlTasks.length > 50) mainBotControlTasks.shift();
    addLog("[Bug追踪] 已加入感谢私聊任务: " + playerName);
    return true;
  }
  function loadBugStatus() {
    try {
      if (fs.existsSync(BUG_STATUS_FILE)) {
        bugReportStatus = JSON.parse(fs.readFileSync(BUG_STATUS_FILE, "utf8"));
      }
    } catch {}
  }
  loadBugStatus();
  function saveBugStatus() {
    fs.writeFileSync(BUG_STATUS_FILE, JSON.stringify(bugReportStatus, null, 2));
  }
  app.get("/api/admin/bug-reports/export.txt", requireAuth, (req, res) => {
    const openReports = readBugReports().filter(isBugReportOpen).reverse();
    const lines = [
      "Bug 反馈导出（仅未处理）",
      "导出时间: " + new Date().toISOString(),
      "未处理数量: " + openReports.length,
      "",
    ];
    if (openReports.length === 0) {
      lines.push("暂无未处理反馈。");
    } else {
      lines.push(openReports.map(formatBugExportLine).join("\n\n"));
    }
    const filename =
      "bug-reports-" + new Date().toISOString().slice(0, 10) + ".txt";
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="' + filename + '"',
    );
    res.send(lines.join("\n"));
  });
  app.post("/api/admin/bug-reports/:id/status", requireAuth, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.json({ success: false, error: "缺少状态参数" });
    const reports = readBugReports();
    const report = reports.find((item) => item.id === id);
    const previousStatus = bugReportStatus[id]?.status || "pending";
    bugReportStatus[id] = { status, updatedAt: new Date().toISOString() };
    saveBugStatus();
    let thanksQueued = false;
    if (
      !CLOSED_BUG_STATUSES.has(previousStatus) &&
      ["resolved", "done", "processed", "closed"].includes(String(status))
    ) {
      thanksQueued = queueBugThanksMessage(report);
    }
    addLog("[Bug追踪] 更新报告 " + id + " 状态为: " + status);
    res.json({ success: true, status: bugReportStatus[id], thanksQueued });
  });
  app.get("/api/admin/bot/failover-status", requireAuth, (req, res) => {
    const result = {};
    for (const [botNum, info] of Object.entries(failoverActive)) {
      if (info) {
        result[botNum] = {
          active: info.active,
          maintenance: info.maintenance || false,
          lastSeen: localBotLastSeen[botNum] || null,
          lastSeenAgo: localBotLastSeen[botNum]
            ? Date.now() - localBotLastSeen[botNum]
            : null,
        };
      }
    }
    const botList = [];
    const allBotNums = new Set([
      ...Object.keys(localBotLastSeen),
      ...Object.keys(failoverActive),
    ]);
    for (const botNum of allBotNums) {
      const lastSeen = localBotLastSeen[botNum];
      const ago = lastSeen ? Date.now() - lastSeen : null;
      const failover = failoverActive[botNum];
      const isOnline = ago !== null && ago < 10000;
      botList.push({
        botNum: parseInt(botNum),
        status: failover?.active ? "failover" : isOnline ? "online" : "offline",
        lastSeen,
        lastSeenAgo: ago,
        failoverActive: failover?.active || false,
        maintenanceMode: failover?.maintenance || false,
        reconnectLogged: failover?.reconnectLogged || false,
        sleepSent: failover?.sleepSent || false,
        manualTrigger: failover?.manual || false,
        location: failover?.maintenance
          ? "cloud"
          : isOnline
            ? "local"
            : "unknown",
      });
    }
    res.json({
      success: true,
      failover: result,
      localBotLastSeen,
      totalBots: Object.keys(localBotLastSeen).length,
      botList: botList.sort((a, b) => a.botNum - b.botNum),
    });
  });
  app.post("/api/admin/bot/:botNum/force-sleep", requireAuth, (req, res) => {
    const botNum = req.params.botNum;
    failoverActive[botNum] = {
      active: true,
      reconnectLogged: false,
      sleepSent: false,
      manual: true,
    };
    addLog(`[手动操作] 强制Bot #${botNum} 进入休眠状态`);
    res.json({ success: true });
  });
  app.post(
    "/api/admin/bot/:botNum/trigger-failover",
    requireAuth,
    (req, res) => {
      const botNum = req.params.botNum;
      failoverActive[botNum] = {
        active: true,
        reconnectLogged: false,
        sleepSent: false,
        manual: true,
      };
      addLog(`[手动操作] 触发Bot #${botNum} 故障转移`);
      res.json({ success: true });
    },
  );
  function runConfiguredScan(source = "auto") {
    if (!_mainBotProcess) {
      addLog(
        "\u005b\u81ea\u52a8\u626b\u63cf\u005d \u4e3bBot\u672a\u8fd0\u884c\uff0c\u8df3\u8fc7\u6bcf\u65e5\u626b\u63cf",
        "warn",
      );
      setSystemStatus({
        scanning: false,
        scanMessage:
          "\u81ea\u52a8\u626b\u63cf\u8df3\u8fc7\uff1a\u4e3bBot\u672a\u8fd0\u884c",
      });
      return false;
    }
    if (
      _mainBotState.task &&
      String(_mainBotState.task).includes("\u626b\u63cf")
    ) {
      addLog(
        "\u005b\u81ea\u52a8\u626b\u63cf\u005d \u5f53\u524d\u5df2\u6709\u626b\u63cf\u4efb\u52a1\uff0c\u8df3\u8fc7\u91cd\u590d\u89e6\u53d1",
        "warn",
      );
      return false;
    }
    const enabledAreas = (warehouse.scanAreas || []).filter((a) => a.enabled);
    _scanItems = {};
    _mainBotState.task =
      source === "auto"
        ? "\u6bcf\u65e5 00:00 \u81ea\u52a8\u626b\u63cf\u4ed3\u5e93..."
        : "\u6b63\u5728\u626b\u63cf\u4ed3\u5e93...";
    setSystemStatus({
      scanning: true,
      scanMessage:
        source === "auto"
          ? "\u6bcf\u65e5\u81ea\u52a8\u626b\u63cf\u8fdb\u884c\u4e2d\uff0c\u5e93\u5b58\u6b63\u5728\u5237\u65b0"
          : "\u6b63\u5728\u626b\u63cf\u4ed3\u5e93\uff0c\u5e93\u5b58\u6b63\u5728\u5237\u65b0",
      scanStartedAt: new Date().toISOString(),
    });
    adminIO.emit("mainBotState", _mainBotState);
    addLog(
      source === "auto"
        ? "\u005b\u81ea\u52a8\u626b\u63cf\u005d \u6bcf\u65e5 00:00 \u81ea\u52a8\u626b\u63cf\u5df2\u542f\u52a8"
        : "\u5f00\u59cb\u626b\u63cf\u4ed3\u5e93",
    );
    _mainBotProcess.send({ type: "scanWarehouse", scanAreas: enabledAreas });
    return true;
  }
  function msUntilNextDailyScan() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(1000, next.getTime() - now.getTime());
  }
  function scheduleDailyWarehouseScan() {
    const delay = msUntilNextDailyScan();
    addLog(
      "\u005b\u81ea\u52a8\u626b\u63cf\u005d \u4e0b\u4e00\u6b21\u6bcf\u65e5\u626b\u63cf\u5c06\u5728 " +
        new Date(Date.now() + delay).toLocaleString("zh-CN") +
        " \u89e6\u53d1",
    );
    setTimeout(() => {
      try {
        runConfiguredScan("auto");
      } catch (err) {
        addLog(
          "\u005b\u81ea\u52a8\u626b\u63cf\u005d \u89e6\u53d1\u5931\u8d25: " +
            err.message,
          "error",
        );
      }
      scheduleDailyWarehouseScan();
    }, delay);
  }
  scheduleDailyWarehouseScan();
  broadcastSystemStatus();
};
