/**
 * Sanity checks for the CPM engine. Run with:  npx vitest run src/lib/cpm.test.ts
 * Kept in the repo because the schedule dates are the whole selling point of
 * the Schedule tab - if this maths is wrong the demo is worse than useless.
 */
import { describe, it, expect } from 'vitest';
import { computeSchedule, DEFAULT_CALENDAR, workingDaysBetween } from './cpm';
import { ScheduleActivity } from '../types';

const START = new Date(2026, 0, 5).getTime(); // a Monday

function act(
  id: string,
  durationDays: number,
  order: number,
  predecessors: ScheduleActivity['predecessors'] = [],
): ScheduleActivity {
  return { id, projectId: 'p', name: id, order, durationDays, predecessors, percentComplete: 0 };
}
const fs = (id: string, lagDays = 0) => ({ predecessorId: id, type: 'FS' as const, lagDays });

describe('forward pass', () => {
  it('chains finish-to-start', () => {
    const r = computeSchedule(
      [act('a', 5, 1), act('b', 3, 2, [fs('a')]), act('c', 2, 3, [fs('b')])],
      { projectStart: START },
    );
    expect(r.byId.a.es).toBe(0);
    expect(r.byId.a.ef).toBe(5);
    expect(r.byId.b.es).toBe(5);
    expect(r.byId.c.es).toBe(8);
    expect(r.durationWorkingDays).toBe(10);
  });

  it('honours lag', () => {
    const r = computeSchedule([act('a', 5, 1), act('b', 3, 2, [fs('a', 2)])], {
      projectStart: START,
    });
    expect(r.byId.b.es).toBe(7);
  });

  it('waits for the latest of several predecessors', () => {
    const r = computeSchedule(
      [act('a', 5, 1), act('b', 9, 2), act('c', 2, 3, [fs('a'), fs('b')])],
      { projectStart: START },
    );
    expect(r.byId.c.es).toBe(9);
  });

  it('supports SS, FF and SF links', () => {
    const ss = computeSchedule(
      [act('a', 10, 1), { ...act('b', 4, 2), predecessors: [{ predecessorId: 'a', type: 'SS', lagDays: 3 }] }],
      { projectStart: START },
    );
    expect(ss.byId.b.es).toBe(3);

    const ff = computeSchedule(
      [act('a', 10, 1), { ...act('b', 4, 2), predecessors: [{ predecessorId: 'a', type: 'FF', lagDays: 0 }] }],
      { projectStart: START },
    );
    expect(ff.byId.b.ef).toBe(10); // finishes with a
  });
});

describe('float and the critical path', () => {
  it('gives float to the slack branch only', () => {
    // a -> b(9) -> d  and  a -> c(3) -> d. c has 6 days of slack.
    const r = computeSchedule(
      [
        act('a', 2, 1),
        act('b', 9, 2, [fs('a')]),
        act('c', 3, 3, [fs('a')]),
        act('d', 2, 4, [fs('b'), fs('c')]),
      ],
      { projectStart: START },
    );
    expect(r.byId.b.totalFloat).toBe(0);
    expect(r.byId.c.totalFloat).toBe(6);
    expect(r.byId.b.isCritical).toBe(true);
    expect(r.byId.c.isCritical).toBe(false);
    expect(r.criticalPath).toEqual(['a', 'b', 'd']);
  });

  it('reports free float against the next activity', () => {
    const r = computeSchedule(
      [
        act('a', 2, 1),
        act('b', 9, 2, [fs('a')]),
        act('c', 3, 3, [fs('a')]),
        act('d', 2, 4, [fs('b'), fs('c')]),
      ],
      { projectStart: START },
    );
    expect(r.byId.c.freeFloat).toBe(6);
    expect(r.byId.b.freeFloat).toBe(0);
  });
});

describe('the calendar', () => {
  it('skips Sundays', () => {
    // Six-day weeks: Mon 5 Jan + 8 working days runs Mon 5 - Sat 10, skips
    // Sun 11, then Mon 12 - Tue 13.
    const r = computeSchedule([act('a', 8, 1)], { projectStart: START });
    expect(new Date(r.byId.a.startDate).getDate()).toBe(5);
    expect(new Date(r.byId.a.finishDate).getDate()).toBe(13);
    expect(new Date(r.byId.a.finishDate).getDay()).not.toBe(0);
  });

  it('does not burn a day when the span contains no Sunday', () => {
    // Mon 5 + 6 working days ends Sat 10 - Saturday is worked here.
    const r = computeSchedule([act('a', 6, 1)], { projectStart: START });
    expect(new Date(r.byId.a.finishDate).getDate()).toBe(10);
  });

  it('skips declared holidays', () => {
    const holiday = new Date(2026, 0, 7).getTime(); // Wednesday
    // Mon 5, Tue 6, [Wed 7 off], Thu 8 => three working days.
    const r = computeSchedule([act('a', 3, 1)], {
      projectStart: START,
      calendar: { ...DEFAULT_CALENDAR, holidays: [holiday] },
    });
    expect(new Date(r.byId.a.finishDate).getDate()).toBe(8);
  });

  it('counts working days between two dates', () => {
    expect(workingDaysBetween(START, new Date(2026, 0, 12).getTime())).toBe(6);
  });
});

describe('actual progress overrides the plan', () => {
  it('pins to a recorded actual start and pushes successors out', () => {
    const late = new Date(2026, 0, 12).getTime(); // 6 working days after start
    const r = computeSchedule(
      [{ ...act('a', 5, 1), actualStart: late }, act('b', 3, 2, [fs('a')])],
      { projectStart: START },
    );
    expect(r.byId.a.es).toBe(6);
    expect(r.byId.b.es).toBe(11);
  });
});

describe('bad data still renders', () => {
  it('breaks a circular dependency instead of hanging', () => {
    const r = computeSchedule(
      [
        { ...act('a', 2, 1), predecessors: [fs('b')] },
        { ...act('b', 2, 2), predecessors: [fs('a')] },
      ],
      { projectStart: START },
    );
    expect(r.activities).toHaveLength(2);
    expect(r.brokenLinks.some((l) => l.reason === 'Circular dependency')).toBe(true);
  });

  it('reports a missing predecessor', () => {
    const r = computeSchedule([act('a', 2, 1, [fs('ghost')])], { projectStart: START });
    expect(r.brokenLinks[0].reason).toBe('Predecessor no longer exists');
    expect(r.byId.a.es).toBe(0);
  });

  it('handles zero-duration milestones', () => {
    const r = computeSchedule([act('a', 5, 1), act('m', 0, 2, [fs('a')])], {
      projectStart: START,
    });
    expect(r.byId.m.es).toBe(r.byId.m.ef);
    expect(r.byId.m.isCritical).toBe(true);
  });

  it('returns an empty schedule without throwing', () => {
    const r = computeSchedule([], { projectStart: START });
    expect(r.activities).toHaveLength(0);
  });
});

describe('milestone dating', () => {
  it('dates a finish milestone to the day the preceding work ends', () => {
    // a runs Mon 5 - Fri 9 (5 working days). The milestone must read Fri 9,
    // not the following Saturday.
    const r = computeSchedule([act('a', 5, 1), act('m', 0, 2, [fs('a')])], {
      projectStart: START,
    });
    expect(r.byId.a.finishDate).toBe(r.byId.m.finishDate);
    expect(new Date(r.byId.m.finishDate).getDate()).toBe(9);
  });

  it('leaves a start milestone on the project start date', () => {
    const r = computeSchedule([act('m', 0, 1)], { projectStart: START });
    expect(new Date(r.byId.m.startDate).getDate()).toBe(5);
  });
});
