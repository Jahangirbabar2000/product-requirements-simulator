import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { RefreshCw, CheckCircle, XCircle, Clock, User, Layers, Timer } from 'lucide-react';
import { getReproducibilityStatus, ReproducibilityStatusResponse } from '../lib/api';
import { RotatingText } from './RotatingText';
import { LOADING_MESSAGES } from '../lib/loadingMessages';

interface ReproducibilityProgressProps {
  jobId: string;
  onComplete: (results: any) => void;
}

// Helper to format time
function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Stage name mapping for display
const stageDisplayNames: Record<string, string> = {
  'queued': 'Waiting to Start',
  'initializing': 'Initializing Pipeline',
  'agent_generation': 'Generating Agents',
  'experience_simulation': 'Simulating Experiences',
  'interviews': 'Conducting Interviews',
  'need_extraction': 'Extracting Needs',
  'aggregation': 'Aggregating Results',
  'completed': 'Completed',
};

export function ReproducibilityProgress({ jobId, onComplete }: ReproducibilityProgressProps) {
  const [status, setStatus] = useState<ReproducibilityStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await getReproducibilityStatus(jobId);
        
        if (!isMounted) return;
        
        setStatus(response);

        if (response.status === 'completed' && response.results) {
          clearInterval(intervalId);
          onCompleteRef.current(response.results);
        } else if (response.status === 'failed') {
          clearInterval(intervalId);
          setError(response.error || 'Test failed');
        }
      } catch (err) {
        console.error('Error checking status:', err);
        if (isMounted) {
          setError('Failed to check test status');
        }
      }
    };

    // Check immediately
    checkStatus();
    
    // Then poll every 2 seconds for more responsive updates
    intervalId = setInterval(checkStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [jobId]);

  const progress = status?.progress;
  const iterationProgress = progress 
    ? (progress.iteration / progress.total) * 100 
    : 0;

  // Calculate stage progress within current iteration (4 stages per iteration)
  const stageOrder = ['agent_generation', 'experience_simulation', 'interviews', 'need_extraction'];
  const currentStageIndex = progress?.stage ? stageOrder.indexOf(progress.stage) : -1;
  const stageWithinIteration = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        <Card className="border shadow-card-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4">
              {status?.status === 'completed' ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : status?.status === 'failed' ? (
                <XCircle className="h-16 w-16 text-red-500" />
              ) : (
                <div className="relative">
                  <RefreshCw className="h-16 w-16 text-primary animate-spin" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {status?.status === 'completed' 
                ? 'Test Complete!' 
                : status?.status === 'failed'
                ? 'Test Failed'
                : 'Running Reproducibility Test'}
            </CardTitle>
            <CardDescription className="text-base">
              {error || progress?.message || 'Initializing test'}
            </CardDescription>
            {status?.status === 'processing' && (
              <div className="mt-2">
                <RotatingText
                  messages={
                    LOADING_MESSAGES[
                      ({ agent_generation: 'Agent Generation', experience_simulation: 'Experience Simulation', interviews: 'Interview', need_extraction: 'Need Extraction' } as Record<string, string>)[progress?.stage || '']
                    ] || LOADING_MESSAGES['default']
                  }
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Overall Iteration Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Iterations</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {progress?.iteration || 0} / {progress?.total || '?'}
                </span>
              </div>
              <Progress value={iterationProgress} className="h-4" />
              
              {/* Iteration Dots */}
              {progress && progress.total > 0 && progress.total <= 10 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: progress.total }, (_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        i < progress.iteration
                          ? 'bg-green-500 text-white'
                          : i === progress.iteration - 1 || (i === 0 && progress.iteration === 0)
                          ? 'bg-primary text-white animate-pulse'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Stage */}
            <div className="bg-gray-50 border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Current Stage</span>
                <span className="font-semibold text-primary">
                  {stageDisplayNames[progress?.stage || 'queued'] || progress?.stage_name || 'Waiting'}
                </span>
              </div>

              {/* Stage Progress Bar (within iteration) */}
              {status?.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stage Progress</span>
                    <span>{stageWithinIteration + 1} / 4</span>
                  </div>
                  <div className="flex gap-1">
                    {['Agents', 'Experiences', 'Interviews', 'Needs'].map((stage, idx) => (
                      <div 
                        key={stage}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          idx < stageWithinIteration
                            ? 'bg-green-500'
                            : idx === stageWithinIteration
                            ? 'bg-primary animate-pulse'
                            : 'bg-muted-foreground/20'
                        }`}
                        title={stage}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Agents</span>
                    <span>Exp</span>
                    <span>Interview</span>
                    <span>Needs</span>
                  </div>
                </div>
              )}

              {/* Current Agent */}
              {progress?.current_agent && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Processing Agent</span>
                  </div>
                  <span className="font-medium">
                    {progress.current_agent} / {progress.total_agents}
                  </span>
                </div>
              )}
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Elapsed</span>
                </div>
                <span className="text-xl font-mono font-bold">
                  {formatTime(progress?.elapsed_seconds)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Est. Remaining</span>
                </div>
                <span className="text-xl font-mono font-bold">
                  {progress?.eta_seconds != null && progress.eta_seconds > 0 
                    ? formatTime(progress.eta_seconds)
                    : '--:--'}
                </span>
              </div>
            </div>

            {/* Job ID */}
            <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Job ID</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {jobId}
              </span>
            </div>

            {/* Info Text */}
            {status?.status === 'processing' && (
              <p className="text-sm text-center text-muted-foreground italic">
                Each iteration runs the full pipeline (4 stages × {progress?.total_agents || '?'} agents).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
