import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface TopBarProps {
  isLoaded: boolean
}

export default function TopBar({ isLoaded }: TopBarProps) {
  const [liveTime, setLiveTime] = useState('T+00:00.0')

  useEffect(() => {
    // Live time ticker
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const minutes = Math.floor(elapsed / 60)
      const seconds = (elapsed % 60).toFixed(1)
      setLiveTime(`T+${String(minutes).padStart(2, '0')}:${String(parseFloat(seconds)).padStart(4, '0')}`)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.3 }}
      style={{
        height: '5vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid rgba(0, 229, 204, 0.1)',
        background: 'rgba(6, 8, 16, 0.4)',
        backdropFilter: 'blur(4px)',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Left: Brand */}
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: '#00e5cc',
          textTransform: 'uppercase',
          textShadow: '0 0 10px rgba(0, 229, 204, 0.4)'
        }}
      >
        ⬢ TRACEVEIL
      </div>

      {/* Center: Live indicator */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '9px',
          color: '#ff3d5a',
          letterSpacing: '0.08em'
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#ff3d5a',
            boxShadow: '0 0 8px rgba(255, 61, 90, 0.8)'
          }}
        />
        SIMULATION RUNNING · ATTACK ACTIVE
      </motion.div>

      {/* Right: Time */}
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '9px',
          color: '#8892a4',
          letterSpacing: '0.08em'
        }}
      >
        {liveTime}
      </div>
    </motion.div>
  )
}
