# Hostinger MySQL + images migrate (Clerk Google same)

## Status

| Step | Status |
|------|--------|
| Firestore CMS backup | **Done** → `backups/firestore-2026-09-23T10-53-38` (883 packages, 5 vehicles, settings) |
| Bookings / users backup | Need SuperAdmin → Backup (rules block public export) |
| MySQL schema + PHP API | **Ready** in `hostinger/sql` + `hostinger/api` |
| Image download + import | Waiting for **MySQL password** from you |
| Frontend switch Firebase → API | Next after DB live |

## Keep as-is

- **Clerk Google / email login** (customer)
- **Design / UI** (same React app on Hostinger)
- Existing `clerk-exchange.php`, Moyasar, Resend

## Change

- CMS data: Firestore → **MySQL**
- Images: ImgBB → **`/uploads/cms/` on Hostinger**

## What you must send (hPanel)

```
MYSQL_HOST=localhost
MYSQL_DATABASE=uXXXX_bashayer
MYSQL_USER=uXXXX_bashayer
MYSQL_PASSWORD=********
```

Optional: create DB in Hostinger → MySQL Databases first.

Also pick a long random admin API key, e.g.:

```
MYSQL_ADMIN_KEY=some-long-random-string
```

## Commands (after credentials in `.env`)

```bash
# 1) Download ImgBB/Supabase images to hostinger-upload/uploads/cms/migrated
node scripts/download-cms-images.mjs

# 2) npm i mysql2   (once)
npm install mysql2 --save-dev

# 3) Import backup → MySQL (from PC if remote MySQL allowed, or run on Hostinger)
node scripts/import-backup-to-mysql.mjs

# 4) Upload folder hostinger/api + uploads/cms via FTP / GitHub deploy
# 5) Copy api/config.sample.php → api/config.php on server and fill DB + admin_key
```

## Bookings / users

In SuperAdmin → **Backup** → download full JSON (includes private collections).  
Save under `backups/` — we import those next.

## Frontend

After MySQL is filled we flip:

```
VITE_DATA_BACKEND=mysql
VITE_MYSQL_API_URL=https://bashayer-logistics.com/api/index.php
VITE_MYSQL_ADMIN_KEY=same-as-config.php
```

Clerk stays. Firebase can remain for auth bridge / payments until bookings also move.
