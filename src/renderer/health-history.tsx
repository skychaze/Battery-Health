import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HealthSample } from "../shared/battery";
import { dayTime, PLOT, plotHealth } from "./health-plot";
import { usePublishedState } from "./published-state";

export function HealthHistory() {
  const [history] = usePublishedState("healthHistory");
  return (
    <section className="health-history">
      <h2>Health over time</h2>
      {history && history.length > 1 ? (
        <HealthChart samples={history} />
      ) : (
        <p>Tether saves the health once a day. The graph appears after the second day.</p>
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
        aria-label={`Battery health went from ${first.health}% on ${formatDay(first.day)} to ${last.health}% on ${formatDay(last.day)}.`}
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
        style={{ left: Math.min(Math.max(shown.x, 44), width - 44), top: shown.y - 12 }}
        aria-live="polite"
      >
        <strong>{samples[shownIndex]!.health}%</strong> {formatDay(samples[shownIndex]!.day)}
      </p>
    </div>
  );
}

const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const formatDay = (day: string) => dayFormat.format(dayTime(day));

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
