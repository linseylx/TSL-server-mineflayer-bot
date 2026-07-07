const fs = require('fs');
const path = require('path');
const { colors, generateHashCode } = require('./utils');

let bot = null;
const reportExtensions = ['.bz', '.zd', '.zdy'];
const reportContents = new Map();
const reportStatusFile = path.join(__dirname, '..', 'report-status.json');
const playerLastPositions = {};
const playerReported = new Map();
const playerCurrentAreas = {};

function setBotInstance(botInstance) {
    bot = botInstance;
}

function parseReportContent(content) {
    const result = {
        type: 'bz',
        coords: { x1: '', y1: '', z1: '', x2: '', y2: '', z2: '' },
        quote: '',
        affiliates: []
    };
    if (!content) return result;

    const lines = content.split('\n');
    let currentAff = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[类型]')) {
            result.type = trimmed.match(/\[类型\]\s*(\S+)/)?.[1] || 'bz';
        } else if (trimmed.startsWith('[坐标1]')) {
            const match = trimmed.match(/\((-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\)/);
            if (match) {
                result.coords.x1 = +match[1];
                result.coords.y1 = +match[2];
                result.coords.z1 = +match[3];
            }
        } else if (trimmed.startsWith('[坐标2]')) {
            const match = trimmed.match(/\((-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\)/);
            if (match) {
                result.coords.x2 = +match[1];
                result.coords.y2 = +match[2];
                result.coords.z2 = +match[3];
            }
        } else if (trimmed.startsWith('[语录]')) {
            result.quote = trimmed.split(']')[1]?.trim() || '';
        } else if (trimmed.startsWith('[附属]')) {
            if (currentAff) result.affiliates.push(currentAff);
            currentAff = { x1: '', y1: '', z1: '', x2: '', y2: '', z2: '', quote: '' };
        } else if (currentAff) {
            if (trimmed.startsWith('X1:')) currentAff.x1 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('Y1:')) currentAff.y1 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('Z1:')) currentAff.z1 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('X2:')) currentAff.x2 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('Y2:')) currentAff.y2 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('Z2:')) currentAff.z2 = +trimmed.split(':')[1] || 0;
            else if (trimmed.startsWith('语录:')) currentAff.quote = trimmed.split(':').slice(1).join(':').trim();
        }
    }
    if (currentAff) result.affiliates.push(currentAff);
    return result;
}

function checkReportFiles() {
    let foundCount = 0;
    let changedCount = 0;
    let deletedCount = 0;
    const currentFiles = new Set();

    function scanDir(dir) {
        try {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) scanDir(filePath);
                else if (reportExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
                    currentFiles.add(filePath);
                    foundCount++;
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const hash = generateHashCode(content);
                        if (!reportContents.has(filePath)) {
                            reportContents.set(filePath, hash);
                            changedCount++;
                            console.log(`${colors.cyan}[REPORT] 发现新播报文件: ${filePath}${colors.reset}`);
                        } else if (reportContents.get(filePath) !== hash) {
                            reportContents.set(filePath, hash);
                            changedCount++;
                            console.log(`${colors.cyan}[REPORT] 播报文件更新: ${filePath}${colors.reset}`);
                        }
                    } catch (e) {
                        console.log(`${colors.yellow}[REPORT] 读取文件失败: ${filePath} - ${e.message}${colors.reset}`);
                    }
                }
            });
        } catch (e) { }
    }

    scanDir(__dirname + '/..');

    reportContents.forEach((hash, filePath) => {
        if (!currentFiles.has(filePath)) {
            reportContents.delete(filePath);
            deletedCount++;
            console.log(`${colors.yellow}[REPORT] 播报文件已删除: ${filePath}${colors.reset}`);
        }
    });

    const status = {
        timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        files: Array.from(reportContents.keys()).map(fp => ({
            path: fp,
            name: path.basename(fp),
            lastModified: fs.existsSync(fp) ? fs.statSync(fp).mtime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null
        })),
        added: changedCount,
        deleted: deletedCount
    };
    fs.writeFileSync(reportStatusFile, JSON.stringify(status, null, 2), 'utf8');

    if (changedCount > 0 || deletedCount > 0) {
        console.log(`${colors.green}[REPORT] 扫描完成，共发现 ${foundCount} 个播报文件，新增/更新 ${changedCount} 个，删除 ${deletedCount} 个${colors.reset}`);
    }
}

function isPlayerInArea(playerPos, area) {
    if (!playerPos || !area) return false;
    const { x, y, z } = playerPos;
    const { x1, y1, z1, x2, y2, z2 } = area;
    if (!x1 && !x2) return false;

    const minX = Math.min(x1 || x2, x2 || x1) - 1;
    const maxX = Math.max(x1 || x2, x2 || x1) + 1;
    const minY = Math.min(y1 || y2, y2 || y1) - 1;
    const maxY = Math.max(y1 || y2, y2 || y1) + 1;
    const minZ = Math.min(z1 || z2, z2 || z1) - 1;
    const maxZ = Math.max(z1 || z2, z2 || z1) + 1;

    const result = x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    return result;
}

function checkPlayerPositions() {
    if (!bot || !bot.players) return;

    for (const username in bot.players) {
        const player = bot.players[username];
        if (!player || !player.entity || !player.entity.position) continue;

        const currentPos = player.entity.position;

        if (!playerCurrentAreas[username]) {
            playerCurrentAreas[username] = new Set();
        }
        const currentAreas = playerCurrentAreas[username];
        const newAreas = new Set();

        reportContents.forEach((hash, filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const parsed = parseReportContent(content);

                const mainKey = `${username}:${filePath}`;
                if (isPlayerInArea(currentPos, parsed.coords)) {
                    newAreas.add(mainKey);

                    if (!currentAreas.has(mainKey)) {
                        const reportData = playerReported.get(mainKey);
                        const now = Date.now();

                        if (!reportData || (now - reportData.lastTime) > 10 * 1000) {
                            if (parsed.quote) {
                                console.log(`${colors.green}[REPORT] ${username} 进入主区域，发送语录: ${parsed.quote}${colors.reset}`);
                                bot.chat(`/msg ${username} ${parsed.quote}`);
                                playerReported.set(mainKey, { lastTime: now });
                            }
                        }
                    }
                }

                parsed.affiliates.forEach(aff => {
                    const affKey = `${username}:${filePath}:aff:${aff.x1}:${aff.z1}`;
                    if (isPlayerInArea(currentPos, aff)) {
                        newAreas.add(affKey);

                        if (!currentAreas.has(affKey)) {
                            const reportData = playerReported.get(affKey);
                            const now = Date.now();

                            if (!reportData || (now - reportData.lastTime) > 10 * 1000) {
                                const quote = aff.quote || parsed.quote;
                                if (quote) {
                                    console.log(`${colors.green}[REPORT] ${username} 进入附属区域，发送语录: ${quote}${colors.reset}`);
                                    bot.chat(`/msg ${username} ${quote}`);
                                    playerReported.set(affKey, { lastTime: now });
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                if (e.code === 'ENOENT') {
                    reportContents.delete(filePath);
                } else {
                    console.error('[checkPlayerPositions] Error processing player:', e.message);
                }
            }
        });

        playerCurrentAreas[username] = newAreas;
        playerLastPositions[username] = currentPos;
    }
}

module.exports = {
    setBotInstance,
    checkReportFiles,
    checkPlayerPositions,
    parseReportContent
};