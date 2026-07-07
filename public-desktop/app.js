const Icons = {
    explorer: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="14" rx="2" fill="#0078d4"/><rect x="4" y="8" width="16" height="10" rx="1" fill="#1e3a5f"/><rect x="4" y="8" width="16" height="3" rx="1" fill="#0099ff"/><rect x="6" y="13" width="4" height="5" rx="1" fill="#2d4a6f"/><rect x="12" y="13" width="6" height="2" rx="1" fill="#2d4a6f"/><rect x="12" y="17" width="4" height="1" rx="0.5" fill="#2d4a6f"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#1e3a5f" stroke="#0078d4" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="#0078d4" opacity="0.2"/><circle cx="8" cy="10" r="2" fill="#00bcf2"/><circle cx="16" cy="10" r="2" fill="#00bcf2"/><circle cx="8" cy="10" r="0.8" fill="white"/><circle cx="16" cy="10" r="0.8" fill="white"/><path d="M9 16 Q12 18 15 16" fill="none" stroke="#00bcf2" stroke-width="2" stroke-linecap="round"/><rect x="5" y="19" width="3" height="2" rx="1" fill="#0078d4"/><rect x="16" y="19" width="3" height="2" rx="1" fill="#0078d4"/></svg>`,
    transport: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="16" height="10" rx="2" fill="#f59e0b"/><rect x="6" y="10" width="12" height="6" rx="1" fill="#d97706"/><rect x="8" y="5" width="8" height="4" rx="1" fill="#b45309"/><path d="M5 18 L5 20 Q5 21 6 21 L18 21 Q19 21 19 20 L19 18" fill="#78350f"/><circle cx="7" cy="22" r="2" fill="#1e293b"/><circle cx="17" cy="22" r="2" fill="#1e293b"/><rect x="10" y="12" width="4" height="2" rx="1" fill="#fbbf24"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="#0078d4"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" fill="#64748b"/></svg>`,
    shop: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="18" height="14" rx="2" fill="#0078d4"/><rect x="5" y="10" width="14" height="10" rx="1" fill="#1e3a5f"/><path d="M3 8 L8 3 L16 3 L21 8" fill="#0099ff"/><circle cx="8" cy="16" r="2" fill="#fbbf24"/><circle cx="16" cy="16" r="2" fill="#fbbf24"/><rect x="10" y="14" width="4" height="4" rx="1" fill="#00bcf2"/></svg>`,
    terminal: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#0d1117"/><rect x="4" y="6" width="16" height="12" rx="1" fill="#161b22"/><rect x="4" y="6" width="16" height="3" rx="1" fill="#21262d"/><path d="M6 12 L9 12" stroke="#56d364" stroke-width="1.5" stroke-linecap="round"/><path d="M6 15 L12 15" stroke="#56d364" stroke-width="1.5" stroke-linecap="round"/><path d="M6 18 L15 18" stroke="#58a6ff" stroke-width="1.5" stroke-linecap="round"/><circle cx="18" cy="8" r="1" fill="#30363d"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="#0078d4"/></svg>`,
    file: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#64748b"/></svg>`,
    file_js: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="2" fill="#f7df1e"/><rect x="4" y="4" width="16" height="16" rx="1" fill="#222"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#f7df1e">JS</text></svg>`,
    file_json: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="2" fill="#222"/><rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#0078d4" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#0078d4">JSON</text></svg>`,
    file_png: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="2" fill="#a855f7"/><rect x="4" y="4" width="16" height="16" rx="1" fill="#7c3aed"/><circle cx="12" cy="12" r="4" fill="#c084fc"/></svg>`,
    file_txt: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="2" fill="#222"/><rect x="4" y="4" width="16" height="16" rx="1" fill="#333"/><line x1="6" y1="8" x2="18" y2="8" stroke="#64748b" stroke-width="1"/><line x1="6" y1="11" x2="18" y2="11" stroke="#64748b" stroke-width="1"/><line x1="6" y1="14" x2="14" y2="14" stroke="#64748b" stroke-width="1"/><line x1="6" y1="17" x2="12" y2="17" stroke="#64748b" stroke-width="1"/></svg>`,
    file_zip: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="16" height="14" rx="1" fill="#ef4444"/><rect x="8" y="2" width="8" height="5" fill="#fca5a5"/><path d="M8 8h8v10H8z" fill="none" stroke="#b91c1c" stroke-width="1.5"/><line x1="10" y1="5" x2="10" y2="9" stroke="#b91c1c" stroke-width="1.5"/><line x1="14" y1="5" x2="14" y2="9" stroke="#b91c1c" stroke-width="1.5"/></svg>`,
    back: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="#64748b"/></svg>`,
    forward: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="#64748b"/></svg>`,
    up: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" fill="#64748b"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="#64748b"/></svg>`,
    minimize: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h12v-2H6v2zM6 5v2h12V5H6z" fill="#64748b"/></svg>`,
    maximize: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v18H3V3zm16 16H5V5h14v14z" fill="#64748b"/></svg>`,
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#64748b"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#64748b"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#64748b"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-5v5h-4v-5H5l7-7 7 7z" fill="#64748b"/></svg>`,
    download: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="#22c55e"/></svg>`,
    search: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#64748b"/></svg>`,
    computer: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="14" rx="2" fill="#334155"/><rect x="4" y="6" width="16" height="10" rx="1" fill="#1e293b"/><rect x="9" y="19" width="6" height="2" rx="1" fill="#64748b"/><rect x="7" y="21" width="10" height="1.5" rx="0.75" fill="#475569"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="#64748b"/></svg>`,
    user: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#64748b"/></svg>`,
    users: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm8 0c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#64748b"/></svg>`,
    desktop: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="14" rx="2" fill="#0078d4"/><rect x="4" y="6" width="16" height="10" rx="1" fill="#1e3a5f"/><path d="M6 10h4v4H6zm6 0h4v4h-4zm-6 6h4v2H6zm6 0h4v2h-4z" fill="#00bcf2"/></svg>`,
    harddrive: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" fill="#334155"/><rect x="5" y="7" width="14" height="10" rx="1" fill="#1e293b"/><rect x="5" y="7" width="14" height="3" rx="1" fill="#475569"/><rect x="7" y="12" width="10" height="1" fill="#475569"/><rect x="7" y="14" width="8" height="1" fill="#475569"/><rect x="7" y="16" width="6" height="1" fill="#475569"/></svg>`
};

const windows = {};
let windowZIndex = 100;
let currentPath = '/';
let socket;
let transportBots = [];
let selectedFiles = [];
let authToken = localStorage.getItem('authToken') || null;
let loginModalVisible = false;
let authChecking = false;
let ccServerMode = 'cloud';
let isLocalServer = false;
let mainBotConfig = {};
const consoleState = {
    lines: [],
    latestMainLogin: null,
    latestTransportLogins: {}
};

function formatConsoleLine(entry) {
    return `[${entry.time}] ${entry.type.toUpperCase()} ${entry.content}`;
}

