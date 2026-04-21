import { Check, Loader2 } from 'lucide-react';

interface StageTrackerProps {
  currentStage: number;
  stages: string[];
}

export function StageTracker({ currentStage, stages }: StageTrackerProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStage - 1) / (stages.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stage Nodes */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const stageNumber = index + 1;
            const isCompleted = stageNumber < currentStage;
            const isActive = stageNumber === currentStage;
            const isPending = stageNumber > currentStage;

            return (
              <div key={stage} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
                {/* Node Circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                    ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-background border-primary text-primary shadow-lg scale-110' : ''}
                    ${isPending ? 'bg-background border-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-sm">{stageNumber}</span>
                  )}
                </div>

                {/* Stage Label */}
                <div className="mt-3 text-center px-2">
                  <p
                    className={`font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300 ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {stage}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
