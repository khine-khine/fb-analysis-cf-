// functions/[[path]].js
// Cloudflare Pages Functions catch-all route
// This handles all incoming requests (webhook from Telegram)

import { handleUpdate } from './modules/handlers.js';
import { D1DB, KVCache } from './helpers/database.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' && request.method === 'GET') {
        return new Response('Facebook Follower Analyzer Bot - Active ✅', { status: 200 });
    }

    // Webhook setup: GET /webhook?setup=true
    if (url.pathname === '/webhook' && request.method === 'GET') {
        const setup = url.searchParams.get('setup');
        if (setup === 'true') {
            const botToken = env.BOT_TOKEN;
            const webhookUrl = `${url.origin}/webhook`;
            const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.ok) {
                return new Response(`✅ Webhook set successfully!\nURL: ${webhookUrl}`, { status: 200 });
            } else {
                return new Response(`❌ Failed: ${data.description}`, { status: 500 });
            }
        }
        return new Response('FB Analyzer Bot is running!', { status: 200 });
    }

    // Telegram webhook: POST /webhook
    if (url.pathname === '/webhook' && request.method === 'POST') {
        try {
            const update = await request.json();
            const db = new D1DB(env);
            const kv = new KVCache(env);
            await handleUpdate(update, env, db, kv);
        } catch (err) {
            console.error('Webhook error:', err);
        }
        return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
}
