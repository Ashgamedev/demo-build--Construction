/**
 * The Gantt half of the Schedule tab.
 *
 * Layout follows what anyone who has used a scheduling package expects - date
 * bands across the top, one bar per row, dependency arrows between them, a
 * line marking today - because that convention is the reason the screen is
 * readable without being explained. The drawing itself is ours: rounded bars,
 * the app's own palette, and a progress fill inside the bar rather than a
 * separate hatched overlay.
 *
 * Bars are absolutely positioned by date rather than laid out in a grid of
 * day cells. A hundred-activity job over two years would otherwise be tens of
 * thousands of DOM nodes.
 */

import { Fragment, useMemo } from 'react';
import {
  ChartRange,
  DisplayRow,
  DAY_WIDTH,
  HEADER_H,
  ROW_H,
  ZoomLevel,
  minorTicks,
  monthBands,
  offDayStripes,
  shortDate,
  widthFor,
  xFor,
} from './ganttUtils';

interface Props {
  rows: DisplayRow[];
  range: ChartRange;
  zoom: ZoomLevel;
  showBaseline: boolean;
  showLinks: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Bar geometry per activity, reused by the arrow layer. */
interface BarBox {
  left: number;
  right: number;
  top: number;
  centerY: number;
}

export function GanttChart({
  rows,
  range,
  zoom,
  showBaseline,
  showLinks,
  selectedId,
  onSelect,
}: Props) {
  const dayW = DAY_WIDTH[zoom];
  const months = useMemo(() => monthBands(range, zoom), [range, zoom]);
  const ticks = useMemo(() => minorTicks(range, zoom), [range, zoom]);
  const stripes = useMemo(() => offDayStripes(range, zoom), [range, zoom]);

  const todayX = xFor(Date.now(), range, zoom);

  // Where every activity bar sits, so arrows can be drawn between them.
  const boxes = useMemo(() => {
    const map = new Map<string, BarBox>();
    rows.forEach((row, i) => {
      if (row.kind !== 'activity') return;
      const a = row.activity;
      const left = xFor(a.startDate, range, zoom);
      const width = widthFor(a.startDate, a.finishDate, zoom);
      map.set(a.id, {
        left,
        right: left + width,
        top: i * ROW_H,
        centerY: i * ROW_H + ROW_H / 2,
      });
    });
    return map;
  }, [rows, range, zoom]);

  const bodyHeight = rows.length * ROW_H;

  return (
    <div className="relative" style={{ width: range.width }}>
      {/* ---- date header ---- */}
      <div
        className="sticky top-0 z-20 bg-white border-b border-slate-200"
        style={{ height: HEADER_H, width: range.width }}
      >
        <div className="relative h-7 border-b border-slate-100">
          {months.map((m) => (
            <div
              key={m.key}
              className="absolute top-0 h-7 flex items-center justify-center border-l border-slate-200 text-[11px] font-semibold text-slate-600 tracking-wide overflow-hidden whitespace-nowrap"
              style={{ left: m.x, width: m.width }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: HEADER_H - 28 }}>
          {ticks.map((t) => (
            <div
              key={t.key}
              className="absolute top-0 bottom-0 flex items-center justify-center border-l border-slate-100 text-[10px] text-slate-400 overflow-hidden"
              style={{ left: t.x, width: t.width }}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ---- chart body ---- */}
      <div className="relative" style={{ height: bodyHeight, width: range.width }}>
        {/* Sunday shading */}
        {stripes.map((s) => (
          <div
            key={s.key}
            className="absolute top-0 bg-slate-50"
            style={{ left: s.x, width: s.width, height: bodyHeight }}
          />
        ))}

        {/* Month gridlines */}
        {months.map((m) => (
          <div
            key={`g-${m.key}`}
            className="absolute top-0 border-l border-slate-100"
            style={{ left: m.x, height: bodyHeight }}
          />
        ))}

        {/* Row banding, so the eye can track a bar back to its name */}
        {rows.map((row, i) => (
          <div
            key={`r-${row.id}`}
            className={`absolute left-0 border-b border-slate-100 ${
              row.kind === 'stage'
                ? 'bg-slate-50/80'
                : selectedId === row.id
                  ? 'bg-brand-50'
                  : ''
            }`}
            style={{ top: i * ROW_H, height: ROW_H, width: range.width }}
          />
        ))}

        {/* Today */}
        {todayX >= 0 && todayX <= range.width && (
          <div
            className="absolute top-0 z-10 border-l-2 border-amber-500/70"
            style={{ left: todayX, height: bodyHeight }}
          >
            <span className="absolute -top-[18px] -translate-x-1/2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Today
            </span>
          </div>
        )}

        {/* Dependency arrows, beneath the bars so they never obscure one */}
        {showLinks && (
          <ArrowLayer rows={rows} boxes={boxes} width={range.width} height={bodyHeight} dayW={dayW} />
        )}

        {/* Bars */}
        {rows.map((row, i) => (
          <Fragment key={`b-${row.id}`}>
            {row.kind === 'stage' ? (
              <StageBar row={row} top={i * ROW_H} range={range} zoom={zoom} />
            ) : (
              <ActivityBar
                row={row}
                top={i * ROW_H}
                range={range}
                zoom={zoom}
                showBaseline={showBaseline}
                selected={selectedId === row.id}
                onSelect={onSelect}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bars                                                                */
/* ------------------------------------------------------------------ */

function StageBar({
  row,
  top,
  range,
  zoom,
}: {
  row: Extract<DisplayRow, { kind: 'stage' }>;
  top: number;
  range: ChartRange;
  zoom: ZoomLevel;
}) {
  const left = xFor(row.rollup.startDate, range, zoom);
  const width = widthFor(row.rollup.startDate, row.rollup.finishDate, zoom);

  return (
    <div
      className="absolute z-[5] flex items-center"
      style={{ left, width, top: top + ROW_H / 2 - 7 }}
      title={`${row.name} — ${shortDate(row.rollup.startDate)} to ${shortDate(row.rollup.finishDate)}`}
    >
      {/* A summary spans its children, so it is drawn as a slim bracket rather
          than a solid bar - the shape says "this is a total, not work". */}
      <div className="relative h-[7px] w-full rounded-sm bg-slate-500">
        <span className="absolute -bottom-[4px] left-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-500" />
        <span className="absolute -bottom-[4px] right-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-500" />
        <span
          className="absolute inset-y-0 left-0 rounded-sm bg-slate-800"
          style={{ width: `${row.rollup.percentComplete}%` }}
        />
      </div>
    </div>
  );
}

function ActivityBar({
  row,
  top,
  range,
  zoom,
  showBaseline,
  selected,
  onSelect,
}: {
  row: Extract<DisplayRow, { kind: 'activity' }>;
  top: number;
  range: ChartRange;
  zoom: ZoomLevel;
  showBaseline: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const a = row.activity;
  const left = xFor(a.startDate, range, zoom);
  const width = widthFor(a.startDate, a.finishDate, zoom);
  const isMilestone = a.durationDays === 0;

  const tip = [
    a.name,
    `${shortDate(a.startDate)} → ${shortDate(a.finishDate)}  (${a.durationDays}d)`,
    a.isCritical ? 'On the critical path' : `Slack: ${a.totalFloat}d`,
    `${a.percentComplete}% complete`,
    a.delayReason ? `Delay: ${a.delayReason}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      {/* Baseline: where this was planned to sit before anything moved. Drawn
          as a thin bar underneath, the standard way of showing plan vs actual. */}
      {showBaseline && a.baselineStartDate && a.baselineFinishDate && (
        <div
          className="absolute z-[4] rounded-sm bg-slate-300"
          style={{
            left: xFor(a.baselineStartDate, range, zoom),
            width: widthFor(a.baselineStartDate, a.baselineFinishDate, zoom),
            top: top + ROW_H - 9,
            height: 4,
          }}
          title={`Planned: ${shortDate(a.baselineStartDate)} → ${shortDate(a.baselineFinishDate)}`}
        />
      )}

      {isMilestone ? (
        <button
          onClick={() => onSelect(a.id)}
          className="absolute z-[6]"
          style={{ left: left - 7, top: top + ROW_H / 2 - 7 }}
          title={tip}
        >
          <span
            className={`block h-3.5 w-3.5 rotate-45 rounded-[2px] ${
              a.percentComplete >= 100
                ? 'bg-emerald-600'
                : a.isCritical
                  ? 'bg-rose-600'
                  : 'bg-brand-600'
            } ${selected ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
          />
        </button>
      ) : (
        <button
          onClick={() => onSelect(a.id)}
          className={`absolute z-[6] overflow-hidden rounded-md text-left transition-shadow ${
            selected ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:shadow-md'
          }`}
          style={{ left, width, top: top + ROW_H / 2 - 9, height: 18 }}
          title={tip}
        >
          <span
            className={`absolute inset-0 ${
              a.percentComplete >= 100
                ? 'bg-emerald-200'
                : a.isCritical
                  ? 'bg-rose-200'
                  : 'bg-brand-100'
            }`}
          />
          {/* Progress fill: how much of this bar is actually done. */}
          <span
            className={`absolute inset-y-0 left-0 ${
              a.percentComplete >= 100
                ? 'bg-emerald-600'
                : a.isCritical
                  ? 'bg-rose-600'
                  : 'bg-brand-500'
            }`}
            style={{ width: `${Math.min(100, a.percentComplete)}%` }}
          />
          {width > 54 && (
            <span className="relative z-10 block truncate px-1.5 text-[10px] font-semibold leading-[18px] text-slate-900/80">
              {a.percentComplete > 0 ? `${a.percentComplete}%` : ''}
            </span>
          )}
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dependency arrows                                                   */
/* ------------------------------------------------------------------ */

/**
 * Draws the links between bars.
 *
 * These are what turn a bar chart into a schedule: without them nobody can see
 * WHY an activity sits where it does. Routed as right-angled elbows, which
 * stay legible when a dozen of them converge on one bar.
 */
function ArrowLayer({
  rows,
  boxes,
  width,
  height,
  dayW,
}: {
  rows: DisplayRow[];
  boxes: Map<string, BarBox>;
  width: number;
  height: number;
  dayW: number;
}) {
  const paths = useMemo(() => {
    const out: { d: string; critical: boolean; key: string }[] = [];
    // Keep the elbow clear of the bar it leaves, but never wider than the
    // gap itself at tight zooms.
    const stub = Math.max(6, Math.min(12, dayW * 1.5));

    rows.forEach((row) => {
      if (row.kind !== 'activity') return;
      const succ = boxes.get(row.id);
      if (!succ) return;

      (row.activity.predecessors || []).forEach((link) => {
        const pred = boxes.get(link.predecessorId);
        if (!pred) return;

        // Leave from the predecessor's finish for FS/FF, its start otherwise.
        const fromX = link.type === 'SS' || link.type === 'SF' ? pred.left : pred.right;
        const fromY = pred.centerY;
        // Arrive at the successor's start for FS/SS, its finish otherwise.
        const toX = link.type === 'FF' || link.type === 'SF' ? succ.right : succ.left;
        const toY = succ.centerY;

        const critical = row.activity.isCritical;
        const midX = toX - stub;

        let d: string;
        if (midX > fromX + 2) {
          // Clear gap between the bars: out, across, down, in.
          d = `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
        } else if (toX >= fromX - 1) {
          // Back-to-back, which is the common case - the successor starts the
          // day the predecessor ends. Drop straight down and step across.
          // Routing this through the elbow above would send the line backwards
          // and then forwards again, which looks like a fault rather than a link.
          d = `M ${fromX} ${fromY} V ${toY} H ${toX}`;
        } else {
          // Successor genuinely starts before the predecessor ends (an SS or FF
          // overlap). Loop around underneath rather than drawing backwards
          // through the bars.
          d = `M ${fromX} ${fromY} H ${fromX + stub} V ${(fromY + toY) / 2} H ${toX - stub} V ${toY} H ${toX}`;
        }

        out.push({ d, critical, key: `${link.predecessorId}->${row.id}` });
      });
    });
    return out;
  }, [rows, boxes, dayW]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[5]"
      width={width}
      height={height}
      aria-hidden="true"
    >
      <defs>
        <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-slate-400" />
        </marker>
        <marker id="gantt-arrow-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-rose-500" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          strokeWidth={p.critical ? 1.6 : 1.1}
          className={p.critical ? 'stroke-rose-400' : 'stroke-slate-300'}
          markerEnd={`url(#gantt-arrow${p.critical ? '-critical' : ''})`}
        />
      ))}
    </svg>
  );
}
