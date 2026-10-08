(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, randInt, pick, hash } = WTP;
  const SP = WTP.sprites;
  const PR = SP.PROJ;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies;
  const A = (n, x) => WTP.audio.play(n, x);

  const CATS = [
    { id: 'side', short: 'Pistol', name: 'Sidearms', icon: 'gun', col: '5' },
    { id: 'auto', short: 'Auto', name: 'Automatics', icon: 'bolt', col: 'a' },
    { id: 'shot', short: 'Shotgun', name: 'Shotguns', icon: 'skull', col: 'o' },
    { id: 'prec', short: 'Snipe', name: 'Precision', icon: 'target', col: 'c' },
    { id: 'energy', short: 'Energy', name: 'Energy', icon: 'bolt', col: 'm' },
    { id: 'chem', short: 'Chem', name: 'Chemical', icon: 'zen', col: 'l' },
    { id: 'boom', short: 'Boom', name: 'Explosives', icon: 'star', col: 'e' },
    { id: 'melee', short: 'Melee', name: 'Melee', icon: 'cross', col: 'u' },
    { id: 'gadget', short: 'Gizmo', name: 'Gizmos', icon: 'gear', col: 'k' },
    { id: 'disaster', short: 'Chaos', name: 'Disasters', icon: 'skull', col: 'y' }
  ];
  const D = [
    { id: 'pistol', does: 'Pops single letters off cleanly, dead accurate', name: 'Pistol', cat: 'side', price: 0, rate: 0.17, flash: 'small', shell: true, recoil: 2, shake: 1.5, snd: 'pistol', st: [2, 3, 4, 1], tip: 'Reliable little holes. Pops letters right off the line.' },
    { id: 'revolver', does: 'Six piercing slugs that tunnel through whole paragraphs', name: 'Hand Cannon', cat: 'side', price: 400, rate: 0.48, flash: 'big', recoil: 4, shake: 4, kick: 40, snd: 'revolver', st: [4, 2, 4, 2], tip: 'Six huge rounds that punch straight through paragraphs.', mag: 6, reload: 1 },
    { id: 'dual', does: 'Bullets ricochet once off walls', name: 'Dual Pistols', cat: 'side', price: 900, rate: 0.085, flash: 'small', shell: true, recoil: 1.5, shake: 1, snd: 'dual', st: [2, 4, 3, 2], tip: 'Golden twins. Alternating fire, maximum style.' },
    { id: 'nailgun', does: 'Nails stick in place as tiny footholds you can stand on', name: 'Nail Gun', cat: 'side', price: 600, rate: 0.06, flash: 'small', recoil: 1, shake: 0.6, snd: 'nail', st: [1, 5, 3, 1], tip: 'Staples the page to itself. Very fast, very small.' },
    { id: 'flare', does: 'Sticks where it lands and keeps the fire going', name: 'Flare Gun', cat: 'side', price: 1200, rate: 0.6, flash: 'fire', recoil: 2, shake: 2, snd: 'flare', st: [2, 2, 3, 4], tip: 'A burning flare that sticks and sets everything around it on fire.' },
    { id: 'smg', does: 'Every hit knocks a letter loose', name: 'SMG', cat: 'auto', price: 0, rate: 0.055, flash: 'small', shell: true, recoil: 1.4, shake: 0.8, snd: 'smg', st: [2, 5, 3, 2], tip: 'Hold to shred text into confetti.' },
    { id: 'rifle', does: 'Pierces through five layers of text', name: 'Assault Rifle', cat: 'auto', price: 700, rate: 0.095, flash: 'big', shell: true, recoil: 2, shake: 1.6, snd: 'rifle', st: [3, 4, 5, 2], tip: 'Accurate, punchy, goes through a few lines at once.' },
    { id: 'minigun', does: 'Spins up into a wall of lead that pushes you around', name: 'Minigun', cat: 'auto', price: 3500, rate: 0.028, flash: 'big', shell: true, recoil: 2.5, shake: 2.2, snd: 'minigun', spin: true, st: [3, 5, 4, 4], tip: 'Spin up, then a wall of lead. Pushes you backwards.' },
    { id: 'shotgun', does: 'Fire downward to shotgun jump', name: 'Shotgun', cat: 'shot', price: 0, rate: 0.7, flash: 'big', shell: true, recoil: 5, shake: 7, kick: 130, snd: 'shotgun', st: [4, 2, 2, 3], tip: 'Spray of pellets. Fire downward for a shotgun jump.' },
    { id: 'double', does: 'Two barrels at once: launches you across the page', name: 'Double Barrel', cat: 'shot', price: 1100, rate: 1.05, flash: 'big', recoil: 7, shake: 11, kick: 230, snd: 'double', st: [5, 1, 2, 4], tip: 'Both barrels at once. Launches you across the page.' },
    { id: 'flak', does: 'Bursts in mid air into shrapnel', name: 'Flak Cannon', cat: 'shot', price: 2200, rate: 0.8, flash: 'big', recoil: 5, shake: 5, kick: 60, snd: 'flak', st: [4, 2, 4, 4], tip: 'A shell that bursts into a cloud of shrapnel mid-air.' },
    { id: 'confetti', does: 'Paints the page in party colours', name: 'Confetti Cannon', cat: 'shot', price: 800, rate: 0.5, flash: 'pink', recoil: 3, shake: 3, kick: 50, snd: 'confetti', st: [2, 3, 2, 5], tip: 'Party time. Paints the page and pokes tiny holes.' },
    { id: 'sniper', does: 'Triple damage on enemies and three walls deep', name: 'Sniper Rifle', cat: 'prec', price: 1500, rate: 1.1, flash: 'big', shell: true, recoil: 6, shake: 6, kick: 60, snd: 'sniper', st: [4, 1, 5, 2], tip: 'Laser sight, one shot, three walls deep.' },
    { id: 'railgun', does: 'Charges, then pierces the whole page and the layers behind it', name: 'Railgun', cat: 'prec', price: 3000, rate: 1.15, flash: 'energy', recoil: 8, shake: 14, kick: 180, snd: 'rail', st: [5, 1, 5, 3], tip: 'Charges, then pierces the entire page edge to edge.', charge: 0.45 },
    { id: 'crossbow', does: 'Bolts skewer whole words in one shot', name: 'Crossbow', cat: 'prec', price: 1000, rate: 0.62, recoil: 2, shake: 2, snd: 'twang', st: [3, 2, 4, 2], tip: 'Bolts skewer whole words and knock every letter loose.' },
    { id: 'harpoon', does: 'Spears a chunk and yanks it toward you', name: 'Harpoon', cat: 'prec', price: 1800, rate: 1, recoil: 4, shake: 3, snd: 'harpoon', st: [3, 2, 4, 4], tip: 'Spears a chunk of the page and yanks it toward you.' },
    { id: 'laser', does: 'Melts even metal in a clean beam', name: 'Laser', cat: 'energy', price: 1600, hold: true, loop: 'laser', flash: 'pink', st: [3, 5, 5, 2], tip: 'Melts a clean tunnel wherever you point it.' },
    { id: 'plasma', does: 'Neat craters with no fire', name: 'Plasma Rifle', cat: 'energy', price: 2000, rate: 0.33, flash: 'pink', recoil: 3, shake: 3, snd: 'plasma', st: [4, 3, 4, 3], tip: 'Hot purple balls that pop into neat craters.' },
    { id: 'tesla', does: 'Chain lightning that hops between letters and conducts through metal', name: 'Tesla Coil', cat: 'energy', price: 2600, rate: 0.13, flash: 'energy', recoil: 1, shake: 1.5, snd: 'tesla', st: [3, 4, 3, 5], tip: 'Chain lightning that arcs from letter to letter.' },
    { id: 'freeze', does: 'Turns the page to ice that shatters in one hit', name: 'Freeze Ray', cat: 'energy', price: 1900, hold: true, loop: 'freeze', st: [2, 5, 3, 4], tip: 'Turns pixels to ice. Ice shatters. Beautifully.' },
    { id: 'sound', does: 'A cone shockwave that shoves enemies and chunks away', name: 'Sound Cannon', cat: 'energy', price: 2400, rate: 0.9, recoil: 5, shake: 8, kick: 90, snd: 'sound', st: [3, 2, 3, 5], tip: 'A shockwave cone that rattles everything loose.' },
    { id: 'eraser', does: 'Rubs out every layer, straight through to the desktop', name: 'Pixel Eraser', cat: 'energy', price: 1300, hold: true, loop: 'eraser', st: [3, 5, 3, 1], tip: 'Ctrl+Z for reality. Rubs out pixels wherever you aim.' },
    { id: 'glitch', does: 'Scrambles rows of pixels and corrupts colours', name: 'Glitch Gun', cat: 'energy', price: 4200, rate: 0.28, flash: 'pink', recoil: 2, shake: 3, snd: 'glitch', st: [3, 3, 4, 5], tip: 'Corrupts the page. Rows tear, colours scramble, pixels flee.' },
    { id: 'flame', does: 'Sets paper and wood on fire, and fire spreads', name: 'Flamethrower', cat: 'chem', price: 1400, hold: true, loop: 'flame', st: [3, 5, 2, 5], tip: 'Pixels catch fire, fire spreads, the page smoulders.' },
    { id: 'acid', does: 'Drips and eats downward, slowly corrodes metal', name: 'Acid Sprayer', cat: 'chem', price: 1700, hold: true, loop: 'acid', st: [3, 4, 2, 4], tip: 'Green goo that drips and eats its way downward.' },
    { id: 'paint', does: 'Recolours anything without breaking it', name: 'Paint Gun', cat: 'chem', price: 500, rate: 0.085, flash: 'pink', recoil: 1, shake: 0.5, snd: 'paint', st: [1, 5, 3, 3], tip: 'Recolours the internet. Vandalism, technically.' },
    { id: 'lava', does: 'Molten blobs that melt straight down', name: 'Lava Launcher', cat: 'chem', price: 2800, rate: 0.26, flash: 'fire', recoil: 2, shake: 2, snd: 'lava', st: [4, 3, 3, 5], tip: 'Lobs molten blobs that melt straight down through the page.' },
    { id: 'water', does: 'Washes rubble away, soaks paper to mush, puts out fire, aim down to hover', name: 'Water Cannon', cat: 'chem', price: 600, hold: true, loop: 'water', st: [1, 5, 3, 3], tip: 'Washes rubble away and puts out fires. Aim down to fly.' },
    { id: 'grenade', does: 'Bouncy timed explosive', name: 'Grenades', cat: 'boom', price: 0, rate: 0.5, throw: true, snd: 'pin', st: [4, 2, 3, 3], tip: 'Bouncy, then boom.' },
    { id: 'rocket', does: 'Big crater and the classic rocket jump', name: 'Rocket Launcher', cat: 'boom', price: 1200, rate: 0.62, flash: 'fire', recoil: 5, shake: 3, kick: 30, snd: 'rocket', st: [5, 2, 4, 4], tip: 'Big craters and the classic rocket jump.' },
    { id: 'homing', does: 'Four missiles hunt down your aim point', name: 'Homing Missiles', cat: 'boom', price: 2700, rate: 0.9, flash: 'fire', recoil: 3, shake: 3, snd: 'launch', st: [4, 2, 5, 4], tip: 'Four little missiles that hunt down whatever you point at.' },
    { id: 'cluster', does: 'One bomb splits into seven', name: 'Cluster Bomb', cat: 'boom', price: 1600, rate: 0.9, throw: true, snd: 'rattle', st: [4, 1, 3, 5], tip: 'One bomb becomes seven bombs. Maths!' },
    { id: 'sticky', does: 'Stick to anything, even enemies. ALT blows them all', name: 'Sticky Bombs', cat: 'boom', price: 1500, rate: 0.3, throw: true, snd: 'squelch', st: [4, 3, 3, 4], tip: 'They stick. Press ALT to blow them all, or wait.', alt: 'Detonate all' },
    { id: 'mine', does: 'Waits for anything to wander close', name: 'Proximity Mines', cat: 'boom', price: 1100, rate: 0.45, throw: true, snd: 'clankMine', st: [4, 2, 2, 4], tip: 'Arm, wait, boom when anything wanders close. ALT detonates.', alt: 'Detonate all' },
    { id: 'firework', does: 'Bursts into burning stars that light everything', name: 'Fireworks', cat: 'boom', price: 1400, rate: 0.55, flash: 'pink', recoil: 2, shake: 2, snd: 'firework', st: [3, 2, 4, 5], tip: 'A rocket that bursts into burning stars.' },
    { id: 'nuke', does: 'Erases a whole region down to the desktop', name: 'Pocket Nuke', cat: 'boom', price: 9000, rate: 7, flash: 'fire', recoil: 6, shake: 4, snd: 'nukeLaunch', st: [5, 1, 4, 5], tip: 'Do not aim this at anything you love.' },
    { id: 'hammer', does: 'Smash the floor to pogo upward', name: 'Giant Hammer', cat: 'melee', price: 0, rate: 0.36, melee: true, snd: 'heave', st: [4, 3, 1, 3], tip: 'Smash. Hit the floor to pogo upward.' },
    { id: 'chainsaw', does: 'Continuous carving up close', name: 'Chainsaw', cat: 'melee', price: 1500, hold: true, loop: 'saw', melee: true, st: [3, 5, 1, 3], tip: 'Carves right through, up close and personal.' },
    { id: 'katana', does: 'Clean cuts: sliced pieces fall away whole', name: 'Katana', cat: 'melee', price: 1000, rate: 0.26, melee: true, snd: 'slash', st: [3, 4, 2, 3], tip: 'Clean cuts. Sliced pieces fall away in one piece.' },
    { id: 'drill', does: 'Pulls you forward through anything', name: 'Power Drill', cat: 'melee', price: 2000, hold: true, loop: 'drill', melee: true, st: [3, 5, 1, 2], tip: 'Pulls you forward through anything. Tunnel time.' },
    { id: 'wrecking', does: 'A ball on a chain that you swing with momentum', name: 'Wrecking Ball', cat: 'melee', price: 2600, hold: true, loop: 'chain', melee: true, st: [5, 3, 2, 4], tip: 'A ball on a chain. Hold fire to swing it toward your aim.' },
    { id: 'portal', does: 'Things that go in come out the other side', name: 'Portal Gun', cat: 'gadget', price: 2200, rate: 0.35, flash: 'energy', snd: 'portal', st: [1, 3, 5, 4], tip: 'Blue, then orange. Things that go in come out. ALT clears.', alt: 'Clear portals' },
    { id: 'gravity', does: 'Rip out a chunk and throw it', name: 'Gravity Gun', cat: 'gadget', price: 3200, hold: true, loop: 'grav', st: [4, 3, 3, 5], tip: 'Hold to rip out a chunk, let go to throw it.' },
    { id: 'magnet', does: 'Strips letters off the page and flings them back', name: 'Magnet', cat: 'gadget', price: 1800, hold: true, loop: 'magnet', st: [2, 4, 3, 4], tip: 'Rips letters off the page. Let go to fling them back.' },
    { id: 'ballgun', does: 'Rubber balls that speed up every time they bounce', name: 'Bouncy Balls', cat: 'gadget', price: 900, rate: 0.16, flash: 'pink', recoil: 1, shake: 0.6, snd: 'ball', st: [2, 4, 4, 4], tip: 'Rubber balls that ricochet and chip away at everything.' },
    { id: 'boomerang', does: 'Carves on the way out and on the way back', name: 'Boomerang', cat: 'gadget', price: 700, rate: 0.3, throw: true, snd: 'boomerang', st: [3, 3, 3, 3], tip: 'Out and back again, carving both ways.' },
    { id: 'blackhole', does: 'Swallows everything nearby, then pops', name: 'Black Hole', cat: 'gadget', price: 6000, rate: 2.4, throw: true, snd: 'warpThrow', st: [5, 1, 3, 5], tip: 'Swallows letters, debris and the occasional hero.' },
    { id: 'snowball', does: 'Freezes a patch for a follow up shot', name: 'Snowballs', cat: 'gadget', price: 300, rate: 0.22, throw: true, snd: 'snowThrow', st: [1, 4, 3, 2], tip: 'Freezes a little patch. Follow up with anything.' },
    { id: 'banana', does: 'Splits into five exploding bananas', name: 'Banana Bomb', cat: 'gadget', price: 450, rate: 1.2, throw: true, snd: 'banana', st: [4, 1, 3, 5], tip: 'Splits into five smaller bananas. All of them explode.' },
    { id: 'airstrike', does: 'Throw a flare, a bomb line follows', name: 'Airstrike', cat: 'disaster', price: 3800, rate: 1.8, throw: true, snd: 'flarePop', st: [5, 1, 5, 5], tip: 'Throw a flare. Bombs follow shortly after.' },
    { id: 'orbital', does: 'A column of light that drills to the bottom of the page', name: 'Orbital Laser', cat: 'disaster', price: 7000, rate: 4, throw: true, snd: 'beep', st: [5, 1, 5, 5], tip: 'Throw a beacon. Space answers with a column of light.' },
    { id: 'meteor', does: 'Rains burning rocks around your aim', name: 'Meteor Shower', cat: 'disaster', price: 5000, rate: 4, call: true, snd: 'meteor', st: [5, 1, 5, 5], tip: 'Rains burning rocks around your aim point.' },
    { id: 'bees', does: 'A swarm that eats letters and chases enemies', name: 'Bee Swarm', cat: 'disaster', price: 3000, rate: 3, call: true, snd: 'buzz', st: [3, 1, 5, 4], tip: 'Fourteen hungry bees with a taste for typography.' },
    { id: 'tornado', does: 'A funnel that sucks up everything it touches', name: 'Tornado', cat: 'disaster', price: 4500, rate: 5, call: true, snd: 'tornadoCall', st: [4, 1, 4, 5], tip: 'A funnel that rips through the page, sucking everything up.' },
    { id: 'whip', does: 'Long reach crack that yanks letters, chunks and enemies toward you, and swings you from ceilings', name: 'Bullwhip', cat: 'melee', price: 0, rate: 0.36, melee: true, snd: 'whipWind', st: [3, 3, 4, 4], tip: 'Crack it at the page. The tip yanks things to you. Crack it at a ceiling in the air to swing.' },
    { id: 'glove', does: 'Punches a whole chunk out of the page as a flying projectile', name: 'Spring Glove', cat: 'melee', price: 1300, rate: 0.5, melee: true, snd: 'springPunch', st: [4, 2, 1, 4], tip: 'Boing. The punched chunk flies off and explodes on impact.' },
    { id: 'saw', does: 'Blades embed in soft stuff and keep grinding, ricochet off metal', name: 'Saw Launcher', cat: 'side', price: 1400, rate: 0.42, flash: 'small', recoil: 2, shake: 2, snd: 'sawShot', st: [3, 3, 4, 4], tip: 'Spinning blades that bite into the page and keep chewing.' },
    { id: 'backspace', does: 'Deletes text letter by letter along a line, never touches anything else', name: 'Backspace', cat: 'energy', price: 700, rate: 0.5, flash: 'energy', recoil: 1, shake: 1, snd: 'backspace', st: [2, 3, 5, 2], tip: 'A text cursor that deletes every letter in its path. Typing in reverse.' },
    { id: 'cutter', does: 'Cuts a clean rectangle out of the page, then pastes it wherever you throw it', name: 'Ctrl+X', cat: 'gadget', price: 1600, rate: 0.35, snd: 'cut', st: [3, 2, 3, 4], tip: 'Fire to cut a selection, fire again to paste it at speed. ALT pastes it gently.', alt: 'Paste in place' },
    { id: 'vacuum', does: 'Sucks up rubble and debris as ammo, then blasts it back out', name: 'Shop Vac', cat: 'gadget', price: 1200, hold: true, loop: 'vacuum', st: [3, 4, 3, 3], tip: 'Hold to clean up the mess, let go to fire the mess back. Recycling!', alt: 'Blow it out' },
    { id: 'pen', does: 'Draws solid ink you can stand on: build bridges, walls and stairs', name: 'Ink Pen', cat: 'gadget', price: 500, hold: true, loop: 'pen', st: [1, 4, 3, 3], tip: 'Hold to draw solid ink lines. Make your own platforms, then wreck them too.' },
    { id: 'bowling', does: 'A heavy ball that rolls and plows a long trench', name: 'Bowling Ball', cat: 'boom', price: 900, rate: 0.9, throw: true, snd: 'bowlThrow', st: [4, 1, 4, 3], tip: 'Roll it along a line of text. Strike!' },
    { id: 'lightning', does: 'Strikes from the sky and conducts through every connected bit of metal', name: 'Storm Staff', cat: 'disaster', price: 3400, rate: 1.3, call: true, snd: 'thunder', st: [4, 2, 5, 5], tip: 'Calls lightning down on your aim. Metal carries the shock.' },
    { id: 'termites', does: 'Bugs that eat wood and paper, and ignore metal and stone', name: 'Termite Jar', cat: 'chem', price: 1500, rate: 1.4, throw: true, snd: 'jar', st: [3, 1, 3, 5], tip: 'Smash the jar. The termites do the rest, one bite at a time.' },
    { id: 'antigrav', does: 'Makes everything nearby float, then slams it all back down', name: 'Anti-Gravity Bomb', cat: 'boom', price: 2600, rate: 1.4, throw: true, snd: 'agravThrow', st: [3, 1, 3, 5], tip: 'Loose bits float up for three seconds, then come crashing down.' },
    { id: 'lens', does: 'Focuses sunlight into a tiny dot: anything you hold it on smokes, then burns', name: 'Magnifying Glass', cat: 'chem', price: 650, hold: true, loop: 'lens', st: [2, 5, 4, 4], tip: 'Hold it steady. Paper smokes, then catches. Very precise, very slow, very satisfying.' },
    { id: 'stamp', does: 'Slams a giant DENIED stamp into the page and punches the letters clean out', name: 'Rubber Stamp', cat: 'melee', price: 1100, rate: 0.75, melee: true, snd: 'stampW', st: [4, 2, 1, 4], tip: 'Bureaucracy, weaponised. Every hit punches a word shaped hole.' },
    { id: 'blower', does: 'Blasts rubble, loose letters, chunks and enemies away. Wind, not damage', name: 'Leaf Blower', cat: 'gadget', price: 750, hold: true, loop: 'blower', st: [1, 5, 3, 4], tip: 'Clear the mess, shove the enemies, clear your path. Aim down to hover a little.' },
    { id: 'quake', does: 'Shakes loose anything that is not attached', name: 'Earthquake', cat: 'disaster', price: 4000, rate: 6, call: true, snd: 'quake', st: [4, 1, 5, 5], tip: 'Shakes the whole page until loose things fall off.' }
  ];
  const BY = {};
  D.forEach((d, i) => { d.idx = i; d.sprite = SP.WEAPON[d.id] || SP.WEAPON.pistol; BY[d.id] = d; });
  const upg = (id) => WTP.save.upg?.[id] | 0;
  const upCost = (id, lv) => { const d = BY[id]; return Math.round((Math.max(300, d.price * 0.55) * [1, 1.8, 3][lv]) / 50) * 50; };
  let curLv = 0;
  const R = { dmgMul: 1 };
  function setPow(lv) { curLv = lv | 0; W().powMul = 1 + 0.15 * curLv; R.dmgMul = 1 + 0.25 * curLv; }

  const st = { whip: null, latch: null, cut: null, tank: 0, tankCols: [], blowing: 0, ink: 1, penLast: null, zones: [], glove: 0, kickCd: 0, thermals: [], cur: 'pistol', cd: 0, spin: 0, charge: 0, mag: {}, reload: 0, held: null, heldT: 0, ball: null, portals: [], portalNext: 0, stickies: [], mines: [], boomers: 0, dualSide: 0, katanaDir: 1, was: false, quakeT: 0, tornados: [], beam: null, orb: [], paintIdx: 0, ammo: null, nukeT: 0 };
  const shots = [];
  const owned = (id) => WTP.game?.allWeapons?.() || BY[id].price === 0 || !!WTP.save.owned[id];

  function aimPoint(o) {
    const G0 = G();
    if (G0 && G0.mouseWorld && WTP.input.aim.src === 'mouse' && WTP.input.mouse.in) return G0.mouseWorld();
    const r = W().raycast(o.x, o.y, o.ax, o.ay, 140);
    return { x: r.x, y: r.y };
  }
  function addShot(s) {
    s.age = 0;
    if (s.lv == null) s.lv = curLv;
    s.from = s.from || 'p';
    shots.push(s);
    if (shots.length > 700) shots.shift();
    return s;
  }
  function bullet(o, spread, speed, r, dmg, extra = {}) {
    const a = Math.atan2(o.ay, o.ax) + rand(-spread, spread);
    return addShot(Object.assign({ t: 'bullet', x: o.x, y: o.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1.4, r, dmg, pierce: 0, spr: 'bullet' }, extra));
  }
  function lob(o, type, speed, extra = {}) {
    const a = Math.atan2(o.ay, o.ax);
    const P = PL();
    return addShot(Object.assign({ t: type, x: o.x, y: o.y, vx: Math.cos(a) * speed + P.vx * 0.35, vy: Math.sin(a) * speed - 30, life: 6, spin: 0 }, extra));
  }

  function explode(x, y, r, o = {}) {
    const Wd = W();
    const n = Wd.carve(x, y, r, { debris: 0.45, force: 110 + r * 3, scorch: o.scorch !== false, back: r >= 9 ? (o.back ?? 0.72) : 0.4, code: r >= 30 ? 0.6 : r >= 16 ? 0.35 : 0, letters: o.letters ?? Math.min(16, r * 0.7), ignite: o.fire ?? 0.12, cause: o.cause || 'boom', crumbleR: 6 + r * 0.25, pow: 2 + r * 0.25 });
    st.thermals.push({ x, y, r, k: Math.min(1, r / 20) });
    if (st.thermals.length > 12) st.thermals.shift();
    WTP.props?.damageAt?.(x, y, r, r * 3);
    FX().explosion(x, y, r, o.kind || 'fire');
    FX().blast(x, y, r * 3, 260);
    const g = G();
    g?.shake?.(Math.min(32, 3 + r * 0.75));
    if (r >= 16) g?.hitstop?.(Math.min(0.12, 0.025 + r * 0.0012));
    if (r >= 40) g?.slowmo?.(0.3, 1.1);
    if (r >= 24) FX().flash(Math.min(0.9, r / 70), o.kind === 'ice' ? '#8fe3ff' : o.kind === 'plasma' ? '#d07bff' : '#fff3b0');
    if (r >= 30) g?.chroma?.(Math.min(1, r / 60));
    const P = PL(), pc = P.center();
    const dx = pc.x - x, dy = pc.y - y, d = Math.hypot(dx, dy);
    if (d < r * 2.4 && !o.noPush) { const f = (1 - d / (r * 2.4)) * (260 + r * 4); P.impulse((dx / (d || 1)) * f * 0.85, (dy / (d || 1)) * f - 50); }
    for (const c of Wd.chunks) {
      const qx = c.x - x, qy = c.y - y, qd = Math.hypot(qx, qy) || 1;
      if (qd < r * 3) { const f = (1 - qd / (r * 3)) * 300; c.vx += (qx / qd) * f; c.vy += (qy / qd) * f - 60; c.va += rand(-3, 3); c.rest = 0; }
    }
    EN()?.damageCircle?.(x, y, r * 1.35, o.dmg ?? r * 4, 'boom');
    for (const m of st.mines) if (!m.dead && Math.hypot(m.x - x, m.y - y) < r + 6) m.trig = Math.min(m.trig ?? 0.12, 0.12);
    A(o.sound || 'boom', r);
    g?.stat?.('explosions', 1);
    WTP.vibe(Math.min(120, 20 + r * 2));
    return n;
  }

  const FIRE = {
    pistol(o) { bullet(o, 0.015, 560, 3.6, 12); },
    revolver(o) {
      const m = st.mag.revolver ?? 6;
      if (m <= 0) return false;
      st.mag.revolver = m - 1;
      bullet(o, 0.005, 760, 5.5, 45, { pierce: 22, spr: 'bigbullet' });
      if (st.mag.revolver === 0) { st.reload = 1; st.reloadFor = 'revolver'; G()?.label?.('RELOADING', 700); setTimeout(() => A('rack'), 500); }
    },
    dual(o) {
      st.dualSide ^= 1;
      const nx = -o.ay * (st.dualSide ? 2.5 : -2.5), ny = o.ax * (st.dualSide ? 2.5 : -2.5);
      bullet({ ...o, x: o.x + nx, y: o.y + ny }, 0.05, 580, 3.1, 9, { ric: 1 });
    },
    nailgun(o) { bullet(o, 0.04, 680, 1.7, 5, { spr: 'nail', nail: true, life: 0.9 }); },
    flare(o) { lob(o, 'flare', 300, { life: 6, burnT: 3, spr: 'flare' }); },
    smg(o) { bullet(o, 0.09, 600, 2.9, 7, { popAll: true }); },
    rifle(o) { bullet(o, 0.028, 740, 3.4, 14, { pierce: 5 }); },
    minigun(o) {
      bullet(o, 0.12, rand(580, 660), 2.9, 7);
      const P = PL();
      P.vx -= o.ax * 9; if (!P.ground) P.vy -= o.ay * 7;
    },
    shotgun(o) { for (let k = 0; k < 9; k++) bullet(o, 0.27, rand(380, 520), 3.4, 9, { life: rand(0.25, 0.38), spr: 'pellet' }); },
    double(o) { for (let k = 0; k < 17; k++) bullet(o, 0.33, rand(360, 560), 3.6, 10, { life: rand(0.22, 0.36), spr: 'pellet' }); },
    flak(o) { const s = lob(o, 'flak', 420, { life: 0.3, spr: 'flak', g: 120 }); s.vy += 30; },
    confetti(o) {
      for (let k = 0; k < 22; k++) {
        const a = Math.atan2(o.ay, o.ax) + rand(-0.35, 0.35), sp = rand(200, 420);
        addShot({ t: 'confetti', x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.45), col: P32[pick(['e', 'y', 'l', 'c', 'k', 'P', 'o'])], dmg: 4 });
        FX().confetti(o.x, o.y, Math.cos(a) * sp * 0.5, Math.sin(a) * sp * 0.5);
      }
    },
    sniper(o) { hitscan(o, 520, 2.4, 80, 420, P32.y); },
    railgun(o) { hitscan(o, 2000, 3.3, 99999, 200, P32.C, true); },
    crossbow(o) { addShot({ t: 'bolt', x: o.x, y: o.y, vx: o.ax * 540, vy: o.ay * 540, life: 2, g: 60, spr: 'bolt', pierce: 46, dmg: 35 }); },
    harpoon(o) { addShot({ t: 'harpoon', x: o.x, y: o.y, vx: o.ax * 480, vy: o.ay * 480, life: 1.2, g: 80, spr: 'harpoon', dmg: 30 }); },
    plasma(o) { addShot({ t: 'plasma', x: o.x, y: o.y, vx: o.ax * 270, vy: o.ay * 270, life: 2.5, spr: 'plasma', dmg: 40 }); },
    tesla(o) { tesla(o); },
    sound(o) { soundWave(o); },
    glitch(o) { addShot({ t: 'glitch', x: o.x, y: o.y, vx: o.ax * 420, vy: o.ay * 420, life: 1.5, dmg: 25 }); },
    paint(o) {
      const cols = ['k', 'c', 'y', 'l', 'P', 'o', 'e', 't'];
      const c = P32[cols[st.paintIdx++ % cols.length]];
      for (let k = 0; k < 2; k++) { const a = Math.atan2(o.ay, o.ax) + rand(-0.06, 0.06), sp = rand(330, 400); addShot({ t: 'paint', x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.2, g: 160, col: c, dmg: 2 }); }
    },
    lava(o) { lob(o, 'lavab', 320, { life: 3, g: 420, dmg: 20 }); },
    grenade(o) { lob(o, 'grenade', 240, { fuse: 1.5, spr: 'grenade', g: 520, bounce: 0.5 }); },
    rocket(o) { addShot({ t: 'rocket', x: o.x, y: o.y, vx: o.ax * 150, vy: o.ay * 150, life: 4, spr: 'rocket', dmg: 80 }); PL().vx -= o.ax * 30; },
    homing(o) {
      const tp = aimPoint(o);
      for (let k = 0; k < 4; k++) {
        const a = Math.atan2(o.ay, o.ax) + (k - 1.5) * 0.35;
        addShot({ t: 'missile', x: o.x, y: o.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 40, life: 4, spr: 'missile', tx: tp.x + rand(-14, 14), ty: tp.y + rand(-10, 10), delay: 0.12 + k * 0.05, dmg: 40 });
      }
    },
    cluster(o) { lob(o, 'cluster', 250, { fuse: 1.3, spr: 'cluster', g: 520, bounce: 0.4 }); },
    sticky(o) {
      if (st.stickies.length >= 8) { G()?.label?.('ALT TO DETONATE', 900); return false; }
      const s = lob(o, 'sticky', 280, { fuse: 5, spr: 'sticky', g: 480 });
      st.stickies.push(s);
    },
    mine(o) {
      if (st.mines.length >= 8) st.mines[0].trig = 0.01;
      const s = lob(o, 'mine', 170, { spr: 'mine', g: 520, arm: 0.8, life: 60 });
      st.mines.push(s);
    },
    firework(o) { addShot({ t: 'firework', x: o.x, y: o.y, vx: o.ax * 220, vy: o.ay * 220 - 40, life: 0.85, spr: 'firework', dmg: 20 }); },
    nuke(o) { addShot({ t: 'nuke', x: o.x, y: o.y, vx: o.ax * 120, vy: o.ay * 120 - 20, life: 6, g: 60, spr: 'nuke', dmg: 999 }); G()?.label?.('NUCLEAR LAUNCH DETECTED', 1400); },
    hammer(o) { hammer(o); },
    katana(o) { katana(o); },
    portal(o) { addShot({ t: 'portal', x: o.x, y: o.y, vx: o.ax * 520, vy: o.ay * 520, life: 1.2, which: st.portalNext, spr: st.portalNext ? 'portalO' : 'portalB' }); st.portalNext ^= 1; },
    ballgun(o) { addShot({ t: 'ball', x: o.x, y: o.y, vx: o.ax * 330 + rand(-10, 10), vy: o.ay * 330, life: 7, g: 300, spr: 'ball', bounces: 12, dmg: 10 }); },
    boomerang(o) {
      if (st.boomers >= 2) return false;
      st.boomers++;
      addShot({ t: 'boomerang', x: o.x, y: o.y, vx: o.ax * 340, vy: o.ay * 340, life: 3, spr: 'boomerang', out: 0.45, dmg: 25, spin: 0 });
    },
    blackhole(o) { lob(o, 'bhole', 190, { life: 9, spr: 'blackhole', g: 0, drag: true }); },
    snowball(o) { lob(o, 'snow', 300, { life: 3, spr: 'snowball', g: 380, dmg: 8 }); },
    banana(o) { lob(o, 'banana', 240, { fuse: 1.6, spr: 'banana', g: 520, bounce: 0.35, big: true }); },
    airstrike(o) { lob(o, 'aflare', 230, { fuse: 1.2, spr: 'flare', g: 520, life: 9 }); },
    orbital(o) { lob(o, 'beacon', 230, { fuse: 1.2, spr: 'beacon', g: 520, life: 6 }); },
    meteor(o) {
      const tp = aimPoint(o);
      const top = G()?.camTop?.() ?? tp.y - 120;
      for (let k = 0; k < 12; k++) addShot({ t: 'meteor', x: tp.x + rand(-70, 70) - 60, y: top - 30 - k * 18, vx: 90 + rand(-20, 20), vy: 160, life: 8, delay: k * 0.18, spr: 'meteor', dmg: 60 });
      G()?.event?.('METEOR SHOWER!', tp.x, tp.y - 30);
    },
    bees(o) {
      for (let k = 0; k < 14; k++) addShot({ t: 'bee', x: o.x, y: o.y, vx: rand(-80, 80) + o.ax * 120, vy: rand(-80, 40) + o.ay * 120, life: 8, spr: 'bee', tx: null, eat: 0, dmg: 6 });
      WTP.audio.loop('bees', true);
    },
    tornado(o) {
      const tp = aimPoint(o);
      st.tornados.push({ x: tp.x, y: tp.y, dir: o.ax >= 0 ? 1 : -1, t: 0, life: 5.5 });
      G()?.event?.('TORNADO!', tp.x, tp.y - 30);
    },
    whip(o) {
      const P = PL();
      st.whip = { t: 0, dur: 0.34, ang: Math.atan2(o.ay, o.ax), dir: P.face, len: 40 * (1 + 0.12 * curLv), cracked: false, pts: [], hitE: new Set(), lv: curLv };
      st.swing = 0.3; st.swingDir = P.face;
    },
    glove(o) {
      st.glove = 0.22;
      const cx = o.x + o.ax * 7, cy = o.y + o.ay * 7;
      const Wd = W();
      const e = EN()?.nearest?.(cx, cy, 12);
      if (e) { e.damage(55, 'glove'); if (!e.T.boss) { e.vx = o.ax * 340; e.vy = o.ay * 340 - 120; e.stun = 0.6; } A('punch'); G()?.shake?.(5); G()?.hitstop?.(0.05); return; }
      const c = Wd.grabDisk(cx + o.ax * 3, cy + o.ay * 3, 6.5 + curLv);
      if (c) { Wd.releaseChunk(c, o.ax * 640 + PL().vx * 0.3, o.ay * 640 - 60); A('punch'); G()?.shake?.(6); G()?.hitstop?.(0.04); G()?.event?.('POW!', cx, cy - 6, 1); }
      else { const n = Wd.carve(cx, cy, 5, { debris: 0.6, force: 160, pow: 3, cause: 'glove', pop: 1 }); if (n) A('punch'); }
      PL().vx -= o.ax * 40;
    },
    saw(o) { addShot({ t: 'saw', x: o.x, y: o.y, vx: o.ax * 340, vy: o.ay * 340, life: 4, dmg: 40, spin: 0, grind: 0 }); },
    backspace(o) { addShot({ t: 'cursor', x: o.x, y: o.y, vx: o.ax * 230, vy: o.ay * 230, life: 1.6, dmg: 45, ate: 0, blink: 0 }); },
    cutter(o) {
      const Wd = W();
      if (st.cut) {
        const c = st.cut; st.cut = null;
        Wd.releaseChunk(c, o.ax * 560 + PL().vx * 0.4, o.ay * 560 - 40);
        A('paste'); G()?.stat?.('throws', 1); G()?.shake?.(3);
        return;
      }
      const tp = aimPoint(o);
      let dx = tp.x - o.x, dy = tp.y - o.y; const d = Math.hypot(dx, dy) || 1;
      const k = d > 70 ? 70 / d : 1;
      const x = o.x + dx * k, y = o.y + dy * k;
      const hw = Math.round(9 + curLv * 2), hh = Math.round(6 + curLv);
      const c = Wd.grabRect(Math.round(x - hw), Math.round(y - hh), Math.round(x + hw), Math.round(y + hh));
      FX().beam([x - hw, y - hh, x + hw, y + hh], { kind: 'select', life: 0.35 });
      if (c) { st.cut = c; A('cut'); G()?.event?.('CUT!', x, y - hh - 4, 1); }
      else { A('deny'); return false; }
    },
    bowling(o) { lob(o, 'bowl', 230, { life: 7, spr: 'bowl', g: 620, dmg: 60, hits: 0, roll: 0 }); },
    lightning(o) {
      const Wd = W();
      const tp = aimPoint(o);
      const x = Math.max(1, Math.min(Wd.w - 2, tp.x));
      const top = (G()?.camTop?.() ?? 0) - 20;
      let y = Math.max(0, Math.floor(top));
      while (y < Wd.h - 3 && !Wd.solid(Math.floor(x), y) && !(EN()?.at?.(x, y, 2))) y++;
      const pts = [x + rand(-3, 3), top];
      let cx = pts[0];
      for (let yy = top + 8; yy < y; yy += rand(6, 12)) { cx += rand(-6, 6); pts.push(cx, yy); }
      pts.push(x, y);
      FX().beam(pts, { kind: 'bolt', life: 0.22, c2: P32.C });
      for (let k = 0; k < 2; k++) { const bp = [x, y - rand(10, 30)]; FX().bolt(x, y - 20, x + rand(-24, 24), y + rand(-6, 10)); }
      FX().flash(0.35, '#fff3b0');
      const e = EN()?.at?.(x, y, 4);
      if (e) e.damage(90, 'lightning');
      Wd.carve(x, y + 2, 7, { debris: 0.6, force: 150, cause: 'lightning', pow: 4, scorch: true, ignite: 0.3, letters: 6 });
      EN()?.damageCircle?.(x, y, 16, 50, 'lightning');
      conduct(Math.floor(x), Math.min(Wd.h - 4, y + 1));
      G()?.shake?.(7); G()?.hitstop?.(0.05);
      st.thermals.push({ x, y, r: 20, k: 1 });
    },
    stamp(o) {
      const Wd = W();
      const words = ['DENIED', 'VOID', 'REJECTED', 'DELETED', 'NOPE', 'SPAM'];
      const word = words[st.stampIdx = ((st.stampIdx || 0) + 1) % words.length];
      const tp = WTP.levels.textPixels(word, '7');
      const reach = 10 + tp.w / 2;
      const cx = o.x + o.ax * reach, cy = o.y + o.ay * reach;
      const sc = curLv >= 2 ? 3 : 2;
      const x0 = Math.round(cx - (tp.w * sc) / 2), y0 = Math.round(cy - (tp.h * sc) / 2);
      let n = 0;
      for (let ty = 0; ty < tp.h; ty++) for (let tx = 0; tx < tp.w; tx++) {
        if (!tp.on[ty * tp.w + tx]) continue;
        for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) {
          const x = x0 + tx * sc + sx, y = y0 + ty * sc + sy;
          if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue;
          const i = y * Wd.w + x;
          if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.ICE || Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) n += Wd.kill(i, x, y, cx, cy, 0.5, 70);
          else if (Wd.back[i]) { Wd.back[i] = 0; Wd.touch(i); }
        }
      }
      const fx0 = x0 - 3, fy0 = y0 - 3, fx1 = x0 + tp.w * sc + 2, fy1 = y0 + tp.h * sc + 2;
      for (let y = fy0; y <= fy1; y++) for (let x = fx0; x <= fx1; x++) {
        if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue;
        const edge = x <= fx0 + 1 || x >= fx1 - 1 || y <= fy0 + 1 || y >= fy1 - 1;
        const i = y * Wd.w + x;
        if (Wd.mat[i] !== Wd.SOLID) { if (edge && Wd.back[i] && (hash(x, y) & 7) !== 0) { Wd.bcol[i] = WTP.mix(Wd.bcol[i], P32.e, 0.75); Wd.touch(i); } continue; }
        if (edge && (hash(x, y) & 7) !== 0) { Wd.col[i] = WTP.mix(Wd.col[i], P32.e, 0.8); Wd.touch(i); }
        else if (!edge && (hash(x, y) & 3) === 0) { Wd.col[i] = WTP.mix(Wd.col[i], P32.e, 0.25); Wd.touch(i); }
      }
      Wd.crumble(cx, cy, 0, tp.w * sc * 0.6 + 6);
      EN()?.damageCircle?.(cx, cy, tp.w * sc * 0.5, 70, 'stamp');
      FX().pop(cx, y0 - 4, `${word}!`, { scale: 1, ramp: ['7', 'e', 'R'], life: 0.8 });
      st.swing = 0.25; st.swingDir = PL().face;
      if (n) { G()?.scored?.(n, cx, cy, 'stamp'); G()?.shake?.(6); G()?.hitstop?.(0.05); }
      PL().vx -= o.ax * 40;
    },
    termites(o) { lob(o, 'jar', 260, { life: 4, spr: 'jar', g: 520 }); },
    antigrav(o) { lob(o, 'agrav', 250, { fuse: 1.1, spr: 'agrav', g: 520, bounce: 0.45 }); },
    quake() { st.quakeT = 2.8; A('quake'); G()?.event?.('EARTHQUAKE!', PL().x, PL().y - 30); }
  };

  const HOLD = {
    lens(o, dt) {
      const tp = aimPoint(o);
      const dx = tp.x - o.x, dy = tp.y - o.y, d = Math.hypot(dx, dy) || 1;
      const k = d > 60 ? 60 / d : 1;
      let x = o.x + dx * k, y = o.y + dy * k;
      const r = W().raycast(o.x, o.y, dx / d, dy / d, d * k);
      if (r.hit) { x = r.x; y = r.y; }
      const L = st.lensAt;
      if (L && Math.hypot(L.x - x, L.y - y) < 3) L.heat = Math.min(1.6, L.heat + dt * (1 + upg('lens') * 0.3)); else st.lensAt = { x, y, heat: 0 };
      const H = st.lensAt;
      H.x = x; H.y = y;
      FX().beam([o.x + o.ax * 3, o.y + o.ay * 3, x, y], { kind: 'sight', life: 0.03, c1: P32.Y });
      if (H.heat > 0.25 && Math.random() < H.heat * 0.6) FX().smoke(x, y - 1, 1, P32['5']);
      if (H.heat > 0.6) {
        if (Math.random() < 0.5) FX().spark(x, y, rand(-20, 20), rand(-40, -5), Math.random() < 0.5 ? P32.Y : P32.o, 0.2);
        if ((H.t = (H.t || 0) - dt) <= 0) {
          H.t = 0.08;
          W().carve(x, y, 1.6 + H.heat, { debris: 0.2, force: 20, scorch: true, ignite: 0.2, cause: 'lens', pop: 0.4, noCrumble: Math.random() < 0.7 });
          if (H.heat > 1) W().igniteAt(Math.floor(x), Math.floor(y), 3);
        }
        EN()?.damageCircle?.(x, y, 4, 40 * dt * H.heat, 'fire');
      }
    },
    blower(o, dt) {
      const Wd = W();
      const base = Math.atan2(o.ay, o.ax);
      for (let k = 0; k < 3; k++) { const a = base + rand(-0.25, 0.25); FX().pix(o.x, o.y, Math.cos(a) * rand(160, 260), Math.sin(a) * rand(160, 260), Math.random() < 0.5 ? P32['6'] : P32.L, 0.25); }
      for (let k = 0; k < 36; k++) {
        const a = base + rand(-0.4, 0.4), dd = rand(2, 70);
        const x = Math.floor(o.x + Math.cos(a) * dd), y = Math.floor(o.y + Math.sin(a) * dd);
        if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); FX().debris(x + 0.5, y + 0.5, Math.cos(a) * rand(160, 280), Math.sin(a) * rand(160, 280) - 40, c, { ns: true }); }
        else if (Wd.mat[i] === Wd.SOLID && Wd.kind[i] === Wd.K_TEXT && Wd.gid[i] && Math.random() < 0.012 * (1 + upg('blower'))) Wd.detachGlyph(Wd.gid[i], Math.cos(a) * 220, Math.sin(a) * 220 - 40);
        else if (Wd.burn[i] && Math.random() < 0.3) { Wd.burn[i] = 1; }
      }
      for (const c of Wd.chunks) { const dx = c.x - o.x, dy = c.y - o.y, dd = Math.hypot(dx, dy) || 1; if (dd < 90 && (dx * o.ax + dy * o.ay) / dd > 0.75) { c.vx += o.ax * 900 * dt / Math.max(1, Math.sqrt(c.n) * 0.2); c.vy += o.ay * 900 * dt - 200 * dt; c.rest = 0; } }
      for (const e of EN()?.list || []) { if (e.dead || e.T.boss) continue; const dx = e.x - o.x, dy = e.y - o.y, dd = Math.hypot(dx, dy) || 1; if (dd < 80 && (dx * o.ax + dy * o.ay) / dd > 0.7) { e.vx += o.ax * 700 * dt; e.vy += o.ay * 700 * dt; e.stun = Math.max(e.stun || 0, 0.15); } }
      const P = PL(); P.vx -= o.ax * 160 * dt; if (o.ay > 0.6) P.vy = Math.min(P.vy, P.vy - 900 * dt);
      FX().beam([o.x + o.ax * 4, o.y + o.ay * 4, base], { kind: 'cone', life: 0.03, r: 70, spread: 0.4 });
    },
    laser(o, dt) {
      const r = W().raycast(o.x, o.y, o.ax, o.ay, 260, 0.5);
      const e = EN()?.rayHit?.(o.x, o.y, o.ax, o.ay, Math.hypot(r.x - o.x, r.y - o.y));
      const ex = e ? e.x : r.x, ey = e ? e.y : r.y;
      FX().beam([o.x, o.y, ex, ey], { kind: 'laser', life: 0.03, c1: P32['7'], c2: P32.k });
      if (e) e.enemy.damage(90 * dt, 'laser');
      else if (r.hit) {
        W().carve(r.x + o.ax * 0.8, r.y + o.ay * 0.8, 3.8, { debris: 0.25, force: 50, scorch: true, ignite: 0.02, cause: 'laser', pop: 0.3 });
        if (Math.random() < 0.6) FX().spark(r.x, r.y, rand(-60, 60) - o.ax * 40, rand(-80, 10) - o.ay * 40, Math.random() < 0.5 ? P32.Y : P32.k);
        if (Math.random() < 0.2) FX().smoke(r.x, r.y, 1);
        G()?.shake?.(1);
      }
    },
    freeze(o, dt) {
      const r = W().raycast(o.x, o.y, o.ax, o.ay, 150, 0.6);
      for (let k = 0; k < 3; k++) { const a = Math.atan2(o.ay, o.ax) + rand(-0.12, 0.12), sp = rand(150, 260); FX().pix(o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp, Math.random() < 0.5 ? P32.C : P32['7'], 0.3); }
      FX().beam([o.x, o.y, r.x, r.y], { kind: 'tractor', life: 0.03, c1: P32.C, c2: P32['7'] });
      EN()?.damageCircle?.(r.x, r.y, 8, 30 * dt, 'freeze');
      if (r.hit) { const n = W().freezeAt(r.x + o.ax * 2, r.y + o.ay * 2, 5.5); if (n) A('freezeHit'); }
    },
    eraser(o, dt) {
      const tp = aimPoint(o);
      const d = Math.hypot(tp.x - o.x, tp.y - o.y);
      const k = d > 90 ? 90 / d : 1;
      const x = o.x + (tp.x - o.x) * k, y = o.y + (tp.y - o.y) * k;
      st.eraserAt = { x, y };
      const n = W().carve(x, y, 5, { square: true, debris: 0, clean: true, cause: 'eraser', pop: 0.15, noCrumble: Math.random() < 0.6 });
      W().eraseBack(x, y, 3);
      EN()?.damageCircle?.(x, y, 7, 50 * dt, 'eraser');
      if (n) for (let q = 0; q < 2; q++) FX().pix(x + rand(-5, 5), y + rand(-5, 5), rand(-30, 30), rand(-40, 0), Math.random() < 0.5 ? P32.K : P32.k, 0.5);
    },
    flame(o) {
      for (let k = 0; k < 3; k++) {
        const a = Math.atan2(o.ay, o.ax) + rand(-0.2, 0.2), s = rand(160, 240);
        addShot({ t: 'flame', x: o.x, y: o.y, vx: Math.cos(a) * s + PL().vx * 0.3, vy: Math.sin(a) * s, life: rand(0.32, 0.5), dmg: 1.2 });
      }
    },
    acid(o) {
      for (let k = 0; k < 2; k++) { const a = Math.atan2(o.ay, o.ax) + rand(-0.1, 0.1), s = rand(180, 250); FX().acid(o.x, o.y, Math.cos(a) * s, Math.sin(a) * s); }
      const r = W().raycast(o.x, o.y, o.ax, o.ay, 80);
      EN()?.damageCircle?.(r.x, r.y, 10, 0.6, 'acid');
    },
    water(o, dt) {
      for (let k = 0; k < 4; k++) { const a = Math.atan2(o.ay, o.ax) + rand(-0.08, 0.08), s = rand(260, 340); FX().water(o.x, o.y, Math.cos(a) * s, Math.sin(a) * s); }
      const P = PL();
      P.vx -= o.ax * 380 * dt; P.vy -= o.ay * 900 * dt;
      if (o.ay > 0.6 && P.vy < -140) P.vy = -140;
      const r = W().raycast(o.x, o.y, o.ax, o.ay, 120, 0.6);
      if (r.hit) {
        const Wd = W();
        for (let k = 0; k < 10; k++) {
          const x = Math.floor(r.x + rand(-4, 4)), y = Math.floor(r.y + rand(-4, 4));
          if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue;
          const i = y * Wd.w + x;
          if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); FX().debris(x + 0.5, y + 0.5, o.ax * 200 + rand(-40, 40), o.ay * 200 - rand(10, 60), c, { ns: true }); }
          if (Wd.burn[i]) { Wd.burn[i] = 0; FX().smoke(x, y, 1, P32['6']); A('sizzle'); }
          else if (Wd.mat[i] === Wd.SOLID && (Wd.mtl[i] === Wd.M.PAPER || Wd.mtl[i] === Wd.M.INK || Wd.mtl[i] === Wd.M.IMAGE) && Math.random() < 0.12) { const c = Wd.col[i]; if (Wd.kill(i, x, y, x, y, 0, 0)) { G()?.scored?.(1, -1, -1, 'water'); FX().water(x + 0.5, y + 0.5, rand(-20, 20), rand(10, 40)); if (Math.random() < 0.3) FX().paper(x, y, rand(-20, 20), rand(0, 30), c); } }
        }
        for (const c of Wd.chunks) if (Math.hypot(c.x - r.x, c.y - r.y) < c.rad + 8) { c.vx += o.ax * 600 * dt; c.vy += o.ay * 600 * dt - 200 * dt; c.rest = 0; }
      }
      EN()?.push?.(r.x, r.y, 14, o.ax * 400 * dt, o.ay * 400 * dt);
    },
    chainsaw(o) {
      const cx = o.x + o.ax * 4, cy = o.y + o.ay * 4;
      const n = W().carve(cx, cy, 4.8, { debris: 0.5, force: 90, cause: 'saw', pop: 0.4 });
      st.swing = 0.05;
      EN()?.damageCircle?.(cx, cy, 8, 4, 'saw');
      if (n) {
        G()?.shake?.(2.5);
        PL().vx += o.ax * 6;
        for (let z = 0; z < 2; z++) FX().spark(cx, cy, -o.ax * rand(40, 120) + rand(-40, 40), rand(-110, -20), Math.random() < 0.5 ? P32.Y : P32.a, rand(0.12, 0.3));
        WTP.vibe(8);
      }
    },
    drill(o, dt) {
      const cx = o.x + o.ax * 3, cy = o.y + o.ay * 3;
      const n = W().carve(cx, cy, 5.5, { debris: 0.4, force: 70, cause: 'drill', pop: 0.5, crumbleR: 3 });
      EN()?.damageCircle?.(cx, cy, 8, 3, 'drill');
      const P = PL();
      if (n) {
        P.vx += o.ax * 900 * dt; P.vy += o.ay * 700 * dt - 400 * dt;
        G()?.shake?.(1.8);
        for (let z = 0; z < 2; z++) FX().spark(cx, cy, -o.ax * rand(40, 140) + rand(-30, 30), -o.ay * rand(40, 140) + rand(-30, 30), Math.random() < 0.5 ? P32['6'] : P32.y, 0.25);
        WTP.vibe(6);
      }
      st.drillSpin = (st.drillSpin || 0) + dt * 30;
    },
    gravity(o, dt) {
      const Wd = W();
      if (!st.held) {
        st.grabT = (st.grabT || 0) + dt;
        const r = Wd.raycast(o.x, o.y, o.ax, o.ay, 90, 0.7);
        FX().beam([o.x, o.y, r.x, r.y], { kind: 'tractor', life: 0.03 });
        let best = null, bd = 1e9;
        for (const c of Wd.chunks) { const d = Math.hypot(c.x - r.x, c.y - r.y); if (d < c.rad + 10 && d < bd) { bd = d; best = c; } }
        if (best) { Wd.chunks.splice(Wd.chunks.indexOf(best), 1); best.held = true; st.held = best; A('grab'); }
        else if (r.hit && st.grabT > 0.12) { const c = Wd.grabDisk(r.x + o.ax * 6, r.y + o.ay * 6, 9.5); if (c) { st.held = c; A('grab'); G()?.shake?.(4); } st.grabT = 0; }
      }
      if (st.held) {
        const c = st.held;
        const tx = o.x + o.ax * (c.rad + 8), ty = o.y + o.ay * (c.rad + 8);
        c.vx = (tx - c.x) * 18; c.vy = (ty - c.y) * 18;
        c.x += c.vx * dt; c.y += c.vy * dt; c.a += dt * 2;
        FX().beam([o.x, o.y, c.x, c.y], { kind: 'tractor', life: 0.03 });
        if (Math.random() < 0.3) FX().spark(c.x + rand(-c.rad, c.rad), c.y + rand(-c.rad, c.rad), 0, -20, P32.y, 0.2);
      }
    },
    magnet(o, dt) {
      const Wd = W();
      const base = Math.atan2(o.ay, o.ax);
      let got = 0;
      for (let k = 0; k < 18; k++) {
        const a = base + rand(-0.35, 0.35), d = rand(2, 85);
        const x = Math.floor(o.x + Math.cos(a) * d), y = Math.floor(o.y + Math.sin(a) * d);
        if (x < 0 || x >= Wd.w || y < 0 || y >= Wd.h - 3) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID && Wd.kind[i] === Wd.K_TEXT && Wd.gid[i] && Math.random() < 0.18) {
          const gr = Wd.groups[Wd.gid[i]];
          const dx = o.x - (gr.x0 + gr.x1) / 2, dy = o.y - (gr.y0 + gr.y1) / 2, dd = Math.hypot(dx, dy) || 1;
          got += Wd.detachGlyph(Wd.gid[i], (dx / dd) * 160, (dy / dd) * 160 - 40);
        } else if (Wd.mat[i] === Wd.SOLID && Math.random() < 0.2) {
          const c = Wd.col[i];
          got += Wd.kill(i, x, y, x, y, 0, 0);
          FX().mag(x + 0.5, y + 0.5, c);
        } else if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) {
          const c = Wd.col[i];
          Wd.kill(i, x, y, x, y, 0, 0);
          FX().mag(x + 0.5, y + 0.5, c);
        }
      }
      FX().magnetize(o.x, o.y, o.ax, o.ay, 90);
      for (const c of Wd.chunks) {
        const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
        if (d < 110 && (dx * o.ax + dy * o.ay) < 0) { c.vx += (dx / d) * 700 * dt; c.vy += (dy / d) * 700 * dt - 560 * dt * 0.8; c.rest = 0; }
      }
      if (got) G()?.scored?.(got, -1, -1, 'magnet');
      FX().beam([o.x + o.ax * 5, o.y + o.ay * 5, o.x + o.ax * 70, o.y + o.ay * 70], { kind: 'tractor', life: 0.03, c1: P32.e, c2: P32.c });
      EN()?.pull?.(o.x, o.y, 90, 400 * dt);
    },
    wrecking(o, dt) { st.ballPull = true; },
    vacuum(o, dt) {
      const Wd = W();
      const base = Math.atan2(o.ay, o.ax);
      let got = 0;
      for (let k = 0; k < 40; k++) {
        const a = base + rand(-0.45, 0.45), d = rand(3, 72);
        const x = Math.floor(o.x + Math.cos(a) * d), y = Math.floor(o.y + Math.sin(a) * d);
        if (x < 0 || x >= Wd.w || y < 0 || y >= Wd.h - 3) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) {
          const c = Wd.col[i];
          Wd.kill(i, x, y, x, y, 0, 0);
          FX().suck(x + 0.5, y + 0.5, rand(-20, 20), rand(-20, 20), c, o.x, o.y, 0.8);
          if (st.tank < 400) { st.tank++; st.tankCols.push(c); if (st.tankCols.length > 60) st.tankCols.shift(); }
          got++;
        }
      }
      FX().suckAll(o.x, o.y, 70, 0.6);
      for (let k = Wd.chunks.length - 1; k >= 0; k--) {
        const c = Wd.chunks[k];
        const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
        if (d < 80 && c.n < 160) { c.vx += (dx / d) * 900 * dt; c.vy += (dy / d) * 900 * dt - 560 * dt; c.rest = 0; if (d < c.rad + 6) { Wd.chunks.splice(k, 1); st.tank = Math.min(400, st.tank + c.n); for (let q = 0; q < 6; q++) st.tankCols.push(c.cols[(Math.random() * c.n) | 0]); A('slurp'); } }
      }
      EN()?.pull?.(o.x, o.y, 70, 260 * dt);
      EN()?.damageCircle?.(o.x + o.ax * 6, o.y + o.ay * 6, 6, 30 * dt, 'vacuum');
      if (got) A('slurp');
      FX().beam([o.x + o.ax * 4, o.y + o.ay * 4, base], { kind: 'cone', life: 0.03, r: 70, spread: 0.45 });
    },
    pen(o, dt) {
      const Wd = W();
      const tp = aimPoint(o);
      let dx = tp.x - o.x, dy = tp.y - o.y; const d = Math.hypot(dx, dy) || 1;
      const k = d > 64 ? 64 / d : 1;
      const x = o.x + dx * k, y = o.y + dy * k;
      st.penAt = { x, y };
      if (st.ink <= 0.01) { st.penLast = null; return; }
      const from = st.penLast || { x, y };
      const len = Math.hypot(x - from.x, y - from.y);
      const n = Math.max(1, Math.ceil(len));
      const th = 1 + (curLv >= 2 ? 1 : 0);
      const P = PL();
      for (let s2 = 0; s2 <= n; s2++) {
        const px = from.x + (x - from.x) * (s2 / n), py = from.y + (y - from.y) * (s2 / n);
        for (let a = -th; a <= th; a++) for (let b = -th; b <= th; b++) {
          if (a * a + b * b > th * th + 0.5) continue;
          const cx = Math.floor(px + a), cy = Math.floor(py + b);
          if (cx < 0 || cy < 0 || cx >= Wd.w || cy >= Wd.h - 3) continue;
          if (P.inside(cx, cy)) continue;
          const i = cy * Wd.w + cx;
          if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.ROCK) continue;
          Wd.setCell(cx, cy, (hash(cx, cy) & 7) === 0 ? P32.c : (hash(cx, cy) & 3) ? P32.n : P32.b, Wd.M.INKPEN, 64);
          Wd.touch(i);
        }
      }
      st.ink = Math.max(0, st.ink - len * 0.004 - dt * 0.05);
      st.penLast = { x, y };
      if (len > 0.5 && Math.random() < 0.3) FX().pix(x, y, rand(-20, 20), rand(-20, 10), P32.c, 0.3);
    },
  };
  const RELEASE = {
    gravity(o) {
      if (!st.held) return;
      const c = st.held;
      st.held = null;
      W().releaseChunk(c, o.ax * 460 + PL().vx * 0.5, o.ay * 460 - 30);
      A('fling'); G()?.shake?.(5); G()?.stat?.('throws', 1);
      PL().impulse(-o.ax * 60, -o.ay * 40);
    },
    magnet(o) { FX().fling(o.ax, o.ay, 380); A('fling'); },
    vacuum() { if (st.tank > 0) { st.blowing = st.tank; st.tank = 0; A('blowOut'); } },
    pen() { st.penLast = null; }
  };
  const ALT = {
    sticky() { if (!st.stickies.length) return; st.stickies.forEach((s, k) => { s.fuse = 0.05 + k * 0.07; }); st.stickies = []; A('beep'); },
    mine() { st.mines.forEach((m, k) => { m.trig = 0.05 + k * 0.08; }); A('beep'); },
    portal() { st.portals = []; A('portalOut'); },
    cutter(o) { if (!st.cut) return; const c = st.cut; st.cut = null; W().releaseChunk(c, 0, 0); c.thrown = false; A('paste'); },
    vacuum() { if (st.tank > 0) { st.blowing = st.tank; st.tank = 0; A('blowOut'); } }
  };

  function hitscan(o, range, r, depth, dmg, col, all) {
    const Wd = W();
    let x = o.x, y = o.y, solidN = 0, n = 0, k = 0;
    const x0 = x, y0 = y;
    const hitE = new Set();
    while (Math.hypot(x - x0, y - y0) < range && x > -4 && x < Wd.w + 4 && y > -150 && y < Wd.h) {
      const s = Wd.solid(Math.floor(x), Math.floor(y));
      if (s) {
        solidN++;
        if (solidN > depth) break;
        n += Wd.carve(x, y, r, { debris: 0.35, force: 140, scorch: true, noCrumble: true, cause: 'pierce', pop: 0.8, back: all ? 0.5 : 0 });
        if (++k % 10 === 0) n += Wd.crumble(x, y, 2, 12);
      }
      const e = EN()?.at?.(x, y, r + 2);
      if (e && !hitE.has(e)) { hitE.add(e); e.damage(dmg, 'pierce'); }
      x += o.ax * 1.5; y += o.ay * 1.5;
    }
    FX().beam([x0, y0, x, y], { kind: 'rail', life: all ? 0.55 : 0.3, c1: P32['7'], c2: col, c3: all ? P32.C : P32.a, w: all ? 4 : 2 });
    for (let q = 0; q < (all ? 50 : 20); q++) { const t = Math.random(); FX().spark(x0 + (x - x0) * t, y0 + (y - y0) * t, rand(-30, 30), rand(-30, 30), Math.random() < 0.5 ? col : P32['7'], rand(0.2, 0.5)); }
    const P = PL();
    if (all) { P.impulse(-o.ax * 170, -o.ay * 140); G()?.hitstop?.(0.06); G()?.chroma?.(0.5); }
    if (n > 40) FX().pop((x0 + x) / 2, (y0 + y) / 2, `PIERCE +${n}`, { scale: 1, ramp: ['7', 'C', 'c'] });
    if (n) G()?.scored?.(0, x, y, 'pierce');
  }
  function tesla(o) {
    const Wd = W();
    const pts = [];
    let cx = o.x, cy = o.y;
    const base = Math.atan2(o.ay, o.ax);
    const visited = new Set();
    let tgt = EN()?.nearest?.(cx, cy, 110, base, 0.6);
    let first = tgt ? { x: tgt.x, y: tgt.y, e: tgt } : null;
    if (!first) {
      let best = null, bd = 1e9;
      for (let k = 0; k < 50; k++) {
        const a = base + rand(-0.45, 0.45), d = rand(10, 110);
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (Wd.frontAt(Math.floor(x), Math.floor(y))) { const sc = d - (Wd.kind[Math.floor(y) * Wd.w + Math.floor(x)] === Wd.K_TEXT ? 25 : 0); if (sc < bd) { bd = sc; best = { x, y }; } }
      }
      first = best;
    }
    if (!first) {
      const r = Wd.raycast(o.x, o.y, o.ax, o.ay, 90);
      FX().bolt(o.x, o.y, r.x, r.y);
      return;
    }
    let cur = first;
    for (let hop = 0; hop < 6 && cur; hop++) {
      FX().bolt(cx, cy, cur.x, cur.y);
      pts.push(cur);
      if (cur.e) cur.e.damage(28, 'tesla');
      else {
        const i = Math.floor(cur.y) * Wd.w + Math.floor(cur.x);
        if (Wd.kind[i] === Wd.K_TEXT && Wd.gid[i] && Math.random() < 0.7) Wd.detachGlyph(Wd.gid[i], rand(-60, 60), rand(-120, -40));
        Wd.carve(cur.x, cur.y, 3.2, { debris: 0.3, force: 70, scorch: true, cause: 'tesla', ignite: 0.05 });
        for (let z = 0; z < 3; z++) FX().spark(cur.x, cur.y, rand(-80, 80), rand(-80, 40), Math.random() < 0.5 ? P32.C : P32['7'], 0.2);
      }
      cx = cur.x; cy = cur.y;
      visited.add(`${Math.floor(cx / 8)},${Math.floor(cy / 8)}`);
      const e2 = EN()?.nearest?.(cx, cy, 45);
      if (e2 && e2 !== cur.e) { cur = { x: e2.x, y: e2.y, e: e2 }; continue; }
      let nb = null, nd = 1e9;
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * Math.PI * 2, d = rand(8, 42);
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        const key = `${Math.floor(x / 8)},${Math.floor(y / 8)}`;
        if (visited.has(key)) continue;
        if (!Wd.frontAt(Math.floor(x), Math.floor(y))) continue;
        const isT = Wd.kind[Math.floor(y) * Wd.w + Math.floor(x)] === Wd.K_TEXT;
        const sc = d - (isT ? 20 : 0);
        if (sc < nd) { nd = sc; nb = { x, y }; }
      }
      cur = nb;
    }
    G()?.shake?.(2);
  }
  function soundWave(o) {
    st.waves = st.waves || [];
    st.waves.push({ x: o.x, y: o.y, a: Math.atan2(o.ay, o.ax), t: 0, r: 0 });
    FX().beam([o.x, o.y, Math.atan2(o.ay, o.ax)], { kind: 'wave', life: 0.4, r: 120, spread: 0.6 });
    FX().blast(o.x + o.ax * 40, o.y + o.ay * 40, 70, 300);
  }
  function hammer(o) {
    st.swing = 0.22; st.swingDir = PL().face;
    const cx = o.x + o.ax * 7, cy = o.y + o.ay * 7;
    const n = W().carve(cx, cy, 12.5, { debris: 0.55, force: 150, cause: 'hammer', letters: 6 });
    EN()?.damageCircle?.(cx, cy, 15, 50, 'hammer');
    if (n) {
      G()?.shake?.(10); G()?.hitstop?.(0.05);
      A('hammer');
      FX().anim('ring', 32, cx, cy, 0.2);
      const P = PL();
      if (o.ay > 0.45) { P.vy = Math.min(P.vy, -230); P.ground = false; P.jumps = 1; }
      else P.vx -= o.ax * 70;
      WTP.vibe(30);
    }
  }
  function katana(o) {
    st.katanaDir *= -1;
    st.swing = 0.18; st.swingDir = st.katanaDir;
    const base = Math.atan2(o.ay, o.ax);
    const Wd = W();
    let n = 0;
    const R = PL().dashT > 0 ? 26 : 19;
    const span = 1.1;
    for (let r = R - 3; r <= R; r += 1.5) {
      for (let a = -span; a <= span; a += 0.05) {
        const ang = base + a * st.katanaDir;
        n += Wd.carve(o.x - o.ax * 6 + Math.cos(ang) * r, o.y - o.ay * 6 + Math.sin(ang) * r, 0.9, { debris: 0.12, force: 60, noCrumble: true, pop: 0, cause: 'katana' });
      }
    }
    n += Wd.crumble(o.x, o.y, 0, R + 6);
    for (let k = 0; k < 4; k++) { const a = base + rand(-span, span); Wd.letterRing(o.x + Math.cos(a) * R * 0.6, o.y + Math.sin(a) * R * 0.6, 0, 5, 120); }
    EN()?.damageCircle?.(o.x + o.ax * 12, o.y + o.ay * 12, R, 45, 'katana');
    FX().anims.push({ slash: true, x: o.x - o.ax * 4, y: o.y - o.ay * 4, a: base, dir: st.katanaDir, t: 0, dur: 0.16, r: R });
    if (n) { G()?.shake?.(3); G()?.hitstop?.(0.03); A('impact'); }
  }

  function conduct(x0, y0) {
    const Wd = W();
    let start = -1;
    for (let dy = -2; dy <= 3 && start < 0; dy++) for (let dx = -2; dx <= 2; dx++) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue; const i = y * Wd.w + x; if (Wd.mat[i] === Wd.SOLID && Wd.mtl[i] === Wd.M.METAL) { start = i; break; } }
    if (start < 0) return 0;
    const seen = new Set([start]);
    const q = [start];
    for (let h = 0; h < q.length && q.length < 900; h++) {
      const i = q[h];
      for (const j of [i - 1, i + 1, i - Wd.w, i + Wd.w]) if (j >= 0 && j < Wd.n && !seen.has(j) && Wd.mat[j] === Wd.SOLID && Wd.mtl[j] === Wd.M.METAL) { seen.add(j); q.push(j); }
    }
    for (let k = 0; k < Math.min(40, q.length / 6); k++) {
      const i = q[(Math.random() * q.length) | 0];
      const x = i % Wd.w, y = (i / Wd.w) | 0;
      FX().spark(x + 0.5, y + 0.5, rand(-50, 50), rand(-70, 10), Math.random() < 0.5 ? P32.C : P32['7'], 0.35);
      if (k % 4 === 0) { EN()?.damageCircle?.(x, y, 8, 35, 'shock'); WTP.props?.damageAt?.(x, y, 6, 10); }
    }
    for (let k = 0; k < q.length; k += 7) { const i = q[k]; const x = i % Wd.w, y = (i / Wd.w) | 0; if (Math.random() < 0.5) Wd.carve(x + 0.5, y + 0.5, 1.2, { pow: 2, debris: 0.3, force: 40, cause: 'shock', noCrumble: true, pop: 0 }); }
    if (q.length > 30) { G()?.event?.('CONDUCTED!', x0, y0 - 10, 1); A('zap'); }
    return q.length;
  }
  function melee(o) {
    if (st.kickCd > 0) return;
    st.kickCd = 0.26;
    const P = PL();
    const ax = o.ax, ay = o.ay;
    P.kickT = 0.24; P.kickDir = ay > 0.6 ? 1 : ay < -0.6 ? -1 : 0;
    if (Math.abs(ax) > 0.2) P.face = ax > 0 ? 1 : -1;
    const lv = curLv; setPow(0);
    const Wd = W();
    let n = 0;
    const ext = Math.abs(ax) * P.w / 2 + Math.abs(ay) * P.h / 2;
    n += Wd.carve(o.x + ax * (ext + 1), o.y + ay * (ext + 1), 4.6, { pow: 3.2, debris: 0.6, force: 150, cause: 'kick', pop: 0.9, crumbleR: 6 });
    n += Wd.carve(o.x + ax * (ext + 6), o.y + ay * (ext + 6), 3.8, { pow: 2.6, debris: 0.5, force: 130, cause: 'kick', pop: 0.7, noCrumble: true });
    n += Wd.carve(o.x + ax * (ext + 10), o.y + ay * (ext + 10), 2.6, { pow: 2, debris: 0.4, force: 110, cause: 'kick', pop: 0.5, noCrumble: true });
    const x0 = Math.floor(Math.min(P.x, P.x + ax * 9)), x1 = Math.ceil(Math.max(P.x + P.w, P.x + P.w + ax * 9)), y0 = Math.floor(Math.min(P.y, P.y + ay * 9)), y1 = Math.ceil(Math.max(P.y + P.h, P.y + P.h + ay * 9));
    P.kickSoft(x0, y0, x1, y1, ax || P.face, ay - 0.5);
    const hx = o.x + ax * (ext + 5), hy = o.y + ay * (ext + 5);
    const hit = EN()?.damageCircle?.(hx, hy, 9, 24, 'kick') || 0;
    for (const e of EN()?.list || []) if (!e.dead && !e.T.boss && Math.hypot(e.x - hx, e.y - hy) < 12) { e.vx = ax * 260; e.vy = ay * 200 - 120; e.stun = Math.max(e.stun || 0, 0.4); }
    for (const c of Wd.chunks) { const d = Math.hypot(c.x - hx, c.y - hy); if (d < c.rad + 8) { c.vx += ax * (420 / Math.max(1, Math.sqrt(c.n) * 0.25)); c.vy += ay * 300 - 160; c.va += rand(-4, 4); c.rest = 0; c.thrown = c.n < 300; } }
    WTP.props?.damageAt?.(hx, hy, 8, 20);
    if (ay > 0.6 && !P.ground) { P.vy = Math.min(P.vy, -160); }
    else if (n) P.vx -= ax * 30;
    FX().anims.push({ kick: true, x: o.x + ax * 5, y: o.y + ay * 5, a: Math.atan2(ay, ax), t: 0, dur: 0.14 });
    if (n || hit) { G()?.shake?.(3.5); G()?.hitstop?.(0.035); A('kickHit'); WTP.vibe(18); } else A('kick');
    G()?.stat?.('kicks', 1);
    setPow(lv);
  }
  function updateWhip(dt, o) {
    const w = st.whip;
    if (!w) return;
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    const hx = o.hx, hy = o.hy;
    const ext = k < 0.5 ? Math.sin((k / 0.5) * Math.PI / 2) : 1 - (k - 0.5) * 1.3;
    const L = w.len * Math.max(0.15, ext);
    const N = 14;
    const pts = [];
    const wind = (1 - k) * 1.6 * w.dir;
    for (let i = 0; i <= N; i++) {
      const s2 = i / N;
      const a = w.ang - wind * (1 - s2) * 0.6 + Math.sin((s2 * 2.2 - k * 3) * Math.PI) * 0.35 * (1 - k) * w.dir;
      const prev = i ? pts[i - 1] : { x: hx, y: hy };
      const seg = L / N;
      pts.push(i ? { x: prev.x + Math.cos(a) * seg, y: prev.y + Math.sin(a) * seg } : { x: hx, y: hy });
    }
    w.pts = pts;
    const tip = pts[N];
    const Wd = W();
    setPow(w.lv);
    if (k > 0.18 && k < 0.75) {
      for (let i = 4; i <= N; i += 2) {
        const p = pts[i];
        const ix = Math.floor(p.x), iy = Math.floor(p.y);
        const e = EN()?.at?.(p.x, p.y, 2);
        if (e && !w.hitE.has(e)) {
          w.hitE.add(e);
          e.damage(i >= N - 2 ? 42 : 20, 'whip');
          if (!e.T.boss) { const pc = PL().center(); const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = (dx / d) * 280; e.vy = (dy / d) * 220 - 90; e.stun = 0.5; }
          A('whipHit');
        }
        if (Wd.solid(ix, iy)) {
          const isTip = i >= N - 2;
          const ii = iy * Wd.w + ix;
          if (isTip && Wd.kind[ii] === Wd.K_TEXT && Wd.gid[ii]) {
            const pc = PL().center(); const dx = pc.x - p.x, dy = pc.y - p.y, d = Math.hypot(dx, dy) || 1;
            Wd.detachGlyph(Wd.gid[ii], (dx / d) * 260, (dy / d) * 220 - 80);
            G()?.stat?.('letters', 1);
          } else Wd.carve(p.x, p.y, isTip ? 2.6 : 1.5, { pow: isTip ? 2.6 : 1.4, debris: 0.5, force: 110, cause: 'whip', pop: 0.8, noCrumble: !isTip });
          if (isTip && !w.latched && !PL().ground && Math.sin(w.ang) < -0.25 && Wd.hardAt(ix, iy) && WTP.input.wantFire()) {
            w.latched = true;
            const pc = PL().center();
            st.latch = { x: p.x, y: p.y, ax: ix, ay: iy, len: Math.max(10, Math.hypot(pc.x - p.x, pc.y - p.y)), t: 1.4 };
            A('hookHit'); G()?.label?.('SWING!', 500);
          }
        }
      }
      for (const c of Wd.chunks) { const d = Math.hypot(c.x - tip.x, c.y - tip.y); if (d < c.rad + 3) { const pc = PL().center(); const dx = pc.x - c.x, dy = pc.y - c.y, dd = Math.hypot(dx, dy) || 1; c.vx = (dx / dd) * 300; c.vy = (dy / dd) * 260 - 120; c.rest = 0; } }
    }
    if (!w.cracked && k >= 0.48) {
      w.cracked = true;
      A('whipCrack');
      FX().anim('ring', 10, tip.x, tip.y, 0.14);
      for (let q = 0; q < 8; q++) FX().spark(tip.x, tip.y, rand(-90, 90), rand(-90, 90), Math.random() < 0.5 ? P32['7'] : P32.Y, 0.18);
      Wd.carve(tip.x, tip.y, 3.2, { pow: 3, debris: 0.6, force: 160, cause: 'crack', letters: 3 });
      EN()?.damageCircle?.(tip.x, tip.y, 6, 25, 'whip');
      G()?.shake?.(2.5); G()?.hitstop?.(0.02);
    }
    if (w.t >= w.dur) st.whip = null;
  }
  function updateLatch(dt) {
    const L = st.latch;
    if (!L) return;
    const P = PL(), Wd = W();
    L.t -= dt;
    if (L.t <= 0 || !WTP.input.wantFire() || !Wd.hardAt(L.ax, L.ay) || P.ground) { if (!Wd.hardAt(L.ax, L.ay)) A('snap'); st.latch = null; return; }
    const pc = P.center();
    const dx = pc.x - L.x, dy = pc.y - L.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
    if (d > L.len) { const vr = P.vx * nx + P.vy * ny; if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; } P.vx -= nx * (d - L.len) * 14; P.vy -= ny * (d - L.len) * 14; }
    L.len = Math.max(8, L.len - 20 * dt);
    P.vx += P.face * 120 * dt;
  }
  function updateZones(dt) {
    const Wd = W();
    for (let k = st.zones.length - 1; k >= 0; k--) {
      const z = st.zones[k];
      z.t += dt;
      const slam = z.t > z.life;
      for (const c of Wd.chunks) { const d = Math.hypot(c.x - z.x, c.y - z.y); if (d < z.r) { if (slam) { c.vy = 520; c.thrown = c.n < 400; } else { c.vy = c.vy * 0.9 - 700 * dt; c.vx *= 0.97; c.va += rand(-1, 1) * dt * 4; } c.rest = 0; } }
      for (const e of EN()?.list || []) { if (e.dead || e.T.boss) continue; const d = Math.hypot(e.x - z.x, e.y - z.y); if (d < z.r) { if (slam) { e.vy = 420; e.damage(40, 'slam'); } else { e.vy = e.vy * 0.9 - 500 * dt; e.stun = 0.2; } } }
      const P = PL(), pc = P.center();
      if (Math.hypot(pc.x - z.x, pc.y - z.y) < z.r && !slam) P.vy = Math.max(-90, P.vy - 900 * dt);
      for (let q = 0; q < 10; q++) {
        const a = Math.random() * 6.283, r = Math.random() * z.r;
        const x = Math.floor(z.x + Math.cos(a) * r), y = Math.floor(z.y + Math.sin(a) * r);
        if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); FX().pix(x + 0.5, y + 0.5, rand(-10, 10), -rand(20, 60), c, rand(1.5, 2.5)); }
      }
      if (Math.random() < 0.6) { const a = Math.random() * 6.283; FX().pix(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, 0, -30, P32.m, 0.5); }
      if (slam) { st.zones.splice(k, 1); FX().blast(z.x, z.y, z.r * 1.5, -300); A('slam'); G()?.shake?.(8); G()?.event?.('SLAM!', z.x, z.y - 10, 2); }
    }
  }
  function tryFire(d, o) {
    if (st.ammo) {
      const left = st.ammo[d.id];
      if (left == null) return false;
      if (left <= 0) { G()?.label?.('OUT OF AMMO', 700); A('deny'); st.cd = 0.4; return false; }
    }
    const res = FIRE[d.id] ? FIRE[d.id](o) : null;
    if (res === false) return false;
    if (st.ammo) { st.ammo[d.id]--; G()?.ammoChanged?.(); }
    const P = PL();
    P.recoil = Math.max(P.recoil, d.recoil || 0);
    if (d.kick) P.impulse(-o.ax * d.kick, -o.ay * d.kick * (d.id === 'shotgun' || d.id === 'double' ? 1.1 : 0.8));
    if (d.shake) G()?.shake?.(d.shake);
    if (d.flash) FX().flashSprite(d.flash, o.x, o.y, Math.atan2(o.ay, o.ax));
    if (d.shell) FX().shell(o.hx, o.hy - 1, PL().face, d.id === 'shotgun' ? P32.e : P32.a);
    if (d.snd) A(d.snd);
    if (d.throw) { st.swing = 0.15; st.swingDir = 1; }
    G()?.stat?.('shots', 1);
    G()?.weaponUsed?.(d.id);
    return true;
  }
  let wasFiring = false;
  function update(dt, want, alt, o) {
    const d = BY[st.cur];
    const lv = upg(d.id);
    setPow(lv);
    st.cd = Math.max(0, st.cd - dt);
    st.kickCd = Math.max(0, st.kickCd - dt);
    st.glove = Math.max(0, st.glove - dt);
    st.reload = Math.max(0, st.reload - dt);
    if (st.reload === 0 && st.reloadFor) { st.mag[st.reloadFor] = 6; st.reloadFor = null; }
    st.swing = Math.max(0, (st.swing || 0) - dt);
    st.ballPull = false;
    st.eraserAt = null;
    st.penAt = null;
    if (d.id !== 'lens' || !want) st.lensAt = null;
    if (d.id !== 'pen' || !want) { st.penLast = null; st.ink = Math.min(1, st.ink + dt * 0.35); }
    if (d.spin) {
      if (want) st.spin = Math.min(1, st.spin + dt * 1.8); else st.spin = Math.max(0, st.spin - dt * 1.2);
      WTP.audio.loop('spin', st.spin > 0.02, st.spin);
      const brrt = want && st.spin >= 1 && !st.ammoOut;
      if (st.brrt && !brrt) A('minigunStop');
      st.brrt = brrt;
      WTP.audio.loop('brrt', brrt, Math.min(1, lv / 3));
    }
    if (d.charge) {
      if (want && st.cd <= 0) { if (st.charge === 0) A('charge'); st.charge += dt; if (Math.random() < 0.5) FX().spark(o.x + rand(-2, 2), o.y + rand(-2, 2), rand(-20, 20), rand(-20, 20), P32.C, 0.15); }
      else st.charge = 0;
    }
    if (d.hold) {
      const ok = !st.ammo || (st.ammo[d.id] ?? 0) > 0;
      if (want && ok) {
        HOLD[d.id](o, dt);
        if (d.loop) WTP.audio.loop(d.loop, true);
        if (st.ammo && (st.holdAcc = (st.holdAcc || 0) + dt) > 0.5) { st.holdAcc = 0; st.ammo[d.id]--; G()?.ammoChanged?.(); }
        if (!wasFiring) { G()?.stat?.('shots', 1); }
        G()?.weaponUsed?.(d.id, dt);
        G()?.startTimer?.();
      } else if (d.loop) WTP.audio.loop(d.loop, false);
      if (wasFiring && !want && RELEASE[d.id]) RELEASE[d.id](o);
    } else if (want && st.cd <= 0 && st.reload <= 0) {
      const ready = !(d.spin && st.spin < 1) && !(d.charge && st.charge < d.charge);
      if (ready && tryFire(d, o)) { st.cd = d.rate * (1 - 0.08 * lv); st.charge = 0; G()?.startTimer?.(); }
    }
    if (alt && ALT[d.id]) ALT[d.id](o);
    wasFiring = want;
    if (d.id === 'wrecking' || st.ball) updateBall(dt, o, d.id === 'wrecking');
    if (d.id !== 'gravity' && st.held) RELEASE.gravity(o);
    if (d.id !== 'cutter' && st.cut) { const c = st.cut; st.cut = null; W().releaseChunk(c, 0, 0); c.thrown = false; }
    if (st.cut) { const c = st.cut; const tx = o.x + o.ax * (c.rad + 8), ty = o.y + o.ay * (c.rad + 8); c.vx = (tx - c.x) * 16; c.vy = (ty - c.y) * 16; c.x += c.vx * dt; c.y += c.vy * dt; c.a *= 0.9; if (Math.random() < 0.2) FX().spark(c.x + rand(-c.rad, c.rad), c.y + rand(-c.rad, c.rad), 0, -10, P32.C, 0.2); }
    if (st.blowing > 0) {
      const n = Math.min(st.blowing, 6);
      st.blowing -= n;
      for (let k = 0; k < n; k++) { const a = Math.atan2(o.ay, o.ax) + rand(-0.14, 0.14), sp = rand(380, 480); addShot({ t: 'junk', x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, g: 120, col: st.tankCols.length ? st.tankCols[(Math.random() * st.tankCols.length) | 0] : P32['5'], dmg: 6 }); }
      PL().vx -= o.ax * 14; if (!PL().ground) PL().vy -= o.ay * 10;
      if (Math.random() < 0.3) A('junkShot');
      if (st.blowing <= 0) st.tankCols = [];
    }
    updateWhip(dt, o);
    updateLatch(dt);
    setPow(0);
    updateShots(dt);
    updateWaves(dt);
    updateTornados(dt);
    updateQuake(dt);
    updatePortals(dt);
    updateZones(dt);
    for (let k = st.thermals.length - 1; k >= 0; k--) { const t = st.thermals[k]; t.k -= dt * 0.6; if (t.k <= 0) st.thermals.splice(k, 1); }
    for (let k = FX().anims.length - 1; k >= 0; k--) { const a = FX().anims[k]; if (a.slash || a.kick) { a.t += dt; if (a.t > a.dur) FX().anims.splice(k, 1); } }
    if (d.id === 'sniper' && !st.cd) {
      const r = W().raycast(o.x, o.y, o.ax, o.ay, 300, 1);
      FX().beam([o.x, o.y, r.x, r.y], { kind: 'sight', life: 0.02, c1: P32.e });
    }
    setPow(0);
  }
  function updateBall(dt, o, active) {
    const P = PL();
    if (!st.ball) st.ball = { x: o.hx + 10, y: o.hy, vx: 0, vy: 0, len: 26, r: 4.5 };
    const b = st.ball;
    if (!active) { st.ball = null; return; }
    const hx = o.hx, hy = o.hy;
    b.vy += 520 * dt;
    if (st.ballPull) {
      const tx = hx + o.ax * b.len, ty = hy + o.ay * b.len;
      b.vx += (tx - b.x) * 40 * dt; b.vy += (ty - b.y) * 40 * dt;
      const tang = { x: -o.ay, y: o.ax };
      b.vx += tang.x * 300 * dt * P.face; b.vy += tang.y * 300 * dt * P.face;
    }
    b.vx *= 0.995; b.vy *= 0.995;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const dx = b.x - hx, dy = b.y - hy, d = Math.hypot(dx, dy) || 1;
    if (d > b.len) {
      const nx = dx / d, ny = dy / d;
      b.x = hx + nx * b.len; b.y = hy + ny * b.len;
      const vr = b.vx * nx + b.vy * ny;
      if (vr > 0) { b.vx -= vr * nx; b.vy -= vr * ny; }
    }
    const sp = Math.hypot(b.vx, b.vy);
    const Wd = W();
    if (Wd.solid(Math.floor(b.x), Math.floor(b.y))) {
      if (sp > 90) {
        const n = Wd.carve(b.x, b.y, b.r + Math.min(4, sp / 120), { debris: 0.5, force: sp * 0.5, cause: 'wrecking', letters: 4 });
        if (n) { G()?.shake?.(Math.min(8, sp / 60)); if (sp > 200) { A('hammer'); G()?.hitstop?.(0.03); } }
        b.vx *= 0.72; b.vy *= 0.72;
      } else if (st.ballPull && (b.grind = (b.grind || 0) - dt) <= 0) {
        b.grind = 0.12;
        const n = Wd.carve(b.x, b.y, b.r + 1, { debris: 0.5, force: 90, cause: 'wrecking', pow: 2.4, letters: 2 });
        if (n) { G()?.shake?.(2); A('hammer'); }
        b.vx *= -0.3; b.vy *= -0.3;
      } else { b.vx *= -0.3; b.vy *= -0.3; b.y -= 1; }
    }
    EN()?.damageCircle?.(b.x, b.y, b.r + 3, sp * 0.08 * dt * 10, 'wrecking');
    if (sp > 160 && Math.random() < 0.4) FX().trail(b.x, b.y, P32['4'], 0.2);
    if (sp > 230 && st.ballPull && (b.wT = (b.wT || 0) - dt) <= 0) { b.wT = 0.35; A('swoosh'); }
  }
  function updateWaves(dt) {
    if (!st.waves) return;
    const Wd = W();
    for (let k = st.waves.length - 1; k >= 0; k--) {
      const w = st.waves[k];
      const r0 = w.r;
      w.t += dt; w.r = w.t * 300;
      if (w.r > 120) { st.waves.splice(k, 1); continue; }
      let n = 0;
      for (let a = -0.6; a <= 0.6; a += 0.04) {
        for (let rr = r0; rr < w.r; rr += 3) {
          if (Math.random() > 0.35 * (1 - rr / 140)) continue;
          const x = w.x + Math.cos(w.a + a) * rr, y = w.y + Math.sin(w.a + a) * rr;
          n += Wd.carve(x, y, 2.4, { debris: 0.4, force: 160, noCrumble: true, cause: 'sound', pop: 0.6 });
        }
      }
      const mx = w.x + Math.cos(w.a) * w.r, my = w.y + Math.sin(w.a) * w.r;
      Wd.crumble(mx, my, 0, 26);
      EN()?.damageCircle?.(mx, my, 20, 30 * dt * 4, 'sound');
      for (const c of Wd.chunks) { const d = Math.hypot(c.x - mx, c.y - my); if (d < 30) { c.vx += Math.cos(w.a) * 200; c.vy += Math.sin(w.a) * 200 - 80; } }
      if (n) G()?.shake?.(3);
    }
  }
  function updateTornados(dt) {
    const Wd = W();
    for (let k = st.tornados.length - 1; k >= 0; k--) {
      const T = st.tornados[k];
      T.t += dt;
      if (T.t > T.life) { st.tornados.splice(k, 1); if (!st.tornados.length) WTP.audio.loop('wind', false); FX().smoke(T.x, T.y - 10, 8, P32['5']); continue; }
      WTP.audio.loop('wind', true);
      const P0 = PL();
      const chase = Math.sign(P0.x - T.x) * 0.15;
      T.x += (T.dir + Math.sin(T.t * 1.3) * 0.6 + chase) * 30 * dt;
      if (T.x < 6) { T.x = 6; T.dir = 1; } else if (T.x > Wd.w - 6) { T.x = Wd.w - 6; T.dir = -1; }
      let gy = T.y;
      if (!Wd.solid(Math.floor(T.x), Math.floor(gy + 1))) { for (let s = 0; s < 200 && !Wd.solid(Math.floor(T.x), Math.floor(gy + 1)); s++) gy++; }
      else for (let s = 0; s < 40 && Wd.solid(Math.floor(T.x), Math.floor(gy)); s++) gy--;
      T.y += (gy - T.y) * Math.min(1, dt * 3);
      const H = 78;
      const grow = Math.min(1, T.t / 0.6) * Math.min(1, (T.life - T.t) / 0.5);
      let n = 0;
      for (let q = 0; q < 70 * grow; q++) {
        const hh = rand(-10, H), wdt = 5 + Math.max(0, hh) * 0.36;
        const x = T.x + rand(-wdt, wdt) + Math.sin(T.t * 6 + hh * 0.1) * 4, y = T.y - hh;
        const ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= Wd.w || iy >= Wd.h - 3) continue;
        const i = iy * Wd.w + ix;
        const m = Wd.mat[i];
        if ((m === Wd.SOLID || m === Wd.RUBBLE || m === Wd.DEBRIS || m === Wd.ICE) && Math.random() < (hh < 6 ? 0.7 : 0.35)) {
          const c = Wd.col[i];
          n += Wd.kill(i, ix, iy, ix, iy, 0, 0);
          FX().suck(x, y, rand(-60, 60), -rand(40, 120), c, T.x + Math.sin(T.t * 4) * 10, T.y - H - 10, 1.6);
        }
      }
      if (n) { G()?.scored?.(n, -1, -1, 'tornado'); if (Math.random() < 0.25) Wd.crumble(T.x, T.y - 20, 0, 36); if (Math.random() < 0.2) Wd.letterRing(T.x, T.y - 10, 0, 22, 140); }
      for (let q = 0; q < 5; q++) { const hh = Math.random() * H; FX().pix(T.x + Math.sin(T.t * 9 + hh) * (5 + hh * 0.36), T.y - hh, rand(-40, 40), -rand(20, 60), Math.random() < 0.5 ? P32['5'] : P32['6'], 0.35); }
      if (Math.random() < 0.5) FX().dust(T.x + rand(-12, 12), T.y - 2);
      FX().suckAll(T.x, T.y - H / 2, 50, 1);
      for (const c of Wd.chunks) { const d = Math.hypot(c.x - T.x, c.y - (T.y - 35)); if (d < 55) { c.vx += (T.x - c.x) * 4 * dt + T.dir * 40 * dt; c.vy -= 900 * dt; c.va += dt * 6; c.rest = 0; } }
      const P = PL(), pc = P.center(), d = Math.hypot(pc.x - T.x, pc.y - (T.y - 30));
      if (d < 40) { P.vx += (T.x - pc.x) * 6 * dt; P.vy -= 700 * dt; }
      EN()?.damageCircle?.(T.x, T.y - 30, 30, 40 * dt, 'tornado');
      G()?.shake?.(1.5);
    }
  }
  function updateQuake(dt) {
    if (st.quakeT <= 0) return;
    st.quakeT -= dt;
    WTP.audio.loop('rumble', st.quakeT > 0);
    const g = G(); if (!g) return;
    g.shake(Math.min(14, 6 + st.quakeT * 3));
    const Wd = W();
    const v = g.view();
    let n = 0;
    for (let k = 0; k < 6; k++) {
      const x = v.x + Math.random() * v.w, y = v.y + Math.random() * v.h;
      const p = Wd.nearestSolid(x, y, 14);
      if (!p) continue;
      n += Wd.carve(p[0], p[1], rand(1.5, 3.2), { debris: 0.5, force: 80, cause: 'quake', pop: 0.7, crumbleR: 10 });
    }
    if (Math.random() < 0.25) Wd.crumble(v.x + Math.random() * v.w, v.y + Math.random() * v.h, 0, 40);
    for (const c of Wd.chunks) if (Math.random() < 0.05) { c.vy -= 120; c.vx += rand(-60, 60); c.rest = 0; }
    EN()?.damageCircle?.(PL().x, PL().y, 500, 8 * dt, 'quake');
    if (st.quakeT <= 0) WTP.audio.loop('rumble', false);
  }
  function updatePortals(dt) {
    if (st.portals.length < 2) return;
    const [b, o] = st.portals;
    const P = PL();
    st.portalCd = Math.max(0, (st.portalCd || 0) - dt);
    const pc = P.center();
    for (const [src, dst] of [[b, o], [o, b]]) {
      if (st.portalCd <= 0 && Math.hypot(pc.x - src.x, pc.y - src.y) < 7) {
        P.x = dst.x + dst.nx * 9 - P.w / 2; P.y = dst.y + dst.ny * 9 - P.h / 2;
        const sp = Math.max(160, Math.hypot(P.vx, P.vy));
        P.vx = dst.nx * sp; P.vy = dst.ny * sp - 40;
        st.portalCd = 0.35;
        A('portalOut'); G()?.stat?.('portals', 1);
        for (let k = 0; k < 12; k++) FX().spark(dst.x, dst.y, rand(-80, 80), rand(-80, 80), dst === b ? P32.c : P32.o, 0.3);
      }
    }
    for (const s of shots) {
      if (s.t === 'portal' || s.portalCd > 0) { s.portalCd = Math.max(0, (s.portalCd || 0) - dt); continue; }
      for (const [src, dst] of [[b, o], [o, b]]) {
        if (Math.hypot(s.x - src.x, s.y - src.y) < 6) {
          const sp = Math.hypot(s.vx, s.vy);
          s.x = dst.x + dst.nx * 6; s.y = dst.y + dst.ny * 6; s.vx = dst.nx * sp; s.vy = dst.ny * sp; s.portalCd = 0.2;
          break;
        }
      }
    }
    for (const c of W().chunks) {
      for (const [src, dst] of [[b, o], [o, b]]) {
        if (!c.portalCd && Math.hypot(c.x - src.x, c.y - src.y) < 8) {
          const sp = Math.max(120, Math.hypot(c.vx, c.vy));
          c.x = dst.x + dst.nx * (c.rad + 4); c.y = dst.y + dst.ny * (c.rad + 4); c.vx = dst.nx * sp; c.vy = dst.ny * sp; c.portalCd = 0.3; c.rest = 0;
          break;
        }
      }
      if (c.portalCd) c.portalCd = Math.max(0, c.portalCd - dt);
    }
  }

  function physStep(s, dt, bounceK) {
    const Wd = W();
    const steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt));
    let hit = false;
    for (let q = 0; q < steps; q++) {
      const nx = s.x + (s.vx * dt) / steps, ny = s.y + (s.vy * dt) / steps;
      if (Wd.solid(Math.floor(nx), Math.floor(s.y))) { s.vx = -s.vx * bounceK; hit = 'x'; } else s.x = nx;
      if (Wd.solid(Math.floor(s.x), Math.floor(ny))) { if (Math.abs(s.vy) > 40 && s.t === 'grenade') A('ball'); s.vy = -s.vy * bounceK * 0.85; s.vx *= 0.8; hit = hit || 'y'; } else s.y = ny;
    }
    return hit;
  }
  function travel(s, dt, onHit) {
    const Wd = W();
    const dist = Math.hypot(s.vx, s.vy) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.7));
    for (let q = 0; q < steps; q++) {
      s.x += (s.vx * dt) / steps; s.y += (s.vy * dt) / steps;
      const ix = Math.floor(s.x), iy = Math.floor(s.y);
      if (ix < -6 || ix >= Wd.w + 6 || iy >= Wd.h || iy < -400) return true;
      if (s.from === 'p') {
        const e = EN()?.at?.(s.x, s.y, s.rad || 2);
        if (e && !(s.hitSet && s.hitSet.has(e))) {
          e.damage(s.dmg || 10, s.t);
          if (s.pierce) { (s.hitSet = s.hitSet || new Set()).add(e); } else if (onHit(s.x, s.y, true, e)) return true;
        }
      }
      if (Wd.solid(ix, iy)) { if (onHit(s.x, s.y, false)) return true; }
    }
    return false;
  }
  function stickSurface(s) {
    const Wd = W();
    let nx = 0, ny = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Wd.solid(Math.floor(s.x + dx * 2), Math.floor(s.y + dy * 2))) { nx -= dx; ny -= dy; }
    const m = Math.hypot(nx, ny) || 1;
    return { nx: nx / m || 0, ny: ny / m || -1 };
  }

  function impactChunk(c, r) {
    explode(c.x, c.y, r, { letters: 8, fire: 0.03, cause: 'throw', sound: 'boom' });
  }

  function updateShots(dt) {
    const Wd = W();
    for (let k = shots.length - 1; k >= 0; k--) {
      const s = shots[k];
      if (s.delay > 0) { s.delay -= dt; continue; }
      if (s.from === 'p') setPow(s.lv | 0); else setPow(0);
      s.age += dt; s.life -= dt;
      let dead = s.life <= 0;
      switch (s.t) {
        case 'bullet': {
          if (dead) break;
          const pierced = s.pierce || 0;
          dead = travel(s, dt, (x, y, isE) => {
            if (isE) { FX().spark(x, y, rand(-50, 50), rand(-50, 50), P32.y); return true; }
            const n = Wd.carve(x, y, s.r, { debris: 0.6, force: 70, cause: 'bullet', vx: s.vx, vy: s.vy, noCrumble: !!s.pierce, pop: s.popAll ? 1 : undefined });
            if (s.ric > 0) {
              s.ric--;
              const vertical = !Wd.solid(Math.floor(x), Math.floor(y - Math.sign(s.vy) * 1.2));
              if (vertical) s.vy = -s.vy; else s.vx = -s.vx;
              s.x += s.vx * 0.006; s.y += s.vy * 0.006;
              A('ricochet');
              for (let z = 0; z < 3; z++) FX().spark(x, y, s.vx * 0.2 + rand(-40, 40), s.vy * 0.2 + rand(-40, 40), P32['7'], 0.15);
              return false;
            }
            if (s.nail && Math.random() < 0.6) Wd.placeRubble(Math.floor(x), Math.floor(y), P32['5']);
            for (let z = 0; z < 2; z++) FX().spark(x, y, -s.vx * 0.15 + rand(-50, 50), -s.vy * 0.15 + rand(-50, 50), P32.Y, rand(0.08, 0.2));
            A('impact');
            if (pierced > 0) { s.pierce -= Math.max(1, s.r * 1.5); if (s.pierce > 0) { if (n) Wd.crumble(x, y, 2, 8); return false; } }
            return true;
          });
          if (!dead && Math.random() < 0.6) FX().trail(s.x - s.vx * 0.006, s.y - s.vy * 0.006, P32.a, 0.06);
          break;
        }
        case 'confetti':
          dead = dead || travel(s, dt, (x, y, isE) => { if (!isE) { Wd.paintAt(x, y, 2.5, s.col); Wd.carve(x, y, 1.4, { debris: 0.4, force: 40, cause: 'confetti', pop: 0.25 }); } return true; });
          break;
        case 'flame': {
          s.vy -= 70 * dt; s.vx *= 0.985; s.vy *= 0.985;
          const k2 = s.age / 0.45;
          if (Math.random() < 0.5) FX().flame(s.x, s.y);
          if (dead) break;
          dead = travel(s, dt, (x, y, isE, e) => {
            if (isE) { e.burn = 2; return true; }
            const ix = Math.floor(x), iy = Math.floor(y);
            Wd.igniteAt(ix, iy, 8);
            return true;
          });
          s.r = 1 + k2 * 4;
          break;
        }
        case 'flak': {
          s.vy += (s.g || 0) * dt;
          const burst = () => {
            explode(s.x, s.y, 6, { letters: 2, fire: 0.05, sound: 'impact', noPush: true });
            for (let q = 0; q < 14; q++) { const a = Math.atan2(s.vy, s.vx) + rand(-0.9, 0.9), sp = rand(300, 460); addShot({ t: 'bullet', x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.35), r: 2.8, dmg: 9, spr: 'pellet' }); }
            A('flak');
          };
          if (dead) { burst(); break; }
          dead = travel(s, dt, () => { burst(); return true; });
          break;
        }
        case 'flare': case 'aflare': {
          if (!s.stuck) {
            s.vy += (s.g || 520) * dt;
            const h = physStep(s, dt, 0.3);
            if (h && (s.t === 'flare' || Math.hypot(s.vx, s.vy) < 50)) { s.stuck = true; s.vx = 0; s.vy = 0; }
          }
          if (Math.random() < 0.7) FX().smoke(s.x, s.y - 1, 1, Math.random() < 0.5 ? P32.e : P32.K);
          if (Math.random() < 0.5) FX().spark(s.x, s.y, rand(-30, 30), rand(-60, -10), P32.y, 0.2);
          if (s.t === 'flare') {
            if (s.stuck) { s.burnT -= dt; if (Math.random() < 0.5) Wd.igniteAt(Math.floor(s.x + rand(-5, 5)), Math.floor(s.y + rand(-5, 5)), 2); if (s.burnT <= 0) dead = true; }
            EN()?.damageCircle?.(s.x, s.y, 8, 20 * dt, 'flare');
          } else {
            s.fuse -= dt;
            if (s.fuse <= 0 && !s.called) {
              s.called = true; s.life = 2.6;
              A('siren');
              G()?.event?.('INCOMING!', s.x, s.y - 14);
              const top = Math.min(s.y - 60, (G()?.camTop?.() ?? s.y - 120) - 10);
              for (let b = 0; b < 8; b++) addShot({ t: 'bomb', x: s.x + rand(-26, 26) + (b - 3.5) * 5, y: top - b * 22, vx: rand(-5, 5), vy: 140, life: 8, delay: 0.4 + b * 0.15, spr: 'bomb', dmg: 50 });
            }
          }
          break;
        }
        case 'bomb':
          if (!s.whistled) { s.whistled = true; A('whistle'); }
          s.vy = Math.min(560, s.vy + 600 * dt);
          dead = dead || travel(s, dt, (x, y) => { explode(x, y + 2, 16, { letters: 8 }); WTP.vibe(30); return true; });
          break;
        case 'meteor':
          if (!s.whistled) { s.whistled = true; A('meteor'); }
          s.vy = Math.min(520, s.vy + 300 * dt);
          if (Math.random() < 0.9) FX().flame(s.x - s.vx * 0.01, s.y - s.vy * 0.01);
          if (Math.random() < 0.5) FX().smoke(s.x, s.y, 1);
          dead = dead || travel(s, dt, (x, y) => { explode(x, y, rand(11, 16), { fire: 0.4, letters: 10 }); return true; });
          break;
        case 'rocket': {
          const sp = Math.hypot(s.vx, s.vy);
          const ns = Math.min(480, sp + 900 * dt);
          s.vx *= ns / sp; s.vy *= ns / sp;
          if (Math.random() < 0.9) FX().smoke(s.x - s.vx * 0.012, s.y - s.vy * 0.012, 1);
          if (Math.random() < 0.6) FX().flame(s.x - s.vx * 0.014, s.y - s.vy * 0.014);
          if (dead) { explode(s.x, s.y, 22); break; }
          dead = travel(s, dt, (x, y) => { explode(x, y, 22); return true; });
          break;
        }
        case 'missile': {
          const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1;
          const sp = Math.min(380, Math.hypot(s.vx, s.vy) + 600 * dt);
          const want = Math.atan2(dy, dx), cur = Math.atan2(s.vy, s.vx);
          let da = want - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          const na = cur + Math.max(-6 * dt, Math.min(6 * dt, da)) * (s.age > 0.15 ? 1 : 0.2);
          s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
          if (Math.random() < 0.8) FX().smoke(s.x, s.y, 1, P32['5']);
          if (dead || d < 3) { explode(s.x, s.y, 10, { letters: 6 }); dead = true; break; }
          dead = travel(s, dt, (x, y) => { explode(x, y, 10, { letters: 6 }); return true; });
          break;
        }
        case 'plasma':
          if (Math.random() < 0.7) FX().spark(s.x, s.y, rand(-20, 20), rand(-20, 20), Math.random() < 0.5 ? P32.m : P32.K, 0.25);
          if (dead) { explode(s.x, s.y, 11, { kind: 'plasma', fire: 0, letters: 8 }); break; }
          dead = travel(s, dt, (x, y) => { explode(x, y, 11, { kind: 'plasma', fire: 0, letters: 8 }); return true; });
          break;
        case 'glitch':
          if (Math.random() < 0.8) FX().pix(s.x + rand(-2, 2), s.y + rand(-2, 2), 0, 0, P32[pick(['k', 'C', 'P', 'l'])], 0.2);
          if (dead) { glitchAt(s.x, s.y); break; }
          dead = travel(s, dt, (x, y) => { glitchAt(x, y); return true; });
          break;
        case 'paint':
          s.vy += (s.g || 0) * dt;
          dead = dead || travel(s, dt, (x, y, isE) => {
            if (!isE) {
              const n = Wd.paintAt(x, y, 5.5, s.col);
              if (n) G()?.stat?.('painted', n);
              for (let q = 0; q < 4; q++) FX().paint(x, y, rand(-50, 50), rand(-80, 0), s.col);
              A('paint');
            }
            return true;
          });
          break;
        case 'lavab':
          s.vy += s.g * dt;
          if (Math.random() < 0.5) FX().spark(s.x, s.y, rand(-10, 10), rand(-10, 10), P32.a, 0.2);
          dead = dead || travel(s, dt, (x, y) => {
            Wd.carve(x, y, 4, { debris: 0.3, force: 40, scorch: true, ignite: 0.3, cause: 'lava' });
            for (let q = 0; q < 10; q++) FX().lava(x + rand(-3, 3), y - 2, rand(-50, 50), rand(-60, 0));
            FX().anim('fire', 14, x, y, 0.3);
            A('lava');
            return true;
          });
          break;
        case 'snow':
          s.vy += s.g * dt;
          dead = dead || travel(s, dt, (x, y, isE, e) => {
            if (isE) { e.freeze = 2.5; }
            else Wd.carve(x, y, 1.6, { debris: 0.3, force: 40, cause: 'snow', pop: 0.3, noCrumble: true });
            Wd.freezeAt(x, y, 5);
            for (let q = 0; q < 8; q++) FX().pix(x, y, rand(-60, 60), rand(-80, 0), P32['7'], 0.5);
            A('snow');
            return true;
          });
          break;
        case 'grenade': case 'cluster': case 'banana': case 'mini': {
          s.vy += (s.g || 520) * dt;
          s.spin += s.vx * dt * 0.1;
          const h = physStep(s, dt, s.bounce || 0.5);
          s.fuse -= dt;
          if (s.t === 'cluster' && (h || s.fuse <= 0) && s.age > 0.15) {
            explode(s.x, s.y, 9, { letters: 4 });
            for (let q = 0; q < 7; q++) { const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = rand(120, 220); addShot({ t: 'mini', x: s.x, y: s.y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, fuse: rand(0.45, 0.9), life: 3, spr: 'bomblet', g: 500, bounce: 0.4, spin: 0, r: 10 }); }
            dead = true; break;
          }
          if (s.fuse <= 0) {
            if (s.t === 'banana' && s.big) {
              explode(s.x, s.y, 13, { letters: 8 });
              for (let q = 0; q < 5; q++) { const a = -Math.PI / 2 + (q - 2) * 0.35, sp = rand(160, 230); addShot({ t: 'banana', x: s.x, y: s.y - 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, fuse: rand(0.9, 1.4), life: 4, spr: 'banana', g: 500, bounce: 0.3, spin: 0, big: false }); }
            } else explode(s.x, s.y, s.t === 'grenade' ? 19 : s.t === 'banana' ? 10 : (s.r || 10), { letters: 10 });
            dead = true;
          }
          if (s.t === 'grenade' && Math.random() < 0.3) FX().trail(s.x, s.y - 2, P32['4'], 0.25);
          break;
        }
        case 'sticky': {
          if (!s.stuck) {
            s.vy += s.g * dt;
            dead = dead || travel(s, dt, (x, y, isE, e) => { s.stuck = true; s.on = e || null; if (e) { s.ox = s.x - e.x; s.oy = s.y - e.y; } A('impact'); return false; });
            if (s.stuck) { s.vx = 0; s.vy = 0; }
          } else if (s.on) { if (s.on.dead) s.on = null; else { s.x = s.on.x + s.ox; s.y = s.on.y + s.oy; } }
          s.fuse -= dt;
          if (s.stuck && ((s.age * 4) | 0) % 2 === 0 && Math.random() < 0.1) FX().spark(s.x, s.y - 2, 0, -10, P32.e, 0.1);
          if (s.fuse <= 0) { explode(s.x, s.y, 16, { letters: 8 }); dead = true; const ix = st.stickies.indexOf(s); if (ix >= 0) st.stickies.splice(ix, 1); }
          break;
        }
        case 'mine': {
          if (!s.stuck) { s.vy += s.g * dt; const h = physStep(s, dt, 0.2); if (h === 'y' && Math.abs(s.vy) < 30) { s.stuck = true; s.vx = 0; s.vy = 0; } }
          else if (!Wd.solid(Math.floor(s.x), Math.floor(s.y + 3))) { s.stuck = false; }
          s.arm -= dt;
          if (s.arm <= 0 && s.trig == null) {
            if (EN()?.nearest?.(s.x, s.y, 14)) s.trig = 0.15;
            for (const c of Wd.chunks) if (Math.hypot(c.x - s.x, c.y - s.y) < c.rad + 6) s.trig = 0.15;
            const pc = PL().center();
            if (Math.hypot(pc.x - s.x, pc.y - s.y) < 8 && s.arm < -0.6) s.trig = 0.25;
            if (s.trig != null) A('beep');
          }
          if (s.trig != null) { s.trig -= dt; if (s.trig <= 0) { explode(s.x, s.y - 2, 20, { letters: 12 }); dead = true; } }
          if (dead) { const ix = st.mines.indexOf(s); if (ix >= 0) st.mines.splice(ix, 1); }
          break;
        }
        case 'firework': {
          s.vy -= 120 * dt;
          s.vx += Math.sin(s.age * 25) * 200 * dt;
          if (Math.random() < 0.9) FX().spark(s.x, s.y, rand(-20, 20), rand(20, 60), P32[pick(['y', 'k', 'C', 'l'])], 0.3);
          const burst = () => {
            explode(s.x, s.y, 7, { fire: 0.1, letters: 4, noPush: true });
            const cols = [P32.k, P32.y, P32.C, P32.l, P32.m, P32.o];
            const c1 = pick(cols), c2 = pick(cols);
            for (let q = 0; q < 46; q++) { const a = (q / 46) * Math.PI * 2, sp = rand(110, 190); FX().star(s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, q & 1 ? c1 : c2); }
            A('sparkle'); FX().flash(0.15, '#ff5fa2');
          };
          if (dead) { burst(); break; }
          dead = travel(s, dt, () => { burst(); return true; });
          break;
        }
        case 'nuke': {
          s.vy += (s.g || 0) * dt;
          if (Math.random() < 0.6) FX().smoke(s.x, s.y, 1);
          if (((s.age * 6) | 0) !== ((s.age * 6 - dt * 6) | 0)) A('beep');
          const boom = () => nuke(s.x, s.y);
          if (dead) { boom(); break; }
          dead = travel(s, dt, () => { boom(); return true; });
          break;
        }
        case 'bolt': case 'harpoon': {
          s.vy += (s.g || 0) * dt;
          if (s.t === 'harpoon') FX().beam([PL().gun().x, PL().gun().y, s.x, s.y], { kind: 'rope', life: 0.02 });
          if (dead) break;
          dead = travel(s, dt, (x, y, isE, e) => {
            if (s.t === 'harpoon') {
              const c = isE ? null : Wd.grabDisk(x + s.vx * 0.012, y + s.vy * 0.012, 8);
              if (isE) { e.vx = (e.vx || 0) - s.vx * 0.5; e.vy = (e.vy || 0) - 200; }
              if (c) { const g0 = PL().gun(); const dx = g0.x - c.x, dy = g0.y - c.y, d = Math.hypot(dx, dy) || 1; W().releaseChunk(c, (dx / d) * 330, (dy / d) * 330 - 120); c.thrown = false; A('fling'); G()?.shake?.(4); }
              else if (!isE) Wd.carve(x, y, 4, { cause: 'harpoon' });
              return true;
            }
            if (isE) return false;
            Wd.carve(x, y, 1.9, { debris: 0.3, force: 60, noCrumble: true, cause: 'bolt', pop: 1 });
            s.pierce -= 1;
            if (s.pierce <= 0) { Wd.crumble(x, y, 0, 14); A('impact'); s.stuckT = 3; return true; }
            return false;
          });
          break;
        }
        case 'portal':
          dead = dead || travel(s, dt, (x, y) => {
            const n = stickSurface({ x, y });
            const p = { x: x - s.vx * 0.004, y: y - s.vy * 0.004, nx: n.nx, ny: n.ny, which: s.which, t: 0 };
            Wd.carve(x, y, 3, { debris: 0.2, cause: 'portal', pop: 0.4 });
            st.portals[s.which] = p;
            A('portal');
            for (let q = 0; q < 10; q++) FX().spark(x, y, rand(-60, 60), rand(-60, 60), s.which ? P32.o : P32.c, 0.3);
            return true;
          });
          break;
        case 'ball': {
          s.vy += s.g * dt;
          const before = Math.hypot(s.vx, s.vy);
          const h = physStep(s, dt, 0.88);
          if (h) {
            const n = Wd.carve(s.x, s.y, 3.2, { debris: 0.5, force: 80, cause: 'ball', pop: 0.5 });
            s.bounces--; A('ball');
            if (n) { const sp = Math.max(before, 260) * 1.02; const m = Math.hypot(s.vx, s.vy) || 1; s.vx = (s.vx / m) * sp; s.vy = (s.vy / m) * sp; }
            if (s.bounces <= 0) dead = true;
          }
          const e = EN()?.at?.(s.x, s.y, 3);
          if (e) { e.damage(s.dmg, 'ball'); s.vx = -s.vx; s.vy = -Math.abs(s.vy); s.bounces--; }
          if (Math.random() < 0.5) FX().trail(s.x, s.y, P32.K, 0.15);
          break;
        }
        case 'boomerang': {
          s.spin += dt * 25;
          if (s.age > s.out) {
            const g0 = PL().gun();
            const dx = g0.x - s.x, dy = g0.y - s.y, d = Math.hypot(dx, dy) || 1;
            s.vx += (dx / d) * 1500 * dt; s.vy += (dy / d) * 1500 * dt;
            const sp = Math.hypot(s.vx, s.vy); if (sp > 360) { s.vx *= 360 / sp; s.vy *= 360 / sp; }
            if (d < 6 || s.life <= 0.05) { dead = true; }
          }
          s.x += s.vx * dt; s.y += s.vy * dt;
          Wd.carve(s.x, s.y, 3.6, { debris: 0.4, force: 70, cause: 'boomerang', noCrumble: Math.random() < 0.7, pop: 0.5 });
          EN()?.damageCircle?.(s.x, s.y, 6, s.dmg * dt * 4, 'boomerang');
          A('boomerang');
          if (dead) st.boomers = Math.max(0, st.boomers - 1);
          break;
        }
        case 'bhole': {
          if (!s.on) {
            const dr = Math.pow(0.08, dt); s.vx *= dr; s.vy *= dr;
            physStep(s, dt, 0.3);
            if (s.age > 0.55 || Math.hypot(s.vx, s.vy) < 25) { s.on = true; s.life = 2.8; s.hr = 4; A('hole'); WTP.audio.loop('hole', true); }
          } else blackHole(s, dt);
          if (s.life <= 0 && s.on) { explode(s.x, s.y, 22, { kind: 'plasma', letters: 14 }); WTP.audio.loop('hole', false); dead = true; }
          break;
        }
        case 'beacon': {
          if (!s.stuck) { s.vy += s.g * dt; const h = physStep(s, dt, 0.25); if (h && Math.hypot(s.vx, s.vy) < 60) { s.stuck = true; s.vx = 0; s.vy = 0; } }
          s.fuse -= dt;
          if (((s.age * 8) | 0) % 2 === 0) FX().spark(s.x, s.y - 2, 0, -30, P32.C, 0.1);
          if (s.fuse <= 0 && !s.fired) {
            s.fired = true; s.life = 1.7; A('orbital');
            G()?.event?.('ORBITAL STRIKE!', s.x, s.y - 20);
            setTimeout(() => { A('beam'); WTP.audio.loop('beam', true); }, 250);
            st.orb.push({ x: s.x, t: -0.25, life: 1.5 });
          }
          if (s.life <= 0) dead = true;
          break;
        }
        case 'bee': {
          s.eat -= dt;
          if (s.te && s.te.dead) { s.te = null; s.tx = null; }
          if (s.tx == null || (!s.te && !Wd.frontAt(Math.floor(s.tx), Math.floor(s.ty))) || Math.random() < 0.01) {
            const e = EN()?.nearest?.(s.x, s.y, 90);
            if (e) { s.tx = e.x; s.ty = e.y; s.te = e; }
            else {
              let p = Wd.nearestSolid(s.x + rand(-20, 20), s.y + rand(-20, 20), 50, (i) => Wd.kind[i] === Wd.K_TEXT);
              if (!p) p = Wd.nearestSolid(s.x + rand(-30, 30), s.y + rand(-30, 30), 70);
              if (p) { s.tx = p[0]; s.ty = p[1]; s.te = null; } else { s.tx = s.x + rand(-40, 40); s.ty = s.y + rand(-30, 30); s.te = null; }
            }
          }
          if (s.te) { s.tx = s.te.x; s.ty = s.te.y; }
          const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1;
          if (d < 9) { s.vx *= 0.82; s.vy *= 0.82; }
          s.vx += (dx / d) * 700 * dt + rand(-160, 160) * dt; s.vy += (dy / d) * 700 * dt + rand(-160, 160) * dt;
          if (d < 4.5 && s.eat <= 0) {
            s.eat = 0.06;
            if (s.te) s.te.damage(s.dmg, 'bee');
            else {
              const got = Wd.carve(s.tx + rand(-1, 1), s.ty + rand(-1, 1), 1.6, { debris: 0.5, force: 30, cause: 'bees', pop: 0.15, noCrumble: Math.random() < 0.7 });
              if (got) { G()?.stat?.('bees', got); if (Math.random() < 0.3) FX().pix(s.x, s.y, rand(-20, 20), rand(-30, 0), P32.y, 0.3); }
              else s.tx = null;
            }
          }
          const sp = Math.hypot(s.vx, s.vy); if (sp > 150) { s.vx *= 150 / sp; s.vy *= 150 / sp; }
          s.x += s.vx * dt; s.y += s.vy * dt;
          if (Math.random() < 0.02) A('buzz');
          if (dead && !shots.some((o2) => o2 !== s && o2.t === 'bee')) WTP.audio.loop('bees', false);
          break;
        }
        case 'saw': {
          s.spin += dt * 30;
          if (s.stuck > 0) {
            s.stuck -= dt;
            s.x += s.dx * dt * 14; s.y += s.dy * dt * 14;
            const n = Wd.carve(s.x, s.y, 3.6, { debris: 0.6, force: 90, cause: 'saw', pow: 1.4, noCrumble: Math.random() < 0.7, pop: 0.5 });
            if (Math.random() < 0.7) FX().spark(s.x, s.y, rand(-80, 80), rand(-110, -20), Math.random() < 0.5 ? P32.Y : P32.a, 0.2);
            EN()?.damageCircle?.(s.x, s.y, 5, 60 * dt, 'saw');
            if (Math.random() < 0.15) A('sawGrind');
            if (s.stuck <= 0 || (!n && !Wd.solid(Math.floor(s.x), Math.floor(s.y)) && s.age > 0.3 && Math.random() < 0.1)) dead = true;
            break;
          }
          if (dead) break;
          dead = travel(s, dt, (x, y, isE, e) => {
            if (isE) { A('sawHit'); return false; }
            const i = Math.floor(y) * Wd.w + Math.floor(x);
            if (Wd.mtl[i] === Wd.M.METAL || Wd.mat[i] === Wd.ROCK) {
              if ((s.bounces = (s.bounces || 0) + 1) > 4) return true;
              const vertical = !Wd.solid(Math.floor(x), Math.floor(y - Math.sign(s.vy) * 1.2));
              if (vertical) s.vy = -s.vy; else s.vx = -s.vx;
              s.x += s.vx * 0.008; s.y += s.vy * 0.008;
              A('ricochet'); for (let z = 0; z < 4; z++) FX().spark(x, y, rand(-60, 60), rand(-60, 60), P32['7'], 0.2);
              return false;
            }
            const sp = Math.hypot(s.vx, s.vy) || 1;
            s.dx = s.vx / sp; s.dy = s.vy / sp; s.stuck = 1.6 + s.lv * 0.3; s.vx = 0; s.vy = 0; s.life = 3;
            A('sawHit');
            return false;
          });
          if (s.stuck > 0) dead = false;
          break;
        }
        case 'cursor': {
          s.blink += dt;
          if (dead) break;
          const steps = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 0.7));
          for (let q = 0; q < steps && !dead; q++) {
            s.x += (s.vx * dt) / steps; s.y += (s.vy * dt) / steps;
            const ix = Math.floor(s.x), iy = Math.floor(s.y);
            if (ix < 0 || ix >= Wd.w || iy < -200 || iy >= Wd.h - 3) { dead = true; break; }
            const e = EN()?.at?.(s.x, s.y, 2);
            if (e && !(s.hitSet && s.hitSet.has(e))) { (s.hitSet = s.hitSet || new Set()).add(e); e.damage(s.dmg, 'delete'); }
            for (let dy = -3; dy <= 3; dy++) {
              const yy = iy + dy;
              if (yy < 0 || yy >= Wd.h - 3) continue;
              const i = yy * Wd.w + ix;
              if (Wd.mat[i] === Wd.SOLID && Wd.kind[i] === Wd.K_TEXT && Wd.gid[i]) {
                const gr = Wd.groups[Wd.gid[i]];
                if (gr && !gr.dead) {
                  gr.dead = true;
                  let n = 0;
                  for (let y2 = gr.y0; y2 <= gr.y1; y2++) for (let x2 = gr.x0; x2 <= gr.x1; x2++) { const j = y2 * Wd.w + x2; if (Wd.gid[j] === Wd.gid[i] || (j === i)) { const c = Wd.col[j]; if (Wd.mat[j] === Wd.SOLID) { n += Wd.kill(j, x2, y2, x2, y2, 0, 0); if (Math.random() < 0.25) FX().pix(x2 + 0.5, y2 + 0.5, -s.vx * 0.2 + rand(-20, 20), rand(-30, 10), c, 0.4); } } }
                  if (n) { G()?.scored?.(n, s.x, s.y, 'delete'); G()?.stat?.('letters', 1); s.ate++; if ((s.ate & 1) === 0) A('keyTap'); }
                }
              }
            }
            if (Wd.hardAt(ix, iy)) { const i = iy * Wd.w + ix; if (Wd.kind[i] !== Wd.K_TEXT) { Wd.carve(s.x, s.y, 1.2, { pow: 1, debris: 0.2, cause: 'cursor', noCrumble: true }); dead = true; } }
          }
          break;
        }
        case 'junk':
          s.vy += (s.g || 0) * dt;
          dead = dead || travel(s, dt, (x, y, isE) => { if (!isE) Wd.carve(x, y, 1.8, { pow: 1.3, debris: 0.5, force: 60, cause: 'junk', noCrumble: Math.random() < 0.8, pop: 0.4 }); FX().debris(x, y, rand(-40, 40), rand(-60, -10), s.col); return true; });
          break;
        case 'bowl': {
          s.vy += s.g * dt;
          const before = Math.hypot(s.vx, s.vy);
          const h = physStep(s, dt, 0.25);
          const onGround = Wd.solid(Math.floor(s.x), Math.floor(s.y + 4.5));
          s.roll += s.vx * dt * 0.4;
          if (onGround && Math.abs(s.vx) < 60 && s.age < 0.5) s.vx = Math.sign(s.vx || 1) * 160;
          if (Math.abs(s.vx) > 40 || Math.abs(s.vy) > 120) {
            const n = Wd.carve(s.x + Math.sign(s.vx) * 2, s.y, 4.6, { pow: 3.2, debris: 0.6, force: 120, cause: 'bowl', noCrumble: Math.random() < 0.6, pop: 0.8 });
            if (n) { s.vx *= Math.max(0.6, 1 - n * 0.004); G()?.shake?.(1.2); }
          }
          if (onGround) s.vx *= Math.pow(0.85, dt);
          if (h === 'x' && before > 200) A('bowlHit');
          const hitN = EN()?.damageCircle?.(s.x, s.y, 6, 0, 'bowl') || 0;
          if (hitN) { for (const e of EN().list) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 10 && !(s.hitSet && s.hitSet.has(e))) { (s.hitSet = s.hitSet || new Set()).add(e); e.damage(s.dmg, 'bowl'); if (!e.T.boss) { e.vx = s.vx * 1.2; e.vy = -220; } s.hits++; A('pins'); } }
          if (s.hits >= 3 && !s.strike) { s.strike = true; G()?.event?.('STRIKE!', s.x, s.y - 14, 3); A('strike'); }
          if (Math.random() < 0.3) A('bowlRoll');
          if (s.life <= 0 || (Math.abs(s.vx) < 8 && onGround && s.age > 1)) dead = true;
          break;
        }
        case 'jar':
          s.vy += s.g * dt;
          dead = dead || travel(s, dt, (x, y) => {
            A('jarBreak');
            for (let q = 0; q < 10; q++) FX().shard(x, y, rand(-80, 80), rand(-120, -20), q & 1 ? P32.C : P32['7']);
            for (let q = 0; q < 12 + s.lv * 3; q++) addShot({ t: 'termite', x: x - s.vx * 0.01 + rand(-2, 2), y: y - s.vy * 0.01 + rand(-2, 2), vx: rand(-40, 40), vy: rand(-60, 0), life: rand(6, 9), eat: 0, from: 'p', lv: s.lv });
            G()?.event?.('TERMITES!', x, y - 8, 1);
            return true;
          });
          break;
        case 'termite': {
          s.eat -= dt;
          const ix = Math.floor(s.x), iy = Math.floor(s.y);
          let best = -1, bx = 0, by = 0;
          const edible = (i) => Wd.mat[i] === Wd.SOLID && (Wd.mtl[i] === Wd.M.WOOD || Wd.mtl[i] === Wd.M.PAPER || Wd.mtl[i] === Wd.M.INK || Wd.mtl[i] === Wd.M.IMAGE || Wd.mtl[i] === Wd.M.BUTTON || Wd.mtl[i] === Wd.M.INKPEN || Wd.mtl[i] === Wd.M.PLASTIC);
          for (let q = 0; q < 6; q++) { const dx = ((Math.random() * 5) | 0) - 2, dy = ((Math.random() * 5) | 0) - 2; const x = ix + dx, y = iy + dy; if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h - 3) continue; const i = y * Wd.w + x; if (edible(i)) { best = i; bx = x; by = y; if (dy >= 0) break; } }
          if (best >= 0) {
            s.vx = (bx - s.x) * 8; s.vy = (by - s.y) * 8;
            if (s.eat <= 0) { s.eat = 0.035; const c = Wd.col[best]; const n = Wd.kill(best, bx, by, bx, by, 0, 0); if (n) { G()?.scored?.(n, -1, -1, 'termite'); if (Math.random() < 0.15) FX().pix(bx, by, rand(-20, 20), rand(-30, 0), c, 0.3); } if (Math.random() < 0.05) A('munch'); s.x = bx + 0.5; s.y = by + 0.5; }
          } else {
            s.vy += 300 * dt;
            const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
            if (Wd.solid(Math.floor(nx), Math.floor(s.y))) s.vx = -s.vx * 0.5; else s.x = nx;
            if (Wd.solid(Math.floor(s.x), Math.floor(ny))) { s.vy = 0; s.vx = (s.vx >= 0 ? 1 : -1) * 30; } else s.y = ny;
          }
          const e = EN()?.at?.(s.x, s.y, 1);
          if (e && s.eat <= 0) { e.damage(4, 'termite'); s.eat = 0.1; }
          if (s.y > Wd.h) dead = true;
          break;
        }
        case 'agrav': {
          s.vy += (s.g || 520) * dt;
          physStep(s, dt, s.bounce || 0.45);
          s.fuse -= dt;
          s.spin = (s.spin || 0) + dt * 8;
          if (s.fuse <= 0) {
            dead = true;
            const r = 42 + s.lv * 6;
            st.zones.push({ x: s.x, y: s.y, r, t: 0, life: 2.6 });
            A('warp');
            FX().anim('ring', r * 2, s.x, s.y, 0.35);
            Wd.crumble(s.x, s.y, 0, r * 0.8);
            Wd.letterRing(s.x, s.y, 0, r * 0.6, 60);
            for (const c of Wd.chunks) if (Math.hypot(c.x - s.x, c.y - s.y) < r) { c.vy -= 120; c.rest = 0; }
            G()?.event?.('ZERO G!', s.x, s.y - 14, 2);
          }
          break;
        }
        default: break;
      }
      if (dead) { const ix = shots.indexOf(s); if (ix >= 0) shots.splice(ix, 1); }
    }
    for (let k = st.orb.length - 1; k >= 0; k--) {
      const O = st.orb[k];
      O.t += dt;
      if (O.t > O.life) { st.orb.splice(k, 1); if (!st.orb.length) WTP.audio.loop('beam', false); continue; }
      if (O.t < 0) continue;
      const top = (G()?.camTop?.() ?? 0) - 40;
      const depth = Math.min(Wd.h - 4, top + (O.t / 0.5) * (Wd.h - top));
      FX().beam([O.x, depth], { kind: 'column', life: 0.03, w: 7 });
      let n = 0;
      for (let y = Math.max(0, Math.floor(depth - 26)); y < depth; y += 3) n += Wd.carve(O.x + rand(-1.5, 1.5), y, 8, { debris: 0.4, force: 160, back: 1, noCrumble: true, cause: 'orbital', pop: 1, ignite: 0.05 });
      if (Math.random() < 0.5) Wd.crumble(O.x, depth - 10, 6, 26);
      Wd.eraseBack(O.x, depth - 12, 9);
      EN()?.damageCircle?.(O.x, depth - 10, 14, 200 * dt, 'orbital');
      const P = PL(), pc = P.center();
      if (Math.abs(pc.x - O.x) < 20) P.vx += (pc.x < O.x ? -1 : 1) * 600 * dt;
      G()?.shake?.(9);
      for (let q = 0; q < 3; q++) FX().spark(O.x + rand(-8, 8), depth, rand(-160, 160), rand(-200, -40), Math.random() < 0.5 ? P32.C : P32['7'], 0.4);
      if (n > 0 && Math.random() < 0.1) G()?.chroma?.(0.3);
    }
  }
  function blackHole(s, dt) {
    const Wd = W();
    s.hr = Math.min(28, s.hr + dt * 16);
    const R = s.hr, R2 = R * R;
    const x0 = Math.max(0, Math.floor(s.x - R)), x1 = Math.min(Wd.w - 1, Math.ceil(s.x + R));
    const y0 = Math.max(0, Math.floor(s.y - R)), y1 = Math.min(Wd.h - 4, Math.ceil(s.y + R));
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y, d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      const i = y * Wd.w + x;
      const m = Wd.mat[i];
      if (m !== Wd.SOLID && m !== Wd.RUBBLE && m !== Wd.DEBRIS && m !== Wd.ICE) { if (Wd.back[i] && d2 < R2 * 0.3 && Math.random() < 0.05) Wd.eraseBack(x, y, 1); continue; }
      if (Math.random() > 0.02 + 0.2 * (1 - Math.sqrt(d2) / R)) continue;
      const c = Wd.col[i];
      n += Wd.kill(i, x, y, x, y, 0, 0);
      if (Math.random() < 0.6) FX().suck(x + 0.5, y + 0.5, -dy * 4, dx * 4, c, s.x, s.y, 2.5);
    }
    if (n) { G()?.scored?.(n, -1, -1, 'hole'); G()?.stat?.('eaten', n); if (Math.random() < 0.1) Wd.crumble(s.x, s.y, R - 2, R + 10); }
    G()?.shake?.(2.5);
    const P = PL(), pc = P.center(), dx = s.x - pc.x, dy = s.y - pc.y, d = Math.hypot(dx, dy);
    if (d < 90 && d > 3) { const f = (1 - d / 90) * 520 * dt; P.vx += (dx / d) * f; P.vy += (dy / d) * f; }
    FX().suckAll(s.x, s.y, 100, 1.5);
    for (const c of Wd.chunks) {
      const qx = s.x - c.x, qy = s.y - c.y, qd = Math.hypot(qx, qy) || 1;
      if (qd < 110) { c.vx += (qx / qd) * 900 * dt; c.vy += (qy / qd) * 900 * dt - 560 * dt; c.va += dt * 4; c.rest = 0; }
      if (qd < 6) { c.t = 99; }
    }
    EN()?.pull?.(s.x, s.y, 100, 500 * dt);
    EN()?.damageCircle?.(s.x, s.y, R * 0.8, 60 * dt, 'hole');
    if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = R + rand(4, 18); FX().suck(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, -Math.sin(a) * 60, Math.cos(a) * 60, Math.random() < 0.5 ? P32.m : P32.K, s.x, s.y, 1.2); }
  }
  function glitchAt(x, y) {
    const Wd = W();
    const w = 30, h = 14;
    const x0 = Math.max(0, Math.floor(x - w / 2)), y0 = Math.max(0, Math.floor(y - h / 2));
    let n = 0;
    for (let yy = y0; yy < Math.min(Wd.h - 4, y0 + h); yy++) {
      const shift = randInt(-6, 6);
      const row = [];
      for (let xx = x0; xx < Math.min(Wd.w, x0 + w); xx++) row.push(Wd.mat[yy * Wd.w + xx] === Wd.SOLID ? Wd.col[yy * Wd.w + xx] : 0);
      for (let xx = x0; xx < Math.min(Wd.w, x0 + w); xx++) {
        const i = yy * Wd.w + xx;
        if (Wd.mat[i] !== Wd.SOLID) continue;
        if (Math.random() < 0.35) { const c = Wd.col[i]; n += Wd.kill(i, xx, yy, x, y, 0, 0); FX().pix(xx, yy, rand(-80, 80), rand(-60, 20), Math.random() < 0.5 ? c : P32[pick(['k', 'C', 'l', 'P'])], rand(0.4, 1)); continue; }
        const src = row[(xx - x0 - shift + row.length * 2) % row.length];
        Wd.col[i] = src ? (Math.random() < 0.2 ? P32[pick(['k', 'C', 'l', 'P', 'y'])] : src) : P32[pick(['k', 'C'])];
        Wd.touch(i);
      }
    }
    Wd.crumble(x, y, 0, 24);
    EN()?.damageCircle?.(x, y, 16, 30, 'glitch');
    if (n) G()?.scored?.(n, x, y, 'glitch');
    G()?.shake?.(4); G()?.chroma?.(0.4);
    A('glitch');
  }
  function nuke(x, y) {
    G()?.stat?.('nukes', 1);
    explode(x, y, 64, { back: 0.95, letters: 30, fire: 0.3, sound: 'nuke', dmg: 999 });
    G()?.slowmo?.(0.25, 1.6);
    FX().flash(1, '#ffffff');
    G()?.chroma?.(1);
    G()?.event?.('KABOOM!', x, y - 40, 3);
    for (let k = 0; k < 40; k++) FX().smoke(x + rand(-14, 14), y - k * 2.5, 1, k < 20 ? P32.a : P32['4']);
    for (let k = 0; k < 30; k++) FX().smoke(x + rand(-40, 40), y - 60 + rand(-10, 10), 1, P32['5']);
    FX().anim('ring', 128, x, y, 0.6);
    setTimeout(() => { explode(x + rand(-30, 30), y + rand(-20, 20), 20, { letters: 10, noPush: true }); }, 250);
    setTimeout(() => { explode(x + rand(-40, 40), y + rand(-30, 30), 18, { letters: 10, noPush: true }); }, 500);
  }

  function draw(ctx) {
    for (const s of shots) {
      if (s.delay > 0) continue;
      const sp = s.spr && PR[s.spr];
      if (s.t === 'flame') {
        const k = Math.min(1, s.age / 0.45), r = Math.round(1 + k * 3);
        ctx.fillStyle = k < 0.25 ? WTP.PAL.Y : k < 0.55 ? WTP.PAL.a : WTP.PAL.o;
        ctx.fillRect(Math.round(s.x - r / 2), Math.round(s.y - r / 2), r, r);
        continue;
      }
      if (s.t === 'confetti' || s.t === 'paint') { ctx.fillStyle = WTP.css32(s.col); ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); continue; }
      if (s.t === 'glitch') { ctx.fillStyle = Math.random() < 0.5 ? WTP.PAL.k : WTP.PAL.C; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 1, 4 + randInt(0, 3), 2); continue; }
      if (s.t === 'lavab') { ctx.fillStyle = WTP.PAL.o; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); ctx.fillStyle = WTP.PAL.Y; ctx.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1); continue; }
      if (s.t === 'bhole') { drawHole(ctx, s); continue; }
      if (s.t === 'saw') { drawSaw(ctx, s); continue; }
      if (s.t === 'cursor') { const x = Math.round(s.x), y = Math.round(s.y); ctx.fillStyle = PAL['0']; ctx.fillRect(x - 1, y - 5, 3, 11); ctx.fillStyle = ((s.blink * 8) | 0) & 1 ? PAL['7'] : PAL.C; ctx.fillRect(x, y - 4, 1, 9); ctx.fillRect(x - 1, y - 4, 3, 1); ctx.fillRect(x - 1, y + 4, 3, 1); continue; }
      if (s.t === 'junk') { ctx.fillStyle = WTP.css32(s.col); ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); continue; }
      if (s.t === 'termite') { const x = Math.round(s.x), y = Math.round(s.y); ctx.fillStyle = PAL.w; ctx.fillRect(x - 1, y, 3, 1); ctx.fillStyle = PAL['0']; ctx.fillRect(x + (s.vx >= 0 ? 1 : -1), y, 1, 1); if (((s.age * 20) | 0) & 1) { ctx.fillStyle = PAL.u; ctx.fillRect(x, y + 1, 1, 1); } continue; }
      if (s.t === 'bowl' && sp) { const r = sp.rotated(s.roll || 0, false); ctx.drawImage(r.cv, Math.round(s.x - r.ox), Math.round(s.y - r.oy)); continue; }
      if (!sp) continue;
      let ang = Math.atan2(s.vy, s.vx);
      if (s.t === 'grenade' || s.t === 'cluster' || s.t === 'mini' || s.t === 'banana' || s.t === 'snow') ang = s.spin || 0;
      if (s.t === 'boomerang') ang = s.spin;
      if (s.t === 'sticky' || s.t === 'mine' || s.t === 'beacon' || s.t === 'ball' || s.t === 'bee' || s.t === 'portal' || s.t === 'flare' || s.t === 'aflare' || s.t === 'meteor') ang = s.t === 'bee' ? (s.vx < 0 ? Math.PI : 0) : 0;
      const flip = (s.t === 'rocket' || s.t === 'missile' || s.t === 'bolt' || s.t === 'harpoon' || s.t === 'firework' || s.t === 'nuke') && Math.cos(ang) < 0;
      const r = sp.rotated(ang, flip);
      ctx.drawImage(r.cv, Math.round(s.x - r.ox), Math.round(s.y - r.oy));
      if (s.t === 'mine' && s.arm <= 0 && ((performance.now() / 250) | 0) % 2) { ctx.fillStyle = WTP.PAL.e; ctx.fillRect(Math.round(s.x), Math.round(s.y) - 4, 1, 1); }
    }
    if (st.whip && st.whip.pts.length) {
      const pts = st.whip.pts, N = pts.length - 1;
      for (let i = 0; i < N; i++) {
        const a = pts[i], b = pts[i + 1];
        const th = i < N * 0.35 ? 1 : 0;
        const c = i === N - 1 ? PAL.y : (i & 1 ? PAL.W : PAL.w);
        const len = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
        for (let k = 0; k <= len; k++) { const x = Math.round(a.x + (b.x - a.x) * (k / len)), y = Math.round(a.y + (b.y - a.y) * (k / len)); ctx.fillStyle = PAL['0']; if (th) ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = c; ctx.fillRect(x, y, 1 + th, 1 + th); }
      }
      const tip = pts[N];
      if (st.whip.cracked && st.whip.t < st.whip.dur * 0.62) { ctx.fillStyle = PAL['7']; ctx.fillRect(Math.round(tip.x) - 2, Math.round(tip.y), 5, 1); ctx.fillRect(Math.round(tip.x), Math.round(tip.y) - 2, 1, 5); }
    }
    if (st.latch) {
      const g0 = PL().gunPos || PL().center();
      const L = st.latch, n = Math.ceil(Math.hypot(L.x - g0.x, L.y - g0.y));
      for (let k = 0; k <= n; k += 1) { ctx.fillStyle = k & 1 ? PAL.W : PAL.w; ctx.fillRect(Math.round(g0.x + (L.x - g0.x) * (k / n)), Math.round(g0.y + (L.y - g0.y) * (k / n)), 1, 1); }
    }
    if (st.glove > 0) {
      const P = PL(), g0 = P.gunPos || P.center(), a = Math.atan2(G()?.aim?.y || 0, G()?.aim?.x || P.face);
      const ext = Math.sin((1 - st.glove / 0.22) * Math.PI) * 14;
      for (let k = 2; k < ext; k += 2) { ctx.fillStyle = (k >> 1) & 1 ? PAL['5'] : PAL['3']; ctx.fillRect(Math.round(g0.x + Math.cos(a) * k + Math.sin(a) * ((k >> 1) & 1 ? 1 : -1)), Math.round(g0.y + Math.sin(a) * k), 1, 1); }
      const gx = Math.round(g0.x + Math.cos(a) * (ext + 3)), gy = Math.round(g0.y + Math.sin(a) * (ext + 3));
      ctx.fillStyle = PAL['0']; ctx.fillRect(gx - 3, gy - 3, 7, 7); ctx.fillStyle = PAL.e; ctx.fillRect(gx - 2, gy - 2, 5, 5); ctx.fillStyle = PAL.Y; ctx.fillRect(gx - 1, gy - 2, 2, 1);
    }
    for (const z of st.zones) {
      const k = Math.min(1, z.t / 0.3);
      for (let q = 0; q < 48; q++) { const a = (q / 48) * Math.PI * 2 + z.t; if (((q + ((z.t * 10) | 0)) & 3) === 0) continue; ctx.fillStyle = q & 1 ? PAL.m : PAL.K; ctx.fillRect(Math.round(z.x + Math.cos(a) * z.r * k), Math.round(z.y + Math.sin(a) * z.r * k), 1, 1); }
    }
    if (st.lensAt) { const L = st.lensAt, x = Math.round(L.x), y = Math.round(L.y), r = L.heat > 0.6 ? 1 : 2; ctx.fillStyle = L.heat > 0.6 ? PAL['7'] : PAL.Y; ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1); }
    if (st.penAt) { ctx.fillStyle = PAL['0']; ctx.fillRect(Math.round(st.penAt.x) - 2, Math.round(st.penAt.y) - 2, 5, 5); ctx.fillStyle = st.ink > 0.05 ? PAL.c : PAL.e; ctx.fillRect(Math.round(st.penAt.x) - 1, Math.round(st.penAt.y) - 1, 3, 3); }
    if (st.cur === 'pen' && st.ink < 0.999) { const P = PL(), w = 10, bx = Math.round(P.x + P.w / 2 - w / 2), by = Math.round(P.y - 12); ctx.fillStyle = PAL['0']; ctx.fillRect(bx - 1, by - 1, w + 2, 3); ctx.fillStyle = PAL.c; ctx.fillRect(bx, by, Math.round(w * st.ink), 1); }
    if (st.cur === 'vacuum' && (st.tank > 0 || st.blowing > 0)) { const P = PL(), w = 10, bx = Math.round(P.x + P.w / 2 - w / 2), by = Math.round(P.y - 12); ctx.fillStyle = PAL['0']; ctx.fillRect(bx - 1, by - 1, w + 2, 3); ctx.fillStyle = PAL.a; ctx.fillRect(bx, by, Math.round(w * Math.min(1, (st.tank || st.blowing) / 400)), 1); }
    for (const p of st.portals) {
      if (!p) continue;
      p.t = (p.t || 0) + 0.016;
      const c1 = p.which ? WTP.PAL.o : WTP.PAL.c, c2 = p.which ? WTP.PAL.a : WTP.PAL.C;
      const tx = -p.ny, ty = p.nx;
      for (let k = -6; k <= 6; k++) {
        const w = Math.sqrt(1 - (k / 7) ** 2) * 2;
        const x = Math.round(p.x + tx * k), y = Math.round(p.y + ty * k);
        ctx.fillStyle = Math.abs(k) > 4 || ((k + ((p.t * 20) | 0)) & 3) === 0 ? c2 : c1;
        ctx.fillRect(x - Math.round(p.nx * w), y - Math.round(p.ny * w), 2, 2);
      }
    }
    if (st.ball) {
      const g0 = PL().gunPos || PL().center();
      const b = st.ball;
      const n = 8;
      for (let k = 1; k < n; k++) { const t = k / n; ctx.fillStyle = k & 1 ? WTP.PAL['4'] : WTP.PAL['3']; ctx.fillRect(Math.round(g0.x + (b.x - g0.x) * t), Math.round(g0.y + (b.y - g0.y) * t), 1, 1); }
      ctx.fillStyle = WTP.PAL['0'];
      ctx.beginPath(); ctx.arc(Math.round(b.x), Math.round(b.y), b.r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WTP.PAL['3']; ctx.beginPath(); ctx.arc(Math.round(b.x), Math.round(b.y), b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WTP.PAL['5']; ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 2, 2);
    }
    for (const T of st.tornados) {
      const H = 78;
      const grow = Math.min(1, T.t / 0.6) * Math.min(1, Math.max(0, (T.life - T.t) / 0.5));
      const top = Math.round(H * grow);
      for (let h = 0; h < top; h++) {
        const w = 3 + h * 0.36;
        const wob = Math.sin(T.t * 6 + h * 0.1) * 4;
        const cx = T.x + wob;
        ctx.globalAlpha = 0.45; ctx.fillStyle = WTP.PAL['4'];
        ctx.fillRect(Math.round(cx - w), Math.round(T.y - h), Math.round(w * 2), 1);
        ctx.globalAlpha = 1;
        for (let s = 0; s < 4; s++) {
          const a = T.t * 16 + h * 0.32 + s * 1.57;
          const x = cx + Math.cos(a) * w;
          const front = Math.sin(a) > 0;
          ctx.fillStyle = front ? (h % 6 < 2 ? WTP.PAL['7'] : WTP.PAL['6']) : WTP.PAL['4'];
          ctx.fillRect(Math.round(x), Math.round(T.y - h), front ? 3 : 2, 1);
        }
      }
    }
    if (st.eraserAt) {
      const e = st.eraserAt;
      ctx.strokeStyle = WTP.PAL.k; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(e.x) - 5.5, Math.round(e.y) - 5.5, 11, 11);
    }
    for (const a of FX().anims) {
      if (a.kick) {
        const k = a.t / a.dur;
        const R2 = 5 + k * 6;
        for (let q = -5; q <= 5; q++) { const an = a.a + q * 0.16; if (Math.random() < k * 0.6) continue; ctx.fillStyle = Math.abs(q) < 2 ? PAL['7'] : PAL['6']; ctx.fillRect(Math.round(a.x + Math.cos(an) * R2), Math.round(a.y + Math.sin(an) * R2), 1, 1); }
        continue;
      }
      if (!a.slash) continue;
      const frames = SP.explosions().slash;
      const fr = frames[Math.min(frames.length - 1, Math.floor((a.t / a.dur) * frames.length))];
      ctx.save();
      ctx.translate(Math.round(a.x), Math.round(a.y));
      ctx.rotate(Math.round(a.a / (Math.PI / 8)) * (Math.PI / 8));
      if (a.dir < 0) ctx.scale(1, -1);
      const s = a.r / 14;
      ctx.drawImage(fr, -16 * s, -16 * s, 32 * s, 32 * s);
      ctx.restore();
    }
  }
  function drawSaw(ctx, s) {
    const x = Math.round(s.x), y = Math.round(s.y);
    ctx.fillStyle = PAL['0']; ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = PAL['5']; ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = PAL['6']; ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.fillStyle = PAL['3']; ctx.fillRect(x, y, 1, 1);
    for (let k = 0; k < 6; k++) { const a = s.spin + k * 1.047; ctx.fillStyle = PAL['7']; ctx.fillRect(Math.round(s.x + Math.cos(a) * 4), Math.round(s.y + Math.sin(a) * 4), 1, 1); }
  }
  function drawHole(ctx, s) {
    const r = s.on ? Math.round(s.hr * 0.42 + Math.sin(s.age * 20) * 0.6) : 2;
    const t = s.age;
    for (let k = 0; k < 40; k++) {
      const a = t * 3 + k * 0.157 * 2;
      const rr = r * (1.4 + (k % 3) * 0.4);
      ctx.fillStyle = k % 3 === 0 ? WTP.PAL.K : k % 3 === 1 ? WTP.PAL.m : WTP.PAL.P;
      ctx.fillRect(Math.round(s.x + Math.cos(a) * rr * 1.6), Math.round(s.y + Math.sin(a) * rr * 0.6), 1, 1);
    }
    ctx.fillStyle = WTP.PAL.P;
    ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = WTP.PAL['0'];
    ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), r, 0, Math.PI * 2); ctx.fill();
  }
  function reset() {
    shots.length = 0;
    Object.assign(st, { cd: 0, spin: 0, charge: 0, mag: {}, reload: 0, reloadFor: null, held: null, ball: null, portals: [], stickies: [], mines: [], boomers: 0, waves: [], tornados: [], quakeT: 0, orb: [], whip: null, latch: null, cut: null, tank: 0, tankCols: [], blowing: 0, ink: 1, penLast: null, zones: [], glove: 0, kickCd: 0, thermals: [] });
    WTP.audio.stopLoops();
  }
  function select(id) {
    if (!BY[id]) return false;
    if (st.cur !== id) {
      const old = BY[st.cur];
      if (old && old.loop) WTP.audio.loop(old.loop, false);
      WTP.audio.loop('spin', false); WTP.audio.loop('brrt', false); st.brrt = false;
      if (st.held) { st.held.held = false; W().chunks.push(st.held); st.held = null; }
      if (st.cut) { st.cut.held = false; W().chunks.push(st.cut); st.cut = null; }
      st.whip = null; st.latch = null;
      st.spin = 0; st.charge = 0;
    }
    st.cur = id;
    st.cd = Math.min(st.cd, 0.15);
    return true;
  }

  function shockwave(x, y, r) {
    FX().blast(x, y, r, 300);
    for (const e of EN()?.list || []) { const d = Math.hypot(e.x - x, e.y - y); if (d < r && !e.T.boss) { e.vx += ((e.x - x) / (d || 1)) * 300; e.vy -= 200; e.damage(20, 'sound'); } }
    for (const c of W().chunks) { const d = Math.hypot(c.x - x, c.y - y); if (d < r) { c.vx += ((c.x - x) / (d || 1)) * 300; c.vy -= 200; c.rest = 0; } }
    W().letterRing(x, y, 0, r * 0.6, 120);
    W().crumble(x, y, 0, r * 0.7);
    G()?.shake?.(8);
  }
  WTP.weapons = {
    CATS, DEFS: D, BY, st, shots, update, draw, reset, select, owned, explode, impactChunk, melee, glitchAt, shockwave, conduct, upg, upCost,
    get dmgMul() { return R.dmgMul; },
    heldChunk: () => st.held || st.cut,
    magnetOn: () => st.cur === 'magnet' && WTP.input.wantFire(),
    current: () => BY[st.cur],
    setAmmo: (a) => { st.ammo = a ? { ...a } : null; },
    ammo: () => st.ammo,
    swing: () => {
      const d = BY[st.cur];
      if (d.id === 'hammer' && st.swing > 0) return -(st.swing / 0.22) * 1.8 * st.swingDir * PL().face + 0.6 * PL().face;
      if (d.id === 'katana' && st.swing > 0) return st.swingDir * (1 - st.swing / 0.18) * 1.6 - st.swingDir * 0.8;
      if (d.throw && st.swing > 0) return -st.swing * 6 * PL().face;
      if (d.id === 'whip' && st.whip) { const k = st.whip.t / st.whip.dur; return (k < 0.3 ? -k * 4 : -1.2 + (k - 0.3) * 2.5) * st.whip.dir; }
      if (d.id === 'glove' && st.glove > 0) return 0;
      if (d.id === 'stamp' && st.swing > 0) return -(st.swing / 0.25) * 1.6 * PL().face + 0.4 * PL().face;
      return 0;
    }
  };
})();
