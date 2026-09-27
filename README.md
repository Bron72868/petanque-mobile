# Pétanque Champions — Mobile

A 3D pétanque game as an installable **mobile web app (PWA)**. This is a
**separate project from `PetanqueGodot`** — that one is a native Godot port
aimed at PC; this one is the original Three.js browser prototype, adapted to
run and install as an app on a phone.

Single file (`index.html`, ~4,600 lines): Three.js r128 via CDN, all
physics/rendering/UI/AI in one `<script>` block. No build step.

## What's been done vs. the raw prototype

- **Profile storage fixed.** The original used `window.storage`, an API that
  only exists inside Claude's artifact environment. It's now backed by real
  `localStorage`, so player profiles (name + stats) actually persist on a
  phone. Look for `loadProfile()`/`saveProfile()`.
- **Installable as a PWA.** Added `manifest.json`, `service-worker.js`, and
  icons (`icons/`) so a phone browser can "Add to Home Screen" and it opens
  full-screen like a native app, works offline once cached, and has a proper
  icon/splash color.
- Mobile viewport height (the classic `100vh`-taller-than-visible-area bug on
  phones with a collapsing address bar) was **already handled** in the
  prototype via a `--app-height` CSS var driven by `visualViewport` — no
  change needed there.
- **Selectable background scenery.** A "Background" picker on the setup
  screen (separate from the terrain/physics picker) swaps the decor beyond
  the boards — French Town Square, Ocean Side, City, Boulodrome (stadium
  seating + crowd), and Australia (kangaroos, gum trees, a rock outcrop).
  Purely visual: sky, fog, lighting tone, and the surrounding ground tint
  change with it, but the piste itself and its physics are untouched — that's
  still the terrain picker's job. See `SCENERY` / `applyScenery()` /
  `environmentGroup`.
- **Real 3D models for scenery** (trees, rocks, flowers, city buildings/
  skyscrapers, beach parasols) from Kenney's **Nature Kit** and **City Kit
  (Commercial)** — both CC0/public domain, no attribution required (credited
  anyway, see below). Loaded via `GLTFLoader` and cached in `MODELS` before
  the game boots (see `MODEL_MANIFEST`/`preloadModels()`). Nature-kit models
  ship with flat, oddly-metallic materials by name (`leaf`, `wood`, `rock`,
  `stone`) — `preloadModels()` fixes the metalness/roughness and applies a
  per-model recolor so each scene gets its own palette (olive-green Town
  Square trees vs. tropical-green palms vs. sage-green gum trees, etc.) from
  the *same* source models. City-kit buildings keep their own baked texture
  (`models/city/Textures/colormap.png` — **do not move the .glb files without
  it**, the texture path is relative). Kangaroos are still hand-built
  procedural geometry — no usable CC0 kangaroo model was found; Poly Pizza has
  good ones but gates downloads behind a token flow that isn't reliably
  scriptable, so this is a good candidate to revisit later if it matters.
- **Sky, fog, and clouds re-tuned.** Earlier version had the sky gradient
  barely showing blue at normal camera pitch, fog starting at 14–24m (right
  where all the new scenery sits, desaturating it toward grey), and no cloud
  layer at all. Fixed: `rebuildSky()`'s gradient reaches full blue by ~16m
  height instead of ~30m, every scene's `fogNear`/`fogFar` pushed out to
  30–40 / 85–110 so decor stays saturated, and a simple low-poly cloud layer
  (`buildClouds()`) was added with a per-scene density (`SCENERY[].cloudCount`).
  Also added a grass ground texture (`grassColorTex`) for Town Square and
  Boulodrome instead of reusing the sand texture with a green tint.
- **Fixed a real gameplay bug found while testing the above:** the default
  aiming camera's "Side" preset (`camPresetIdx` starts at `0`, i.e. Side is
  the *default* view, not an opt-in) swings the camera to a near-constant
  ~20m from the court center. Town Square's and City's buildings originally
  sat around x=±10–11.5 — close enough that the camera ended up almost inside
  one, filling the whole screen. Pushed both scenes' buildings out past
  x=±28 so the swing camera clears them. If you add more solid, wide/tall
  decor near the court in any scene, keep it either well under ~x=15 or well
  past ~x=28 from center — that ~20m band is where the default camera sits.
- **Throw guide line rebuilt.** It used to be a `THREE.Line` with
  `linewidth:2` — WebGL silently ignores line-width on almost every platform
  (Windows Chrome included), so it always rendered at 1px no matter what.
  Rebuilt as a chain of thin cylinder segments (`GUIDE_TUBE_RADIUS`, currently
  `0.02`) with a brighter, more opaque color (`GUIDE_COLOR`) so it actually
  has visible thickness and pops against any scenery.
- **Bounce physics fixed.** All three copies of the bounce formula (boule,
  jack, and `simulateThrowDistance()`'s numerical twin — keep these three in
  sync or the aim guide will lie) had a flat `-0.4` energy-loss term that
  zeroed out almost all bounce on soft terrains (restitution 0.08–0.24),
  leaving a dead thud instead of a bounce. Reduced to `-0.15` so even fine
  gravel shows a small settling bounce, scaled by how hard the terrain is.
