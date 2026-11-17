# Stronghold Architect

Upload the contents of this folder to your GitHub repository, keeping the assets folder intact. Set GitHub Pages to serve from the repository root.

- index.html: game page and interface
- characters.js: MC, servants, invaders, combat and character movement
- rooms-halls-traps.js: room/hall definitions, tile art, traps and production upgrades
- game.js: shared game state, saving, controls and startup
- styles.css: appearance
- cards.js: the 40 playing cards (data and artwork) plus level and draw helpers
- cloud.js: optional cloud save (Google sign-in, Firestore)
- firebase-config.js: paste your Firebase web app settings here to turn cloud save on
- firestore.rules: security rules to publish in the Firebase console so each player can reach only their own save
- assets/: extracted images (previously embedded in the HTML)

Keep all files together. The game uses classic scripts so it can also be opened using index.html after extracting the ZIP. Existing saves remain available when hosted at the same address.


Cloud save setup (optional)
1. In the Firebase console create a project on the free Spark plan and add a Web app. Copy its settings into firebase-config.js.
2. Authentication: turn on the Google sign-in provider, and add your GitHub Pages address (for example yourname.github.io) under Authorized domains.
3. Firestore Database: create a database, then paste firestore.rules into its Rules tab and publish.
4. Upload the changed files. Open Settings in the game and choose Sign in with Google.
The game saves on the device as before. When signed in it also saves to the cloud about every 30 seconds, after level-ups, new days and invasions, and when you leave the tab. The newest save wins: returning to the game loads a newer cloud save from another device.
