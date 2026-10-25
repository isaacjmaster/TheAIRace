# Building grid rollout

Placement uses one-world-unit cells with integer edges. Odd-sized footprints have half-integer centers. Logical placement footprints are separate from existing physical navigation shapes. Client previews and authoritative validation share the same snapping and dimensions. New walls occupy one tile and connect by cardinal adjacency; row moves are validated atomically.

Existing walls retain their original geometry and coordinates until moved or rearranged. Accounts exceeding 100 walls receive an inventory of exactly 100 replacement segments. Their existing defensive layout remains saved until a complete valid layout commits. Matchmaking excludes these accounts while rebuilding, and they cannot initiate PvP during protection. No resource refund or charge is involved. Acknowledgment is stored per account.

## Safety and recovery

Production startup creates a SQLite backup in the database volume's `backups/pre-building-grid-*.sqlite` before migration. Integrity and company count are checked; failure prevents startup. The migration transaction stores each original save verbatim in `building_update_snapshots` and verifies it before changing the live record. Migration is idempotent. Layout commits require all owned items and a matching inventory fingerprint; invalid or stale submissions leave the saved layout untouched.

For rollback, stop writes and preserve a new copy of the current database first. Compare affected records with their immutable snapshots. Restore only the intended layout/update fields through a reviewed transactional recovery, keeping subsequent resources, timers, account identity and progression. A whole-database restore is appropriate only for immediate disaster recovery with an explicitly accepted loss of post-backup writes; do not blindly restore an old database after play has resumed. Roll back the application and data format together if restoring pre-update wall geometry.

## Verification

555 automated tests pass, including real SQLite migrations of 0/50/100/150/200-wall accounts, backup integrity, migration idempotency, exact replacement counts, progression preservation, atomic layout validation, new-grid HTTP placement, announcement acknowledgment, and existing combat/navigation regressions. Production build passes with the existing large-bundle advisory.

Desktop and 390×844 touch-enabled viewport checks exercise wall placement through the server, unchanged 10-Compute cost, Remove All inventory, and cancellation preserving saved walls. Visual artifacts are saved separately under `output/Building_Grid_Review`. These are browser viewport checks, not physical iPhone verification.
