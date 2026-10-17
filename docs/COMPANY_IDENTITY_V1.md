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

Migration runs in BEGIN IMMEDIATE / COMMIT with foreign-key enforcement. It is repeatable at startup without issuing new identities. Existing invalid/expired/revoked credentials receive an error rather than silently replacing an existing base. Sessions renew after a day of use; cookies remain HttpOnly, SameSite=Strict and Secure in production.

All progression mutations now include an expected public company ID in `X-Company-ID`, checked against the authenticated session. This header is an identity-switch guard, not authentication. Old pre-update tabs must reload before making changes. New tabs retain the same identity; deliberate recovery switches cause existing tabs to stop and request reload. Reset Progress keeps the company identity, claimed name and recovery code while resetting only the same foundation gameplay as before.

## Recovery credentials

New codes use XXXX-XXXX-XXXX: 12 independently sampled base32 symbols from Node crypto.randomBytes (60 bits), excluding 0, 1, I and O. Lowercase, whitespace and hyphens normalize conveniently. Only an scrypt verifier is stored (N=32768, r=8, p=1, 32-byte output, versioned s1 prefix); there is no fast short-code lookup hash. The public context salt permits indexed verifier lookup; it is not a secret pepper or per-player salt. Asynchronous derivation has a bounded queue of 16, and recovery rate limits run before derivation. Existing 160-bit AIR long codes retain their original SHA-256 verifiers and remain valid until the owner explicitly replaces them. No credential or schema migration is needed for this format change. Codes are shown only in the generation response and in the open UI; no localStorage, IndexedDB, URL, request logging or public-profile exposure. Copy uses Clipboard API on supported secure origins, with manual selection fallback on local HTTP.

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

## Local session compatibility fix

The initial identity preview used a separate database on port 3015 but the same cookie name as earlier LAN previews. Cookies are scoped to host/path, not port. Measured before the fix: identity-preview.sqlite had eight bases, eight mapped identities, zero unmapped bases, zero expired stored sessions, and passed integrity_check. The separate ava-preview.sqlite had 21 earlier bases absent from this preview; integrated-game.sqlite and scrap-bot-preview.sqlite also held separate earlier bases. An unknown cookie was incorrectly reported as expired. Physical iPhone cookie contents were not inspected; isolated tests reproduced the exact cross-database failure.

Start the local preview with `npm run preview:identity` after a production build. This uses data/identity-preview.sqlite, port 3015 and a dedicated airace_identity_preview_session cookie. It leaves the original shared cookie unchanged. If the dedicated cookie is absent, an old shared cookie is accepted only if it already authenticates locally or securely matches a base/session in the launcher's explicit read-only list of earlier project databases. A verified legacy base, Ava progress, action receipts and any existing identity metadata are copied transactionally to the isolated preview, without overwriting any record or changing the source. This is an independent preview copy: subsequent changes are not synchronized back to older previews. Ambiguous matches, conflicts and revoked credentials fail closed. Production disables this local bridge and ignores the preview environment settings.

Migration version 2 repairs only foundation rows with no identity mapping (for example, a row written by an older app after version 1). Existing identities and revoked sessions are never recreated. The preview cookie takes precedence, so an invalid dedicated cookie cannot silently switch to a different company through the shared cookie.

API startup errors now distinguish SESSION_EXPIRED, SESSION_INVALID, SESSION_UNRECOGNIZED, SESSION_RESTORE_UNAVAILABLE and BACKEND_UNAVAILABLE. Connection failures have a separate retry path. Unverified sessions do not silently create replacement bases. A clearly warned, explicitly confirmed Start a separate company option creates a new base without deleting or reassigning the old one; it refuses to replace a currently authenticated company.

