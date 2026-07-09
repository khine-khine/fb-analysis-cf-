// functions/helpers/database.js
// D1 Database + KV Cache wrapper

export class D1DB {
    constructor(env) {
        this.db = env.FB_D1;
    }

    async getUser(userId) {
        const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?").bind(String(userId));
        const { results } = await stmt.all();
        return results[0] || null;
    }

    async createUser(userId, username = '', firstName = '', lang = 'mm') {
        await this.db.prepare(
            "INSERT INTO users (id, username, first_name, lang) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name"
        ).bind(String(userId), username, firstName, lang).run();
        return this.getUser(userId);
    }

    async updateUserLang(userId, lang) {
        await this.db.prepare("UPDATE users SET lang = ? WHERE id = ?").bind(lang, String(userId)).run();
    }

    async recordUpload(userId, followers, following, notBack) {
        await this.db.prepare(
            "INSERT INTO uploads (user_id, followers, following, not_back) VALUES (?, ?, ?, ?)"
        ).bind(String(userId), followers, following, notBack).run();
    }

    async getUploadCountToday(userId) {
        const stmt = this.db.prepare(
            "SELECT COUNT(*) as count FROM uploads WHERE user_id = ? AND uploaded_at >= datetime('now', '-1 day')"
        ).bind(String(userId));
        const { results } = await stmt.all();
        return results[0]?.count || 0;
    }

    async getAdminStats() {
        const users = await this.db.prepare("SELECT COUNT(*) as count FROM users").all();
        const uploads = await this.db.prepare("SELECT COUNT(*) as count FROM uploads").all();
        const today = await this.db.prepare(
            "SELECT COUNT(*) as count FROM uploads WHERE uploaded_at >= datetime('now', '-1 day')"
        ).all();
        return {
            totalUsers: users.results[0]?.count || 0,
            totalUploads: uploads.results[0]?.count || 0,
            todayUploads: today.results[0]?.count || 0
        };
    }
}

export class KVCache {
    constructor(env) {
        this.kv = env.FB_KV;
    }

    async put(key, value, ttl = 7200) {
        await this.kv.put(key, value, { expirationTtl: ttl });
    }

    async get(key) {
        return this.kv.get(key);
    }

    async delete(key) {
        await this.kv.delete(key);
    }
}

