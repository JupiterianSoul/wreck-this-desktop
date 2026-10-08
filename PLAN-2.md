# Wreck This Desktop: round 2 plan

Feedback from the first real launch, turned into work. Same rules as before: milestones, each playable, tested off screen, committed one by one.

## 0. Bugs found while reading the feedback

| Problem | Cause | Fix |
|---|---|---|
| No sound, Effects slider does nothing | WebKitGTK plays WebAudio through GStreamer `autoaudiosink`, which is in `gst-plugins-good`, not installed | `sudo pacman -S gst-plugins-good`, plus a startup check that warns in the HUD if audio is unavailable |
| Walking "acid" path | Fallen windows settle as soft DEBRIS that the stickman plows through, and the anti-stuck routine carves a hole when boxed in | Settled window pieces become solid resting blocks; only small rubble stays kickable; anti-stuck pushes the player out instead of carving |
| Explosions end in a square | Explosion sprite lobes grow past their canvas | New full-resolution explosion renderer: soft round fireballs, smoke that drifts and fades, no box |
| Tab does not close the wheel, Esc does not close menus | The UI closes it, then the game's own key handler sees the same key and reopens or re-pauses | Menus swallow the key (stopImmediatePropagation) |
| Enemies spawn in Free Wreck | Free Wreck sent light enemies every 30-45 s | Removed |

## 1. Player and feel
- Stickman about 1.6x bigger (9x22 cells, about 55 logical px tall). Weapons keep their size. Jump, run and wall physics rescaled so movement still feels the same.
- Damage per mode: Free Wreck and Zen never hurt you, but hits still knock you around (thrown, rolls, tumbles, get-up). Time Attack, Survival, Hardcore and Chaos use HP with the same reactions.
- More animations: hit flinch, thrown and tumble, landing roll after big falls, ledge grab and climb up, throw wind-up, reload, melee swings per weapon type, victory pose, idle set (look around, stretch, sit on a window edge, scratch head), walk vs run, skid, wall-climb.
- Player skins: body color, outline, head shapes, hats, scarf colors and patterns, trails. Unlocked by achievements and bought with Shards.

## 2. Modes
| Mode | Rules |
|---|---|
| Free Wreck | No enemies, no damage, no clock. Finish when you want a grade |
| Zen | No enemies, no damage, infinite ammo, no HUD |
| Time Attack (replaces Speedrun) | 60 s countdown, destroy as much as possible, best % per desktop |
| Survival | Endless enemy waves, no disasters |
| Chaos | Endless waves plus disasters, everything gets faster, tougher and more frequent each wave, boss every 5 waves |
| Hardcore Survival | Survival with limited ammo per weapon. Ammo comes from crates that drop from the sky, enemy drops and hidden caches in the wreckage |

## 3. Controls: touchpad and more
A Controls page with presets: **Mouse**, **Touchpad**, **Keyboard only**, **Gamepad**. Touchpad preset turns on:
- aim follows the pointer without clicking (no click needed to aim)
- tap once to start firing, tap again to stop (toggle fire), with a clear on-screen FIRING badge
- hold-to-fire on a key as well (default Space stays jump, fire on `K`, rebindable)
- two-finger tap = alt fire, two-finger scroll = switch weapon
- auto-aim: snaps to the nearest enemy, else the nearest breakable thing in the aim direction (strength slider)
- optional auto-fire when the aim is on target
- bigger crosshair, pointer sensitivity and smoothing sliders
Keyboard only: arrow keys rotate the aim, `K` fires, `L` alt fire.

## 4. Enemies: clarity
- Rendered 1.5x bigger with a dark outline and a soft colored glow (red for hostile).
- Every attack is telegraphed: wind-up flash, an aim line or ring for 0.3-0.6 s before firing.
- Enemy bullets twice as big, bright, with trails, and a contrasting outline so they read on any window.
- Health bars above every damaged enemy, off-screen arrows, hit sparks and damage numbers that are readable.

