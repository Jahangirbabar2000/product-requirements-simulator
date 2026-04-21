// Empirical formula fit to parallel-mode pipeline runs in results/:
//   2 agents → ~46s, 3 → ~58s, 4 → ~68s, 5 → ~105s, 6 → ~89s, 10 → ~153s
// Linear regression ≈ 14.5s/agent + ~19s baseline. We pad a touch so we
// under-promise and over-deliver on slower networks.
const PER_AGENT_SECONDS = 15;
const BASELINE_SECONDS = 20;

export function estimatePipelineSeconds(nAgents: number): number {
  return BASELINE_SECONDS + PER_AGENT_SECONDS * Math.max(nAgents, 1);
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
export function formatDurationRange(seconds: number, tolerance = 0.2): string {
  const low = Math.max(seconds * (1 - tolerance), 15);
  const high = seconds * (1 + tolerance);
  return `${formatDuration(low)} – ${formatDuration(high)}`;
}
