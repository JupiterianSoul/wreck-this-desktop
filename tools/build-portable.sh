#!/bin/bash
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
ver=${ELECTRON_VERSION:-44.4.5}
cache="${XDG_CACHE_HOME:-$HOME/.cache}/wreck-this-desktop/electron-$ver"
out="$root/dist"
base="https://github.com/electron/electron/releases/download/v$ver"
mkdir -p "$cache"
rm -rf "$out"
mkdir -p "$out"

[ -f "$cache/SHASUMS256.txt" ] || curl -fsSL "$base/SHASUMS256.txt" -o "$cache/SHASUMS256.txt"

fetch() {
  local f="electron-v$ver-$1.zip"
  if [ ! -f "$cache/$f" ]; then
    echo "downloading $f"
    curl -fL --progress-bar "$base/$f" -o "$cache/$f.part"
    mv "$cache/$f.part" "$cache/$f"
  fi
  (cd "$cache" && grep " \*\?$f\$" SHASUMS256.txt | sed 's/ \*/  /' | sha256sum -c --quiet -)
}

app_files() {
  local app="$1"
  mkdir -p "$app"
  cp "$root/portable/main.js" "$root/portable/preload.js" "$root/portable/package.json" "$root/portable/icon.png" "$app/"
  cp -r "$root/web" "$app/web"
}

trim_locales() {
  find "$1/locales" -type f ! -name 'en-US.pak' ! -name 'fr.pak' -delete
}

fetch win32-x64
w="$out/stage-win/Wreck This Desktop"
mkdir -p "$w"
unzip -q "$cache/electron-v$ver-win32-x64.zip" -d "$w"
mv "$w/electron.exe" "$w/Wreck This Desktop.exe"
rm -f "$w/resources/default_app.asar"
trim_locales "$w"
app_files "$w/resources/app"
cp "$root/portable/capture-win.ps1" "$w/resources/app/"
cp "$root/portable/icon.ico" "$w/"
cp "$root/portable/install/install.ps1" "$root/portable/install/Install.cmd" "$w/"
(cd "$out/stage-win" && zip -qr -9 "$out/wreck-this-desktop-windows.zip" "Wreck This Desktop")

fetch linux-x64
l="$out/stage-linux/wreck-this-desktop"
mkdir -p "$l"
unzip -q "$cache/electron-v$ver-linux-x64.zip" -d "$l"
mv "$l/electron" "$l/wreck-this-desktop-bin"
rm -f "$l/resources/default_app.asar"
trim_locales "$l"
app_files "$l/resources/app"
cp "$root/portable/x11-windows.py" "$l/resources/app/"
cp "$root/portable/install/install.sh" "$l/"
(cd "$out/stage-linux" && zip -qr -9 -y "$out/wreck-this-desktop-linux.zip" "wreck-this-desktop")

cp "$root/portable/install/install.ps1" "$root/portable/install/install.sh" "$out/"
rm -rf "$out/stage-win" "$out/stage-linux"
ls -lh "$out"
