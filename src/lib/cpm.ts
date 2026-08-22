/**
 * Critical Path Method scheduling.
 *
 * This is the engine behind the Schedule tab, and the reason that tab is not
 * just a prettier checklist: the user supplies a DURATION and what each
 * activity DEPENDS ON, and the dates fall out of the calculation. Move one
 * activity and everything downstream moves with it.
 *
 * Deliberately a pure module - no React, no store, no Firestore. Given
 * activities in, it returns a schedule out. That makes it testable and means
 * both the Schedule tab and the Stages tab compute from exactly the same code,
 * so the two views can never disagree.
 *
 * Terms, since they show up all over the UI:
 *
 *   Early Start / Early Finish  the soonest an activity can run, given
 *                              everything it waits on (forward pass)
 *   Late Start / Late Finish    the latest it can run without pushing the
 *                              project's finish date out (backward pass)
 *   Total float                 how many working days it can slip before the
 *                              HANDOVER date moves. Zero means critical.
 *   Free float                  how many days it can slip before the very next
 *                              activity is disturbed. Always <= total float.
 *   Critical path               the chain with no float. This is the only work
 *                              where a day lost is a day lost on the project.
 *
 * Everything internal is done in WORKING-DAY INDEXES, not milliseconds -
 * integer arithmetic, no timezone or daylight-saving traps. Indexes are
 * converted to real dates once, at the end.
 *
 * Interval convention: `es` is the index of the first working day, `ef` is the
 * index of the day AFTER the last working day (half-open, like array slices).
 * So duration = ef - es, and a zero-duration milestone has es === ef. This
 * keeps the dependency arithmetic free of +1/-1 corrections; the only place it
 * is undone is when showing a finish date to a human, who expects the last day
 * actually worked.
 */

import { ScheduleActivity, DependencyType } from '../types';

/* ------------------------------------------------------------------ */
/* Working calendar                                                    */
/* ------------------------------------------------------------------ */

/**
 * Which weekdays are NOT worked. Sunday only, which is how sites around
 * Nagercoil actually run - six-day weeks, and the crew is on site Saturday.
 * A Mon-Fri default would put every schedule roughly 15% out.
 */
export interface WorkCalendar {
  /** 0 = Sunday ... 6 = Saturday */
  offDays: number[];
  /** Extra non-working dates (festivals, declared holidays), as ms timestamps. */
  holidays: number[];
}

export const DEFAULT_CALENDAR: WorkCalendar = { offDays: [0], holidays: [] };

const MS_PER_DAY = 86_400_000;

/** Midnight local time, so day maths never drifts on a partial timestamp. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isHoliday(dayStart: number, cal: WorkCalendar): boolean {
  return cal.holidays.some((h) => startOfDay(h) === dayStart);
}

export function isWorkingDay(ts: number, cal: WorkCalendar = DEFAULT_CALENDAR): boolean {
  const day = startOfDay(ts);
  return !cal.offDays.includes(new Date(day).getDay()) && !isHoliday(day, cal);
}

/** The first working day on or after `ts`. */
export function nextWorkingDay(ts: number, cal: WorkCalendar = DEFAULT_CALENDAR): number {
  let d = startOfDay(ts);
  // Bounded so a calendar that marks every day off can never spin forever.
  for (let guard = 0; guard < 400 && !isWorkingDay(d, cal); guard += 1) {
    d += MS_PER_DAY;
  }
  return d;
}

/**
 * Converts between working-day indexes and real dates.
 *
 * Index 0 is the first working day on or after the project start. Built once
 * per schedule run and reused, because the alternative - walking the calendar
 * day by day for every lookup - turns a 60-activity schedule into thousands of
 * redundant date constructions on every render.
 */
export class WorkingDayScale {
  private readonly days: number[] = [];
  private readonly indexOf = new Map<number, number>();

