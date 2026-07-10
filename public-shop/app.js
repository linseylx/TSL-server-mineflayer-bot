let API_URL = '';
let token = localStorage.getItem('token');
let currentUser = null;
let currentAccount = '';
let boundAccounts = [];
let currentBindCode = '';
let tempLoginCode = '';
let regBindCode = '';
let mainBotUsername = '';
let socket = null;
let countdownInterval = null;
let bindPollInterval = null;
let latestItems = [];
let activeItemCategory = 'all';
let shopServerInfo = { warehouseMode: 'PUBLIC', showPrice: true };

const ITEM_CATEGORY_DEFS = [
    { id: 'all', label: '全部', aliases: ['all', 'quanbu', 'qb'], match: () => true },
    { id: 'redstone', label: '红石', aliases: ['redstone', 'hongshi', 'hs'], match: name => /(redstone|repeater|comparator|piston|observer|dispenser|dropper|hopper|lever|tripwire|daylight_detector|target|sculk_sensor)/.test(name) },
    { id: 'container', label: '\u5bb9\u5668', aliases: ['container', 'rongqi', 'rq', 'shulker', 'qianyinghe', 'qyh'], match: name => name.endsWith('shulker_box') || name === 'chest' || name === 'barrel' },
    { id: 'carpet', label: '地毯', aliases: ['carpet', 'ditan', 'dt'], match: name => name.endsWith('_carpet') || name === 'carpet' },
    { id: 'log', label: '原木', aliases: ['log', 'logs', 'wood', 'yuanmu', 'ym'], match: name => /(^|_)(log|stem|hyphae)$/.test(name) || name.endsWith('_wood') },
    { id: 'concrete', label: '混凝土', aliases: ['concrete', 'hunningtu', 'hnt'], match: name => name.endsWith('_concrete') || name.endsWith('_concrete_powder') },
    { id: 'planks', label: '木板', aliases: ['planks', 'muban', 'mb'], match: name => name.endsWith('_planks') },
    { id: 'woodwork', label: '木制品', aliases: ['woodwork', 'muzhipin', 'mzp', 'louti', 'taijie', 'zhalan', 'men'], match: name => /(_stairs|_slab|_fence|_fence_gate|_door|_trapdoor|_pressure_plate|_button|_sign|_hanging_sign)$/.test(name) && /(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|bamboo|crimson|warped)/.test(name) },
    { id: 'glass', label: '玻璃', aliases: ['glass', 'boli', 'bl'], match: name => name.includes('glass') },
    { id: 'wool', label: '羊毛', aliases: ['wool', 'yangmao', 'ym'], match: name => name.endsWith('_wool') },
    { id: 'terracotta', label: '陶瓦', aliases: ['terracotta', 'taowa', 'taoci', 'tc'], match: name => name.includes('terracotta') },
    { id: 'sand', label: '沙类', aliases: ['sand', 'shalei', 'sha', 'sl'], match: name => /(sand|gravel|clay|mud)/.test(name) },
    { id: 'stone', label: '石材', aliases: ['stone', 'shicai', 'sc'], match: name => /(stone|deepslate|granite|diorite|andesite|basalt|tuff|calcite|blackstone|sandstone|quartz|brick|slab|stairs|wall)/.test(name) },
    { id: 'ore', label: '矿物', aliases: ['ore', 'kuangwu', 'kw'], match: name => /(ore|coal|iron|gold|copper|diamond|emerald|lapis|netherite|quartz|amethyst)/.test(name) },
    { id: 'plant', label: '植物', aliases: ['plant', 'zhiwu', 'zw', 'sapling', 'miaomu'], match: name => /(sapling|leaves|flower|mushroom|roots|propagule|bamboo|cactus|sugar_cane|vine|kelp|seagrass|moss|azalea)/.test(name) },
    { id: 'light', label: '光源', aliases: ['light', 'guangyuan', 'gy', 'lamp', 'deng'], match: name => /(torch|lantern|lamp|glowstone|sea_lantern|shroomlight|froglight|candle|end_rod|beacon)/.test(name) },
    { id: 'food', label: '食物', aliases: ['food', 'shiwu', 'sw'], match: name => /(apple|bread|carrot|potato|beef|pork|mutton|chicken|rabbit|cod|salmon|cookie|melon|berries|stew|soup|pumpkin_pie|golden_carrot)/.test(name) },
    { id: 'bulk', label: '大宗', aliases: ['bulk', 'dazong', 'dz', 'box', 'hezi'], match: (name, item) => Boolean(item?.bulk?.isBulk) }
];

