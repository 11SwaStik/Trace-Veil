import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import TopBar from './TopBar'
import InfrastructureCanvas from './InfrastructureCanvas'
import BottomActionZone from './BottomActionZone'
import AmbientEffects from './AmbientEffects'

export default function CinematicLanding() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Trigger entry animation
    setIsLoaded(true)
  }, [])

  const handleCTAClick = () => {
    // Explosion effect before transition
    if (containerRef.current) {
      const tl = gsap.timeline()

      tl.to(containerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in'
      })

      setTimeout(() => {
        navigate('/register')
      }, 300)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#060810',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Ambient background effects */}
      <AmbientEffects />

      {/* Top bar - 5vh */}
      <TopBar isLoaded={isLoaded} />

      {/* Infrastructure centerpiece - 60vh */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '60vh'
        }}
      >
        <InfrastructureCanvas isLoaded={isLoaded} />
      </div>

      {/* Bottom action zone - 20vh */}
      <BottomActionZone onCTAClick={handleCTAClick} isLoaded={isLoaded} />
    </div>
  )
}
