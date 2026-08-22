/**
 * The Schedule tab — the project programme.
 *
 * Left pane is the activity table, right pane is the Gantt, and they share one
 * vertical scroller so a row and its bar can never drift apart. The left pane
 * is stuck to the edge, which is what makes the chart usable once a job runs
 * past a few months and the bars are miles from their names.
 *
 * Everything on screen except the durations and the dependencies is
 * calculated — see `lib/cpm.ts`.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Flag,
  Plus,
  Route,
  Save,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useScheduleStore, useProjectSchedule } from '../../../store/scheduleStore';
import { useStageStore } from '../../../store/stageStore';
import { Project, ScheduleActivity } from '../../../types';
import { ScheduledActivity, rollUpStage } from '../../../lib/cpm';
import { GanttChart } from './GanttChart';
import { ActivityEditor } from './ActivityEditor';
import {
  DisplayRow,
  HEADER_H,
  ROW_H,
  ZoomLevel,
  chartRange,
  floatLabel,
  fullDate,
  shortDate,
  varianceLabel,
} from './ganttUtils';

const TABLE_W = 430;

interface Props {
  project: Project;
}

export function ScheduleTab({ project }: Props) {
  const { activities, subscribeSchedule, addActivity, updateActivity, removeActivity, setBaseline } =
    useScheduleStore();
  const { stages, subscribeStages } = useStageStore();

  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [showBaseline, setShowBaseline] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduledActivity | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const a = subscribeSchedule(project.id);
    const b = subscribeStages(project.id);
    return () => {
      a();
      b();
    };
  }, [project.id, subscribeSchedule, subscribeStages]);

  const schedule = useProjectSchedule(project.id, project.startDate, {
    baselineFinishDate: project.expectedCompletion,
  });

  const projectStages = stages[project.id] ?? [];
  const raw = activities[project.id] ?? [];

  /* ---- build the outline: stage summary rows with their activities ---- */
  const rows = useMemo<DisplayRow[]>(() => {
    const out: DisplayRow[] = [];
    const visible = (a: ScheduledActivity) => !criticalOnly || a.isCritical;

    const ordered = [...projectStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    ordered.forEach((stage) => {
      const rollup = rollUpStage(stage.id, schedule.activities, schedule.scale);
      if (!rollup) return;

      const mine = schedule.activities.filter((a) => a.stageId === stage.id).filter(visible);
      if (criticalOnly && mine.length === 0) return;

      out.push({ kind: 'stage', id: stage.id, name: stage.name, rollup });
      if (!collapsed.has(stage.id)) {
        mine.forEach((a) => out.push({ kind: 'activity', id: a.id, activity: a, stageId: stage.id }));
      }
    });

    // Anything not filed under a stage still has to appear, or it silently
    // vanishes from the plan while continuing to drive the finish date.
    schedule.activities
      .filter((a) => !a.stageId || !ordered.some((s) => s.id === a.stageId))
      .filter(visible)
      .forEach((a) => out.push({ kind: 'activity', id: a.id, activity: a }));

    return out;
  }, [projectStages, schedule, collapsed, criticalOnly]);

  const range = useMemo(() => chartRange(rows, zoom), [rows, zoom]);

  const criticalCount = schedule.activities.filter((a) => a.isCritical).length;
  const hasBaseline = schedule.activities.some((a) => a.baselineFinishDate);
  const baselineFinish = hasBaseline
    ? Math.max(...schedule.activities.map((a) => a.baselineFinishDate ?? 0))
    : undefined;
  const slip = baselineFinish
    ? schedule.scale.indexFor(schedule.projectFinishDate) - schedule.scale.indexFor(baselineFinish)
    : 0;

  const overallProgress = useMemo(() => {
    if (schedule.activities.length === 0) return 0;
    const weight = schedule.activities.reduce((s, a) => s + Math.max(1, a.durationDays), 0);
    const done = schedule.activities.reduce(
      (s, a) => s + Math.max(1, a.durationDays) * (a.percentComplete / 100),
      0,
    );
    return Math.round((done / weight) * 100);
  }, [schedule.activities]);

  const toggleStage = (id: string) => {
    const next = new Set(collapsed);
    next.has(id) ? next.delete(id) : next.add(id);
    setCollapsed(next);
  };

  const handleSetBaseline = async () => {
    await setBaseline(
      project.id,
      schedule.activities.map((a) => ({ id: a.id, start: a.startDate, finish: a.finishDate })),
    );
  };

  if (raw.length === 0) {
    return (
      <EmptyState
        onAdd={() => {
          setEditing(null);
          setCreating(true);
        }}
        creating={creating}
        stages={projectStages}
        schedule={schedule}
        onClose={() => setCreating(false)}
        onSave={async (data: Omit<ScheduleActivity, 'id' | 'projectId'>) => {
          await addActivity(project.id, data);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- headline numbers ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<CalendarClock size={16} />}
          label="Forecast handover"
          value={fullDate(schedule.projectFinishDate)}
          sub={`${schedule.durationWorkingDays} working days total`}
        />
        <SummaryCard
          icon={<Flag size={16} />}
          label="Against the plan"
          value={hasBaseline ? varianceLabel(slip) : 'No baseline set'}
          sub={
            hasBaseline && baselineFinish
              ? `Planned ${shortDate(baselineFinish)}`
              : 'Save a baseline to track slippage'
          }
          tone={slip > 0 ? 'bad' : slip < 0 ? 'good' : 'neutral'}
        />
        <SummaryCard
          icon={<Route size={16} />}
          label="Critical activities"
          value={String(criticalCount)}
          sub="No slack — a day lost here is a day lost overall"
          tone={criticalCount > 0 ? 'warn' : 'neutral'}
        />
        <SummaryCard
          icon={<CalendarClock size={16} />}
          label="Work complete"
          value={`${overallProgress}%`}
          sub="Weighted by activity duration"
        />
      </div>

      {schedule.brokenLinks.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {schedule.brokenLinks.length} dependency link
            {schedule.brokenLinks.length === 1 ? '' : 's'} could not be used (
            {schedule.brokenLinks[0].reason.toLowerCase()}). Those activities are scheduled as if
            nothing came before them.
          </span>
        </div>
      )}

      {/* ---- toolbar ---- */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> Activity
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <ZoomControl zoom={zoom} setZoom={setZoom} />

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <Toggle active={showBaseline} onClick={() => setShowBaseline(!showBaseline)}>
          Baseline
        </Toggle>
        <Toggle active={showLinks} onClick={() => setShowLinks(!showLinks)}>
          Links
        </Toggle>
        <Toggle active={criticalOnly} onClick={() => setCriticalOnly(!criticalOnly)} tone="critical">
          Critical path only
        </Toggle>

        <button
          onClick={handleSetBaseline}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          title="Freeze today's dates as the plan to measure against"
        >
          <Save size={14} /> {hasBaseline ? 'Re-baseline' : 'Set baseline'}
        </button>
      </div>

      {/* ---- table + chart ---- */}
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white" style={{ maxHeight: '68vh' }}>
        <div className="flex min-w-max">
          {/* left: activity table */}
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-slate-200 bg-white"
            style={{ width: TABLE_W }}
          >
            <div
              className="sticky top-0 z-10 flex items-end border-b border-slate-200 bg-white px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
              style={{ height: HEADER_H }}
            >
              <span className="flex-1">Activity</span>
              <span className="w-10 text-right">Days</span>
              <span className="w-14 text-right">Start</span>
              <span className="w-14 text-right">Finish</span>
              <span className="w-14 text-right">Slack</span>
            </div>

            {rows.map((row) =>
              row.kind === 'stage' ? (
                <button
                  key={row.id}
                  onClick={() => toggleStage(row.id)}
                  className="flex w-full items-center border-b border-slate-100 bg-slate-50 px-3 text-left hover:bg-slate-100"
                  style={{ height: ROW_H }}
                >
                  <span className="mr-1 text-slate-400">
                    {collapsed.has(row.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                  <span className="flex-1 truncate text-xs font-bold text-slate-700">{row.name}</span>
                  <span className="w-10 text-right text-xs font-semibold text-slate-500">
                    {row.rollup.durationWorkingDays}
                  </span>
                  <span className="w-14 text-right text-[11px] text-slate-500">
                    {shortDate(row.rollup.startDate)}
                  </span>
                  <span className="w-14 text-right text-[11px] text-slate-500">
                    {shortDate(row.rollup.finishDate)}
                  </span>
                  <span
                    className={`w-14 text-right text-[11px] font-semibold ${
                      row.rollup.hasCritical ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {floatLabel(row.rollup.totalFloat)}
                  </span>
                </button>
              ) : (
                <button
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  onDoubleClick={() => setEditing(row.activity)}
                  className={`flex w-full items-center border-b border-slate-100 px-3 text-left hover:bg-slate-50 ${
                    selectedId === row.id ? 'bg-brand-50' : ''
                  }`}
                  style={{ height: ROW_H }}
                  title="Double-click to edit"
                >
                  <span className="ml-4 flex min-w-0 flex-1 items-center gap-1.5">
                    {row.activity.isCritical && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                        title="On the critical path"
                      />
                    )}
                    <span className="truncate text-xs text-slate-700">{row.activity.name}</span>
                    {row.activity.delayReason && (
                      <span className="shrink-0" title={row.activity.delayReason}>
                        <AlertTriangle size={11} className="text-amber-500" />
                      </span>
                    )}
                  </span>
                  <span className="w-10 text-right text-xs text-slate-500">
                    {row.activity.durationDays === 0 ? '◆' : row.activity.durationDays}
                  </span>
                  <span className="w-14 text-right text-[11px] text-slate-500">
                    {shortDate(row.activity.startDate)}
                  </span>
                  <span className="w-14 text-right text-[11px] text-slate-500">
                    {shortDate(row.activity.finishDate)}
                  </span>
                  <span
                    className={`w-14 text-right text-[11px] font-semibold ${
                      row.activity.isCritical ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {floatLabel(row.activity.totalFloat)}
                  </span>
                </button>
              ),
            )}
          </div>

          {/* right: gantt */}
          <GanttChart
            rows={rows}
            range={range}
            zoom={zoom}
            showBaseline={showBaseline}
            showLinks={showLinks}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      <Legend />

      {(editing || creating) && (
        <ActivityEditor
          activity={editing}
          allActivities={schedule.activities}
          stages={projectStages}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={async (data) => {
            if (editing) await updateActivity(project.id, editing.id, data);
            else await addActivity(project.id, data);
          }}
          onDelete={
            editing
              ? async () => {
                  await removeActivity(project.id, editing.id);
                  setSelectedId(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warn';
}) {
  const toneClass = {
    neutral: 'text-slate-900',
    good: 'text-emerald-600',
    bad: 'text-rose-600',
    warn: 'text-amber-600',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-lg font-bold leading-tight ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{sub}</div>
    </div>
  );
}

function ZoomControl({ zoom, setZoom }: { zoom: ZoomLevel; setZoom: (z: ZoomLevel) => void }) {
  const levels: ZoomLevel[] = ['month', 'week', 'day'];
  const i = levels.indexOf(zoom);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setZoom(levels[Math.max(0, i - 1)])}
        disabled={i === 0}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        title="Zoom out"
      >
        <ZoomOut size={15} />
      </button>
      <span className="w-12 text-center text-xs font-semibold capitalize text-slate-600">{zoom}</span>
      <button
        onClick={() => setZoom(levels[Math.min(levels.length - 1, i + 1)])}
        disabled={i === levels.length - 1}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        title="Zoom in"
      >
        <ZoomIn size={15} />
      </button>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
  tone = 'brand',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'brand' | 'critical';
}) {
  const on =
    tone === 'critical'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-brand-50 text-brand-600 border-brand-100';
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? on : 'border-transparent text-slate-500 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-6 rounded-sm bg-brand-500" /> On schedule
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-6 rounded-sm bg-rose-600" /> Critical — no slack
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-6 rounded-sm bg-emerald-600" /> Finished
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-6 rounded-sm bg-slate-300" /> Original plan
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-brand-600" /> Milestone
      </span>
    </div>
  );
}

function EmptyState({
  onAdd,
  creating,
  stages,
  schedule,
  onClose,
  onSave,
}: any) {
  return (
    <>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <CalendarClock size={32} className="mx-auto text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-800">No schedule yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Add activities with a duration and what each one waits for. The start and finish dates,
          the critical path and the handover date are all worked out from there.
        </p>
        <button
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> Add the first activity
        </button>
      </div>
      {creating && (
        <ActivityEditor
          activity={null}
          allActivities={schedule.activities}
          stages={stages}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </>
  );
}