const ITEM_WORD_PINYIN = {
    white: 'baise', orange: 'chengse', magenta: 'pin hong se', light: 'qian', blue: 'lanse',
    yellow: 'huangse', lime: 'huanglvse', pink: 'fense', gray: 'huise', grey: 'huise',
    cyan: 'qingse', purple: 'zise', brown: 'zongse', green: 'lvse', red: 'hongse', black: 'heise',
    concrete: 'hunningtu', powder: 'fenmo', carpet: 'ditan', log: 'yuanmu', wood: 'mu',
    stem: 'junbing', hyphae: 'junsi', stripped: 'qupi', planks: 'muban', glass: 'boli',
    wool: 'yangmao', stone: 'shitou', deepslate: 'shencengyan', ore: 'kuangshi',
    redstone: 'hongshi', repeater: 'zhongjiqi', comparator: 'bijiaoqi', piston: 'huosai',
    observer: 'zhengceqi', dispenser: 'fasheqi', dropper: 'tousheqi', hopper: 'loudou',
    sand: 'sha', sandstone: 'shayan', terracotta: 'taoci', slab: 'tai jie', stairs: 'louti',
    wall: 'qiang', brick: 'zhuan', quartz: 'shiying', dirt: 'nitu', grass: 'cao',
    oak: 'xiangmu', spruce: 'yunshan', birch: 'baihua', jungle: 'conglin', acacia: 'jinhehuan',
    dark: 'shen', mangrove: 'hongshulin', cherry: 'yinghua', bamboo: 'zhuzi', crimson: 'feihong',
    warped: 'guiyi'
};

const ITEM_CHINESE_PINYIN = [
    ['金合欢', 'jinhehuan'], ['白桦', 'baihua'], ['云杉', 'yunshan'], ['橡木', 'xiangmu'],
    ['深色橡木', 'shensexiangmu shenxiangmu'], ['丛林', 'conglin'], ['红树林', 'hongshulin'],
    ['樱花', 'yinghua'], ['竹', 'zhu'], ['绯红', 'feihong'], ['诡异', 'guiyi'],
    ['原木', 'yuanmu'], ['木板', 'muban'], ['木头', 'mutou'], ['木', 'mu'],
    ['去皮', 'qupi'], ['楼梯', 'louti'], ['台阶', 'taijie'], ['栅栏门', 'zhalanmen'],
    ['栅栏', 'zhalan'], ['活板门', 'huobanmen'], ['压力板', 'yaliban'], ['按钮', 'anniu'],
    ['告示牌', 'gaoshipai'], ['悬挂式', 'xuanguashi'], ['地毯', 'ditan'], ['羊毛', 'yangmao'],
    ['混凝土粉末', 'hunningtufenmo'], ['混凝土', 'hunningtu'], ['玻璃板', 'boliban'], ['玻璃', 'boli'],
    ['红石', 'hongshi'], ['红石粉', 'hongshifen'], ['中继器', 'zhongjiqi'], ['比较器', 'bijiaoqi'],
    ['活塞', 'huosai'], ['侦测器', 'zhenceqi'], ['发射器', 'fasheqi'], ['投掷器', 'touzhiqi'],
    ['漏斗', 'loudou'], ['拉杆', 'lagan'], ['铁轨', 'tiegui'], ['动力铁轨', 'donglitiegui'],
    ['石英', 'shiying'], ['石材', 'shicai'], ['平滑', 'pinghua'], ['楼梯', 'louti'],
    ['沙子', 'shazi'], ['沙砾', 'shali'], ['陶瓦', 'taowa'], ['植物', 'zhiwu'],
    ['大宗', 'dazong'], ['盒装', 'hezhuang'], ['散装', 'sanzhuang'], ['潜影盒', 'qianyinghe']
];

function displayNameToPinyinAliases(value) {
    const text = String(value || '');
    if (!text) return [];
    const aliases = [];
    for (const [word, pinyin] of ITEM_CHINESE_PINYIN) {
        if (text.includes(word)) aliases.push(...String(pinyin).split(/\s+/));
    }
    return [...new Set(aliases.filter(Boolean))];
}

function setStatus(id, message, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('success', 'error');
    if (!message) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    if (type) el.classList.add(type);
    el.style.display = 'block';
    el.textContent = message;
}

function authHeaders(extra = {}) {
    return { ...extra, Authorization: `Bearer ${token}` };
}

async function api(path, options = {}) {
    if (!API_URL) await initAPI();
    const res = await fetch(`${API_URL}${path}`, options);
    return res.json();
}

async function initSocket() {
    if (socket || !window.io) return;
    await initAPI();
    socket = io();

    socket.on('loginUrl', (data) => {
        const modal = document.getElementById('microsoft-login-modal');
        const link = document.getElementById('microsoft-login-url');
        const code = document.getElementById('microsoft-login-code');
        if (link) {
            link.href = data.url;
            link.textContent = data.url;
        }
        if (code) code.textContent = data.code || 'XXXXXXXX';
        if (modal) modal.classList.add('active');
    });

    socket.on('loginComplete', () => {
        document.getElementById('microsoft-login-modal')?.classList.remove('active');
    });

    socket.on('tempLoginVerified', (data) => {
        if (data.code === tempLoginCode) verifyTempLogin();
    });

    socket.on('warehouseUpdate', () => loadItems());
    socket.on('inventory-update', renderItems);
    socket.on('pickupLog', () => loadPickupLogs());
    socket.on('scanComplete', () => updateSystemStatusBanner({ scanning: false }));
    socket.on('systemStatus', updateSystemStatusBanner);

    fetch(`${API_URL}/api/system/status`)
        .then(res => res.json())
        .then(data => updateSystemStatusBanner(data.status || {}))
        .catch(() => {});
}

