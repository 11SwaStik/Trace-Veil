import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useReactFlow } from '@xyflow/react'

export interface PacketLayerRef {
  spawnPacket: (opts: {
    fromX: number
    fromY: number
    toX: number
    toY: number
    color: string
    ease: 'in' | 'linear'
    duration?: number
  }) => void
}

const POOL_SIZE = 30

const PacketLayer = forwardRef<PacketLayerRef>((_, ref) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const { getViewport } = useReactFlow()
  const poolRef = useRef<
    Array<{
      circle: SVGCircleElement
      trail: SVGLineElement
      inUse: boolean
    }>
  >([])
  const rafRef = useRef<number>()

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    for (let i = 0; i < POOL_SIZE; i++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('r', '3.5')
      circle.setAttribute('opacity', '0')
      const trail = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      trail.setAttribute('stroke-width', '1.5')
      trail.setAttribute('opacity', '0')
      g.appendChild(trail)
      g.appendChild(circle)
      poolRef.current.push({ circle, trail, inUse: false })
    }
  }, [])

  useEffect(() => {
    const sync = () => {
      const { x, y, zoom } = getViewport()
      if (groupRef.current) {
        groupRef.current.setAttribute('transform', `translate(${x},${y}) scale(${zoom})`)
      }
      rafRef.current = requestAnimationFrame(sync)
    }
    rafRef.current = requestAnimationFrame(sync)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [getViewport])

  useImperativeHandle(
    ref,
    () => ({
      spawnPacket({ fromX, fromY, toX, toY, color, ease, duration = 1.4 }) {
        const slot = poolRef.current.find((p) => !p.inUse)
        if (!slot) return
        slot.inUse = true

        const { circle, trail } = slot
        circle.setAttribute('fill', color)
        circle.setAttribute('cx', String(fromX))
        circle.setAttribute('cy', String(fromY))
        circle.setAttribute('opacity', '1')
        trail.setAttribute('stroke', color)
        trail.setAttribute('x1', String(fromX))
        trail.setAttribute('y1', String(fromY))
        trail.setAttribute('x2', String(fromX))
        trail.setAttribute('y2', String(fromY))
        trail.setAttribute('opacity', '0.5')

        const startTime = performance.now()
        const durationMs = duration * 1000

        const easeIn = (u: number) => u * u
        const easeLinear = (u: number) => u
        const easeFn = ease === 'in' ? easeIn : easeLinear

        const animate = (now: number) => {
          let u = Math.min(1, (now - startTime) / durationMs)

          if (ease === 'linear' && u > 0.4 && u < 0.52) {
            u = 0.4
          }

          const k = easeFn(u)
          const cx = fromX + (toX - fromX) * k
          const cy = fromY + (toY - fromY) * k

          circle.setAttribute('cx', String(cx))
          circle.setAttribute('cy', String(cy))
          trail.setAttribute('x2', String(cx))
          trail.setAttribute('y2', String(cy))

          if (u < 1) {
            requestAnimationFrame(animate)
          } else {
            spawnShockwave(groupRef.current!, toX, toY, color)
            let opacity = 0.5
            const fade = () => {
              opacity -= 0.05
              if (opacity > 0) {
                trail.setAttribute('opacity', String(opacity))
                requestAnimationFrame(fade)
              } else {
                trail.setAttribute('opacity', '0')
                circle.setAttribute('opacity', '0')
                slot.inUse = false
              }
            }
            requestAnimationFrame(fade)
          }
        }
        requestAnimationFrame(animate)
      },
    }),
    [],
  )

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <g ref={groupRef} />
    </svg>
  )
})

PacketLayer.displayName = 'PacketLayer'
export default PacketLayer

function spawnShockwave(g: SVGGElement, cx: number, cy: number, color: string) {
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  ring.setAttribute('cx', String(cx))
  ring.setAttribute('cy', String(cy))
  ring.setAttribute('r', '22')
  ring.setAttribute('fill', 'none')
  ring.setAttribute('stroke', color)
  ring.setAttribute('stroke-width', '1.5')
  ring.setAttribute('opacity', '0.7')
  g.appendChild(ring)

  const start = performance.now()
  const dur = 700
  const step = (now: number) => {
    const u = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - u, 3)
    ring.setAttribute('r', String(22 + e * 60))
    ring.setAttribute('opacity', String(0.7 * (1 - e)))
    if (u < 1) requestAnimationFrame(step)
    else ring.remove()
  }
  requestAnimationFrame(step)
}
