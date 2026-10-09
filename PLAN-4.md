# Wreck This Desktop: round 4 plan

Same rules: milestones, each playable, tested off screen (Chromium and WebKitGTK), committed one by one.

## T1. Winning, continuing, and waves that never come
**Waves stall.** The next wave only starts when the queue is empty and `EN.count() === 0` (`web/modes.js:84-88`). One enemy that never dies blocks the run forever. The usual culprits:
- daemons are immune while `inside` (`web/desk/enemies-desk.js:158`);
- `notresp` drifts through walls;
- walkers spawn at `v.y+10` with no free-space check (`web/enemies.js:847`) and get stuck in solid cells;
- `video` is exempt from the out-of-bounds cull (`web/enemies.js:657`);
- if `spawn` throws, the queued type is already shifted off and lost.

Fixes:
- Spawn only into free space, clamped inside the screen. Wrap `spawn` so a failure retries next tick instead of losing the enemy.
- A stall watchdog: if no enemy has taken damage for 20 s, pull stuck enemies into the open with an arrow pointing at them. If they are still unreachable after 30 s, kill them for no score.
- An "enemies left" counter on the HUD, with off-screen arrows always on during the last 3 enemies.

**Boss kills do nothing.** `G.enemyKilled` sets `run.bossKilled` and shows "PROCESS TERMINATED!" (`web/game.js:80`), and the waves just go on. Fix:
- In Survival and Hardcore, killing the wave 5 boss wins the run and opens the win screen.
- The win screen offers **Continue** (the run becomes endless and keeps its score, with bosses every 5 waves), **Restart** and **Menu**.
- Chaos stays endless and only celebrates each boss.

**100% does nothing.** Free Wreck only announces at 80% and calls `U.showFinish`, which is empty (`web/ui.js:502`). There is no 100% check anywhere. Fix:
- At 100% (Free Wreck, Zen, Time Attack and any mode whose goal is breaking the desktop), show the win screen with **Continue breaking**, **Restart** and **Menu**.
- In Time Attack, 100% before the clock runs out ends the run with a time bonus.

**% is wrong.** `pct = destroyed / total` (`web/modes.js:5`), and slabs count 0.4 on detach and 0.6 on shatter. A slab that settles without shattering turns back into SOLID after only 0.4 was counted (`web/desk/structures.js:172, 401, 441`). Hitting it again adds another 1, so % can go past 100. Fix:
- Count each cell once, with a per-cell "counted" bit.
- Clamp % to 100.
- Count the layers from T5 too, so 100% means the screen is really gone.

**Results and win screens.** `G.end` is final today (`web/game.js:245-262`, `G.pause` is ignored once a run ends). It needs a resumable state so Continue returns to the same run, with the clock, score and wreckage intact. The win screen is its own design, not the grade card: a big title, the run stats, and the three buttons, with Continue focused.

## T2. Hotbar, weapon switching, numbers
**The hotbar is invisible until you switch.**
- It is an HTML strip with `pointer-events: auto` (`web/ui.js:165-175`, `web/hud.css:67-82`). Today it fades to 0.25 after 3 s and still catches clicks.
- New behaviour: fully hidden, shown only when the weapon changes (1-0, the wheel, scroll, next/prev), and fades out 1.2 s later.
- `pointer-events: none` during play, so clicking near it fires and never switches weapon. Hotbar editing (drag, right-click, the empty `+` slot) moves into the weapon wheel (Tab), where the cursor is free.

**Faster switching.** `WP.select` has no draw time (`web/weapons.js:1967-1981`). The lag comes from:
- the scroll throttle: a step needs 45 units of scroll, steps are at least 90 ms apart, and the wheel only re-arms after 200 ms (`web/input.js:97-103`);
- the name label and select sound.

Fixes:
- One step per scroll notch, with no re-arm wait.
- A 60 ms raise animation that never blocks firing.
- A **last weapon** quick swap key (default `X`).

**Readable numbers.** The HUD and menus use Pixelify Sans (`web/hud.css:1-5`), whose digits are hard to tell apart. The canvas popups use the bitmap font in `web/font.js`, where 6/8, 8/9 and 5/6 differ by one or two pixels (5x7 digits at `:56-65`, 7x9 at `:156-165`). Fixes:
- Redraw both digit sets with open shapes: 6 and 9 with straight tails, 8 with a pinched waist, a flat-topped 5, and a slashed 0.
- Build them into the existing `WreckPix` webfont. `buildTTF` / `install()` in `web/font.js:270, 443-456` exists but is never called.
- Use it for every number in the HTML UI, with tabular widths so counters don't jitter.
- Letters stay Pixelify Sans.

