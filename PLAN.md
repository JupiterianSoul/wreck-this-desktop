# Wreck This Desktop: plan

The screen you are looking at becomes the level. A tiny stickman drops in from the top edge and everything on screen (windows, terminal text, browser pages, the bar, the wallpaper) can be blown up, cut, burned, melted and shredded. Spiritual sequel of Wreck This Page, built on its engine.

## 1. What I checked on this machine

| Thing | Value | Consequence |
|---|---|---|
| Monitor | eDP-2, 2560x1600 physical, scale 1.6, 165 Hz | Logical desktop is 1600x1000. Everything is computed in physical pixels so the overlay is pixel exact. |
| GPU | AMD 780M drives the panel, RTX 5060 dGPU | The game forces Mesa EGL (iGPU) the same way Jupiterian Spotify does. dGPU never wakes. |
| CPU | Ryzen 7 250, 16 threads | Segmentation runs in a Web Worker so the first frame is not blocked. |
| Hyprland | 0.56.2, Lua config | Rules and runtime binds go through `hyprctl eval`, plus one small `~/.config/hypr/wreck-this-desktop.lua` loaded with `pcall(dofile)` like the Netflix file. |
| Layers | omarchy-background (0), mpvpaper (1), omarchy-bar (2, 1600x26) | Wallpaper hidden behind windows is rebuilt from the wallpaper source (see 4.6). |
| WebKitGTK 6 | not installed (`extra/webkitgtk-6.0` 2.52.6, 131 MiB) | Needs `sudo pacman -S webkitgtk-6.0` from you. gtk4-layer-shell, PyGObject, numpy, scipy, libmanette are already there. |
| Chromium | 152 installed | Fallback host and the off-screen test browser. |
| Battery mode | `jupiterian-battery status` prints balanced/saver/ultra/... | Read on launch to pick the quality preset. |

### Free keys I found (from `hyprctl binds` and the Omarchy list)
- **Launch:** `SUPER SHIFT + K` (K for kaboom). Free in your binds and in Omarchy defaults.
- **Panic:** `F12`. Nothing in Hyprland uses a bare F12. It is registered as a Hyprland bind **only while the game runs** (added with `hyprctl eval` on start, removed on exit and by the watchdog), so it works even if the game freezes, and your apps keep F12 the rest of the time. The game also handles F12 itself.
- **Restore wallpaper** (only for the "leave the wreckage" option): `SUPER SHIFT ALT + K`, also free.
- In-game keys never use Super, and the default layout avoids Ctrl+Alt combos entirely (Ctrl+Alt+Delete closes all your windows, Alt+Tab is taken).

## 2. Tech choice

**Recommendation: keep the Wreck This Page JS engine, host it in a WebKitGTK 6 webview inside a gtk4-layer-shell surface on the OVERLAY layer, driven by a small Python (gi) host.**

Why layer-shell beats a Chromium app window here:
- An overlay layer sits above everything, including the bar and fullscreen windows. A normal window would need fullscreen to cover the bar, and Hyprland allows one fullscreen window per workspace: if Netflix (or anything) is fullscreen on that workspace, our window would either kick it out of fullscreen or sit behind it. That is a real change to your apps, which the safety rules forbid.
- No window means no focus change, no relayout of tiled windows, no workspace or fullscreen state touched. On exit the surface is destroyed and the desktop underneath is exactly as it was, because nothing happened to it.
- **The invisible switch:** the surface maps fully transparent (webview background rgba 0,0,0,0), so for the first few frames you see your real desktop through it. When the page has drawn the screenshot, the image under the overlay and the image on it are identical, so the switch cannot be seen. A layer rule disables the layer fade animation.
- Python gets direct bridges (WebKit script message handler and a custom `wtd://` URI scheme that serves the screenshot straight from memory), so no HTTP server and no open port.

Why not a native rewrite: the hot loops of the engine are sparse and event driven (dirty tiles, burning lists, sand lists, bounded flood fills). The simulation grid here is 640x400 cells (see 3), which is smaller than a long Wreck This Page level (380 x 1500+). JS handles that. Rendering is a handful of GPU canvas composites per frame. A native port would throw away 13.7k lines of tuned gameplay for a gain we do not need, and the native track already exists as TimeWreck.

