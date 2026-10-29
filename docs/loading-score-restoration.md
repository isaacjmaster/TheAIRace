# Loading layout and score restoration

The existing loading artwork and wordmark are unchanged. The page/Safari background now matches the artwork's navy bottom, and progress, Loading and Recover Company form one bottom stack with safe-area padding. Removed the redundant Opening your HQ status row. The recovery action remains accessible and loading readiness is unchanged.

At startup, after the Influence schema and existing development migration, influence-v1 runs under BEGIN IMMEDIATE. Every existing company receives max(saved Influence, saved Infiltration Rating). This restores old progress without reducing a higher rating already earned; values are not added together. Influence itself, battle history, cooldowns, saves and resources are unchanged. Audit rows record company, original Influence, prior Rating, restored Rating and timestamp. A completion marker commits atomically with updates. Failure rolls everything back. Later restarts do not rebase scores or undo losses; future accounts begin at zero. Existing authoritative profile/HUD/leaderboard readers immediately use restored values and derive their ranks from the same thresholds.

Production takes a separately versioned, integrity-checked pre-influence-rating-v1 SQLite backup on the persistent volume before migration. A missing/invalid required backup fails startup rather than risking data. The old backup is not overwritten.

Validation: 834 automated tests passed, production build and isolated production startup passed. Actual browser checks at 1440x900, 390x844, 430x932 and 375x812 cover full viewport bounds, dark page paint, bottom positioning, recovery opening/closing after rotation and unchanged audio preferences. Tests use isolated databases and silent previews. No physical iPhone testing.

Files: server/rating-restoration.ts, infiltration-rating.ts, rating-backup.ts, index.ts; src/ui/FoundationApp.tsx, title-screen.css, viewport.ts; tests/rating-restoration.test.ts, mobile.test.ts; scripts/review-loading-full-app.ts.
