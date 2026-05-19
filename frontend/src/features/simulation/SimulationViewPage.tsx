import { useRef, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import TopologyDiagram from '../../components/Topology/TopologyDiagram'
import PacketLayer, { PacketLayerRef } from '../../components/Topology/PacketLayer'
import { useSimulationSocket, type PacketOpts } from '../../hooks/useSimulationSocket'
import { useSimStore } from '../../store/simulationStore'
import InspectorPanel from '../../components/Inspector/InspectorPanel'
import TimelineTray from '../../components/Timeline/TimelineTray'
import { createPortal } from 'react-dom'

export default function SimulationViewPage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const packetRef = useRef<PacketLayerRef>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const glitchFiredRef = useRef(false)
  const bloomFiredRef = useRef(false)
  const { integrity } = useSimStore()

  useEffect(() => {
    const el = document.getElementById('integrity-val')
    if (!el) return
    el.textContent = `${integrity}%`
    const pill = document.getElementById('integrity-pill')
    if (!pill) return
    if (integrity < 70) pill.style.color = 'var(--threat)'
    else if (integrity < 85) pill.style.color = 'var(--warn)'
    else pill.style.color = 'var(--ink-1)'
  }, [integrity])

  const handlePacket = useCallback((opts: PacketOpts) => {
    window.dispatchEvent(new CustomEvent('spawn-packet', { detail: opts }))
  }, [])

  const handleFirstCompromise = useCallback(() => {
    if (glitchFiredRef.current) return
    glitchFiredRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.animation = 'glitch 380ms steps(8, end)'
    setTimeout(() => {
      canvas.style.animation = ''
    }, 380)
  }, [])

  const handleFirstCritical = useCallback(() => {
    if (bloomFiredRef.current) return
    bloomFiredRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.transition = 'box-shadow 500ms ease'
    canvas.style.boxShadow = 'inset 0 0 0 1px rgba(229,72,77,0.4), inset 0 0 80px 0 rgba(229,72,77,0.15)'
  }, [])

  useSimulationSocket({
    simulationId: simulationId ?? '',
    wsBaseUrl: 'ws://localhost:8001',
    onPacket: handlePacket,
    onFirstCompromise: handleFirstCompromise,
    onFirstCritical: handleFirstCritical,
  })

  useEffect(() => {
    const handleSpawnPacket = (e: Event) => {
      const customEvent = e as CustomEvent<PacketOpts>
      const detail = customEvent.detail

      const sourceEl = document.querySelector(`[data-id="${detail.fromId}"]`)
      const targetEl = document.querySelector(`[data-id="${detail.toId}"]`)

      if (sourceEl && targetEl && packetRef.current) {
        const sourceRect = sourceEl.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()
        const canvasRect = canvasRef.current?.getBoundingClientRect()

        if (canvasRect) {
          const fromX = sourceRect.left - canvasRect.left + sourceRect.width / 2
          const fromY = sourceRect.top - canvasRect.top + sourceRect.height / 2
          const toX = targetRect.left - canvasRect.left + targetRect.width / 2
          const toY = targetRect.top - canvasRect.top + targetRect.height / 2

          packetRef.current.spawnPacket({
            fromX,
            fromY,
            toX,
            toY,
            color: detail.color,
            ease: detail.ease,
          })
        }
      }
    }

    window.addEventListener('spawn-packet', handleSpawnPacket)
    return () => window.removeEventListener('spawn-packet', handleSpawnPacket)
  }, [])

  const [inspectorEl, setInspectorEl] = useState<HTMLElement | null>(null)
  const [timelineEl, setTimelineEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const inspector = document.getElementById('inspector-panel')
    const timeline = document.getElementById('timeline-tray')

    if (inspector) setInspectorEl(inspector)
    if (timeline) setTimelineEl(timeline)
  }, [])

  return (
    <>
      <div ref={canvasRef} style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlowProvider>
          <TopologyDiagram />
          <PacketLayer ref={packetRef} />
        </ReactFlowProvider>
      </div>

      {inspectorEl && createPortal(<InspectorPanel />, inspectorEl)}
      {timelineEl && createPortal(<TimelineTray />, timelineEl)}
    </>
  )
}
