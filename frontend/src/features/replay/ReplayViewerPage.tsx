import { useParams } from 'react-router-dom'

export function ReplayViewerPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1 className="text-4xl font-bold text-[#e0e0e0] mb-4">Replay: {id}</h1>
      <p className="text-[#888899] mb-8">Review a completed simulation</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#131318] border border-[#262630] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Network Topology</h2>
          <p className="text-[#888899]">Phase 5: Replay network diagram will appear here</p>
        </div>

        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Playback Controls</h2>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors text-sm font-medium">
              Play
            </button>
            <button className="w-full px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors text-sm font-medium">
              Pause
            </button>
            <button className="w-full px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors text-sm font-medium">
              Reset
            </button>
            <p className="text-[#888899] text-xs">Phase 5: Speed and scrubber controls coming</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#131318] border border-[#262630] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">Event Timeline</h2>
        <p className="text-[#888899]">Phase 5: Replay events will appear here</p>
      </div>
    </div>
  )
}
