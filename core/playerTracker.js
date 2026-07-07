const { colors } = require('./utils');

let bot = null;
const playerPositions = {};

function setBotInstance(botInstance) {
    bot = botInstance;
}

function updatePlayerPosition(player) {
    if (!player) return;
    const username = player.username || (player.entity ? player.entity.username : null);
    if (!username) return;

    if (!bot) return;

    if (username === bot.username && bot.entity && bot.entity.position) {
        const pos = bot.entity.position;
        playerPositions[username] = {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            dimension: bot.game.dimension || 'overworld',
            lastUpdated: Date.now(),
            source: 'bot-self'
        };
        return;
    }

    if (player.entity && player.entity.position) {
        const pos = player.entity.position;
        playerPositions[username] = {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            dimension: bot.game.dimension || 'overworld',
            lastUpdated: Date.now(),
            source: 'entity'
        };
    }
}

function scanAllPlayers() {
    if (!bot || !bot.entity) return;
    if (bot.entity && bot.entity.position) {
        const pos = bot.entity.position;
        playerPositions[bot.username] = {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            dimension: bot.game.dimension || 'overworld',
            lastUpdated: Date.now(),
            source: 'bot-self'
        };
    }
    if (bot.players) {
        for (const username in bot.players) {
            updatePlayerPosition(bot.players[username]);
        }
    }
}

function getPlayerPosition(username) {
    const cached = playerPositions[username];
    if (cached && (Date.now() - cached.lastUpdated) < 120000) {
        return cached;
    }

    if (username === bot.username && bot.entity && bot.entity.position) {
        const pos = bot.entity.position;
        return {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            dimension: bot.game.dimension || 'overworld',
            lastUpdated: Date.now(),
            source: 'bot-entity'
        };
    }

    if (bot.players && bot.players[username] && bot.players[username].entity && bot.players[username].entity.position) {
        const pos = bot.players[username].entity.position;
        return {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            dimension: bot.game.dimension || 'overworld',
            lastUpdated: Date.now(),
            source: 'real-time'
        };
    }

    return null;
}

function getAllPlayerPositions() {
    return { ...playerPositions };
}

function clearPlayerPosition(username) {
    delete playerPositions[username];
}

function clearAllPositions() {
    Object.keys(playerPositions).forEach(key => delete playerPositions[key]);
}

module.exports = {
    setBotInstance,
    updatePlayerPosition,
    scanAllPlayers,
    getPlayerPosition,
    getAllPlayerPositions,
    clearPlayerPosition,
    clearAllPositions
};