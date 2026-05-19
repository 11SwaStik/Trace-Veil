import { useEffect, useRef } from 'react'
import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'
import gsap from 'gsap'
import MotionPathPlugin from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

const severityConfig: Record<string, string> = {
  LOW: '#3b82f6',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
}

export function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data = {},
}: EdgeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const animationRef = useRef<gsap.core.Tween | null>(null)

  const edgeData = data as { severity?: string; isAnimating?: boolean } | undefined

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Bottom,
    targetX,
    targetY,
    targetPosition: Position.Top,
  })

  useEffect(() => {
    if (!edgeData?.isAnimating || !svgRef.current || !dotRef.current) {
      // Kill animation if not animating anymore
      if (animationRef.current) {
        animationRef.current.kill()
        animationRef.current = null
      }
      return
    }

    const duration = 1.5

    // Create SVG path element for motion path animation
    const pathElement = svgRef.current.querySelector('path')
    if (!pathElement) return

    // Kill previous animation
    if (animationRef.current) {
      animationRef.current.kill()
    }

    // Animate the dot along the path
    animationRef.current = gsap.to(dotRef.current, {
      duration,
      motionPath: {
        path: pathElement,
        align: pathElement,
        alignOrigin: [0.5, 0.5],
      },
      ease: 'linear',
      repeat: -1,
    })

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
  }, [edgeData?.isAnimating, edgeData?.severity])

  const severity = edgeData?.severity || 'HIGH'
  const color = severityConfig[severity] || '#f97316'

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <filter id={`glow-${severity}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <BaseEdge path={edgePath} markerEnd="url(#react-flow__arrowclosed)" />
      {edgeData?.isAnimating ? (
        <circle
          ref={dotRef}
          r="6"
          fill={color}
          filter={`url(#glow-${severity})`}
          opacity={0.9}
        />
      ) : null}
    </svg>
  )
}
