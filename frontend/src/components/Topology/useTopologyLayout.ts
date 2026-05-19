import dagre from 'dagre'
import { type Node, type Edge } from '@xyflow/react'
import type { SimulationNode, SimulationEdge } from '../../types/simulation'

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

export function useTopologyLayout(
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  nodeStatus: Record<string, string> = {},
) {
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 })

  // Add nodes with fixed dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 120, height: 120 })
  })

  // Add edges (they must be between existing nodes)
  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target)
    }
  })

  // Compute layout
  dagre.layout(dagreGraph)

  // Convert to React Flow nodes
  const layoutedNodes: Node[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      id: node.id,
      data: {
        ...node,
        status: nodeStatus[node.id] || node.status || 'CLEAN',
      },
      position: {
        x: nodeWithPosition.x - 60,
        y: nodeWithPosition.y - 60,
      },
      type: getNodeType(),
    }
  })

  // Convert to React Flow edges
  const layoutedEdges: Edge[] = edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'animated-edge',
    data: {
      protocol: edge.protocol,
    },
  }))

  return { nodes: layoutedNodes, edges: layoutedEdges }
}

function getNodeType(): string {
  return 'infra-node'
}