## T3. Keybinds: one key, several actions
- Bindings are `save.keys = {action: [codes]}`. At runtime one key already triggers every action it maps to (`actionsFor`, `web/input.js:20, 45-46`).
- The only thing that blocks shared keys is the rebind capture, which strips the key from every other action (`web/ui.js:476`).

Changes:
- Remove that strip. When a key is shared, the row says "also: Jetpack, Jump" in a muted colour instead of silently unbinding.
- Each action gets add and remove per key (up to 4 keys) instead of "replace". Raise the caps at `web/ui.js:477` (2) and `web/core.js:113` (3).
- Mouse buttons and the wheel become bindable like keys. Today left, right and wheel are hardcoded (`web/input.js:76-107`), and capture only listens for keydown.
- Digit keys stop being hardcoded to slots (`web/game.js:25`) and become `slot1`…`slot10` actions.
- Gamepad buttons become rebindable (`GP` at `web/input.js:173` is hardcoded).
- `prev` / `next` get default keys (`web/core.js:69-72` has none).
- Remove the unused `pending.slot` (`web/input.js:47`).

## T4. Gadgets, from scratch
Today there are 8 gadgets on one `gadget` action (Q). You pick one in the wheel, and you have to press Q to use the jetpack, glider or claws (`web/gadgets.js:10-18, 61-62`). It still has leftovers from the Wreck This Page port:
- a free-for-all `owned` with dead `price` / `buy()` (`:24, 313-319`) and `save.gadgets`;
- an empty `post()` (`:264`);
- "scorches the page" and `letters:` options;
- the weapon category "Gizmos" with the same idea and page wording ("letters off the page" on magnet, blackhole and cutter, `web/weapons.js:63-89`).

New model: **movement gadgets live on the movement keys, tool gadgets get one key.**

| Gadget | How it works |
|---|---|
| Jetpack | **Hold Space** in the air once your jumps are used. Fuel bar under the stickman, refills on the ground. |
| Glider | **Hold Space** while falling (when the jetpack is not equipped or has no fuel) |
| Wall claws | Automatic: push into a wall to cling, Space to climb or kick off |
| Boots | Extra air jump, **Down in the air** to ground pound |
| Grapple | **Gadget key** to fire, release to let go, Space reels in. It aims with the cursor. |
| Blink | **Gadget key**, or **double tap a direction** for a short dash teleport |
| Blast pad / Shockwave | **Gadget key** |

Details:
- **Two slots:** one movement gadget and one tool gadget, picked in the wheel's gadget row. A quick-cycle key for the tool slot (default `C`).
- HUD: a small gadget card next to the stats showing fuel, cooldown and charges (pads 3). Today only blast has a cue (the boot colour, `:280`).
- Every gadget gets its own feel pass: sound, puffs, an animation pose on the rig, and screen feedback in line with the effects budget.
- New gadgets to round out the set:
  - **Hookshot pull:** yank a loose chunk toward you.
  - **Bubble shield:** short invulnerability with a cooldown, wave modes only.
  - **Slow time:** 2 s of bullet time with a long cooldown.
- Clean-up:
  - Remove the dead shop code and the page wording.
  - Rename the "Gizmos" weapon category to **Tools**, so "gadget" means one thing.
  - Rewrite the magnet, blackhole and cutter texts for the desktop.

## T5. Destruction that really destroys
**The problem.** Shooting an image or text leaves a blurry mosaic of the same thing, which can't be touched (screenshots: a browser card of croquettes turns into a noisy copy of itself). The cause:
- Every cell inside a window has a **pane** layer (`back = 1`, `web/desk/segment.js:409`).
- Image cells keep their own average colour as the pane colour (`bcol = col`, `ptex = 0`, `segment.js:415`).
- When the front cell dies it becomes HOLE (not solid), but the pane still draws that flat colour per 4x4 cell, with dithered edges (`web/desk/render.js:74-126`).
- Big images (more than 45% of a region) are never solid at all: they are pane only and draw the screenshot directly (`segment.js:268, 413`).
- The pane is only cleared by big blasts (`r >= 6 && pow >= 3`, `web/world.js:298`), slab detaches and a few desk weapons.

