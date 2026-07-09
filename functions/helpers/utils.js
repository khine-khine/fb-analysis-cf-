// functions/helpers/utils.js
// Utility functions

import { messages } from './lang.js';

export function escapeHTML(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function formatMessage(lang, key, replacements = {}) {
    let message = (messages[lang] && messages[lang][key]) || messages['en'][key] || '';
    for (const [placeholder, value] of Object.entries(replacements)) {
        message = message.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
    }
    return message;
}

export function parseAdminIds(adminIdsEnv) {
    if (!adminIdsEnv) return [];
    return adminIdsEnv.split(',').map(id => id.trim());
}

export function isUserAdmin(userId, adminIds) {
    return adminIds.includes(userId.toString());
}

export function latin1ToUtf8(text) {
    if (!text) return '';
    try {
        const bytes = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        return text;
    }
}

export function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    const d = new Date(ts * 1000);
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

export function formatNumber(num) {
    if (!num) return '0';
    return num.toLocaleString();
}