## 5. Weapons
- **Every original weapon reworked**: its own role and feel, its own alt fire (not just a variant), retuned damage, radius and fire rate, new projectile visuals and impact effects.
- **All 100 sprites redrawn**: same size on screen, cleaner silhouettes, shading and highlights, consistent style per category.
- **Desktop weapons, one by one**: keep the ones you liked but polish and rebalance them, make each readable at a glance (clear projectile, clear effect, tooltip that says exactly what happens). The confusing ones get remade into clearer ideas (sudo, grep, Theme Switcher, Pixel Sorter, Defrag, Ctrl+C/V, Workspace Portal, Dead Pixel, Wallpaper Peeler are the main candidates), and a few new desktop weapons replace anything that still overlaps.
- **Hotbar editing**: drag a weapon from the wheel onto a hotbar slot, or right-click a slot to pick its weapon, or hover a weapon in the wheel and press a number.

## 6. Progression and economy
- **Currency: Shards** (a small cyan glass shard icon). Earned from destruction, combos, kills, bosses, achievements, hidden golden pixels in the wreckage and a daily first-wreck bonus.
- **Weapons start locked** except a starter set of 6. Each weapon has its own achievement. Locked weapons show as black silhouettes in the wheel with their goal. About 15 rare weapons have secret goals shown as "???" with a vague hint.
- **Unlock everything** switch tucked at the bottom of Settings (Advanced).
- **Achievements**: around 160 (one per weapon plus about 60 general ones: destruction, combos, modes, waves, bosses, windows collapsed, stunts, secrets). Small slide-in popup with icon, name and reward.
- **Weapon skins from crates** (CS:GO style): four crates (Wreck Crate, Desktop Crate, Glitch Crate, Golden Crate), five rarities (Common, Rare, Epic, Legendary, Mythic). Finishes are generated on the pixel sprites: gradients, camo, carbon, chrome, neon, holo, rainbow, glitch, gold, animated ones at Mythic. A scrolling roulette opening animation with a reveal. An Armory page to equip skins per weapon.

## 7. Interface
A proper game UI in your Omarchy theme: a start card (mode, desktop info, best scores), pause menu with tabs (Play, Weapons, Skins, Crates, Achievements, Settings, Controls), consistent buttons, cards, sliders and toggles, bigger and readable text everywhere, the wheel text laid out without overlap. HUD card shows HP, ammo in Hardcore, wave, timer.

Settings: master, music, effects volumes, sound on/off, screen shake slider (on the main pause page too), particle amount, flashes, kill cam, quality, all merges, controls preset.

## 8. More destruction and effects
New full-resolution explosion, smoke and fire renderer; scorch decals and glowing bullet holes; sparks that bounce; glass shards that tinkle and settle; dust that hangs and drifts; steam when water hits fire; electricity arcs along metal frames; collapsing windows throw a dust wave; text letters tumble and pile up; burning paper curls into ash.

## 9. My extra ideas
- Photo mode (F2): freezes the action, hides the HUD, saves the wreckage to ~/Pictures/Wreck This Desktop.
- Daily challenge: a seeded goal for whatever desktop you have that day.
- Combo finishers: big combo tiers trigger a short slow-mo and a screen-wide effect.
- Golden pixels: a few hidden bonus pickups per desktop, revealed when you wreck what covers them.

## Milestones
| # | Content |
|---|---|
| R1 | Bug fixes (section 0), bigger player, damage per mode, Free Wreck without enemies, Tab/Esc, explosion renderer |
| R2 | Controls presets and touchpad mode, hotbar editing, wheel and HUD readability |
| R3 | Enemy clarity pass, Survival, endless Chaos, Time Attack, Hardcore Survival with ammo |
| R4 | Original weapons: rework, alt fires and new sprites |
| R5 | Desktop weapons: polish, rebalance, remakes and replacements |
| R6 | Achievements, weapon locks with silhouettes, unlock-all switch |
| R7 | Shards, crates, weapon skins, player skins |
| R8 | New game UI and menus, settings, more animations, more destruction effects, photo mode, daily challenge |
