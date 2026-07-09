-- schema.sql
-- D1 Database schema for Facebook Analyzer Bot

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT DEFAULT '',
    first_name TEXT DEFAULT '',
    lang TEXT DEFAULT 'mm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    not_back INTEGER DEFAULT 0,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploads_user_date ON uploads(user_id, uploaded_at);