  constructor(
    readonly origin: number,
    horizonWorkingDays: number,
    readonly calendar: WorkCalendar = DEFAULT_CALENDAR,
  ) {
    let cursor = nextWorkingDay(origin, calendar);
    // One spare day so `dateAt(ef)` is resolvable for the very last activity.
    for (let i = 0; i <= horizonWorkingDays + 1; i += 1) {
      this.days.push(cursor);
      this.indexOf.set(cursor, i);
      cursor = nextWorkingDay(cursor + MS_PER_DAY, calendar);
    }
  }

  /** Real date for a working-day index. */
  dateAt(index: number): number {
    if (index < 0) return this.days[0];
    return this.days[Math.min(index, this.days.length - 1)];
  }

  /**
   * Working-day index for a real date. A non-working date (someone recorded an
   * actual start on a Sunday) rolls forward to the next working day rather
   * than being rejected - refusing the input would be worse than absorbing it.
   */
  indexFor(ts: number): number {
    const exact = this.indexOf.get(startOfDay(ts));
    if (exact !== undefined) return exact;
    const rolled = this.indexOf.get(nextWorkingDay(ts, this.calendar));
    if (rolled !== undefined) return rolled;
    // Outside the built range: estimate, clamped into range.
    const raw = Math.round((startOfDay(ts) - this.days[0]) / MS_PER_DAY);
    const approx = Math.round(raw * (6 / 7));
    return Math.max(0, Math.min(approx, this.days.length - 1));
  }

