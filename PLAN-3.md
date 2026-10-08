# Wreck This Desktop: round 3 plan

Same rules: milestones, each playable, tested off screen (Chromium and WebKitGTK), committed one by one.

## S1. Quick fixes
- Remove the lightning bolts that shoot out of the player on combo finishers. The finisher keeps a short slow motion and a pixel shockwave ring, nothing else.
- Find and fix the loud hit sound when shooting the screen border (bullets hitting the bottom rock rows and the screen edges).
- Effects budget: one global budget per frame for particles, explosions, flashes and screen effects. Small weapons get small effects. Screen flash, chromatic split, slow motion and big shakes are reserved for the heavy weapons (nuke, Blue Screen, Orbital Laser, Meteor Shower and similar). Particle caps lowered, and spam such as tracers, sparks and debris is merged when a lot happens at once.

## S2. sudo, redone
- **sudo !!** repeats the last weapon you fired as a 1.5 second root burst: double damage, double blast radius, double fire rate. An SMG burst is a real hose; a rocket is two bigger rockets. The minigun skips its spin-up. Charge and hold weapons work too.
- **Alt: sudo su**, clearer: 8 seconds of root mode for every weapon, with a red ROOT badge on the HUD and a timer. Shots pierce metal and fire 1.5x faster. Long cooldown.

## S3. Sound pass, every single effect
- A measuring tool that renders every sound offline and reports peak, loudness and length, so all of them get normalized to the same level per category.
- Every sound is redone one by one so it matches its action: guns by calibre, explosions by size, impacts by material (glass, metal, paper, wood), UI clicks, enemies, desktop weapons.
- Rate limits so repeated hits cannot stack into a wall of noise, a soft limiter on the master bus, and quieter defaults.

## S4. Pixel UI
- A bundled pixel font (Pixelify Sans, open licence, shipped with the game, no network), pixel frames and buttons with stepped corners, pixel icons, all in your Omarchy theme colours.
- Every screen redone: HUD, hotbar, wheel, pause menu, achievements, skins, crates, results, toasts.
- **Weapon wheel rebuilt**: fixed-size cells and info card, text clamped and never overlapping, category and weapon views use the same card size so nothing jumps or flickers when you move between them.

## S5. Weapon sprites, all hand pixelled
- Every weapon redrawn by hand as real pixel art at the level of the assault rifle: proper silhouettes, 3 shades per material, highlights, details (screws, vents, grips, scopes, decals). No more simple shapes.
- Better rotation: the RotSprite method (upscale, rotate, downscale) so rotated sprites keep clean pixels.
- **Weapon animations**: recoil kick, slides and bolts cycling, shotgun pump, revolver cylinder turn, minigun barrels spinning, chainsaw chain running, drill spinning, launchers showing the loaded rocket, glowing charge on energy weapons, reload animations.

## S6. Melee, way more polish
Hammer, Chainsaw, Katana, Drill, Wrecking Ball, Whip, Spring Glove, Rubber Stamp: wind-up and follow-through poses, pixel smear frames for swings, hit-stop and impact frames, combos (Katana 3-hit, Hammer charge slam), proper sounds and screen feedback per weapon.

## S7. Player animations
- The last jump of a double or triple jump is always a front flip.
- Idle library after 10 s without moving, picked at random: dance (several), air guitar, push-ups, phone scrolling, juggling, yawn and sleep with Zzz, checking a watch, waving at you, sitting. Any input snaps out of it.

## S8. Skins, a lot more
- **Costumes** that change the body: hoodie, leather jacket, suit and tie, lab coat, ninja, robot, astronaut, knight armour, wizard robe, hacker trench coat, chef, construction worker, plus more hats, glasses, masks and trails.
- More weapon finishes and a fifth crate.
- Prices raised across the board: colours 300 to 800, accessories 500 to 1500, costumes 1500 to 5000 Shards.

## Order
S1, S2, S3, S4, S5, S6, S7, S8, one commit each, tests and screenshots off screen.
