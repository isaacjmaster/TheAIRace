# Breacher playable troop

Breacher unlocks at Founder HQ level 2. Its native stylized model is shared by training portraits, deployment cards, the hangar and combat. Navy/ivory armor, a cyan visor and an oversized orange gauntlet distinguish it from Pulsewheel. Walk, anticipation, strike, recoil, hit, deployment and defeat poses run on the existing rendering loop. Bounded shared impact effects and procedural sound cues use existing audio preferences and voice limits.

## Starting values

| Property | Value |
| --- | --- |
| Housing | 5 |
| Training cost | 40 Compute |
| Base training time | 30 seconds |
| HP | 320 |
| Strike damage | 60 |
| Strike interval | 1.8 seconds |
| Movement speed | 1.5 world units/second |
| Range | 1.3 world units from target surface |
| Preference | Defenses, then other valid structures |
| Limitation | Cannot attack aircraft |

Existing training-efficiency research applies. Pulsewheel-specific damage research does not boost Breacher. NPC mission hacking retains its existing progress normalization; PvP applies authoritative HP damage. Presentation never determines damage or completion.

## Army and compatibility

The hangar supports 20 housing: Pulsewheel costs 1, Breacher costs 5. Examples include 10 Pulsewheels + 2 Breachers, 20 Pulsewheels, or 4 Breachers. Ready stock, queued troops and deployed reservations count toward capacity. One sequential queue trains both types; a request trains at most 10 units and is constrained by housing and resources.

Legacy bot counts and queue timestamps retain their meaning. Missing troop IDs mean Pulsewheel. Optional Breacher stock and parallel queue kinds extend existing saved JSON without a database migration. Deployment snapshots cannot gain troops from training completed during a mission. Accepted deployments consume the correct stock; survivors return once by type. Legacy operations without squad support reject Breacher deployment. No production account records are rewritten for this release.

## Validation

- Full suite: 590 tests passed, including mixed training, save compatibility, housing, deployment rejection, survivor return, wall reach, defense preference and deterministic combat.
- Production TypeScript/Vite build passed. Existing large-bundle warning remains.
- Desktop and 390 × 844 mobile viewport checks: training, reload persistence, completion, mixed hangar and troop selection; no browser errors.
- Five handcrafted missions and a synthetic player-base fixture benchmarked at equal housing. Mixed 10+2 armies won all fixtures. Four Breachers lost Prism, Orbit and Apex, reflecting their slow movement and inability to attack aircraft. Twenty Pulsewheels cleared these deterministic fixtures faster than the mixed army.
- Apex rendering harness, 10 Pulsewheels + 2 Breachers: approximately 75 FPS on the Windows test host. Worst sampled frame: 26.5 ms desktop, 19.6 ms phone viewport. This excludes React HUD/network and is not a before/after comparison or physical iPhone result.
- Silent visual review, actual-event animation clips and raw results are generated in `output/Breacher_Review/index.html` by the review scripts. Browser contexts and local preview servers are closed after testing.

## Follow-up balance monitoring

Monitor actual mixed-army usage, survival and win rates before increasing damage or durability. Pay particular attention to the newly available 20-Pulsewheel composition and Breacher performance against aerial defenders. Deterministic fixtures are a first balance check, not proof of competitive PvP balance. Physical iPhone testing remains outstanding.
