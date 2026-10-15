# Operations — choose, collect, return

Open **Operations**, choose a colored destination, and tap **Start**. Pixel walks and gathers automatically. The objective is: **Collect resources to upgrade your AI company.** Contracts remain under Missions and cannot overlap an outing.

## Three choices, one decision

- **Safe — Scrap:** nearby common resources with low risk. Each recovery gives3scrap.
- **Medium — Energy cells:** farther from home, near moving patrols. Each recovery gives1cell needed for the Recovery Rig.
- **Dangerous — GPU parts:** rare resources in the eastern sector, with more exposure to patrols. Requires the existing Recovery Rig; each recovery gives2GPU.

After each recovery, the world pauses automatically. Tap **Continue** for another recovery, tap another destination to change location, or tap **Return to HQ** to bank everything. Return also works while paused, with no separate resume step. The rewards screen confirms what was banked, then **Back to HQ** returns to your garage. Cargo is not spendable until banked.

Pixel handles routes and battery reserves. Safe/Medium avoid predicted patrol positions; Dangerous accepts direct routes with more exposure. Return always uses safe routing. Movement costs1battery, collection costs2, and patrol interference costs3extra. Resource yields and existing upgrade costs are unchanged. Cargo limits or low battery can trigger automatic return. Empty battery outside the dock offers a confirmed **Rescue**, retaining the existing half-cargo rule rounded down. At the dock, all cargo can still be banked with an empty battery.

Opening inventory, leaving Operations, or hiding the browser pauses an active outing. Reloading retains position, cargo, battery, destination, and depleted caches. Tap Continue or Return when ready. Long network inactivity also pauses without offline losses. Technical orders and risk controls remain in the engine for compatibility, but are absent from the player interface.

## Progression and preservation

For the first upgrade: collect Safe twice, choose Medium and collect twice, then Return. Install the **Recovery Rig** under Upgrades for **6scrap+2cells**. Battery26→40, cargo12→20, GPU access, and visible HQ equipment retain their existing behavior. No credits are spent.

Banked resources, company, contracts, onboarding, and hardware saves are preserved without a database migration. Both previous autonomous outings and older manual outings open in the simplified interface. Continue or a destination selection adopts the new gathering flow while retaining cargo, battery, position, depleted deposits, and the original layout. Return can recover the saved outing directly. Adoption changes old manual movement to the current autonomous patrol simulation; it does not grant resources or reset progress. The previous Git checkpoint remains untouched. Git excludes local SQLite saves; stop the server and back up `data/` separately to preserve those.

## Local launch

Stop an older server with Ctrl+C, then:

```powershell
cd C:\Users\socce\Documents\TheAIRace
npm.cmd run build
npm.cmd start
```

Open `http://localhost:3001`. For iPhone Safari, use `http://YOUR_COMPUTER_IP:3001` on the same Wi-Fi and leave the computer running. `ipconfig` shows the computer's IPv4 address. Keep the same address/browser session to retain the company cookie; do not clear website data. A fresh checkout needs `npm.cmd ci` first.

## Engine and limits

`shared/operation.ts` defines destination commands; the engine maps them to validated autonomous orders and controls all resources and outcomes. It retains the prior order/planning boundary for future work, without enabling any AI calls. The server uses its own clock, strict schemas, transactions, revisions, and deduplicated commands. Browser heartbeats request advancement while the operation is active and visible; decision pauses stop polling. Clients cannot supply rewards, time, seeds, or arbitrary movement.

This is one small7×7 operation with one agent and the existing rig upgrade. GPU currently has no new spending sink. There is no offline simulation, combat, multiplayer, payment, or deployment. Physical iPhone performance/audio and Home Screen safe areas still require device playtesting.

Next playtest questions: Can a new player start without explanation? Is Continue versus Return clear? Do the three destinations feel meaningfully different? GPU still has no additional spending sink in this slice.
