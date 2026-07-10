const fs = require('fs');
const path = require('path');

let bot = null;
const siliaoFile = path.join(__dirname, '..', 'siliao.txt');
const sentMessagesFile = path.join(__dirname, '..', 'sent-messages.json');
const sentMessages = new Set();
let isSiliaoInitialized = false;

function setBotInstance(botInstance) {
    bot = botInstance;
}

function loadSentMessages() {
    try {
        if (fs.existsSync(sentMessagesFile)) {
            const data = JSON.parse(fs.readFileSync(sentMessagesFile, 'utf8'));
            data.forEach(msg => sentMessages.add(msg));
        }

        if (fs.existsSync(siliaoFile)) {
            const content = fs.readFileSync(siliaoFile, 'utf8').trim();
            if (content) {
                const lines = content.split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    if (!sentMessages.has(line)) {
                        sentMessages.add(line);
                    }
                });
                saveSentMessages();
            }
        }
    } catch (e) { }
}

function saveSentMessages() {
    try {
        const maxMessages = 1000;
        const messagesArray = Array.from(sentMessages).slice(-maxMessages);
        fs.writeFileSync(sentMessagesFile, JSON.stringify(messagesArray));
    } catch (e) { }
}

function initSiliao() {
    if (isSiliaoInitialized) return;
    loadSentMessages();
    isSiliaoInitialized = true;
}

function appendMessage(message) {
    try {
        let existing = '';
        if (fs.existsSync(siliaoFile)) {
            existing = fs.readFileSync(siliaoFile, 'utf8');
        }
        if (!existing.includes(message)) {
            fs.writeFileSync(siliaoFile, existing + (existing ? '\n' : '') + message);
        }
    } catch (e) { }
}

function checkSiliaoFile() {
    if (!isSiliaoInitialized) {
        initSiliao();
        return;
    }

    if (!bot || !bot.chat || !bot.entity) return;
    if (!fs.existsSync(siliaoFile)) return;

    const content = fs.readFileSync(siliaoFile, 'utf8').trim();
    if (!content) return;

    const lines = content.split('\n').filter(line => line.trim());
    let hasNewMessages = false;

    lines.forEach(line => {
        if (!sentMessages.has(line)) {
            const filtered = line.replace(/[\x00-\x1F\x7F]/g, '');
            if (filtered.trim() && !filtered.includes(bot.username)) {
                if (!filtered.match(/^\[.*?\]\s*.*?\s*>\s*/)) {
                    bot.chat(filtered);
                    sentMessages.add(line);
                    hasNewMessages = true;
                }
            }
        }
    });

    if (hasNewMessages) {
        saveSentMessages();
    }
}

function saveSiliaoMessage(username, message) {
    const saveFormat = `[私聊] ${username} > ${message}`;
    appendMessage(saveFormat);
}

function getSentMessages() {
    return Array.from(sentMessages);
}

module.exports = {
    setBotInstance,
    initSiliao,
    appendMessage,
    checkSiliaoFile,
    saveSiliaoMessage,
    getSentMessages,
    loadSentMessages,
    saveSentMessages
};