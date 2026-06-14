export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse pb-28">
      {/* Header */}
      <div className="bg-[#101010] px-5 pt-12 pb-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white/10 mb-4" />
        <div className="h-5 w-36 bg-white/20 rounded mb-2" />
        <div className="h-3 w-44 bg-white/10 rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-white/10 rounded-full" />
          <div className="h-6 w-16 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* XP bar */}
      <div className="px-5 mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full" />
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4">
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

      {/* Settings */}
      <div className="px-5 mt-6">
        <div className="h-4 w-16 bg-gray-200 rounded mb-3" />
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[...Array(2)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i < 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-100 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
