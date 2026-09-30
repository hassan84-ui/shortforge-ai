# ShortForge AI Studio — Public Launch Build

ShortForge is a 9:16 short-video creator for YouTube Shorts, TikTok, Instagram Reels and similar formats. The editor still works locally; server mode adds accounts, online project storage, usage quotas, AI narration, stock-video search and MP4/H.264 conversion.

## Included

- 15/30/45/60-second projects, scripts, scenes and caption styling
- 1080×1920 browser WebM export and SRT subtitles
- Uploaded media, narration and music mixing
- Browser autosave and JSON import/export
- Sign-up, sign-in, HttpOnly session cookies and sign-out
- Per-user online project create/open/update/delete
- Daily AI/media and MP4 quotas
- Password hashing with Node `scrypt`
- Optional ElevenLabs narration and Pexels portrait stock video
- Optional FFmpeg H.264/AAC MP4 conversion

## Local mode

Open `index.html` in Chrome or Edge. Local editing and WebM export work without an account. Online accounts, provider features and MP4 need server mode.

## Server mode

Requirements: Node.js 20+; FFmpeg for MP4.

1. Open a terminal in `server`.
2. Copy `.env.example` to `.env`.
3. Review `DATA_DIR`, quota values and provider keys.
4. Run `npm start` (no npm install is required).
5. Open `http://localhost:3000`.
6. Create an account from **Sign in → Create an account**.

Account/project data is stored in `server/data/db.json` by default. Back up the data directory. Do not commit it to source control.

## Production configuration

Serve ShortForge behind HTTPS and a production reverse proxy. Set `COOKIE_SECURE=true`. Put all provider secrets in your hosting platform's secret/environment settings. Persist and back up `DATA_DIR`. Restrict filesystem permissions to the application user. Configure request/body limits at the proxy as well as in the app.

This package intentionally uses a small file-backed store so it runs without external dependencies. For substantial traffic or multiple server instances, replace it with a transactional database (for example PostgreSQL), a shared session store, and distributed rate limiting. Add email verification/password reset and your own privacy policy, terms, copyright process, moderation/abuse controls, monitoring, backups, provider spend caps and data-retention policy before a broad commercial launch.

## Quotas

Defaults are 20 AI/media operations and 10 MP4 renders per user per UTC day. Change them with `DAILY_AI_LIMIT` and `DAILY_RENDER_LIMIT`. Quotas are server-enforced; browser changes cannot bypass them.

## Project structure

- `index.html` — creator + account/project UI
- `style.css` — interface
- `app.js` — editor, renderer, account/project client
- `api.js` — authenticated browser API layer
- `server/server.js` — backend, auth, projects, quotas, providers and MP4
- `server/.env.example` — configuration
- `LAUNCH-CHECKLIST.md` — launch checks