function ensureSystemStatusBanner() {
    let banner = document.getElementById('system-status-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'system-status-banner';
    banner.style.cssText = [
        'position:sticky',
        'top:0',
        'z-index:50',
        'display:none',
        'padding:10px 16px',
        'background:linear-gradient(135deg,#fff7ed,#fff1f2)',
        'border-bottom:1px solid rgba(239,122,130,.25)',
        'color:#9f1239',
        'font-size:14px',
        'font-weight:700',
        'text-align:center',
        'box-shadow:0 8px 24px rgba(239,122,130,.12)'
    ].join(';');
    document.body.prepend(banner);
    return banner;
}

function updateSystemStatusBanner(status = {}) {
    const banner = ensureSystemStatusBanner();
    const scanning = !!status.scanning;
    const maintenance = !!status.maintenance;
    if (!scanning && !maintenance) {
        banner.style.display = 'none';
        banner.textContent = '';
        return;
    }
    const parts = [];
    if (maintenance) parts.push('系统维护中，登录/下单/库存可能暂时不可用');
    if (scanning) parts.push(status.scanMessage || '仓库正在扫描，库存正在刷新');
    banner.textContent = parts.join('　|　');
    banner.style.display = 'block';
}

async function initAPI() {
    API_URL = '';
    await loadServerInfo();
    await loadMainBotInfo();
}

async function loadServerInfo() {
    try {
        const res = await fetch(`${API_URL}/api/server/info`);
        const data = await res.json();
        if (data && data.success) {
            shopServerInfo = {
                warehouseMode: data.warehouseMode || 'PUBLIC',
                showPrice: data.showPrice !== false
            };
        }
    } catch {
        shopServerInfo = { warehouseMode: 'PUBLIC', showPrice: true };
    }
}

async function loadMainBotInfo() {
    try {
        const res = await fetch(`${API_URL}/api/public/mainbot-info`);
        const data = await res.json();
        mainBotUsername = data.username?.trim() || (data.email ? data.email.split('@')[0] : 'Bot');
        updateLoginCommands();
    } catch {
        mainBotUsername = 'Bot';
        updateLoginCommands();
    }
}

function updateLoginCommands() {
    const tempBot = document.getElementById('temp-login-botname');
    const regBot = document.getElementById('command-botname');
    if (tempBot) tempBot.textContent = mainBotUsername;
    if (regBot) regBot.textContent = mainBotUsername;
}

function showTab(tab) {
    document.querySelectorAll('.login-container .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.login-container .tab-btn[onclick="showTab('${tab}')"]`)?.classList.add('active');
    document.getElementById('account-login-section')?.classList.toggle('section-hidden', tab !== 'account-login');
    document.getElementById('temp-login-section')?.classList.toggle('section-hidden', tab !== 'temp-login');
    document.getElementById('register-section')?.classList.toggle('section-hidden', tab !== 'register');
    if (tab === 'register') cancelRegister(false);
}

function showProfileTab(tab) {
    document.querySelectorAll('#profile-modal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#profile-modal .tab-btn[onclick="showProfileTab('${tab}')"]`)?.classList.add('active');
    document.getElementById('profile-info')?.classList.toggle('section-hidden', tab !== 'info');
    document.getElementById('profile-bind')?.classList.toggle('section-hidden', tab !== 'bind');
    document.getElementById('profile-change-pwd')?.classList.toggle('section-hidden', tab !== 'change-pwd');
    if (tab === 'bind') cancelBind(false);
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

async function loginWithPassword() {
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value || '';
    if (!username || !password) {
        setStatus('account-login-status', '请输入用户名和密码', 'error');
        return;
    }
    setStatus('account-login-status', '正在登录...', '');
    try {
        const data = await api('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!data.success) {
            setStatus('account-login-status', data.error || '登录失败', 'error');
            return;
        }
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        setStatus('account-login-status', '登录成功，正在进入仓库...', 'success');
        setTimeout(loadShopPage, 300);
    } catch {
        setStatus('account-login-status', '网络错误，请检查服务器连接', 'error');
    }
}

function showProfileModal() {
    loadUserInfo();
    loadBoundAccounts();
    document.getElementById('profile-modal')?.classList.add('active');
}

async function generateTempLoginCode() {
    setStatus('temp-login-status', '正在生成验证码...', '');
    try {
        const data = await api('/api/user/temp-login/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!data.success) {
            setStatus('temp-login-status', data.error || '生成验证码失败', 'error');
            return;
        }
        tempLoginCode = data.code;
        document.getElementById('temp-login-code').textContent = data.code;
        document.getElementById('temp-login-step1').style.display = 'none';
        document.getElementById('temp-login-step2').style.display = 'flex';
        setStatus('temp-login-status', '验证码已生成，请在游戏内发送命令。', 'success');
        setTimeout(verifyTempLogin, 1000);
    } catch {
        setStatus('temp-login-status', '网络错误，请检查服务器连接', 'error');
    }
}

function resetTempLogin() {
    tempLoginCode = '';
    document.getElementById('temp-login-code').textContent = '-';
    document.getElementById('temp-login-step1').style.display = 'block';
    document.getElementById('temp-login-step2').style.display = 'none';
    setStatus('temp-login-status', '');
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    textarea.remove();
    return ok;
}

async function copyText(text, statusId) {
    const value = String(text || '');
    if (!value) {
        if (statusId) setStatus(statusId, '没有可复制的内容', 'error');
        return;
    }

    try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
        } else if (!fallbackCopyText(value)) {
            throw new Error('copy failed');
        }
        if (statusId) setStatus(statusId, '已复制到剪贴板', 'success');
    } catch {
        if (fallbackCopyText(value)) {
            if (statusId) setStatus(statusId, '已复制到剪贴板', 'success');
        } else if (statusId) {
            setStatus(statusId, '复制失败，请手动复制', 'error');
        }
    }
}

function copyTempLoginCommand() {
    if (!tempLoginCode) {
        setStatus('temp-login-status', '请先获取验证码', 'error');
        return;
    }
    copyText(`/msg ${mainBotUsername} login ${tempLoginCode}`, 'temp-login-status');
}

async function verifyTempLogin() {
    if (!tempLoginCode) return;
    try {
        const data = await api('/api/user/temp-login/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: tempLoginCode })
        });
        if (data.success) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = { username: data.username };
            setStatus('temp-login-status', '登录成功，正在进入仓库...', 'success');
            setTimeout(loadShopPage, 500);
            return;
        }
        if (data.error === 'waiting') {
            setStatus('temp-login-status', '等待游戏内验证...', '');
            setTimeout(verifyTempLogin, 2000);
        } else {
            setStatus('temp-login-status', data.error || '验证失败', 'error');
        }
    } catch {
        setTimeout(verifyTempLogin, 2500);
    }
}

