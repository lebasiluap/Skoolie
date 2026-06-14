export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-[#101010] px-5 py-4 flex items-center justify-between">
        <div>
          <div className="h-3 w-24 bg-white/10 rounded mb-2" />
          <div className="h-4 w-32 bg-white/20 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-24 bg-white/10 rounded-full" />
          <div className="w-9 h-9 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* XP bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full" />
          <div className="h-3 w-28 bg-gray-100 rounded mt-1" />
        </div>

        {/* Stats */}
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-7 w-12 bg-gray-100 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Start studying */}
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full" />
                <div className="h-3 w-14 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <div className="h-4 w-24 bg-gray-100 rounded mb-1" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-14 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
