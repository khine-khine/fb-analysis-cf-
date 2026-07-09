// functions/modules/handlers.js
// All Telegram bot command and callback handlers

import { formatMessage, escapeHTML, isUserAdmin, parseAdminIds, formatTimestamp } from '../helpers/utils.js';
import { parseFacebookZip } from './zip-parser.js';
import { generateSummaryCard } from './card-generator.js';

const PAGE_SIZE = 20;
const MAX_UPLOADS_PER_DAY = 3;
const MAX_FILE_SIZE_MB = 20;
const CACHE_TTL = 7200;

// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM API HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function callTelegram(token, method, body) {
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function sendMessage(token, chatId, text, reply_markup = null) {
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (reply_markup) body.reply_markup = reply_markup;
    return callTelegram(token, 'sendMessage', body);
}

async function editMessage(token, chatId, messageId, text, reply_markup = null) {
    const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
    if (reply_markup) body.reply_markup = reply_markup;
    return callTelegram(token, 'editMessageText', body);
}

async function sendDocument(token, chatId, fileBytes, filename, caption = '') {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([fileBytes]), filename);
    if (caption) formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    return fetch(url, { method: 'POST', body: formData });
}

async function sendPhoto(token, chatId, photoBytes, caption = '') {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', new Blob([photoBytes], { type: 'image/png' }), 'summary.png');
    if (caption) formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    return fetch(url, { method: 'POST', body: formData });
}

async function answerCallback(token, callbackId, text = '', showAlert = false) {
    return callTelegram(token, 'answerCallbackQuery', {
        callback_query_id: callbackId,
        text,
        show_alert: showAlert
    });
}

