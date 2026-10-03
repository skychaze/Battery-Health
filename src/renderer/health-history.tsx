import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { dayTime, formatHealth } from "../shared/battery";
import type { Day, HealthSample } from "../shared/battery";
import { PLOT, plotHealth } from "./health-plot";
import { usePublishedState } from "./published-state";

export function HealthHistory() {
  const [history] = usePublishedState("healthHistory");
  // A battery that has never reported its health has nothing to graph.

  return (
    <section className="health-history">
      <h2>Health over time</h2>
      {history && history.length > 1 ? (
        <HealthChart samples={history} />
      ) : (
        <p>A daily record starts with your first health reading. Come back tomorrow to see the trend.</p>
      )}
    </section>
  );
}

/** Hover or the arrow keys pick a day. Otherwise the latest is marked. */
function HealthChart({ samples }: { samples: HealthSample[] }) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const width = useWidth(svg);
  const [active, setActive] = useState<number | null>(null);
  const plot = plotHealth(samples, width);
  const first = samples[0]!;
  const last = samples.at(-1)!;
  const shownIndex = active ?? samples.length - 1;
  const shown = plot.points[shownIndex]!;
  const shownSample = samples[shownIndex]!;

  const step = (event: KeyboardEvent) => {
    const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    setActive(Math.min(samples.length - 1, Math.max(0, shownIndex + move)));
  };

  return (
    <div className="health-chart">
      <svg
        ref={setSvg}
        height={PLOT.height}
        role="img"
        tabIndex={0}
        aria-label={`Battery health went from ${formatHealth(first.health)}% on ${formatDay(first.day)} to ${formatHealth(last.health)}% on ${formatDay(last.day)}.`}
        onPointerMove={(event) => setActive(plot.nearest(event.clientX - svg!.getBoundingClientRect().left))}
        onPointerLeave={() => setActive(null)}
        onKeyDown={step}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <>
            {plot.ticks.map((tick) => (
              <g key={tick.health} className="chart-grid">
                <line x1={PLOT.left} x2={width - PLOT.right} y1={tick.y} y2={tick.y} />
                <text x={PLOT.left - 8} y={tick.y} dominantBaseline="middle" textAnchor="end">
                  {tick.health}%
                </text>
              </g>
            ))}
            <text x={PLOT.left} y={PLOT.height - 4}>
              {formatDay(first.day)}
            </text>
            <text x={width - PLOT.right} y={PLOT.height - 4} textAnchor="end">
              {formatDay(last.day)}
            </text>
            <path className="chart-line" d={plot.line} />
            <line
              className="chart-crosshair"
              data-hidden={active === null}
              x1={shown.x}
              x2={shown.x}
              y1={PLOT.top}
              y2={PLOT.height - PLOT.bottom}
            />
            <circle className="chart-dot" cx={shown.x} cy={shown.y} r={4} />
          </>
        )}
      </svg>
      <p
        className="chart-tooltip"
        data-hidden={active === null}
        // Sliding the anchor with the day keeps the tooltip inside the chart at either end.
        style={{ left: shown.x, top: shown.y - 12, translate: `${-shown.along * 100}% -100%` }}
        aria-live="polite"
      >
        <strong>{formatHealth(shownSample.health)}%</strong> {formatDay(shownSample.day)}
      </p>
    </div>
  );
}

const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const formatDay = (day: Day) => dayFormat.format(dayTime(day));

function useWidth(element: Element | null) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}
