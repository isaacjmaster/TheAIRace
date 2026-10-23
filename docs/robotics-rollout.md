# Robotics redesign rollout

The new Fabricator keeps its 4 x 3 footprint. New Hangars use an 8 x 7 footprint (7 x 8 when rotated). Existing saves remain on the legacy presentation until the explicit migration runs. No startup migration or public migration endpoint exists.

## Before production

1. Review local desktop/mobile captures and the isolated migration tests. Physical iPhone performance still needs verification.
2. Deploy the compatible server and client together. Keep all replicas on this version before migrating. Do not run the command against an old server; it does not understand unplaced buildings.
3. In a maintenance window, pause player writes, then dry-run the migration against the existing GAME_DB_PATH. Inspect expanded/unplaced counts. Never replace or delete the volume.
4. Apply only after reviewing the dry run. The command verifies a complete private SQLite backup before its transaction; it aborts if a candidate save changed during preflight. Repeating a successful run does not change saves again.
5. Verify the report, reload the client, and resume writes. Keep the verified backup private. Do not blindly restore it after players resume; that would erase later progress.

## Commands

From the source checkout with GAME_DB_PATH explicitly pointing to the intended database:

```powershell
node --import tsx scripts/migrate-hangar-redesign.ts
node --import tsx scripts/migrate-hangar-redesign.ts --apply
```

The runtime image includes server/hangar-redesign.ts but not scripts. From its trusted console, use the same exported migrateHangars(DatabaseSync, apply) function: false is dry-run, true applies. Do not add it to server startup.

## What migration preserves

The original Hangar slot identity, construction timestamps and any extra owned-building fields survive. Existing completed Hangars are instantly replaceable; unfinished construction retains its original deadline. Capacity, troop inventory, queued fabrication, research, resources and other buildings are untouched. Permanent construction Influence receipts remain intact; placing an owned Hangar creates no new building or reward.

Crowded Hangars retain their old coordinate only as historical data, with unplaced=true. Layout queries omit them from collisions, scouting and selection. Ownership queries retain them for housing and training. The notice is acknowledged server-side; Build > Robotics remains available if the player chooses Later or cancels placement.

Rollback must use a compatible server that understands compound/unplaced states. Do not deploy an older binary over migrated saves.