function startRegister() {
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    if (!password || !confirm) {
        setStatus('reg-status', '请填写密码', 'error');
        return;
    }
    if (password !== confirm) {
        setStatus('reg-status', '两次输入的密码不一致', 'error');
        return;
    }
    document.getElementById('reg-step1').classList.add('section-hidden');
    document.getElementById('reg-step2').classList.remove('section-hidden');
    startCountdown();
    generateRegBindCode(password);
}

async function generateRegBindCode(password) {
    setStatus('reg-status-step2', '正在生成验证码...', '');
    try {
        const data = await api('/api/user/register/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (data.success) {
            regBindCode = data.code;
            document.getElementById('command-code').textContent = data.code;
            setStatus('reg-status-step2', '请在游戏内发送命令完成验证。', 'success');
        } else {
            setStatus('reg-status-step2', data.error || '生成验证码失败', 'error');
        }
    } catch {
        setStatus('reg-status-step2', '网络错误，请检查服务器连接', 'error');
    }
}

function cancelRegister(clearInputs = true) {
    stopCountdown();
    document.getElementById('reg-step2')?.classList.add('section-hidden');
    document.getElementById('reg-step1')?.classList.remove('section-hidden');
    if (clearInputs) {
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-confirm').value = '';
    }
    setStatus('reg-status', '');
    setStatus('reg-status-step2', '');
    regBindCode = '';
}

function refreshRegBindCode() {
    const password = document.getElementById('reg-password').value;
    if (!password) {
        setStatus('reg-status-step2', '请先输入密码', 'error');
        return;
    }
    generateRegBindCode(password);
}

function copyBindCommand() {
    if (!regBindCode) {
        setStatus('reg-status-step2', '请先生成验证码', 'error');
        return;
    }
    copyText(`/msg ${mainBotUsername} login ${regBindCode}`, 'reg-status-step2');
}

