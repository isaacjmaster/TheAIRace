# Company Identity & Secure Recovery V1

Implemented locally on `codex/ai-race-integrated`. No push, deployment, production database access or Railway volume change.

## Player experience

Ava asks for a company name at dialogue step 2, after her existing introduction and before construction. Successful naming produces a personalized welcome. Players can postpone; unnamed returning players receive a dismissible invitation. Settings → Company / Recovery always allows naming and securing the current company. Names appear in the compact Company HUD and profile. No rename feature is offered in V1.

Names use 3–24 ASCII letters, digits, spaces and hyphens, with at least one letter. Leading/trailing whitespace is trimmed and repeated spaces collapsed. Chosen capitalization is preserved. A lowercase normalized key has a SQLite UNIQUE constraint. Taken names return three currently available alternatives (suggestions are not reservations). Reserved staff/game names and a basic offensive-word list are rejected. This is a basic filter, not comprehensive moderation.

## Identity and additive migration

Existing `foundation_saves`, `foundation_actions` and `foundation_ava` records remain under their original keys. Save JSON is not rewritten by migration or company naming. Each existing foundation gets an independent random permanent player ID and a hashed mapping from its existing secret cookie. New players receive separate random player IDs, save IDs and session credentials. Public player IDs and company names cannot authenticate access. Names are not copied from the old default `Garage Intelligence` field.

New tables:

- `identity_migrations`: applied additive migration versions.
- `company_players`: permanent ID, unique existing save reference, optional display name, UNIQUE normalized name, naming-deferral flag, UNIQUE recovery verifier, recovery rotation timestamp and creation timestamp.
- `company_sessions`: SHA-256 session-token hash, permanent player reference and expiry.
- `company_recovery_tickets`: hashed short-lived confirmation capability, source/target player binding, recovery-verifier binding and expiry.
- `company_rate_limits`: persistent 15-minute attempt counters by player and hashed client IP.

Migration runs in BEGIN IMMEDIATE / COMMIT with foreign-key enforcement. It is repeatable at startup without issuing new identities. Missing/expired/revoked credentials receive an error rather than silently replacing an existing base. Sessions renew after a day of use; cookies remain HttpOnly, SameSite=Strict and Secure in production.

All progression mutations now include an expected public company ID in `X-Company-ID`, checked against the authenticated session. This header is an identity-switch guard, not authentication. Old pre-update tabs must reload before making changes. New tabs retain the same identity; deliberate recovery switches cause existing tabs to stop and request reload. Reset Progress keeps the company identity, claimed name and recovery code while resetting only the same foundation gameplay as before.

## Recovery credentials

Codes contain 160 bits from Node crypto.randomBytes, formatted as AIR plus five hexadecimal groups. Only a SHA-256 verifier is stored. Codes are shown only in the generation response and in the open UI; no localStorage, IndexedDB, URL, request logging or public-profile exposure. Copy uses Clipboard API on supported secure origins, with manual selection fallback on local HTTP.

Replacing a code requires confirmation, invalidates the previous code and invalidates outstanding confirmation tickets bound to the previous verifier. Lost generation responses cannot retrieve the original plaintext: generate a replacement and save it.

Recovery is two-phase: verify the code, preview the target company, then explicitly confirm. Tickets have 256-bit random secrets, five-minute expiry and are single-use. A successful recovery creates a new session for the original player/save and invalidates that target company's previous sessions. It does not clone, merge, reset or delete either company. A different guest base stays saved; UI offers securing it first. Existing title-screen bootstrap may already have initialized an unnamed guest on a new browser; recovery never duplicates the recovered base.

Recovery verification is limited to 8 attempts per player/IP fallback per 15 minutes, plus a 120-attempt IP ceiling. Code generation is limited to 6 per player per 15 minutes; naming to 12; confirmation to 12. Counters persist in SQLite. Origin checks, JSON content type and expected-company guards protect mutations. Cookies are sent only after successful transaction commit. Deployment uses one trusted Railway edge proxy for client-IP interpretation; verify this topology before changing hosting. Rate limits are a V1 abuse control, not a replacement for infrastructure-level flood protection.

## Verified backup and tests

Git checkpoint: `checkpoint/pre-company-identity-v1`.

Consistent SQLite backups created before implementation under ignored local folder:
`data/backups/pre-identity-20261017-094856/`

Backed up integrated-game.sqlite, ava-preview.sqlite and scrap-bot-preview.sqlite using SQLite's backup API. Each passed integrity_check and row-by-row comparison. Then copies of all three backups were migrated twice: every pre-existing table row stayed unchanged and integrity_check remained OK. Original files were not migrated or overwritten by this work.

167 automated tests pass. Five identity integration tests cover rich legacy migration, case-insensitive concurrent name claims/database constraint, invalid names, same-base recovery, separate companies, secret non-exposure, old-code invalidation, stale confirmation rejection, rate limits, origin guards, stale-tab guards, expiry and real SQLite reopen recovery. Existing gameplay, duplicate-reward, training, layout, rotation and Ava tests pass. Production build and isolated startup/restart persistence smoke pass.

Silent Chrome touch emulation verified Ava naming and personalized welcome, refresh halfway through, actual GPU construction and first collection, profile, code generation/copy fallback, separate-browser recovery, 320×568 and 390×844 layouts, a 390×430 keyboard-like viewport, persistent postponement, second-tab identity stability and blocking a stale tab after deliberate recovery. Browsers/contexts closed after verification. Screenshots contain no recovery code.

## Local iPhone testing

Preview: http://192.168.1.40:3015/ (desktop: http://localhost:3015/).

The running server uses only `data/identity-preview.sqlite`. Cookies are shared across ports on one hostname: use a Private Safari session for this isolated LAN test if you already have another local AI Race company on that IP. Do not clear your normal Safari website data or reset a production company.

1. Open the LAN link, tap PLAY, advance Ava twice and claim an unused company name.
2. Build and collect from the GPU Rig normally.
3. Open Settings → Company / Recovery, generate a code and save it privately. On HTTP LAN, press-and-hold/select the code if Copy cannot use the secure Clipboard API.
4. Close the isolated private session and open a new one, or use another browser/device on the same Wi-Fi. Choose Recover Company from the title screen.
5. Enter the code, review the target and confirm. Verify the same name, base, Compute, buildings and tutorial state.
6. Generate a replacement code and verify the old one no longer works. Save the new code.
7. Test an unnamed returning guest's Maybe later option and simultaneous tabs.

Actual iPhone Safari/Android hardware and HTTPS-installed PWA testing remain pending. HTTP Home Screen shortcuts are not proof of standalone HTTPS behavior. Fullscreen CSS, viewport/Apple metadata and manifest are unchanged. No public HTTPS tunnel was opened for this local-only task.

## Limits and release checklist

- Players must save their code before losing browser access. If both session and code are lost, V1 has no ownership recovery by company name, email or support identity.
- The code is a bearer secret: anyone possessing it can recover the company. Keep it out of screenshots, analytics, support messages and logs. Recovery signs out target sessions on other devices; users can intentionally recover again with the current code.
- No email, passkey, automatic local recovery cache, offline progression command queue, Influence or leaderboard is added.
- Recovery cannot resurrect a deleted database. Verify production GAME_DB_PATH points into the mounted volume, configure consistent external backups and perform a restore drill before public release. This implementation does not change production infrastructure or backup policy.
- Before any approved deployment, take a fresh consistent production backup, validate the migration against its isolated copy, verify HTTPS cookie/clipboard behavior and physically test iPhone Safari/PWA and Android Chrome. No production save migration has been executed yet.
