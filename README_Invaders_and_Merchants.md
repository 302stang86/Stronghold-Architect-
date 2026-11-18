# Stronghold Architect: Invaders, Merchants, Guards and Parties

This file records the current rules and is meant to be added to later. Sections marked TESTING are not final.

## 1. Invaders (visitors who attack)

- Invaders are thieves, assassins, rogue soldiers and similar fighters. They are not tied to any stronghold on the world map.
- Current types: Guild Thief, Rogue Soldier, Hired Assassin, Bandit Marauder. (Art and stats are unchanged from the old invader types.)
- Schedule, level range (prince level -3 to +3), alarm, route through the keep, trap damage and loot are unchanged from the earlier invasion rules.
- Invaders only begin from day 3, up to two per day.

## 2. Merchants (TESTING)

- Merchants never attack and never enter the keep.
- Frequency is one quarter of the invaders. Every invader that arrives adds 0.25 merchant credit; at 1.0 a merchant arrives (one merchant for about every four invaders).
- A merchant waits until no invasion, expedition, battle or other window is open, then a window asks: "Would you like to trade?" with Yes and No.
- Yes currently opens a placeholder window: "Trading is being tested. There is nothing to buy yet."
- No sends the merchant away.
- Open items to decide later: what merchants sell or buy, prices, stock, whether merchants can be robbed or protected, merchant levels or reputation.

## 3. Guards

- Bought with gold at the Barracks (one Barracks per keep). Maximum two guards. Cost is 30 gold plus 10 for each prince level above 1. A guard is the same level as the prince.
- A guard can be posted in any room except hallways (including the Throne Room and the Entrance) from that room's window, or left roaming. One posted guard per room.
- Roaming guards walk through all rooms like servants.
- During an invasion, when an invader enters a room that holds a guard, a battle starts. This includes a roaming guard that is standing in the room, not only posted guards. The guard fights first; a servant posted in the same room fights next; in the Throne Room the prince fights last.
- At home a guard who loses is knocked out until the invasion ends, the same as servants.
- A guard who falls on a raid or attack is lost for good and must be bought again.

## 4. Raids and attacks

Requirements (player and rival strongholds):

- Attack: the prince and at least one guard must be available.
- Raid: at least one available unit (guard or servant). The prince never joins a raid.
- Rival princes need one or two guards at home before they start any raid or attack.

Party choice (the player picks before marching):

- Attack party: the prince, exactly one guard, and optionally one servant.
- Raid party: one to three units, any mix of guards and servants. The throne room stays closed to raids.
- Units on an expedition are away from the keep and do not appear on the map.
- A guard or servant who falls on an expedition is lost for good. The prince is never lost; if he falls the expedition fails.

Everything else (fog of war, loot of 10% or 20% of the rival treasury, steal resources, take over, tribute, rival world behaviour) follows README_NPC_Strongholds_Raids_and_Conquest.md.

## 5. Entrance window

Double-click the Entrance. The window shows the prince, servants and guards who are home, wandering the courtyard and talking to each other. Units on an expedition are not shown.

## Ideas parking lot

- Merchant trade offers and a trade window.
- Guard levels that differ from the prince.
- Guard orders such as patrol routes.