function startCountdown() {
    let seconds = 300;
    const el = document.getElementById('countdown');
    stopCountdown();
    if (el) el.textContent = seconds;
    countdownInterval = setInterval(() => {
        seconds -= 1;
        if (el) el.textContent = seconds > 0 ? seconds : '已过期';
        if (seconds <= 0) stopCountdown();
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = null;
}

async function completeRegister() {
    if (!regBindCode) {
        setStatus('reg-status-step2', '请先生成验证码', 'error');
        return;
    }
    const data = await api('/api/user/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: regBindCode })
    });
    if (data.success) {
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        stopCountdown();
        setStatus('reg-status-step2', '注册成功，正在进入仓库...', 'success');
        setTimeout(loadShopPage, 500);
    } else {
        setStatus('reg-status-step2', data.error || '注册失败', 'error');
    }
}

async function loadShopPage() {
    document.getElementById('login-page').classList.add('section-hidden');
    document.getElementById('shop-page').classList.remove('section-hidden');
    await loadUserInfo();
    await loadBoundAccounts();
    await loadItems();
    await loadPickupLogs();
    if (!boundAccounts.length) {
        setTimeout(() => {
            showProfileModal();
            showProfileTab('bind');
        }, 300);
    }
}

async function loadPickupLogs() {
    const list = document.getElementById('pickup-log-list');
    if (!list) return;
    try {
        const res = await fetch(`${API_URL}/api/pickup/logs?limit=40`);
        const data = await res.json();
        const logs = Array.isArray(data.logs) ? data.logs : [];
        renderPickupLogs(logs);
    } catch (err) {
        list.innerHTML = `<div class="empty-state">\u53d6\u8d27\u65e5\u5fd7\u52a0\u8f7d\u5931\u8d25：${escapeHtml(err.message)}</div>`;
    }
}

function pickupStageText(stage) {
    const map = {
        queued: '\u6392\u961f\u4e2d',
        mainbot_started: '\u4e3bBot\u5904\u7406',
        transport_start: '\u8fd0\u8f93\u53d6\u8d27',
        transport_ready_to_tpa: '\u51c6\u5907\u4f20\u9001',
        delivery_tpa_sent: '\u5df2\u53d1TPA',
        transport_failed: '\u8fd0\u8f93\u5931\u8d25',
        completed: '\u5df2\u5b8c\u6210',
        failed: '\u5931\u8d25'
    };
    return map[stage] || stage || '\u672a\u77e5';
}

function renderPickupLogs(logs) {
    const list = document.getElementById('pickup-log-list');
    if (!list) return;
    if (!logs.length) {
        list.innerHTML = '<div class="empty-state">暂无取货记录</div>';
        return;
    }
    list.innerHTML = logs.map(log => {
        const statusClass = ['completed', 'failed', 'queued'].includes(log.stage) ? log.stage : '';
        const time = log.time ? new Date(log.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
        return `
            <div class="pickup-log-row" title="${escapeAttr(log.error || '')}">
                <div class="pickup-log-player">${escapeHtml(log.playerName || 'unknown')} · ${escapeHtml(time)}</div>
                <div class="pickup-log-item">${escapeHtml(log.itemName || '-')} × ${Number(log.quantity || 0)}</div>
                <div class="pickup-log-status ${statusClass}">${escapeHtml(pickupStageText(log.stage))}</div>
            </div>
        `;
    }).join('');
}

async function loadUserInfo() {
    if (!token) return;
    const data = await api('/api/user/info', { headers: authHeaders() });
    if (data.success) {
        currentUser = data.user;
        document.getElementById('profile-username').textContent = currentUser.username || '-';
        document.getElementById('profile-created').textContent = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('zh-CN') : '-';
    }
}

async function loadBoundAccounts() {
    if (!token) return;
    const data = await api('/api/user/bind/list', { headers: authHeaders() });
    if (!data.success) return;
    boundAccounts = data.accounts || [];
    const select = document.getElementById('account-select');
    const hint = document.getElementById('no-account-hint');
    select.innerHTML = '<option value="">请选择游戏账号</option>';
    boundAccounts.forEach(account => {
        const name = typeof account === 'string' ? account : account.username;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    hint.style.display = boundAccounts.length ? 'none' : 'inline';
    if (!currentAccount && boundAccounts.length) {
        currentAccount = typeof boundAccounts[0] === 'string' ? boundAccounts[0] : boundAccounts[0].username;
    }
    select.value = currentAccount;
    renderBoundAccountsList();
}

function renderBoundAccountsList() {
    const list = document.getElementById('bound-accounts-list');
    if (!boundAccounts.length) {
        list.innerHTML = '<div class="empty-state">暂无绑定账号</div>';
        return;
    }
    list.innerHTML = boundAccounts.map(account => {
        const name = typeof account === 'string' ? account : account.username;
        const uuid = typeof account === 'object' && account.uuid ? account.uuid : '未知';
        const town = typeof account === 'object' && account.town ? account.town : '未知';
        return `
            <div class="account-item">
                <div style="text-align:left;">
                    <div class="account-name">${escapeHtml(name)}</div>
                    <div class="subtext">UUID：${escapeHtml(uuid)} · 小镇：${escapeHtml(town)}</div>
                </div>
                <button class="unbind-btn" onclick="unbindAccount('${escapeAttr(name)}')">解绑</button>
            </div>
        `;
    }).join('');
}

function updateSelectedAccount() {
    currentAccount = document.getElementById('account-select').value;
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    currentAccount = '';
    boundAccounts = [];
    closeModal();
    document.getElementById('shop-page').classList.add('section-hidden');
    document.getElementById('login-page').classList.remove('section-hidden');
    showTab('account-login');
}

async function generateBindCode() {
    const data = await api('/api/user/bind/generate', {
        method: 'POST',
        headers: authHeaders()
    });
    if (data.success) {
        currentBindCode = data.code;
        document.getElementById('bind-code-display').textContent = data.code;
        document.getElementById('bind-step1').classList.add('section-hidden');
        document.getElementById('bind-step2').classList.remove('section-hidden');
        setStatus('bind-status', '等待游戏内发送验证码...', '');
        startBindPolling();
    } else {
        setStatus('bind-status', data.error || '生成验证码失败', 'error');
    }
}

function cancelBind(clearCode = true) {
    stopBindPolling();
    document.getElementById('bind-step1')?.classList.remove('section-hidden');
    document.getElementById('bind-step2')?.classList.add('section-hidden');
    document.getElementById('bind-game-username').value = '';
    setStatus('bind-status', '');
    if (clearCode) currentBindCode = '';
}

function startBindPolling() {
    stopBindPolling();
    bindPollInterval = setInterval(async () => {
        const before = boundAccounts.map(account => typeof account === 'string' ? account : account.username).join('|');
        await loadBoundAccounts();
        const after = boundAccounts.map(account => typeof account === 'string' ? account : account.username).join('|');
        if (after && after !== before) {
            stopBindPolling();
            setStatus('bind-status', '绑定成功', 'success');
            setTimeout(() => cancelBind(), 700);
        }
    }, 2000);
}

function stopBindPolling() {
    if (bindPollInterval) clearInterval(bindPollInterval);
    bindPollInterval = null;
}

async function verifyBind() {
    const gameUsername = (document.getElementById('bind-game-username').value.trim() || currentAccount || (currentUser && currentUser.username) || '').trim();
    if (!gameUsername) {
        setStatus('bind-status', '请输入游戏用户名', 'error');
        return;
    }
    const data = await api('/api/user/bind/verify', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code: currentBindCode, gameUsername })
    });
    if (data.success) {
        stopBindPolling();
        setStatus('bind-status', '绑定成功', 'success');
        setTimeout(async () => {
            cancelBind();
            await loadBoundAccounts();
        }, 800);
    } else {
        setStatus('bind-status', data.error || '绑定失败', 'error');
    }
}

async function unbindAccount(accountName) {
    if (!confirm(`确定解绑 ${accountName} 吗？`)) return;
    const data = await api('/api/user/bind/unbind', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: accountName })
    });
    if (data.success) {
        if (currentAccount === accountName) currentAccount = '';
        await loadBoundAccounts();
    } else {
        alert(data.error || '解绑失败');
    }
}

