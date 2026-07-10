const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m'
};

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let actionQueue = [];
let isProcessingAction = false;

function enqueueAction(action) {
    actionQueue.push(action);
    processActionQueue();
}

function processActionQueue() {
    if (isProcessingAction || actionQueue.length === 0) return;

    isProcessingAction = true;
    const action = actionQueue.shift();

    const delay = action.delay || getRandomDelay(50, 200);

    setTimeout(() => {
        try {
            action.execute();
        } catch (e) {
            console.log(`${colors.yellow}[ACTION] 动作执行错误: ${e.message}${colors.reset}`);
        }

        setTimeout(() => {
            isProcessingAction = false;
            processActionQueue();
        }, getRandomDelay(200, 500));
    }, delay);
}

function formatPosition(pos) {
    if (!pos) return '未知';
    return `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
}

function parsePositionString(posStr) {
    const match = posStr.match(/\((-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)\)/);
    if (match) {
        return { x: +match[1], y: +match[2], z: +match[3] };
    }
    return null;
}

function generateHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

function safeNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'object') {
        if (value.toNumber) return value.toNumber();
        if (value.valueOf) return Number(value.valueOf());
    }
    return Number(value) || 0;
}

module.exports = {
    colors,
    getRandomDelay,
    enqueueAction,
    processActionQueue,
    formatPosition,
    parsePositionString,
    generateHashCode,
    safeNumber
};