  /** The human-facing finish date: the last day actually worked. */
  lastWorkedDate(ef: number, es: number): number {
    return this.dateAt(ef > es ? ef - 1 : es);
  }
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export interface ScheduledActivity extends ScheduleActivity {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
  /** Real dates, derived from the indexes above. */
  startDate: number;
  finishDate: number;
  /** Where this activity was planned to land when the baseline was saved. */
  baselineStartDate?: number;
  baselineFinishDate?: number;
  /** Working days later than baseline. Negative means ahead. */
  varianceDays?: number;
}

export interface ScheduleResult {
  activities: ScheduledActivity[];
  byId: Record<string, ScheduledActivity>;
  /** Working-day index the project finishes on (exclusive). */
  projectFinishIndex: number;
  projectStartDate: number;
  projectFinishDate: number;
  /** Duration in working days. */
  durationWorkingDays: number;
  criticalPath: string[];
  /** Working days behind the baseline finish. Negative means ahead. */
  varianceDays: number;
  scale: WorkingDayScale;
  /**
   * Dependencies that had to be ignored to schedule at all - a cycle, or a
   * predecessor that no longer exists. Surfaced rather than swallowed, because
   * silently dropping a link makes the dates quietly wrong.
   */
  brokenLinks: { activityId: string; predecessorId: string; reason: string }[];
}

/** Ordered so predecessors always come before the activities that need them. */
function topologicalOrder(
  activities: ScheduleActivity[],
  broken: ScheduleResult['brokenLinks'],
): ScheduleActivity[] {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  activities.forEach((a) => {
    indegree.set(a.id, 0);
    dependents.set(a.id, []);
  });

  activities.forEach((a) => {
    (a.predecessors || []).forEach((link) => {
      if (!byId.has(link.predecessorId)) {
        broken.push({
          activityId: a.id,
          predecessorId: link.predecessorId,
          reason: 'Predecessor no longer exists',
        });
        return;
      }
      indegree.set(a.id, (indegree.get(a.id) ?? 0) + 1);
      dependents.get(link.predecessorId)!.push(a.id);
    });
  });

  // Seed by the user's own row order, so activities that are equally ready
  // stay in the sequence the user arranged rather than jumping around.
  const ready = activities
    .filter((a) => (indegree.get(a.id) ?? 0) === 0)
    .sort((a, b) => a.order - b.order)
    .map((a) => a.id);

  const ordered: ScheduleActivity[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    ordered.push(byId.get(id)!);
    dependents.get(id)!.forEach((next) => {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    });
  }

  // Anything left is in a dependency cycle ("A waits for B, B waits for A").
  // Append it with its links reported as broken, so the screen still renders
  // a schedule instead of going blank on a data-entry mistake.
  if (ordered.length < activities.length) {
    const placed = new Set(ordered.map((a) => a.id));
    activities
      .filter((a) => !placed.has(a.id))
      .sort((a, b) => a.order - b.order)
      .forEach((a) => {
        (a.predecessors || []).forEach((link) => {
          if (!placed.has(link.predecessorId)) {
            broken.push({
              activityId: a.id,
              predecessorId: link.predecessorId,
              reason: 'Circular dependency',
            });
          }
        });
        ordered.push(a);
        placed.add(a.id);
      });
  }

  return ordered;
}

/** The earliest `successor.es` allowed by one dependency. */
function earliestStartFor(
  type: DependencyType,
  lag: number,
  pred: { es: number; ef: number },
  successorDuration: number,
): number {
  switch (type) {
    // Finish-to-Start: the normal one. Plastering starts once brickwork ends.
    case 'FS':
      return pred.ef + lag;
    // Start-to-Start: both run together, offset by the lag.
    case 'SS':
      return pred.es + lag;
    // Finish-to-Finish: they have to finish together.
    case 'FF':
      return pred.ef + lag - successorDuration;
    // Start-to-Finish: rare, but P6 has it, so a schedule imported from a P6
    // user's plan does not lose links.
    case 'SF':
      return pred.es + lag - successorDuration;
    default:
      return pred.ef + lag;
  }
}

/** The latest `predecessor.lf` allowed by one dependency. */
function latestFinishFor(
  type: DependencyType,
  lag: number,
  succ: { ls: number; lf: number },
  predecessorDuration: number,
): number {
  switch (type) {
    case 'FS':
      return succ.ls - lag;
    case 'SS':
      return succ.ls - lag + predecessorDuration;
    case 'FF':
      return succ.lf - lag;
    case 'SF':
      return succ.lf - lag + predecessorDuration;
    default:
      return succ.ls - lag;
  }
}

export interface ScheduleOptions {
  projectStart: number;
  calendar?: WorkCalendar;
  /** Baseline finish, to report slippage against. */
  baselineFinishDate?: number;
}

/**
 * Runs the forward and backward passes and returns a fully dated schedule.
 *
 * Activities with a recorded ACTUAL start are pinned to it. That is what keeps
 * the schedule honest once work is underway: the plan bends around what really
 * happened on site instead of quietly re-planning the past.
 */
export function computeSchedule(
  activities: ScheduleActivity[],
  options: ScheduleOptions,
): ScheduleResult {
  const calendar = options.calendar ?? DEFAULT_CALENDAR;
  const brokenLinks: ScheduleResult['brokenLinks'] = [];

  if (activities.length === 0) {
    const scale = new WorkingDayScale(options.projectStart, 1, calendar);
    return {
      activities: [],
      byId: {},
      projectFinishIndex: 0,
      projectStartDate: scale.dateAt(0),
      projectFinishDate: scale.dateAt(0),
      durationWorkingDays: 0,
      criticalPath: [],
      varianceDays: 0,
      scale,
      brokenLinks,
    };
  }

  // Generous horizon: the longest possible chain is every activity end to end,
  // plus room for lags and for actual dates recorded beyond the plan.
  const totalDuration = activities.reduce((sum, a) => sum + Math.max(0, a.durationDays), 0);
  const totalLag = activities.reduce(
    (sum, a) => sum + (a.predecessors || []).reduce((s, l) => s + Math.abs(l.lagDays || 0), 0),
    0,
  );
  const scale = new WorkingDayScale(
    options.projectStart,
    totalDuration + totalLag + 90,
    calendar,
  );

  const ordered = topologicalOrder(activities, brokenLinks);
  const broken = new Set(brokenLinks.map((b) => `${b.activityId}:${b.predecessorId}`));

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};
  const durationOf: Record<string, number> = {};

