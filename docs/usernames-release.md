# Username identity and organic cloud reveal

## Identity migration

Identity migration 3 adds `player_usernames`, keyed by the existing permanent `company_players.id`. No legacy company names are converted. Old name/name_key columns remain unused for compatibility; profile, HUD, recovery and leaderboard displays never fall back to them. Existing accounts receive a compact Choose Username screen. Foundation save JSON, Ava state, XP, Influence rows, recovery hashes and sessions remain untouched.

On the first production upgrade, startup creates and integrity-checks a consistent pre-usernames SQLite snapshot under the existing persistent volume's backups directory before registering the migration. A migration test runs against a verified copy of representative legacy save data, compares progression/identity tables byte-for-byte, then tests reopening and recovery. No destructive experiments are run against production.

Accounts without a username are omitted from public named rankings until selection; their Influence records and permanent IDs remain intact. Leaderboard scores still join permanent IDs. Equal scores use stable creation-time/ID ordering, so renaming does not change tie order. Public rows expose no permanent IDs or recovery secrets. Compatibility response fields called `name` contain only usernames, never legacy labels.

## Rules and cooldown

3–16 ASCII letters, digits or underscores; outer whitespace trimmed; display capitalization preserved. SQLite NOCASE UNIQUE and CHECK constraints back server validation and reserved-name protection. BEGIN IMMEDIATE serializes initial claims and changes. Initial selection has NULL changed_at, so the first rename is immediately available. Successful renames store server time; next rename is available exactly 1,209,600,000 ms later. Failed and same-name/case-only submissions do not change timestamps. Case-only retries preserve existing capitalization. A renamed-away username becomes available immediately.

Settings uses server time plus a monotonic browser timer for its countdown. Server validation is authoritative even if the device clock changes. The decorative gray hashtag is a separate element and never stored. Existing recovery codes restore the same username and cooldown.

## Validation

351 automated tests pass, including concurrent claims/renames, exact cooldown boundary, invalid and reserved values, database constraints, verified-copy migration, restart, recovery, score identity, old endpoint retirement, cloud composition and onboarding presentation. Production build and isolated production smoke test pass. Existing large-chunk build warning remains.

Chrome checks cover 390×844 portrait, 844×390 landscape, 1440×900 desktop and 900×700 narrow desktop. WebKit checks cover iPhone dimensions, standalone-mode simulation, forms, cooldown, refresh, cloud-only UI and reduced motion. These are desktop-host browser checks, not physical iPhone/PWA testing or device performance measurements.

## Local review

Run `node --import tsx scripts/preview-usernames.ts`. On the same Wi-Fi, open `http://192.168.1.40:3056/?testAudio=off`. `/opening-preview/fresh?testAudio=off` creates an isolated new company for the intro; `/opening-preview/migration?testAudio=off` shows first username selection; `/opening-preview/company?testAudio=off` shows an established test company. These routes use only data/username-preview.sqlite, never production data. Preview fixtures are local-only and refuse production mode.

On a physical iPhone, verify the reveal, keyboard input, portrait/landscape safe areas and installed-PWA rendering. Established production companies should be asked for a fresh username without replaying completed onboarding or losing progress. Do not reset a real company just to preview the cinematic.
