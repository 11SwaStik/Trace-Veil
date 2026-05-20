import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { SceneOrchestrator } from '../../lib/animations/SceneOrchestrator'
import { CyberPulseSystem, EnvironmentalReactions } from '../../lib/animations/EnvironmentalEffects'
import TopBar from './TopBar'
import InfrastructureCanvas from './InfrastructureCanvas'
import BottomActionZone from './BottomActionZone'

/**
 * Master cinematic landing page component
 * Orchestrates all animations with narrative progression
 */
export default function CinematicLandingV2() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneOrchestrator | null>(null)
  const pulseSystemRef = useRef<CyberPulseSystem | null>(null)
  const envReactionsRef = useRef<EnvironmentalReactions | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [threatLevel, setThreatLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW')
  const [activePhase, setActivePhase] = useState('idle') // idle, detection, compromise, exfiltration

  // Initialize scene orchestrator and effects
  useEffect(() => {
    if (!containerRef.current) return

    // Create orchestrator
    sceneRef.current = new SceneOrchestrator()

    // Initialize pulse system at center
    pulseSystemRef.current = new CyberPulseSystem(containerRef.current, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })

    // Initialize environmental reactions
    envReactionsRef.current = new EnvironmentalReactions(containerRef.current)

    // Simulate threat level escalation
    const threatTimeline = gsap.timeline({ delay: 3 })
    threatTimeline.call(() => setThreatLevel('MEDIUM'), undefined, 0)
    threatTimeline.call(() => setActivePhase('detection'), undefined, 0)
    threatTimeline.call(() => setThreatLevel('HIGH'), undefined, 5)
    threatTimeline.call(() => setActivePhase('compromise'), undefined, 5)
    threatTimeline.call(() => setThreatLevel('CRITICAL'), undefined, 10)
    threatTimeline.call(() => setActivePhase('exfiltration'), undefined, 10)

    // Cleanup
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose()
      }
      if (pulseSystemRef.current) {
        // Pulse system cleanup handled by garbage collection
      }
      threatTimeline.kill()
    }
  }, [])

  // Trigger environmental reactions on threat change
  useEffect(() => {
    if (!containerRef.current || !envReactionsRef.current) return

    const threatMap = {
      LOW: 0.3,
      MEDIUM: 0.6,
      HIGH: 1,
      CRITICAL: 1.5,
    }

    const intensity = threatMap[threatLevel]

    // Emit pulse
    if (pulseSystemRef.current) {
      const pulseColor = {
        LOW: '#3ddbd9',
        MEDIUM: '#f59e0b',
        HIGH: '#ff6b7a',
        CRITICAL: '#ff3d5a',
      }[threatLevel]

      pulseSystemRef.current.emitPulse(intensity * 0.8, pulseColor)
    }

    // Screen glitch on threat escalation
    if (threatLevel !== 'LOW') {
      const glitchTl = gsap.timeline()
      glitchTl.to(containerRef.current, {
        opacity: 0.95,
        duration: 0.15,
        ease: 'power1.inOut',
      }, 0)
      glitchTl.to(containerRef.current, {
        opacity: 1,
        duration: 0.15,
        ease: 'power1.inOut',
      })
    }
  }, [threatLevel])

  const handleCTAClick = () => {
    setIsLoaded(true)
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #060810 0%, #0a0c15 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(61, 219, 217, 0.03) 0px,
              rgba(61, 219, 217, 0.03) 1px,
              transparent 1px,
              transparent 50px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(61, 219, 217, 0.03) 0px,
              rgba(61, 219, 217, 0.03) 1px,
              transparent 1px,
              transparent 50px
            )
          `,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Threat level indicator bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: threatLevel === 'LOW' ? 0.2 : threatLevel === 'MEDIUM' ? 0.5 : threatLevel === 'HIGH' ? 0.75 : 1 }}
        transition={{ duration: 0.8, ease: 'power2.inOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '3px',
          width: '100%',
          background: `linear-gradient(90deg, ${
            threatLevel === 'LOW'
              ? '#3ddbd9'
              : threatLevel === 'MEDIUM'
                ? '#f59e0b'
                : threatLevel === 'HIGH'
                  ? '#ff6b7a'
                  : '#ff3d5a'
          }, ${threatLevel === 'CRITICAL' ? '#ff3d5a' : '#3ddbd9'})`,
          boxShadow: `0 0 20px ${
            threatLevel === 'LOW'
              ? '#3ddbd9'
              : threatLevel === 'MEDIUM'
                ? '#f59e0b'
                : threatLevel === 'HIGH'
                  ? '#ff6b7a'
                  : '#ff3d5a'
          }`,
          transformOrigin: 'left',
          zIndex: 100,
        }}
      />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <TopBar isLoaded={isLoaded} />
      </div>

      {/* Main content grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '40px',
          padding: '40px 60px',
          height: '70vh',
          position: 'relative',
          zIndex: 3,
          alignItems: 'center',
        }}
      >
        {/* Left: Narrative & Status */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            paddingRight: '20px',
            borderRight: '1px solid rgba(61, 219, 217, 0.2)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#3ddbd9',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Attack Detection
            </h2>
            <div
              style={{
                fontSize: '13px',
                color: '#8892a4',
                lineHeight: 1.6,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {activePhase === 'idle' && (
                <>
                  <p>System monitoring active.</p>
                  <p>Waiting for attack simulation to begin...</p>
                </>
              )}
              {activePhase === 'detection' && (
                <>
                  <p>🔍 DETECTION PHASE</p>
                  <p>Initial reconnaissance detected on network perimeter.</p>
                  <p>Attacker scanning for vulnerabilities in external systems.</p>
                </>
              )}
              {activePhase === 'compromise' && (
                <>
                  <p>⚠️ COMPROMISE PHASE</p>
                  <p>Breach confirmed. Attacker has gained initial foothold.</p>
                  <p>Lateral movement initiated across infrastructure.</p>
                </>
              )}
              {activePhase === 'exfiltration' && (
                <>
                  <p>🚨 EXFILTRATION PHASE</p>
                  <p>Critical data extraction in progress.</p>
                  <p>Multiple nodes compromised. System integrity at risk.</p>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(61, 219, 217, 0.08)',
              border: '1px solid rgba(61, 219, 217, 0.2)',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#8892a4', marginBottom: '8px', textTransform: 'uppercase' }}>
              System Status
            </div>
            <div style={{ fontSize: '12px', color: '#b0b8c8', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.8 }}>
              <div>Nodes Monitored: <span style={{ color: '#3ddbd9', fontWeight: 600 }}>12</span></div>
              <div>Threat Level: <span style={{
                color: threatLevel === 'LOW' ? '#3ddbd9' : threatLevel === 'MEDIUM' ? '#f59e0b' : threatLevel === 'HIGH' ? '#ff6b7a' : '#ff3d5a',
                fontWeight: 600
              }}>{threatLevel}</span></div>
              <div>Alerts: <span style={{ color: '#ff6b7a', fontWeight: 600 }}>
                {threatLevel === 'LOW' ? 0 : threatLevel === 'MEDIUM' ? 3 : threatLevel === 'HIGH' ? 7 : 12}
              </span></div>
            </div>
          </div>
        </motion.div>

        {/* Center: Infrastructure Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <InfrastructureCanvas isLoaded={isLoaded} />
        </motion.div>

        {/* Right: Threat Intelligence */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            paddingLeft: '20px',
            borderLeft: '1px solid rgba(181, 123, 211, 0.2)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#b57bd3',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Data Exfiltration
            </h2>
            <div
              style={{
                fontSize: '13px',
                color: '#8892a4',
                lineHeight: 1.6,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {activePhase === 'idle' && (
                <>
                  <p>No active data extraction.</p>
                  <p>Systems nominal. All data secure.</p>
                </>
              )}
              {activePhase === 'detection' && (
                <>
                  <p>📡 Reconnaissance in progress</p>
                  <p>Attacker mapping network topology and data locations.</p>
                </>
              )}
              {activePhase === 'compromise' && (
                <>
                  <p>🔓 Access credentials obtained</p>
                  <p>Attacker preparing data exfiltration pathways.</p>
                </>
              )}
              {activePhase === 'exfiltration' && (
                <>
                  <p>💾 Data streaming detected</p>
                  <p>Sensitive information being transferred out of network.</p>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(181, 123, 211, 0.08)',
              border: '1px solid rgba(181, 123, 211, 0.2)',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#8892a4', marginBottom: '8px', textTransform: 'uppercase' }}>
              Attack Timeline
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#b0b8c8',
                fontFamily: '"JetBrains Mono", monospace',
                lineHeight: 1.8,
              }}
            >
              <div style={{ opacity: activePhase !== 'idle' ? 1 : 0.4 }}>
                ✓ Initial Access <span style={{ color: '#888' }}>T+0s</span>
              </div>
              <div style={{ opacity: activePhase === 'compromise' || activePhase === 'exfiltration' ? 1 : 0.4 }}>
                {activePhase === 'compromise' || activePhase === 'exfiltration' ? '●' : '○'} Lateral Movement{' '}
                <span style={{ color: '#888' }}>T+5s</span>
              </div>
              <div style={{ opacity: activePhase === 'exfiltration' ? 1 : 0.4 }}>
                {activePhase === 'exfiltration' ? '●' : '○'} Data Exfil <span style={{ color: '#888' }}>T+10s</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom action zone */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <BottomActionZone onCTAClick={handleCTAClick} isLoaded={isLoaded} />
      </div>
    </div>
  )
}
