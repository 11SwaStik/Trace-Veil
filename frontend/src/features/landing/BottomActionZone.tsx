import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import gsap from 'gsap'

interface BottomActionZoneProps {
  onCTAClick: () => void
  isLoaded: boolean
}

export default function BottomActionZone({ onCTAClick, isLoaded }: BottomActionZoneProps) {
  const navigate = useNavigate()
  const ctaRef = useRef<HTMLButtonElement>(null)
  const [nodeCount, setNodeCount] = useState(12)
  const [threatLevel, setThreatLevel] = useState('MEDIUM')

  // Simulate threat escalation
  useEffect(() => {
    if (!isLoaded) return

    const timeline = [
      { delay: 0, count: 12, level: 'MEDIUM' },
      { delay: 3000, count: 8, level: 'HIGH' },
      { delay: 6000, count: 3, level: 'CRITICAL' },
      { delay: 9000, count: 12, level: 'MEDIUM' }
    ]

    const intervals = timeline.map(({ delay, count, level }) =>
      setTimeout(() => {
        setNodeCount(count)
        setThreatLevel(level)
      }, delay)
    )

    return () => intervals.forEach(interval => clearTimeout(interval))
  }, [isLoaded])

  // CTA button hover effects
  useEffect(() => {
    if (!ctaRef.current) return

    const handleMouseEnter = () => {
      gsap.to(ctaRef.current, {
        scale: 1.08,
        boxShadow: '0 0 40px rgba(61, 219, 217, 0.8), inset 0 0 20px rgba(61, 219, 217, 0.2)',
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    const handleMouseLeave = () => {
      gsap.to(ctaRef.current, {
        scale: 1,
        boxShadow: '0 0 20px rgba(61, 219, 217, 0.4)',
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    ctaRef.current.addEventListener('mouseenter', handleMouseEnter)
    ctaRef.current.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      ctaRef.current?.removeEventListener('mouseenter', handleMouseEnter)
      ctaRef.current?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const threatColor = threatLevel === 'CRITICAL' ? '#ff3d5a' : threatLevel === 'HIGH' ? '#f59e0b' : '#3ddbd9'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 2.0 }}
      style={{
        height: '20vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
        borderTop: '1px solid rgba(61, 219, 217, 0.15)',
        background: 'linear-gradient(to bottom, rgba(6, 8, 16, 0.2), rgba(6, 8, 16, 0.4))',
        backdropFilter: 'blur(8px)',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Left: Network Status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10px'
        }}
      >
        <div style={{ color: '#8892a4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          NETWORK STATUS
        </div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#3ddbd9' }}>
          {nodeCount} NODES
        </div>
        <div style={{ fontSize: '11px', color: '#b0b8c8' }}>
          Threat Level: <span style={{ color: threatColor, fontWeight: 600 }}>{threatLevel}</span>
        </div>
      </div>

      {/* Center: Main CTA Button */}
      <motion.button
        ref={ctaRef}
        onClick={onCTAClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          padding: '18px 56px',
          background: 'linear-gradient(135deg, rgba(61, 219, 217, 0.1), rgba(61, 219, 217, 0.05))',
          border: '2px solid #3ddbd9',
          borderRadius: '10px',
          color: '#3ddbd9',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 0 20px rgba(61, 219, 217, 0.4)',
          transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <span style={{ position: 'relative', zIndex: 2 }}>▶ START SIMULATION</span>

        {/* Animated background */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(61, 219, 217, 0.2), transparent)',
            opacity: 0
          }}
          animate={{ x: ['0%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* Right: Quick Access */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            color: '#8892a4',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}
        >
          QUICK ACCESS
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px'
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1.5px solid rgba(61, 219, 217, 0.3)',
              borderRadius: '6px',
              color: '#b0b8c8',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 250ms'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3ddbd9'
              e.currentTarget.style.color = '#3ddbd9'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(61, 219, 217, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(61, 219, 217, 0.3)'
              e.currentTarget.style.color = '#b0b8c8'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            LOGIN
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1.5px solid rgba(181, 123, 211, 0.3)',
              borderRadius: '6px',
              color: '#b0b8c8',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 250ms'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#b57bd3'
              e.currentTarget.style.color = '#b57bd3'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(181, 123, 211, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(181, 123, 211, 0.3)'
              e.currentTarget.style.color = '#b0b8c8'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            SIGN UP
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
