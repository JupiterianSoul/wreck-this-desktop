#!/bin/sh
# Installs Wreck This Desktop on Omarchy: packages, SUPER SHIFT + K, and an app launcher entry.
set -e
here=$(dirname "$(readlink -f "$0")")
hypr="$HOME/.config/hypr"

echo "Installing packages..."
sudo pacman -S --needed webkitgtk-6.0 gtk4-layer-shell python-gobject grim gst-plugins-good

chmod +x "$here/wreck-this-desktop"

if [ -f "$hypr/hyprland.lua" ]; then
  cat > "$hypr/wreck-this-desktop.lua" <<LUA
o.bind("SUPER + SHIFT + K", "Wreck This Desktop", "$here/wreck-this-desktop run")
o.bind("SUPER + SHIFT + ALT + K", "Wreck This Desktop: restore", "$here/wreck-this-desktop restore")
hl.layer_rule({ match = { namespace = "^wreck-this-desktop.*\$" }, no_anim = true, animation = "none" })
LUA
  line='pcall(dofile, os.getenv("HOME") .. "/.config/hypr/wreck-this-desktop.lua")'
  grep -qF "$line" "$hypr/hyprland.lua" || printf '\n%s\n' "$line" >> "$hypr/hyprland.lua"
  hyprctl reload >/dev/null 2>&1 || true
  echo "Bound SUPER SHIFT + K (play) and SUPER SHIFT ALT + K (restore)."
else
  echo "No ~/.config/hypr/hyprland.lua found. Add these to your Hyprland config by hand:"
  echo "  bind = SUPER SHIFT, K, exec, $here/wreck-this-desktop run"
  echo "  bind = SUPER SHIFT ALT, K, exec, $here/wreck-this-desktop restore"
fi

mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/wreck-this-desktop.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Wreck This Desktop
Comment=Blow up whatever is on your screen
Exec=$here/wreck-this-desktop run
Icon=applications-games
Categories=Game;
DESKTOP

echo "Done. Press SUPER SHIFT + K to wreck your desktop, F12 to panic."
