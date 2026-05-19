import { useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import gsap from 'gsap'
import type { NodeState } from '../../../types/simulation'
import { STATE_RING, STATE_FILL } from '../../../types/simulation'

const ICONS: Record<string, string> = {
  FIREWALL: 'M12 2L2 7v10h20V7l-10-5zm0 3l6 3v6H6v-6l6-3z',
  DATABASE: 'M12 2c-5.5 0-10 2.5-10 5.5v9c0 3 4.5 5.5 10 5.5s10-2.5 10-5.5v-9c0-3-4.5-5.5-10-5.5zm0 2c4.4 0 8 1.8 8 3.5v1.5c0 1.7-3.6 3.5-8 3.5s-8-1.8-8-3.5V7.5c0-1.7 3.6-3.5 8-3.5z',
  DOMAIN_CONTROLLER: 'M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 2v4h16V5H4zm0 6v8h16v-8H4z',
  WORKSTATION: 'M3 4h18c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-7v2h4v2H8v-2h4v-2H3c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v10h18V6H3z',
  ATTACKER: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  JUMP_SERVER: 'M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5zm0 2h14v10H5V5zm2 2v6h10V7H7z',
}

function getIcon(nodeType: string): string {
  return ICONS[nodeType] || ICONS.WORKSTATION
}

interface InfraNodeProps {
  data: {
    label: string
    nodeType: string
    ip: string
    state: NodeState
  }
}

export function InfraNode({ data }: InfraNodeProps) {
  const ringRef = useRef<SVGCircleElement>(null)
  const fillRef = useRef<SVGCircleElement>(null)
  const vibrationRef = useRef<SVGGElement>(null)
  const c2IntervalRef = useRef<NodeJS.Timeout | null>(null)

  const ringConfig = STATE_RING[data.state]
  const fillColor = STATE_FILL[data.state]
  const icon = getIcon(data.nodeType)

  useEffect(() => {
    if (!ringRef.current || !fillRef.current) return

    gsap.to(ringRef.current, {
      r: ringConfig.width,
      strokeDasharray: ringConfig.dash,
      stroke: ringConfig.stroke,
      duration: 0.3,
      ease: 'power2.out',
    })

    gsap.to(fillRef.current, {
      fill: fillColor,
      duration: 0.3,
      ease: 'power2.out',
    })
  }, [data.state, ringConfig, fillColor])

  useEffect(() => {
    if (data.state === 'compromising' && vibrationRef.current) {
      const vibrationDuration = 1.2
      const frameCount = 24
      const frameInterval = vibrationDuration / frameCount
      let frameIdx = 0

      const vibrationAnimation = () => {
        if (frameIdx < frameCount && vibrationRef.current) {
          const offset = (Math.random() - 0.5) * 8
          gsap.to(vibrationRef.current, {
            x: offset,
            y: (Math.random() - 0.5) * 8,
            duration: frameInterval,
          })
          frameIdx++
          setTimeout(vibrationAnimation, frameInterval * 1000)
        }
      }

      vibrationAnimation()
    }
  }, [data.state])

  useEffect(() => {
    if (data.state === 'c2_beaconing') {
      if (c2IntervalRef.current) clearInterval(c2IntervalRef.current)

      const dispatchPulse = () => {
        if (vibrationRef.current) {
          vibrationRef.current.dispatchEvent(new CustomEvent('c2-pulse'))
        }
      }

      c2IntervalRef.current = setInterval(() => {
        dispatchPulse()
      }, 2500 + Math.random() * 1500)

      return () => {
        if (c2IntervalRef.current) clearInterval(c2IntervalRef.current)
      }
    }
  }, [data.state])

  return (
    <div
      style={{
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
        <g ref={vibrationRef} style={{ transition: 'none' }}>
          <defs>
            <filter id={`glow-${data.label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={ringConfig.width > 1 ? 3 : 0} result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="40"
            cy="40"
            r="30"
            ref={fillRef}
            fill={fillColor}
            style={{ transition: 'fill 0.3s ease' }}
          />

          <circle
            cx="40"
            cy="40"
            r="30"
            ref={ringRef}
            fill="none"
            stroke={ringConfig.stroke}
            strokeWidth={ringConfig.width}
            strokeDasharray={ringConfig.dash}
            filter={`url(#glow-${data.label})`}
            style={{ transition: 'stroke 0.3s ease' }}
          />

          <g opacity="0.7">
            <path
              d={icon}
              transform="translate(28, 28) scale(0.67)"
              fill="var(--ink-1)"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        </g>
      </svg>

      <div style={{ position: 'absolute', bottom: '-24px', fontSize: '11px', color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>
        {data.label}
      </div>

      <Handle position={Position.Top} type="target" style={{ visibility: 'hidden' }} />
      <Handle position={Position.Bottom} type="source" style={{ visibility: 'hidden' }} />
      <Handle position={Position.Left} type="target" style={{ visibility: 'hidden' }} />
      <Handle position={Position.Right} type="source" style={{ visibility: 'hidden' }} />
    </div>
  )
}