Risks and fallbacks:
- WebKitGTK canvas speed at 2560x1600 is the main unknown. It uses Skia with GPU acceleration for 2D canvas in 2.5x, which should be fine, but I cannot measure your real GPU off-screen. There is an FPS overlay (`F3`) and adaptive quality from day one. If WebKit cannot hold the frame rate, the host has a second backend: Chromium `--app` window with Hyprland rules (float, pin, fullscreen, no anim/blur/rounding/border/shadow, opaque), with the fullscreen caveat above handled by refusing to start on a workspace that already has a fullscreen window. The engine does not care which host runs it.
- Frame pacing: the simulation stays at a fixed 60 Hz step like Wreck This Page, rendering runs at the display rate (165 Hz) with interpolation of the player, chunks and camera shake. Target: never under 60 fps; battery preset caps rendering at 60.

## 3. Coordinates and resolution

- Everything is in **physical pixels**, per monitor. Client and layer geometry from hyprctl (logical) is multiplied by the monitor scale.
- **Cell size = 4 physical px** (2.5 logical px) on your screen, computed as `round(2.5 * scale)` for other monitors. Grid on your screen: **640 x 400 = 256k cells**.
  This keeps the Wreck This Page proportions: the player is 6x14 cells (about 15x35 logical px, a tiny stickman), a text line in VS Code is about 8 cells, so text lines are platforms exactly like on the web pages.
- **Simulation is coarse, visuals stay sharp.** Each cell remembers where its pixels came from (`src`, an index into the original screenshot). Intact areas are drawn from the real screenshot at full resolution. When a piece breaks off, flies, lands and settles, it is still drawn from its own original pixels, so a fallen chunk of terminal still shows its own text. Only damaged states (burning, ice, char, paint, acid) are drawn as 4 px cell colors on top, which is the Wreck This Page pixel look appearing where the desktop is wrecked.
- No camera scrolling: the screen is the level, 1:1. Camera shake moves the whole picture by a few physical pixels.

## 4. Turning the desktop into objects

### 4.1 Capture (launcher, Python)
1. `hyprctl -j monitors`, `clients`, `layers`, `activeworkspace`, `getoption general:border_size`, `decoration:rounding`, current theme colors from `~/.local/state/omarchy/current/theme/colors.toml`, keyboard layout from `hyprctl -j devices`, `jupiterian-battery status`, `ls-live-wallpaper status`.
2. `grim -o <output> -t png -l 0` per monitor into `$XDG_RUNTIME_DIR/wreck-this-desktop/<session>/` (uncompressed PNG, about 60 ms). No cursor in the shot.
3. Show the overlay (transparent first frame, then the screenshot). The stickman is held until segmentation is done (about 200-400 ms in a worker), then drops in from the top with a landing puff.

### 4.2 Layout model
Only what is visible counts: windows on each monitor's active workspace, plus pinned windows and an open special workspace. Z-order: fullscreen > floating (by focus history) > tiled. Occluded parts of a lower window are filled with that window's own background color so the structure is whole if the upper window falls off it.

### 4.3 Layers per cell (maps onto the Wreck This Page model)
| Wreck This Page | Desktop | Collides with the player |
|---|---|---|
| `SOLID` front cells | Text glyphs, icons, UI widgets, images, window borders, bar girder | yes |
| `back` (page background) | Window **pane**: the flat background of the window content | no (you run in front of it) |
| `code` (fake source layer) | **Wallpaper** | no |
| void | Pure black with drifting sparks behind the wallpaper | no |
| `ROCK` floor | Bottom screen edge (debris piles up on it) and the side edges | yes |

### 4.4 Segmenting each window (pure JS module, runs in a Worker and in node tests)
1. **Frame:** the Hyprland border ring (border_size scaled) becomes a metal frame. A client-side titlebar (VS Code, Chromium tab strip, GTK headerbars) is detected as the top band whose background differs from the content background; it becomes a separate titlebar beam.
2. **Pane color:** histogram of quantized colors over the content area, per 64x64 tile, so split views (sidebar vs editor) get their own local background.
3. **Foreground mask:** pixels far enough from the local background (works for dark-on-light and light-on-dark).
4. **Connected components** (8-connected, union-find on the physical-pixel mask), then classify:
   - small components with text-like height become **glyphs**; dots and accents merge into the glyph below them;
   - glyphs are grouped into **words** (gap below about 0.4 x line height) and **lines** (shared baseline band);
   - large or high-variance regions become **image** blocks (photos, video frames, album art);
   - everything else becomes a **UI element** (buttons, icons, rules, scrollbars).
