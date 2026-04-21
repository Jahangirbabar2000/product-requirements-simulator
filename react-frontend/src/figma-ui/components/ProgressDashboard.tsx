import { useEffect, useRef, useState } from 'react';
import { getStatus, ProgressData } from '../lib/api';
import { StageTracker } from './StageTracker';
import { AgentCard } from './AgentCard';
import { ExperienceCard } from './ExperienceCard';
import { InterviewCard } from './InterviewCard';
import { NeedCard } from './NeedCard';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { Loader2, Clock } from 'lucide-react';
import { RotatingText } from './RotatingText';
import { LOADING_MESSAGES, getStageKey } from '../lib/loadingMessages';
import {
  AgentCardSkeleton,
  ExperienceCardSkeleton,
  InterviewCardSkeleton,
  NeedCardSkeleton,
} from './skeletons/CardSkeletons';
import { estimatePipelineSeconds, formatDuration } from '../lib/timeEstimate';

interface ProgressDashboardProps {
  jobId: string;
  onComplete: (data: ProgressData) => void;
}

const POLL_INTERVAL = 2000; // 2 seconds
const STAGES = ['Agent Generation', 'Experience Simulation', 'Interview', 'Need Extraction'];

function filledAndSkeletonGrid<T>(
  items: T[],
  expected: number,
  renderItem: (item: T, idx: number) => React.ReactNode,
  renderSkeleton: (idx: number) => React.ReactNode,
  cols: string,
) {
  const placeholders = Math.max(expected - items.length, 0);
  return (
    <div className={`grid ${cols} gap-4`}>
      {items.map((item, idx) => renderItem(item, idx))}
      {Array.from({ length: placeholders }).map((_, i) => (
        <div key={`skeleton-${i}`}>{renderSkeleton(i)}</div>
      ))}
    </div>
  );
}