Backups before this patch: data/backups/pre-session-fix-20261017-102006/. All four relevant local databases passed backup integrity checks. Tests use separate disposable databases. 172 tests pass, production build and production smoke pass. Mobile-sized Chrome tests cover old-cookie upgrade to PLAY/Ava with buildings/bots/resources/tutorial intact, genuinely new players, malformed and expired credentials, recovery to the same company, explicit separate-company confirmation, connection interruption/retry, refresh and real browser/server restarts. A previously timing-sensitive concurrency test now retries whichever purchase actually won instead of assuming network order. No gameplay rule changed.

For your current iPhone, reload http://192.168.1.40:3015/ in the same Safari tab without clearing cookies or starting a separate company. Your old cookie provides the proof for local restoration; no previously nonexistent recovery code is required for a verified legacy session. If still unrecognized, keep the cookie and report the exact new message. Actual physical iPhone confirmation remains pending; no push or deployment was performed.


## Ava naming and short-code polish (current local version)

Checkpoint: `checkpoint/pre-ava-naming-short-codes` at 3af31fb. Consistent verified preview backup: `data/backups/pre-ava-naming-20261017-104331.sqlite` (ignored by Git).

PLAY goes directly into HQ and Ava. Her second introduction sets the 2028 premise, and her third dialogue contains the company-name form with Confirm and Maybe later. Taken-name suggestions and validation errors stay inside that speech bubble. A successful claim is saved immediately and acknowledged by name before the original GPU Rig tutorial continues. The full Company panel opens only when requested from Settings. Existing unnamed players receive a naming-only Ava invitation without mutating their saved tutorial state; named players are not asked again. Skip and Maybe later leave naming available in Settings.

Settings > Company / Recovery shows name, level, a short recovery explanation and generation/replacement controls. Codes are visible only immediately after generation. Recovery still requires explicit confirmation of the target company, protecting a different guest base. A non-secret, one-use URL hash requests opening HQ after the authenticated recovery reload; it contains no identity or credential and cannot authenticate access. The server session is verified before entering HQ. A normal reopening still uses the unchanged studio intro and title screen.

Validation: all 174 automated tests, production build and isolated production startup/restart smoke pass, including concurrent short-code generation (one succeeds, one safely conflicts). The restarted preview responds with HTTP 200 through 192.168.1.40:3015 and binds 0.0.0.0. Before restart, all nine foundation saves, nine Ava records, nine identity rows and ten session rows matched the checkpoint backup exactly; SQLite integrity_check passed. Silent Chrome touch-emulation tests passed fresh PLAY > Ava > naming (taken/invalid feedback) > refresh > GPU placement > normal construction > first collection > tutorial completion. They also passed existing named and unnamed flows, exact legacy save/tutorial preservation, Skip > Settings naming, normalized short recovery and legacy long recovery into HQ, and refresh afterward. Layout checks cover 320x568, 390x844, 430x932 and a keyboard-like 390x430 viewport. Automated browser contexts are closed in finally blocks; screenshots contain no recovery credentials. Actual physical iPhone keyboard, Safari and HTTPS-installed PWA confirmation remains pending. No fullscreen, manifest, art, economy or gameplay files changed.

Preview: http://192.168.1.40:3015/. Use a separate Private Safari session for a fresh tutorial test, without clearing existing website data. In your normal local session, current progress is retained. Generate and privately save a code from Settings; use Recover Company in a separate browser/session to test restoration. Local HTTP may require press-and-hold copying instead of the secure Clipboard API. This preview has its own development database and cookie namespace; it does not access Railway or production saves.

## Approved production release safeguard

On the first production startup with legacy foundation saves and no applied identity migration, startup creates a consistent VACUUM INTO snapshot under the existing database directory `backups/pre-company-identity-<timestamp>-<uuid>.sqlite`, checks its integrity, then runs the additive identity migration. It includes committed WAL data. Backup errors stop startup before migration; a successfully migrated database skips this step on later boots. A regression test migrates a snapshot containing resources, bots, Ava and action receipts and checks that existing records remain exact. This snapshot stays private on the existing volume and is not an off-site disaster-recovery backup. Railway settings, volume mounts and GAME_DB_PATH are unchanged.