5. **Cells:** a cell is `SOLID` if at least 2 of its 16 pixels are foreground. Glyph cells get a glyph id so letters pop off as pieces, words and lines get ids so a whole line can be spilled.
6. **Materials by app class** (pattern table, easy to extend):

| Class pattern | Frame | Pane | Ink / content |
|---|---|---|---|
| terminals (Alacritty, kitty, ghostty, foot) | metal | glass | glass text (shatters), lines spill out |
| browsers and Chromium apps, docs, Obsidian | metal | paper | ink, images as image |
| code editors (VS Code, Zed, nvim GUIs) | metal | plastic | ink |
| media (mpv, Netflix app, image viewers, Spotify app) | metal | image | image |
| file managers, settings, GTK/Qt apps | metal | plastic | ink |
| unknown | metal | paper | ink |

### 4.5 Windows are structures
- Each window has **bolts**: two at the top frame corners (plus one per 600 px of width). A bolt is a small tough metal plate drawn subtly on the frame.
- **Integrity pass:** when a window is damaged, a budgeted flood fill from its bolts runs over that window's frame, pane and content cells. Cracked cells do not conduct. Whatever is no longer connected to a bolt becomes a falling piece. This one rule gives: chunks breaking off, a crack splitting a window in two, text falling out once the pane behind it is gone (the Wreck This Page "glue" rule still applies).
- **Tilt:** losing all bolts but one turns the window into a **slab** hinged on that bolt. It swings like a pendulum with damping, and you can stand on it.
- **Falling:** losing the last bolt (or a big enough impulse: Alt+F4, Drag and Drop, a nuke) makes the window a free rigid slab with its full texture. It rotates, slams into the windows below (their panes count as solid for slabs, so it lands on them, not through them), carves an impact crater, can knock the lower window's bolts loose (chain collapses), then either settles as a tilted pile (re-embedded in the grid, still textured) or shatters (glass panes always shatter).
- Slabs are a new body type next to Wreck This Page chunks: own local cell mask, cached texture canvas, angular velocity, optional pivot. The player can ride them (carried velocity).

### 4.6 Top bar
- The bar is a **metal girder**: a frame bolted to both screen edges.
- **Widgets** are separate breakable props. Their positions come from segmenting the bar screenshot into clusters separated by gaps, then labelled in order from `~/.config/omarchy/shell.json` (`bar.layout.left/center/right`): Omarchy menu, workspaces, Spotify miniplayer, games button, clock/calendar, weather, notifications, network, battery, and so on.
- Each widget has a gag: the clock spins its digits and falls, the workspace dots pop off like coins, the battery leaks acid, the network icon throws spark arcs, the Spotify widget plays a distorted synth riff (synth only, the game never talks to your real Spotify), the games button spits confetti.

### 4.7 Wallpaper and void
- Wallpaper cells are drawn from a full wallpaper image, because most of it is hidden behind windows in the screenshot. Source: the visible screenshot pixels where the wallpaper shows, and for the hidden parts the current wallpaper file cover-scaled like the compositor does. When the live wallpaper is on, one frame is pulled from the video with ffmpeg on the iGPU (vaapi), with the same tint parameters approximated.
- The wallpaper can be scorched, cracked (crack lines spread across it) and shattered. Behind it is pure black with slow sparks and embers drifting up.

## 5. Gameplay

### 5.1 Stickman
Procedural rig, not sprites: hips, spine, head, two-bone arms and legs solved with IK, drawn as crisp anti-aliased strokes at physical resolution in the theme foreground color with a thin dark outline so it reads on any background.
- Run (foot planting on the actual cells), jump, double jump, wall slide, wall jump, dash, **roll** (crouch + dash, ducks under projectiles), **crouch**, coyote time and jump buffer (all kept from Wreck This Page tuning).
- **Ragdoll** when blasted: the rig switches to verlet points with joint limits, tumbles, then gets back up.
- **Pick up and throw** debris, letters, chunks and small slabs (`E` near something).
- **Ride** falling and swinging windows.
- Rocket jumps and shotgun jumps (Wreck This Page recoil system).
- Squash and stretch, landing puffs, idle animations (looks around, taps foot, sits on a window edge and swings legs).

