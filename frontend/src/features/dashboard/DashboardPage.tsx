export function DashboardPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-[#e0e0e0] mb-4">Dashboard</h1>
      <p className="text-[#888899] mb-8">Welcome to TraceVeil. This is your dashboard.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 hover:border-[#1e40af] transition-colors cursor-pointer">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-2">Recent Simulations</h2>
          <p className="text-[#888899]">View and manage your attack simulations</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 hover:border-[#1e40af] transition-colors cursor-pointer">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-2">New Simulation</h2>
          <p className="text-[#888899]">Create a new attack scenario simulation</p>
        </div>
      </div>

      <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Getting Started</h2>
        <ul className="text-[#888899] space-y-2">
          <li>✓ Phase 3 complete: Routing and layout</li>
          <li>→ Phase 4 coming: Simulation list and scenario picker</li>
          <li>→ Create and launch attack simulations</li>
          <li>→ Watch live network visualization</li>
          <li>→ Replay and analyze completed incidents</li>
        </ul>
      </div>
    </div>
  )
}
