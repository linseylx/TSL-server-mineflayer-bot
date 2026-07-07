const DEFAULT_LOGIN_URL = 'https://www.microsoft.com/link';

function asText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
}

function firstString(...values) {
    for (const value of values) {
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return '';
}

function tryParseJson(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch {}
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
        try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
    return null;
}

function normalizeUrl(url) {
    const text = String(url || '').trim().replace(/\\u0026/g, '&');
    if (!text) return '';
    const match = text.match(/https?:\/\/[^\s"'<>]+/i);
    return (match ? match[0] : text).replace(/[),.;，。]+$/g, '');
}

function normalizeCode(code) {
    return String(code || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function extractFromText(text) {
    const raw = String(text || '');
    const parsed = tryParseJson(raw);
    if (parsed && typeof parsed === 'object') return normalizeMicrosoftLogin(parsed);

    const completeUrl = raw.match(/"(?:verification_uri_complete|verificationUriComplete|url|verificationUrl)"\s*:\s*"([^"]+)"/i)?.[1];
    const baseUrl = raw.match(/"(?:verification_uri|verificationUri)"\s*:\s*"([^"]+)"/i)?.[1];
    const plainUrl = raw.match(/https?:\/\/(?:www\.)?microsoft\.com\/link[^\s"'<>]*/i)?.[0];
    const userCode = raw.match(/"(?:user_code|userCode|code|otc)"\s*:\s*"([^"]+)"/i)?.[1]
        || raw.match(/\[LOGIN_CODE\]\s*([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || raw.match(/(?:enter|use)\s+the\s+code\s+([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || raw.match(/(?:verification|user)\s+code\s*[:：]?\s*([A-Z0-9]{4,}(?:-[A-Z0-9]{2,})?)/i)?.[1]
        || raw.match(/[?&]otc=([A-Z0-9-]+)/i)?.[1];

    const url = normalizeUrl(completeUrl || plainUrl || baseUrl);
    const code = normalizeCode(userCode);
    return {
        url: url || DEFAULT_LOGIN_URL,
        code,
        message: raw,
        raw,
        hasUrl: Boolean(url),
        hasCode: Boolean(code),
        hasLogin: Boolean(url || code || /microsoft\.com\/link|user_code|LOGIN_CODE/i.test(raw))
    };
}

function normalizeMicrosoftLogin(data = {}) {
    if (typeof data === 'string') return extractFromText(data);

    const rawText = asText(data);
    const message = firstString(data.message, data.loginMessage);
    const completeUrl = firstString(data.verification_uri_complete, data.verificationUriComplete, data.url, data.verificationUrl);
    const baseUrl = firstString(data.verification_uri, data.verificationUri);
    const textInfo = message ? extractFromText(message) : {
        url: '',
        code: '',
        message: '',
        raw: '',
        hasUrl: false,
        hasCode: false,
        hasLogin: false
    };
    const url = normalizeUrl(completeUrl || textInfo.url || baseUrl);
    const codeFromUrl = url.match(/[?&]otc=([A-Z0-9-]+)/i)?.[1] || '';
    const code = normalizeCode(firstString(data.user_code, data.userCode, data.code, data.otc, textInfo.code, codeFromUrl));

    return {
        url: url || DEFAULT_LOGIN_URL,
        code,
        message,
        raw: rawText,
        hasUrl: Boolean(normalizeUrl(completeUrl || baseUrl) || textInfo.hasUrl),
        hasCode: Boolean(code),
        hasLogin: Boolean(url || code || textInfo.hasLogin)
    };
}

function formatLoginInstruction(data) {
    const login = normalizeMicrosoftLogin(data);
    return `打开 ${login.url}${login.code ? `，输入验证码 ${login.code}` : ''}`;
}

module.exports = {
    DEFAULT_LOGIN_URL,
    normalizeMicrosoftLogin,
    formatLoginInstruction
};
