/**
 * Geometry and row-model shared by the schedule table and the Gantt chart.
 *
 * Both panes have to agree on exactly how tall a row is and exactly where a
 * date sits on the horizontal axis, or the bars stop lining up with the rows
 * next to them. Keeping the numbers in one file is what stops that drifting.
 */

import { ScheduledActivity, StageRollup } from '../../../lib/cpm';

/** Row height, shared by the table and the chart so the two panes align. */
export const ROW_H = 36;
/** Height of the two-band date header. */
export const HEADER_H = 56;

export type ZoomLevel = 'day' | 'week' | 'month';

/** Pixels per calendar day at each zoom. */
export const DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 26,
  week: 9,
  month: 3.2,
};

export const MS_PER_DAY = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole calendar days from `a` to `b`. */
export function dayDiff(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);
}

/**
 * One line in the schedule. Stage rows are the WBS summary level - the thing
 * that makes this an outline rather than a flat list, and what lets the Stages
 * tab and the Schedule tab show the same data at two altitudes.
 */
export type DisplayRow =
  | { kind: 'stage'; id: string; name: string; rollup: StageRollup }
  | { kind: 'activity'; id: string; activity: ScheduledActivity; stageId?: string };

export interface ChartRange {
  start: number;
  end: number;
  totalDays: number;
  width: number;
}

/**
 * The horizontal extent of the chart. Padded on both sides so a bar never
 * touches the edge, and widened to cover the baseline as well - otherwise a
 * project running late draws its baseline bar off-screen, which is the one
 * comparison the viewer most wants to make.
 */
export function chartRange(rows: DisplayRow[], zoom: ZoomLevel): ChartRange {
  const dates: number[] = [];
  rows.forEach((r) => {
    if (r.kind === 'activity') {
      dates.push(r.activity.startDate, r.activity.finishDate);
      if (r.activity.baselineStartDate) dates.push(r.activity.baselineStartDate);
      if (r.activity.baselineFinishDate) dates.push(r.activity.baselineFinishDate);
    } else {
      dates.push(r.rollup.startDate, r.rollup.finishDate);
    }
  });
  // Always keep today in frame, so the "you are here" line is never lost.
  dates.push(Date.now());

  if (dates.length === 0) {
    const today = startOfDay(Date.now());
    return { start: today, end: today + 30 * MS_PER_DAY, totalDays: 30, width: 30 * DAY_WIDTH[zoom] };
  }

  const start = startOfDay(Math.min(...dates)) - 5 * MS_PER_DAY;
  const end = startOfDay(Math.max(...dates)) + 12 * MS_PER_DAY;
  const totalDays = dayDiff(start, end) + 1;

  return { start, end, totalDays, width: totalDays * DAY_WIDTH[zoom] };
}

/** Left offset in pixels for a date. */
export function xFor(date: number, range: ChartRange, zoom: ZoomLevel): number {
  return dayDiff(range.start, date) * DAY_WIDTH[zoom];
}

/** Width in pixels of an inclusive date span. */
export function widthFor(from: number, to: number, zoom: ZoomLevel): number {
  return Math.max(DAY_WIDTH[zoom] * 0.85, (dayDiff(from, to) + 1) * DAY_WIDTH[zoom]);
}

export interface TickBand {
  label: string;
  x: number;
  width: number;
  key: string;
}

/** Month band across the top of the chart. */
export function monthBands(range: ChartRange, zoom: ZoomLevel): TickBand[] {
  const bands: TickBand[] = [];
  const cursor = new Date(range.start);
  cursor.setDate(1);

  while (cursor.getTime() <= range.end) {
    const monthStart = cursor.getTime();
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);

    const from = Math.max(monthStart, range.start);
    const to = Math.min(next.getTime() - MS_PER_DAY, range.end);
    const x = xFor(from, range, zoom);
    const width = (dayDiff(from, to) + 1) * DAY_WIDTH[zoom];

    if (width > 0) {
      // A month clipped by the edge of the chart can be a few pixels wide.
      // Labelling it gives a lone "S" floating in the header, which reads as
      // a glitch - keep the gridline, drop the text.
      const label =
        width < 26
          ? ''
          : cursor.toLocaleDateString('en-IN', {
              month: 'short',
              year: width < 70 ? undefined : '2-digit',
            });
      bands.push({ key: `m-${monthStart}`, label, x, width });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return bands;
}

/**
 * The lower band: individual days when zoomed in, week-commencing dates when
 * zoomed out. At month zoom it is dropped entirely - the labels would be
 * unreadable and the chart reads better as clean month blocks.
 */
export function minorTicks(range: ChartRange, zoom: ZoomLevel): TickBand[] {
  if (zoom === 'month') return [];

  const ticks: TickBand[] = [];
  const step = zoom === 'day' ? 1 : 7;
  const cursor = new Date(range.start);

  if (zoom === 'week') {
    // Snap to Monday so the columns line up with how a week is read.
    const shift = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - shift);
  }

  while (cursor.getTime() <= range.end) {
    const x = xFor(cursor.getTime(), range, zoom);
    ticks.push({
      key: `t-${cursor.getTime()}`,
      label: zoom === 'day' ? String(cursor.getDate()) : `${cursor.getDate()}`,
      x,
      width: step * DAY_WIDTH[zoom],
    });
    cursor.setDate(cursor.getDate() + step);
  }
  return ticks;
}

/** Sunday shading, so the six-day working week is visible on the chart. */
export function offDayStripes(range: ChartRange, zoom: ZoomLevel): { x: number; width: number; key: string }[] {
  // Below week zoom the stripes turn into visual noise rather than information.
  if (zoom === 'month') return [];

  const stripes: { x: number; width: number; key: string }[] = [];
  const cursor = new Date(range.start);
  cursor.setDate(cursor.getDate() + ((7 - cursor.getDay()) % 7)); // next Sunday

  while (cursor.getTime() <= range.end) {
    stripes.push({
      key: `o-${cursor.getTime()}`,
      x: xFor(cursor.getTime(), range, zoom),
      width: DAY_WIDTH[zoom],
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return stripes;
}

/** Compact date for table cells: "14 Mar". */
export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** With the year, for headline dates where the year genuinely matters. */
export function fullDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "on time" / "6 days late" / "3 days early" - written the way it is spoken. */
export function varianceLabel(days: number): string {
  if (days === 0) return 'On time';
  const n = Math.abs(days);
  return `${n} ${n === 1 ? 'day' : 'days'} ${days > 0 ? 'late' : 'early'}`;
}

/** Float, in the same voice. */
export function floatLabel(days: number): string {
  if (days <= 0) return 'No slack';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