export function ProgressDashboard({ jobId, onComplete }: ProgressDashboardProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [, setPrevCounts] = useState({
    agents: 0,
    experiences: 0,
    interviews: 0,
    needs: 0
  });
  const startRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  // Tick once a second so the ETA countdown updates smoothly
  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await getStatus(jobId);

        const currentCounts = {
          agents: data.intermediate_results.agents.length,
          experiences: data.intermediate_results.experiences.length,
          interviews: data.intermediate_results.interviews.length,
          needs: data.intermediate_results.needs.length
        };

        setProgressData(data);
        setPrevCounts(currentCounts);

        if (data.status === 'completed' || data.status === 'completed_with_errors') {
          clearInterval(intervalId);
          setTimeout(() => onComplete(data), 1000);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    poll();
    intervalId = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [jobId, onComplete]);

  if (!progressData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Initializing analysis</p>
          <RotatingText messages={LOADING_MESSAGES['default']} />
        </div>
      </div>
    );
  }

  const { progress, intermediate_results } = progressData;
  const progressPercentage = ((progress.stage_number - 1) / 4) * 100 +
    (progress.stage_number === 4 && progress.completed ? 25 : 0);

  const expectedAgents = progressData.run_input?.n_agents ?? intermediate_results.agents.length ?? 0;
  const estTotalSec = estimatePipelineSeconds(expectedAgents || 4);
  const remainingSec = Math.max(estTotalSec - elapsedSec, 0);

  const stageNum = progress.stage_number;
  const stageDone = (n: number) => stageNum > n || (stageNum === n && progress.completed);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20 shadow-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* User Input Display */}
          {progressData.run_input && (
            <Card className="mb-6 bg-gray-50 border-border">
              <CardContent className="pt-4 pb-3">
                <p className="eyebrow mb-2">Your Input</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Product: </span>
                    <span>{progressData.run_input.product}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Context: </span>
                    <span className="whitespace-pre-wrap break-words">{progressData.run_input.design_context}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Agents: </span>
                    <span>{progressData.run_input.n_agents}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Mode: </span>
                    <span>{progressData.run_input.pipeline_mode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="text-center mb-6">
            <h2 className="mb-2">Analysis in Progress</h2>
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>

          {/* Stage Tracker */}
          <div className="mb-6">
            <StageTracker currentStage={progress.stage_number} stages={STAGES} />
          </div>

          {/* Progress Bar + ETA */}
          <div className="max-w-2xl mx-auto">
            <Progress value={progressPercentage} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(progressPercentage)}% complete</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {remainingSec > 0 ? (
                  <>
                    ~{formatDuration(remainingSec)} remaining
                    <span className="mx-1 opacity-50">·</span>
                    {formatDuration(elapsedSec)} elapsed
                  </>
                ) : (
                  <>Wrapping up · {formatDuration(elapsedSec)} elapsed</>
                )}
              </span>
            </div>
            <div className="mt-4">
              <RotatingText messages={LOADING_MESSAGES[getStageKey(progress.stage_number)] || LOADING_MESSAGES['default']} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-10">
        {/* Agents Section — always shown (first to populate) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3>User Personas</h3>
            <span className="text-sm text-muted-foreground">
              {intermediate_results.agents.length}
              {expectedAgents ? ` / ${expectedAgents}` : ''} generated
              {stageNum === 1 && !stageDone(1) && (
                <span className="ml-2 text-primary">• In progress</span>
              )}
            </span>
          </div>
          {filledAndSkeletonGrid(
            intermediate_results.agents,
            expectedAgents,
            (agent, idx) => <AgentCard key={agent.id} agent={agent} index={idx} />,
            () => <AgentCardSkeleton />,
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          )}
        </section>

        {/* Experiences Section */}
        {(stageNum >= 2 || intermediate_results.experiences.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3>Product Experiences</h3>
              <span className="text-sm text-muted-foreground">
                {intermediate_results.experiences.length}
                {expectedAgents ? ` / ${expectedAgents}` : ''} simulated
                {stageNum === 2 && !stageDone(2) && (
                  <span className="ml-2 text-primary">• In progress</span>
                )}
              </span>
            </div>
            {filledAndSkeletonGrid(
              intermediate_results.experiences,
              expectedAgents,
              (exp, idx) => (
                <ExperienceCard
                  key={`exp-${exp.agent_id}`}
                  experience={exp}
                  index={idx}
                  agents={intermediate_results.agents}
                />
              ),
              () => <ExperienceCardSkeleton />,
              'grid-cols-1 md:grid-cols-2',
            )}
          </section>
        )}

        {/* Interviews Section */}
        {(stageNum >= 3 || intermediate_results.interviews.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3>User Interviews</h3>
              <span className="text-sm text-muted-foreground">
                {intermediate_results.interviews.length}
                {expectedAgents ? ` / ${expectedAgents}` : ''} conducted
                {stageNum === 3 && !stageDone(3) && (
                  <span className="ml-2 text-primary">• In progress</span>
                )}
              </span>
            </div>
            {stageNum === 3 && !stageDone(3) && intermediate_results.interviews.length > 0 && (
              <Card className="mb-4 border-primary/50 bg-primary/5">
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Currently asking Agent {intermediate_results.interviews[intermediate_results.interviews.length - 1].agent_id}:</span>
                    <span className="ml-2 font-medium">
                      {intermediate_results.interviews[intermediate_results.interviews.length - 1].interview[
                        intermediate_results.interviews[intermediate_results.interviews.length - 1].interview.length - 1
                      ]?.question || 'Conducting interview'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Question {intermediate_results.interviews[intermediate_results.interviews.length - 1].interview.length} in progress
                  </p>
                </CardContent>
              </Card>
            )}
            {filledAndSkeletonGrid(
              intermediate_results.interviews,
              expectedAgents,
              (interview, idx) => (
                <InterviewCard key={`int-${interview.agent_id}`} interview={interview} index={idx} />
              ),
              () => <InterviewCardSkeleton />,
              'grid-cols-1 md:grid-cols-2',
            )}
          </section>
        )}

        {/* Needs Section */}
        {(stageNum >= 4 || intermediate_results.needs.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3>Latent Needs</h3>
              <span className="text-sm text-muted-foreground">
                {intermediate_results.needs.length} extracted
                {stageNum === 4 && !stageDone(4) && (
                  <span className="ml-2 text-primary">• In progress</span>
                )}
              </span>
            </div>
            {intermediate_results.needs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {intermediate_results.needs.map((need, idx) => (
                  <NeedCard key={`need-${idx}`} need={need} index={idx} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <NeedCardSkeleton key={i} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
