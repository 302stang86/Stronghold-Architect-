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

## Backpack (Phase 2)

- Floating button at the upper left of the playing field, clear of the left ornament and the top banner. Tap it to open or close the grid. Open or closed is saved.
- Level 1: 6 spots. Level 2: 9 spots (600 gold and 150 stone). Level 3: 15 spots (2000 gold and 500 stone). Maximum level 3.
- One item per spot. Tap an item to read it, use it or discard it. Discarding gives nothing back.
- Resource bundles (Food, Stone, Mixed Crate) go straight to your stores and never take a spot.

## Merchant trading (Phase 2, still testing)

- Saying Yes at the gate opens a shop with 6 random items from the catalogue. You buy with gold. Stock is fresh for each merchant. There is no selling yet.
- Items that need a free spot cannot be bought when the backpack is full.

## Item catalogue

Numbers 5, 8, 9, 18, 19 and 29 are reserved.

| # | Item | Price (gold) | Effect |
|---|---|---|---|
| 1 | Food Bundle | 40 | +25 food |
| 2 | Timber Bundle | 35 | Backpack only, no use yet |
| 3 | Stone Shipment | 50 | +30 stone |
| 4 | Iron Ingot Crate | 70 | Backpack only, no use yet |
| 6 | Medicinal Herb Bundle | 30 | Backpack only, no use yet |
| 7 | Alchemical Ingredient Satchel | 60 | Backpack only, no use yet |
| 10 | Mixed Provision Crate | 60 | +15 food, +15 stone (wood share when wood exists) |
| 11 | Minor Health Potion | 30 | Heals 25% of maximum health |
| 12 | Greater Health Potion | 70 | Heals 50% |
| 13 | Royal Health Potion | 140 | Heals to full |
| 14 | Minor Energy Potion | 25 | +3 energy (cap 10) |
| 15 | Greater Energy Potion | 55 | +6 energy (cap 10) |
| 16 | Royal Energy Potion | 110 | +10 energy (cap 10) |
| 17 | Field Bandage Pack | 45 | On a raid or attack, between room battles: heals the weakest party member 30% |
| 20 | Strength Elixir | 80 | Prince battle: +25% damage until the battle ends |
| 21 | Ironhide Elixir | 80 | Prince battle: 6 block now and at the start of each of his turns |
| 22 | Regeneration Draught | 70 | Prince battle: heals 5% of maximum health at the start of each of the next 5 turns |
| 30 | Prince's Training Manual | 150 | Prince gains experience worth half his current level-up need |

Where items work: potions, elixirs and the draught in manual prince battles, on the prince's turn, from the Backpack row above the cards. Health potions and bandages on a march, from the Backpack row in the march window. The Manual from the backpack panel outside battle.

## Planned items (merchants do not offer them yet)

23 Sharpening Stone, 24 Armor Repair Kit, 25 Reinforced Shield, 26 Steel Sword (need equipment), 27 Lockpick Set (needs locked chests), 28 Trap Disarming Kit (needs traps in rival rooms).
