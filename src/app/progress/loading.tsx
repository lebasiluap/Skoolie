export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse pb-24">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-12 pb-8 text-center">
        <div className="h-3 w-20 bg-white/10 rounded mx-auto mb-4" />
        <div className="inline-flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-3xl px-10 py-5 mb-4">
          <div className="w-12 h-12 bg-white/10 rounded-full" />
          <div className="h-4 w-16 bg-white/10 rounded" />
        </div>
        <div className="h-7 w-24 bg-white/20 rounded mx-auto" />
        <div className="h-3 w-28 bg-white/10 rounded mx-auto mt-1" />
      </div>

      {/* Stats */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="h-7 w-8 bg-gray-100 rounded mx-auto mb-1" />
              <div className="h-3 w-14 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mt-6">
        <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 7 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-8 h-5 bg-gray-100 rounded" />
              <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-100 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-14 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
