export function StatCardSkeleton() {
  return (
    <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="h-3 w-24 bg-[#353438] rounded" />
      <div className="h-8 w-16 bg-[#353438] rounded-lg" />
    </div>
  );
}

export function HabitCardSkeleton() {
  return (
    <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-5 animate-pulse flex items-center justify-between space-x-4">
      <div className="flex items-center gap-3.5 flex-1">
        <div className="w-12 h-12 rounded-2xl bg-[#353438]" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 bg-[#353438] rounded" />
          <div className="h-3 w-20 bg-[#353438] rounded" />
        </div>
      </div>
      <div className="h-10 w-28 bg-[#353438] rounded-xl" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-6 animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-5 w-40 bg-[#353438] rounded" />
        <div className="h-8 w-24 bg-[#353438] rounded-xl" />
      </div>
      <div className="h-60 w-full bg-[#353438]/50 rounded-xl" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="bg-[#1f1f22] border border-white/5 rounded-2xl p-4 animate-pulse flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-[#353438]" />
        <div className="w-10 h-10 rounded-xl bg-[#353438]" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-[#353438] rounded" />
          <div className="h-3 w-16 bg-[#353438] rounded" />
        </div>
      </div>
      <div className="h-6 w-16 bg-[#353438] rounded-lg" />
    </div>
  );
}
