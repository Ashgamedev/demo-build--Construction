import { ProjectStage } from '../types';

/**
 * Project progress, calculated from stages instead of typed in by hand.
 *
 * A stage's own progress is the average of its tasks' progress when it has
 * tasks; otherwise it falls back to the stage's stored percentage, or its
 * status (Completed = 100, In Progress = 50). The project's progress is the
 * average across its stages.
 *
 * Returns null when there are no stages at all - the caller then keeps the
 * manually entered project.progressPercentage, so a project without a stage
 * plan still shows whatever the owner typed.
 */
export function computeStageProgress(stage: ProjectStage): number {
  const tasks = stage.tasks || [];
  if (tasks.length > 0) {
    const sum = tasks.reduce((s, t) => s + (t.progressPercentage || 0), 0);
    return Math.round(sum / tasks.length);
  }
  if (typeof stage.progressPercentage === 'number') return stage.progressPercentage;
  if (stage.status === 'Completed') return 100;
  if (stage.status === 'In Progress') return 50;
  return 0;
}

export function computeProjectProgress(stages: ProjectStage[] | undefined | null): number | null {
  if (!stages || stages.length === 0) return null;
  const sum = stages.reduce((s, st) => s + computeStageProgress(st), 0);
  return Math.round(sum / stages.length);
}