async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    if (!oldPassword || !newPassword || !confirmPassword) {
        setStatus('pwd-status', '请填写所有字段', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        setStatus('pwd-status', '两次输入的新密码不一致', 'error');
        return;
    }
    const data = await api('/api/user/change-password', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ oldPassword, newPassword })
    });
    if (data.success) {
        setStatus('pwd-status', '密码修改成功', 'success');
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
    } else {
        setStatus('pwd-status', data.error || '修改失败', 'error');
    }
}

async function loadItems() {
    const res = await fetch(`${API_URL}/api/warehouse`);
    const data = await res.json();
    latestItems = Array.isArray(data) ? data : (data.items || []);
    renderItems(latestItems);
}

function getIconUrl(itemName) {
    const clean = String(itemName || '').toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_');
    return `https://blocksitems.com/api/v1/items/minecraft:${encodeURIComponent(clean)}/icon`;
}

function getShulkerContents(item) {
    return Array.isArray(item?.shulkerContents) ? item.shulkerContents.filter(entry => entry && entry.name) : [];
}

function renderShulkerPreview(item) {
    const contents = getShulkerContents(item);
    if (!contents.length) return '';
    const title = contents.map(entry => `${entry.displayName || entry.name} x${Number(entry.count || 1)}`).join('，');
    const miniIcons = contents.slice(0, 4).map(entry => `
        <span class="shulker-mini-item" title="${escapeAttr(entry.displayName || entry.name)} x${Number(entry.count || 1)}">
            <img src="${getIconUrl(entry.name)}" alt="${escapeAttr(entry.displayName || entry.name)}" onerror="this.remove()">
        </span>
    `).join('');
    const extra = contents.length > 4 ? `<span class="shulker-mini-more">+${contents.length - 4}</span>` : '';
    return `<div class="shulker-preview" title="${escapeAttr(title)}">${miniIcons}${extra}</div>`;
}

function renderShulkerSummary(item) {
    const contents = getShulkerContents(item);
    if (!contents.length) return '';
    const summary = contents.slice(0, 3).map(entry => `${entry.displayName || entry.name}×${Number(entry.count || 1)}`).join('、');
    const suffix = contents.length > 3 ? ` 等 ${contents.length} 种` : '';
    return `<span class="product-shulker-summary" title="${escapeAttr(contents.map(entry => `${entry.displayName || entry.name} x${Number(entry.count || 1)}`).join('，'))}">盒内：${escapeHtml(summary + suffix)}</span>`;
}

function renderBulkSummary(item) {
    if (!item?.bulk?.isBulk) return '';
    const loose = Number(item.bulk.looseStock || 0);
    const boxed = Number(item.bulk.boxedStock || 0);
    const threshold = Number(item.bulk.boxThreshold || (Number(item.stackSize || 64) * 27));
    const boxCount = threshold > 0 ? Math.floor(boxed / threshold) : 0;
    return `<span class="product-shulker-summary bulk-summary">大宗：散装 ${loose}，盒装 ${boxCount} 盒</span>`;
}