- **Jack end-clearance, not side-clearance.** `JACK_SIDE_CLEARANCE` (checked
  the jack's distance from the long side strings) was renamed
  `JACK_END_CLEARANCE` and now checks distance from the short end boundary
  instead — the jack can land right next to the long side string, but must
  stay 0.5m clear of the far end. See `resolveJackThrow()`.
- **"Beat the opponent" range guide.** The green range-zone toggle (🎯) used
  to just show a generic "farthest reachable" rectangle even once the
  opponent already had a boule down. It now shows a circle around the jack
  sized to the opponent's current closest boule's distance — land inside it
  and you're winning. Falls back to the old rectangle only when the opponent
  has no boule down yet (nothing to beat). See `updateRangeZones()` /
  `beatZoneCircle`.
- **Offline tournaments + unlockable boule finishes.** A new "Tournaments"
  button on the title screen (`TOURNAMENTS` array) offers 3 single-elimination
  cups — Bronze/Silver/Gold, each 3 rounds against named CPU opponents of
  rising difficulty, each with its own terrain/scenery. Winning every round
  unlocks that cup's boule finish (`BOULE_SKINS`), equippable from the new
  "Boules" section on the Profile screen. Finishes are a color + metalness/
  roughness plus an optional engraved-ring pattern texture
  (`makeStriesTexture()`) — real competition boules are decorated with
  exactly this kind of banded groove ("stries"), and it happens to be the
  pattern a sphere's default (equirectangular) UV mapping can render
  correctly at any rotation, since a horizontal texture band is a fixed
  latitude, i.e. a ring around the ball, regardless of spin.
  Tournament matches reuse the normal singles match flow end-to-end
  (`startTournamentRound()` calls the same `proceedToGame()` a manual match
  uses) rather than a separate mini-mode — win/loss/advance is intercepted at
  all three places a match can end (`finishEnd()`, `handleJackGoneDead()`,
  `disqualifyTeamForMatch()`) via `state.tournament` and
  `handleTournamentMatchEnd()`. New profile fields (`unlockedSkins`,
  `selectedSkin`, `completedTournaments`) have a migration in `loadProfile()`
  for profiles saved before this existed.

## ⚠️ Gotcha: the service worker caches `index.html`

Once installed, the service worker (`service-worker.js`) serves `index.html`
**cache-first** — editing the file and reloading won't show your changes,
even in a normal (non-installed) browser tab, once it's registered once.

**Bump `CACHE_NAME` in `service-worker.js` every time you ship a change**
(e.g. `petanque-v2` → `petanque-v3`) so the old cache gets invalidated. While
actively developing, it's easier to just unregister the service worker and
clear caches in devtools (Application tab), or run this in the console:
```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

## Running it locally

There's a `.claude/launch.json` (in the sibling `PetanqueGodot` folder, since
that's this session's working directory) that serves this folder on
`http://localhost:8420` via a small PowerShell static file server
(`static-server.ps1`) — Node and a real Python weren't available on this
machine, only the Python Store-alias stub, which doesn't run.

If you have Node or Python installed later, any static server works just as
well, e.g. `npx serve .` or `python -m http.server 8420` from this folder.
A real static server (not just opening `index.html` directly via `file://`)
is required for the manifest and service worker to register.

## Testing "Add to Home Screen" on an actual phone

Service workers (and PWA installability) require a **secure context** —
`https://`, or `http://localhost` on the *same* device. A phone hitting your
PC's LAN IP over plain `http://` won't count, so `localhost:8420` only proves
the plumbing works on this machine.

To actually test install-to-home-screen on your phone, push this folder to a
free static host with HTTPS, e.g.:
- **GitHub Pages** (free, if you're OK with a public repo)
- **Netlify** or **Vercel** (free tier, drag-and-drop or CLI deploy)

Once it's live at an `https://` URL, open it on your phone and use the
browser's "Add to Home Screen" / "Install app" option.

## Path to a real native app (later)

This is structured so wrapping it with **Capacitor** later is a small step,
not a rewrite — Capacitor just wraps the same web assets (`index.html`,
`manifest.json`, icons) into a native Android/iOS shell for app store
distribution. That requires installing Android Studio (Android) and/or Xcode
on a Mac (iOS), so it's deliberately deferred until the PWA itself feels
right.

## Known gaps (carried over from the original prototype)

- **No real online multiplayer** — the "Online" button is a UI stub; tapping
  it just shows a toast. `state.currentMatchIsOnline` exists so that real
  matchmaking can be wired in later without touching stat-bucketing.
- **Boule customization** (diameter/weight) — noted as a TODO, never
  implemented.
- See the physics/rules notes below if you're touching game logic, not just
  app packaging.

## Credits

Scenery models (`models/nature/`, `models/city/`) are from **Kenney**
(https://kenney.nl) — Nature Kit and City Kit (Commercial), both CC0 /
public domain. No attribution is legally required, credited here anyway
since Kenney's work is free and excellent.

## Physics/rules notes (useful if you touch game logic)

- Boule: `BOULE_R=0.0365` (73mm), `BOULE_MASS=1.0` (700g). Jack: `JACK_R=0.015`,
  `JACK_MASS=18/700`. Full 2D spin physics on both, hand-tuned — if something
  feels "off" after a change, it's likely a sign error in the friction
  impulse, not a fundamental model problem. `simulateThrowDistance()` is a
  separate numerical re-implementation used for the aim guide — **if you
  touch the live physics, update this too or the guide line will lie.**
- **Chaos (bad bounces) is gated on proximity to an actual visible stone**
  (`stoneSizeNear`), not a bare probability roll — preserve this coupling if
  you touch terrain/visuals.
- Practice drills (`startPracticeDrill`) reuse the real match state machine
  via an early-return interception in `advanceTurn()` — grep
  `state.practiceMode` for every touchpoint before refactoring turn logic.
