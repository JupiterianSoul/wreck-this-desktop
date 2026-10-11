#!/bin/bash
set -e
url="https://github.com/JupiterianSoul/wreck-this-desktop/releases/latest/download/wreck-this-desktop-linux.zip"
dest="$HOME/.local/opt/wreck-this-desktop"
bin="$HOME/.local/bin/wreck-this-desktop"

src=""
here=""
[ -n "${BASH_SOURCE[0]}" ] && [ -f "${BASH_SOURCE[0]}" ] && here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [ -n "$here" ] && [ -x "$here/wreck-this-desktop-bin" ]; then
  src="$here"
else
  echo "Downloading Wreck This Desktop..."
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  if command -v curl >/dev/null; then curl -fL --progress-bar "$url" -o "$tmp/wtd.zip"; else wget -q --show-progress "$url" -O "$tmp/wtd.zip"; fi
  if command -v unzip >/dev/null; then unzip -q "$tmp/wtd.zip" -d "$tmp"; else python3 -m zipfile -e "$tmp/wtd.zip" "$tmp"; fi
  src="$tmp/wreck-this-desktop"
fi

pkill -f "$dest/wreck-this-desktop-bin" 2>/dev/null || true
rm -rf "$dest"
mkdir -p "$dest" "$HOME/.local/bin" "$HOME/.local/share/applications"
cp -r "$src/." "$dest/"
chmod +x "$dest/wreck-this-desktop-bin" "$dest/install.sh" 2>/dev/null || true
chmod +x "$dest"/chrome_crashpad_handler 2>/dev/null || true

cat > "$bin" <<LAUNCH
#!/bin/sh
unset ELECTRON_RUN_AS_NODE
exec "$dest/wreck-this-desktop-bin" --no-sandbox "\$@"
LAUNCH
chmod +x "$bin"

cat > "$HOME/.local/share/applications/wreck-this-desktop.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Wreck This Desktop
Comment=Your screen becomes the level
Exec=$bin
Icon=$dest/resources/app/icon.png
Categories=Game;
DESKTOP
update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true

key="<Super><Shift>k"
bound=""
if command -v gsettings >/dev/null && gsettings list-schemas 2>/dev/null | grep -qx org.gnome.settings-daemon.plugins.media-keys; then
  base=org.gnome.settings-daemon.plugins.media-keys
  path=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/wreck-this-desktop/
  list=$(gsettings get $base custom-keybindings)
  if ! echo "$list" | grep -qF "$path"; then
    case "$list" in
      "@as []"|"[]") list="['$path']" ;;
      *) list="${list%]}, '$path']" ;;
    esac
    gsettings set $base custom-keybindings "$list"
  fi
  gsettings set $base.custom-keybinding:$path name "Wreck This Desktop"
  gsettings set $base.custom-keybinding:$path command "$bin"
  gsettings set $base.custom-keybinding:$path binding "$key"
  bound=1
fi

if [ "$XDG_SESSION_TYPE" = "wayland" ] && ! command -v gnome-screenshot >/dev/null; then
  echo
  echo "On Wayland the game needs gnome-screenshot to see your screen."
  if command -v apt-get >/dev/null; then
    echo "Installing it now (asks for your password)..."
    sudo apt-get install -y gnome-screenshot || echo "Could not install it. Run: sudo apt install gnome-screenshot"
  else
    echo "Install the gnome-screenshot package with your package manager."
  fi
fi

echo
echo "Wreck This Desktop is installed."
if [ -n "$bound" ]; then
  echo "Press SUPER + SHIFT + K anywhere to wreck whatever is on your screen."
else
  echo "Bind a keyboard shortcut to: $bin"
fi
echo "It is also in your app menu. Esc pauses, F12 quits instantly."
