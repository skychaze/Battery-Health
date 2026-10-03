#!/usr/bin/env bash
# Read or click the running preview's tray menu. Electron publishes it on the session bus as a
# StatusNotifierItem, which works under Xvfb because the bus is the real session's. It needs the desktop's
# tray host (a StatusNotifierWatcher) running when the preview launches.
#   tray.sh layout            print each item as ID<TAB>enabled<TAB>label
#   tray.sh click <label>     click the item with exactly this label
#   tray.sh icon <dir> [name] save the icon as <dir>/<name>.png (default tray-icon) and print the tooltip
set -euo pipefail
. "$(dirname "$0")/common.sh"
owned_alive "$RUN_DIR/run.pid" "$BIN" || { echo "No harness preview is running." >&2; exit 1; }
dbus-send --session --print-reply --dest=org.freedesktop.DBus / org.freedesktop.DBus.NameHasOwner \
  string:org.kde.StatusNotifierWatcher 2>/dev/null | grep -q 'boolean true' || {
  echo "No StatusNotifierWatcher on the session bus, so the preview has no tray menu to read." >&2
  exit 1
}
dest="org.freedesktop.StatusNotifierItem-$(cat "$RUN_DIR/run.pid")-1"

layout() {
  gdbus call --session --dest "$dest" --object-path /org/chromium/DbusMenu \
    --method com.canonical.dbusmenu.GetLayout -- 0 -1 '["label","enabled"]' |
    python3 -c '
import re, sys
for id, props in re.findall(r"<\((\d+), (@a\{sv\} \{\}|\{[^}]*\})", sys.stdin.read()):
    label = re.search(r"'"'"'label'"'"': <'"'"'(.*?)'"'"'>", props)
    enabled = "false" if "<false>" in props else "true"
    print(id, enabled, label.group(1) if label else "---", sep="\t")
'
}

case "${1:-}" in
  layout) layout ;;
  click)
    label="${2:?usage: tray.sh click <label>}"
    id="$(layout | awk -F '\t' -v label="$label" '$3 == label { print $1; exit }')"
    [ -n "$id" ] || { echo "No tray item labelled \"$label\"." >&2; exit 1; }
    gdbus call --session --dest "$dest" --object-path /org/chromium/DbusMenu \
      --method com.canonical.dbusmenu.Event -- "$id" clicked '<"">' 0 >/dev/null
    echo "CLICKED tray \"$label\""
    ;;
  icon)
    dir="${2:?usage: tray.sh icon <dir> [name]}"
    out="$dir/${3:-tray-icon}.png"
    # Electron writes the icon to a file and publishes its directory and name, not a pixmap.
    gdbus call --session --dest "$dest" --object-path /StatusNotifierItem \
      --method org.freedesktop.DBus.Properties.GetAll org.kde.StatusNotifierItem |
      python3 -c '
import re, shutil, sys
props = sys.stdin.read()
path = re.search(r"'"'"'IconThemePath'"'"': <'"'"'(.*?)'"'"'>", props)
name = re.search(r"'"'"'IconName'"'"': <'"'"'(.*?)'"'"'>", props)
tooltip = re.search(r"'"'"'ToolTip'"'"': <\(.*?, .*?, '"'"'(.*?)'"'"', '"'"'(.*?)'"'"'\)>", props)
if not (path and name and tooltip):
    sys.exit(f"The tray item did not publish an icon file and tooltip:\n{props}")
path, name = path.group(1), name.group(1)
shutil.copy(f"{path}/{name}.png", sys.argv[1])
print(f"ICON {sys.argv[1]}")
print("TOOLTIP", " | ".join(part for part in tooltip.groups() if part).replace("\\n", " / "))
' "$out"
    ;;
  *) echo "usage: tray.sh <layout | click LABEL | icon DIR [NAME]>" >&2; exit 2 ;;
esac
