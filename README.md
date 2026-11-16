# Stronghold Architect — Candlelit Citadel

Static browser game, split from the latest single-file version. No build step or package installation is required.

## Files

- `index.html` — entry point, interface, theme styling, world clock, saves, resume popup and map gestures.
- `characters.js` — MC, castle servants, invaders, collection/delivery, movement and combat.
- `rooms.js` — room and hall definitions, doorway rules, construction, traps, resource rates and upgrades.
- `assets/characters/` — character map sprites and combat pose atlases.
- `assets/rooms/` — the 20 room/hall tile images.
- `assets/ui/` — Candlelit Citadel stone, heraldry, candle/banner artwork and panel textures.
- `asset-manifest.json` — SHA-256 checksums for the extracted artwork.

Keep the folder structure intact. Upload all files and the entire `assets` folder, not just `index.html`. Open `index.html` or serve the repository as a static website. Script order is `rooms.js`, then `characters.js`, then the inline game initialization in `index.html`.

## Existing progress

The save key and save format are unchanged. Browser saves belong to their original site/browser location. Before moving to a different site or local file location, use **Export save** in the old game, then **Import save** in this version. Saved progress is never uploaded to the repository.

## Controls

- Click **Resume** when opening or returning to the game.
- Select a green **+** to build.
- Wheel or pinch to zoom.
- Double-tap/click and hold the second press to drag the map.
- A quick double-tap/click opens room details.
- Combat actions require one click. Energy costs and turn rules are unchanged.

## Editing

Game images are separate files instead of large embedded base64 strings. Paths in JavaScript and CSS are relative to `index.html`. This keeps code changes small and makes individual images replaceable. Do not rename an image without updating its reference.

The split preserves the latest gameplay, artwork, movement speeds, pause behavior, combat and upgrade rules. No external CDNs, APIs, fonts or runtime libraries are required.
