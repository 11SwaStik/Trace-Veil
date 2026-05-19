import { Circle } from 'phosphor-react'

const statusConfig = [
  { status: 'CLEAN', color: '#22c55e', label: 'Clean' },
  { status: 'COMPROMISED', color: '#ef4444', label: 'Compromised' },
  { status: 'ELEVATED', color: '#f97316', label: 'Elevated' },
  { status: 'EXFILTRATING', color: '#a855f7', label: 'Exfiltrating' },
]

export function StatusLegend() {
  return (
    <div className="bg-[#131318] border border-[#262630] rounded-lg px-4 py-3 flex gap-6">
      {statusConfig.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <Circle size={12} weight="fill" style={{ color: item.color }} />
          <span className="text-xs font-medium text-[#a0a0b0]">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
