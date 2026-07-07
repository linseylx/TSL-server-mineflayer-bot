const fs = require('fs');
const path = require('path');
const { overrideItemName } = require('./itemNameOverrides');

const translationsFile = path.join(__dirname, '..', 'data', 'mc_items.json');

const materialNames = {
    oak: '橡木',
    spruce: '云杉木',
    birch: '白桦木',
    jungle: '丛林木',
    acacia: '金合欢木',
    dark_oak: '深色橡木',
    mangrove: '红树林',
    cherry: '樱花木',
    bamboo: '竹',
    crimson: '绯红',
    warped: '诡异'
};

const suffixNames = [
    ['stripped_', 'log', '去皮{material}原木'],
    ['stripped_', 'wood', '去皮{material}'],
    ['', 'log', '{material}原木'],
    ['', 'wood', '{material}'],
    ['', 'planks', '{material}板'],
    ['', 'stairs', '{material}楼梯'],
    ['', 'slab', '{material}台阶'],
    ['', 'fence_gate', '{material}栅栏门'],
    ['', 'fence', '{material}栅栏'],
    ['', 'door', '{material}门'],
    ['', 'trapdoor', '{material}活板门'],
    ['', 'pressure_plate', '{material}压力板'],
    ['', 'button', '{material}按钮'],
    ['', 'sapling', '{material}树苗'],
    ['', 'sign', '{material}告示牌'],
    ['', 'hanging_sign', '{material}悬挂式告示牌'],
    ['', 'leaves', '{material}树叶']
];

const directFallbacks = {
    cherry_wood: '樱花木',
    cherry_log: '樱花原木',
    cherry_planks: '樱花木板',
    cherry_sapling: '樱花树苗',
    mangrove_roots: '红树根',
    crimson_stem: '绯红菌柄',
    crimson_hyphae: '绯红菌核',
    crimson_planks: '绯红木板',
    crimson_fungus: '绯红菌',
    warped_stem: '诡异菌柄',
    warped_hyphae: '诡异菌核',
    warped_planks: '诡异木板',
    warped_fungus: '诡异菌',
    bamboo_block: '竹块',
    bamboo_planks: '竹板',
    bamboo_mosaic: '竹马赛克',
    bamboo_stairs: '竹楼梯',
    bamboo_slab: '竹台阶',
    bamboo_fence: '竹栅栏',
    bamboo_door: '竹门',
    bamboo_trapdoor: '竹活板门',
    bamboo_sign: '竹告示牌',
    bamboo_hanging_sign: '竹悬挂式告示牌',
    bamboo: '竹子',
    tube_coral: '管珊瑚',
    brain_coral: '脑纹珊瑚',
    bubble_coral: '气泡珊瑚',
    fire_coral: '火珊瑚',
    horn_coral: '鹿角珊瑚',
    tube_coral_fan: '管珊瑚扇',
    brain_coral_fan: '脑纹珊瑚扇',
    bubble_coral_fan: '气泡珊瑚扇',
    fire_coral_fan: '火珊瑚扇',
    horn_coral_fan: '鹿角珊瑚扇',
    dead_tube_coral_block: '失活的管珊瑚块',
    dead_brain_coral_block: '失活的脑纹珊瑚块',
    dead_bubble_coral_block: '失活的气泡珊瑚块',
    dead_fire_coral_block: '失活的火珊瑚块',
    dead_horn_coral_block: '失活的鹿角珊瑚块',
    dead_fire_coral: '失活的火珊瑚'
};

const customTextFallbacks = [
    [/^1\.\d+(?:\.\d+)?\s+Pale Oak Stairs$/i, '苍白橡木楼梯'],
    [/^1\.\d+(?:\.\d+)?\s+Pale Oak Slab$/i, '苍白橡木台阶'],
    [/^1\.\d+(?:\.\d+)?\s+Pale Oak Planks$/i, '苍白橡木木板'],
    [/^1\.\d+(?:\.\d+)?\s+Pale Oak Log$/i, '苍白橡木原木'],
    [/^1\.\d+(?:\.\d+)?\s+Pale Oak Wood$/i, '苍白橡木'],
    [/^Pale Oak Stairs$/i, '苍白橡木楼梯'],
    [/^Pale Oak Slab$/i, '苍白橡木台阶'],
    [/^Pale Oak Planks$/i, '苍白橡木木板'],
    [/^Pale Oak Log$/i, '苍白橡木原木'],
    [/^Pale Oak Wood$/i, '苍白橡木']
];

let cachedTranslations = null;

function normalizeItemName(name) {
    return String(name || '').replace(/^minecraft:/, '').trim();
}

function normalizeCustomName(customName = '') {
    if (!customName) return '';
    if (typeof customName === 'object') return String(customName.text || '').trim();
    const raw = String(customName).trim();
    if (!raw) return '';
    if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
                return parsed.text.trim();
            }
        } catch {}
        return '';
    }
    return raw;
}

function translateCustomText(text = '') {
    const normalized = String(text || '').trim();
    for (const [pattern, translated] of customTextFallbacks) {
        if (pattern.test(normalized)) return translated;
    }
    return normalized;
}

function isGeneratedVersionName(customName = '') {
    const normalized = normalizeCustomName(customName);
    return /^1\.\d+(?:\.\d+)?\s+[A-Za-z][A-Za-z0-9 _'-]*$/i.test(normalized);
}

function loadTranslations() {
    if (cachedTranslations) return cachedTranslations;
    try {
        if (fs.existsSync(translationsFile)) {
            const data = JSON.parse(fs.readFileSync(translationsFile, 'utf8'));
            cachedTranslations = data.items || {};
            return cachedTranslations;
        }
    } catch {}
    cachedTranslations = {};
    return cachedTranslations;
}

function ruleTranslate(key) {
    if (directFallbacks[key]) return directFallbacks[key];

    for (const [materialKey, materialName] of Object.entries(materialNames)) {
        for (const [prefix, suffix, template] of suffixNames) {
            const expected = `${prefix}${materialKey}_${suffix}`;
            if (key === expected) return template.replace('{material}', materialName);
        }
    }

    return null;
}

function getStandardTranslation(name) {
    const key = normalizeItemName(name);
    const override = overrideItemName(key);
    if (override) return override;
    const table = loadTranslations();
    return table[key] || ruleTranslate(key) || '';
}

function shouldUseCustomName(name, customName = '') {
    const normalizedCustomName = normalizeCustomName(customName);
    if (!normalizedCustomName) return false;
    if (isGeneratedVersionName(normalizedCustomName)) return false;
    const standard = getStandardTranslation(name);
    return !standard || standard === normalizeItemName(name);
}

function translateItemName(name, customName = '') {
    const key = normalizeItemName(name);
    const standard = getStandardTranslation(key);
    if (standard) return standard;
    const normalizedCustomName = normalizeCustomName(customName);
    if (normalizedCustomName && !isGeneratedVersionName(normalizedCustomName)) {
        return translateCustomText(normalizedCustomName);
    }
    return key || String(name || '');
}

module.exports = {
    normalizeItemName,
    normalizeCustomName,
    isGeneratedVersionName,
    getStandardTranslation,
    shouldUseCustomName,
    translateCustomText,
    translateItemName,
    loadTranslations
};
