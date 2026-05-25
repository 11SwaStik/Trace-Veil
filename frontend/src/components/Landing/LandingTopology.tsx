import { useMemo, useEffect, useRef } from 'react'
import { ReactFlow, Background, type Node, type Edge, type NodeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import gsap from 'gsap'

interface LandingTopologyProps {
  scrollProgress: number // 0 to 1 based on section visibility
}

function LandingTopologyNode({ data }: { data: { label: string; type: string } }) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<SVGCircleElement>(null)

  return (
    <div
      ref={nodeRef}
      style={{
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <svg width="60" height="60" viewBox="0 0 60 60" style={{ overflow: 'visible' }}>
        <defs>
          <filter id={`topology-glow-${data.label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="30"
          cy="30"
          r="20"
          fill="rgba(0, 229, 204, 0.15)"
          stroke="#00e5cc"
          strokeWidth="1.5"
          filter={`url(#topology-glow-${data.label})`}
          ref={glowRef}
        />

        <circle cx="30" cy="30" r="16" fill="#060810" />

        <circle cx="30" cy="30" r="12" fill="rgba(0, 229, 204, 0.3)" />
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: '-24px',
          fontSize: '11px',
          color: '#00e5cc',
          whiteSpace: 'nowrap',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

function LandingTopologyInner({ scrollProgress }: { scrollProgress: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const particleContainerRef = useRef<SVGSVGElement>(null)
  const particlesRef = useRef<SVGCircleElement[]>([])

  // Define network topology
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const nodeList: Node[] = [
      { id: 'fw-1', data: { label: 'FW-01', type: 'FIREWALL' }, position: { x: 0, y: 0 } },
      { id: 'web-1', data: { label: 'WEB-01', type: 'WORKSTATION' }, position: { x: 0, y: 0 } },
      { id: 'web-2', data: { label: 'WEB-02', type: 'WORKSTATION' }, position: { x: 0, y: 0 } },
      { id: 'app-1', data: { label: 'APP-01', type: 'SERVER' }, position: { x: 0, y: 0 } },
      { id: 'app-2', data: { label: 'APP-02', type: 'SERVER' }, position: { x: 0, y: 0 } },
      { id: 'db-1', data: { label: 'DB-01', type: 'DATABASE' }, position: { x: 0, y: 0 } },
      { id: 'dc-1', data: { label: 'DC-01', type: 'DOMAIN_CONTROLLER' }, position: { x: 0, y: 0 } },
      { id: 'cache-1', data: { label: 'CACHE-01', type: 'SERVER' }, position: { x: 0, y: 0 } },
      { id: 'jump-1', data: { label: 'JUMP-01', type: 'JUMP_SERVER' }, position: { x: 0, y: 0 } },
      { id: 'mail-1', data: { label: 'MAIL-01', type: 'MAIL_SERVER' }, position: { x: 0, y: 0 } },
      { id: 'egress-1', data: { label: 'EGRESS', type: 'FIREWALL' }, position: { x: 0, y: 0 } },
      { id: 'monitor-1', data: { label: 'MON-01', type: 'SERVER' }, position: { x: 0, y: 0 } },
    ]

    const edgeList: Edge[] = [
      { id: 'fw-web1', source: 'fw-1', target: 'web-1' },
      { id: 'fw-web2', source: 'fw-1', target: 'web-2' },
      { id: 'web1-app1', source: 'web-1', target: 'app-1' },
      { id: 'web2-app2', source: 'web-2', target: 'app-2' },
      { id: 'app1-db', source: 'app-1', target: 'db-1' },
      { id: 'app2-db', source: 'app-2', target: 'db-1' },
      { id: 'app1-cache', source: 'app-1', target: 'cache-1' },
      { id: 'dc-app1', source: 'dc-1', target: 'app-1' },
      { id: 'dc-web1', source: 'dc-1', target: 'web-1' },
      { id: 'jump-app1', source: 'jump-1', target: 'app-1' },
      { id: 'mail-fw', source: 'mail-1', target: 'fw-1' },
      { id: 'db-egress', source: 'db-1', target: 'egress-1' },
      { id: 'mon-fw', source: 'monitor-1', target: 'fw-1' },
    ]

    // Layout with dagre
    const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 })

    nodeList.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 60, height: 60 })
    })

    edgeList.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    const layoutedNodeList = nodeList.map((node) => {
      const dagreNode = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: dagreNode.x - 30,
          y: dagreNode.y - 30,
        },
      }
    })

    return { nodes: layoutedNodeList, edges: edgeList }
  }, [])

  const nodeTypes: NodeTypes = useMemo(() => ({ landingNode: LandingTopologyNode }), [])

  // Apply scroll-based animations
  useEffect(() => {
    if (!containerRef.current) return

    // Nodes fade in and glow increases with scroll
    layoutedNodes.forEach((node) => {
      const el = containerRef.current?.querySelector(`[data-id="${node.id}"]`) as HTMLElement
      if (!el) return

      gsap.to(el, {
        opacity: 0.3 + scrollProgress * 0.7,
        duration: 0.5,
      })

      // Glow brightness
      const glowEl = el.querySelector('circle[filter]') as SVGCircleElement
      if (glowEl) {
        gsap.to(glowEl, {
          opacity: 0.4 + scrollProgress * 0.6,
          r: 20 + scrollProgress * 4,
          duration: 0.5,
        })
      }
    })

    // Particle acceleration
    const particleOpacity = 0.2 + scrollProgress * 0.5

    if (particlesRef.current.length > 0) {
      particlesRef.current.forEach((particle) => {
        gsap.to(particle, {
          opacity: particleOpacity,
          duration: 0.5,
        })
      })
    }
  }, [scrollProgress, layoutedNodes, layoutedEdges])

  // Spawn particles on edges
  useEffect(() => {
    if (!particleContainerRef.current || scrollProgress < 0.1) return

    const svg = particleContainerRef.current
    const existingCount = svg.querySelectorAll('circle').length

    if (existingCount < layoutedEdges.length * 2) {
      layoutedEdges.forEach(() => {
        if (Math.random() < 0.6) {
          const sourceNode = layoutedNodes.find((n) => n.id === layoutedEdges[0].source)
          const targetNode = layoutedNodes.find((n) => n.id === layoutedEdges[0].target)
          if (!sourceNode || !targetNode) return

          const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          particle.setAttribute('r', '1.5')
          particle.setAttribute('fill', '#00e5cc')
          particle.setAttribute('opacity', '0.3')

          svg.appendChild(particle)
          particlesRef.current.push(particle)

          // Animate particle along edge
          const duration = 2 + Math.random() * 2
          gsap.to(particle, {
            attr: {
              cx: targetNode.position.x + 30,
              cy: targetNode.position.y + 30,
            },
            duration,
            repeat: -1,
            ease: 'none',
            onStart: () => {
              gsap.set(particle, {
                attr: {
                  cx: sourceNode.position.x + 30,
                  cy: sourceNode.position.y + 30,
                },
              })
            },
          })
        }
      })
    }
  }, [scrollProgress, layoutedEdges, layoutedNodes])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#060810',
      }}
    >
      <ReactFlow
        nodes={layoutedNodes.map((n) => ({ ...n, type: 'landingNode' }))}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: 'transparent' }}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
      >
        <Background color="rgba(0, 229, 204, 0.05)" gap={40} size={1} />

        {/* Particle effect overlay */}
        <svg
          ref={particleContainerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      </ReactFlow>
    </div>
  )
}

export function LandingTopology({ scrollProgress }: LandingTopologyProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <LandingTopologyInner scrollProgress={scrollProgress} />
    </div>
  )
}
