# Health history

The main process keeps the last health of each local day in `health-history.json` beside the settings, and the window graphs it under the header. A check without a health reading records nothing, and a check from a day before the last sample, such as after the clock moves back, is dropped. With fewer than two days the window says the graph appears after the second day. Hovering the graph, or focusing it and pressing the arrow keys, shows one day's health and date.

## Sub-features

- One sample per day, replaced by the day's later readings.
- The live update of today's point after a check.
- The hover and keyboard tooltip.
- Malformed saved samples are skipped on load.

## How to get to it (user POV)

Open the window. The graph sits below the health figure.

## Driving it with the harness

```sh
H='[{"day":"2025-10-02","health":98},{"day":"2026-03-20","health":93},{"day":"2026-09-01","health":88},{"day":"bad","health":5}]'
$S/launch.sh --settings '{"intervalSeconds":2}' --history "$H" && sleep 3 && node $S/drive.ts screenshot "$EVIDENCE" chart
$S/battery.sh Discharging 50 84 && sleep 4 && node $S/drive.ts screenshot "$EVIDENCE" chart-84
node $S/drive.ts hover img "Battery health" && node $S/drive.ts screenshot "$EVIDENCE" hover
node $S/drive.ts press img "Battery health" ArrowLeft && node $S/drive.ts screenshot "$EVIDENCE" keyboard
$S/collect.sh "$EVIDENCE"
```

Proof: the chart ends at today's health and moves when the battery's health does; `health-history.json` holds one sample for today and no `bad` day; the tooltip names the hovered or selected day. Launch without `--history` to see the empty state.

## Gotchas

- Days come from the machine's local clock. The harness cannot move it, so seed past days with `--history`.
