import { useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
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

const nodeTypes: NodeTypes = {
  infraNode: InfraNode,
}

const edgeTypes: EdgeTypes = {
  attackEdge: AnimatedEdge,
}

function TopologyInner() {
  const { nodes: storeNodes, edges: storeEdges } = useSimulationStore()

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
      style={{ background: 'var(--bg-0)' }}
    >
      <Background color="var(--line-1)" gap={28} size={1} />
    </ReactFlow>
  )
}

interface TopologyDiagramProps {
  topology?: any
  nodeStates?: Record<string, string>
  animatingEdges?: Record<string, { sourceId: string; targetId: string; severity: string }>
}

export function TopologyDiagram(_props?: TopologyDiagramProps) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%', background: 'var(--bg-0)' }}>
        <TopologyInner />
      </div>
    </ReactFlowProvider>
  )
}