function stripAnsi(text) {
    return String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function appendConsoleLine(content, type = 'info') {
    const entry = {
        time: new Date().toLocaleTimeString('zh-CN'),
        type,
        content: stripAnsi(content)
    };
    consoleState.lines.push(entry);
    while (consoleState.lines.length > 500) consoleState.lines.shift();

    const output = document.getElementById('terminalOutput');
    if (output) {
        output.textContent += formatConsoleLine(entry) + '\n';
        output.scrollTop = output.scrollHeight;
    }
}

function renderConsoleOutput() {
    const output = document.getElementById('terminalOutput');
    if (!output) return;
    const header = 'AnyunOS 控制台\n版本 2.0.0\n输入 help 查看命令；Bot 登录 URL 会自动显示在这里。\n\n';
    output.textContent = header + consoleState.lines.map(formatConsoleLine).join('\n') + (consoleState.lines.length ? '\n' : '');
    output.scrollTop = output.scrollHeight;
}

function normalizeMicrosoftLogin(data = {}) {
    const source = typeof data === 'string' ? { message: data } : (data || {});
    const rawText = typeof data === 'string' ? data : JSON.stringify(source);
    let parsed = null;
    if (typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch {}
        if (!parsed) {
            const start = data.indexOf('{');
            const end = data.lastIndexOf('}');
            if (start !== -1 && end > start) {
                try { parsed = JSON.parse(data.slice(start, end + 1)); } catch {}
            }
        }
    }
    const payload = parsed || source;
    const text = String(payload.message || payload.loginMessage || rawText || '').replace(/\\u0026/g, '&');
    const rawUrl = String(
        payload.verification_uri_complete
        || payload.verificationUriComplete
        || payload.url
        || payload.verificationUrl
        || (text.match(/https?:\/\/(?:www\.)?microsoft\.com\/link[^\s"'<>]*/i)?.[0] || '')
        || payload.verification_uri
        || payload.verificationUri
        || 'https://www.microsoft.com/link'
    ).trim().replace(/\\u0026/g, '&').replace(/[),.;，。]+$/g, '');
    const codeFromUrl = rawUrl.match(/[?&]otc=([A-Z0-9-]+)/i)?.[1] || '';
    const codeFromText = text.match(/"(?:user_code|userCode|code|otc)"\s*:\s*"([^"]+)"/i)?.[1]
        || text.match(/\[LOGIN_CODE\]\s*([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || text.match(/(?:enter|use)\s+the\s+code\s+([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || text.match(/(?:verification|user)\s+code\s*[:：]?\s*([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || '';
    const code = String(payload.code || payload.user_code || payload.userCode || payload.otc || codeFromUrl || codeFromText || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return { url: rawUrl || 'https://www.microsoft.com/link', code, message: text };
}

function rememberLoginUrl(kind, label, data) {
    const normalized = normalizeMicrosoftLogin(data);
    const login = {
        label,
        url: normalized.url,
        code: normalized.code,
        time: new Date().toLocaleString('zh-CN')
    };
    if (kind === 'main') {
        consoleState.latestMainLogin = login;
    } else {
        consoleState.latestTransportLogins[label] = login;
    }
    appendConsoleLine(`${label} 登录：打开 ${login.url}，输入验证码 ${login.code || '无'}。不要使用带 %20 的整句链接。`, 'login');
    renderLoginPanel();
}

function renderLoginPanel() {
    const panel = document.getElementById('terminalLoginPanel');
    if (!panel) return;
    const rows = [];
    if (consoleState.latestMainLogin) rows.push(consoleState.latestMainLogin);
    rows.push(...Object.values(consoleState.latestTransportLogins));

    if (!rows.length) {
        panel.innerHTML = '<div style="color:#94a3b8;">暂无登录 URL。启动主 Bot 或运输 Bot 后会自动显示。</div>';
        return;
    }

    panel.innerHTML = rows.map(item => `
        <div style="padding:10px 12px;margin-bottom:8px;border:1px solid rgba(59,130,246,.35);border-radius:10px;background:rgba(15,23,42,.72);">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:6px;">
                <strong style="color:#e0f2fe;">${escapeHtml(item.label)}</strong>
                <span style="color:#94a3b8;font-size:12px;">${escapeHtml(item.time)}</span>
            </div>
            <div style="font-family:Consolas,monospace;color:#bfdbfe;word-break:break-all;margin-bottom:8px;">${escapeHtml(item.url)}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <span style="font-family:Consolas,monospace;color:#fbbf24;">验证码：${escapeHtml(item.code || '无')}</span>
                <button class="btn btn-primary btn-sm terminal-copy-url" data-copy="${escapeHtml(item.url)}">复制链接</button>
                <button class="btn btn-info btn-sm terminal-copy-code" data-copy="${escapeHtml(item.code || '')}" ${item.code ? '' : 'disabled'}>复制验证码</button>
                <a class="btn btn-success btn-sm" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开登录</a>
            </div>
        </div>
    `).join('');

    panel.querySelectorAll('[data-copy]').forEach(btn => {
        btn.onclick = () => copyConsoleText(btn.dataset.copy || '');
    });
}

function hydrateConsoleStatus(data) {
    if (!data?.success) return;
    if (data.mainBotLoginUrl?.url) {
        const normalized = normalizeMicrosoftLogin(data.mainBotLoginUrl);
        consoleState.latestMainLogin = {
            label: '主Bot',
            url: normalized.url,
            code: normalized.code,
            time: data.mainBotLoginUrl.time ? new Date(data.mainBotLoginUrl.time).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')
        };
    }
    Object.entries(data.transportBotLoginUrls || {}).forEach(([botId, login]) => {
        if (!login?.url) return;
        const normalized = normalizeMicrosoftLogin(login);
        consoleState.latestTransportLogins[`运输Bot ${botId}`] = {
            label: `运输Bot ${botId}`,
            url: normalized.url,
            code: normalized.code,
            time: login.time ? new Date(login.time).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')
        };
    });
    (data.botLogs || []).slice(-80).forEach(line => {
        if (!line) return;
        const text = stripAnsi(line);
        if (!consoleState.lines.some(item => item.content === text)) {
            consoleState.lines.push({
                time: new Date().toLocaleTimeString('zh-CN'),
                type: text.includes('错误') || text.includes('Error') ? 'error' : 'bot',
                content: text
            });
        }
    });
    while (consoleState.lines.length > 500) consoleState.lines.shift();
    renderConsoleOutput();
    renderLoginPanel();
}

function copyConsoleText(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => appendConsoleLine('已复制到剪贴板', 'info')).catch(() => fallbackCopyConsoleText(text));
    } else {
        fallbackCopyConsoleText(text);
    }
}

function copyTerminalOutput() {
    const output = document.getElementById('terminalOutput');
    const text = output?.textContent || consoleState.lines.map(formatConsoleLine).join('\n');
    copyConsoleText(text);
}

function fallbackCopyConsoleText(text) {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    appendConsoleLine('已复制到剪贴板', 'info');
}

function bootSystem() {
    if (window.location.protocol === 'file:') {
        document.body.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e17;color:#f1f5f9;font-family:'Microsoft YaHei','Segoe UI',sans-serif;padding:24px;">
                <div style="max-width:620px;background:rgba(20,28,47,.96);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:28px;box-shadow:0 18px 60px rgba(0,0,0,.45);">
                    <div style="font-size:24px;font-weight:800;margin-bottom:12px;">请通过服务地址打开后台</div>
                    <div style="line-height:1.8;color:#cbd5e1;">这个页面不能直接用 file:// 打开，否则登录、更新、文件管理都无法形成闭环。</div>
                    <div style="margin-top:16px;padding:14px;border-radius:12px;background:rgba(0,120,212,.12);color:#93c5fd;">
                        先在项目目录运行 <b>node server.js</b>，然后打开后台管理入口。
                    </div>
                    <div style="margin-top:12px;color:#94a3b8;font-size:13px;">商城端口是前端服务；后台管理入口只给管理员使用，不应放到公开页面。</div>
                </div>
            </div>`;
        return;
    }

    const bootScreen = document.getElementById('bootScreen');
    const progress = document.getElementById('bootProgress');
    const status = document.getElementById('bootStatus');
    const desktop = document.getElementById('desktop');
    
    const messages = [
        '正在加载核心模块...',
        '初始化网络连接...',
        '加载Bot管理系统...',
        '启动文件服务...',
        '准备就绪'
    ];
    
    let step = 0;
    const interval = setInterval(() => {
        step++;
        const percent = Math.min(step * 25, 100);
        progress.style.width = percent + '%';
        
        if (step <= messages.length) {
            status.textContent = messages[step - 1];
        }
        
        if (step >= 4) {
            clearInterval(interval);
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                desktop.classList.add('visible');
                initIcons();
                checkAuth();
                detectServerType();
            }, 600);
        }
    }, 400);
}

function initSocket() {
    if (socket) return;
    if (!authToken) return;
    socket = io({
        auth: { token: authToken }
    });

    socket.on('connect_error', (err) => {
        if (String(err?.message || '').toLowerCase().includes('unauthorized')) {
            appendConsoleLine('后台实时连接认证失败，请重新登录。', 'error');
            socket?.disconnect();
            socket = null;
            return;
        }
        appendConsoleLine(`后台实时连接失败：${err?.message || '未知错误'}`, 'error');
    });
    
    socket.on('mainBotState', (data) => {
        botStatus = data.status || 'offline';
        botPosition = data.position ? `(${data.position.x}, ${data.position.y}, ${data.position.z})` : '未知';
        botHealth = data.health || 0;
        botFood = data.food || 0;
        updateMineflayerUI();
    });
    
    socket.on('scanComplete', () => {
        scanProgress = 100;
        scanStatus = '扫描完成';
        updateSystemStatusBanner({ scanning: false, scanMessage: '扫描完成' });
        updateMineflayerUI();
    });

    socket.on('systemStatus', (status) => {
        updateSystemStatusBanner(status);
    });
    
    socket.on('botLog', (data) => {
        const content = typeof data === 'object' ? data.content : data;
        appendConsoleLine(content, data?.type || 'bot');
        const logs = document.getElementById('botLogs');
        if (logs) {
            const line = document.createElement('div');
            line.className = 'log-line';
            const time = new Date().toLocaleTimeString();
            const cleanContent = stripAnsi(content);
            const isError = cleanContent && (cleanContent.startsWith('[错误]') || cleanContent.includes('Error'));
            const timeSpan = document.createElement('span');
            timeSpan.className = 'log-time';
            timeSpan.textContent = `[${time}] `;
            const contentSpan = document.createElement('span');
            contentSpan.className = isError ? 'log-error' : 'log-info';
            contentSpan.textContent = cleanContent;
            line.appendChild(timeSpan);
            line.appendChild(contentSpan);
            logs.appendChild(line);
            logs.scrollTop = logs.scrollHeight;
            if (logs.children.length > 500) {
                logs.removeChild(logs.firstChild);
            }
        }
    });
    
    socket.on('warehouseUpdate', () => {
        if (windows['shop']) {
            refreshShop();
        }
    });

    socket.on('pickupLog', () => {
        if (document.getElementById('pickupStatsPanel')) loadPickupStatsPanel();
    });
    
    socket.on('transportBotLoginUrl', (data) => {
        if (data?.cleared) {
            delete consoleState.latestTransportLogins[`运输Bot ${data.botId}`];
            appendConsoleLine(`运输Bot ${data.botId} 已进入服务器，登录 URL 已隐藏`, 'status');
            renderLoginPanel();
            loadTransportBots();
            return;
        }
        const login = normalizeMicrosoftLogin(data);
        rememberLoginUrl('transport', `运输Bot ${data.botId}`, login);
        showModal(`运输Bot登录 - ${data.botId}`, `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:14px;color:#64748b;margin-bottom:16px;">请打开 Microsoft 登录页，并手动输入下面的验证码</div>
                <a href="${escapeHtml(login.url)}" target="_blank" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0078d4,#00bcf2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">打开登录链接</a>
                <div style="margin-top:14px;padding:10px;background:rgba(59,130,246,0.08);border-radius:8px;font-family:monospace;font-size:12px;color:#bfdbfe;word-break:break-all;text-align:left;">${escapeHtml(login.url)}</div>
                <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;font-family:monospace;font-size:14px;color:#fbbf24;">验证码：${escapeHtml(login.code || '无')}</div>
                <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
                    <button class="btn btn-primary btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(login.url)}">复制链接</button>
                    <button class="btn btn-info btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(login.code || '')}" ${login.code ? '' : 'disabled'}>复制验证码</button>
                </div>
            </div>
        `, [
            { text: '关闭', onclick: closeModal }
        ]);
    });
    
    socket.on('transportBotError', (data) => {
        appendConsoleLine(`运输Bot ${data.botId} 错误：${data.error}`, 'error');
        showModal(`运输Bot错误 - ${data.botId}`, `
            <div style="padding:20px;">
                <div style="font-size:14px;color:#ef4444;margin-bottom:12px;">启动过程中发生错误:</div>
                <div style="padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;font-family:monospace;font-size:13px;color:#fca5a5;white-space:pre-wrap;max-height:200px;overflow-y:auto;">${data.error}</div>
            </div>
        `, [
            { text: '确定', onclick: closeModal }
        ]);
    });
    
    socket.on('mainBotLoginUrl', (data) => {
        const login = normalizeMicrosoftLogin(data);
        rememberLoginUrl('main', '主Bot', login);
        showModal('主Bot登录', `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:14px;color:#64748b;margin-bottom:16px;">请打开 Microsoft 登录页，并手动输入下面的验证码</div>
                <a href="${escapeHtml(login.url)}" target="_blank" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0078d4,#00bcf2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">打开登录链接</a>
                <div style="margin-top:14px;padding:10px;background:rgba(59,130,246,0.08);border-radius:8px;font-family:monospace;font-size:12px;color:#bfdbfe;word-break:break-all;text-align:left;">${escapeHtml(login.url)}</div>
                <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;font-family:monospace;font-size:14px;color:#fbbf24;">验证码：${escapeHtml(login.code || '无')}</div>
                <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
                    <button class="btn btn-primary btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(login.url)}">复制链接</button>
                    <button class="btn btn-info btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(login.code || '')}" ${login.code ? '' : 'disabled'}>复制验证码</button>
                </div>
            </div>
        `, [
            { text: '关闭', onclick: closeModal }
        ]);
    });
    
    socket.on('deployStatus', (status) => {
        if (typeof updateDeployUI === 'function') {
            updateDeployUI(status);
        }
    });
    
    socket.on('deployedServerLoginUrl', (data) => {
        showModal('部署服务器登录', `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:14px;color:#64748b;margin-bottom:16px;">部署服务器需要Microsoft登录验证</div>
                <a href="${data.url}" target="_blank" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0078d4,#00bcf2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">打开登录链接</a>
            </div>
        `, [{ text: '关闭', onclick: closeModal }]);
    });

    fetch('/api/system/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
        .then(res => res.json())
        .then(data => updateSystemStatusBanner(data.status || {}))
        .catch(() => {});
}

function ensureSystemStatusBanner() {
    let banner = document.getElementById('systemStatusBanner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'systemStatusBanner';
    banner.style.cssText = [
        'position:fixed',
        'top:14px',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:99998',
        'display:none',
        'align-items:center',
        'gap:10px',
        'max-width:min(720px,calc(100vw - 24px))',
        'padding:10px 16px',
        'border-radius:999px',
        'border:1px solid rgba(255,255,255,.18)',
        'background:rgba(15,23,42,.92)',
        'box-shadow:0 12px 36px rgba(0,0,0,.35)',
        'backdrop-filter:blur(18px)',
        'color:#f8fafc',
        'font-size:13px',
        'font-weight:650',
        'pointer-events:none'
    ].join(';');
    document.body.appendChild(banner);
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
    if (maintenance) parts.push('维护模式：系统正在更新/维护，部分操作暂停');
    if (scanning) parts.push(status.scanMessage || '正在扫描仓库，库存正在刷新');
    banner.textContent = parts.join('　|　');
    banner.style.display = 'flex';
}

function detectServerType() {
    fetch('/api/admin/config').then(res => res.json()).then(data => {
        if (data) {
            mainBotConfig = data;
        }
    }).catch(() => {});
    
    fetch('/api/server/info').then(res => res.json()).then(data => {
        if (data.success) {
            isLocalServer = data.isLocalServer;
        }
    }).catch(() => {
        fetchWithAuth('/api/files/list?path=/').then(res => res.json()).then(data => {
            if (data.success) {
                isLocalServer = data.files.some(f => f.name === 'index.js' && f.type === 'file');
            }
        }).catch(() => {});
    });
}

function clearAuthState(showLogin = true) {
    authToken = null;
    localStorage.removeItem('authToken');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    if (showLogin) showLoginModal();
}

function checkAuth() {
    if (authChecking) return;
    if (!authToken) {
        clearAuthState(true);
        return;
    }
    authChecking = true;
    fetch('/api/auth/check', {
        headers: { Authorization: 'Bearer ' + authToken }
    }).then(res => {
        if (res.status === 401) return { authenticated: false };
        return res.json();
    }).then(data => {
        if (!data.authenticated) {
            clearAuthState(true);
        } else {
            loginModalVisible = false;
            initSocket();
            loadUserInfo();
        }
    }).catch(() => {
        clearAuthState(true);
    }).finally(() => {
        authChecking = false;
    });
}

function showLoginModal() {
    showModal('系统登录', `
        <div style="text-align:center;margin-bottom:20px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#0078d4,#00bcf2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                ${Icons.lock.replace('<svg ', '<svg width="32" height="32" ')}
            </div>
            <div style="font-size:14px;color:#64748b;">请输入管理员密码</div>
        </div>
        <input type="password" class="input-field" id="loginPassword" placeholder="输入密码" onkeypress="if(event.key==='Enter')handleLogin()">
    `, [
        { text: '登录', primary: true, onclick: handleLogin },
        { text: '取消', onclick: () => { closeModal(); showLoginModal(); } }
    ]);
}

function handleLogin() {
    const password = document.getElementById('loginPassword').value;
    if (!password) return;
    
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            closeModal();
            initSocket();
            setTimeout(() => {
                openFileExplorer('/');
                openMineflayer();
                loadUserInfo();
            }, 500);
        } else {
            alert('密码错误');
        }
    });
}

let currentUser = null;

function loadUserInfo() {
    fetchWithAuth('/api/user/info').then(res => res.json()).then(data => {
        if (data.success && data.user) {
            currentUser = data.user;
            updateUserDisplay();
        }
    }).catch(() => {});
}

function updateUserDisplay() {
    const userIcon = document.querySelector('.system-icon.user');
    if (userIcon && currentUser) {
        userIcon.title = `管理员: ${currentUser.username || 'Admin'}`;
    }
}

function fetchWithAuth(url, options = {}) {
    if (!authToken) {
        clearAuthState(true);
        return Promise.reject(new Error('请先登录'));
    }
    const headers = options.headers || {};
    headers['Authorization'] = 'Bearer ' + authToken;
    return fetch(url, { ...options, headers }).then(res => {
        if (res.status === 401) {
            clearAuthState(true);
            throw new Error('登录已过期，请重新登录');
        }
        return res;
    });
}

function initIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const iconName = el.dataset.icon;
        const size = el.classList.contains('start-menu-icon') ? 20 : 56;
        if (Icons[iconName]) {
            el.innerHTML = Icons[iconName].replace('<svg ', `<svg width="${size}" height="${size}" `);
        }
    });
}

function selectIcon(el) {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
}

function toggleStartMenu() {
    const menu = document.getElementById('startMenu');
    menu.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('startMenu');
    const startBtn = document.querySelector('.start-button');
    if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        startMenu.classList.remove('show');
    }
});

function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    document.getElementById('clock').innerHTML = `${time}<br>${date}`;
}
setInterval(updateClock, 1000);
updateClock();

function createWindow(id, title, icon, content, width = 800, height = 500) {
    if (!authToken && id !== 'shop') {
        showLoginModal();
        return;
    }
    
    if (windows[id]) {
        bringToFront(id);
        return;
    }
    
    const desktop = document.getElementById('desktop');
    const win = document.createElement('div');
    win.className = 'window';
    win.id = `window-${id}`;
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = (80 + Object.keys(windows).length * 30) + 'px';
    win.style.top = (80 + Object.keys(windows).length * 30) + 'px';
    win.style.zIndex = ++windowZIndex;
    
    const iconSVG = Icons[icon] || Icons.file;
    
    win.innerHTML = `
        <div class="window-header" onmousedown="startDrag(event, '${id}')">
            <span class="window-icon">${iconSVG.replace('<svg ', '<svg width="18" height="18" ')}</span>
            <span class="window-title">${title}</span>
            <div class="window-controls">
                <div class="window-btn" onclick="minimizeWindow('${id}')" title="最小化">${Icons.minimize}</div>
                <div class="window-btn" onclick="maximizeWindow('${id}')" title="最大化">${Icons.maximize}</div>
                <div class="window-btn close" onclick="closeWindow('${id}')" title="关闭">${Icons.close}</div>
            </div>
        </div>
        <div class="window-content" id="content-${id}"></div>
    `;
    
    desktop.appendChild(win);
    windows[id] = { element: win, minimized: false, maximized: false, icon: icon, originalRect: null };
    document.getElementById(`content-${id}`).innerHTML = content;
    
    updateTaskbar();
    bringToFront(id);
    
    return id;
}

function bringToFront(id) {
    if (!windows[id]) return;
    windows[id].element.style.zIndex = ++windowZIndex;
    updateTaskbar();
}

function closeWindow(id) {
    if (!windows[id]) return;
    const win = windows[id].element;
    win.classList.add('closing');
    setTimeout(() => {
        win.remove();
        delete windows[id];
        updateTaskbar();
    }, 250);
}

function minimizeWindow(id) {
    if (!windows[id]) return;
    const win = windows[id].element;
    win.classList.add('minimizing');
    setTimeout(() => {
        win.style.display = 'none';
        win.classList.remove('minimizing');
        windows[id].minimized = true;
        updateTaskbar();
    }, 350);
}

function maximizeWindow(id) {
    if (!windows[id]) return;
    const win = windows[id].element;
    if (windows[id].maximized) {
        const rect = windows[id].originalRect;
        win.style.width = rect.width + 'px';
        win.style.height = rect.height + 'px';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
        win.classList.remove('maximized');
        windows[id].maximized = false;
    } else {
        windows[id].originalRect = {
            width: win.offsetWidth,
            height: win.offsetHeight,
            left: win.offsetLeft,
            top: win.offsetTop
        };
        win.classList.add('maximized');
        windows[id].maximized = true;
    }
}

function updateTaskbar() {
    const container = document.getElementById('taskbarApps');
    container.innerHTML = '';
    
    Object.keys(windows).forEach(id => {
        const win = windows[id];
        const btn = document.createElement('div');
        btn.className = `taskbar-app ${win.minimized ? '' : 'active'}`;
        btn.onclick = () => {
            if (win.minimized) {
                win.element.style.display = 'flex';
                win.minimized = false;
                bringToFront(id);
            } else {
                bringToFront(id);
            }
        };
        btn.innerHTML = win.icon && Icons[win.icon] ? Icons[win.icon].replace('<svg ', '<svg width="20" height="20" ') : Icons.file.replace('<svg ', '<svg width="20" height="20" ');
        container.appendChild(btn);
    });
}

let dragWindow = null;
let dragOffset = { x: 0, y: 0 };

function startDrag(e, id) {
    if (!windows[id] || windows[id].maximized) return;
    dragWindow = id;
    const win = windows[id].element;
    dragOffset.x = e.clientX - win.offsetLeft;
    dragOffset.y = e.clientY - win.offsetTop;
    bringToFront(id);
}

document.addEventListener('mousemove', (e) => {
    if (!dragWindow) return;
    const win = windows[dragWindow].element;
    win.style.left = (e.clientX - dragOffset.x) + 'px';
    win.style.top = (e.clientY - dragOffset.y) + 'px';
});

document.addEventListener('mouseup', () => {
    dragWindow = null;
});

let clipboardMode = null;
let clipboardPaths = [];

function openFileExplorer(path = '/') {
    if (!authToken) { showLoginModal(); return; }
    currentPath = path;
    const content = `
        <div class="explorer-toolbar">
            <button class="explorer-btn" onclick="navigateBack()" id="backBtn" disabled>${Icons.back}</button>
            <button class="explorer-btn" onclick="navigateForward()" id="forwardBtn" disabled>${Icons.forward}</button>
            <button class="explorer-btn" onclick="navigateUp()">${Icons.up}</button>
            <button class="explorer-btn" onclick="refreshFiles()">${Icons.refresh}</button>
            <div class="address-bar">
                <input type="text" id="addressInput" value="${path}" onkeypress="if(event.key==='Enter')navigateTo(this.value)">
            </div>
            <button class="explorer-btn" onclick="showNewFolderDialog()">${Icons.plus} 新建文件夹</button>
            <button class="explorer-btn" onclick="showUploadDialog()">${Icons.upload} 上传</button>
            <button class="explorer-btn" onclick="downloadSelected()" id="downloadBtn" disabled>${Icons.download} 下载</button>
            <button class="explorer-btn" onclick="deleteSelected()" id="deleteBtn" disabled>${Icons.delete} 删除</button>
            <button class="explorer-btn" onclick="cutSelected()" id="cutBtn" disabled>剪切</button>
            <button class="explorer-btn" onclick="copySelected()" id="copyBtn" disabled>复制</button>
            <button class="explorer-btn" onclick="pasteFiles()" id="pasteBtn" disabled>粘贴</button>
        </div>
        <div class="explorer-body">
            <div class="explorer-sidebar">
                <div id="sidebarTree"></div>
            </div>
            <div class="explorer-main">
                <div class="file-list-header">
                    <div class="name">名称</div>
                    <div class="size">大小</div>
                    <div class="date">修改日期</div>
                </div>
                <div class="file-list" id="fileList" oncontextmenu="showFileContextMenu(event)"></div>
                <div class="status-bar">
                    <span id="fileCount">0 项</span>
                    <span id="selectedCount">未选中</span>
                    <span id="clipboardStatus"></span>
                    <span style="color:#0078d4;font-weight:500;">${isLocalServer ? '本地服务器' : '云端服务器'}</span>
                </div>
            </div>
        </div>
    `;
    createWindow('explorer', '资源管理器', 'explorer', content, 960, 600);
    setTimeout(async () => {
        await loadSidebarTree();
        initSidebarTree();
        loadFiles(path);
    }, 100);
}

let sidebarTreeData = {};

function getDefaultSidebarTreeData() {
    return {
        '/computer': { path: '/computer', name: '此电脑', icon: '🖥️', children: [] },
        '/mineflayer': { path: '/mineflayer', name: 'Mineflayer', icon: '🤖', children: [] },
        '/transport-config': { path: '/transport-config', name: '运输Bot配置', icon: '📄', children: [] },
        '/home': { path: '/home', name: '用户目录', icon: '🏠', children: [] }
    };
}

function normalizeSidebarTreeData(data) {
    const fallback = getDefaultSidebarTreeData();
    const source = data && typeof data === 'object' && Object.keys(data).length > 0 ? data : fallback;
    const normalized = {};
    for (const [key, rawItem] of Object.entries(source)) {
        const pathValue = rawItem?.path || key;
        normalized[pathValue] = {
            ...rawItem,
            path: pathValue,
            name: rawItem?.name || pathValue,
            icon: rawItem?.icon || '📁',
            children: Array.isArray(rawItem?.children)
                ? rawItem.children.map(child => ({
                    ...child,
                    path: child.path || `${pathValue}/${child.name || ''}`.replace(/\/+/g, '/'),
                    name: child.name || child.path || '未命名',
                    icon: child.icon || '📁',
                    children: Array.isArray(child.children) ? child.children : []
                }))
                : []
        };
    }
    for (const [key, item] of Object.entries(fallback)) {
        if (!normalized[key]) normalized[key] = item;
    }
    return normalized;
}

async function loadSidebarTree() {
    try {
        const res = await fetchWithAuth('/api/files/sidebar-tree');
        const data = await res.json();
        if (data.success && data.data) {
            sidebarTreeData = normalizeSidebarTreeData(data.data);
        } else {
            sidebarTreeData = normalizeSidebarTreeData(null);
        }
    } catch (err) {
        console.error('加载侧边栏树失败:', err);
        sidebarTreeData = normalizeSidebarTreeData(null);
    }
}

function initSidebarTree() {
    const container = document.getElementById('sidebarTree');
    if (!container) return;
    if (!sidebarTreeData || Object.keys(sidebarTreeData).length === 0) {
        sidebarTreeData = normalizeSidebarTreeData(null);
    }
    
    function renderItem(item, depth = 0, isRoot = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tree-node';
        
        const div = document.createElement('div');
        div.className = 'sidebar-tree-item';
        div.style.paddingLeft = (depth * 16) + 'px';
        div.dataset.path = item.path;
        
        const isExpanded = currentPath.startsWith(item.path) && currentPath !== item.path;
        
        if (item.children && item.children.length > 0) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle' + (isExpanded ? ' expanded' : '');
            toggle.innerHTML = '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                toggle.classList.toggle('expanded');
                const childrenDiv = wrapper.querySelector('.tree-children');
                childrenDiv.classList.toggle('expanded');
            };
            div.appendChild(toggle);
        } else {
            const spacer = document.createElement('span');
            spacer.style.width = '18px';
            spacer.style.display = 'inline-block';
            spacer.style.flexShrink = '0';
            div.appendChild(spacer);
        }
        
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.innerHTML = item.icon || '📁';
        div.appendChild(icon);
        
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = item.name;
        label.title = item.name;
        div.title = item.name;
        div.appendChild(label);
        
        div.onclick = () => {
            document.querySelectorAll('.sidebar-tree-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            navigateTo(item.path);
        };
        
        if (currentPath === item.path || currentPath.startsWith(item.path + '/')) {
            div.classList.add('active');
        }
        
        wrapper.appendChild(div);
        
        if (item.children && item.children.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children' + (isExpanded ? ' expanded' : '');
            item.children.forEach(child => {
                childrenDiv.appendChild(renderItem(child, depth + 1));
            });
            wrapper.appendChild(childrenDiv);
        }
        
        return wrapper;
    }
    
    container.innerHTML = '';
    
    Object.keys(sidebarTreeData).forEach(key => {
        const item = sidebarTreeData[key];
        container.appendChild(renderItem(item, 0, true));
    });
}

function updateSidebarActive(path) {
    document.querySelectorAll('.sidebar-tree-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.path === path || path.startsWith(el.dataset.path + '/')) {
            el.classList.add('active');
        }
    });
}

const pathHistory = [];
let historyIndex = -1;

function navigateTo(path) {
    if (!path.startsWith('/')) path = '/' + path;
    pathHistory.splice(historyIndex + 1);
    pathHistory.push(path);
    historyIndex = pathHistory.length - 1;
    currentPath = path;
    const addressInput = document.getElementById('addressInput');
    if (addressInput) addressInput.value = path;
    loadFiles(path);
    updateNavButtons();
    updateSidebarActive(path);
}

function navigateBack() {
    if (historyIndex > 0) {
        historyIndex--;
        currentPath = pathHistory[historyIndex];
        document.getElementById('addressInput').value = currentPath;
        loadFiles(currentPath);
        updateNavButtons();
    }
}

function navigateForward() {
    if (historyIndex < pathHistory.length - 1) {
        historyIndex++;
        currentPath = pathHistory[historyIndex];
        document.getElementById('addressInput').value = currentPath;
        loadFiles(currentPath);
        updateNavButtons();
    }
}

function navigateUp() {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = '/' + parts.join('/');
    navigateTo(newPath);
}

function updateNavButtons() {
    document.getElementById('backBtn').disabled = historyIndex <= 0;
    document.getElementById('forwardBtn').disabled = historyIndex >= pathHistory.length - 1;
}

function refreshFiles() {
    loadFiles(currentPath);
}

function loadFiles(path) {
    fetchWithAuth(`/api/files/list?path=${encodeURIComponent(path)}`)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('fileList');
            if (!list) return;
            list.innerHTML = '';
            selectedFiles = [];
            
            if (!data.success) {
                list.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b">${data.error || '加载失败'}</div>`;
                return;
            }
            
            if (path !== '/') {
                const parentPath = path === '/' ? '/' : path.replace(/\/[^/]+$/, '') || '/';
                const parentItem = document.createElement('div');
                parentItem.className = 'file-item';
                parentItem.dataset.path = parentPath;
                parentItem.dataset.type = 'directory';
                parentItem.onclick = () => {
                    document.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                    parentItem.classList.add('selected');
                    selectedFiles = [parentPath];
                    updateSelectedButtons();
                };
                parentItem.ondblclick = () => {
                    navigateTo(parentPath);
                };
                parentItem.innerHTML = `
                    <div class="file-icon">${Icons.up}</div>
                    <div class="file-name">..</div>
                    <div class="file-size">-</div>
                    <div class="file-date"></div>
                `;
                list.appendChild(parentItem);
            }
            
            data.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.dataset.path = file.path;
                item.dataset.type = file.type;
                item.onclick = (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        item.classList.toggle('selected');
                        const idx = selectedFiles.indexOf(file.path);
                        if (item.classList.contains('selected')) {
                            selectedFiles.push(file.path);
                        } else {
                            selectedFiles.splice(idx, 1);
                        }
                    } else {
                        document.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        selectedFiles = [file.path];
                    }
                    updateSelectedButtons();
                };
                item.ondblclick = () => {
                    if (file.type === 'directory') {
                        navigateTo(file.path);
                    } else {
                        previewFile(file.path, file.name);
                    }
                };
                
                let icon = Icons.file;
                if (file.type === 'directory') icon = Icons.folder;
                else if (file.name.endsWith('.js')) icon = Icons.file_js;
                else if (file.name.endsWith('.json')) icon = Icons.file_json;
                else if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.gif')) icon = Icons.file_png;
                else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) icon = Icons.file_zip;
                
                item.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${file.type === 'directory' ? '-' : formatSize(file.size)}</div>
                    <div class="file-date">${formatDate(file.mtime)}</div>
                `;
                list.appendChild(item);
            });
            
            document.getElementById('fileCount').textContent = `${data.files.length} 项`;
            updateSelectedButtons();
        })
        .catch(err => {
            console.error(err);
            const list = document.getElementById('fileList');
            if (list) {
                list.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">加载失败，请检查登录状态</div>';
            }
        });
}

function updateSelectedButtons() {
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const cutBtn = document.getElementById('cutBtn');
    const copyBtn = document.getElementById('copyBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const hasSelection = selectedFiles.length > 0;
    const hasClipboard = clipboardPaths.length > 0;
    
    if (downloadBtn) downloadBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
    if (cutBtn) cutBtn.disabled = !hasSelection;
    if (copyBtn) copyBtn.disabled = !hasSelection;
    if (pasteBtn) pasteBtn.disabled = !hasClipboard;
    
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.textContent = hasSelection ? `已选中 ${selectedFiles.length} 项` : '未选中';
    
    const clipboardStatus = document.getElementById('clipboardStatus');
    if (clipboardStatus) {
        clipboardStatus.textContent = hasClipboard ? 
            `(${clipboardMode === 'cut' ? '剪切' : '复制'} ${clipboardPaths.length} 项)` : '';
        clipboardStatus.style.color = clipboardMode === 'cut' ? '#ef4444' : '#22c55e';
    }
}

function cutSelected() {
    clipboardMode = 'cut';
    clipboardPaths = [...selectedFiles];
    updateSelectedButtons();
}

function copySelected() {
    clipboardMode = 'copy';
    clipboardPaths = [...selectedFiles];
    updateSelectedButtons();
}

function pasteFiles() {
    if (clipboardPaths.length === 0) return;
    
    clipboardPaths.forEach(srcPath => {
        const fileName = srcPath.split('/').pop();
        const destPath = currentPath + '/' + fileName;
        
        const api = clipboardMode === 'cut' ? '/api/files/move' : '/api/files/copy';
        fetchWithAuth(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: srcPath, destination: destPath })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                refreshFiles();
            }
        });
    });
    
    if (clipboardMode === 'cut') {
        clipboardMode = null;
        clipboardPaths = [];
        updateSelectedButtons();
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN');
}

function showNewFolderDialog() {
    showModal('新建文件夹', `
        <input type="text" class="input-field" id="newFolderName" placeholder="文件夹名称">
    `, [
        { text: '确定', primary: true, onclick: () => {
            const name = document.getElementById('newFolderName').value.trim();
            if (!name) return;
            fetchWithAuth('/api/files/mkdir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentPath + '/' + name })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    refreshFiles();
                    closeModal();
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function showUploadDialog() {
    const input = document.getElementById('fileInput');
    input.onchange = (e) => {
        if (e.target.files.length === 0) return;
        
        const formData = new FormData();
        Array.from(e.target.files).forEach(file => {
            formData.append('file', file);
        });
        formData.append('path', currentPath);
        
        fetchWithAuth('/api/files/upload', {
            method: 'POST',
            body: formData
        }).then(res => res.json()).then(data => {
            if (data.success) {
                refreshFiles();
            }
            input.value = '';
        });
    };
    input.click();
}

function downloadSelected() {
    if (selectedFiles.length === 1) {
        downloadFile(selectedFiles[0]);
    }
}

async function downloadFile(path) {
    try {
        const res = await fetchWithAuth(`/api/files/download?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = String(path || 'download').split(/[\\/]/).filter(Boolean).pop() || 'download';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        showSystemMessage('下载失败', err.message || '文件下载失败', 'error');
    }
}

function previewFile(filePath, fileName) {
    const previewContent = `
        <div style="display:flex;flex-direction:column;height:100%">
            <div style="padding:12px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:600;color:#f1f5f9">${fileName}</div>
                <div>
                    <button class="btn btn-secondary" onclick="downloadFile('${filePath}')">下载</button>
                    <button class="btn btn-danger" onclick="closeModal()">关闭</button>
                </div>
            </div>
            <div style="flex:1;overflow:auto;padding:16px;background:#0f172a;">
                <pre id="fileContent" style="color:#94a3b8;font-family:Consolas,Monaco,monospace;font-size:13px;white-space:pre-wrap;word-wrap:break-word;"></pre>
            </div>
        </div>
    `;
    showModal('文件预览', previewContent);
    
    fetchWithAuth(`/api/files/read?path=${encodeURIComponent(filePath)}`)
        .then(res => res.text())
        .then(content => {
            const el = document.getElementById('fileContent');
            if (el) el.textContent = content;
        })
        .catch(err => {
            const el = document.getElementById('fileContent');
            if (el) el.textContent = '无法读取文件内容';
        });
}

function deleteSelected() {
    if (selectedFiles.length === 0) return;
    showModal('确认删除', `确定要删除选中的 ${selectedFiles.length} 项吗？`, [
        { text: '删除', primary: true, onclick: () => {
            selectedFiles.forEach(path => {
                fetchWithAuth('/api/files/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        refreshFiles();
                    }
                });
            });
            closeModal();
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function showFileContextMenu(e) {
    e.preventDefault();
    const menu = document.getElementById('contextMenu');
    const hasSelection = selectedFiles.length > 0;
    const hasClipboard = clipboardPaths.length > 0;
    
    menu.innerHTML = `
        <div class="context-menu-item" onclick="showNewFolderDialog()">${Icons.plus} 新建文件夹</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item ${!hasSelection ? 'disabled' : ''}" onclick="cutSelected()">剪切</div>
        <div class="context-menu-item ${!hasSelection ? 'disabled' : ''}" onclick="copySelected()">复制</div>
        <div class="context-menu-item ${!hasClipboard ? 'disabled' : ''}" onclick="pasteFiles()">粘贴</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item ${hasSelection !== 1 ? 'disabled' : ''}" onclick="renameSelected()">重命名</div>
        <div class="context-menu-item ${hasSelection !== 1 ? 'disabled' : ''}" onclick="showFileProperties()">属性</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item ${!hasSelection ? 'disabled' : ''}" onclick="downloadSelected()">${Icons.download} 下载</div>
        <div class="context-menu-item ${!hasSelection ? 'disabled' : ''}" onclick="deleteSelected()">${Icons.delete} 删除</div>
    `;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('show');
}

function renameSelected() {
    if (selectedFiles.length !== 1) return;
    const path = selectedFiles[0];
    const oldName = path.split('/').pop();
    
    showModal('重命名', `
        <input type="text" class="input-field" id="renameInput" value="${oldName}">
    `, [
        { text: '确定', primary: true, onclick: () => {
            const newName = document.getElementById('renameInput').value.trim();
            if (!newName || newName === oldName) return;
            const parentPath = path.substring(0, path.lastIndexOf('/'));
            const newPath = parentPath + '/' + newName;
            
            fetchWithAuth('/api/files/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: path, newPath })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    refreshFiles();
                    closeModal();
                } else {
                    showModal('错误', data.error || '重命名失败');
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function showFileProperties() {
    if (selectedFiles.length !== 1) return;
    const path = selectedFiles[0];
    
    fetchWithAuth(`/api/files/info?path=${encodeURIComponent(path)}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showModal('错误', data.error);
                return;
            }
            
            const info = data.info;
            const propsContent = `
                <div style="padding:16px;">
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">名称</div>
                        <div style="color:#f1f5f9;font-weight:500;">${info.name}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">类型</div>
                        <div style="color:#f1f5f9;">${info.isDirectory ? '文件夹' : '文件'}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">位置</div>
                        <div style="color:#f1f5f9;font-family:monospace;font-size:12px;">${info.path}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">大小</div>
                        <div style="color:#f1f5f9;">${info.isDirectory ? '-' : formatSize(info.size)}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">创建时间</div>
                        <div style="color:#f1f5f9;">${formatDate(info.createdAt)}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">修改时间</div>
                        <div style="color:#f1f5f9;">${formatDate(info.modifiedAt)}</div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="color:#64748b;font-size:12px;">访问时间</div>
                        <div style="color:#f1f5f9;">${formatDate(info.accessedAt)}</div>
                    </div>
                    <div style="margin-top:16px;">
                        <button class="btn btn-primary" onclick="closeModal()">确定</button>
                    </div>
                </div>
            `;
            showModal('属性', propsContent);
        });
}

function showModal(title, body, buttons) {
    document.getElementById('modalTitle').textContent = title;
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = body;
    modalBody.scrollTop = 0;
    const footer = document.getElementById('modalFooter');
    footer.innerHTML = '';
    if (buttons && buttons.length > 0) {
        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.className = `modal-btn ${btn.primary ? 'primary' : 'secondary'}`;
            b.textContent = btn.text;
            b.onclick = btn.onclick;
            footer.appendChild(b);
        });
    }
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    if (loginModalVisible && !authToken) return;
    document.getElementById('modalOverlay').classList.remove('show');
    if (authToken) loginModalVisible = false;
}

function showSystemMessage(title, message, type = 'info') {
    const color = type === 'error' ? '#ef4444' : (type === 'success' ? '#22c55e' : '#38bdf8');
    showModal(title, `
        <div style="padding:18px 4px;line-height:1.7;color:#cbd5e1;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="width:10px;height:10px;border-radius:50%;background:${color};margin-top:8px;box-shadow:0 0 16px ${color};"></div>
                <div style="white-space:pre-wrap;">${escapeHtml(String(message || '操作已完成'))}</div>
            </div>
        </div>
    `, [{ text: '确定', primary: true, onclick: closeModal }]);
}

window.alert = function(message) {
    showSystemMessage('系统提示', message, String(message || '').includes('失败') || String(message || '').includes('错误') ? 'error' : 'info');
};

document.addEventListener('click', (e) => {
    const overlay = document.getElementById('modalOverlay');
    if (overlay && overlay.classList.contains('show')) {
        if (e.target === overlay) {
            e.stopPropagation();
            closeModal();
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('modalOverlay');
        if (overlay && overlay.classList.contains('show')) {
            closeModal();
        }
    }
});

document.addEventListener('click', (e) => {
    const menu = document.getElementById('contextMenu');
    if (!menu.contains(e.target)) {
        menu.classList.remove('show');
    }
});

function openMineflayer() {
    if (!authToken) { showLoginModal(); return; }
    const content = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <div class="card">
                <div class="card-title">
                    <span class="status-indicator ${botStatus === 'online' ? 'status-online' : botStatus === 'starting' ? 'status-starting' : 'status-offline'}"></span>
                    主 Bot 状态
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:16px;">
                    <div><span style="color:#64748b;font-size:13px">状态:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botStatus === 'online' ? '在线' : botStatus === 'starting' ? '启动中' : '离线'}</div></div>
                    <div><span style="color:#64748b;font-size:13px">位置:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botPosition || '未知'}</div></div>
                    <div><span style="color:#64748b;font-size:13px">血量:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botHealth || 0}</div></div>
                    <div><span style="color:#64748b;font-size:13px">饱食:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botFood || 0}</div></div>
                </div>
                <button class="btn ${botStatus === 'online' || botStatus === 'starting' ? 'btn-danger' : 'btn-success'}" onclick="toggleMainBot()">${botStatus === 'online' || botStatus === 'starting' ? '停止' : '启动'}主 Bot</button>
                <button class="btn btn-warning" onclick="stopMainBot()" id="stopMainBotBtn" style="margin-left:8px" ${botStatus === 'offline' ? 'disabled' : ''}>强制关闭</button>
                <button class="btn btn-info" onclick="scanWarehouse()" style="margin-left:8px">扫描仓库</button>
                <button class="btn btn-secondary" onclick="scanWarehouse({ mode: 'nearby', range: 10, test: true })" style="margin-left:8px">附近箱子测试</button>
                <button class="btn btn-secondary" onclick="scanPositionPrompt()" style="margin-left:8px">单点开箱测试</button>
                <button class="btn btn-secondary" onclick="scanWarehouse({ mode: 'configured', maxChests: 20, test: true })" style="margin-left:8px">配置区域测试</button>
                <button class="btn btn-primary" onclick="openTerminal()" style="margin-left:8px">控制台/登录URL</button>
                <button class="btn btn-success" onclick="openTransportLoginConsole()" style="margin-left:8px">运输Bot URL</button>
                <button class="btn btn-warning" onclick="openUpdateCenter()" style="margin-left:8px">整体更新</button>
                <div style="margin-top:10px;color:#94a3b8;font-size:12px;">需要 Microsoft 验证时，登录 URL 会弹窗并同步显示在控制台。</div>
            </div>
            <div class="card">
                <div class="card-title">扫描区域管理 <button class="btn btn-primary" style="margin-left:auto;font-size:12px;padding:6px 12px" onclick="openScanAreaModal()">添加区域</button></div>
                <div id="scanAreasList"></div>
            </div>
            <div class="card">
                <div class="card-title">主Bot配置</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
                    <div><label style="color:#64748b;font-size:12px">Bot名称:</label><input type="text" class="input-field" id="mbName" value="" style="margin-bottom:6px;"></div>
                    <div><label style="color:#64748b;font-size:12px">邮箱:</label><input type="text" class="input-field" id="mbEmail" value="" style="margin-bottom:6px;"></div>
                    <div><label style="color:#64748b;font-size:12px">服务器:</label><input type="text" class="input-field" id="mbHost" value="" style="margin-bottom:6px;"></div>
                    <div><label style="color:#64748b;font-size:12px">端口:</label><input type="text" class="input-field" id="mbPort" value="" style="margin-bottom:6px;"></div>
                    <div><label style="color:#64748b;font-size:12px">版本:</label><input type="text" class="input-field" id="mbVersion" value="" style="margin-bottom:6px;"></div>
                </div>
                <button class="btn btn-primary" onclick="saveMainBotConfig()">保存配置</button>
            </div>
            <div class="card">
                <div class="card-title">扫描进度</div>
                <div class="progress-bar"><div class="progress-fill" id="scanProgress" style="width:${scanProgress}%"></div></div>
                <div style="margin-top:10px;font-size:13px;color:#64748b" id="scanStatus">${scanStatus}</div>
            </div>
            <div class="card">
                <div class="card-title">日志输出</div>
                <div class="logs-area" id="botLogs"></div>
            </div>
        </div>
    `;
    createWindow('mineflayer', 'Mineflayer Bot管理', 'bot', content, 880, 780);
    setTimeout(() => {
        connectSocket();
        loadMainBotConfig();
        loadScanAreas();
    }, 100);
}

function loadMainBotConfig() {
    const cachedConfig = loadCachedConfig();
    const nameEl = document.getElementById('mbName');
    const emailEl = document.getElementById('mbEmail');
    const hostEl = document.getElementById('mbHost');
    const portEl = document.getElementById('mbPort');
    const versionEl = document.getElementById('mbVersion');
    
    if (cachedConfig) {
        mainBotConfig = cachedConfig;
        if (nameEl) nameEl.value = cachedConfig.name || '';
        if (emailEl) emailEl.value = cachedConfig.email || '';
        if (hostEl) hostEl.value = cachedConfig.host || '';
        if (portEl) portEl.value = cachedConfig.port || '';
        if (versionEl) versionEl.value = cachedConfig.version || '';
    }
    
    fetchWithAuth('/api/admin/config').then(res => res.json()).then(data => {
        if (data) {
            if (!cachedConfig || JSON.stringify(data) !== JSON.stringify(cachedConfig)) {
                mainBotConfig = data;
                localStorage.setItem('mainBotConfig', JSON.stringify(data));
                if (nameEl) nameEl.value = data.name || '';
                if (emailEl) emailEl.value = data.email || '';
                if (hostEl) hostEl.value = data.host || '';
                if (portEl) portEl.value = data.port || '';
                if (versionEl) versionEl.value = data.version || '';
            }
        }
    }).catch(() => {
        console.log('从服务器加载配置失败，使用缓存配置');
    });
}

let botStatus = 'offline';
let botPosition = '未知';
let botHealth = 0;
let botFood = 0;
let scanProgress = 0;
let scanStatus = '就绪';

function connectSocket() {
    initSocket();
}

function updateMineflayerUI() {
    const win = windows['mineflayer'];
    if (!win) return;
    const content = win.element.querySelector('.window-content');
    if (!content) return;
    
    const statusEl = content.querySelector('.status-indicator');
    if (statusEl) {
        statusEl.className = `status-indicator ${botStatus === 'online' ? 'status-online' : botStatus === 'starting' ? 'status-starting' : 'status-offline'}`;
    }
    
    const infoDivs = content.querySelectorAll('.card-title + div > div');
    if (infoDivs.length >= 4) {
        infoDivs[0].innerHTML = `<span style="color:#64748b;font-size:13px">状态:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botStatus === 'online' ? '在线' : botStatus === 'starting' ? '启动中' : '离线'}</div>`;
        infoDivs[1].innerHTML = `<span style="color:#64748b;font-size:13px">位置:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botPosition}</div>`;
        infoDivs[2].innerHTML = `<span style="color:#64748b;font-size:13px">血量:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botHealth}</div>`;
        infoDivs[3].innerHTML = `<span style="color:#64748b;font-size:13px">饱食:</span><div style="font-weight:600;color:#f1f5f9;margin-top:2px">${botFood}</div>`;
    }
    
    const btns = content.querySelectorAll('.btn');
    if (btns.length >= 2) {
        btns[0].className = `btn ${botStatus === 'online' || botStatus === 'starting' ? 'btn-danger' : 'btn-success'}`;
        btns[0].textContent = botStatus === 'online' || botStatus === 'starting' ? '停止主 Bot' : '启动主 Bot';
    }
    
    const stopBtn = content.querySelector('#stopMainBotBtn');
    if (stopBtn) {
        stopBtn.disabled = botStatus === 'offline';
    }
    
    const progress = content.querySelector('#scanProgress');
    if (progress) progress.style.width = scanProgress + '%';
    
    const statusText = content.querySelector('#scanStatus');
    if (statusText) statusText.textContent = scanStatus;
}

function toggleMainBot() {
    fetchWithAuth('/api/bot/toggle', { method: 'POST' }).then(res => res.json()).then(data => {
        if (data.success) {
            botStatus = data.status || (botStatus === 'online' ? 'offline' : 'starting');
            updateMineflayerUI();
        }
    });
}

function stopMainBot() {
    fetchWithAuth('/api/admin/mainbot/stop', { method: 'POST' }).then(res => res.json()).then(data => {
        if (data.success) {
            botStatus = 'offline';
            updateMineflayerUI();
        }
    });
}

function scanWarehouse(payload = null) {
    console.log('\u5F00\u59CB\u626B\u63CF/\u6D4B\u8BD5\u4ED3\u5E93\uFF0CauthToken:', authToken ? '\u5DF2\u8BBE\u7F6E' : '\u672A\u8BBE\u7F6E', payload || {});
    scanProgress = 5;
    scanStatus = payload?.test ? `\u626B\u63CF\u6D4B\u8BD5\u5DF2\u4E0B\u53D1\uFF1A${payload.mode}` : '\u626B\u63CF\u4EFB\u52A1\u5DF2\u4E0B\u53D1\uFF0C\u53EF\u968F\u65F6\u70B9\u51FB\u201C\u505C\u6B62\u626B\u63CF/\u79FB\u52A8\u201D';
    updateMineflayerUI();
    const options = payload
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        : { method: 'POST' };

    fetchWithAuth('/api/admin/mainbot/scan', options).then(res => {
        console.log('\u626B\u63CF\u63A5\u53E3\u54CD\u5E94\u72B6\u6001:', res.status);
        return res.json();
    }).then(data => {
        console.log('\u626B\u63CF\u63A5\u53E3\u54CD\u5E94\u6570\u636E:', data);
        if (data.success) {
            botStatus = 'online';
            scanStatus = payload?.test ? `\u626B\u63CF\u6D4B\u8BD5\u5DF2\u4E0B\u53D1\uFF1A${payload.mode}` : '\u626B\u63CF\u4EFB\u52A1\u5DF2\u4E0B\u53D1\uFF0C\u53EF\u968F\u65F6\u70B9\u51FB\u201C\u505C\u6B62\u626B\u63CF/\u79FB\u52A8\u201D';
            showSystemMessage('\u626B\u63CF\u5DF2\u4E0B\u53D1', scanStatus, 'info');
            updateMineflayerUI();
        } else {
            scanProgress = 0;
            scanStatus = data.error || '\u626B\u63CF\u5931\u8D25';
            updateMineflayerUI();
            showSystemMessage('\u626B\u63CF\u5931\u8D25', data.error || '\u626B\u63CF\u5931\u8D25', 'error');
        }
    }).catch(err => {
        console.error('\u626B\u63CF\u8BF7\u6C42\u5931\u8D25:', err);
        scanProgress = 0;
        scanStatus = '\u626B\u63CF\u8BF7\u6C42\u5931\u8D25';
        updateMineflayerUI();
        showSystemMessage('\u626B\u63CF\u8BF7\u6C42\u5931\u8D25', err.message, 'error');
    });
}

function cancelScanWarehouse() {
    fetchWithAuth('/api/admin/mainbot/scan/cancel', { method: 'POST' }).then(res => res.json()).then(data => {
        if (data.success) {
            scanProgress = 0;
            scanStatus = '\u5DF2\u53D1\u9001\u505C\u6B62\u626B\u63CF/\u79FB\u52A8\u6307\u4EE4';
            updateMineflayerUI();
            showSystemMessage('\u5DF2\u505C\u6B62', '\u5DF2\u53D1\u9001\u505C\u6B62\u626B\u63CF/\u79FB\u52A8\u6307\u4EE4\u3002\u5982\u679C Bot \u6B63\u5728\u5F00\u7BB1\uFF0C\u4F1A\u5728\u5F53\u524D\u52A8\u4F5C\u7ED3\u675F\u540E\u505C\u6B62\u3002', 'success');
        } else {
            showSystemMessage('\u505C\u6B62\u5931\u8D25', data.error || '\u505C\u6B62\u626B\u63CF\u5931\u8D25', 'error');
        }
    }).catch(err => {
        showSystemMessage('\u505C\u6B62\u5931\u8D25', err.message, 'error');
    });
}

function scanPositionPrompt() {
    const raw = prompt('请输入箱子坐标，格式：x y z');
    if (!raw) return;
    const parts = raw.trim().split(/[,\s]+/).map(Number);
    if (parts.length < 3 || parts.some(v => !Number.isFinite(v))) {
        alert('坐标格式错误，请输入：x y z');
        return;
    }
    scanWarehouse({ mode: 'position', x: parts[0], y: parts[1], z: parts[2], test: true });
}
function loadScanAreas() {
    fetchWithAuth('/api/admin/scan-areas', { method: 'GET' }).then(res => res.json()).then(data => {
        if (data.success) {
            const list = document.getElementById('scanAreasList');
            if (!list) return;
            
            if (data.scanAreas && data.scanAreas.length > 0) {
                list.innerHTML = data.scanAreas.map(area => `
                    <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:8px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div>
                                <strong style="color:#f1f5f9;font-size:14px">${area.name}</strong>
                                <span style="margin-left:8px;padding:3px 8px;border-radius:10px;font-size:11px;${area.enabled ? 'background:rgba(16,185,129,0.2);color:#10b981' : 'background:rgba(239,68,68,0.2);color:#ef4444'}">${area.enabled ? '启用' : '禁用'}</span>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <button class="btn btn-info" style="font-size:11px;padding:4px 10px" onclick="openScanAreaModal('${area.id}')">编辑</button>
                                <button class="btn btn-danger" style="font-size:11px;padding:4px 10px" onclick="deleteScanArea('${area.id}')">删除</button>
                                <button class="btn ${area.enabled ? 'btn-warning' : 'btn-success'}" style="font-size:11px;padding:4px 10px" onclick="toggleScanArea('${area.id}', ${!area.enabled})">${area.enabled ? '禁用' : '启用'}</button>
                            </div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;font-size:12px;">
                            ${area.warpCommand ? `<div><span style="color:#64748b">传送命令:</span><div style="color:#94a3b8">${area.warpCommand}</div></div>` : ''}
                            <div><span style="color:#64748b">扫描范围:</span><div style="color:#94a3b8">x: ${area.scanRegion.startX}~${area.scanRegion.endX}</div></div>
                            <div><span style="color:#64748b">Y范围:</span><div style="color:#94a3b8">${area.scanRegion.minY}~${area.scanRegion.maxY}</div></div>
                            <div><span style="color:#64748b">模式:</span><div style="color:#94a3b8">${area.scanMode === 'bulk' ? '大宗' : '多物品'}</div></div>
                            <div><span style="color:#64748b">Z坐标:</span><div style="color:#94a3b8">${area.scanMode === 'bulk' ? ((area.scanRegion.minZ ?? area.scanRegion.z) + '~' + (area.scanRegion.maxZ ?? area.scanRegion.z)) : area.scanRegion.z}</div></div>
                            <div><span style="color:#64748b">容器:</span><div style="color:#94a3b8">${area.scanMode === 'bulk' ? ((area.containerTypes || ['chest','shulker']).join(' + ')) : '箱子/桶'}</div></div>
                            <div><span style="color:#64748b">扫描顺序:</span><div style="color:#94a3b8">${area.scanOrder === 'y-desc' ? '从上到下' : '从下到上'}</div></div>
                            ${area.startPositions && area.startPositions.length > 0 ? `<div><span style="color:#64748b">起始位置:</span><div style="color:#94a3b8">${area.startPositions.length} 个</div></div>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;">暂无扫描区域配置</div>';
            }
        }
    }).catch(err => {
        console.error('加载扫描区域失败:', err);
    });
}

function openScanAreaModal(areaId = null) {
    let area = null;
    if (areaId) {
        fetchWithAuth('/api/admin/scan-areas', { method: 'GET' }).then(res => res.json()).then(data => {
            if (data.success) {
                area = data.scanAreas.find(a => a.id === areaId);
                showScanAreaModal(area);
            }
        });
    } else {
        showScanAreaModal(null);
    }
}

function showScanAreaModal(area) {
    const modalContent = `
        <div style="padding:20px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
                <div>
                    <label style="color:#64748b;font-size:12px">区域名称 *</label>
                    <input type="text" class="input-field" id="saName" value="${area ? area.name : ''}" placeholder="如: 安芸工业区">
                </div>
                <div>
                    <label style="color:#64748b;font-size:12px">传送命令</label>
                    <input type="text" class="input-field" id="saWarp" value="${area ? area.warpCommand : ''}" placeholder="/phome xxx">
                </div>
            </div>
            <div style="margin-bottom:16px;padding:14px;background:rgba(0,0,0,0.2);border-radius:8px;">
                <div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:12px;">扫描区域范围</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
                    <div><label style="color:#64748b;font-size:12px">扫描模式</label><select class="input-field" id="saScanMode" onchange="toggleScanModeFields()"><option value="mixed" ${!area || area.scanMode !== 'bulk' ? 'selected' : ''}>多物品（单Z）</option><option value="bulk" ${area && area.scanMode === 'bulk' ? 'selected' : ''}>大宗（Z范围）</option></select></div>
                    <div><label style="color:#64748b;font-size:12px">起始X</label><input type="number" class="input-field" id="saStartX" value="${area ? area.scanRegion.startX : ''}"></div>
                    <div><label style="color:#64748b;font-size:12px">结束X</label><input type="number" class="input-field" id="saEndX" value="${area ? area.scanRegion.endX : ''}"></div>
                    <div><label style="color:#64748b;font-size:12px">最小Y</label><input type="number" class="input-field" id="saMinY" value="${area ? area.scanRegion.minY : ''}"></div>
                    <div><label style="color:#64748b;font-size:12px">最大Y</label><input type="number" class="input-field" id="saMaxY" value="${area ? area.scanRegion.maxY : ''}"></div>
                    <div id="singleZField"><label style="color:#64748b;font-size:12px">Z坐标</label><input type="number" class="input-field" id="saZ" value="${area ? area.scanRegion.z : ''}"></div>
                    <div id="bulkMinZField"><label style="color:#64748b;font-size:12px">最小Z</label><input type="number" class="input-field" id="saMinZ" value="${area ? (area.scanRegion.minZ ?? area.scanRegion.z ?? '') : ''}"></div>
                    <div id="bulkMaxZField"><label style="color:#64748b;font-size:12px">最大Z</label><input type="number" class="input-field" id="saMaxZ" value="${area ? (area.scanRegion.maxZ ?? area.scanRegion.z ?? '') : ''}"></div>
                </div>
                <div id="bulkContainerFields" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
                    <label style="color:#cbd5e1;font-size:12px"><input type="checkbox" id="saTypeChest" ${(area?.containerTypes || ['chest','shulker']).includes('chest') ? 'checked' : ''}> 扫描箱子/桶（盒装）</label>
                    <label style="color:#cbd5e1;font-size:12px"><input type="checkbox" id="saTypeShulker" ${(area?.containerTypes || ['chest','shulker']).includes('shulker') ? 'checked' : ''}> 扫描潜影盒（散装）</label>
                    <div><label style="color:#64748b;font-size:12px">容器顺序</label><select class="input-field" id="saContainerOrder"><option value="chest,shulker" ${(area?.containerOrder || ['chest','shulker']).join(',') === 'chest,shulker' ? 'selected' : ''}>先箱子后潜影盒</option><option value="shulker,chest" ${(area?.containerOrder || []).join(',') === 'shulker,chest' ? 'selected' : ''}>先潜影盒后箱子</option></select></div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
                <div>
                    <label style="color:#64748b;font-size:12px">扫描顺序</label>
                    <select class="input-field" id="saOrder">
                        <option value="y-desc" ${area && area.scanOrder === 'y-desc' ? 'selected' : ''}>从上到下</option>
                        <option value="y-asc" ${area && area.scanOrder === 'y-asc' ? 'selected' : ''}>从下到上</option>
                    </select>
                </div>
                <div>
                    <label style="color:#64748b;font-size:12px">启用状态</label>
                    <select class="input-field" id="saEnabled">
                        <option value="true" ${(!area || area.enabled) ? 'selected' : ''}>启用</option>
                        <option value="false" ${area && !area.enabled ? 'selected' : ''}>禁用</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:13px;font-weight:600;color:#f1f5f9;">起始位置 (传送后移动的位置)</span>
                    <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" onclick="addStartPosition()">添加位置</button>
                </div>
                <div id="startPositionsList">
                    ${area && area.startPositions && area.startPositions.length > 0 ? area.startPositions.map((pos, idx) => `
                        <div style="display:flex;gap:8px;margin-bottom:8px;">
                            <input type="number" class="input-field" style="flex:1" placeholder="X" value="${pos.x}" data-idx="${idx}" id="spX${idx}">
                            <input type="number" class="input-field" style="flex:1" placeholder="Y" value="${pos.y}" data-idx="${idx}" id="spY${idx}">
                            <input type="number" class="input-field" style="flex:1" placeholder="Z" value="${pos.z}" data-idx="${idx}" id="spZ${idx}">
                            <button class="btn btn-danger" style="padding:8px 12px" onclick="removeStartPosition(${idx})">删除</button>
                        </div>
                    `).join('') : '<div style="color:#64748b;font-size:12px">暂无起始位置</div>'}
                </div>
            </div>
        </div>
    `;
    
    showModal(area ? '编辑扫描区域' : '添加扫描区域', modalContent, [
        { text: '保存', primary: true, onclick: () => { saveScanArea(area ? area.id : null); } },
        { text: '取消', onclick: closeModal }
    ]);
    
    if (!area || !area.startPositions || area.startPositions.length === 0) {
        window.startPositionCount = 0;
    } else {
        window.startPositionCount = area.startPositions.length;
    }
    toggleScanModeFields();
}

function toggleScanModeFields() {
    const isBulk = document.getElementById('saScanMode')?.value === 'bulk';
    ['bulkMinZField', 'bulkMaxZField', 'bulkContainerFields'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isBulk ? '' : 'none';
    });
    const singleZ = document.getElementById('singleZField');
    if (singleZ) singleZ.style.display = isBulk ? 'none' : '';
}

function addStartPosition() {
    const list = document.getElementById('startPositionsList');
    if (!list) return;
    
    const idx = window.startPositionCount || 0;
    const html = `<div style="display:flex;gap:8px;margin-bottom:8px;">
        <input type="number" class="input-field" style="flex:1" placeholder="X" id="spX${idx}">
        <input type="number" class="input-field" style="flex:1" placeholder="Y" id="spY${idx}">
        <input type="number" class="input-field" style="flex:1" placeholder="Z" id="spZ${idx}">
        <button class="btn btn-danger" style="padding:8px 12px" onclick="removeStartPosition(${idx})">删除</button>
    </div>`;
    
    if (list.innerHTML.includes('暂无起始位置')) {
        list.innerHTML = html;
    } else {
        list.innerHTML += html;
    }
    window.startPositionCount = idx + 1;
}

function removeStartPosition(idx) {
    const list = document.getElementById('startPositionsList');
    if (!list) return;
    
    const divs = list.querySelectorAll('div');
    if (divs.length <= 1) {
        list.innerHTML = '<div style="color:#64748b;font-size:12px">暂无起始位置</div>';
        window.startPositionCount = 0;
        return;
    }
    
    const inputs = list.querySelectorAll(`[data-idx="${idx}"]`);
    inputs.forEach(input => input.parentElement.remove());
}

function saveScanArea(areaId) {
    const name = document.getElementById('saName').value;
    const warpCommand = document.getElementById('saWarp').value;
    const scanMode = document.getElementById('saScanMode')?.value === 'bulk' ? 'bulk' : 'mixed';
    const scanRegion = {
        startX: parseInt(document.getElementById('saStartX').value) || 0,
        endX: parseInt(document.getElementById('saEndX').value) || 0,
        minY: parseInt(document.getElementById('saMinY').value) || 0,
        maxY: parseInt(document.getElementById('saMaxY').value) || 0,
        z: parseInt(document.getElementById('saZ')?.value) || 0,
        minZ: parseInt(document.getElementById('saMinZ')?.value) || parseInt(document.getElementById('saZ')?.value) || 0,
        maxZ: parseInt(document.getElementById('saMaxZ')?.value) || parseInt(document.getElementById('saZ')?.value) || 0
    };
    const scanOrder = document.getElementById('saOrder').value;
    const enabled = document.getElementById('saEnabled').value === 'true';
    const containerTypes = [];
    if (document.getElementById('saTypeChest')?.checked) containerTypes.push('chest');
    if (document.getElementById('saTypeShulker')?.checked) containerTypes.push('shulker');
    const containerOrder = String(document.getElementById('saContainerOrder')?.value || 'chest,shulker').split(',').filter(Boolean);
    
    const startPositions = [];
    const list = document.getElementById('startPositionsList');
    if (list && !list.innerHTML.includes('暂无起始位置')) {
        const count = window.startPositionCount || 0;
        for (let i = 0; i < count; i++) {
            const x = document.getElementById(`spX${i}`);
            const y = document.getElementById(`spY${i}`);
            const z = document.getElementById(`spZ${i}`);
            if (x && y && z && x.value && y.value && z.value) {
                startPositions.push({
                    x: parseInt(x.value),
                    y: parseInt(y.value),
                    z: parseInt(z.value)
                });
            }
        }
    }
    
    if (!name) {
        alert('请输入区域名称');
        return;
    }
    
    const url = areaId ? '/api/admin/scan-areas/update' : '/api/admin/scan-areas/add';
    const body = areaId ? { id: areaId, name, warpCommand, scanRegion, scanOrder, enabled, startPositions, scanMode, containerTypes, containerOrder } :
                          { name, warpCommand, scanRegion, scanOrder, enabled, startPositions, scanMode, containerTypes, containerOrder };
    
    fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json()).then(data => {
            if (data.success) {
                closeModal();
                loadScanAreas();
                showSystemMessage('保存成功', '扫描区域已保存，并已写入仓库配置文件。', 'success');
            } else {
                alert(data.error || '保存失败');
            }
        }).catch(err => {
            console.error('保存失败:', err);
            alert('保存失败');
        });
}

function deleteScanArea(areaId) {
    if (!confirm('确定要删除这个扫描区域吗？')) return;
    
    fetchWithAuth('/api/admin/scan-areas/delete', { method: 'POST', body: JSON.stringify({ id: areaId }), headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json()).then(data => {
            if (data.success) {
                loadScanAreas();
            } else {
                alert(data.error || '删除失败');
            }
        }).catch(err => {
            console.error('删除失败:', err);
            alert('删除失败');
        });
}

function toggleScanArea(areaId, enabled) {
    fetchWithAuth('/api/admin/scan-areas/update', { method: 'POST', body: JSON.stringify({ id: areaId, enabled }), headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json()).then(data => {
            if (data.success) {
                loadScanAreas();
            } else {
                alert(data.error || '操作失败');
            }
        }).catch(err => {
            console.error('操作失败:', err);
            alert('操作失败');
        });
}

function saveMainBotConfig() {
    const name = document.getElementById('mbName').value;
    const email = document.getElementById('mbEmail').value;
    const host = document.getElementById('mbHost').value;
    const port = document.getElementById('mbPort').value;
    const version = document.getElementById('mbVersion').value;
    
    const config = { name, email, host, port, version };
    
    localStorage.setItem('mainBotConfig', JSON.stringify(config));
    
    fetchWithAuth('/api/admin/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    }).then(res => res.json()).then(data => {
        if (data.success) {
            alert('配置已保存并缓存');
            mainBotConfig = config;
            syncConfigToCloud(config);
        }
    });
}

function loadCachedConfig() {
    const cached = localStorage.getItem('mainBotConfig');
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function syncConfigToCloud(config) {
    const cloudUrl = localStorage.getItem('cloudServerUrl');
    const cloudApiKey = localStorage.getItem('cloudApiKey');
    if (!cloudUrl) return;
    const baseUrl = /^https?:\/\//i.test(cloudUrl) ? cloudUrl.replace(/\/$/, '') : `http://${cloudUrl}`;
    
    fetch(`${baseUrl}/api/admin/config/update`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cloudApiKey
        },
        body: JSON.stringify(config)
    }).then(res => res.json()).then(data => {
        if (data.success) {
            console.log('配置已同步到云服务器');
        }
    }).catch(err => {
        console.log('同步到云服务器失败:', err.message);
    });
}

function openAdminPanel() {
    if (!authToken) { showLoginModal(); return; }
    const content = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="font-size:18px;font-weight:600;color:#f1f5f9;">运输Bot管理</h3>
                <button class="btn btn-primary" onclick="showCreateBotDialog()">创建新Bot</button>
            </div>
            <div id="transportBotList"></div>

            <div class="card" style="margin-top:24px;" id="pickupStatsPanel">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
                    <div>
                        <div class="card-title">取货日志与玩家统计</div>
                        <div style="font-size:12px;color:#94a3b8;">公开接口：/api/pickup/logs、/api/pickup/stats；后台接口保留完整字段。</div>
                    </div>
                    <button class="btn btn-secondary" onclick="loadPickupStatsPanel()">刷新</button>
                </div>
                <div id="pickupStatsSummary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px;"></div>
                <div id="pickupPlayerStats" style="display:grid;gap:8px;margin-bottom:12px;"></div>
                <div id="pickupRecentLogs" style="display:grid;gap:8px;max-height:240px;overflow:auto;"></div>
            </div>

            <div class="card" style="margin-top:24px;">
                <div class="card-title">运输 Bot 通信配置</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                    <div>
                        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">云端后台地址 mainHost</label>
                        <input type="text" class="input-field" id="transportMainHost" placeholder="云服务器公网 IP 或域名">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">后台管理端口</label>
                        <input type="number" class="input-field" id="transportMainAdminPort" placeholder="28474">
                    </div>
                    <div>
                        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">前端端口</label>
                        <input type="number" class="input-field" id="transportMainPort" placeholder="28473">
                    </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px;align-items:center;">
                    <button class="btn btn-primary" onclick="saveTransportConfig()">保存运输通信配置</button>
                    <button class="btn btn-secondary" onclick="retranslateWarehouseItems()">修复物品中文名</button>
                    <span id="transportConfigHint" style="font-size:12px;color:#64748b;"></span>
                </div>
            </div>
            
            <div class="card" style="margin-top:24px;">
                <div class="card-title">云服务器连接</div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">云服务器地址 (IP或域名):</label>
                    <input type="text" class="input-field" id="cloudUrl" placeholder="https://admin.example.com 或内网管理地址">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">API密钥:</label>
                    <input type="password" class="input-field" id="cloudApiKey" placeholder="输入API密钥">
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" onclick="connectCloudServer()">连接云服务器</button>
                    <button class="btn btn-secondary" onclick="syncToCloud()">立即同步</button>
                    <span id="cloudStatus" style="margin-left:8px;line-height:36px;color:#64748b;font-size:13px;">未连接</span>
                </div>
            </div>
            
            <div class="card" style="margin-top:24px;">
                <div class="card-title">配置目录</div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">当前配置目录:</label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" class="input-field" id="configDir" readonly style="flex:1;">
                        <button class="btn btn-secondary" onclick="selectConfigDir()">选择目录</button>
                    </div>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">从压缩包导入配置:</label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" class="input-field" id="zipPath" placeholder="选择zip配置文件路径" style="flex:1;">
                        <button class="btn btn-secondary" onclick="unzipConfig()">解压并设置</button>
                    </div>
                </div>
                <div id="scanResult" style="font-size:12px;color:#64748b;"></div>
            </div>
            
            <div class="card" style="margin-top:24px;">
                <div class="card-title">商品管理</div>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <button class="btn btn-primary" onclick="openProductManager()">管理商品</button>
                    <button class="btn btn-secondary" onclick="refreshProducts()">刷新商品列表</button>
                    <button class="btn btn-success" onclick="showAddProductDialog()">添加商品</button>
                </div>
                <div id="productListPreview" style="font-size:12px;color:#64748b;">点击"管理商品"查看详细列表</div>
            </div>
            
            <div class="card" style="margin-top:24px;">
                <div class="card-title">黑名单管理</div>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <button class="btn btn-primary" onclick="openBlacklistManager()">管理黑名单</button>
                    <button class="btn btn-secondary" onclick="refreshBlacklist()">刷新黑名单</button>
                    <button class="btn btn-danger" onclick="showAddBlacklistDialog()">添加黑名单</button>
                </div>
                <div id="blacklistPreview" style="font-size:12px;color:#64748b;">点击"管理黑名单"查看详细列表</div>
            </div>
            
            <div class="card" style="margin-top:24px;">
                <div class="card-title">系统设置</div>
                <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">服务器地址:</label>
                <input type="text" class="input-field" id="serverHost" placeholder="mc.zenoxs.cn">
                <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">服务器端口:</label>
                <input type="text" class="input-field" id="serverPort" placeholder="25565">
                <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">游戏版本:</label>
                <input type="text" class="input-field" id="serverVersion" placeholder="1.20.4">
                <div style="margin-top:12px;margin-bottom:6px;">
                    <label style="font-size:13px;color:#64748b;">API密钥 (JWT):</label>
                    <div style="display:flex;gap:8px;margin-top:4px;">
                        <input type="text" class="input-field" id="apiKeyDisplay" readonly style="flex:1;font-family:monospace;font-size:12px;">
                        <button class="btn btn-secondary" onclick="copyApiKey()">复制</button>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="saveSettings()">保存设置</button>
            </div>

            <div class="card" style="margin-top:24px;">
                <div class="card-title">仓库模式设置</div>
                <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">仓库模式:</label>
                <select class="input-field" id="warehouseMode" style="margin-bottom:12px;">
                    <option value="PUBLIC">公用模式</option>
                    <option value="TOWN_ONLY">小镇模式</option>
                </select>
                <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">小镇前缀（不含括号）:</label>
                <input type="text" class="input-field" id="townPrefix" placeholder="千年科技" style="margin-bottom:12px;">
                <button class="btn btn-primary" onclick="saveWarehouseMode()">保存模式设置</button>
            </div>
        </div>
    `;
    createWindow('admin', '系统管理', 'settings', content, 880, 720);
    setTimeout(() => { 
        loadTransportBots(); 
        loadSettings();
        loadTransportConfig();
        loadCloudStatus();
        loadConfigDir();
        loadPickupStatsPanel();
        // 加载缓存的云服务器配置
        loadCachedCloudConfig();
    }, 100);
}

async function loadPickupStatsPanel(playerFilter = '') {
    const panel = document.getElementById('pickupStatsPanel');
    if (!panel) return;
    const summaryEl = document.getElementById('pickupStatsSummary');
    const playersEl = document.getElementById('pickupPlayerStats');
    const logsEl = document.getElementById('pickupRecentLogs');
    const encodedPlayer = encodeURIComponent(playerFilter || '');
    try {
        const [statsRes, logsRes] = await Promise.all([
            fetchWithAuth('/api/admin/pickup/stats').then(res => res.json()),
            fetchWithAuth(`/api/admin/pickup/logs?limit=120${encodedPlayer ? `&playerName=${encodedPlayer}` : ''}`).then(res => res.json())
        ]);
        const stats = statsRes.stats || {};
        const total = stats.total || {};
        summaryEl.innerHTML = [
            ['请求', total.requested || 0],
            ['完成', total.completed || 0],
            ['失败', total.failed || 0],
            ['总数量', total.quantity || 0]
        ].map(([label, value]) => `
            <div style="padding:12px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.34);">
                <div style="font-size:12px;color:#94a3b8;">${label}</div>
                <div style="font-size:22px;font-weight:800;color:#e2e8f0;">${value}</div>
            </div>
        `).join('');

        const players = Object.entries(stats.players || {})
            .map(([playerName, stat]) => ({ playerName, ...stat }))
            .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
            .slice(0, 12);
        playersEl.innerHTML = players.length ? `
            <div style="display:grid;grid-template-columns:150px repeat(4,1fr);gap:8px;padding:7px 10px;color:#94a3b8;font-size:12px;">
                <span>玩家</span><span>请求次数</span><span>完成次数</span><span>失败次数</span><span>成功数量</span>
            </div>
            ${players.map(player => `
            <button type="button" onclick="loadPickupStatsPanel('${escapeAttr(player.playerName)}')" style="width:100%;display:grid;grid-template-columns:150px repeat(4,1fr);gap:8px;padding:10px;border-radius:10px;background:${playerFilter === player.playerName ? 'rgba(59,130,246,.28)' : 'rgba(15,23,42,.28)'};border:1px solid rgba(148,163,184,.12);font-size:13px;color:#e2e8f0;text-align:left;cursor:pointer;">
                <strong style="color:#bfdbfe;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(player.playerName)}</strong>
                <span>请求 ${Number(player.requested || 0)}</span>
                <span style="color:#22c55e;">完成 ${Number(player.completed || 0)}</span>
                <span style="color:${Number(player.failed || 0) > 0 ? '#f87171' : '#94a3b8'};">失败 ${Number(player.failed || 0)}</span>
                <span>数量 ${Number(player.quantity || 0)}</span>
            </button>
        `).join('')}
            <button type="button" onclick="loadPickupStatsPanel('')" style="margin-top:4px;width:max-content;padding:7px 10px;border-radius:8px;border:1px solid rgba(148,163,184,.2);background:rgba(15,23,42,.3);color:#bfdbfe;cursor:pointer;">显示全部明细</button>
        ` : '<div style="color:#94a3b8;">暂无玩家取货统计</div>';

        const stageText = {
            queued: '已排队',
            mainbot_started: '主Bot处理',
            transport_start: '运输取货',
            transport_ready_to_tpa: '准备传送',
            delivery_tpa_sent: '已发TPA',
            transport_failed: '运输失败',
            completed: '已完成',
            failed: '失败'
        };
        const title = playerFilter ? `最近明细：${playerFilter}` : '最近明细：全部玩家';
        const logs = Array.isArray(logsRes.logs) ? logsRes.logs : [];
        logsEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;color:#94a3b8;font-size:12px;margin-top:4px;">
                <span>${escapeHtml(title)}</span>
                <span>点击玩家行可筛选失败明细</span>
            </div>
            ${logs.length ? logs.map(log => `
            <div style="display:grid;grid-template-columns:155px 120px minmax(0,1fr) 86px minmax(0,1fr);gap:8px;padding:8px 10px;border-radius:10px;background:rgba(15,23,42,.22);border:1px solid rgba(148,163,184,.1);font-size:12px;">
                <span style="color:#94a3b8;">${escapeHtml(log.time ? new Date(log.time).toLocaleString('zh-CN') : '-')}</span>
                <strong style="color:#e0f2fe;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(log.playerName || 'unknown')}</strong>
                <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(log.itemName || '-')} × ${Number(log.quantity || 0)}</span>
                <span style="color:${log.stage === 'failed' || log.stage === 'transport_failed' ? '#f87171' : log.stage === 'completed' ? '#22c55e' : '#93c5fd'};">${escapeHtml(stageText[log.stage] || log.stage || '-')}</span>
                <span style="color:#fca5a5;overflow:hidden;text-overflow:ellipsis;" title="${escapeAttr(log.error || '')}">${escapeHtml(log.error || '')}</span>
            </div>
        `).join('') : '<div style="color:#94a3b8;">暂无取货日志</div>'}
        `;
    } catch (err) {
        if (logsEl) logsEl.innerHTML = `<div style="color:#f87171;">取货统计加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function loadCachedCloudConfig() {
    const cachedUrl = localStorage.getItem('cloudServerUrl');
    const cachedApiKey = localStorage.getItem('cloudApiKey');
    const urlEl = document.getElementById('cloudUrl');
    const apiKeyEl = document.getElementById('cloudApiKey');
    if (cachedUrl && urlEl) urlEl.value = cachedUrl;
    if (cachedApiKey && apiKeyEl) apiKeyEl.value = cachedApiKey;
}

function loadTransportConfig() {
    fetchWithAuth('/api/admin/transport-config').then(res => res.json()).then(data => {
        if (!data.success) return;
        const config = data.config || {};
        const mainHostEl = document.getElementById('transportMainHost');
        const mainAdminPortEl = document.getElementById('transportMainAdminPort');
        const mainPortEl = document.getElementById('transportMainPort');
        const hintEl = document.getElementById('transportConfigHint');
        if (mainHostEl) mainHostEl.value = config.mainHost || '';
        if (mainAdminPortEl) mainAdminPortEl.value = config.mainAdminPort || 28474;
        if (mainPortEl) mainPortEl.value = config.mainPort || 28473;
        if (hintEl) hintEl.textContent = config.mainHost ? `当前连接：${config.mainHost}:${config.mainAdminPort || 28474}` : '未设置云端后台地址';
    }).catch(err => {
        showSystemMessage('读取失败', '无法读取运输通信配置：' + err.message, 'error');
    });
}

function saveTransportConfig() {
    const mainHost = document.getElementById('transportMainHost')?.value.trim();
    const mainAdminPort = Number(document.getElementById('transportMainAdminPort')?.value || 28474);
    const mainPort = Number(document.getElementById('transportMainPort')?.value || 28473);
    if (!mainHost) {
        showSystemMessage('配置不完整', '请填写云服务器公网 IP 或域名。', 'error');
        return;
    }

    fetchWithAuth('/api/admin/transport-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainHost, mainAdminPort, mainPort })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            showSystemMessage('保存成功', '运输 Bot 通信配置已保存。本地运输 Bot 重启后会使用新地址。', 'success');
            loadTransportConfig();
        } else {
            showSystemMessage('保存失败', data.error || '运输通信配置保存失败', 'error');
        }
    }).catch(err => {
        showSystemMessage('保存失败', err.message, 'error');
    });
}

function retranslateWarehouseItems() {
    fetchWithAuth('/api/admin/warehouse/retranslate', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showSystemMessage('修复完成', `已修正 ${data.updated || 0} 个物品显示名。${data.unresolved?.length ? '\n未匹配示例：' + data.unresolved.slice(0, 8).join(', ') : ''}`, 'success');
                refreshProducts?.();
            } else {
                showSystemMessage('修复失败', data.error || '物品翻译修复失败', 'error');
            }
        })
        .catch(err => showSystemMessage('修复失败', err.message, 'error'));
}

function loadSettings() {
    fetchWithAuth('/api/settings').then(res => res.json()).then(data => {
        if (data.success && data.settings) {
            document.getElementById('serverHost').value = data.settings.host || '';
            document.getElementById('serverPort').value = data.settings.port || '';
            document.getElementById('serverVersion').value = data.settings.version || '';
        }
    });
    
    fetchWithAuth('/api/admin/api-key').then(res => res.json()).then(data => {
        if (data.success && data.apiKey) {
            const keyEl = document.getElementById('apiKeyDisplay');
            if (keyEl) keyEl.value = data.apiKey;
        }
    });
    
    fetchWithAuth('/api/admin/warehouse-mode').then(res => res.json()).then(data => {
        if (data.success) {
            const modeEl = document.getElementById('warehouseMode');
            const prefixEl = document.getElementById('townPrefix');
            if (modeEl) modeEl.value = data.mode || 'PUBLIC';
            if (prefixEl && data.townPrefix) {
                prefixEl.value = data.townPrefix.replace(/[\[\](){}<>]/g, '');
            }
        }
    });
}

function saveWarehouseMode() {
    const mode = document.getElementById('warehouseMode').value;
    let townPrefix = document.getElementById('townPrefix').value;
    if (townPrefix && !townPrefix.startsWith('[') && !townPrefix.startsWith('(')) {
        townPrefix = '[' + townPrefix + ']';
    }
    
    fetchWithAuth('/api/admin/warehouse-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, townPrefix })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            const modeText = mode === 'PUBLIC' ? '公用模式' : '小镇模式';
            showModal('成功', `仓库模式已更新为: ${modeText}`);
        } else {
            showModal('失败', '更新失败');
        }
    });
}

function copyApiKey() {
    const keyEl = document.getElementById('apiKeyDisplay');
    if (keyEl && keyEl.value) {
        navigator.clipboard.writeText(keyEl.value).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '已复制';
            setTimeout(() => btn.textContent = originalText, 1500);
        }).catch(() => {
            keyEl.select();
            document.execCommand('copy');
        });
    }
}

function loadCloudStatus() {
    fetchWithAuth('/api/cloud/server').then(res => res.json()).then(data => {
        if (data.success) {
            const statusEl = document.getElementById('cloudStatus');
            if (statusEl) {
                if (data.config.connected) {
                    statusEl.textContent = '已连接';
                    statusEl.style.color = '#22c55e';
                } else {
                    statusEl.textContent = '未连接';
                    statusEl.style.color = '#64748b';
                }
            }
            if (data.config.url) {
                const urlEl = document.getElementById('cloudUrl');
                if (urlEl) urlEl.value = data.config.url;
            }
        }
    });
}

function connectCloudServer() {
    const url = document.getElementById('cloudUrl').value.trim();
    const apiKey = document.getElementById('cloudApiKey').value.trim();
    if (!url || !apiKey) {
        showModal('提示', '请输入云服务器地址和API密钥');
        return;
    }
    
    // 缓存云服务器配置
    localStorage.setItem('cloudServerUrl', url);
    localStorage.setItem('cloudApiKey', apiKey);
    
    fetchWithAuth('/api/cloud/server/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            showModal('成功', `云服务器连接成功！${data.synced ? '配置已同步' : ''}`);
            loadCloudStatus();
            loadTransportBots();
            // 同步主Bot配置到云端
            if (mainBotConfig) {
                syncConfigToCloud(mainBotConfig);
            }
        } else {
            let errorMsg = data.error || '连接失败';
            if (data.portHint) {
                errorMsg += '\n\n端口配置建议：\n' + data.portHint;
            }
            showModal('失败', errorMsg);
        }
    });
}

function syncToCloud() {
    fetchWithAuth('/api/cloud/sync', { method: 'POST' })
        .then(res => res.json()).then(data => {
            if (data.success) {
                showModal('成功', '同步成功！');
            } else {
                showModal('失败', '同步失败，请检查云服务器连接');
            }
        });
}

function loadConfigDir() {
    fetchWithAuth('/api/config/dir').then(res => res.json()).then(data => {
        if (data.success) {
            const dirEl = document.getElementById('configDir');
            if (dirEl) dirEl.value = data.dir;
            scanConfigDir(data.dir);
        }
    });
}

function selectConfigDir() {
    const dir = prompt('请输入配置目录路径:', '');
    if (!dir) return;
    fetchWithAuth('/api/config/dir/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            loadConfigDir();
            loadTransportBots();
            showModal('成功', '配置目录已设置');
        } else {
            showModal('失败', data.error || '设置失败');
        }
    });
}

function scanConfigDir(dir) {
    fetchWithAuth('/api/config/dir/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            const resultEl = document.getElementById('scanResult');
            if (resultEl) {
                resultEl.innerHTML = data.hasTransportConfig 
                    ? `<span style="color:#22c55e">✓ 检测到 transport_config.json，共 ${data.botCount} 个Bot配置</span>`
                    : '<span style="color:#f59e0b">⚠ 未检测到配置文件</span>';
            }
        }
    });
}

function unzipConfig() {
    const zipPath = document.getElementById('zipPath').value.trim();
    const targetDir = prompt('请输入解压目标目录:', '');
    if (!zipPath || !targetDir) return;
    fetchWithAuth('/api/config/unzip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipPath, targetDir })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            fetchWithAuth('/api/config/dir/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dir: targetDir })
            }).then(res => res.json()).then(data2 => {
                if (data2.success) {
                    loadConfigDir();
                    loadTransportBots();
                    showModal('成功', '配置文件已解压并设置为配置目录');
                }
            });
        } else {
            showModal('失败', data.error || '解压失败');
        }
    });
}

function loadTransportBots() {
    fetchWithAuth('/api/admin/transport-bots').then(res => res.json()).then(data => {
        transportBots = Array.isArray(data) ? data : (data.bots || []);
        renderBotList();
    });
}

function formatTransportStatus(bot) {
    if (bot.online) return bot.busy ? '在线/执行任务' : '在线/空闲';
    if (bot.running && bot.loginUrl?.url) return '等待 Microsoft 登录';
    if (bot.running) return '进程运行，未进服/无心跳';
    const status = bot.currentStatus || bot.status || 'stopped';
    const map = {
        running: '运行中',
        starting: '启动中',
        stopped: '已停止',
        offline: '离线',
        online: '在线',
        sleeping: '休眠中',
        failed: '异常'
    };
    return map[status] || status;
}

function renderBotList() {
    const list = document.getElementById('transportBotList');
    if (!list) return;
    
    if (transportBots.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:60px;color:#64748b;">暂无运输Bot</div>';
        return;
    }
    list.innerHTML = transportBots.map(bot => {
        const statusText = formatTransportStatus(bot);
        const badgeClass = bot.online ? 'bot-status-running' : (bot.running ? 'bot-status-starting' : ((bot.currentStatus || bot.status) === 'starting' ? 'bot-status-starting' : 'bot-status-stopped'));
        const badgeText = bot.online ? '在线' : (bot.running ? '进程运行' : ((bot.currentStatus || bot.status) === 'starting' ? '启动中' : '已停止'));
        return `
        <div class="bot-card">
            <div class="bot-header">
                <div>
                    <span class="bot-id">Bot #${bot.num}</span>
                    <span style="margin-left:8px;font-size:12px;color:#64748b">邮箱: ${bot.email || '-'}</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <span class="bot-status-badge ${badgeClass}">${badgeText}</span>
                </div>
            </div>
            <div class="bot-details">
                <div><span class="bot-detail-label">服务器:</span><span class="bot-detail-value">${bot.host || bot.server || '-'}</span></div>
                <div><span class="bot-detail-label">模式:</span><span class="bot-detail-value">${bot.type === 'cloud' ? '云端备用' : '本地主用'}</span></div>
                <div><span class="bot-detail-label">状态:</span><span class="bot-detail-value">${statusText}</span></div>
                <div><span class="bot-detail-label">登录URL:</span><span class="bot-detail-value">${bot.loginUrl?.url ? '已生成' : '暂无'}</span></div>
            </div>
            ${bot.loginUrl?.url ? `
                <div style="margin-top:10px;padding:10px;border:1px solid rgba(59,130,246,.35);border-radius:10px;background:rgba(15,23,42,.7);">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
                        <div style="font-size:12px;color:#94a3b8;">Microsoft 登录链接</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn btn-primary btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(bot.loginUrl.url)}">复制链接</button>
                            <button class="btn btn-info btn-sm" onclick="copyConsoleText(this.dataset.copy)" data-copy="${escapeHtml(bot.loginUrl.code || '')}" ${bot.loginUrl.code ? '' : 'disabled'}>复制验证码</button>
                        </div>
                    </div>
                    <div style="font-family:Consolas,monospace;color:#bfdbfe;word-break:break-all;">${escapeHtml(bot.loginUrl.url)}</div>
                    <div style="margin-top:6px;color:#fbbf24;font-family:Consolas,monospace;">验证码：${escapeHtml(bot.loginUrl.code || '-')}</div>
                </div>
            ` : ''}
            ${bot.lastError ? `<div style="margin-top:10px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:8px;white-space:pre-wrap;">${escapeHtml(bot.lastError)}</div>` : ''}
            <div class="bot-actions">
                <button class="bot-action-btn ${bot.running ? 'stop' : 'start'}" onclick="toggleBot('${bot.id}')">${bot.running ? '停止' : '启动/登录'}</button>
                <button class="bot-action-btn force-stop" onclick="forceStopBot('${bot.id}')" ${bot.running ? '' : 'disabled'}>强制关闭</button>
                <button class="bot-action-btn edit" onclick="resetTransportLogin('${bot.id}')">清缓存重登</button>
                <button class="bot-action-btn edit" onclick="showEditBotDialog('${bot.id}')">编辑</button>
                <button class="bot-action-btn delete" onclick="deleteBot('${bot.id}')">删除</button>
                <button class="bot-action-btn send" onclick="showSendCommandDialog('${bot.id}')">发送命令</button>
                <button class="bot-action-btn send" onclick="openTransportLoginConsole()">登录URL/控制台</button>
                <button class="bot-action-btn edit" onclick="openUpdateCenter()">整体更新</button>
            </div>
        </div>
    `;
    }).join('');
}

function showCreateBotDialog() {
    showModal('创建运输Bot', `
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">Bot编号:</label>
        <input type="text" class="input-field" id="botId" placeholder="1">
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">邮箱:</label>
        <input type="text" class="input-field" id="botEmail" placeholder="xxx@outlook.com">
        <div style="font-size:12px;color:#22c55e;margin-top:8px;">创建后将自动同步到云服务器</div>
    `, [
        { text: '创建', primary: true, onclick: () => {
            const id = parseInt(document.getElementById('botId').value);
            const email = document.getElementById('botEmail').value;
            if (!id || !email) return;
            fetchWithAuth('/api/bot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, email })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    loadTransportBots();
                    closeModal();
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function showEditBotDialog(id) {
    const bot = transportBots.find(b => b.id === id);
    if (!bot) return;
    showModal('编辑运输Bot', `
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">Bot编号:</label>
        <input type="text" class="input-field" id="editBotId" value="${bot.num}">
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">邮箱:</label>
        <input type="text" class="input-field" id="editBotEmail" value="${bot.email || ''}">
    `, [
        { text: '保存', primary: true, onclick: () => {
            const newNum = parseInt(document.getElementById('editBotId').value);
            const email = document.getElementById('editBotEmail').value;
            if (!newNum || !email) return;
            fetchWithAuth('/api/bot/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, newNum, email })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    loadTransportBots();
                    closeModal();
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function deleteBot(id) {
    showModal('删除确认', `确定要删除 Bot ${id} 吗？`, [
        { text: '删除', primary: true, onclick: () => {
            fetchWithAuth('/api/bot/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    loadTransportBots();
                    closeModal();
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function toggleBot(id) {
    const bot = transportBots.find(item => item.id === id);
    const action = bot?.running ? 'stop' : 'start';
    fetchWithAuth(`/api/admin/transport-bots/${id}/${action}`, {
        method: 'POST'
    }).then(res => res.json()).then(() => {
        loadTransportBots();
    });
}

function forceStopBot(id) {
    fetchWithAuth(`/api/admin/transport-bots/${id}/stop`, {
        method: 'POST'
    }).then(res => res.json()).then(() => {
        loadTransportBots();
    });
}

function resetTransportLogin(id) {
    showModal('清缓存重登', `确定清除 ${escapeHtml(id)} 的 Microsoft 登录缓存并重启吗？<br><br><span style="color:#f59e0b;">这会强制生成新的登录 URL 和验证码。</span>`, [
        { text: '清缓存并重启', primary: true, onclick: () => {
            fetchWithAuth(`/api/admin/transport-bots/${id}/reset-login`, {
                method: 'POST'
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    closeModal();
                    showSystemMessage('已重启登录', '登录缓存已清除，请查看“登录URL/控制台”等待新的 Microsoft 验证码。', 'success');
                    loadTransportBots();
                    openTransportLoginConsole();
                } else {
                    showSystemMessage('清缓存失败', data.error || '无法重置登录缓存', 'error');
                }
            }).catch(err => showSystemMessage('清缓存失败', err.message, 'error'));
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function showSendCommandDialog(id) {
    showModal('发送命令', `
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">命令:</label>
        <input type="text" class="input-field" id="botCommand" placeholder="/say hello">
    `, [
        { text: '发送', primary: true, onclick: () => {
            const cmd = document.getElementById('botCommand').value;
            if (!cmd) return;
            fetchWithAuth(`/api/admin/transport-bots/${id}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    closeModal();
                }
            });
        }},
        { text: '取消', onclick: closeModal }
    ]);
}

function saveSettings() {
    const host = document.getElementById('serverHost').value;
    const port = document.getElementById('serverPort').value;
    const version = document.getElementById('serverVersion').value;
    fetchWithAuth('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, version })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            alert('设置已保存');
        }
    });
}

function openShop() {
    const content = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="font-size:18px;font-weight:600;color:#f1f5f9;">商城系统</h3>
                <button class="btn btn-primary" onclick="refreshShop()">刷新商品</button>
            </div>
            <div class="grid-layout" id="shopGrid"></div>
        </div>
    `;
    createWindow('shop', '商城系统', 'shop', content, 900, 600);
    setTimeout(() => refreshShop(), 100);
}

function refreshShop() {
    fetch('/api/warehouse').then(res => res.json()).then(data => {
        const grid = document.getElementById('shopGrid');
        if (!grid) return;
        
        if (!data || data.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:60px;color:#64748b;">暂无商品数据</div>';
            return;
        }
        
        const items = Array.isArray(data) ? data : (data.items || []);
        
        grid.innerHTML = items.map(item => `
            <div class="grid-card">
                <div style="font-size:36px;margin-bottom:12px;display:flex;justify-content:center;">📦</div>
                <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:8px;">${item.displayName || item.name || '未知'}</div>
                <div style="font-size:16px;color:#0078d4;font-weight:600;margin-bottom:4px;">${item.price || 0} 💰</div>
                <div style="font-size:12px;color:#64748b;">库存: ${item.stock || 0}</div>
            </div>
        `).join('');
    });
}

function openTransportLoginConsole() {
    openTerminal();
    setTimeout(refreshConsoleStatus, 150);
}

function openUpdateCenter() {
    openControlCenter();
    setTimeout(() => switchCcTab('updates'), 150);
}

function openTerminal() {
    if (!authToken) { showLoginModal(); return; }
    const content = `
        <div class="terminal-container">
            <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.9);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;">
                    <strong style="color:#e2e8f0;">Bot 登录控制台</strong>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="copyTerminalOutput()">复制控制台</button>
                        <button class="btn btn-info btn-sm" onclick="refreshConsoleStatus()">刷新状态</button>
                    </div>
                </div>
                <div id="terminalLoginPanel"></div>
            </div>
            <div class="terminal-output" id="terminalOutput"></div>
            <div class="terminal-input-line">
                <span class="terminal-prompt">root@anyunos</span>:<span class="terminal-path">~</span>$
                <input type="text" class="terminal-input" id="terminalInput" onkeypress="if(event.key==='Enter')executeCommand()">
            </div>
        </div>
    `;
    createWindow('terminal', '控制台', 'terminal', content, 820, 620);
    setTimeout(() => {
        renderConsoleOutput();
        renderLoginPanel();
        refreshConsoleStatus();
        document.getElementById('terminalInput')?.focus();
    }, 100);
}

function refreshConsoleStatus() {
    appendConsoleLine(`主Bot状态：${botStatus}，位置：${botPosition || '未知'}，血量：${botHealth}，饱食：${botFood}`, 'status');
    fetchWithAuth('/api/admin/console/status').then(res => res.json()).then(hydrateConsoleStatus).catch(err => {
        appendConsoleLine('刷新控制台状态失败：' + err.message, 'error');
    });
    fetchWithAuth('/api/admin/transport-bots').then(res => res.json()).then(data => {
        if (Array.isArray(data)) {
            appendConsoleLine(`运输Bot数量：${data.length}`, 'status');
            data.forEach(bot => appendConsoleLine(`${bot.id || bot.num || bot.name} 状态：${bot.status || '未知'}`, 'status'));
        }
    }).catch(err => appendConsoleLine('刷新运输Bot状态失败：' + err.message, 'error'));
}

function executeCommand() {
    const input = document.getElementById('terminalInput');
    const output = document.getElementById('terminalOutput');
    if (!input || !output) return;
    
    const cmd = input.value.trim();
    if (!cmd) return;
    
    output.textContent += `root@anyunos:~$ ${cmd}\n`;
    input.value = '';
    
    if (cmd === 'help') {
        output.textContent += '可用命令:\n';
        output.textContent += '  help          - 显示帮助信息\n';
        output.textContent += '  clear         - 清空终端\n';
        output.textContent += '  ls [path]     - 列出目录文件\n';
        output.textContent += '  status        - 查看主Bot状态\n';
        output.textContent += '  start         - 启动主Bot\n';
        output.textContent += '  stop          - 停止主Bot\n';
        output.textContent += '  scan          - 扫描仓库\n';
        output.textContent += '  bots          - 列出运输Bot\n';
        output.textContent += '  bot start id  - 启动运输Bot\n';
        output.textContent += '  bot stop id   - 停止运输Bot\n';
        output.textContent += '  exec <cmd>    - 在服务器执行系统命令\n';
        output.textContent += '  logs          - 查看系统日志\n';
        output.textContent += '  blacklist     - 查看黑名单\n';
    } else if (cmd === 'clear') {
        output.textContent = '';
    } else if (cmd.startsWith('ls')) {
        const path = cmd.split(' ')[1] || '/';
        fetchWithAuth(`/api/files/list?path=${encodeURIComponent(path)}`).then(res => res.json()).then(data => {
            if (data.success) {
                output.textContent += (data.files || []).map(f => (f.type === 'directory' ? '[DIR] ' : '      ') + f.name).join('\n') + '\n';
            } else {
                output.textContent += data.error + '\n';
            }
        });
    } else if (cmd === 'status') {
        output.textContent += `主Bot状态: ${botStatus}\n位置: ${botPosition}\n`;
    } else if (cmd === 'start') {
        fetchWithAuth('/api/bot/toggle', { method: 'POST' }).then(() => {
            output.textContent += '正在启动主Bot...\n';
        });
    } else if (cmd === 'stop') {
        fetchWithAuth('/api/bot/toggle', { method: 'POST' }).then(() => {
            output.textContent += '正在停止主Bot...\n';
        });
    } else if (cmd === 'scan') {
        fetchWithAuth('/api/admin/mainbot/scan', { method: 'POST' }).then(() => {
            output.textContent += '正在扫描仓库...\n';
        });
    } else if (cmd === 'bots') {
        fetchWithAuth('/api/admin/transport-bots').then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                data.forEach(bot => {
                    output.textContent += `${bot.id} [${bot.type}] ${bot.email} - ${bot.status}\n`;
                });
            }
        });
    } else if (cmd.startsWith('bot start')) {
        const botId = cmd.split(' ')[2];
        if (botId) {
            fetchWithAuth(`/api/admin/transport-bots/${botId}/start`, { method: 'POST' }).then(res => res.json()).then(data => {
                output.textContent += data.success ? `正在启动运输Bot ${botId}...\n` : data.error + '\n';
            });
        } else {
            output.textContent += '请指定Bot ID，如: bot start bot1\n';
        }
    } else if (cmd.startsWith('bot stop')) {
        const botId = cmd.split(' ')[2];
        if (botId) {
            fetchWithAuth(`/api/admin/transport-bots/${botId}/stop`, { method: 'POST' }).then(res => res.json()).then(data => {
                output.textContent += data.success ? `正在停止运输Bot ${botId}...\n` : data.error + '\n';
            });
        } else {
            output.textContent += '请指定Bot ID，如: bot stop bot1\n';
        }
    } else if (cmd.startsWith('exec ')) {
        const systemCmd = cmd.substring(5);
        fetchWithAuth('/api/server/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: systemCmd })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                output.textContent += (data.output || '') + '\n';
            } else {
                output.textContent += '错误: ' + (data.error || '未知错误') + '\n';
            }
        });
    } else if (cmd === 'logs') {
        fetchWithAuth('/api/logs').then(res => res.json()).then(data => {
            output.textContent += (data || []).join('\n') + '\n';
        });
    } else if (cmd === 'blacklist') {
        fetchWithAuth('/api/admin/blacklist').then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                data.forEach(item => {
                    output.textContent += `${item.name} - ${item.reason}\n`;
                });
            }
        });
    } else {
        output.textContent += `命令未找到: ${cmd}\n`;
    }
    
    output.scrollTop = output.scrollHeight;
}

function openDeployWindow() {
    const content = `
        <div class="deploy-container">
            <div class="deploy-header">
                <h2 style="margin:0;color:#0078d4;">一键部署工具</h2>
                <p style="margin:4px 0;color:#64748b;font-size:13px;">选择文件夹后自动下载Node.js、安装依赖并启动服务器</p>
                <p style="margin:4px 0;color:#22c55e;font-size:12px;">支持 Windows Server 2022 和 OpenClouds OS (Linux)</p>
            </div>
            
            <div class="deploy-form">
                <div class="form-group">
                    <label>部署目录</label>
                    <div class="input-group">
                        <input type="text" id="deployFolder" class="input-field" placeholder="选择或输入部署目录" readonly>
                        <button class="btn-secondary" onclick="selectDeployFolder()">浏览...</button>
                    </div>
                    <p style="font-size:12px;color:#64748b;margin-top:4px;">部署后将自动创建 bots、logs、deploy_config 目录</p>
                </div>
                
                <div class="form-group">
                    <label>云服务器域名或IP (可选)</label>
                    <input type="text" id="deployDomain" class="input-field" placeholder="如: 192.168.1.100 或 your-domain.com">
                    <p style="font-size:12px;color:#64748b;margin-top:4px;">部署后将使用该地址访问商城和管理后台</p>
                </div>
                
                <div class="deploy-progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="deployProgress" style="width:0%"></div>
                    </div>
                    <div class="progress-info">
                        <span id="deployState">等待开始</span>
                        <span id="deployPercent">0%</span>
                    </div>
                    <div id="deployMessage" style="font-size:13px;color:#0078d4;margin-top:8px;"></div>
                    <div id="deployError" style="font-size:13px;color:#ef4444;margin-top:8px;display:none;"></div>
                </div>
                
                <div class="deploy-steps">
                    <div class="step-item" id="step1">
                        <div class="step-icon">1</div>
                        <div class="step-content">
                            <div class="step-title">选择目录</div>
                            <div class="step-status" id="step1Status">未完成</div>
                        </div>
                    </div>
                    <div class="step-item" id="step2">
                        <div class="step-icon">2</div>
                        <div class="step-content">
                            <div class="step-title">下载Node.js</div>
                            <div class="step-status" id="step2Status">未完成</div>
                        </div>
                    </div>
                    <div class="step-item" id="step3">
                        <div class="step-icon">3</div>
                        <div class="step-content">
                            <div class="step-title">安装依赖</div>
                            <div class="step-status" id="step3Status">未完成</div>
                        </div>
                    </div>
                    <div class="step-item" id="step4">
                        <div class="step-icon">4</div>
                        <div class="step-content">
                            <div class="step-title">启动服务器</div>
                            <div class="step-status" id="step4Status">未完成</div>
                        </div>
                    </div>
                </div>
                
                <div class="deploy-urls" id="deployUrls" style="display:none;margin-top:16px;padding:16px;background:rgba(0,120,212,0.1);border-radius:8px;">
                    <div style="font-weight:600;color:#0078d4;margin-bottom:8px;">服务器访问地址</div>
                    <div id="urlsList" style="font-size:13px;"></div>
                </div>
                
                <div id="configDirInfo" style="display:none;margin-top:16px;padding:12px;background:rgba(34,197,94,0.1);border-radius:8px;">
                    <div style="font-weight:600;color:#22c55e;margin-bottom:4px;">配置目录已创建</div>
                    <div id="configDirPath" style="font-size:12px;color:#64748b;"></div>
                </div>
                
                <div class="deploy-buttons">
                    <button class="btn-primary" onclick="startFullDeploy()" id="deployBtn">一键部署</button>
                    <button class="btn-secondary" onclick="downloadNodeJS()" id="downloadNodeBtn" disabled>下载Node.js</button>
                    <button class="btn-secondary" onclick="installDeps()" id="installDepsBtn" disabled>安装依赖</button>
                    <button class="btn-secondary" onclick="copyFiles()" id="copyFilesBtn" disabled>复制文件</button>
                    <button class="btn-secondary" onclick="startDeployedServer()" id="startServerBtn" disabled>启动服务器</button>
                    <button class="btn-danger" onclick="stopDeployedServer()" id="stopServerBtn" style="display:none;">停止服务器</button>
                </div>
            </div>
        </div>
        
        <style>
            .deploy-container { padding:20px; }
            .deploy-header { margin-bottom:24px; }
            .deploy-form { max-width:600px;margin:0 auto; }
            .form-group { margin-bottom:16px; }
            .form-group label { display:block;font-weight:600;color:#334155;margin-bottom:8px;font-size:14px; }
            .input-group { display:flex;gap:8px; }
            .input-group .input-field { flex:1; }
            .deploy-progress-section { margin-bottom:24px; }
            .progress-bar-container { height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden; }
            .progress-bar { height:100%;background:linear-gradient(90deg,#0078d4,#00bcf2);transition:width 0.3s; }
            .progress-info { display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:#64748b; }
            .deploy-steps { display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px; }
            .step-item { display:flex;align-items:center;gap:12px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.05);min-width:140px; }
            .step-icon { width:28px;height:28px;border-radius:50%;background:#64748b;color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px; }
            .step-item.completed .step-icon { background:#22c55e; }
            .step-item.active .step-icon { background:#0078d4; }
            .step-title { font-weight:500;color:#334155;font-size:13px; }
            .step-status { font-size:12px;color:#64748b;margin-top:2px; }
            .step-item.completed .step-status { color:#22c55e; }
            .deploy-buttons { display:flex;flex-wrap:wrap;gap:8px;justify-content:center; }
            .btn-primary { background:linear-gradient(135deg,#0078d4,#00bcf2);color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px; }
            .btn-primary:hover { opacity:0.9; }
            .btn-primary:disabled { opacity:0.5;cursor:not-allowed; }
            .btn-secondary { background:#334155;color:white;border:none;padding:10px 16px;border-radius:8px;font-weight:500;cursor:pointer;font-size:13px; }
            .btn-secondary:hover { background:#475569; }
            .btn-secondary:disabled { opacity:0.5;cursor:not-allowed; }
            .btn-danger { background:#ef4444;color:white;border:none;padding:10px 16px;border-radius:8px;font-weight:500;cursor:pointer;font-size:13px; }
            .btn-danger:hover { background:#dc2626; }
            .deploy-urls a { display:block;color:#00bcf2;text-decoration:none;margin:4px 0;word-break:break-all; }
            .deploy-urls a:hover { text-decoration:underline; }
        </style>
    `;
    createWindow('deploy', '一键部署', 'computer', content, 700, 600);
    setTimeout(() => {
        fetchWithAuth('/api/deploy/status').then(res => res.json()).then(data => {
            if (data.success) {
                updateDeployUI(data.status);
            }
        });
    }, 100);
    
    socket.on('deployStatus', (status) => {
        updateDeployUI(status);
    });
    
    socket.on('deployedServerLoginUrl', (data) => {
        showModal('部署服务器登录', `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:14px;color:#64748b;margin-bottom:16px;">部署服务器需要Microsoft登录验证</div>
                <a href="${data.url}" target="_blank" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0078d4,#00bcf2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">打开登录链接</a>
            </div>
        `, [{ text: '关闭', onclick: closeModal }]);
    });
}

async function selectDeployFolder() {
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const folderPath = dirHandle.name;
            selectedDeployFolder = folderPath;
            alert(`已选择目录: ${folderPath}`);
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.log('Directory picker error:', err);
            }
        }
    }
    
    showModal('选择部署目录', `
        <div style="padding:20px;">
            <label style="display:block;font-weight:600;color:#334155;margin-bottom:8px;font-size:14px;">部署目录路径</label>
            <input type="text" class="input-field" id="folderInput" placeholder="输入部署目录路径" style="width:100%;margin-bottom:12px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:16px;">
                示例: D:\\tsl-server 或 /opt/tsl-server
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn-primary" onclick="confirmFolder()">确认</button>
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `);
}

function confirmFolder() {
    const folder = document.getElementById('folderInput').value.trim();
    if (!folder) {
        alert('请输入部署目录');
        return;
    }
    
    fetchWithAuth('/api/deploy/select-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            document.getElementById('deployFolder').value = folder;
            document.getElementById('downloadNodeBtn').disabled = false;
            document.getElementById('deployBtn').disabled = false;
            updateStepStatus(1, 'completed', '已完成');
            closeModal();
        } else {
            alert(data.error);
        }
    });
}

function downloadNodeJS() {
    const folder = document.getElementById('deployFolder').value;
    if (!folder) return;
    
    setDeployState('downloading', 10, '正在下载Node.js...');
    updateStepStatus(2, 'active', '进行中');
    
    fetchWithAuth('/api/deploy/download-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
    }).then(res => res.json()).then(data => {
        if (!data.success) {
            setDeployError(data.error);
        }
    });
}

function installDeps() {
    const folder = document.getElementById('deployFolder').value;
    if (!folder) return;
    
    setDeployState('installing', 45, '正在安装依赖...');
    updateStepStatus(3, 'active', '进行中');
    
    fetchWithAuth('/api/deploy/install-deps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
    }).then(res => res.json()).then(data => {
        if (!data.success) {
            setDeployError(data.error);
        }
    });
}

function copyFiles() {
    const folder = document.getElementById('deployFolder').value;
    if (!folder) return;
    
    setDeployState('copying', 92, '正在复制项目文件...');
    updateStepStatus(4, 'active', '进行中');
    
    fetchWithAuth('/api/deploy/copy-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            updateStepStatus(4, 'completed', '已完成');
            document.getElementById('startServerBtn').disabled = false;
        } else {
            setDeployError(data.error);
        }
    });
}

function startDeployedServer() {
    const folder = document.getElementById('deployFolder').value;
    const domain = document.getElementById('deployDomain').value;
    if (!folder) return;
    
    setDeployState('starting', 97, '正在启动服务器...');
    
    fetchWithAuth('/api/deploy/start-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, domain })
    }).then(res => res.json()).then(data => {
        if (!data.success) {
            setDeployError(data.error);
        }
    });
}

function stopDeployedServer() {
    fetchWithAuth('/api/deploy/stop-server', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('stopServerBtn').style.display = 'none';
                document.getElementById('startServerBtn').style.display = 'inline-block';
            }
        });
}

function startFullDeploy() {
    const folder = document.getElementById('deployFolder').value;
    const domain = document.getElementById('deployDomain').value;
    if (!folder) {
        alert('请先选择部署目录');
        return;
    }
    
    document.getElementById('deployBtn').disabled = true;
    document.getElementById('downloadNodeBtn').disabled = true;
    document.getElementById('installDepsBtn').disabled = true;
    document.getElementById('copyFilesBtn').disabled = true;
    document.getElementById('startServerBtn').disabled = true;
    
    updateStepStatus(1, 'completed', '已完成');
    
    fetchWithAuth('/api/deploy/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, domain })
    }).then(res => res.json()).then(data => {
        if (!data.success) {
            alert(data.error);
        }
    });
}

function updateDeployUI(status) {
    document.getElementById('deployProgress').style.width = status.progress + '%';
    document.getElementById('deployState').textContent = getStateText(status.state);
    document.getElementById('deployPercent').textContent = status.progress + '%';
    document.getElementById('deployMessage').textContent = status.message;
    
    if (status.error) {
        document.getElementById('deployError').textContent = status.error;
        document.getElementById('deployError').style.display = 'block';
    } else {
        document.getElementById('deployError').style.display = 'none';
    }
    
    if (status.folder) {
        document.getElementById('deployFolder').value = status.folder;
        updateStepStatus(1, 'completed', '已完成');
        document.getElementById('downloadNodeBtn').disabled = false;
        document.getElementById('deployBtn').disabled = false;
    }
    
    if (status.nodeInstalled) {
        updateStepStatus(2, 'completed', '已完成');
        document.getElementById('installDepsBtn').disabled = false;
    }
    
    if (status.depsInstalled) {
        updateStepStatus(3, 'completed', '已完成');
        document.getElementById('copyFilesBtn').disabled = false;
    }
    
    if (status.serverRunning) {
        updateStepStatus(4, 'completed', '运行中');
        document.getElementById('startServerBtn').style.display = 'none';
        document.getElementById('stopServerBtn').style.display = 'inline-block';
        
        if (status.urls && status.urls.length > 0) {
            document.getElementById('deployUrls').style.display = 'block';
            document.getElementById('urlsList').innerHTML = status.urls.map(url => 
                `<a href="${url}" target="_blank">${url}</a>`
            ).join('');
        }
    }
    
    // 显示配置目录信息
    if (status.configDir) {
        document.getElementById('configDirInfo').style.display = 'block';
        document.getElementById('configDirPath').textContent = status.configDir;
    }
}

function setDeployState(state, progress, message) {
    document.getElementById('deployProgress').style.width = progress + '%';
    document.getElementById('deployState').textContent = getStateText(state);
    document.getElementById('deployPercent').textContent = progress + '%';
    document.getElementById('deployMessage').textContent = message;
}

function setDeployError(error) {
    document.getElementById('deployError').textContent = error;
    document.getElementById('deployError').style.display = 'block';
}

function updateStepStatus(stepNum, status, text) {
    const step = document.getElementById('step' + stepNum);
    const statusEl = document.getElementById('step' + stepNum + 'Status');
    if (step && statusEl) {
        step.className = 'step-item ' + status;
        statusEl.textContent = text;
    }
}

function getStateText(state) {
    const texts = {
        idle: '等待开始',
        selected: '已选择目录',
        downloading: '下载Node.js',
        'node-ready': 'Node.js就绪',
        installing: '安装依赖',
        'deps-ready': '依赖就绪',
        copying: '复制文件',
        'files-copied': '文件就绪',
        starting: '启动服务器',
        running: '运行中',
        stopped: '已停止',
        error: '发生错误',
        completed: '已完成'
    };
    return texts[state] || state;
}

let productList = [];
let blacklistList = [];

function openProductManager() {
    const content = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-size:18px;font-weight:600;color:#f1f5f9;">商品列表</h3>
                <button class="btn btn-success" onclick="showAddProductDialog()">添加商品</button>
            </div>
            <div id="productTableContainer"></div>
        </div>
    `;
    createWindow('products', '商品管理', 'box', content, 600, 500);
    loadProducts();
}

function loadProducts() {
    fetchWithAuth('/api/warehouse').then(res => res.json()).then(data => {
        productList = Array.isArray(data) ? data : (data.items || []);
        renderProductTable();
        updateProductPreview();
    });
}

function refreshProducts() {
    loadProducts();
}

function updateProductPreview() {
    const preview = document.getElementById('productListPreview');
    if (preview) {
        preview.textContent = `共 ${productList.length} 个商品`;
    }
}

function renderProductTable() {
    const container = document.getElementById('productTableContainer');
    if (!container) return;
    
    if (productList.length === 0) {
        container.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;">暂无商品</div>';
        return;
    }
    
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:rgba(0,120,212,0.1);">
                    <th style="padding:12px;text-align:left;color:#0078d4;">名称</th>
                    <th style="padding:12px;text-align:left;color:#0078d4;">显示名</th>
                    <th style="padding:12px;text-align:left;color:#0078d4;">价格</th>
                    <th style="padding:12px;text-align:left;color:#0078d4;">库存</th>
                    <th style="padding:12px;text-align:left;color:#0078d4;">公开</th>
                    <th style="padding:12px;text-align:center;color:#0078d4;">操作</th>
                </tr>
            </thead>
            <tbody>
                ${productList.map(item => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:12px;color:#f1f5f9;">${item.name}</td>
                        <td style="padding:12px;color:#94a3b8;">${item.displayName || '-'}</td>
                        <td style="padding:12px;color:#22c55e;">${item.price} 💰</td>
                        <td style="padding:12px;color:#f1f5f9;">${item.stock}</td>
                        <td style="padding:12px;color:${item.public ? '#22c55e' : '#ef4444'};">${item.public ? '是' : '否'}</td>
                        <td style="padding:12px;text-align:center;">
                            <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="showEditProductDialog('${item.name}')">编辑</button>
                            <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;margin-left:4px;" onclick="deleteProduct('${item.name}')">删除</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddProductDialog() {
    showModal('添加商品', `
        <div style="padding:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">商品名称 (英文ID):</label>
            <input type="text" class="input-field" id="newProductName" placeholder="diamond">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">显示名称:</label>
            <input type="text" class="input-field" id="newProductDisplayName" placeholder="钻石">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">价格:</label>
            <input type="number" class="input-field" id="newProductPrice" placeholder="100" value="0">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">库存:</label>
            <input type="number" class="input-field" id="newProductStock" placeholder="64" value="0">
            
            <label style="display:flex;align-items:center;margin-top:12px;">
                <input type="checkbox" id="newProductPublic" checked style="margin-right:8px;">
                <span style="font-size:13px;color:#64748b;">公开销售</span>
            </label>
            
            <div style="margin-top:16px;display:flex;gap:8px;">
                <button class="btn btn-primary" onclick="addProduct()">添加</button>
                <button class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `);
}

function addProduct() {
    const name = document.getElementById('newProductName').value.trim();
    const displayName = document.getElementById('newProductDisplayName').value.trim();
    const price = document.getElementById('newProductPrice').value;
    const stock = document.getElementById('newProductStock').value;
    const isPublic = document.getElementById('newProductPublic').checked;
    
    if (!name) {
        showModal('错误', '请输入商品名称');
        return;
    }
    
    fetchWithAuth('/api/admin/product/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, displayName, price: Number(price), stock: Number(stock), public: isPublic })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            closeModal();
            loadProducts();
            showModal('成功', '商品已添加');
        } else {
            showModal('错误', data.error || '添加失败');
        }
    });
}

function showEditProductDialog(name) {
    const item = productList.find(p => p.name === name);
    if (!item) return;
    
    showModal('编辑商品', `
        <div style="padding:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">商品名称:</label>
            <input type="text" class="input-field" id="editProductName" value="${item.name}" readonly>
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">显示名称:</label>
            <input type="text" class="input-field" id="editProductDisplayName" value="${item.displayName || ''}">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">价格:</label>
            <input type="number" class="input-field" id="editProductPrice" value="${item.price}">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">库存:</label>
            <input type="number" class="input-field" id="editProductStock" value="${item.stock}">
            
            <label style="display:flex;align-items:center;margin-top:12px;">
                <input type="checkbox" id="editProductPublic" ${item.public ? 'checked' : ''} style="margin-right:8px;">
                <span style="font-size:13px;color:#64748b;">公开销售</span>
            </label>
            
            <div style="margin-top:16px;display:flex;gap:8px;">
                <button class="btn btn-primary" onclick="editProduct()">保存</button>
                <button class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `);
}

function editProduct() {
    const name = document.getElementById('editProductName').value;
    const displayName = document.getElementById('editProductDisplayName').value.trim();
    const price = document.getElementById('editProductPrice').value;
    const stock = document.getElementById('editProductStock').value;
    const isPublic = document.getElementById('editProductPublic').checked;
    
    fetchWithAuth('/api/admin/product/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, displayName, price: Number(price), stock: Number(stock), public: isPublic })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            closeModal();
            loadProducts();
            showModal('成功', '商品已更新');
        } else {
            showModal('错误', data.error || '更新失败');
        }
    });
}

function deleteProduct(name) {
    if (!confirm(`确定删除商品 "${name}"？`)) return;
    
    fetchWithAuth('/api/admin/product/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            loadProducts();
            showModal('成功', '商品已删除');
        } else {
            showModal('错误', data.error || '删除失败');
        }
    });
}

function openBlacklistManager() {
    const content = `
        <div style="padding:20px;height:100%;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-size:18px;font-weight:600;color:#f1f5f9;">黑名单列表</h3>
                <button class="btn btn-danger" onclick="showAddBlacklistDialog()">添加黑名单</button>
            </div>
            <div id="blacklistTableContainer"></div>
        </div>
    `;
    createWindow('blacklist', '黑名单管理', 'shield', content, 500, 400);
    loadBlacklist();
}

function loadBlacklist() {
    fetchWithAuth('/api/admin/blacklist').then(res => res.json()).then(data => {
        blacklistList = data || [];
        renderBlacklistTable();
        updateBlacklistPreview();
    });
}

function refreshBlacklist() {
    loadBlacklist();
}

function updateBlacklistPreview() {
    const preview = document.getElementById('blacklistPreview');
    if (preview) {
        preview.textContent = `共 ${blacklistList.length} 个黑名单`;
    }
}

function renderBlacklistTable() {
    const container = document.getElementById('blacklistTableContainer');
    if (!container) return;
    
    if (blacklistList.length === 0) {
        container.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;">暂无黑名单</div>';
        return;
    }
    
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:rgba(239,68,68,0.1);">
                    <th style="padding:12px;text-align:left;color:#ef4444;">玩家名</th>
                    <th style="padding:12px;text-align:left;color:#ef4444;">原因</th>
                    <th style="padding:12px;text-align:left;color:#ef4444;">添加时间</th>
                    <th style="padding:12px;text-align:center;color:#ef4444;">操作</th>
                </tr>
            </thead>
            <tbody>
                ${blacklistList.map(item => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:12px;color:#f1f5f9;">${item.name}</td>
                        <td style="padding:12px;color:#94a3b8;">${item.reason || '-'}</td>
                        <td style="padding:12px;color:#64748b;font-size:12px;">${item.addedAt ? new Date(item.addedAt).toLocaleString() : '-'}</td>
                        <td style="padding:12px;text-align:center;">
                            <button class="btn btn-success" style="padding:4px 8px;font-size:12px;" onclick="removeBlacklist('${item.name}')">移除</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddBlacklistDialog() {
    showModal('添加黑名单', `
        <div style="padding:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;">玩家名称:</label>
            <input type="text" class="input-field" id="newBlacklistName" placeholder="输入玩家名">
            
            <label style="display:block;margin-bottom:6px;font-size:13px;color:#64748b;margin-top:12px;">原因:</label>
            <input type="text" class="input-field" id="newBlacklistReason" placeholder="违规">
            
            <div style="margin-top:16px;display:flex;gap:8px;">
                <button class="btn btn-danger" onclick="addBlacklist()">添加</button>
                <button class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `);
}

function addBlacklist() {
    const name = document.getElementById('newBlacklistName').value.trim();
    const reason = document.getElementById('newBlacklistReason').value.trim();
    
    if (!name) {
        showModal('错误', '请输入玩家名称');
        return;
    }
    
    fetchWithAuth('/api/admin/blacklist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, reason })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            closeModal();
            loadBlacklist();
            showModal('成功', '已添加到黑名单');
        } else {
            showModal('错误', data.error || '添加失败');
        }
    });
}

function removeBlacklist(name) {
    if (!confirm(`确定移除黑名单 "${name}"？`)) return;
    
    fetchWithAuth('/api/admin/blacklist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            loadBlacklist();
            showModal('成功', '已从黑名单移除');
        } else {
            showModal('错误', data.error || '移除失败');
        }
    });
}

function openControlCenter() {
    const content = `
        <style>
            .cc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
            .cc-server-select { display: flex; align-items: center; gap: 8px; }
            .cc-server-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
            .cc-server-badge.local { background: rgba(16,185,129,0.15); color: #10b981; }
            .cc-server-badge.cloud { background: rgba(59,130,246,0.15); color: #3b82f6; }
            .cc-server-btn { padding: 6px 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #f1f5f9; font-size: 12px; cursor: pointer; }
            .cc-server-btn:hover { background: rgba(255,255,255,0.12); }
            .cc-header { display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;padding:16px 18px;border:1px solid rgba(125,211,252,.16);border-radius:16px;background:linear-gradient(135deg,rgba(14,165,233,.16),rgba(99,102,241,.10));box-shadow:0 18px 45px rgba(2,8,23,.22); }
            .cc-tabs { display: flex; gap: 6px; margin-bottom: 24px; background: rgba(15,23,42,0.55); padding: 6px; border-radius: 14px; border:1px solid rgba(148,163,184,.12); overflow-x:auto; }
            .cc-tab { padding: 10px 22px; cursor: pointer; color: #94a3b8; border-radius: 10px; font-size: 14px; font-weight: 650; display: flex; align-items: center; justify-content:center; gap: 8px; transition: all 0.2s; white-space:nowrap; min-height:42px; }
            .cc-tab:hover { color: #cbd5e1; background: rgba(255,255,255,0.04); }
            .cc-tab.active { color: #fff; background: linear-gradient(135deg, #2563eb, #06b6d4); box-shadow: 0 10px 26px rgba(14,165,233,0.24); }
            .cc-tab svg { width: 16px; height: 16px; }
            .cc-panel { display: none; padding-bottom: 20px; }
            .cc-panel.active { display: block; }
            .cc-card { background: linear-gradient(180deg, rgba(30,41,59,0.68), rgba(15,23,42,0.52)); border: 1px solid rgba(148,163,184,0.12); border-radius: 16px; padding: clamp(14px,2vw,20px); margin-bottom: 16px; box-shadow:0 16px 38px rgba(2,8,23,.18); }
            .cc-card-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap:12px; flex-wrap:wrap; }
            .cc-btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
            .cc-btn:hover { transform: translateY(-1px); }
            .cc-btn-primary { background: linear-gradient(135deg, #2563eb, #06b6d4); color: white; box-shadow:0 10px 22px rgba(14,165,233,.18); }
            .cc-btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #f1f5f9; }
            .cc-btn-outline:hover { background: rgba(255,255,255,0.06); }
            .cc-btn-warning { background: linear-gradient(135deg, #f59e0b, #f97316); color: white; }
            .cc-btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
            .cc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px,100%), 1fr)); gap: 16px; }
            .cc-bot-card { background: rgba(15,23,42,0.68); border: 1px solid rgba(148,163,184,0.12); border-radius: 14px; padding: 16px; transition: all 0.2s; }
            .cc-bot-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
            .cc-bot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .cc-bot-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
            .cc-bot-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: rgba(0,120,212,0.2); }
            .cc-status { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .cc-status-online { background: rgba(16,185,129,0.15); color: #10b981; }
            .cc-status-offline { background: rgba(148,163,184,0.15); color: #64748b; }
            .cc-status-failover { background: rgba(245,158,11,0.15); color: #f59e0b; }
            .cc-bot-info { font-size: 13px; color: #94a3b8; line-height: 1.8; }
            .cc-bot-actions { margin-top: 14px; display: flex; gap: 8px; }
            .cc-empty { padding: 40px 20px; text-align: center; color: #64748b; font-size: 14px; }
            .cc-empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.5; }
            .cc-bug-list { list-style: none; padding: 0; margin: 0; }
            .cc-bug-item { padding: 16px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 12px; background: rgba(15,23,42,0.4); transition: all 0.2s; }
            .cc-bug-item:hover { border-color: rgba(255,255,255,0.15); }
            .cc-bug-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
            .cc-bug-sender { font-weight: 600; font-size: 14px; }
            .cc-bug-time { font-size: 12px; color: #64748b; }
            .cc-bug-desc { color: #94a3b8; font-size: 13px; margin-bottom: 10px; line-height: 1.6; }
            .cc-bug-footer { display: flex; justify-content: space-between; align-items: center; }
            .cc-bug-pos { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px; }
            .cc-status-select { padding: 5px 10px; background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f1f5f9; font-size: 12px; cursor: pointer; }
            .cc-upload-area { border: 2px dashed rgba(125,211,252,0.22); border-radius: 16px; padding: clamp(22px,4vw,40px); text-align: center; cursor: pointer; transition: all 0.2s; background:rgba(14,165,233,.035); }
            .cc-upload-area:hover, .cc-upload-area.dragover { border-color: #38bdf8; background: rgba(14,165,233,0.08); transform:translateY(-1px); }
            .cc-upload-icon { width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 18px; background: linear-gradient(135deg,rgba(37,99,235,.22),rgba(6,182,212,.18)); display: flex; align-items: center; justify-content: center; font-size: 28px; }
            .cc-upload-title { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px; }
            .cc-upload-desc { color: #64748b; font-size: 13px; }
            .cc-progress-bar { height: 10px; background: rgba(15,23,42,0.82); border-radius: 999px; margin-top: 12px; overflow: hidden; border:1px solid rgba(148,163,184,.12); }
            .cc-progress-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #06b6d4, #22c55e); border-radius: 999px; transition: width 0.35s ease; box-shadow:0 0 18px rgba(6,182,212,.28); }
            .cc-version-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 20px; }
            .cc-version-item { padding: 16px; background: rgba(15,23,42,0.5); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); }
            .cc-version-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
            .cc-version-value { font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #0078d4, #00bcf2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .cc-switch { position: relative; width: 48px; height: 26px; background: rgba(255,255,255,0.1); border-radius: 13px; cursor: pointer; transition: background 0.25s; }
            .cc-switch.active { background: linear-gradient(135deg, #0078d4, #00bcf2); }
            .cc-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: left 0.25s; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
            .cc-switch.active::after { left: 25px; }
            .cc-maintenance-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(245,158,11,0.06); border-radius: 10px; border: 1px solid rgba(245,158,11,0.15); }
            .cc-maintenance-text { font-size: 13px; color: #fbbf24; }
            .cc-update-status { margin-top: 16px; padding: 14px 16px; background: rgba(15,23,42,0.5); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); }
            .cc-backup-list { display: flex; flex-direction: column; gap: 8px; }
            .cc-backup-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(15,23,42,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
            .cc-backup-info .cc-backup-ver { font-weight: 600; font-size: 14px; }
            .cc-backup-info .cc-backup-time { font-size: 12px; color: #64748b; margin-top: 2px; }
            @media (max-width: 720px) {
                .cc-header { align-items:flex-start; flex-direction:column; }
                .cc-tabs { margin-inline:-4px; }
                .cc-tab { flex:1 0 auto; padding:10px 14px; }
                .cc-version-info { grid-template-columns:1fr; }
                .cc-maintenance-row { align-items:flex-start; }
                .cc-bug-header, .cc-bug-footer, .cc-backup-item { flex-direction:column; align-items:flex-start; gap:8px; }
                .cc-btn { width:100%; }
            }
        </style>
        <div class="cc-header">
            <div style="font-size:18px;font-weight:700;">系统控制中心</div>
            <div class="cc-server-select">
                <span class="cc-server-badge cloud" id="ccServerBadge">☁️ 云端</span>
            </div>
        </div>
        <div class="cc-tabs">
            <div class="cc-tab active" onclick="switchCcTab('monitor')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                调度监控
            </div>
            <div class="cc-tab" onclick="switchCcTab('bugs')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8v12h16V10a8 8 0 0 0-8-8z"/><path d="M12 22v-6M8 10h8M4 10h16"/></svg>
                Bug追踪
            </div>
            <div class="cc-tab" onclick="switchCcTab('updates')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                整体更新
            </div>
        </div>
        
        <div id="cc-monitor" class="cc-panel active">
            <div class="cc-card">
                <div class="cc-card-title">
                    <span>Bot 状态监控</span>
                    <button class="cc-btn cc-btn-outline" onclick="loadCcBotStatus()">
                        <svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        刷新
                    </button>
                </div>
                <div class="cc-grid" id="ccBotGrid">
                    <div class="cc-empty">
                        <div class="cc-empty-icon">🤖</div>
                        <div>暂无连接的Bot</div>
                        <div style="font-size:12px;margin-top:4px;">启动本地Bot后将自动显示</div>
                    </div>
                </div>
            </div>
            <div class="cc-card">
                <div class="cc-card-title">故障转移状态</div>
                <div id="ccFailoverStatus">
                    <div class="cc-empty">
                        <div class="cc-empty-icon">✅</div>
                        <div>运行正常</div>
                        <div style="font-size:12px;margin-top:4px;">当前没有故障转移中的Bot</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="cc-bugs" class="cc-panel">
            <div class="cc-card">
                <div class="cc-card-title">
                    <span>Bug 报告列表</span>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="cc-btn cc-btn-outline" onclick="exportCcBugReports()">📄 导出TXT</button>
                        <button class="cc-btn cc-btn-outline" onclick="loadCcBugReports()">🔄 刷新</button>
                    </div>
                </div>
                <ul class="cc-bug-list" id="ccBugList">
                    <li class="cc-empty">
                        <div class="cc-empty-icon">🐛</div>
                        <div>暂无Bug报告</div>
                        <div style="font-size:12px;margin-top:4px;">玩家通过游戏内 !bug 命令提交</div>
                    </li>
                </ul>
            </div>
        </div>
        
        <div id="cc-updates" class="cc-panel">
            <div class="cc-card">
                <div class="cc-card-title">版本信息</div>
                <div class="cc-version-info">
                    <div class="cc-version-item"><div class="cc-version-label">当前版本</div><div class="cc-version-value" id="ccCurrentVersion">--</div></div>
                    <div class="cc-version-item"><div class="cc-version-label">更新状态</div><div class="cc-version-value" id="ccUpdateStatus" style="font-size:16px;">空闲</div></div>
                </div>
                <div class="cc-maintenance-row">
                    <div class="cc-switch" id="ccMaintenanceSwitch" onclick="toggleCcMaintenance()"></div>
                    <span class="cc-maintenance-text">维护模式：所有本地Bot收到 FORCE_SLEEP 指令，暂停任务执行</span>
                </div>
                <div style="margin-top:14px;display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:10px;align-items:center;">
                    <input id="ccUpdatePassword" type="password" value="${escapeHtml(localStorage.getItem('ccUpdatePassword') || '')}" placeholder="独立更新密码：服务器 cat update_password.txt 获取" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.65);color:#e5e7eb;" oninput="saveCcUpdatePassword(this.value)" autocomplete="off">
                    <button class="cc-btn cc-btn-outline" onclick="clearCcUpdatePassword()">清空</button>
                </div>
                <div style="margin-top:6px;color:#94a3b8;font-size:12px;">更新/回滚需要后台密码 + 独立更新密码；更新完成后两者都会轮换，只能重新 cat 获取。</div>
            </div>
            <div class="cc-card">
                <div class="cc-card-title">上传更新包</div>
                <div class="cc-upload-area" id="ccUploadArea" onclick="document.getElementById('ccFileInput').click()">
                    <div class="cc-upload-icon">📦</div>
                    <div class="cc-upload-title">点击或拖拽更新包到此处</div>
                    <div class="cc-upload-desc">支持外层 .zip：manifest.json + cloud_update.zip + local_update.zip</div>
                </div>
                <input type="file" id="ccFileInput" accept=".zip" style="display:none" onchange="handleCcFileUpload(event)">
                <div class="cc-update-status" id="ccUpdateStatusBox" style="display:none;">
                    <div id="ccUpdateMessage">准备更新...</div>
                    <div class="cc-progress-bar"><div class="cc-progress-fill" id="ccProgressFill" style="width:0%"></div></div>
                </div>
            </div>
            <div class="cc-card">
                <div class="cc-card-title">备份管理</div>
                <div id="ccBackupList">
                    <div class="cc-empty">
                        <div class="cc-empty-icon">📁</div>
                        <div>暂无备份</div>
                        <div style="font-size:12px;margin-top:4px;">整体更新时会自动创建备份</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    createWindow('control-center', '系统控制中心', 'desktop', content, 1000, 680);
    
    setTimeout(() => {
        loadCcBotStatus();
        loadCcBugReports();
        loadCcUpdateStatus();
        
        const uploadArea = document.getElementById('ccUploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) uploadCcFile(e.dataTransfer.files[0]);
            });
        }
        
        setInterval(() => {
            if (windows['control-center']) {
                loadCcBotStatus();
                loadCcUpdateStatus();
            }
        }, 5000);
    }, 100);
}

function getCcApiBase() {
    const configured = (localStorage.getItem('cloudServerUrl') || '').trim();
    if (!configured) return '';
    return /^https?:\/\//i.test(configured) ? configured : `http://${configured}`;
}

function getCcUpdatePassword() {
    const input = document.getElementById('ccUpdatePassword');
    return (input?.value || localStorage.getItem('ccUpdatePassword') || '').trim();
}

function saveCcUpdatePassword(value) {
    localStorage.setItem('ccUpdatePassword', String(value || '').trim());
}

function clearCcUpdatePassword() {
    localStorage.removeItem('ccUpdatePassword');
    const input = document.getElementById('ccUpdatePassword');
    if (input) input.value = '';
}

function requireCcUpdatePassword() {
    let password = getCcUpdatePassword();
    if (!password) {
        password = (prompt('请输入独立更新密码（服务器执行 cat /home/mineflayer/app/update_password.txt 获取）：') || '').trim();
        if (password) {
            saveCcUpdatePassword(password);
            const input = document.getElementById('ccUpdatePassword');
            if (input) input.value = password;
        }
    }
    if (!password) {
        switchCcTab('updates');
        setTimeout(() => {
            const input = document.getElementById('ccUpdatePassword');
            if (input) input.focus();
        }, 50);
        showSystemMessage('缺少更新密码', '本次操作需要独立更新密码。请在服务器执行 cat /home/mineflayer/app/update_password.txt 后输入。', 'error');
        return '';
    }
    return password;
}

function switchCcTab(tab) {
    document.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.cc-tab[onclick="switchCcTab('${tab}')"]`).classList.add('active');
    document.getElementById('cc-' + tab).classList.add('active');
    if (tab === 'monitor') loadCcBotStatus();
    if (tab === 'bugs') loadCcBugReports();
    if (tab === 'updates') loadCcUpdateStatus();
}

async function ccFetch(url, options = {}) {
    const base = getCcApiBase();
    const headers = options.headers || {};
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    if (url.startsWith('/api/update/') && !url.includes('/status') && !url.includes('/version') && !url.includes('/local/')) {
        const updatePassword = requireCcUpdatePassword();
        if (!updatePassword) return null;
        headers['X-Update-Password'] = updatePassword;
    }
    try {
        const resp = await fetch(base + url, { ...options, headers: { ...headers, ...options.headers } });
        if (resp.status === 401 && !url.includes('/login')) {
            showSystemMessage('认证失效', '登录已过期，请重新登录。', 'error');
            return null;
        }
        const data = await resp.json();
        if (!resp.ok || data?.success === false) {
            if (!options.silent) showSystemMessage('操作失败', data?.error || `请求失败：HTTP ${resp.status}`, 'error');
        }
        return data;
    } catch (err) {
        console.log('CC API error:', err.message);
        if (!options.silent) showSystemMessage('连接失败', `无法连接管理服务：${err.message}`, 'error');
        return null;
    }
}

async function loadCcBotStatus() {
    if (!authToken) return;
    const grid = document.getElementById('ccBotGrid');
    const failoverDiv = document.getElementById('ccFailoverStatus');
    if (!grid || !failoverDiv) return;
    
    const data = await ccFetch('/api/admin/bot/failover-status', { silent: true });
    if (!data?.success) {
        grid.innerHTML = `
            <div class="cc-empty" style="grid-column:1/-1;">
                <div class="cc-empty-icon">⚠️</div>
                <div>无法连接云服务器</div>
                <div style="font-size:12px;margin-top:4px;">请检查服务器是否正常运行</div>
            </div>
        `;
        failoverDiv.innerHTML = `<div class="cc-empty">状态未知</div>`;
        return;
    }
    
    const botList = data.botList || [];
    
    if (botList.length === 0) {
        grid.innerHTML = `
            <div class="cc-empty" style="grid-column:1/-1;">
                <div class="cc-empty-icon">🤖</div>
                <div>暂无连接的Bot</div>
                <div style="font-size:12px;margin-top:4px;">启动本地Bot后将自动显示</div>
            </div>
        `;
    } else {
        grid.innerHTML = botList.map(bot => {
            const statusClass = bot.status === 'failover' ? 'cc-status-failover' : (bot.status === 'online' ? 'cc-status-online' : 'cc-status-offline');
            const statusText = bot.status === 'failover' ? '故障转移' : (bot.status === 'online' ? '在线' : '离线');
            const locationIcon = bot.location === 'cloud' ? '☁️' : (bot.location === 'local' ? '💻' : '❓');
            const locationText = bot.location === 'cloud' ? '云端执行' : (bot.location === 'local' ? '本地执行' : '位置未知');
            const heartbeatColor = bot.lastSeenAgo !== null && bot.lastSeenAgo < 5000 ? '#22c55e' : (bot.lastSeenAgo !== null && bot.lastSeenAgo < 10000 ? '#f59e0b' : '#ef4444');
            
            return `
                <div class="cc-bot-card">
                    <div class="cc-bot-header" onclick="toggleCcBotDetail(${bot.botNum})">
                        <span class="cc-bot-name"><div class="cc-bot-icon">🤖</div> Bot #${bot.botNum}</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="cc-status ${statusClass}">${statusText}</span>
                            <span class="cc-bot-expand" style="cursor:pointer;color:#64748b;font-size:14px;">▼</span>
                        </div>
                    </div>
                    <div class="cc-bot-summary">
                        <div class="cc-bot-info"><span style="color:${heartbeatColor};">●</span> 位置: ${locationIcon} ${locationText}</div>
                        <div class="cc-bot-info">⏱️ 最后心跳: ${bot.lastSeenAgo !== null ? Math.floor(bot.lastSeenAgo / 1000) + '秒前' : '未知'}</div>
                    </div>
                    <div class="cc-bot-detail" id="ccBotDetail-${bot.botNum}" style="display:none;">
                        <div class="cc-bot-info">🔄 故障转移: ${bot.failoverActive ? '<span style="color:#f59e0b;">是</span>' : '<span style="color:#22c55e;">否</span>'}</div>
                        <div class="cc-bot-info">⚙️ 维护模式: ${bot.maintenanceMode ? '<span style="color:#f59e0b;">是</span>' : '<span style="color:#22c55e;">否</span>'}</div>
                        <div class="cc-bot-info">📡 手动触发: ${bot.manualTrigger ? '<span style="color:#3b82f6;">是</span>' : '否'}</div>
                        <div class="cc-bot-info">💤 休眠指令: ${bot.sleepSent ? '<span style="color:#f59e0b;">已发送</span>' : '<span style="color:#22c55e;">未发送</span>'}</div>
                        ${bot.reconnectLogged ? '<div class="cc-bot-info" style="color:#3b82f6;">📡 本地已恢复心跳，等待任务移交</div>' : ''}
                        <div class="cc-bot-info">📍 位置详情: ${bot.location === 'cloud' ? '云服务器' : (bot.location === 'local' ? '本地服务器' : '未知')}</div>
                        <div class="cc-bot-actions">
                            <button class="cc-btn cc-btn-warning" onclick="event.stopPropagation(); ccForceSleep(${bot.botNum})">强制休眠</button>
                            <button class="cc-btn cc-btn-danger" onclick="event.stopPropagation(); ccTriggerFailover(${bot.botNum})">故障转移</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    const failoverBots = botList.filter(b => b.failoverActive);
    if (failoverBots.length === 0) {
        failoverDiv.innerHTML = `
            <div class="cc-empty">
                <div class="cc-empty-icon">✅</div>
                <div>运行正常</div>
                <div style="font-size:12px;margin-top:4px;">当前没有故障转移中的Bot</div>
            </div>
        `;
    } else {
        failoverDiv.innerHTML = failoverBots.map(bot => `
            <div style="padding:12px;background:rgba(245,158,11,0.1);border-radius:8px;margin-bottom:8px;border:1px solid rgba(245,158,11,0.2);">
                <strong>Bot #${bot.botNum}</strong> - ${bot.maintenanceMode ? '维护模式' : '心跳超时'}，${bot.location === 'cloud' ? '云端已接管' : '等待接管'}
                ${bot.reconnectLogged ? '<br><span style="font-size:11px;color:#94a3b8;">本地Bot已恢复心跳，等待云端任务完成</span>' : ''}
            </div>
        `).join('');
    }
}

function toggleCcBotDetail(botNum) {
    const detail = document.getElementById(`ccBotDetail-${botNum}`);
    if (detail) {
        const isHidden = detail.style.display === 'none';
        detail.style.display = isHidden ? 'block' : 'none';
        const expand = detail.parentElement?.querySelector('.cc-bot-expand');
        if (expand) expand.textContent = isHidden ? '▲' : '▼';
    }
}

async function ccForceSleep(botNum) {
    if (!confirm(`确定强制 Bot #${botNum} 休眠？`)) return;
    const data = await ccFetch(`/api/admin/bot/${botNum}/force-sleep`, { method: 'POST' });
    if (data?.success) { alert('已发送指令'); loadCcBotStatus(); }
    else { alert('发送失败，请检查服务器连接'); }
}

async function ccTriggerFailover(botNum) {
    if (!confirm(`确定触发 Bot #${botNum} 故障转移？`)) return;
    const data = await ccFetch(`/api/admin/bot/${botNum}/trigger-failover`, { method: 'POST' });
    if (data?.success) { alert('已触发故障转移'); loadCcBotStatus(); }
    else { alert('操作失败，请检查服务器连接'); }
}

async function loadCcBugReports() {
    if (!authToken) return;
    const list = document.getElementById('ccBugList');
    if (!list) return;
    
    const data = await ccFetch('/api/admin/bug-reports');
    if (!data?.success) {
        list.innerHTML = `
            <li class="cc-empty">
                <div class="cc-empty-icon">⚠️</div>
                <div>加载失败</div>
                <div style="font-size:12px;margin-top:4px;">请检查服务器连接</div>
            </li>
        `;
        return;
    }
    
    if (data.reports.length === 0) {
        list.innerHTML = `
            <li class="cc-empty">
                <div class="cc-empty-icon">🐛</div>
                <div>暂无Bug报告</div>
                <div style="font-size:12px;margin-top:4px;">玩家通过游戏内 !bug 命令提交</div>
            </li>
        `;
        return;
    }
    
    list.innerHTML = data.reports.map(bug => {
        const status = bug.status || 'pending';
        const statusOptions = ['pending', 'processing', 'resolved', 'rejected'];
        const statusLabels = { pending: '待处理', processing: '处理中', resolved: '已解决', rejected: '已拒绝' };
        
        return `
            <li class="cc-bug-item">
                <div class="cc-bug-header"><span class="cc-bug-sender">${escapeHtml(bug.sender)}</span><span class="cc-bug-time">${new Date(bug.createdAt || bug.timestamp).toLocaleString('zh-CN')}</span></div>
                <div class="cc-bug-desc">${escapeHtml(bug.description)}</div>
                <div class="cc-bug-footer"><span class="cc-bug-pos">📍 ${escapeHtml(bug.position || '未知')}</span>
                    <select class="cc-status-select" onchange="updateCcBugStatus('${bug.id}', this.value)">
                        ${statusOptions.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
                    </select>
                </div>
            </li>
        `;
    }).join('');
}

async function updateCcBugStatus(id, status) {
    if (!authToken) return;
    const data = await ccFetch(`/api/admin/bug-reports/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (data?.success) {
        const extra = data.thanksQueued ? '，已通知反馈玩家' : '';
        showSystemMessage('状态已更新', `Bug 状态已更新为：${status}${extra}`, 'success');
        loadCcBugReports();
    } else {
        showSystemMessage('状态更新失败', data?.error || '请检查后台连接', 'error');
    }
}

async function exportCcBugReports() {
    if (!authToken) return;
    try {
        const base = getCcApiBase();
        const resp = await fetch(base + '/api/admin/bug-reports/export.txt', {
            headers: { Authorization: 'Bearer ' + authToken }
        });
        if (!resp.ok) {
            throw new Error('导出失败，HTTP ' + resp.status);
        }
        const text = await resp.text();
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bug-reports-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showSystemMessage('导出完成', '已导出未处理 Bug 反馈，已处理/已拒绝不会出现在 TXT 中。', 'success');
    } catch (err) {
        showSystemMessage('导出失败', err.message || '请检查后台连接', 'error');
    }
}

async function loadCcUpdateStatus() {
    if (!authToken) return;
    const updatePasswordInput = document.getElementById('ccUpdatePassword');
    if (updatePasswordInput && !updatePasswordInput.value) updatePasswordInput.value = localStorage.getItem('ccUpdatePassword') || '';
    const verEl = document.getElementById('ccCurrentVersion');
    const statusEl = document.getElementById('ccUpdateStatus');
    const switchEl = document.getElementById('ccMaintenanceSwitch');
    const statusBox = document.getElementById('ccUpdateStatusBox');
    const msgEl = document.getElementById('ccUpdateMessage');
    const progressEl = document.getElementById('ccProgressFill');
    
    const data = await ccFetch('/api/update/status', { silent: true });
    if (!data?.success) {
        if (verEl) verEl.textContent = '--';
        if (statusEl) statusEl.textContent = '未连接';
        return;
    }
    
    if (verEl) verEl.textContent = data.status.currentVersion || '1.0.0';
    if (statusEl) statusEl.textContent = getCcStepLabel(data.status.step);
    if (progressEl && typeof data.status.progress === 'number') {
        progressEl.style.width = `${Math.max(0, Math.min(100, data.status.progress))}%`;
    }
    if (msgEl && data.status.message) {
        msgEl.textContent = data.status.message;
    }
    if (statusBox && data.status.step && data.status.step !== 'idle') {
        statusBox.style.display = 'block';
    }
    if (switchEl) {
        if (data.status.maintenanceMode) switchEl.classList.add('active');
        else switchEl.classList.remove('active');
    }
    
    ensureCcUpdateDetails(data.status, data.maintenance);
    loadCcBackups();
}

function getCcStepLabel(step) {
    const labels = { idle: '空闲', uploading: '上传中', uploaded: '已上传待确认', maintenance: '维护模式', backup: '备份中', local_package: '生成本地包', complete: '更新完成', recovered: '已恢复', rolled_back: '已回滚', failed: '更新失败' };
    return labels[step] || step;
}

async function toggleCcMaintenance() {
    if (!authToken) return;
    const switchEl = document.getElementById('ccMaintenanceSwitch');
    const enabled = !switchEl.classList.contains('active');
    
    const data = await ccFetch('/api/update/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
    });
    
    if (data?.success) {
        if (data.maintenanceMode) switchEl.classList.add('active');
        else switchEl.classList.remove('active');
    } else {
        alert('操作失败，请检查服务器连接');
    }
}

function handleCcFileUpload(event) {
    const file = event.target.files[0];
    if (file) uploadCcFile(file);
}

async function uploadCcFile(file) {
    if (!authToken) return;
    if (!file.name.endsWith('.zip')) { alert('请上传 ZIP 更新包'); return; }
    const updatePassword = requireCcUpdatePassword();
    if (!updatePassword) return;
    
    const statusBox = document.getElementById('ccUpdateStatusBox');
    const msgEl = document.getElementById('ccUpdateMessage');
    const progressEl = document.getElementById('ccProgressFill');
    
    statusBox.style.display = 'block';
    msgEl.textContent = '正在上传并校验更新包...';
    progressEl.style.width = '30%';
    
    const formData = new FormData();
    formData.append('updateFile', file);
    
    try {
        const base = getCcApiBase();
        const resp = await fetch(base + '/api/update/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + authToken, 'X-Update-Password': updatePassword },
            body: formData
        });
        const data = await resp.json();
        
        if (data.success) {
            const manifest = data.manifest || {};
            progressEl.style.width = `${Math.max(30, Math.min(45, Number(manifest.progress || 32)))}%`;
            msgEl.innerHTML = '<div><b>更新包校验通过</b>：v' + escapeHtml(data.version) + '</div>' +
                '<div style="margin-top:6px;color:#94a3b8;">云端变更 ' + (data.cloudChanged || 0) + ' 个，本地变更 ' + (data.localChanged || 0) + ' 个。</div>' +
                (manifest.requiresRestart ? '<div style="margin-top:6px;color:#f59e0b;">此更新包含服务端代码，执行后需要重启 node server.js 才完全生效。</div>' : '') +
                (manifest.warnings?.length ? '<div style="margin-top:6px;color:#f59e0b;">警告：' + escapeHtml(manifest.warnings.join('；')) + '</div>' : '');
            
            const cloudList = (manifest.cloud || []).filter(item => item.action !== 'same').slice(0, 8).map(item => '云端 ' + item.action + ': ' + item.path).join('\n') || '无云端文件变化';
            const localList = (manifest.local || []).filter(item => item.action !== 'same').slice(0, 8).map(item => '本地 ' + item.action + ': ' + item.path).join('\n') || '无本地文件变化';
            const ok = confirm('更新包已通过兼容性检查。\n版本: ' + data.version + '\n云端变更: ' + (data.cloudChanged || 0) + '\n本地变更: ' + (data.localChanged || 0) + (manifest.requiresRestart ? '\n需要重启: 是' : '\n需要重启: 否') + '\n\n' + cloudList + '\n' + localList + '\n\n确认执行云端更新吗？');
            if (ok) executeCcUpdate();
        } else {
            msgEl.textContent = '上传失败: ' + (data.error || '兼容性检查未通过');
            progressEl.style.width = '0%';
            showSystemMessage('更新包被拒绝', data.error || '兼容性检查未通过', 'error');
        }
    } catch (err) {
        msgEl.textContent = '上传错误: ' + err.message;
        progressEl.style.width = '0%';
        showSystemMessage('上传错误', err.message, 'error');
    }
}
async function executeCcUpdate() {
    const statusBox = document.getElementById('ccUpdateStatusBox');
    const msgEl = document.getElementById('ccUpdateMessage');
    const progressEl = document.getElementById('ccProgressFill');
    
    statusBox.style.display = 'block';
    msgEl.textContent = '正在执行更新...';
    progressEl.style.width = '40%';
    
    const data = await ccFetch('/api/update/execute', { method: 'POST' });
    
    if (data?.success) {
        progressEl.style.width = '60%';
        msgEl.textContent = data.message + ' 页面将在更新完成后自动刷新...';
        
        let countdown = 10;
        const interval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(interval);
                window.location.reload();
            }
        }, 1000);
    } else {
        msgEl.textContent = '更新失败: ' + (data?.error || '未知错误');
        progressEl.style.width = '0%';
    }
}

async function loadCcBackups() {
    if (!authToken) return;
    const list = document.getElementById('ccBackupList');
    if (!list) return;
    
    const data = await ccFetch('/api/update/backups', { silent: true });
    if (!data?.success) {
        list.innerHTML = `
            <div class="cc-empty">
                <div class="cc-empty-icon">⚠️</div>
                <div>加载失败</div>
            </div>
        `;
        return;
    }
    
    if (data.backups.length === 0) {
        list.innerHTML = `
            <div class="cc-empty">
                <div class="cc-empty-icon">📁</div>
                <div>暂无备份</div>
                <div style="font-size:12px;margin-top:4px;">整体更新时会自动创建备份</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = '<div class="cc-backup-list">' + data.backups.map(b => `
        <div class="cc-backup-item">
            <div class="cc-backup-info">
                <div class="cc-backup-ver">${b.version}</div>
                <div class="cc-backup-time">${new Date(b.timestamp).toLocaleString('zh-CN')}</div>
            </div>
            <button class="cc-btn cc-btn-danger" style="font-size:12px;padding:6px 12px;" onclick="ccRollback('${b.version}')">回滚</button>
        </div>
    `).join('') + '</div>';
}

async function ccRollback(version) {
    if (!confirm(`确定回滚到版本 ${version} 吗？`)) return;
    const data = await ccFetch('/api/update/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
    });
    if (data?.success) {
        alert('回滚成功，页面将刷新');
        setTimeout(() => window.location.reload(), 1000);
    } else {
        alert('回滚失败: ' + (data?.error || '未知错误'));
    }
}

function ensureCcUpdateDetails(status = {}, maintenance = {}) {
    const statusBox = document.getElementById('ccUpdateStatusBox');
    if (!statusBox) return;

    let details = document.getElementById('ccUpdateDetails');
    if (!details) {
        details = document.createElement('div');
        details.id = 'ccUpdateDetails';
        details.className = 'cc-update-status';
        details.style.marginTop = '12px';
        statusBox.insertAdjacentElement('afterend', details);
    }

    const manifest = status.manifest || {};
    const phase = maintenance.phase || (status.maintenanceMode ? 'manual' : 'idle');
    const localReady = status.localPackageReady ? '已开放' : '未开放';
    const restartText = status.restartRequired ? '更新完成后将自动重启（PM2 会自动拉起）' : '无需重启';
    const warnings = Array.isArray(manifest.warnings) && manifest.warnings.length
        ? `<div style="margin-top:8px;color:#f59e0b;">警告：${escapeHtml(manifest.warnings.join('；'))}</div>`
        : '';

    details.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px;">
            <div><div style="color:#64748b;font-size:12px;">维护阶段</div><div style="font-weight:700;">${escapeHtml(phase)}</div></div>
            <div><div style="color:#64748b;font-size:12px;">目标版本</div><div style="font-weight:700;">${escapeHtml(status.targetVersion || manifest.version || '--')}</div></div>
            <div><div style="color:#64748b;font-size:12px;">本地包下载</div><div style="font-weight:700;color:${status.localPackageReady ? '#22c55e' : '#f59e0b'};">${localReady}</div></div>
            <div><div style="color:#64748b;font-size:12px;">重启要求</div><div style="font-weight:700;">${restartText}</div></div>
        </div>
        <div style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(15,23,42,.45);font-size:13px;line-height:1.7;">
            <div style="font-weight:700;margin-bottom:4px;">标准外层更新包结构</div>
            <div>manifest.json：版本、兼容性、校验信息</div>
            <div>cloud_update.zip：云端代码与 Web 后台优先更新</div>
            <div>local_update.zip：本地运输 Bot 后置拉取更新</div>
        </div>
        <div style="margin-top:10px;color:#94a3b8;font-size:13px;">
            云端变更：${manifest.cloudChanged ?? 0} 个；本地变更：${manifest.localChanged ?? 0} 个；新任务分配：${maintenance.blockNewTasks ? '已暂停' : '正常'}
        </div>
        ${warnings}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="cc-btn cc-btn-primary" onclick="executeCcUpdate()">执行待更新</button>
            <button class="cc-btn cc-btn-outline" onclick="loadCcUpdateStatus()">刷新状态</button>
        </div>
    `;
}

async function executeCcUpdate() {
    const statusBox = document.getElementById('ccUpdateStatusBox');
    const msgEl = document.getElementById('ccUpdateMessage');
    const progressEl = document.getElementById('ccProgressFill');

    if (statusBox) statusBox.style.display = 'block';
    if (msgEl) msgEl.textContent = '正在启动云端优先更新，维护模式将自动开启...';
    if (progressEl) progressEl.style.width = '35%';

    const data = await ccFetch('/api/update/execute', { method: 'POST' });
    if (!data?.success) {
        if (msgEl) msgEl.textContent = '更新启动失败: ' + (data?.error || '未知错误');
        if (progressEl) progressEl.style.width = '0%';
        showSystemMessage('更新启动失败', data?.error || '未知错误', 'error');
        return;
    }

    showSystemMessage('更新已启动', data.message || '正在执行云端优先更新', 'info');
    if (msgEl) msgEl.textContent = data.message || '更新已启动，正在等待状态回传...';
    if (progressEl) progressEl.style.width = '55%';

    let attempts = 0;
    const timer = setInterval(async () => {
        attempts += 1;
        const statusData = await ccFetch('/api/update/status', { silent: true });
        if (!statusData?.success) {
            if (msgEl) msgEl.textContent = '正在等待服务恢复连接...';
            return;
        }

        const step = statusData.status?.step || 'idle';
        const message = statusData.status?.message || getCcStepLabel(step);
        if (msgEl) msgEl.textContent = message;
        if (progressEl) {
            const width = Number.isFinite(Number(statusData.status?.progress))
                ? Number(statusData.status.progress)
                : (step === 'complete' || step === 'recovered' ? 100 : Math.min(95, 55 + attempts * 4));
            progressEl.style.width = `${width}%`;
        }
        ensureCcUpdateDetails(statusData.status, statusData.maintenance);

        if (['complete', 'failed', 'rolled_back', 'recovered'].includes(step) || attempts >= 45) {
            clearInterval(timer);
            loadCcUpdateStatus();
            if (step === 'complete' || step === 'recovered') {
                showSystemMessage('更新完成', message, 'success');
            } else if (step === 'failed' || step === 'rolled_back') {
                showSystemMessage('更新异常', message, 'error');
            } else {
                showSystemMessage('更新仍在进行', '状态轮询已停止，请稍后手动刷新。', 'info');
            }
        }
    }, 2000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

bootSystem();
