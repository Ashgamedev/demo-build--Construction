/**
 * The Stages tab — the summary level above the Schedule.
 *
 * Same facts as the Schedule tab, one altitude up: a stage per row, with dates,
 * progress and slack rolled up from the activities underneath it. Nothing here
 * is typed in by hand any more - a stage's dates are whatever its activities
 * work out to, so the two tabs cannot drift apart and disagree.
 *
 * This replaced a decorative alternating timeline with hand-entered dates and
 * percentages. It looked tidy and answered neither of the two questions people
 * actually open this screen for: is this stage late, and by how much.
 *
 * Stage names, order and membership still live here. The work itself is edited
 * on the Schedule tab, which stays the single place activities are created.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useStageStore } from '../../store/stageStore';
import { useScheduleStore, useProjectSchedule } from '../../store/scheduleStore';
import { useProjectStore } from '../../store/projectStore';
import { StageRollup, ScheduledActivity, rollUpStage } from '../../lib/cpm';
import { fullDate, shortDate, varianceLabel } from './schedule/ganttUtils';

interface Props {
  projectId: string;
}

export function ProjectStagesTab({ projectId }: Props) {
  const { stages, subscribeStages, addStage, updateStage, removeStage, reorderStages } =
    useStageStore();
  const { subscribeSchedule } = useScheduleStore();
  const { projects, subscribeProjects } = useProjectStore();

  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // The drag-and-drop library still needs a client-only mount guard.
    setIsBrowser(true);
    const a = subscribeStages(projectId);
    const b = subscribeSchedule(projectId);
    const c = subscribeProjects();
    return () => {
      a();
      b();
      c();
    };
  }, [projectId, subscribeStages, subscribeSchedule, subscribeProjects]);

  const project = projects.find((p) => p.id === projectId);
  const schedule = useProjectSchedule(projectId, project?.startDate, {
    baselineFinishDate: project?.expectedCompletion,
  });

  const projectStages = useMemo(
    () => [...(stages[projectId] || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [stages, projectId],
  );

  const rollups = useMemo(() => {
    const map = new Map<string, StageRollup>();
    projectStages.forEach((s) => {
      const r = rollUpStage(s.id, schedule.activities, schedule.scale);
      if (r) map.set(s.id, r);
    });
    return map;
  }, [projectStages, schedule]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;
    const next = Array.from(projectStages);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    await reorderStages(
      projectId,
      next.map((s) => s.id),
    );
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    await addStage(projectId, {
      name: newStageName.trim(),
      order: projectStages.length,
      tasks: [],
      status: 'Pending',
      progressPercentage: 0,
    });
    setNewStageName('');
    setIsAddingStage(false);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/shared/project/${projectId}/stages`;
    navigator.clipboard
      .writeText(url)
      .then(() => alert('Shareable progress link copied to clipboard.'))
      .catch((err) => console.error('Failed to copy link: ', err));
  };

  const late = [...rollups.values()].filter((r) => r.varianceDays > 0);
  const scheduled = rollups.size > 0;

  if (!isBrowser) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <div>
          <h3 className="font-bold text-slate-900">Stages</h3>
          <p className="text-sm text-slate-500">
            {scheduled
              ? 'Dates and progress roll up from the activities on the Schedule tab.'
              : 'Add activities on the Schedule tab and these stages fill in on their own.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={copyShareLink}
            className="flex items-center rounded-md bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100"
          >
            <Share2 className="mr-1.5 h-4 w-4" /> Share progress
          </button>
          <button
            onClick={() => setIsAddingStage(true)}
            className="flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="mr-1 h-4 w-4" /> Add stage
          </button>
        </div>
      </div>

      {scheduled && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MiniStat label="Stages" value={String(projectStages.length)} />
          <MiniStat
            label="Handover"
            value={fullDate(schedule.projectFinishDate)}
            sub={`${schedule.durationWorkingDays} working days`}
          />
          <MiniStat
            label="Stages running late"
            value={String(late.length)}
            tone={late.length > 0 ? 'bad' : 'good'}
            sub={late.length > 0 ? late.map((r) => varianceLabel(r.varianceDays)).join(' · ') : 'All on plan'}
          />
        </div>
      )}

      {isAddingStage && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-white p-4">
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            className="flex-1 rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-brand-500"
            placeholder="e.g. Foundation"
            autoFocus
          />
          <button
            onClick={handleAddStage}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Save
          </button>
          <button
            onClick={() => setIsAddingStage(false)}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {projectStages.length === 0 && !isAddingStage ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No stages yet. Add one to group the work on this site.
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stages" type="STAGE">
            {(board) => (
              <div {...board.droppableProps} ref={board.innerRef} className="space-y-2.5">
                {projectStages.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        style={drag.draggableProps.style}
                        className={snapshot.isDragging ? 'opacity-90' : ''}
                      >
                        <StageCard
                          name={stage.name}
                          index={index}
                          rollup={rollups.get(stage.id)}
                          activities={schedule.activities.filter((a) => a.stageId === stage.id)}
                          expanded={expanded === stage.id}
                          onToggle={() => setExpanded(expanded === stage.id ? null : stage.id)}
                          onRename={(name) => updateStage(projectId, stage.id, { name })}
                          onDelete={() => {
                            if (confirm(`Delete the "${stage.name}" stage?`))
                              removeStage(projectId, stage.id);
                          }}
                          dragHandleProps={drag.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {board.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StageCard({
  name,
  index,
  rollup,
  activities,
  expanded,
  onToggle,
  onRename,
  onDelete,
  dragHandleProps,
}: {
  name: string;
  index: number;
  rollup?: StageRollup;
  activities: ScheduledActivity[];
  expanded: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  dragHandleProps: any;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== name) onRename(draft.trim());
    else setDraft(name);
  };

  const late = (rollup?.varianceDays ?? 0) > 0;

  return (
    <div
      className={`group rounded-lg border bg-white transition-colors ${
        rollup?.hasCritical ? 'border-rose-200' : 'border-slate-200'
      } hover:border-slate-300`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="shrink-0 text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              className="w-full border-b-2 border-brand-500 bg-transparent text-sm font-bold text-slate-900 outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="block max-w-full truncate text-left text-sm font-bold text-slate-900 hover:text-brand-600"
              title="Click to rename"
            >
              {name}
            </button>
          )}
          {rollup ? (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {shortDate(rollup.startDate)} → {shortDate(rollup.finishDate)} ·{' '}
              {rollup.durationWorkingDays} working days · {activities.length} activit
              {activities.length === 1 ? 'y' : 'ies'}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] italic text-slate-400">
              No activities scheduled under this stage yet
            </p>
          )}
        </div>

        {rollup && (
          <div className="hidden shrink-0 items-center gap-5 sm:flex">
            <div className="w-32">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>{rollup.status}</span>
                <span>{rollup.percentComplete}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    rollup.percentComplete >= 100
                      ? 'bg-emerald-500'
                      : rollup.hasCritical
                        ? 'bg-rose-500'
                        : 'bg-brand-500'
                  }`}
                  style={{ width: `${rollup.percentComplete}%` }}
                />
              </div>
            </div>

            <div className="w-20 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Slack
              </div>
              <div
                className={`text-xs font-bold ${
                  rollup.hasCritical ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {rollup.totalFloat <= 0 ? 'None' : `${rollup.totalFloat}d`}
              </div>
            </div>

            <div className="w-24 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                vs plan
              </div>
              <div
                className={`text-xs font-bold ${
                  late
                    ? 'text-rose-600'
                    : rollup.varianceDays < 0
                      ? 'text-emerald-600'
                      : 'text-slate-600'
                }`}
              >
                {varianceLabel(rollup.varianceDays)}
              </div>
            </div>
          </div>
        )}

        {rollup?.hasCritical && (
          <span
            className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600"
            title="Contains work with no slack — any delay here moves the handover date"
          >
            Critical
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <div
            {...dragHandleProps}
            className="cursor-grab p-1 text-slate-400 hover:text-slate-700 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <button onClick={onDelete} className="p-1 text-slate-300 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {activities.length === 0 ? (
            <p className="py-3 text-center text-xs italic text-slate-400">
              Nothing scheduled here yet. Add activities on the Schedule tab and assign them to this
              stage.
            </p>
          ) : (
            <div className="space-y-1">
              {[...activities]
                .sort((a, b) => a.es - b.es)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-xs"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        a.percentComplete >= 100
                          ? 'bg-emerald-500'
                          : a.percentComplete > 0
                            ? 'bg-brand-500'
                            : 'bg-slate-300'
                      }`}
                    >
                      {a.percentComplete >= 100 ? (
                        <Check className="h-3 w-3 text-white" />
                      ) : (
                        <Clock className="h-3 w-3 text-white" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                      {a.name}
                      {a.durationDays === 0 && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-brand-500">
                          milestone
                        </span>
                      )}
                    </span>

                    {a.delayReason && (
                      <span
                        className="flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                        title={a.delayReason}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Delayed
                      </span>
                    )}

                    <span className="w-32 shrink-0 text-right text-slate-500">
                      {shortDate(a.startDate)} → {shortDate(a.finishDate)}
                    </span>
                    <span className="w-10 shrink-0 text-right font-semibold text-slate-600">
                      {a.percentComplete}%
                    </span>
                    <span
                      className={`w-20 shrink-0 text-right font-semibold ${
                        a.isCritical ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {a.isCritical ? 'Critical' : `${a.totalFloat}d slack`}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Worth repeating below the list: this is the answer to the question
              a customer asks the moment they open the shared progress link. */}
          {activities.some((a) => a.delayReason) && (
            <div className="mt-2 space-y-1">
              {activities
                .filter((a) => a.delayReason)
                .map((a) => (
                  <p key={`r-${a.id}`} className="text-[11px] text-amber-700">
                    <span className="font-semibold">{a.name}:</span> {a.delayReason}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const toneClass = { neutral: 'text-slate-900', good: 'text-emerald-600', bad: 'text-rose-600' }[
    tone
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-base font-bold leading-tight ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