### 5.2 Weapons: 100 total, 11 categories
Every weapon gets its own visuals, its own procedural sound, screen shake scaled to its power, and an **alt fire** (right click / `G` / gamepad LB). All 69 Wreck This Page weapons are kept and re-flavoured for the desktop, plus 31 new desktop weapons. All weapons are unlocked from the start (it is your game); scrap and upgrades are kept for progression of upgrade tiers only, and Zen mode ignores them.

**Sidearms**
| Weapon | Primary | Alt fire |
|---|---|---|
| Pistol | Pops single letters off | Fan the hammer: 3 fast shots |
| Hand Cannon | 6 piercing slugs through paragraphs | Ricochet round |
| Dual Pistols | Ricochets once | Both at once, spread |
| Nail Gun | Nails stick as footholds | Nail a chunk to the wall (pins it) |
| Flare Gun | Sticky flare that keeps burning | Parachute flare that lights and drifts |
| Saw Launcher | Blades grind into soft stuff | Recall all blades back to you |

**Automatics**
| SMG | Every hit knocks a letter loose | Burst of 6 |
| Assault Rifle | Pierces 5 layers | Underbarrel grenade |
| Minigun | Spin-up wall of lead | Keep spinning without firing |

**Shotguns**
| Shotgun | Fire down to shotgun jump | Slug |
| Double Barrel | Both barrels, launches you | One barrel |
| Flak Cannon | Bursts into shrapnel mid-air | Detonate the shell now |
| Confetti Cannon | Party paint and tiny holes | Confetti bomb |

**Precision**
| Sniper Rifle | 3 walls deep, triple enemy damage | Scope zoom with slow-mo |
| Railgun | Charged pierce through every layer | Overcharge: wider beam, longer charge |
| Crossbow | Skewers whole words | Explosive bolt |
| Harpoon | Spears a chunk and yanks it | Reel yourself to the chunk |

**Energy**
| Laser | Melts a clean tunnel | Wide melting fan |
| Plasma Rifle | Neat craters | Charged plasma ball |
| Tesla Coil | Chain lightning, conducts through metal | Tesla node you can place |
| Freeze Ray | Turns things to ice | Ice wall you can stand on |
| Sound Cannon | Cone shockwave | Bass drop: radial pulse |
| Pixel Eraser | Rubs every layer down to the void | Erase only the pane (x-ray) |
| Glitch Gun | Scrambles rows, corrupts colors | Datamosh smear along aim |
| Backspace | Deletes text letter by letter along a line | Ctrl+Backspace: whole words |

**Chemical**
| Flamethrower | Fire that spreads | Napalm glob |
| Acid Sprayer | Drips and eats down | Acid puddle that spreads sideways |
| Paint Gun | Recolors without breaking | Bucket fill a whole region |
| Lava Launcher | Molten blobs melt straight down | Lava wave along the ground |
| Water Cannon | Washes rubble, soaks paper, aim down to hover | Steam burst on fire |
| Termite Jar | Bugs eat wood and paper | Queen: nest that keeps spawning |
| Magnifying Glass | Focused sunbeam that smokes then burns | Wide beam that dries and cracks |

**Explosives**
| Grenades | Bouncy timed | Cook it (hold) |
| Rocket Launcher | Crater and rocket jumps | Guided rocket follows the cursor |
| Homing Missiles | Four seekers | Lock on up to 8 targets |
| Cluster Bomb | Splits into 7 | Split now |
| Sticky Bombs | Stick to anything | Detonate all |
| Proximity Mines | Wait for things nearby | Detonate all |
| Fireworks | Burning stars | Finale volley |
| Pocket Nuke | Erases a region down to the void | Delay fuse with a countdown |
| Bowling Ball | Rolls and plows a trench | Strike: faster, heavier |
| Anti-Gravity Bomb | Lifts everything, slams it down | Keep it floating (no slam) |

**Melee**
| Giant Hammer | Smash down to pogo | Ground pound shockwave |
| Chainsaw | Continuous carving | Rev dash forward |
| Katana | Clean cuts, pieces fall whole | Iaido: slash dash through a window |
| Power Drill | Pulls you through anything | Drill bit launcher |
| Wrecking Ball | Swing with momentum | Let go of the chain |
| Bullwhip | Yanks things, swings from ceilings | Crack: stun everything nearby |
| Spring Glove | Punches a chunk out as a projectile | Uppercut |
| Rubber Stamp | Slams DENIED, punches letters out | APPROVED stamp: pastes letters back as solid platforms |

