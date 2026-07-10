const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

module.exports = function registerUpdateManager(app, ctx) {
    const {
        requireAuth,
        requireTransportAuth,
        addLog,
        maintenanceState = {},
        setSystemStatus = () => {},
        broadcastSystemStatus = () => {}
    } = ctx;
    const BASE_DIR = path.join(__dirname, '..');
    const VERSION_FILE = path.join(BASE_DIR, 'version.json');
    const UPDATE_DIR = path.join(BASE_DIR, 'updates');
    const BACKUP_DIR = path.join(BASE_DIR, 'backups');
    const DEPLOY_PACKAGES_DIR = path.join(BASE_DIR, 'deploy-packages');
    const LOCAL_BASE_DIR = path.join(BASE_DIR, 'core', 'transport');
    const MANIFEST_FILE = path.join(UPDATE_DIR, 'pending_manifest.json');
    const RUNTIME_STATE_FILE = path.join(UPDATE_DIR, 'update_runtime_state.json');
    const UPDATE_PASSWORD_FILE = path.join(BASE_DIR, 'update_password.txt');
    const ADMIN_PASSWORD_FILE = path.join(BASE_DIR, 'admin_password.txt');
    const SECRET_KEY_FILE = path.join(BASE_DIR, 'secret_key.txt');

    let updateStatus = {
        inProgress: false,
        step: 'idle',
        progress: 0,
        message: '',
        currentVersion: loadVersion(),
        targetVersion: null,
        maintenanceMode: false,
        localPackageReady: false,
        restartRequired: false,
        manifest: null
    };

    function ensureDir(dir) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    function readJson(filePath, fallback = null) {
        try {
            if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {}
        return fallback;
    }

    function writeJson(filePath, data) {
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    function randomSecret() {
        return crypto.randomBytes(32).toString('base64url');
    }

    function writeSecretFile(filePath, value) {
        fs.writeFileSync(filePath, value + '\n', { mode: 0o600 });
        try { fs.chmodSync(filePath, 0o600); } catch {}
    }

    function loadOrCreateUpdatePassword() {
        try {
            if (fs.existsSync(UPDATE_PASSWORD_FILE)) {
                const password = fs.readFileSync(UPDATE_PASSWORD_FILE, 'utf8').trim();
                if (password) {
                    try { fs.chmodSync(UPDATE_PASSWORD_FILE, 0o600); } catch {}
                    return password;
                }
            }
        } catch {}
        const password = randomSecret();
        writeSecretFile(UPDATE_PASSWORD_FILE, password);
        addLog('[安全] 已生成独立更新密码：只能在服务器 cat update_password.txt 获取');
        return password;
    }

    function safeEqual(a, b) {
        const left = Buffer.from(String(a || ''));
        const right = Buffer.from(String(b || ''));
        return left.length === right.length && crypto.timingSafeEqual(left, right);
    }

    function requireUpdatePassword(req, res, next) {
        const provided = req.headers['x-update-password'] || req.body?.updatePassword || req.query?.updatePassword || '';
        if (!safeEqual(provided, loadOrCreateUpdatePassword())) {
            return res.status(403).json({ success: false, error: '更新密码错误，请在服务器 cat update_password.txt 获取最新密码' });
        }
        next();
    }

    function rotateRuntimeSecrets(reason) {
        writeSecretFile(UPDATE_PASSWORD_FILE, randomSecret());
        writeSecretFile(ADMIN_PASSWORD_FILE, randomSecret());
        writeSecretFile(SECRET_KEY_FILE, crypto.randomBytes(32).toString('hex'));
        addLog(`[安全] ${reason}：已轮换后台密码、更新密码和 JWT 密钥；新密码只能在服务器 cat 对应文件获取`);
    }

    loadOrCreateUpdatePassword();

    function loadVersion() {
        return readJson(VERSION_FILE, { version: '1.0.0' })?.version || '1.0.0';
    }

    function saveVersion(version) {
        writeJson(VERSION_FILE, { version, updatedAt: new Date().toISOString() });
        updateStatus.currentVersion = version;
    }

    function getStepProgress(step) {
        return {
            idle: 0,
            uploading: 18,
            uploaded: 32,
            maintenance: 45,
            backup: 58,
            local_package: 78,
            complete: 100,
            recovered: 100,
            rolled_back: 100,
            failed: 100
        }[step] ?? 0;
    }

    function setUpdateStep(step, message, progress = null) {
        updateStatus.step = step;
        if (message !== undefined) updateStatus.message = message;
        updateStatus.progress = progress ?? getStepProgress(step);
    }

    function sha256Buffer(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    function sha256File(filePath) {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return null;
        return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    }

    function normalizeEntryName(entryName) {
        return String(entryName || '').replace(/\\/g, '/').replace(/^\/+/, '');
    }

    function safeJoin(baseDir, relativePath) {
        const target = path.resolve(baseDir, relativePath);
        const base = path.resolve(baseDir);
        if (target !== base && !target.startsWith(base + path.sep)) return null;
        return target;
    }

    function compareVersions(leftVersion, rightVersion) {
        const left = String(leftVersion || '0').split('.').map(Number);
        const right = String(rightVersion || '0').split('.').map(Number);
        for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
            const leftPart = Number.isFinite(left[index]) ? left[index] : 0;
            const rightPart = Number.isFinite(right[index]) ? right[index] : 0;
            if (leftPart > rightPart) return 1;
            if (leftPart < rightPart) return -1;
        }
        return 0;
    }

    function pendingDir(version) {
        return path.join(UPDATE_DIR, `pending_${version}`);
    }

    function loadPendingManifest() {
        return readJson(MANIFEST_FILE, null);
    }

    function loadRuntimeState() {
        return readJson(RUNTIME_STATE_FILE, null);
    }

    function saveRuntimeState(state) {
        writeJson(RUNTIME_STATE_FILE, {
            ...state,
            updatedAt: new Date().toISOString()
        });
    }

    function isDeniedCloudPath(relativePath) {
        const normalized = normalizeEntryName(relativePath).toLowerCase();
        return normalized.startsWith('data/')
            || normalized.startsWith('node_modules/')
            || normalized.startsWith('backups/')
            || normalized.startsWith('updates/')
            || normalized === 'secret_key.txt'
            || normalized === 'admin_password.txt'
            || normalized === '.env';
    }

    function zipEntriesToPackage(zip, prefix) {
        const packageZip = new AdmZip();
        for (const entry of zip.getEntries()) {
            const entryName = normalizeEntryName(entry.entryName);
            if (!entryName.startsWith(prefix + '/') || entry.isDirectory) continue;
            const relative = entryName.slice(prefix.length + 1);
            if (!relative) continue;
            packageZip.addFile(relative, entry.getData());
        }
        return packageZip;
    }

    function parseOuterPackage(buffer) {
        const outerZip = new AdmZip(buffer);
        const entries = outerZip.getEntries();
        const manifestEntry = entries.find(entry => normalizeEntryName(entry.entryName) === 'manifest.json')
            || entries.find(entry => normalizeEntryName(entry.entryName) === 'version.json');

        if (!manifestEntry) {
            throw new Error('外层更新包缺少 manifest.json');
        }

        let manifest;
        try {
            manifest = JSON.parse(manifestEntry.getData().toString('utf8').replace(/^\uFEFF/, ''));
        } catch {
            throw new Error('manifest.json 不是合法 JSON');
        }

        const version = manifest.version;
        if (!version) throw new Error('manifest.json 缺少 version 字段');

        const cloudZipEntry = entries.find(entry => normalizeEntryName(entry.entryName) === 'cloud_update.zip');
        const localZipEntry = entries.find(entry => normalizeEntryName(entry.entryName) === 'local_update.zip');

        const cloudZip = cloudZipEntry
            ? new AdmZip(cloudZipEntry.getData())
            : zipEntriesToPackage(outerZip, 'cloud_update');
        const localZip = localZipEntry
            ? new AdmZip(localZipEntry.getData())
            : zipEntriesToPackage(outerZip, 'local_update');

        const hasCloudUpdate = cloudZip.getEntries().some(entry => !entry.isDirectory);
        const hasLocalUpdate = localZip.getEntries().some(entry => !entry.isDirectory);
        if (!hasCloudUpdate && !hasLocalUpdate) {
            throw new Error('更新包必须包含 cloud_update.zip 或 local_update.zip');
        }

        return { manifest, cloudZip, localZip, hasCloudUpdate, hasLocalUpdate };
    }

    function analyzePackage(packageZip, baseDir, deniedPathChecker = null) {
        const files = [];
        const warnings = [];
        let compatible = true;

        for (const entry of packageZip.getEntries()) {
            const relative = normalizeEntryName(entry.entryName);
            if (!relative || entry.isDirectory) continue;
            if (relative.includes('..')) {
                compatible = false;
                warnings.push(`拒绝不安全路径: ${relative}`);
                continue;
            }
            if (deniedPathChecker?.(relative)) {
                compatible = false;
                warnings.push(`禁止覆盖敏感路径: ${relative}`);
                continue;
            }
            const target = safeJoin(baseDir, relative);
            if (!target) {
                compatible = false;
                warnings.push(`路径越界: ${relative}`);
                continue;
            }
            const nextHash = sha256Buffer(entry.getData());
            const currentHash = sha256File(target);
            files.push({
                path: relative,
                action: currentHash ? (currentHash === nextHash ? 'same' : 'update') : 'create',
                currentHash,
                nextHash,
                size: entry.header.size
            });
        }

        return { compatible, warnings, files };
    }

    function buildAnalysis(parsedPackage) {
        const currentVersion = loadVersion();
        const cloud = analyzePackage(parsedPackage.cloudZip, BASE_DIR, isDeniedCloudPath);
        const local = analyzePackage(parsedPackage.localZip, LOCAL_BASE_DIR);
        const warnings = [...(parsedPackage.manifest.warnings || []), ...cloud.warnings, ...local.warnings];

        if (compareVersions(parsedPackage.manifest.version, currentVersion) <= 0) {
            warnings.push(`更新版本 ${parsedPackage.manifest.version} 不高于当前版本 ${currentVersion}`);
        }

        const manifest = {
            schema: 'outer-update-v1',
            version: parsedPackage.manifest.version,
            currentVersion,
            uploadedAt: new Date().toISOString(),
            compatible: warnings.length === 0 && cloud.compatible && local.compatible,
            warnings,
            hasCloudUpdate: parsedPackage.hasCloudUpdate,
            hasLocalUpdate: parsedPackage.hasLocalUpdate,
            cloud: cloud.files,
            local: local.files,
            cloudChanged: cloud.files.filter(file => file.action !== 'same').length,
            localChanged: local.files.filter(file => file.action !== 'same').length
        };

        manifest.requiresRestart = manifest.cloud.some(file => file.action !== 'same' && (
            file.path.endsWith('.js')
            || file.path === 'package.json'
            || file.path === 'package-lock.json'
            || file.path.startsWith('routes/')
            || file.path.startsWith('services/')
            || file.path.startsWith('core/')
        ));

        return manifest;
    }

    function savePendingPackages(parsedPackage, manifest) {
        const dir = pendingDir(manifest.version);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
        ensureDir(dir);
        parsedPackage.cloudZip.writeZip(path.join(dir, 'cloud_update.zip'));
        parsedPackage.localZip.writeZip(path.join(dir, 'local_update.zip'));
        parsedPackage.cloudZip.extractAllTo(path.join(dir, 'cloud_update'), true);
        parsedPackage.localZip.extractAllTo(path.join(dir, 'local_update'), true);
        writeJson(MANIFEST_FILE, manifest);
    }

    function backupCloudFiles(files) {
        ensureDir(BACKUP_DIR);
        const backupPath = path.join(BACKUP_DIR, `backup_${updateStatus.currentVersion}_${Date.now()}`);
        ensureDir(backupPath);
        const backupFiles = [];

        for (const file of files) {
            const source = safeJoin(BASE_DIR, file.path);
            if (!source) continue;
            const existed = fs.existsSync(source);
            backupFiles.push({ path: file.path, existed });
            if (!existed) continue;
            const target = safeJoin(backupPath, file.path);
            if (!target) continue;
            ensureDir(path.dirname(target));
            fs.copyFileSync(source, target);
        }

        writeJson(path.join(backupPath, 'backup_manifest.json'), {
            fromVersion: updateStatus.currentVersion,
            createdAt: new Date().toISOString(),
            files: backupFiles
        });

        return backupPath;
    }

    function rollbackCloudFiles(backupPath) {
        const backupManifest = readJson(path.join(backupPath, 'backup_manifest.json'), { files: [] });
        for (const fileEntry of backupManifest.files || []) {
            const filePath = typeof fileEntry === 'string' ? fileEntry : fileEntry.path;
            const existed = typeof fileEntry === 'string' ? true : fileEntry.existed;
            const source = safeJoin(backupPath, filePath);
            const target = safeJoin(BASE_DIR, filePath);
            if (!target) continue;
            if (!existed) {
                if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
                continue;
            }
            if (!source || !fs.existsSync(source)) continue;
            ensureDir(path.dirname(target));
            fs.copyFileSync(source, target);
        }
    }

    function enterMaintenance(manifest) {
        maintenanceState.enabled = true;
        maintenanceState.phase = 'draining';
        maintenanceState.targetVersion = manifest.version;
        maintenanceState.startedAt = Date.now();
        maintenanceState.blockNewTasks = true;
        maintenanceState.localPackageReady = false;
        maintenanceState.localSleepQueue = {};
        updateStatus.maintenanceMode = true;
        saveRuntimeState({
            active: true,
            phase: 'draining',
            targetVersion: manifest.version,
            startedAt: maintenanceState.startedAt
        });
        addLog(`[更新系统] 进入维护模式，目标版本 ${manifest.version}`);
        setSystemStatus({ maintenance: true, maintenancePhase: maintenanceState.phase });
    }

    function markLocalPackageReady(manifest) {
        maintenanceState.localPackageReady = manifest.hasLocalUpdate;
        maintenanceState.phase = manifest.hasLocalUpdate ? 'local_ready' : 'cloud_complete';
        updateStatus.localPackageReady = manifest.hasLocalUpdate;
        saveRuntimeState({
            ...(loadRuntimeState() || {}),
            active: true,
            phase: maintenanceState.phase,
            targetVersion: manifest.version,
            localPackageReady: manifest.hasLocalUpdate
        });
    }

    function exitMaintenance() {
        maintenanceState.enabled = false;
        maintenanceState.phase = 'idle';
        maintenanceState.blockNewTasks = false;
        maintenanceState.targetVersion = null;
        maintenanceState.localPackageReady = false;
        maintenanceState.localSleepQueue = {};
        updateStatus.maintenanceMode = false;
        saveRuntimeState({ active: false, phase: 'idle' });
        addLog('[更新系统] 退出维护模式');
        setSystemStatus({ maintenance: false, maintenancePhase: 'idle' });
    }

    function scheduleRestartIfNeeded(manifest) {
        if (!manifest.requiresRestart) return;
        updateStatus.restartRequired = true;

        if (process.env.UPDATE_AUTO_RESTART === '0') {
            updateStatus.message += '；检测到服务端代码变更，请手动重启 node server.js';
            return;
        }

        updateStatus.message += process.env.pm_id !== undefined
            ? '；检测到服务端代码变更，将退出并由 PM2 自动拉起'
            : '；检测到服务端代码变更，将自动重启 node server.js';

        if (process.env.pm_id !== undefined) {
            setTimeout(() => process.exit(0), 1200);
            return;
        }

        const restartScript = `
            const { spawn } = require('child_process');
            setTimeout(() => {
                const child = spawn(process.execPath, ['server.js'], {
                    cwd: ${JSON.stringify(BASE_DIR)},
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
            }, 1800);
        `;
        const child = spawn(process.execPath, ['-e', restartScript], {
            cwd: BASE_DIR,
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        setTimeout(() => process.exit(0), 500);
    }

    function applyCloudUpdate(manifest) {
        const changedFiles = manifest.cloud.filter(file => file.action !== 'same');
        const backupPath = backupCloudFiles(changedFiles);
        const cloudDir = path.join(pendingDir(manifest.version), 'cloud_update');

        try {
            for (const file of changedFiles) {
                const source = safeJoin(cloudDir, file.path);
                const target = safeJoin(BASE_DIR, file.path);
                if (!source || !target || !fs.existsSync(source)) continue;
                const actualHash = sha256File(source);
                if (file.nextHash && file.nextHash !== actualHash) {
                    throw new Error(`云端文件哈希不匹配: ${file.path}`);
                }
                ensureDir(path.dirname(target));
                fs.copyFileSync(source, target);
            }
            saveVersion(manifest.version);
            return { backupPath };
        } catch (error) {
            rollbackCloudFiles(backupPath);
            throw error;
        }
    }

    function buildLocalDownloadPackage(manifest) {
        ensureDir(DEPLOY_PACKAGES_DIR);
        const zipPath = path.join(DEPLOY_PACKAGES_DIR, `local_update_${manifest.version}.zip`);
        const sourceZipPath = path.join(pendingDir(manifest.version), 'local_update.zip');
        const outputZip = new AdmZip(sourceZipPath);
        outputZip.addFile('update_manifest.json', Buffer.from(JSON.stringify({
            version: manifest.version,
            files: manifest.local.filter(file => file.action !== 'same')
        }, null, 2)));
        outputZip.writeZip(zipPath);
        return zipPath;
    }

    function recoverInterruptedUpdate() {
        const runtimeState = loadRuntimeState();
        if (!runtimeState?.active) return;

        const manifest = loadPendingManifest();
        try {
            if (manifest && runtimeState.targetVersion === manifest.version && loadVersion() === manifest.version) {
                if (manifest.hasLocalUpdate) buildLocalDownloadPackage(manifest);
                maintenanceState.enabled = false;
                maintenanceState.phase = 'idle';
                maintenanceState.blockNewTasks = false;
                maintenanceState.targetVersion = null;
                maintenanceState.localPackageReady = false;
                maintenanceState.localSleepQueue = {};
                setUpdateStep('recovered', `检测到上次更新已写入 ${manifest.version}，已补齐本地更新包并退出维护模式`);
                updateStatus.currentVersion = manifest.version;
                updateStatus.localPackageReady = manifest.hasLocalUpdate;
                saveRuntimeState({ active: false, phase: 'recovered', targetVersion: manifest.version });
                addLog(`[更新系统] ${updateStatus.message}`);
                return;
            }

            if (runtimeState.backupPath && fs.existsSync(runtimeState.backupPath)) {
                rollbackCloudFiles(runtimeState.backupPath);
                setUpdateStep('rolled_back', '检测到上次更新中断，已自动回滚云端文件');
                saveRuntimeState({ active: false, phase: 'rolled_back', targetVersion: runtimeState.targetVersion });
                addLog(`[更新系统] ${updateStatus.message}`, 'error');
                return;
            }

            setUpdateStep('failed', '检测到上次更新中断，但没有可用备份；已退出维护模式，请人工检查');
            saveRuntimeState({ active: false, phase: 'needs_manual_check', targetVersion: runtimeState.targetVersion });
            addLog(`[更新系统] ${updateStatus.message}`, 'error');
        } catch (error) {
            setUpdateStep('failed', `更新中断恢复失败: ${error.message}`);
            addLog(`[更新系统] ${updateStatus.message}`, 'error');
        } finally {
            maintenanceState.enabled = false;
            maintenanceState.phase = 'idle';
            maintenanceState.blockNewTasks = false;
            maintenanceState.targetVersion = null;
            maintenanceState.localSleepQueue = {};
            updateStatus.maintenanceMode = false;
        }
    }

    recoverInterruptedUpdate();

    app.get('/api/update/status', requireAuth, (req, res) => {
        updateStatus.currentVersion = loadVersion();
        updateStatus.manifest = loadPendingManifest();
        updateStatus.maintenanceMode = Boolean(maintenanceState.enabled);
        updateStatus.progress = Number.isFinite(Number(updateStatus.progress))
            ? Math.max(updateStatus.progress, getStepProgress(updateStatus.step))
            : getStepProgress(updateStatus.step);
        updateStatus.localPackageReady = Boolean(
            maintenanceState.localPackageReady
            || (updateStatus.manifest?.hasLocalUpdate && fs.existsSync(path.join(DEPLOY_PACKAGES_DIR, `local_update_${updateStatus.manifest.version}.zip`)))
        );
        res.json({ success: true, status: updateStatus, maintenance: maintenanceState });
    });

    app.get('/api/update/version', (req, res) => {
        const manifest = loadPendingManifest();
        const localZipReady = Boolean(
            manifest?.hasLocalUpdate
            && fs.existsSync(path.join(DEPLOY_PACKAGES_DIR, `local_update_${manifest.version}.zip`))
        );
        res.json({
            success: true,
            version: loadVersion(),
            localVersion: manifest?.version || loadVersion(),
            localPackageReady: Boolean(maintenanceState.localPackageReady || localZipReady),
            manifest
        });
    });

    app.get('/api/update/manifest', requireAuth, (req, res) => {
        const manifest = loadPendingManifest();
        res.json({ success: Boolean(manifest), manifest, error: manifest ? undefined : '没有待执行更新' });
    });

    app.post('/api/update/maintenance', requireAuth, requireUpdatePassword, (req, res) => {
        if (req.body.enabled) {
            maintenanceState.enabled = true;
            maintenanceState.phase = 'manual';
            maintenanceState.blockNewTasks = true;
            updateStatus.maintenanceMode = true;
            setSystemStatus({ maintenance: true, maintenancePhase: 'manual' });
        } else {
            exitMaintenance();
        }
        broadcastSystemStatus();
        res.json({ success: true, maintenanceMode: Boolean(maintenanceState.enabled), maintenance: maintenanceState });
    });

    app.post('/api/update/upload', requireAuth, requireUpdatePassword, upload.single('updateFile'), (req, res) => {
        if (!req.file) return res.json({ success: false, error: '未上传文件' });

        updateStatus.inProgress = true;
        setUpdateStep('uploading', '正在校验外层更新包');

        try {
            ensureDir(UPDATE_DIR);
            const parsedPackage = parseOuterPackage(req.file.buffer);
            const manifest = buildAnalysis(parsedPackage);

            if (!manifest.compatible) {
                updateStatus.inProgress = false;
                setUpdateStep('failed', '更新包兼容性检查失败');
                return res.json({ success: false, error: manifest.warnings.join('；'), manifest });
            }

            savePendingPackages(parsedPackage, manifest);
            updateStatus.inProgress = false;
            setUpdateStep('uploaded', `更新包已通过校验，目标版本 ${manifest.version}`);
            updateStatus.targetVersion = manifest.version;
            updateStatus.manifest = manifest;
            updateStatus.restartRequired = manifest.requiresRestart;

            res.json({
                success: true,
                version: manifest.version,
                hasCloudUpdate: manifest.hasCloudUpdate,
                hasLocalUpdate: manifest.hasLocalUpdate,
                cloudChanged: manifest.cloudChanged,
                localChanged: manifest.localChanged,
                manifest,
                message: updateStatus.message
            });
        } catch (error) {
            updateStatus.inProgress = false;
            setUpdateStep('failed', `上传失败: ${error.message}`);
            res.json({ success: false, error: error.message });
        }
    });

    app.post('/api/update/execute', requireAuth, requireUpdatePassword, (req, res) => {
        const manifest = loadPendingManifest();
        if (!manifest) return res.json({ success: false, error: '没有待执行更新，请先上传更新包' });
        if (updateStatus.inProgress) return res.json({ success: false, error: '更新正在进行' });

        res.json({ success: true, message: '云端优先更新已开始，维护模式已开启' });

        setImmediate(() => {
            let backupPath = null;
            try {
                updateStatus.inProgress = true;
                setUpdateStep('maintenance', '维护模式：空闲本地 Bot 将休眠，忙碌 Bot 只允许完成当前任务');
                enterMaintenance(manifest);
                saveRuntimeState({
                    ...(loadRuntimeState() || {}),
                    active: true,
                    phase: 'backup',
                    targetVersion: manifest.version
                });

                setUpdateStep('backup', '正在备份云端变更文件');
                const applyResult = applyCloudUpdate(manifest);
                backupPath = applyResult.backupPath;
                saveRuntimeState({
                    ...(loadRuntimeState() || {}),
                    active: true,
                    phase: 'local_package',
                    targetVersion: manifest.version,
                    backupPath
                });
                addLog(`[更新系统] 云端备份完成: ${backupPath}`);

                setUpdateStep('local_package', '正在生成本地更新下载包');
                if (manifest.hasLocalUpdate) buildLocalDownloadPackage(manifest);
                markLocalPackageReady(manifest);

                updateStatus.inProgress = false;
                setUpdateStep('complete', manifest.hasLocalUpdate
                    ? `云端已更新到 ${manifest.version}，本地更新包已开放下载`
                    : `云端已更新到 ${manifest.version}`);
                updateStatus.currentVersion = manifest.version;
                addLog(`[更新系统] 云端先更完成: ${manifest.currentVersion} -> ${manifest.version}`);

                exitMaintenance();
                rotateRuntimeSecrets(`更新完成 ${manifest.currentVersion} -> ${manifest.version}`);
                scheduleRestartIfNeeded(manifest);
            } catch (error) {
                updateStatus.inProgress = false;
                setUpdateStep('failed', `云端更新失败，已尝试回滚: ${error.message}`);
                exitMaintenance();
                addLog(`[更新系统] 云端更新失败: ${error.message}`, 'error');
            }
        });
    });

    app.get('/api/update/local/manifest', requireTransportAuth, (req, res) => {
        const manifest = loadPendingManifest();
        if (!manifest?.hasLocalUpdate) {
            return res.status(404).json({ success: false, error: '本地更新包不存在' });
        }
        res.json({
            success: true,
            version: manifest.version,
            ready: Boolean(maintenanceState.localPackageReady || fs.existsSync(path.join(DEPLOY_PACKAGES_DIR, `local_update_${manifest.version}.zip`))),
            files: manifest.local.filter(file => file.action !== 'same')
        });
    });

    app.get('/api/update/local/download', requireTransportAuth, (req, res) => {
        const manifest = loadPendingManifest();
        const targetVersion = req.query.version || manifest?.version;
        if (!manifest?.hasLocalUpdate || targetVersion !== manifest.version) {
            return res.status(404).json({ success: false, error: '本地更新包不存在' });
        }

        const zipPath = path.join(DEPLOY_PACKAGES_DIR, `local_update_${manifest.version}.zip`);
        if (!maintenanceState.localPackageReady && !fs.existsSync(zipPath)) {
            return res.status(409).json({ success: false, error: '本地更新包尚未开放下载，请等待云端更新完成' });
        }
        if (!fs.existsSync(zipPath)) buildLocalDownloadPackage(manifest);
        res.download(zipPath, `local_update_${manifest.version}.zip`);
    });

    app.get('/api/update/backups', requireAuth, requireUpdatePassword, (req, res) => {
        const backups = fs.existsSync(BACKUP_DIR)
            ? fs.readdirSync(BACKUP_DIR).filter(name => name.startsWith('backup_')).sort().reverse().map(name => {
                const parts = name.split('_');
                return { version: parts[1] || name, name, timestamp: Number(parts[2]) || 0 };
            })
            : [];
        res.json({ success: true, backups });
    });

    app.post('/api/update/rollback', requireAuth, requireUpdatePassword, (req, res) => {
        const name = req.body.name || req.body.version;
        const backups = fs.existsSync(BACKUP_DIR)
            ? fs.readdirSync(BACKUP_DIR).filter(entry => entry.startsWith('backup_')).sort().reverse()
            : [];
        const selected = name && backups.includes(name) ? name : backups[0];
        if (!selected) return res.json({ success: false, error: '没有可用备份' });

        try {
            const backupPath = path.join(BACKUP_DIR, selected);
            const backupManifest = readJson(path.join(backupPath, 'backup_manifest.json'), null);
            rollbackCloudFiles(backupPath);
            const restoredVersion = backupManifest?.fromVersion || selected.split('_')[1] || loadVersion();
            saveVersion(restoredVersion);
            setUpdateStep('rolled_back', `已回滚备份 ${selected}，当前版本已恢复为 ${restoredVersion}`);
            rotateRuntimeSecrets(`回滚完成到 ${restoredVersion}`);
            addLog(`[更新系统] ${updateStatus.message}`);
            setTimeout(() => process.exit(0), 1200);
            res.json({ success: true, message: updateStatus.message + '；服务即将重启，需重新 cat admin_password.txt 和 update_password.txt' });
        } catch (error) {
            res.json({ success: false, error: `回滚失败: ${error.message}` });
        }
    });
};
