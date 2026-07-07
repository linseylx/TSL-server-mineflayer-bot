const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const LOCAL_VERSION_FILE = path.join(__dirname, '..', 'local_version.json');
const LOCAL_BACKUP_DIR = path.join(__dirname, '..', 'local_backups');
const TRANSPORT_DIR = __dirname;
const ADMIN_PORT = 28474;

let currentVersion = '1.0.0';

function loadLocalVersion() {
    try {
        if (fs.existsSync(LOCAL_VERSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(LOCAL_VERSION_FILE, 'utf8'));
            currentVersion = data.version || '1.0.0';
        }
    } catch {}
}
loadLocalVersion();

function saveLocalVersion(version) {
    currentVersion = version;
    fs.writeFileSync(LOCAL_VERSION_FILE, JSON.stringify({
        version,
        updatedAt: new Date().toISOString()
    }, null, 2));
}

function getCandidateBaseUrls(mainHost, mainPort) {
    const ports = [];
    if (mainPort) ports.push(mainPort);
    if (!ports.includes(ADMIN_PORT)) ports.push(ADMIN_PORT);
    return ports.map(port => `http://${mainHost}${port ? ':' + port : ''}`);
}

async function requestFromAdmin(mainHost, mainPort, requestPath, options = {}) {
    let lastError = null;
    for (const baseUrl of getCandidateBaseUrls(mainHost, mainPort)) {
        try {
            return await axios.get(`${baseUrl}${requestPath}`, options);
        } catch (err) {
            lastError = err;
            const status = err.response?.status;
            if (status && status !== 404) break;
        }
    }
    throw lastError;
}

async function checkForUpdate(mainHost, mainPort) {
    try {
        const resp = await requestFromAdmin(mainHost, mainPort, '/api/update/version', { timeout: 5000 });
        if (resp.data?.success) {
            const targetVersion = resp.data.localVersion || resp.data.version;
            if (!targetVersion || compareVersions(targetVersion, currentVersion) <= 0) {
                return null;
            }
            if (!resp.data.localPackageReady) {
                console.log(`[更新] 云端版本 ${targetVersion} 已发布，本地更新包尚未开放下载，等待下次心跳`);
                return null;
            }
            const manifestResp = await requestFromAdmin(mainHost, mainPort, '/api/update/local/manifest', { timeout: 5000 });
            if (manifestResp.data?.success && manifestResp.data.ready && manifestResp.data.version === targetVersion) {
                return targetVersion;
            }
            console.log(`[更新] 本地更新包 ${targetVersion} 未就绪，等待下次心跳`);
        }
    } catch (err) {
        console.log(`[更新] 检查版本失败: ${err.message}`);
    }
    return null;
}

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

async function downloadUpdate(mainHost, mainPort, version) {
    const updateZipPath = path.join(LOCAL_BACKUP_DIR, `update_${version}.zip`);
    
    if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
        fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    }
    
    try {
        const resp = await requestFromAdmin(mainHost, mainPort, `/api/update/local/download?version=${encodeURIComponent(version)}`, {
            responseType: 'arraybuffer',
            timeout: 60000
        });
        
        fs.writeFileSync(updateZipPath, Buffer.from(resp.data));
        return updateZipPath;
    } catch (err) {
        console.log(`[更新] 下载失败: ${err.message}`);
        return null;
    }
}

function backupCurrentVersion() {
    const backupPath = path.join(LOCAL_BACKUP_DIR, `backup_${currentVersion}_${Date.now()}`);
    
    const filesToBackup = [
        'transport_bot.js',
        'auto_updater.js',
        'config.json'
    ];
    
    try {
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }
        
        for (const file of filesToBackup) {
            const src = path.join(TRANSPORT_DIR, file);
            const dst = path.join(backupPath, file);
            if (fs.existsSync(src)) {
                const dir = path.dirname(dst);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                if (fs.statSync(src).isDirectory()) {
                    fs.cpSync(src, dst, { recursive: true });
                } else {
                    fs.copyFileSync(src, dst);
                }
            }
        }
        
        return backupPath;
    } catch (err) {
        console.log(`[更新] 备份失败: ${err.message}`);
        return null;
    }
}

function mergeConfig(oldConfigPath, newConfig) {
    try {
        if (fs.existsSync(oldConfigPath)) {
            const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
            return { ...newConfig, ...oldConfig };
        }
    } catch {}
    return newConfig;
}