function fallbackIcon() {
    return `<svg class="placeholder-icon" viewBox="0 0 24 24" fill="none"><path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5v-9Z" fill="currentColor" opacity=".9"/><path d="M4 8.5 12 13l8-4.5M12 13v9" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function normalizeSearchText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/^minecraft:/, '')
        .normalize('NFKD')
        .replace(/[^\p{Script=Han}a-z0-9]+/gu, '');
}

function getItemKey(item) {
    return String(item?.name || '').toLowerCase().replace(/^minecraft:/, '');
}

function normalizeDisplayName(item) {
    const raw = String(item?.displayName || '').trim();
    const translateCustomText = (value) => String(value || '')
        .replace(/^1\.\d+(?:\.\d+)?\s+Pale Oak Stairs$/i, '苍白橡木楼梯')
        .replace(/^1\.\d+(?:\.\d+)?\s+Pale Oak Slab$/i, '苍白橡木台阶')
        .replace(/^1\.\d+(?:\.\d+)?\s+Pale Oak Planks$/i, '苍白橡木木板')
        .replace(/^1\.\d+(?:\.\d+)?\s+Pale Oak Log$/i, '苍白橡木原木')
        .replace(/^1\.\d+(?:\.\d+)?\s+Pale Oak Wood$/i, '苍白橡木')
        .replace(/^Pale Oak Stairs$/i, '苍白橡木楼梯')
        .replace(/^Pale Oak Slab$/i, '苍白橡木台阶')
        .replace(/^Pale Oak Planks$/i, '苍白橡木木板')
        .replace(/^Pale Oak Log$/i, '苍白橡木原木')
        .replace(/^Pale Oak Wood$/i, '苍白橡木');
    if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
                return translateCustomText(parsed.text.trim());
            }
        } catch {}
        return item?.name || raw;
    }
    return translateCustomText(raw) || item?.name || '';
}

function getItemCategoryIds(item) {
    const name = getItemKey(item);
    return ITEM_CATEGORY_DEFS.filter(category => category.id !== 'all' && category.match(name, item)).map(category => category.id);
}

function getItemSearchText(item) {
    const name = getItemKey(item);
    const words = name.split('_').filter(Boolean);
    const categoryAliases = getItemCategoryIds(item)
        .flatMap(id => {
            const category = ITEM_CATEGORY_DEFS.find(entry => entry.id === id);
            return category ? [category.label, ...category.aliases] : [];
        });
    const wordPinyin = words.map(word => ITEM_WORD_PINYIN[word] || '').filter(Boolean);
    const displayName = normalizeDisplayName(item);
    const displayPinyin = displayNameToPinyinAliases(displayName);
    const shulkerPinyin = getShulkerContents(item).flatMap(entry => displayNameToPinyinAliases(entry.displayName || entry.name));
    const compactWordPinyin = wordPinyin.join('');
    return [
        displayName,
        item?.name,
        ...getShulkerContents(item).flatMap(entry => [entry.name, entry.displayName]),
        name,
        words.join(' '),
        words.join(''),
        ...categoryAliases,
        ...wordPinyin,
        ...displayPinyin,
        ...shulkerPinyin,
        displayPinyin.join(''),
        shulkerPinyin.join(''),
        compactWordPinyin,
        normalizeSearchText(compactWordPinyin)
    ].map(normalizeSearchText).join(' ');
}

function isContainerItem(item) {
    const name = getItemKey(item);
    return name.endsWith('shulker_box') || name === 'chest' || name === 'barrel';
}

function sortItemsForDisplay(items, categoryId, search = '') {
    const list = Array.isArray(items) ? [...items] : [];
    return list.sort((a, b) => {
        const aRank = getItemSearchRank(a, search);
        const bRank = getItemSearchRank(b, search);
        if (aRank !== bRank) return aRank - bRank;

        const aBulk = a?.bulk?.isBulk ? 2 : 0;
        const bBulk = b?.bulk?.isBulk ? 2 : 0;
        const aContainer = isContainerItem(a) ? 1 : 0;
        const bContainer = isContainerItem(b) ? 1 : 0;
        if (!categoryId || categoryId === 'all') {
            const aGroup = aBulk || aContainer;
            const bGroup = bBulk || bContainer;
            if (aGroup !== bGroup) return aGroup - bGroup;
        }
        const aName = normalizeDisplayName(a) || getItemKey(a);
        const bName = normalizeDisplayName(b) || getItemKey(b);
        return aName.localeCompare(bName, 'zh-Hans-CN');
    });
}

function itemMatchesCategory(item, categoryId) {
    if (!categoryId || categoryId === 'all') return true;
    const category = ITEM_CATEGORY_DEFS.find(entry => entry.id === categoryId);
    return Boolean(category && category.match(getItemKey(item), item));
}

function itemMatchesSearch(item, search) {
    const normalizedSearch = normalizeSearchText(search);
    return !normalizedSearch || getItemSearchText(item).includes(normalizedSearch);
}

function getItemSearchRank(item, search) {
    const normalizedSearch = normalizeSearchText(search);
    if (!normalizedSearch) return 100;

    const displayName = normalizeSearchText(normalizeDisplayName(item));
    const itemKey = normalizeSearchText(getItemKey(item));
    const searchText = getItemSearchText(item);

    if (displayName === normalizedSearch || itemKey === normalizedSearch) return 0;
    if (displayName.startsWith(normalizedSearch) || itemKey.startsWith(normalizedSearch)) return 1;
    if (displayName.includes(normalizedSearch) || itemKey.includes(normalizedSearch)) return 2;
    if (searchText.includes(normalizedSearch)) return 3;
    return 9;
}

function renderCategoryFilters(items) {
    const container = document.getElementById('item-category-filter');
    if (!container) return;
    const list = Array.isArray(items) ? items : [];
    container.innerHTML = ITEM_CATEGORY_DEFS.map(category => {
        const count = category.id === 'all'
            ? list.length
            : list.filter(item => itemMatchesCategory(item, category.id)).length;
        const active = activeItemCategory === category.id ? ' active' : '';
        return `<button class="category-chip${active}" type="button" onclick="setItemCategory('${category.id}')">${escapeHtml(category.label)}<span>${count}</span></button>`;
    }).join('');
}

function setItemCategory(categoryId) {
    activeItemCategory = ITEM_CATEGORY_DEFS.some(category => category.id === categoryId) ? categoryId : 'all';
    renderItems(latestItems);
}

function renderItems(items) {
    const grid = document.getElementById('products-grid');
    const search = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    document.body.classList.toggle('town-mode', shopServerInfo.warehouseMode === 'TOWN_ONLY');
    renderCategoryFilters(items);
    const filtered = sortItemsForDisplay((items || []).filter(item => {
        return itemMatchesCategory(item, activeItemCategory) && itemMatchesSearch(item, search);
    }), activeItemCategory, search);

    if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state">没有找到可显示的物品</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const displayName = normalizeDisplayName(item);
        const stock = Number(item.stock || 0);
        const isPublic = item.public !== false;
        const storageType = isPublic ? '公共' : '私有';
        const actionText = isPublic ? '领取' : '取出';
        const priceHtml = shopServerInfo.showPrice ? `<span class="product-price">${Number(item.price || 0)}</span>` : '';
        return `
            <div class="product-card">
                <div class="product-icon">
                    <img src="${getIconUrl(item.name)}" alt="${escapeAttr(displayName)}" onerror="this.parentElement.innerHTML='${fallbackIcon().replace(/'/g, '&apos;')}'">
                    ${renderShulkerPreview(item)}
                </div>
                <div class="product-main">
                    <span class="product-name" title="${escapeAttr(displayName)}">${escapeHtml(displayName)}</span>
                    <span class="product-id" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
                    ${renderShulkerSummary(item)}
                    ${renderBulkSummary(item)}
                    <div class="product-meta">
                        <span class="storage-badge ${isPublic ? 'public' : 'private'}">${storageType}</span>
                        <span class="product-stock ${stock <= 5 ? 'low' : ''}">库存：${stock}</span>
                    </div>
                </div>
                <div class="product-action">
                    ${priceHtml}
                    <button class="btn-primary-sm" onclick="handleClaim('${escapeAttr(item.name)}', ${stock}, ${isPublic})" ${stock <= 0 ? 'disabled' : ''}>${actionText}</button>
                </div>
            </div>
        `;
    }).join('');
}

function getItemStackLimit(item) {
    const stackSize = Number(item?.stackSize || 64);
    if (Number.isFinite(stackSize) && stackSize > 0) return stackSize;
    const name = String(item?.name || '').replace(/^minecraft:/, '');
    if (name.endsWith('shulker_box')) return 1;
    return 64;
}

function getItemClaimLimit(item, stock) {
    const fromApi = Number(item?.maxClaimQuantity || 0);
    const fallback = getItemStackLimit(item) * 27;
    const limit = fromApi > 0 ? fromApi : fallback;
    return Math.max(1, Math.min(Number(stock || 0), limit));
}

function handleClaim(itemName, stock, isPublic) {
    if (!currentAccount) {
        alert('请先选择一个游戏账号');
        return;
    }
    const item = latestItems.find(entry => entry.name === itemName) || { name: itemName, stock, public: isPublic };
    const info = document.getElementById('claim-item-info');
    info.innerHTML = `
        <div class="name">${escapeHtml(item.displayName || item.name)}</div>
        <div class="stock">\u5e93\u5b58\uff1a${stock} \u00b7 \u672c\u6b21\u6700\u591a\uff1a${getItemClaimLimit(item, stock)}</div>
    `;
    info.dataset.itemName = item.name;
    info.dataset.public = String(isPublic);
    document.getElementById('claim-account').textContent = currentAccount;
    const quantity = document.getElementById('claim-quantity');
    quantity.value = 1;
    quantity.max = getItemClaimLimit(item, stock);
    quantity.dataset.claimLimit = String(getItemClaimLimit(item, stock));
    setStatus('claim-status', '');
    document.getElementById('claim-modal').classList.add('active');
}

async function confirmClaim() {
    const info = document.getElementById('claim-item-info');
    const itemName = info.dataset.itemName;
    const isPublic = info.dataset.public === 'true';
    const quantityEl = document.getElementById('claim-quantity');
    const quantity = parseInt(quantityEl.value, 10);
    const max = parseInt(quantityEl.max, 10);
    const claimLimit = parseInt(quantityEl.dataset.claimLimit || max || 1728, 10);
    if (!quantity || quantity < 1) {
        setStatus('claim-status', '请输入有效数量', 'error');
        return;
    }
    if (claimLimit && quantity > claimLimit) {
        setStatus('claim-status', `\u6bcf\u6b21\u6700\u591a\u53ea\u80fd\u9886\u53d6 27 \u7ec4\uff1a${claimLimit} \u4e2a`, 'error');
        return;
    }
    if (max && quantity > max) {
        setStatus('claim-status', `\u6570\u91cf\u4e0d\u80fd\u8d85\u8fc7\u5e93\u5b58 ${max}`, 'error');
        return;
    }
    const data = await api(isPublic ? '/api/user/claim' : '/api/user/withdraw', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ itemName, quantity, gameUsername: currentAccount })
    });
    if (data.success) {
        setStatus('claim-status', isPublic ? '领取成功，Bot 正在准备物品' : '取出成功', 'success');
        setTimeout(() => {
            closeModal();
            loadItems();
            loadPickupLogs();
        }, 900);
    } else {
        setStatus('claim-status', data.error || '操作失败', 'error');
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

async function checkAuth() {
    await initAPI();
    if (token) {
        try {
            const data = await api('/api/user/info', { headers: authHeaders() });
            if (data.success) {
                currentUser = data.user;
                await loadShopPage();
                return;
            }
        } catch {}
    }
    document.getElementById('login-page').classList.remove('section-hidden');
    document.getElementById('shop-page').classList.add('section-hidden');
    showTab('account-login');
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('search-input')?.addEventListener('input', () => renderItems(latestItems));
    await initAPI();
    await checkAuth();
    setTimeout(initSocket, 250);
});