  /* --- forward pass: how soon can each activity happen? --- */
  ordered.forEach((a) => {
    const duration = Math.max(0, Math.round(a.durationDays));
    durationOf[a.id] = duration;

    let start = 0;
    (a.predecessors || []).forEach((link) => {
      if (broken.has(`${a.id}:${link.predecessorId}`)) return;
      const p = es[link.predecessorId] === undefined
        ? undefined
        : { es: es[link.predecessorId], ef: ef[link.predecessorId] };
      if (!p) return;
      start = Math.max(start, earliestStartFor(link.type, link.lagDays || 0, p, duration));
    });

    // A recorded actual start wins over the calculation - it already happened.
    if (a.actualStart !== undefined) {
      start = scale.indexFor(a.actualStart);
    }

    es[a.id] = Math.max(0, start);
    ef[a.id] = es[a.id] + duration;

    // Likewise an actual finish: the work is done, whatever the plan said.
    if (a.actualFinish !== undefined) {
      ef[a.id] = Math.max(es[a.id], scale.indexFor(a.actualFinish) + 1);
    }
  });

  const projectFinishIndex = Math.max(...ordered.map((a) => ef[a.id]));

  /* --- backward pass: how late can each activity run without moving handover? --- */
  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};

  // Successor lists, so the backward pass does not rescan every activity.
  const successors = new Map<string, { id: string; type: DependencyType; lag: number }[]>();
  ordered.forEach((a) => successors.set(a.id, []));
  ordered.forEach((a) => {
    (a.predecessors || []).forEach((link) => {
      if (broken.has(`${a.id}:${link.predecessorId}`)) return;
      successors
        .get(link.predecessorId)
        ?.push({ id: a.id, type: link.type, lag: link.lagDays || 0 });
    });
  });

  [...ordered].reverse().forEach((a) => {
    const outgoing = successors.get(a.id) ?? [];
    let latestFinish = projectFinishIndex;

    outgoing.forEach((s) => {
      if (ls[s.id] === undefined) return;
      latestFinish = Math.min(
        latestFinish,
        latestFinishFor(s.type, s.lag, { ls: ls[s.id], lf: lf[s.id] }, durationOf[a.id]),
      );
    });

    lf[a.id] = latestFinish;
    ls[a.id] = lf[a.id] - durationOf[a.id];
  });

  /* --- float, criticality, real dates --- */
  const scheduled: ScheduledActivity[] = ordered.map((a) => {
    const totalFloat = ls[a.id] - es[a.id];

    // Free float: slack before the NEXT activity is disturbed, which is the
    // number a site engineer actually acts on.
    const outgoing = successors.get(a.id) ?? [];
    const freeFloat = outgoing.length
      ? Math.max(0, Math.min(...outgoing.map((s) => es[s.id])) - ef[a.id])
      : totalFloat;

    // A milestone occupies no days, so its index is the morning AFTER the work
    // it follows. Dated as-is it reads a day later than the activity feeding
    // it - "handover 15 Aug" under a summary saying the job finishes 14 Aug.
    // It marks the completion of the preceding work, so it is dated to that.
    const isMilestone = ef[a.id] === es[a.id];
    const startDate = scale.dateAt(isMilestone ? Math.max(0, es[a.id] - 1) : es[a.id]);
    const finishDate = isMilestone ? startDate : scale.lastWorkedDate(ef[a.id], es[a.id]);

    let baselineStartDate: number | undefined;
    let baselineFinishDate: number | undefined;
    let varianceDays: number | undefined;
    if (a.baselineStart !== undefined && a.baselineFinish !== undefined) {
      baselineStartDate = a.baselineStart;
      baselineFinishDate = a.baselineFinish;
      varianceDays = scale.indexFor(finishDate) - scale.indexFor(a.baselineFinish);
    }

    return {
      ...a,
      es: es[a.id],
      ef: ef[a.id],
      ls: ls[a.id],
      lf: lf[a.id],
      totalFloat,
      freeFloat: Math.min(freeFloat, totalFloat),
      isCritical: totalFloat <= 0,
      startDate,
      finishDate,
      baselineStartDate,
      baselineFinishDate,
      varianceDays,
    };
  });

  const byId: Record<string, ScheduledActivity> = {};
  scheduled.forEach((a) => {
    byId[a.id] = a;
  });

  const projectStartDate = scale.dateAt(Math.min(...scheduled.map((a) => a.es)));
  const projectFinishDate = scale.dateAt(projectFinishIndex - 1);

  const varianceDays = options.baselineFinishDate
    ? scale.indexFor(projectFinishDate) - scale.indexFor(options.baselineFinishDate)
    : 0;

  return {
    activities: scheduled.sort((a, b) => a.es - b.es || a.order - b.order),
    byId,
    projectFinishIndex,
    projectStartDate,
    projectFinishDate,
    durationWorkingDays: projectFinishIndex,
    criticalPath: scheduled.filter((a) => a.isCritical).sort((a, b) => a.es - b.es).map((a) => a.id),
    varianceDays,
    scale,
    brokenLinks,
  };
}

