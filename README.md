# Wreck This Desktop

The sequel to Wreck This Page, except the level is whatever is on my screen right now.

Hit the key, a tiny stickman drops onto the desktop, and every window, line of terminal output, browser page, bar widget and bit of wallpaper is something to blow up, cut, burn, melt or shred. Windows are bolted in place, so knock the bolts off and they swing, fall, crush whatever is under them and shatter.

Built for my Omarchy / Hyprland setup.

## Installing

On Omarchy:

```
git clone https://github.com/JupiterianSoul/wreck-this-desktop.git ~/wreck-this-desktop
~/wreck-this-desktop/install.sh
```

It installs the packages, binds SUPER SHIFT + K (play) and SUPER SHIFT ALT + K (restore), and adds the game to the app launcher. To update later, `git pull` in the folder.

## Running it

```
./wreck-this-desktop run       # start (also SUPER SHIFT + K, or the games launcher)
./wreck-this-desktop panic     # kill it and restore everything (F12 while playing)
./wreck-this-desktop restore   # undo anything left over, including the wreckage wallpaper
./wreck-this-desktop status
```

Needs `webkitgtk-6.0`, `gtk4-layer-shell`, `python-gobject`, `grim` and Hyprland.

## Controls

Bindings are physical keys, so on AZERTY it is ZQSD. Everything can be rebound in the pause menu.

| | |
|---|---|
| Move / jump / crouch | Z Q S D, Space |
| Dash / roll | Shift / Ctrl |
| Aim and fire | mouse, left click |
| Alt fire | right click or G |
| Weapons | 1 to 0, mouse wheel, Tab for the wheel |
| Kick / gadget / pick up and throw | F / A / E |
| Mute / FPS | M / F3 |
| Pause / panic | Esc / F12 |

A gamepad works too (sticks to move and aim, triggers to fire, Y for the wheel).

## What is in it

- 100 weapons in 11 categories, every one with an alt fire. The 69 from Wreck This Page plus 31 desktop ones: Alt+F4, Super+Q Fist, rm -rf, Ctrl+Z, kill -9, Fork Bomb, Drag and Drop, Blue Screen, Window Tiler, sudo !!, Kernel Panic, Zip Bomb, DDoS, grep, Screen Tearing and so on.
- Windows as structures: bolts, integrity, cracks that spread by material, hanging windows, falling slabs that crush through the windows below, chain collapses.
- A procedural stickman with IK legs, ragdoll, roll, crouch, pick up and throw.
- Desktop enemies (restart prompts, the beachball, Not Responding, sudo prompts, notifications, zombie processes, daemons, cron jobs) and two bosses, The System Tray and 100% CPU.
- Free Wreck, Speedrun, Zen and Chaos modes.
- Optional merges in the settings: jump to the next workspace, turn real notifications into enemies, leave the wreckage as a temporary wallpaper, nudge real floating windows, x-ray holes.

## How it works

The Python host captures the focused monitor with `grim`, reads the layout from `hyprctl`, and opens a WebKitGTK view on an overlay layer-shell surface. The untouched screenshot sits underneath as a native GTK picture, so the switch from the real desktop to the game cannot be seen. WebKit only draws what changed.

The page splits the screenshot into windows, frames, panes, glyphs, words, lines, images and bar widgets, then runs the Wreck This Page engine on a 4 px cell grid. Each cell remembers which pixels it came from, so a chunk of terminal flying across the screen still shows its own text.

Nothing outside the game is changed unless a merge asks for it, and every such change goes into a journal first. Normal exit, a crash, `kill -9`, the F12 panic bind and the next launch all replay that journal. Screenshots only live in `$XDG_RUNTIME_DIR` and are deleted on exit.

## Tests

Everything runs off screen with synthetic desktops and fake `hyprctl` output.

```
python3 tools/make_fixtures.py
node tests/segment.test.js
node tests/smoke.test.js tiled3
node tests/structures.test.js tiled3
node tests/weapons.test.js tiled3
node tests/enemies.test.js
node tests/budget.test.js
node tests/sudo.test.js
node tests/sound.test.js
node tests/ui.test.js
node tests/pxanim.test.js
node tests/melee.test.js
node tests/idle.test.js
node tests/skins.test.js
tests/host.test.sh tiled3
```

`node tools/sfx-measure.js` renders every sound offline and prints peak, loudness and length per category. Add `--write` to regenerate the level table in `web/desk/sfx-levels.js` after changing a sound, or `--only=name,name` to redo a few.
