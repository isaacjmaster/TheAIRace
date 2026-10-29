# Competitive UI and loading polish

Infiltration Rating is the sole competitive leaderboard value. Influence balances and noncompetitive progression rewards remain intact; no score conversion, reset, or account migration occurs. Removed the misleading Influence-derived global rank from public profiles. Rating thresholds, PvP settlement, and cooldowns are unchanged.

HUD badges are inset within the card. Seven leagues share a horizontal stepped ladder; selecting a badge exposes a readable name, range, and description. Normal mobile portrait fits all seven badges. Small labels supplement the accessible button names and larger detail panel.

Loading artwork: public/art/loading-campus-v2.webp, generated with the built-in image generation tool. Prompt: polished portrait stylized sci-fi campus hero scene, cream/navy/gold HQ and cyan reactor, fortified walls, cyan cannon, GPU rig, purple research building, Breacher and wheel robots, security drones, teal city, clear top for live branding and dark bottom for live progress controls; no baked text or UI. Original output retained outside the repo. Live branding, loading progress, recovery and audio controls remain independent.

Validation: 831 automated tests passed, production build passed (existing large bundle warning), production startup smoke passed. Isolated actual application walkthroughs at 390x844 and 1440x900 checked badge containment, seven-column bounds, rank selection, leaderboard/profile navigation, authoritative promotion and loss results. Loading walkthrough checked recovery, resize, audio accessibility and unchanged mute preferences. No physical iPhone or human multiplayer validation claimed.

Screenshots: output/Competitive_Polish and output/Loading_Reliability. No production data modified.
