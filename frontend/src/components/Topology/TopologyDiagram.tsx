import { useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

import { InfraNode } from './nodes/InfraNode'
import { AnimatedEdge } from './edges/AnimatedEdge'
import { useSimulationStore } from '../../store/simulationStore'
import type { SimNode, SimEdge, EdgeState } from '../../types/simulation'
import type { PacketLayerRef } from './PacketLayer'

const nodeTypes: NodeTypes = {
  infraNode: InfraNode,
}

const edgeTypes: EdgeTypes = {
  attackEdge: AnimatedEdge,
}

function TopologyInner({ packetRef }: { packetRef?: React.RefObject<PacketLayerRef> }) {
  const { nodes: storeNodes, edges: storeEdges } = useSimulationStore()
  const { getNode } = useReactFlow()
  const sweepFiredRef = useRef(false)

  // Wire packet spawning through React Flow positions
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      const { fromId, toId, color, ease } = customEvent.detail
      const fromNode = getNode(fromId)
      const toNode = getNode(toId)
      if (!fromNode || !toNode || !packetRef?.current) return

      packetRef.current.spawnPacket({
        fromX: fromNode.position.x + 40,
        fromY: fromNode.position.y + 40,
        toX: toNode.position.x + 40,
        toY: toNode.position.y + 40,
        color,
        ease: ease === 'power1.in' ? 'in' : 'linear',
      })
    }
    window.addEventListener('spawn-packet', handler)
    return () => window.removeEventListener('spawn-packet', handler)
  }, [getNode, packetRef])

  // Recon sweep on first RECON event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail.type !== 'RECON' || sweepFiredRef.current) return
      sweepFiredRef.current = true
      startReconSweep()
    }
    window.addEventListener('spawn-packet', handler)
    return () => window.removeEventListener('spawn-packet', handler)
  }, [])

  // Detection sigils on alert
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      const nodeId = customEvent.detail.nodeId
      const rfNode = getNode(nodeId)
      if (!rfNode) return
      const { x, y } = rfNode.position
      spawnHexSigil(x + 68, y + 12)
    }
    window.addEventListener('alert-fired', handler)
    return () => window.removeEventListener('alert-fired', handler)
  }, [getNode])

  function startReconSweep() {
    const svg = document.querySelector('.react-flow__renderer') as SVGElement
    if (!svg) return
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', '-50')
    line.setAttribute('x2', '-50')
    line.setAttribute('y1', '0')
    line.setAttribute('y2', '2000')
    line.setAttribute('stroke', '#3DDBD9')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('opacity', '0.35')
    line.style.pointerEvents = 'none'
    svg.appendChild(line)

    const start = performance.now()
    const duration = 5500
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / duration)
      const x = -50 + u * 1200
      line.setAttribute('x1', String(x))
      line.setAttribute('x2', String(x))
      line.setAttribute('opacity', String(0.35 * (1 - u * 0.5)))
      if (u < 1) requestAnimationFrame(step)
      else line.remove()
    }
    requestAnimationFrame(step)
  }

  function spawnHexSigil(cx: number, cy: number) {
    const g = document.querySelector('.react-flow__renderer') as SVGElement
    if (!g) return
    const r = 8
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')
    const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    hex.setAttribute('points', pts)
    hex.setAttribute('fill', 'none')
    hex.setAttribute('stroke', '#FFFFFF')
    hex.setAttribute('stroke-width', '1.5')
    hex.setAttribute('opacity', '0')
    hex.style.transformOrigin = `${cx}px ${cy}px`
    hex.style.transform = 'rotate(-30deg)'
    hex.style.transition = 'opacity 300ms ease, transform 500ms cubic-bezier(0.34,1.4,0.64,1)'
    g.appendChild(hex)

    requestAnimationFrame(() => {
      hex.setAttribute('opacity', '0.9')
      hex.style.transform = 'rotate(30deg)'
    })

    setTimeout(() => {
      hex.style.transition = 'opacity 400ms ease'
      hex.setAttribute('opacity', '0')
      setTimeout(() => hex.remove(), 400)
    }, 1200)
  }

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (Object.keys(storeNodes).length === 0) {
      return { nodes: [], edges: [] }
    }

    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 })

    const nodeArray = Object.values(storeNodes)
    const edgeArray = Object.values(storeEdges)

    nodeArray.forEach((node: SimNode) => {
      dagreGraph.setNode(node.id, { width: 80, height: 80 })
    })

    edgeArray.forEach((edge: SimEdge) => {
      if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
        dagreGraph.setEdge(edge.source, edge.target)
      }
    })

    dagre.layout(dagreGraph)

    const rfNodes: Node[] = nodeArray.map((node: SimNode) => {
      const dagreNode = dagreGraph.node(node.id)
      return {
        id: node.id,
        data: {
          nodeId: node.id,
          label: node.label,
          nodeType: node.type,
          ip: node.ip,
          state: node.state,
        },
        position: {
          x: dagreNode.x - 40,
          y: dagreNode.y - 40,
        },
        type: 'infraNode',
      }
    })

    const rfEdges: Edge[] = edgeArray.map((edge: SimEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'attackEdge',
      data: {
        edgeState: edge.edgeState as EdgeState,
        protocol: edge.protocol,
      },
    }))

    return { nodes: rfNodes, edges: rfEdges }
  }, [storeNodes, storeEdges])

  return (
    <ReactFlow
      nodes={layoutedNodes}
      edges={layoutedEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      style={{ background: 'var(--bg-0)', width: '100%', height: '100%' }}
      onNodesChange={() => {}}
      onEdgesChange={() => {}}
    >
      <Background color="var(--line-1)" gap={28} size={1} />
    </ReactFlow>
  )
}

interface TopologyDiagramProps {
  topology?: any
  nodeStates?: Record<string, string>
  animatingEdges?: Record<string, { sourceId: string; targetId: string; severity: string }>
  packetRef?: React.RefObject<PacketLayerRef>
}

function TopologyDiagramComponent(props?: TopologyDiagramProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-0)' }}>
      <TopologyInner packetRef={props?.packetRef} />
    </div>
  )
}

export default TopologyDiagramComponent
