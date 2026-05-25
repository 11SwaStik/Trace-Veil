import gsap from 'gsap'
import { useEffect, useRef } from 'react'

export default function AmbientEffects() {
  const scanlinesRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scanline drift animation
    if (scanlinesRef.current) {
      gsap.to(scanlinesRef.current, {
        backgroundPosition: '0 20px',
        duration: 3,
        repeat: -1,
        ease: 'none'
      })
    }

    // Grid breathing
    if (gridRef.current) {
      gsap.to(gridRef.current, {
        opacity: 0.05,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }
  }, [])

  return (
    <>
      {/* Background grid */}
      <div
        ref={gridRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundPosition: '14px 14px',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Scanlines */}
      <div
        ref={scanlinesRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 229, 204, 0.02), rgba(0, 229, 204, 0.02) 2px, transparent 2px, transparent 4px)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.8
        }}
      />

      {/* Vignette - edges darker */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(6, 8, 16, 0.3) 100%)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />

      {/* Top to bottom gradient (subtle red tint on heavy activity) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.1) 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
    </>
  )
}
