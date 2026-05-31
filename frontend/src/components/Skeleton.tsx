import clsx from "clsx";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={clsx("rounded-lg animate-pulse", className)}
      style={{ background: "linear-gradient(90deg, rgba(15,23,42,0.06) 25%, rgba(15,23,42,0.12) 50%, rgba(15,23,42,0.06) 75%)", backgroundSize: "200% 100%" }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl shadow-glass p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Shimmer className="w-8 h-8 rounded-lg" />
        <Shimmer className="h-3 w-24" />
      </div>
      <Shimmer className="h-7 w-16" />
      <Shimmer className="h-9 w-full" />
      <Shimmer className="h-2.5 w-20" />
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="glass rounded-2xl shadow-glass p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Shimmer className="w-10 h-10 rounded-xl" />
        <Shimmer className="w-16 h-5 rounded" />
      </div>
      <div className="space-y-1.5">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between">
        <Shimmer className="w-14 h-14 rounded-full" />
        <div className="space-y-1.5">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => <Shimmer key={i} className="h-5 w-14 rounded-full" />)}
      </div>
      <Shimmer className="h-8 w-full rounded-lg" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex items-end gap-1 h-36 px-2">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="flex-1 rounded-t animate-pulse" style={{ height: `${30 + (i * 4) % 60}%`, background: "rgba(15,23,42,0.08)" }} />
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Shimmer className="w-7 h-7 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3 w-3/4" />
            <Shimmer className="h-2.5 w-1/2" />
          </div>
          <Shimmer className="h-2.5 w-10" />
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="w-56 shrink-0 space-y-2.5">
          <Shimmer className="h-5 w-32 rounded" />
          {[1, 2].map((card) => (
            <div key={card} className="glass rounded-xl p-3.5 space-y-2">
              <Shimmer className="w-8 h-8 rounded-lg" />
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-2.5 w-2/3" />
              <Shimmer className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
