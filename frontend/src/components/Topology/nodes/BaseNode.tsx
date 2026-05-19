import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'

const statusConfig = {
  CLEAN: { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)' },
  COMPROMISED: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)' },
  ELEVATED: { color: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' },
  EXFILTRATING: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
}

interface BaseNodeProps {
  data: any
  isConnectable: boolean
  icon: React.ReactNode
}

export function BaseNode({ data, isConnectable, icon }: BaseNodeProps) {
  const status = data?.status || 'CLEAN'
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.CLEAN

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      onClick={() => console.log('Node clicked:', data?.id)}
      className="cursor-pointer"
      style={{
        filter: `drop-shadow(0 0 12px ${config.glow})`,
      }}
    >
      <div
        className="w-24 h-24 rounded-full bg-[#131318] border-2 flex flex-col items-center justify-center transition-all duration-300"
        style={{
          borderColor: config.color,
        }}
      >
        <div className="text-2xl text-[#e0e0e0]">{icon}</div>
      </div>

      <div className="text-center mt-2 min-w-max">
        <p className="text-xs font-semibold text-[#e0e0e0]">{data?.label}</p>
        <p className="text-[10px] text-[#888899]">{data?.ip}</p>
      </div>

      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </motion.div>
  )
}