function sha256Buffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function performUpdate(mainHost, mainPort) {
    console.log('[更新] 开始检查更新...');
    
    const latestVersion = await checkForUpdate(mainHost, mainPort);
    if (!latestVersion) {
        console.log('[更新] 无法获取最新版本');
        return false;
    }
    
    if (compareVersions(latestVersion, currentVersion) <= 0) {
        console.log(`[更新] 当前版本 ${currentVersion} 已是最新`);
        return false;
    }
    
    console.log(`[更新] 发现新版本: ${currentVersion} -> ${latestVersion}`);
    
    const zipPath = await downloadUpdate(mainHost, mainPort, latestVersion);
    if (!zipPath) {
        console.log('[更新] 更新包下载失败');
        return false;
    }
    
    console.log('[更新] 备份当前版本...');
    const backupPath = backupCurrentVersion();
    if (!backupPath) {
        console.log('[更新] 备份失败，取消更新');
        return false;
    }
    
    try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(zipPath);
        const baseDir = TRANSPORT_DIR;
        
        const entries = zip.getEntries();
        const manifestEntry = entries.find(entry => entry.entryName === 'update_manifest.json');
        let updateManifest = null;
        if (manifestEntry) {
            try {
                updateManifest = JSON.parse(manifestEntry.getData().toString('utf8'));
                if (updateManifest.version && updateManifest.version !== latestVersion) {
                    console.log(`[更新] 本地更新包版本不匹配: ${updateManifest.version} != ${latestVersion}`);
                    return false;
                }
            } catch (err) {
                console.log(`[更新] 本地更新清单损坏: ${err.message}`);
                return false;
            }
        }
        const preservedDirs = ['logs', 'cache'];
        
        for (const entry of entries) {
            const entryPath = entry.entryName;
            if (entryPath === 'update_manifest.json') continue;
            const shouldPreserve = preservedDirs.some(dir => 
                entryPath.startsWith(dir + '/') || entryPath === dir + '/'
            );
            
            if (shouldPreserve) {
                continue;
            }
            
            const fullPath = path.join(baseDir, entryPath);
            const resolvedFull = path.resolve(fullPath);
            const resolvedBase = path.resolve(baseDir);
            if (!resolvedFull.startsWith(resolvedBase)) {
                console.log(`[更新] 检测到不安全路径: ${entryPath}，跳过`);
                continue;
            }
        }
        
        const configPath = path.join(baseDir, 'config.json');
        let oldConfig = null;
        if (fs.existsSync(configPath)) {
            try {
                oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch {}
        }
        
        for (const entry of entries) {
            if (entry.isDirectory) continue;
            const entryPath = entry.entryName;
            if (entryPath === 'update_manifest.json') continue;
            const shouldPreserve = preservedDirs.some(dir =>
                entryPath.startsWith(dir + '/') || entryPath === dir + '/'
            );
            if (shouldPreserve) continue;

            const targetPath = path.join(baseDir, entryPath);
            const resolvedTarget = path.resolve(targetPath);
            const resolvedBase = path.resolve(baseDir);
            if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
                console.log(`[更新] 跳过不安全路径: ${entryPath}`);
                continue;
            }

            const nextData = entry.getData();
            const nextHash = sha256Buffer(nextData);
            const manifestFile = updateManifest?.files?.find(file => file.path === entryPath);
            if (manifestFile?.nextHash && manifestFile.nextHash !== nextHash) {
                throw new Error(`???????: ${entryPath}`);
            }
            const currentHash = sha256File(targetPath);
            if (currentHash && currentHash === nextHash) {
                console.log(`[??] ???????: ${entryPath}`);
                continue;
            }

            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            fs.writeFileSync(targetPath, nextData);
        }
        
        if (oldConfig) {
            const newConfigPath = path.join(baseDir, 'config.json');
            if (fs.existsSync(newConfigPath)) {
                try {
                    const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));
                    const mergedConfig = { ...newConfig, ...oldConfig };
                    fs.writeFileSync(newConfigPath, JSON.stringify(mergedConfig, null, 2));
                    console.log('[更新] 配置文件已合并');
                } catch {}
            }
        }
        
        saveLocalVersion(latestVersion);
        
        try { fs.unlinkSync(zipPath); } catch {}
        
        console.log(`[更新] 更新完成: ${latestVersion}，即将重启`);
        return true;
        
    } catch (err) {
        console.log(`[更新] 更新失败: ${err.message}`);
        
        if (backupPath && fs.existsSync(backupPath)) {
            console.log('[更新] 正在回滚到备份版本...');
            try {
                const files = fs.readdirSync(backupPath);
                for (const file of files) {
                    const src = path.join(backupPath, file);
                    const dst = path.join(TRANSPORT_DIR, file);
                    if (fs.statSync(src).isDirectory()) {
                        fs.cpSync(src, dst, { recursive: true });
                    } else {
                        fs.copyFileSync(src, dst);
                    }
                }
                console.log('[更新] 回滚成功');
            } catch (rollbackErr) {
                console.log(`[更新] 回滚失败: ${rollbackErr.message}`);
            }
        }
        
        return false;
    }
}

module.exports = {
    currentVersion: () => currentVersion,
    checkForUpdate,
    performUpdate,
    compareVersions,
    loadLocalVersion,
    saveLocalVersion
};
