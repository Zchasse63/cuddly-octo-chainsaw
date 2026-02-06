interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'text';
  count?: number;
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {items.map((i) => (
          <div key={i} className="p-6 bg-white rounded-xl border border-background-tertiary animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-background-tertiary" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-background-tertiary rounded w-1/4" />
                <div className="h-3 bg-background-tertiary rounded w-1/2" />
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="h-3 bg-background-tertiary rounded" />
                  <div className="h-3 bg-background-tertiary rounded" />
                  <div className="h-3 bg-background-tertiary rounded" />
                  <div className="h-3 bg-background-tertiary rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-full bg-background-tertiary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-background-tertiary rounded w-1/3" />
              <div className="h-2 bg-background-tertiary rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i} className="h-4 bg-background-tertiary rounded animate-pulse w-full" />
      ))}
    </div>
  );
}
