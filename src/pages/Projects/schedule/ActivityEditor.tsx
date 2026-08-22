/**
 * Add or edit one schedule activity.
 *
 * The form deliberately asks for a DURATION and WHAT IT WAITS ON, and never
 * for a start date. That is the whole idea behind the Schedule tab: the dates
 * are an output. Letting someone type a start date here would put two sources
 * of truth on screen and the chart would start disagreeing with itself.
 */

import { useEffect, useState } from 'react';
import { X, Trash2, Plus, Link2 } from 'lucide-react';
import { ScheduleActivity, ActivityLink, DependencyType, ProjectStage } from '../../../types';
import { ScheduledActivity } from '../../../lib/cpm';
import { shortDate } from './ganttUtils';

interface Props {
  activity: ScheduledActivity | null; // null = creating
  allActivities: ScheduledActivity[];
  stages: ProjectStage[];
  onClose: () => void;
  onSave: (data: Omit<ScheduleActivity, 'id' | 'projectId'>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const LINK_LABELS: Record<DependencyType, string> = {
  FS: 'after it finishes',
  SS: 'when it starts',
  FF: 'finishes with it',
  SF: 'finishes when it starts',
};

export function ActivityEditor({
  activity,
  allActivities,
  stages,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [stageId, setStageId] = useState<string>('');
  const [durationDays, setDurationDays] = useState(1);
  const [percentComplete, setPercentComplete] = useState(0);
  const [budgetedCost, setBudgetedCost] = useState<number | ''>('');
  const [delayReason, setDelayReason] = useState('');
  const [predecessors, setPredecessors] = useState<ActivityLink[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(activity?.name ?? '');
    setStageId(activity?.stageId ?? stages[0]?.id ?? '');
    setDurationDays(activity?.durationDays ?? 1);
    setPercentComplete(activity?.percentComplete ?? 0);
    setBudgetedCost(activity?.budgetedCost ?? '');
    setDelayReason(activity?.delayReason ?? '');
    setPredecessors(activity?.predecessors ?? []);
  }, [activity, stages]);

  // An activity cannot wait on itself, and offering it as an option is the
  // easiest way for someone to create a cycle by accident.
  const candidates = allActivities.filter((a) => a.id !== activity?.id);

  const addPredecessor = () => {
    const taken = new Set(predecessors.map((p) => p.predecessorId));
    const next = candidates.find((c) => !taken.has(c.id));
    if (!next) return;
    setPredecessors([...predecessors, { predecessorId: next.id, type: 'FS', lagDays: 0 }]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        stageId: stageId || undefined,
        durationDays: Math.max(0, Math.round(durationDays)),
        percentComplete: Math.max(0, Math.min(100, Math.round(percentComplete))),
        predecessors,
        order: activity?.order ?? allActivities.length + 1,
        budgetedCost: budgetedCost === '' ? undefined : Number(budgetedCost),
        delayReason: delayReason.trim() || undefined,
        actualStart: activity?.actualStart,
        actualFinish: activity?.actualFinish,
        baselineStart: activity?.baselineStart,
        baselineFinish: activity?.baselineFinish,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {activity ? 'Edit activity' : 'New activity'}
            </h2>
            {activity && (
              <p className="mt-0.5 text-xs text-slate-500">
                Currently scheduled {shortDate(activity.startDate)} → {shortDate(activity.finishDate)}
                {activity.isCritical ? ' · on the critical path' : ` · ${activity.totalFloat} days slack`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activity
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground floor slab pour"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stage
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">— No stage —</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Duration (working days)
              </label>
              <input
                type="number"
                min={0}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {durationDays === 0
                  ? 'Zero days — this is a milestone.'
                  : 'Sundays and holidays are skipped automatically.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Progress ({percentComplete}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percentComplete}
                onChange={(e) => setPercentComplete(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Budget (₹, optional)
              </label>
              <input
                type="number"
                min={0}
                value={budgetedCost}
                onChange={(e) => setBudgetedCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 118000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* ---- dependencies ---- */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Link2 size={13} /> Waits for
              </label>
              <button
                onClick={addPredecessor}
                disabled={predecessors.length >= candidates.length}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-40"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {predecessors.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                Nothing — this can start as soon as the project does.
              </p>
            ) : (
              <div className="space-y-2">
                {predecessors.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                    <select
                      value={link.predecessorId}
                      onChange={(e) => {
                        const next = [...predecessors];
                        next[i] = { ...link, predecessorId: e.target.value };
                        setPredecessors(next);
                      }}
                      className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={link.type}
                      onChange={(e) => {
                        const next = [...predecessors];
                        next[i] = { ...link, type: e.target.value as DependencyType };
                        setPredecessors(next);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {(Object.keys(LINK_LABELS) as DependencyType[]).map((t) => (
                        <option key={t} value={t}>
                          {LINK_LABELS[t]}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={link.lagDays}
                        onChange={(e) => {
                          const next = [...predecessors];
                          next[i] = { ...link, lagDays: Number(e.target.value) };
                          setPredecessors(next);
                        }}
                        className="w-14 rounded border border-slate-300 px-2 py-1.5 text-xs"
                        title="Extra days to wait (or overlap, if negative)"
                      />
                      <span className="text-[11px] text-slate-400">gap</span>
                    </div>

                    <button
                      onClick={() => setPredecessors(predecessors.filter((_, j) => j !== i))}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reason for delay (optional)
            </label>
            <input
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="e.g. Rain — no pour possible for four days"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Shows against the activity, so the answer to “why is it late” is recorded when it happens.
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          {onDelete ? (
            <button
              onClick={async () => {
                await onDelete();
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
