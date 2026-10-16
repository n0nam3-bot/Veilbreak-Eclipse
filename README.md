# Veilbreak: Eclipse — playable vertical slice

An original, browser-native 2.5D fighting-game prototype. It is deliberately self-contained for GitHub Pages: the game loop and fighter illustrations are drawn in Canvas, so local play does not need a build step, paid assets, a framework download, or an external game server.

> **Scope and rating:** The 18+ label communicates the intended audience, not an official ESRB/PEGI classification. A formal release needs a rating submission and accurate content disclosures. This is a functional prototype, not a completed commercial fighting game. Kagura now uses the character sheets supplied for this project; four additional adult-woman roster entries still use procedural placeholder art. Character polish, separately layered armor artwork, sound design, balance, accessibility, and online rollback netcode need further production passes. It does not copy another game's characters, artwork, animations, or sound files.

## Play locally

Open `index.html` in a current desktop browser, or publish the repository root using GitHub Pages. For the most consistent experience, serve it from localhost or an HTTPS site. No `dist` directory or build action is needed.

### Kagura character integration

Kagura is now the default Player 1 fighter and is selectable in the main-fighter dropdown. Her supplied portrait appears in the selection UI, and her provided sprite sheets drive idle, walk, dash, jump, twin-stab, and blade-flurry animations in the match renderer. See `assets/characters/kagura/README.md` for the sheet layout and current limitations.

The other roster entries still use the original procedural placeholder renderer. Kagura’s provided animation images are flattened; faithful layer-by-layer armor removal requires matching separate armor and underlying costume artwork. The existing armor meter/combat behavior is preserved, but this visual layer separation is not claimed as complete.

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | `A` / `D` | `←` / `→` |
| Jump / crouch | `W` / `S` | `↑` / `↓` |
| Move through depth | `E` / `Q` | `U` / `O` or numpad `9` / `7` |
| Light / heavy / special | `F` / `G` / `H` | Numpad `1` / `2` / `3` (or `1` / `2` / `3`) |
| Partner assist | `R` | Numpad `0` (or `0`) |
| Dash / guard | `X` / `C` | Numpad decimal / right `Ctrl` |
| Gamepad (standard layout) | Face buttons for light/heavy/special/assist; LB for dash; RB for guard; triggers for depth | Same mapping on a second pad |
| Pause | `Esc` | `Esc` |

Standard Gamepad API mappings are included. On small screens or touch devices, on-screen movement and attack buttons appear during a match. Local versus supports two keyboards/controllers and simultaneous touch zones when the device is wide enough.

## Current mechanics

- **Cancel-first controls:** pressing a different attack can interrupt attack recovery, and dash is allowed to cancel an attack immediately. Movement remains active during attack animations instead of pinning the fighter to the floor.
- **Combo strings:** light, heavy, and special attacks can chain into one another; hits add a combo counter and hit-stun. Attack startup, timing, range, damage, knockback, and armor damage are individual move values in `src/game.js`.
- **Partner assist:** each fighter selects a different partner. Assist has a cooldown and briefly calls in the partner for one strike.
- **Layered armor HP:** armor has seven segments. Breaking thresholds and hit effects are implemented. The procedural placeholder fighters visually remove their drawn shoulder, chest, waist, or thigh plates. Kagura’s supplied sheets are flattened, so her armor meter changes correctly but matching separate armor/under-suit images are needed before individual pieces can be removed cleanly from her sprite art.
- **Readable impacts:** slash/ring effects, sparks, hit-stop-like camera shake, damage text, a segmented armor bar, and armor-break callouts are present. The announcer uses browser speech synthesis with a low-pitch setting, so its voice depends on voices installed by the player's operating system/browser.
- **Training mode:** Player One fights a lightweight CPU opponent. Local Versus is same-device, two-player play.

## Online mode (experimental)

The browser uses PeerJS from a public CDN to broker a direct WebRTC data connection. One player chooses **Create Room** and shares the room code; the other chooses **Join** and enters it. Host simulation is authoritative and distributes input/snapshots to the guest.

Online play requires an internet connection and a functioning public signaling broker/STUN route. This is not rollback netcode, does not use a dedicated relay/TURN service, and is not guaranteed to connect across every NAT, network, or browser. If the CDN or public signaling service is unavailable, Local Versus and Training still work.

## GitHub Pages

1. Upload the contents of this project to the repository root (keep `index.html`, `src/`, and `assets/` together).
2. In **Settings → Pages**, select the branch and `/ (root)` as the source, or use an existing Pages workflow that publishes the root.
3. Visit the HTTPS Pages URL. No secrets, environment variables, API keys, or backend deployment are required for local play.

## Desktop / Steam packaging path

The project includes an Electron wrapper. With Node.js installed, from the project folder:

```bash
npm install
npm start
npm run package:win
```

The Windows packaging command outputs an installer and portable build under `release/`. Build on Windows for the most reliable Windows package. Electron lets the browser game run as a desktop app and supports compatible gamepads.

**Steam is not integrated yet.** You still need a Steamworks partner account/app configuration, a package that meets Steam's current upload requirements, store assets, age-rating/content disclosures, testing, and a SteamPipe upload. Steam achievements, invites, overlays, cloud saves, and native Steam Input integration are not implemented by this wrapper. The online mode remains WebRTC-based.

## Files

- `index.html` — menu, fighter selection, online room UI, pause/result screens, touch controls.
- `src/style.css` — responsive visual system and mobile layout.
- `src/game.js` — rendering, character definitions, gameplay loop, controls, armor, combo/assist systems, and optional peer-to-peer networking.
- `assets/icon.svg` — original project icon.
- `assets/characters/kagura/` — Kagura portrait, animation sheets, and asset notes.
- `electron/main.cjs` — desktop wrapper entry point.
- `package.json` — Electron packaging setup.

## Validation

Run `npm run check` to syntax-check the JavaScript files. The main game can also be launched by opening `index.html` or serving this folder with any static HTTP server.
