#!/usr/bin/env bash
# Set the fake battery the running preview reads on its next check.
# Usage: battery.sh <Charging|Discharging|Full|Not charging> <percent 0-100> [health]
# A percent that is not a number makes the battery unreadable. A health sets the full charge as that percent of
# the design capacity, and `none` removes both so the battery reports no health. Without one, it stays as it was.
set -euo pipefail
. "$(dirname "$0")/common.sh"
status="${1:?usage: battery.sh <Charging|Discharging|Full|Not charging> <percent>}"
percent="${2:?usage: battery.sh <status> <percent> [health]}"
health="${3:-}"

mkdir -p "$POWER_SUPPLY/BAT0" "$POWER_SUPPLY/AC"
# A wireless mouse's battery comes first and must be skipped by its Device scope.
mkdir -p "$POWER_SUPPLY/0-hidpp_battery_0"
printf 'Battery\n' >"$POWER_SUPPLY/0-hidpp_battery_0/type"
printf 'Device\n' >"$POWER_SUPPLY/0-hidpp_battery_0/scope"
printf '5\n' >"$POWER_SUPPLY/0-hidpp_battery_0/capacity"
printf 'Discharging\n' >"$POWER_SUPPLY/0-hidpp_battery_0/status"
printf 'Mains\n' >"$POWER_SUPPLY/AC/type"
printf 'Battery\n' >"$POWER_SUPPLY/BAT0/type"
printf '%s\n' "$percent" >"$POWER_SUPPLY/BAT0/capacity"
printf '%s\n' "$status" >"$POWER_SUPPLY/BAT0/status"
if [ "$health" = none ]; then
  rm -f "$POWER_SUPPLY/BAT0/energy_full" "$POWER_SUPPLY/BAT0/energy_full_design"
elif [ -n "$health" ]; then
  printf '50000000\n' >"$POWER_SUPPLY/BAT0/energy_full_design"
  printf '%s\n' "$((health * 500000))" >"$POWER_SUPPLY/BAT0/energy_full"
fi

echo "$(date +%H:%M:%S) battery -> $status $percent%${health:+, health $health}" | tee -a "$RUN_DIR/battery-timeline.log"
