# ShortForge launch checklist

## Required before public traffic
- Deploy behind HTTPS and set `COOKIE_SECURE=true`.
- Use a persistent, backed-up `DATA_DIR` and keep it outside the public web root.
- Keep ElevenLabs/Pexels keys in server secrets only.
- Install FFmpeg if MP4 export is enabled.
- Set realistic `DAILY_AI_LIMIT` and `DAILY_RENDER_LIMIT` values and provider spend caps.
- Add privacy policy, terms, acceptable-use rules and a copyright/takedown contact.
- Add monitoring, error logging, backups and restore testing.

## Recommended before scaling
- Replace the JSON file store with PostgreSQL or another transactional database.
- Add email verification, password reset, account deletion/export and session-management screens.
- Add IP/device-aware abuse throttling in addition to per-account quotas.
- Add a queue/object storage for large video rendering jobs.
- Add automated tests and CI/CD.
- Review the current terms and attribution requirements for every enabled provider.

## Current security baseline
- Passwords are hashed with Node scrypt and unique salts.
- Login uses random HttpOnly SameSite=Lax session cookies.
- Provider keys remain server-side.
- Project routes are scoped to the authenticated user.
- AI/media and render quotas are enforced server-side.
- Stock proxy only accepts Pexels hosts.