/* ------------------------------------------------------------------ */
/* Roll-ups                                                            */
/* ------------------------------------------------------------------ */

export interface StageRollup {
  stageId: string;
  activityIds: string[];
  startDate: number;
  finishDate: number;
  durationWorkingDays: number;
  /** Duration-weighted, so a 20-day activity counts for more than a 2-day one. */
  percentComplete: number;
  /** The tightest float in the stage - what the stage as a whole can absorb. */
  totalFloat: number;
  hasCritical: boolean;
  status: 'Not started' | 'In progress' | 'Completed';
  varianceDays: number;
}

/**
 * Summarises a stage from its activities. This is what lets the Stages tab
 * behave like a schedule instead of a checklist - the stage no longer carries
 * its own hand-typed dates and percentage, it reports what the activities
 * underneath it actually add up to.
 */
export function rollUpStage(
  stageId: string,
  activities: ScheduledActivity[],
  scale: WorkingDayScale,
): StageRollup | null {
  const mine = activities.filter((a) => a.stageId === stageId);
  if (mine.length === 0) return null;

  const es = Math.min(...mine.map((a) => a.es));
  const ef = Math.max(...mine.map((a) => a.ef));

  const totalWeight = mine.reduce((s, a) => s + Math.max(1, a.durationDays), 0);
  const doneWeight = mine.reduce(
    (s, a) => s + Math.max(1, a.durationDays) * (a.percentComplete / 100),
    0,
  );
  const percentComplete = Math.round((doneWeight / totalWeight) * 100);

  const withVariance = mine.filter((a) => a.varianceDays !== undefined);

  return {
    stageId,
    activityIds: mine.sort((a, b) => a.es - b.es).map((a) => a.id),
    startDate: scale.dateAt(es),
    finishDate: scale.lastWorkedDate(ef, es),
    durationWorkingDays: ef - es,
    percentComplete,
    totalFloat: Math.min(...mine.map((a) => a.totalFloat)),
    hasCritical: mine.some((a) => a.isCritical),
    status:
      percentComplete >= 100 ? 'Completed' : percentComplete > 0 ? 'In progress' : 'Not started',
    varianceDays: withVariance.length
      ? Math.max(...withVariance.map((a) => a.varianceDays ?? 0))
      : 0,
  };
}

/**
 * Working days between two dates, for "we are N days late" readouts.
 * Counting calendar days would overstate every delay by a Sunday a week.
 */
export function workingDaysBetween(
  from: number,
  to: number,
  cal: WorkCalendar = DEFAULT_CALENDAR,
): number {
  const sign = to < from ? -1 : 1;
  const [a, b] = to < from ? [to, from] : [from, to];
  let count = 0;
  let cursor = startOfDay(a);
  const end = startOfDay(b);
  while (cursor < end && count < 4000) {
    cursor += MS_PER_DAY;
    if (isWorkingDay(cursor, cal)) count += 1;
  }
  return count * sign;
}