**Gizmos**
| Portal Gun | Linked portals | Clear portals |
| Gravity Gun | Rip a chunk and throw | Pull everything small toward you |
| Magnet | Strips letters and flings them | Repel |
| Bouncy Balls | Speed up on each bounce | Giant ball |
| Boomerang | Carves out and back | Throw two |
| Black Hole | Swallows, then pops | White hole: pushes out |
| Snowballs | Freeze a patch | Snowman (stands as a platform) |
| Banana Bomb | Splits into 5 | Mega banana |
| Ctrl+X | Cut a rectangle, paste where thrown | Paste it again |
| Shop Vac | Sucks rubble as ammo | Blow it back out |
| Ink Pen | Draws solid ink platforms | Eraser end |
| Leaf Blower | Wind, no damage | Suction |

**Disasters**
| Airstrike | Flare then a bomb line | Carpet run across the whole screen |
| Orbital Laser | Column that drills to the bottom | Sweep it sideways |
| Meteor Shower | Burning rocks | One huge meteor |
| Bee Swarm | Eats letters, chases enemies | Hive that keeps spawning bees |
| Tornado | Sucks up everything | Fire tornado |
| Storm Staff | Lightning, conducts through metal | Storm cloud that follows you |
| Earthquake | Shakes loose what is not attached | Aftershock that tilts windows |

**Desktop (new category, all new)**
| Weapon | Primary | Alt fire |
|---|---|---|
| Alt+F4 | A beam: the window it hits loses its bolts, folds and collapses | Alt+F4 every window on screen, one after another |
| Super+Q Fist | A giant rocket fist that punches a window clean off its bolts | Charged double punch |
| rm -rf | A deletion wave that crawls through connected text, letter after letter, recursively | `--no-preserve-root`: crawls through everything, including the wallpaper |
| Ctrl+Z | Rewinds a small area back to how it looked at the start (with a VHS rewind effect) | Ctrl+Y: re-applies the wreckage there twice as hard |
| kill -9 | Sniper: one-shot kills, pierces the whole screen, leaves a SIGKILL tag | kill -STOP: freezes an enemy or a falling slab in mid-air |
| Fork Bomb | A bomb that splits in two, and its children split again, 5 generations | Fork it now |
| Drag and Drop | Gravity gun for whole windows: grab a window by its frame and fling it | Snap: slam the held window to a screen edge |
| Workspace Portal | Two portals labelled with workspace numbers, debris and enemies go through | Swap: exchanges the contents of the two portal discs |
| Screenshot Flash | Print key flash: freezes an area into ice with a camera shutter sound | Region capture: drag a rectangle, all of it freezes |
| Cursor Swarm | A cloud of mouse cursors that click-drill everything they touch | Busy cursors: they spin and hover in place |
| Blue Screen | Nuke: the screen glitches blue, a stop code appears, then everything shatters | Green screen: same but only hits enemies |
| Window Tiler | Slices a window into a grid of tiles that fall apart | Dwindle: recursive slices, smaller each time |
| sudo !! | Repeats your last weapon's shot at double power | `sudo` charge: next 5 shots are root (pierce metal) |
| Kernel Panic | Rains panic text lines that are solid and crushing | Stack trace: one long falling line |
| Segfault | Shots punch square memory holes that spread for a moment | Core dump: drops a heap of rubble |
| Zip Bomb | Compresses an area into a tiny cube, then decompresses violently | Keep the cube (carry and throw it) |
| DDoS | Hundreds of tiny packets from the screen edges toward the aim point | Single ping that bounces forever |
| grep | Lock onto a word: every copy of that word on screen gets struck | Invert match: everything except that word in a radius |
| Caps Lock | A shout cone: letters swell to uppercase, get heavy and drop | Toggle: all your shots knock letters off for 10 s |
| Ctrl+C / Ctrl+V | Copy a chunk, then fire copies of it as heavy projectiles | Paste a copy as a solid platform |
| Screen Tearing | Slices the screen into horizontal bands and shifts them sideways (vsync off) | Vertical tear |
| Pixel Sorter | Sorts pixel columns by brightness, then they crumble | Row sort |
| Dead Pixel | A stuck pixel mine that spreads, then pops | Hot pixel: burns |
| Theme Switcher | Repaints an area in another Omarchy theme palette, then cracks it | Cycle the whole screen through themes for 5 s |
| USB Stick | Never fits the first time: flips twice, plugs in, explodes | Format: wipes an area flat |
| Battery Swell | Throw a lithium cell: it swells, vents fire, explodes | Overcharge nearby metal: sparks |
| Scroll Wheel | A rolling saw blade that rides along surfaces | Scroll up: climbs walls |
| Notification Spam | Fires toast cards that stack up, then explode | Do Not Disturb: a silence field that stops enemies |
| Defrag | Pulls rubble into neat colored blocks, then blows the blocks | Fragment: scatters blocks |
| Overclock | Heat aura that melts things around you and doubles fire rate for a while | Thermal throttle: cooling burst that freezes |
| Wallpaper Peeler | Peels long strips of wallpaper off and flings them | Peel a whole wallpaper sheet |

