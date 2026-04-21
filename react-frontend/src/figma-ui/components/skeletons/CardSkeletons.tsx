import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/* Shared shimmer wrapper — gives skeletons a subtle left-to-right sweep */
function Shimmer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {children}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10" />
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <Shimmer>
      <Card className="h-full shadow-card-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
          <div className="pt-2 border-t border-border">
            <Skeleton className="h-2 w-16 mb-2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Shimmer>
  );
}

export function ExperienceCardSkeleton() {
  return (
    <Shimmer>
      <Card className="h-full shadow-card-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[95%]" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    </Shimmer>
  );
}

export function InterviewCardSkeleton() {
  return (
    <Shimmer>
      <Card className="h-full shadow-card-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="space-y-1.5 pl-3 border-l-2 border-border">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </CardContent>
      </Card>
    </Shimmer>
  );
}

export function NeedCardSkeleton() {
  return (
    <Shimmer>
      <Card className="h-full shadow-card-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    </Shimmer>
  );
}

export function SkeletonGrid({
  count,
  cols,
  children,
}: {
  count: number;
  cols: string;
  children: (i: number) => React.ReactNode;
}) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children(i)}</div>
      ))}
    </div>
  );
}
