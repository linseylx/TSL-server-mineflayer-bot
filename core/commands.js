const { colors } = require('./utils');
const config = require('./config');

let bot = null;
let pendingHomeConfirm = null;

function setBotInstance(botInstance) {
    bot = botInstance;
}

function handleTpahereCommand(username) {
    console.log(`${colors.blue}[DEBUG] handleTpahereCommand 被调用，用户名: ${username}${colors.reset}`);

    if (!bot || !bot.entity || !bot.entity.position) {
        bot.whisper(username, '❌ 机器人未就绪，无法传送');
        console.log(`${colors.yellow}[TPA] ${username} 尝试使用 tpahere，但机器人未就绪${colors.reset}`);
        return;
    }

    console.log(`${colors.blue}[DEBUG] isAdmin(${username}) = ${config.isAdmin(username)}${colors.reset}`);
    console.log(`${colors.blue}[DEBUG] adminWhitelist: ${JSON.stringify(config.getConfig().whitelist.adminWhitelist)}${colors.reset}`);
    console.log(`${colors.blue}[DEBUG] registeredAdmins: ${JSON.stringify(Object.keys(config.getConfig().registeredAdmins))}${colors.reset}`);

    if (!config.isAdmin(username)) {
        bot.whisper(username, '❌ 权限不足！只有管理员可以使用 tpahere 命令');
        console.log(`${colors.yellow}[TPA] ${username} 尝试使用 tpahere，但不是管理员${colors.reset}`);
        return;
    }

    const pos = bot.entity.position;
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    const z = Math.floor(pos.z);

    bot.chat(`/tp ${username} ${x} ${y} ${z}`);
    bot.whisper(username, `✅ 已传送你到我的位置: (${x}, ${y}, ${z})`);
    console.log(`${colors.green}[TPA] ${username} 使用 tpahere 传送到位置: (${x}, ${y}, ${z})${colors.reset}`);
}

function handlePositionCommand(sender, message) {
    if (!message.startsWith('位置>')) return false;
    const targetPlayer = message.split('>')[1]?.trim();
    if (!targetPlayer) return true;

    const playerTracker = require('./playerTracker');
    const position = playerTracker.getPlayerPosition(targetPlayer);
    if (position) {
        bot.chat(`/msg ${sender} ${targetPlayer} 的位置: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`);
    } else {
        bot.chat(`/msg ${sender} 无法获取玩家 ${targetPlayer} 的位置`);
    }
    return true;
}

function handleGroupCommand(sender, cmd) {
    if (cmd === '群组>') {
        const groups = Object.keys(config.getConfig().groups || {});
        bot.chat(`/msg ${sender} 现有群组: ${groups.join(', ') || '无'}`);
        return true;
    }
    if (cmd.startsWith('新建群组>')) {
        const name = cmd.split('>')[1]?.trim();
        if (!name) {
            bot.chat(`/msg ${sender} 请输入群组名称`);
            return true;
        }
        const cfg = config.getConfig();
        if (!cfg.groups) cfg.groups = {};
        cfg.groups[name] = { createdAt: Date.now(), projects: {} };
        config.saveConfig();
        bot.chat(`/msg ${sender} 已创建群组: ${name}`);
        return true;
    }
    if (cmd.startsWith('选中')) {
        const name = cmd.split('选中')[1]?.replace('>', '').trim();
        if (config.getConfig().groups && config.getConfig().groups[name]) {
            bot.chat(`/msg ${sender} 已进入群组: ${name}`);
        } else {
            bot.chat(`/msg ${sender} 未找到群组: ${name}`);
        }
        return true;
    }
    return false;
}