### 5.3 Destruction elements
Kept from Wreck This Page: carve with jittered edges, dents on tough materials, letters popping off as rigid glyph pieces, rigid chunks that settle or shatter, fire with spread and smoulder, ice, acid, paint, sand-like rubble that slides and piles up, crumble of unsupported pieces, adaptive quality.
New or extended:
- **Cracks that propagate:** crack lines grow from impacts over a few frames along a random walk biased by material (straight on glass, jagged on stone, none on rubber). Cracks weaken cells and break structural connectivity, so they decide where windows split.
- **Glass shatter** of terminal panes and glass text into shards with sharp sounds.
- **Melting:** plastic and code-editor panes sag and drip under heat (lava, laser, overclock).
- **Dust clouds** that linger, **smoke**, **embers** drifting up, **sparks** off metal frames and the bar girder.
- **Rubble piling on window edges**: frames and girders are ledges, so sand collects on top of them.
- **Kill cam:** big explosions and window collapses trigger a short slow-mo (0.2x) with a slight zoom toward the event and chromatic split, then snap back.

### 5.4 Enemies (all desktop annoyances, reusing the Wreck This Page enemy system)
| Enemy | Behavior |
|---|---|
| Update Prompt | Walks along windows, "Restart now?" countdown that explodes |
| Beachball / frozen app spinner | Rolls and bounces, hard to hit while spinning |
| Not Responding dialog | Grey ghost window that drifts toward you, hits freeze you briefly |
| polkit password popup | Shielded lock: only damage from behind or by breaking its shield |
| Notification spam | Toasts that slide in from the top right and fire in bursts |
| Cookie dialog | Sticks to the bottom of the screen, blocks shots, spawns cookies |
| Loading spinner | Orbiting dots, speeds up when hurt |
| Low Battery warning | Flies toward you and drains your dash |
| Zombie process | Comes back to life unless killed with kill -9 or fire |
| Daemon | Tiny horned process that hides in windows and pops out |
| Cron job | Respawns on a timer at the same spot |
| Popup ad, Captcha, Paperclip | Kept from Wreck This Page |
| **Boss: System Tray** | A long bar of icons that detaches from the real bar, each icon is a turret |
| **Boss: 100% CPU** | A red-hot `top` row that heats everything around it, sets fires, and overclocks the other enemies |

### 5.5 Modes
- **Free Wreck** (main): no timer, light enemies, combo and score, finish whenever you want for a grade.
- **Speedrun**: destroy 25 / 50 / 75 / 90 % of the screen as fast as possible, best times per target.
- **Zen**: no enemies, infinite ammo, no score pressure.
- **Chaos**: a disaster every 6-10 s (Kernel Panic, Blue Screen, Earthquake, Meteor Shower, DDoS, Fork Bomb outbreak, Screen Tearing storm, Memory Leak: a rising flood of bits), plus waves of enemies.
Pick the mode in a small pause/start card, last mode remembered.

### 5.6 HUD
Minimal, translucent, in your current Omarchy theme colors (read from `colors.toml`) and the Omarchy font:
- hotbar of 10 bottom center, shown on use and faded after 2 s idle;
- radial weapon wheel on `Tab` / hold mouse wheel click / gamepad RB, grouped by category;
- combo counter and multiplier, % destroyed, mode timer;
- end screen with grade (S/A/B/C/D) and stats, then "again on this desktop", "next workspace" or "quit".
Everything else is the desktop itself.

