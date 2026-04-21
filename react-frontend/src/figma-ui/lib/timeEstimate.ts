// Stage-level estimates derived from real pipeline logs (parallel mode).
// The 2026-04 10-agent run breakdown:
//   Agent Generation: 37.89s serial  → ~3.8s / agent
//   Experience + Interview: 10.90s   → ~11s constant (parallel bottleneck)
//   Need Extraction + Synthesis: 77s → ~7s / agent + ~12s synthesis
//
// Cross-checked against older runs (n=2–10, 2026-03 → 2026-04) — fit is
// accurate within ±15% for the current model. We round up slightly so the
// estimate over- rather than under-promises.

const AGENT_GEN_PER_AGENT = 3.8;  // serial
const PARALLEL_STAGE_CONST = 11;  // experience + interview together (parallel)
const NEED_EXTRACT_PER_AGENT = 7; // serial, one LLM call per interview
const SYNTHESIS_CONST = 12;       // final aggregation + synthesis

export interface StageEstimate {
  agentGeneration: number;
  experienceSimulation: number;
  interview: number;
  needExtraction: number;
  total: number;
}

export function estimateStages(nAgents: number): StageEstimate {
  const n = Math.max(nAgents, 1);
  // Experience + Interview run interleaved per-agent in parallel mode, but the
  // tracker shows them as separate stages. Split the constant budget roughly
  // 45/55 since interview tends to have more turns.
  const experienceSimulation = PARALLEL_STAGE_CONST * 0.45;
  const interview = PARALLEL_STAGE_CONST * 0.55;
  const agentGeneration = AGENT_GEN_PER_AGENT * n;
  const needExtraction = NEED_EXTRACT_PER_AGENT * n + SYNTHESIS_CONST;
  return {
    agentGeneration,
    experienceSimulation,
    interview,
    needExtraction,
    total: agentGeneration + experienceSimulation + interview + needExtraction,
  };
}

export function estimatePipelineSeconds(nAgents: number): number {
  return estimateStages(nAgents).total;
}

// Estimate seconds still to run, given the stage we're currently in (1–4) and
// the total wall-clock time since the job started. Used by the dashboard to
// keep the countdown honest as stages complete faster or slower than predicted.
export function estimateRemainingSeconds(
  nAgents: number,
  stageNumber: number,
  elapsedSeconds: number,
): number {
  const s = estimateStages(nAgents);
  const stageTotals = [s.agentGeneration, s.experienceSimulation, s.interview, s.needExtraction];

  // Seconds predicted to have already elapsed through the END of the previous stage.
  const priorStagesElapsed = stageTotals.slice(0, Math.max(stageNumber - 1, 0))
    .reduce((a, b) => a + b, 0);

  // How far into the current stage we appear to be (0..1), clamped.
  const currentStageBudget = stageTotals[Math.min(stageNumber - 1, 3)] ?? 0;
  const intoCurrent = Math.max(elapsedSeconds - priorStagesElapsed, 0);
  const currentRemaining = Math.max(currentStageBudget - intoCurrent, 0);

  // Seconds still to come from stages AFTER the current one.
  const laterStagesRemaining = stageTotals.slice(stageNumber)
    .reduce((a, b) => a + b, 0);

  return Math.max(currentRemaining + laterStagesRemaining, 0);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(Math.round(seconds), 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

// Returns a human-friendly range e.g. "1m 30s – 2m"
export function formatDurationRange(seconds: number, tolerance = 0.15): string {
  const low = Math.max(seconds * (1 - tolerance), 15);
  const high = seconds * (1 + tolerance);
  return `${formatDuration(low)} – ${formatDuration(high)}`;
}