function handleHomeCommand(username, content) {
    if (content.trim() === 'home>' && config.isAdmin(username)) {
        pendingHomeConfirm = { username, timestamp: Date.now() };
        bot.whisper(username, '【home>命令】是否修改挂机点？\n是：删除旧挂机点并设置新挂机点\n否：传送至现有挂机点');
        console.log(`${colors.green}[HOME] 管理员 ${username} 请求修改挂机点${colors.reset}`);
        return true;
    }

    if (pendingHomeConfirm && pendingHomeConfirm.username === username) {
        if (content.trim() === '是' || content.trim() === 'y' || content.trim() === 'Y') {
            bot.whisper(username, '【步骤1/2】正在删除旧挂机点...');
            bot.chat('/delhome guaji');
            setTimeout(() => {
                bot.whisper(username, '【步骤2/2】正在设置新挂机点...');
                bot.chat('/sethome 挂机');
            }, 500);
            setTimeout(() => {
                bot.whisper(username, '✅ 挂机点已修改完成！');
                console.log(`${colors.green}[HOME] 管理员 ${username} 确认修改挂机点${colors.reset}`);
            }, 1000);
        } else if (content.trim() === '否' || content.trim() === 'n' || content.trim() === 'N') {
            bot.whisper(username, '正在传送到挂机点...');
            bot.chat('/home guaji');
            setTimeout(() => {
                bot.whisper(username, '✅ 已传送至挂机点！');
                console.log(`${colors.green}[HOME] 管理员 ${username} 取消修改，传送到挂机点${colors.reset}`);
            }, 500);
        }
        pendingHomeConfirm = null;
        return true;
    }

    return false;
}

function handleTpaRequest(username, isTpahere) {
    const cfg = config.getConfig();
    const isLockedMode = cfg.lock?.isLocked;
    const isConstructionMode = cfg.construction?.isActive;

    if (isTpahere) {
        if (config.isAdmin(username)) {
            bot.chat('/tpaccept');
            bot.whisper(username, `✅ 已接受你的传送请求`);
            console.log(`${colors.green}[TPA] ${isLockedMode ? '锁定模式' : isConstructionMode ? '施工模式' : '正常模式'} - ${username}（管理员）请求tpahere（Bot传送过去），已接受${colors.reset}`);
        } else {
            bot.chat('/tpdeny');
            bot.whisper(username, `❌ 拒绝传送请求！只有管理员可以使用tpahere`);
            console.log(`${colors.yellow}[TPA] ${isLockedMode ? '锁定模式' : isConstructionMode ? '施工模式' : '正常模式'} - ${username}（非管理员）请求tpahere（Bot传送过去），已拒绝${colors.reset}`);
        }
    } else {
        bot.chat('/tpaccept');
        bot.whisper(username, `✅ 已接受你的传送请求`);
        console.log(`${colors.cyan}[TPA] ${isLockedMode ? '锁定模式' : isConstructionMode ? '施工模式' : '正常模式'} - ${username}请求tpa（传送到Bot），已接受${colors.reset}`);
    }
}

function extractSenderFromMessage(msgStr) {
    let sender = null;

    const match1 = msgStr.match(/『(.*?)』(.*?)\s*>/);
    if (match1) sender = match1[2].trim();

    if (!sender) {
        const match2 = msgStr.match(/<([a-zA-Z0-9_]+)>/);
        if (match2) sender = match2[1].trim();
    }

    if (!sender) {
        const match3 = msgStr.match(/^([a-zA-Z0-9_]+)\s+请求传送/);
        if (match3) sender = match3[1].trim();
    }

    if (!sender) {
        const match4 = msgStr.match(/^([a-zA-Z0-9_]+)\s+请求你传送到他的位置/);
        if (match4) sender = match4[1].trim();
    }

    return sender;
}

function processChatMessage(username, message, fullMessage) {
    if (message.includes(bot.username) || message.includes('『' + bot.username + '』')) return;
    if (!message.includes('『') || fullMessage.match(/^\[.*?\]\s*.*?\s*>\s*/)) return;

    let town = '', playerName = username, content = message;

    const townMatch = message.match(/『(.*?)』(.*?)\s*>\s*(.*)/s);
    if (townMatch) {
        town = townMatch[1] || '';
        playerName = townMatch[2].trim();
        content = townMatch[3].trim();
    }

    const siliao = require('./siliao');
    const saveFormat = `[${town}] ${playerName} > ${content}`;
    siliao.appendMessage(saveFormat);

    if (handleHomeCommand(username, content)) {
        return;
    }
}

module.exports = {
    setBotInstance,
    handleTpahereCommand,
    handlePositionCommand,
    handleGroupCommand,
    handleHomeCommand,
    handleTpaRequest,
    extractSenderFromMessage,
    processChatMessage
};