async function downloadFile(token, fileId) {
    const fileInfo = await callTelegram(token, 'getFile', { file_id: fileId });
    if (!fileInfo.ok) throw new Error('Failed to get file');
    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error('Failed to download file');
    return res.arrayBuffer();
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANNEL MEMBERSHIP CHECK
// ══════════════════════════════════════════════════════════════════════════════

async function isChannelMember(token, channelId, userId) {
    try {
        const result = await callTelegram(token, 'getChatMember', {
            chat_id: channelId,
            user_id: userId
        });
        if (result.ok) {
            return ['member', 'administrator', 'creator'].includes(result.result.status);
        }
        return false;
    } catch (e) {
        return false;
    }
}

function gateKeyboard(lang) {
    return {
        inline_keyboard: [
            [{ text: formatMessage(lang, 'join_btn'), url: 'https://t.me/illumoria_1' }],
            [{ text: formatMessage(lang, 'recheck_btn'), callback_data: 'recheck_membership' }]
        ]
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatStatsText(data, lang) {
    return formatMessage(lang, 'stats_text', {
        followers: data.followers_count,
        following: data.following_count,
        mutual: data.mutual_count,
        not_back: data.not_back_count
    });
}

function formatPage(notBack, page, lang) {
    const total = notBack.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const chunk = notBack.slice(start, start + PAGE_SIZE);

    let lines = [
        `<b>${formatMessage(lang, 'not_back_hdr')} (${total})</b>`,
        `📄 ${formatMessage(lang, 'page_label')} ${page + 1} / ${totalPages}`,
        '════════════════════════════════════════',
        ''
    ];

    chunk.forEach((p, i) => {
        lines.push(`${start + i + 1}. ${escapeHTML(p.name)}`);
        lines.push(`    ${formatMessage(lang, 'followed_on')}: ${formatTimestamp(p.timestamp)}`);
        lines.push('');
    });

    return lines.join('\n').trimEnd();
}

function pageKeyboard(page, total, lang) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const btns = [];
    if (page > 0) {
        btns.push({ text: formatMessage(lang, 'prev'), callback_data: `page:${page - 1}` });
    }
    if (page < totalPages - 1) {
        btns.push({ text: formatMessage(lang, 'next'), callback_data: `page:${page + 1}` });
    }
    return btns.length > 0 ? { inline_keyboard: [btns] } : undefined;
}

function formatFullTxt(data, lang) {
    const lines = [
        '📊 Facebook Analysis Result',
        '════════════════════════════════════════',
        '',
        `👥 Followers Count:    ${data.followers_count}`,
        `➡️ Following Count:    ${data.following_count}`,
        `🤝 Mutual Follow:      ${data.mutual_count}`,
        `❌ Not Following Back: ${data.not_back_count}`,
        '',
        '════════════════════════════════════════',
        ''
    ];
    data.not_following_back.forEach((p, i) => {
        lines.push(`${i + 1}. ${p.name}`);
        lines.push(`    ${formatMessage(lang, 'followed_on')}: ${formatTimestamp(p.timestamp)}`);
        lines.push('');
    });
    return lines.join('\n').trimEnd();
}

function formatCsv(data) {
    let csv = '\uFEFF#,Name,Followed On\n';
    data.not_following_back.forEach((p, i) => {
        const name = p.name.replace(/"/g, '""');
        csv += `${i + 1},"${name}",${formatTimestamp(p.timestamp)}\n`;
    });
    return new TextEncoder().encode(csv);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN UPDATE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export async function handleUpdate(update, env, db, kv) {
    const token = env.BOT_TOKEN;
    const channelId = env.CHANNEL_ID || '@illumoria_1';
    const adminIds = parseAdminIds(env.ADMIN_IDS || '');

    if (update.callback_query) {
        await handleCallback(update.callback_query, token, channelId, db, kv);
        return;
    }

    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || '';
    const firstName = message.from.first_name || '';

    // Ensure user exists
    let user = await db.getUser(userId);
    if (!user) {
        user = await db.createUser(userId, username, firstName, 'mm');
    }
    const lang = user.lang || 'mm';

    // Handle document (ZIP file)
    if (message.document) {
        await handleDocument(message, token, channelId, userId, lang, db, kv);
        return;
    }

    // Handle text commands
    if (!message.text) return;
    const text = message.text.trim();

    if (text === '/start' || text.startsWith('/start ')) {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        await sendMessage(token, chatId, formatMessage(lang, 'welcome'));
    }
    else if (text === '/help') {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        await sendMessage(token, chatId, formatMessage(lang, 'help'));
    }
    else if (text === '/lang') {
        const newLang = lang === 'mm' ? 'en' : 'mm';
        await db.updateUserLang(userId, newLang);
        await sendMessage(token, chatId, formatMessage(newLang, 'lang_changed'));
    }
    else if (text === '/stats') {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        const cached = await kv.get(`data:${userId}`);
        if (!cached) {
            await sendMessage(token, chatId, formatMessage(lang, 'no_cache'));
            return;
        }
        const data = JSON.parse(cached);
        await sendMessage(token, chatId, formatStatsText(data, lang));
    }
    else if (text === '/check') {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        const cached = await kv.get(`data:${userId}`);
        if (!cached) {
            await sendMessage(token, chatId, formatMessage(lang, 'no_cache'));
            return;
        }
        const data = JSON.parse(cached);
        if (data.not_following_back.length === 0) {
            await sendMessage(token, chatId, formatMessage(lang, 'all_follow'));
            return;
        }
        const pageText = formatPage(data.not_following_back, 0, lang);
        const kb = pageKeyboard(0, data.not_following_back.length, lang);
        await sendMessage(token, chatId, pageText, kb);
    }
    else if (text === '/top10') {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        const cached = await kv.get(`data:${userId}`);
        if (!cached) {
            await sendMessage(token, chatId, formatMessage(lang, 'no_cache'));
            return;
        }
        const data = JSON.parse(cached);
        const top10 = data.not_following_back.slice(0, 10);
        let lines = [`<b>${formatMessage(lang, 'top10_hdr')}</b>`, '════════════════════════════════════════', ''];
        top10.forEach((p, i) => {
            lines.push(`${i + 1}. ${escapeHTML(p.name)}`);
            lines.push(`    ${formatMessage(lang, 'followed_on')}: ${formatTimestamp(p.timestamp)}`);
            lines.push('');
        });
        await sendMessage(token, chatId, lines.join('\n').trimEnd());
    }
    else if (text === '/export') {
        if (!await isChannelMember(token, channelId, userId)) {
            await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
            return;
        }
        const cached = await kv.get(`data:${userId}`);
        if (!cached) {
            await sendMessage(token, chatId, formatMessage(lang, 'no_cache'));
            return;
        }
        const data = JSON.parse(cached);

        // Send TXT
        const txtContent = new TextEncoder().encode(formatFullTxt(data, lang));
        await sendDocument(token, chatId, txtContent, 'not_following_back.txt', formatMessage(lang, 'export_cap'));

        // Send CSV
        const csvContent = formatCsv(data);
        await sendDocument(token, chatId, csvContent, 'not_following_back.csv', formatMessage(lang, 'csv_cap'));

        // Send PNG card
        try {
            const pngBuffer = await generateSummaryCard(
                data.followers_count, data.following_count,
                data.mutual_count, data.not_back_count
            );
            await sendPhoto(token, chatId, pngBuffer, formatMessage(lang, 'card_cap'));
        } catch (e) {
            console.error('Card generation error:', e);
        }
    }
    else if (text === '/admin') {
        if (!isUserAdmin(userId, adminIds)) return;
        const stats = await db.getAdminStats();
        await sendMessage(token, chatId, formatMessage(lang, 'admin_panel', {
            users: stats.totalUsers,
            uploads: stats.totalUploads,
            today: stats.todayUploads
        }));
    }
    else {
        await sendMessage(token, chatId, formatMessage(lang, 'invalid_command'));
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT HANDLER (ZIP Upload)
// ══════════════════════════════════════════════════════════════════════════════

async function handleDocument(message, token, channelId, userId, lang, db, kv) {
    const chatId = message.chat.id;

    // Channel gate
    if (!await isChannelMember(token, channelId, userId)) {
        await sendMessage(token, chatId, formatMessage(lang, 'gate'), gateKeyboard(lang));
        return;
    }

    const doc = message.document;
    if (!doc || !doc.file_name || !doc.file_name.toLowerCase().endsWith('.zip')) {
        await sendMessage(token, chatId, formatMessage(lang, 'invalid_zip'));
        return;
    }

    // File size check
    if (doc.file_size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        await sendMessage(token, chatId, formatMessage(lang, 'too_big'));
        return;
    }

    // Rate limit
    const uploadCount = await db.getUploadCountToday(userId);
    if (uploadCount >= MAX_UPLOADS_PER_DAY) {
        await sendMessage(token, chatId, formatMessage(lang, 'rate_limit'));
        return;
    }

    // Processing message
    const statusMsg = await sendMessage(token, chatId, formatMessage(lang, 'processing'));
    const statusId = statusMsg.result?.message_id;

    try {
        // Download file from Telegram
        const fileBuffer = await downloadFile(token, doc.file_id);

        // Parse ZIP
        const { followers, following } = parseFacebookZip(fileBuffer);

        if (!followers || !following) {
            await editMessage(token, chatId, statusId, formatMessage(lang, 'json_miss'));
            return;
        }

        // Analyze
        const followersSet = new Set(followers);
        const notFollowingBack = following
            .filter(p => !followersSet.has(p.name))
            .sort((a, b) => b.timestamp - a.timestamp);
        const mutual = following.filter(p => followersSet.has(p.name));

        const analysisData = {
            followers_count: followers.length,
            following_count: following.length,
            mutual_count: mutual.length,
            not_back_count: notFollowingBack.length,
            not_following_back: notFollowingBack
        };

        // Cache in KV (2hr TTL)
        await kv.put(`data:${userId}`, JSON.stringify(analysisData), CACHE_TTL);

        // Log upload in D1
        await db.recordUpload(userId, followers.length, following.length, notFollowingBack.length);

        // Delete processing message
        await callTelegram(token, 'deleteMessage', { chat_id: chatId, message_id: statusId });

        if (notFollowingBack.length === 0) {
            await sendMessage(token, chatId, formatMessage(lang, 'all_follow'));
            return;
        }

        // Generate and send PNG card
        try {
            const pngBuffer = await generateSummaryCard(
                followers.length, following.length,
                mutual.length, notFollowingBack.length
            );
            await sendPhoto(token, chatId, pngBuffer, formatMessage(lang, 'card_cap'));
        } catch (cardErr) {
            console.error('Card generation failed:', cardErr);
        }

        // Send stats text
        await sendMessage(token, chatId, formatStatsText(analysisData, lang));

        // Send TXT file
        const txtContent = new TextEncoder().encode(formatFullTxt(analysisData, lang));
        await sendDocument(token, chatId, txtContent, 'not_following_back.txt', formatMessage(lang, 'export_cap'));

        // Send CSV file
        const csvContent = formatCsv(analysisData);
        await sendDocument(token, chatId, csvContent, 'not_following_back.csv', formatMessage(lang, 'csv_cap'));

    } catch (err) {
        console.error('Document processing error:', err);
        if (statusId) {
            await editMessage(token, chatId, statusId, formatMessage(lang, 'proc_err'));
        } else {
            await sendMessage(token, chatId, formatMessage(lang, 'proc_err'));
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CALLBACK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

async function handleCallback(callbackQuery, token, channelId, db, kv) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    let user = await db.getUser(userId);
    const lang = user?.lang || 'mm';

    if (data === 'recheck_membership') {
        if (await isChannelMember(token, channelId, userId)) {
            await editMessage(token, chatId, callbackQuery.message.message_id, formatMessage(lang, 'recheck_ok'));
            await answerCallback(token, callbackQuery.id, '✅');
        } else {
            await answerCallback(token, callbackQuery.id, formatMessage(lang, 'recheck_fail'), true);
        }
    }
    else if (data.startsWith('page:')) {
        const page = parseInt(data.split(':')[1]);
        const cached = await kv.get(`data:${userId}`);
        if (!cached) {
            await answerCallback(token, callbackQuery.id, formatMessage(lang, 'no_cache'), true);
            return;
        }
        const analysisData = JSON.parse(cached);
        const pageText = formatPage(analysisData.not_following_back, page, lang);
        const kb = pageKeyboard(page, analysisData.not_following_back.length, lang);
        await editMessage(token, chatId, callbackQuery.message.message_id, pageText, kb);
        await answerCallback(token, callbackQuery.id);
    }
}
  
