# Facebook Follower Analyzer Bot (Cloudflare Pages Functions)

Telegram bot - Facebook ZIP ဖိုင် upload လုပ်ပြီး followers/following စစ်ဆေးပေးသည်။ PNG summary card ပါ ထုတ်ပေးသည်။

## Project Structure

```
fb-analysis-cf/
├── functions/
│   ├── [[path]].js              ← Entry point (catch-all route)
│   ├── modules/
│   │   ├── handlers.js          ← Bot commands + logic
│   │   ├── zip-parser.js        ← ZIP file parsing
│   │   └── card-generator.js    ← PNG card generation
│   └── helpers/
│       ├── database.js          ← D1 + KV wrappers
│       ├── utils.js             ← Utility functions
│       └── lang.js              ← Bilingual messages (MM/EN)
├── schema.sql                   ← Database schema
├── package.json                 ← Dependencies
├── wrangler.toml                ← Cloudflare config (minimal)
└── README.md
```

## Deploy လုပ်နည်း (GitHub + Cloudflare Pages)

### အဆင့် 1: GitHub Repo ဆောက်ပါ

1. github.com ဝင်ပါ
2. "+" > "New repository" နှိပ်ပါ
3. Name: `fb-analysis-cf`
4. Private ရွေးပါ
5. "Create repository" နှိပ်ပါ

### အဆင့် 2: Files Upload လုပ်ပါ

Repo ဖွင့်ပြီး "Add file" > "Upload files" နှိပ်ပါ။
ဒီ project ထဲက files အကုန်လုံး upload လုပ်ပါ။

**အရေးကြီး:** folder structure အတိုင်း upload ရပါမယ်:
- `functions/[[path]].js`
- `functions/modules/handlers.js`
- `functions/modules/zip-parser.js`
- `functions/modules/card-generator.js`
- `functions/helpers/database.js`
- `functions/helpers/utils.js`
- `functions/helpers/lang.js`
- `package.json`
- `wrangler.toml`
- `schema.sql`

### အဆင့် 3: Cloudflare Pages Project ဆောက်ပါ

1. dash.cloudflare.com ဝင်ပါ
2. ဘယ်ဘက် "Workers & Pages" နှိပ်ပါ
3. "Create" > "Pages" tab > "Connect to Git"
4. `fb-analysis-cf` repo ရွေးပါ
5. Build settings:
   - Build command: `npm install`
   - Build output directory: ဗလာ (empty)
6. "Save and Deploy" နှိပ်ပါ

### အဆင့် 4: D1 Database ဆောက်ပါ

1. ဘယ်ဘက် menu > "Storage & Databases" > "D1 SQL Database"
2. "Create" နှိပ်ပါ
3. Name: `fb-analyzer-db`
4. "Create" နှိပ်ပါ
5. Database ဖွင့်ပြီး "Console" tab နှိပ်ပါ
6. `schema.sql` ထဲက SQL code ကို copy paste လုပ်ပြီး "Execute" နှိပ်ပါ

### အဆင့် 5: KV Namespace ဆောက်ပါ

1. ဘယ်ဘက် menu > "Storage & Databases" > "KV"
2. "Create a namespace" နှိပ်ပါ
3. Name: `FB_KV`
4. "Add" နှိပ်ပါ

### အဆင့် 6: Bindings ချိတ်ပါ (Dashboard Settings)

1. Workers & Pages > `fb-analysis-cf` project > "Settings" tab
2. "Bindings" section ရှာပါ
3. "+ Add" နှိပ်ပြီး:
   - **D1 Database:** Variable name = `FB_D1`, Database = `fb-analyzer-db`
   - **KV Namespace:** Variable name = `FB_KV`, Namespace = `FB_KV`
4. "Save" နှိပ်ပါ

### အဆင့် 7: Environment Variables ထည့်ပါ

1. Settings > "Variables and Secrets" section
2. "+ Add" နှိပ်ပြီး:
   - `BOT_TOKEN` = (Telegram Bot Token)
   - `ADMIN_IDS` = `6424303441`
3. "Save" နှိပ်ပါ

### အဆင့် 8: Redeploy လုပ်ပါ

1. "Deployments" tab သွားပါ
2. Latest deployment ရဲ့ ညာဘက် "..." > "Retry deployment" နှိပ်ပါ

### အဆင့် 9: Webhook ချိတ်ပါ

Browser မှာ ဒီ URL ဖွင့်ပါ:
```
https://fb-analysis-cf.pages.dev/webhook?setup=true
```

"✅ Webhook set successfully!" ပေါ်ရင် ပြီးပါပြီ!

## Features

- ZIP Upload + Analysis
- PNG Summary Card (satori + resvg-wasm)
- Channel Gate (@illumoria_1)
- Rate Limiting (3/day)
- Bilingual (MM/EN)
- Pagination with inline keyboard
- Export (TXT + CSV + PNG)
- Admin Panel

## Commands

| Command | Description |
|---------|-------------|
| /start | Bot စတင်ရန် |
| /help | အသုံးပြုနည်း |
| /lang | ဘာသာ ပြောင်းရန် |
| /stats | ရလဒ် summary |
| /check | Not-following-back list (pagination) |
| /top10 | အသစ်ဆုံး 10 ဦး |
| /export | TXT + CSV + PNG export |
| /admin | Admin stats |