### 5.7 Audio
Wreck This Page's procedural WebAudio engine and music sequencer, plus new synth patches for the new weapons and widgets (shutter click, BSOD chime, keyboard clack bullets, modem screech for DDoS). In-game master, music and SFX volume, and `M` mutes (bound by key label so it is the M on your keyboard).

### 5.8 Controls
- Bindings are stored as physical key codes (`event.code`), so ZQSD is right on AZERTY. Labels in the UI are shown in AZERTY using the layout from `hyprctl -j devices`.
- Defaults: `Z Q S D` move/jump/crouch, `Space` jump, `Shift` dash, `Ctrl` roll (Ctrl alone, never with Alt), mouse aim, left click fire, right click alt fire, `1`-`0` physical number row and mouse wheel for weapons, `Tab` wheel, `E` pick up/throw, `A` gadget, `F` kick, `R` restart, `M` mute, `F3` FPS, `Esc` pause, `F12` panic.
- Gamepad (Gamepad API, libmanette is installed): left stick move, right stick aim, RT fire, LT alt, A jump, B dash, X kick, Y pick up, RB wheel, LB gadget, Start pause.
- Every action can be rebound in the pause menu.

## 6. Optional desktop merges (each one a setting, all off by default except Next level)
| Merge | How | How it is undone |
|---|---|---|
| **Next level** | End card button or `N`: hide the overlay, `hyprctl dispatch workspace` to the next non-empty workspace (or one you pick), recapture, show again | On exit the original workspace is restored |
| **Live notifications** | `dbus-monitor` on the Notifications interface (read only). A notification arriving during play becomes a toast enemy with its real summary text | Nothing to undo, the real notification is untouched |
| **Leave the wreckage** | On exit, a tiny separate process shows the wrecked image on a BOTTOM layer-shell surface over your wallpaper. Your wallpaper setting is never touched | `SUPER SHIFT ALT + K`, `wreck-this-desktop restore`, or logging out (the process does not survive the session) |
| **Real windows shake** | Big explosions nudge the real floating windows with `movewindowpixel`; tiled windows are never moved (that would change your layout). Pairs with x-ray holes so you can see it | Every move is journaled and reversed exactly on exit |
| **X-ray holes** | Holes in the void become see-through to the live desktop behind the overlay | Visual only |
| **App gags** | Shattered terminals spill their lines as falling text rows, browser tabs burn from the tab strip down, the Spotify widget plays a distorted synth riff, VS Code's minimap crumbles like a column, Netflix frame cracks into a mosaic | Visual and synth only |

## 7. Safety

- The game only ever reads: screenshots, hyprctl queries, theme files, dbus notifications. It never closes, kills, types into, or changes any app, file or setting. The only writes are the explicit merges above, each journaled.
- **Journal** at `~/.local/state/wreck-this-desktop/journal.json`, written *before* each reversible action (runtime F12 bind, workspace switch, window nudges, wreckage wallpaper process).
- **Restore paths**, all calling the same idempotent `restore()`:
  1. normal exit (`finally` in the host);
  2. signals (SIGINT, SIGTERM, SIGHUP traps);
  3. **watchdog**: a separate `setsid` process started first, watching the game PID with a pidfd. If the game dies for any reason (crash, OOM, `kill -9`), it applies the journal and deletes the runtime dir;
  4. panic `F12` (Hyprland bind, works even if the game is frozen): kills the game, the watchdog restores;
  5. `wreck-this-desktop restore` by hand;
  6. the launcher checks for a leftover journal at every start and restores it first.
- The overlay surface belongs to the game process, so the compositor removes it the moment the process dies. Nothing can stay stuck on screen.
- Screenshots and the wallpaper frame live only in `$XDG_RUNTIME_DIR/wreck-this-desktop/<session>/` (tmpfs, mode 700) and are deleted on exit. The Leave-the-wreckage image is the only exception and is deleted on restore.
- Only one instance at a time (lock file). The game refuses to start on the lock screen.

