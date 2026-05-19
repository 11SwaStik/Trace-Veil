import { useEffect, useRef } from 'react'
import { getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'
import gsap from 'gsap'
import type { EdgeState } from '../../../types/simulation'

const EDGE_STYLE: Record<EdgeState, { stroke: string; width: number; dash: number }> = {
  rest: { stroke: '#989CA4', width: 1, dash: 0 },
  attacked: { stroke: '#3DDBD9', width: 2, dash: 0 },
  c2: { stroke: '#B57BD3', width: 1.5, dash: 4 },
  exfil: { stroke: '#B57BD3', width: 2, dash: 0 },
  dim: { stroke: '#686C75', width: 1, dash: 2 },
}

export function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data = {},
}: EdgeProps) {
  const pathRef = useRef<SVGPathElement>(null)

  const edgeData = data as { edgeState?: EdgeState; protocol?: string } | undefined
  const edgeState = edgeData?.edgeState || 'rest'
  const style = EDGE_STYLE[edgeState]

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Bottom,
    targetX,
    targetY,
    targetPosition: Position.Top,
  })

  useEffect(() => {
    if (!pathRef.current) return

    gsap.to(pathRef.current, {
      strokeWidth: style.width,
      strokeDasharray: style.dash,
      stroke: style.stroke,
      duration: 0.3,
      ease: 'power2.out',
    })
  }, [edgeState, style])

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        className={edgeState === 'c2' ? 'edge-c2' : ''}
        style={{ transition: 'stroke 0.3s ease' }}
      />
    </svg>
  )
}
