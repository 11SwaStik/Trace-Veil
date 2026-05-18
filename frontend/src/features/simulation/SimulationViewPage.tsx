import { useParams } from 'react-router-dom'

export function SimulationViewPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1 className="text-4xl font-bold text-[#e0e0e0] mb-4">Simulation: {id}</h1>
      <p className="text-[#888899] mb-8">Live simulation view</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#131318] border border-[#262630] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Network Topology</h2>
          <p className="text-[#888899]">Phase 3: Network diagram will appear here</p>
        </div>

        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Alert Feed</h2>
          <p className="text-[#888899]">Phase 3: Real-time alerts will appear here</p>
        </div>
      </div>

      <div className="mt-6 bg-[#131318] border border-[#262630] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Event Timeline</h2>
        <p className="text-[#888899]">Phase 3: Attack events will appear here</p>
      </div>
    </div>
  )
}