## 8. Project layout (`~/wreck-this-desktop`, own git repo)
```
wreck-this-desktop        launcher CLI: run | restore | panic | status
host/                     Python: capture.py, layout.py, overlay.py (GTK4 + layer-shell + WebKit), bridge.py, watchdog.py, journal.py, merges.py, wreckage.py
web/                      the game (vanilla JS, Canvas 2D, WebAudio, no assets)
  core.js audio.js fx.js input.js player.js rig.js gadgets.js weapons.js weapons-desk.js
  enemies.js modes.js ui.js hud.css progress.js game.js
  desk/segment.js desk/world.js desk/structures.js desk/render.js desk/bar.js desk/materials.js
tests/                    node unit tests + headless Chromium scenario runs + Xvfb host tests
tests/fixtures/           fake screenshots and hyprctl JSON (tiled, floating, fullscreen, terminal, browser, bar)
game.json                 registered through jupiterian-games
```

## 9. Testing (all off-screen, all muted)
- **Fixtures:** synthetic desktops generated by a script (windows with real text rendered in the Omarchy font, a fake bar, a wallpaper), plus fake `hyprctl` JSON for each case: tiled 2 and 3 windows, a floating window over a tiled one, a fullscreen window, a terminal, a browser, an image viewer, a 2-monitor layout. No real screenshot of your desktop is used in tests.
- **Node:** segmentation (glyph counts and line grouping against known fixture text), integrity and bolt logic, journal and restore logic.
- **Headless Chromium** (`--headless --mute-audio`): load the game page with a stub bridge and a fixture, run scripted scenarios through a `window.__wtd` test API (fire each weapon, collapse a window, chain reaction, run each mode 30 s), assert no exceptions, sane stats, and save PNG snapshots for me to look at.
- **Host in Xvfb** (GTK4 on X11, no layer-shell there so it falls back to a plain window inside the virtual screen): launcher, bridge, watchdog kill test, journal restore, cleanup of runtime files. Hyprland calls are pointed at a fake `hyprctl` on PATH that records calls, so nothing touches your session.
- **Perf:** a headless benchmark scene (all disasters at once) reporting simulation ms per step. Real GPU frame rate is only measurable on your screen: `F3` shows it on your first launch.
- Never shown on your real screen by me. The first real launch is yours.

## 10. Milestones (each one playable, one commit or more each)
| # | Milestone | Playable result |
|---|---|---|
| M0 | Repo, launcher, capture, layer-shell overlay with the invisible switch, exit/panic/watchdog/journal, fixtures and test harness, game.json + `SUPER SHIFT + K` | Launch shows your frozen desktop, F12/Esc returns, nothing changed |
| M1 | Segmentation (windows, panes, text, images, bar, wallpaper), sharp textured world, stickman (temporary simple rig) falls in, Pistol, Shotgun, Rocket, Flamethrower, Alt+F4 | First real wrecking of your desktop |
| M2 | Structures: bolts, integrity pass, cracks, hanging/tilting windows, falling slabs, crashes and chains, glass shatter, bar girder and widgets, wallpaper and void | Windows collapse into each other |
| M3 | Procedural stickman rig: run, jump, wall slide, dash, roll, crouch, ragdoll, pick up and throw, ride slabs, rocket and shotgun jumps, gadgets ported | Moving around feels great |
| M4 | Full arsenal: all 69 ported plus the 31 desktop weapons, alt fire for all, hotbar, radial wheel | Everything in the table works |
| M5 | Juice pass: kill cam, shake tuning per weapon, per-weapon sounds, music, dust, embers, melting, rubble on ledges | Feels like a finished game |
| M6 | Enemies and bosses, the 4 modes, theme HUD, end screen and grades, settings, rebinding, gamepad, quality presets with automatic battery preset | Full game loop |
| M7 | Desktop merges and app gags (section 6) as settings | Desktop and game blend together |
| M8 | Polish and perf pass, README, memory note, line in games-launcher-plan.md | Done |

## 11. Things I need from you
1. OK on the plan, or changes.
2. Install WebKitGTK 6 once: `sudo pacman -S webkitgtk-6.0` (131 MiB). If you would rather not, I go with the Chromium window backend and its fullscreen caveat.
3. OK to add `~/.config/hypr/wreck-this-desktop.lua` (launch bind, layer rule) and its `pcall(dofile, ...)` line at the end of `hyprland.lua`, like the Netflix file.
4. Keys: `SUPER SHIFT + K` launch, `F12` panic (only bound while playing), `SUPER SHIFT ALT + K` restore wallpaper. Change any of them if you prefer.
