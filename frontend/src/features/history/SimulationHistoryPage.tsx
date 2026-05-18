export function SimulationHistoryPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-[#e0e0e0] mb-4">Simulation History</h1>
      <p className="text-[#888899] mb-8">View all your past simulations</p>

      <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#262630]">
              <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Scenario</th>
              <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Date</th>
              <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#262630] hover:bg-[#1a1a20] transition-colors">
              <td className="py-3 px-4 text-[#888899]">Phase 4: Simulation list will appear here</td>
              <td className="py-3 px-4 text-[#888899]">—</td>
              <td className="py-3 px-4 text-[#888899]">—</td>
              <td className="py-3 px-4 text-[#888899]">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
