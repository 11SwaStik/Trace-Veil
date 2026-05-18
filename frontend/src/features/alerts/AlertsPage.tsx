export function AlertsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-[#e0e0e0] mb-4">Alerts</h1>
      <p className="text-[#888899] mb-8">View all detection alerts from simulations</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4">
          <p className="text-[#888899] text-sm mb-1">Critical</p>
          <p className="text-2xl font-bold text-[#ef4444]">0</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4">
          <p className="text-[#888899] text-sm mb-1">High</p>
          <p className="text-2xl font-bold text-[#f97316]">0</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4">
          <p className="text-[#888899] text-sm mb-1">Medium</p>
          <p className="text-2xl font-bold text-[#eab308]">0</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4">
          <p className="text-[#888899] text-sm mb-1">Low</p>
          <p className="text-2xl font-bold text-[#3b82f6]">0</p>
        </div>
      </div>

      <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
        <p className="text-[#888899]">Phase 4: Real-time alerts will appear here</p>
      </div>
    </div>
  )
}