The new layer model, where every layer can be destroyed:
1. **Front** (text, images, icons, widgets): solid. When hit it breaks into debris made of its own pixels, as now.
2. **Pane** (the window background behind the content): its own HP. Every hit wears it down: first cracks, then scorched holes, then gone.
   - It no longer copies the screenshot or the image's colours once the front is gone. It shows the window's real background colour, and that disappears too as the pane is destroyed.
   - Image panes and big images become front cells, so you can stand on them, break them, and they count.
3. **Wallpaper**: what you see once the pane is gone. It can be destroyed as well (heavy weapons, or repeated hits).
4. **Void**: black with the existing void sparks. This is the real "nothing left".

Behaviour:
- A destroyed cell never shows its original pixels again, unless they are flying away as debris.
- Small weapons chew through the front and pane, and explosions take the pane and some wallpaper.
- Pane cells keep holding the window up (`isStruct`) until they are destroyed. Destroying a window's pane is a new way to bring it down.
- **%:** front + pane count (wallpaper is a bonus). This connects with the counting fix in T1.
- Performance: one extra `pane HP` byte per cell, and only damaged tiles redraw, as now.

## T6. Crates, one per cosmetic category, and no more shop
Today:
- The 5 crates (Wreck, Desktop, Glitch, Omarchy, Golden, 100 to 500 Shards) only drop weapon finishes (`web/desk/shop.js:60-66, 155-177`).
- Player cosmetics are bought outright in the Skins tab (`renderSkins`, `shop.js:236-261`). They are: costumes 1500-4500, hats, faces and trails 500-1500, body and scarf colours 300-800.

Changes:
- **New crates, one per player category:**
  - **Costume Crate**
  - **Hat Crate**
  - **Face Crate** (glasses and masks)
  - **Trail Crate**
  - **Colour Crate** (body and scarf colours)
- The weapon crates stay for finishes.
- Each crate has its own pool and rarity spread. Costumes are the rarest items, and Mythic animated variants (rainbow scarf, animated trails) sit at the top.
- **No more buying cosmetics.** The Skins tab becomes the wardrobe: you see everything you own and equip it there, and locked items show as silhouettes with the crate they come from.
  - Things already bought stay owned (`save.pskin.own` is kept).
  - Halo and Crown stay achievement rewards.
- Duplicates refund Shards, as now (40% of the crate price). Crate prices are balanced so that a costume takes about as long to get as the old 1500-5000 prices.
- **New crate designs:** each crate a proper hand-pixelled object (case, lid, latches, category emblem, rarity trim), not the current generated sprite (`web/desk/pixui.js:56-78`). A crate shelf in the Crates tab with category filters, and odds visible.
- Tidy the save: the legacy `skin: 'hero'` / `skins: {hero: true}` fields in `web/core.js:74, 116, 122` share an object with the weapon skin data. Split them.

## T7. Opening crates, more satisfying
The current opening is a 5.2 s CSS roulette with a click per item and one sound at the end (`web/desk/shop.js:188-224`). The new sequence:
- **Before:** the crate sits in the middle, shakes, the latches pop one by one, and the lid cracks open with light leaking out in the colour of the best rarity in the strip. That is a tease and does not reveal the drop.
- **Roulette:** pixel cards that sit on a shelf. The ticks get louder and lower in pitch as the strip slows, with a near miss that creeps past a rarer item on most spins. The background dims while the strip spins.
- **Reveal:**
  - A burst in the rarity colour, shards flying out, and a short sting per rarity. Legendary and Mythic add a slow motion pause, a light ray and confetti.
  - The item is shown **on your stickman**, who appears and does a pose wearing it (or holding the weapon with the finish).
  - Then Equip / Open another / Close.
- **Skip:** a click during the spin jumps to the reveal. "Open 5" opens a batch and shows the results in a grid.
- All of it in the pixel UI, the theme colours and the effects budget.

## Carried over
- Launch: segmentation is now the slowest part (300-600 ms on the real desktop, `web/boot.js`). Profile it in the worker and cut it down.
- FPS: measure with `F3` in a heavy Chaos wave on the real screen before considering a WebGL renderer.

## Order
T1, T2, T3, T4, T5, T6, T7, one commit each, tests and screenshots off screen. T5 is the biggest. T6 and T7 can share a commit if the crate redesign and the opening are easier to build together.
