import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { AttackerNode } from './nodes/AttackerNode'
import { WorkstationNode } from './nodes/WorkstationNode'
import { ServerNode } from './nodes/ServerNode'
import { DatabaseNode } from './nodes/DatabaseNode'
import { FirewallNode } from './nodes/FirewallNode'
import { AnimatedEdge } from './edges/AnimatedEdge'
import { useTopologyLayout } from './useTopologyLayout'

import type { SimulationTopology } from '../../types/simulation'

interface TopologyDiagramProps {
  topology: SimulationTopology
  nodeStates?: Record<string, string>
  animatingEdges?: Record<string, { sourceId: string; targetId: string; severity: string }>
}

const nodeTypes: NodeTypes = {
  'attacker-node': AttackerNode,
  'workstation-node': WorkstationNode,
  'server-node': ServerNode,
  'database-node': DatabaseNode,
  'firewall-node': FirewallNode,
}

const edgeTypes: EdgeTypes = {
  'animated-edge': AnimatedEdge,
}

export function TopologyDiagram({
  topology,
  nodeStates = {},
  animatingEdges = {},
}: TopologyDiagramProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = useTopologyLayout(
    topology.nodes,
    topology.edges,
    nodeStates,
  )

  const edgesWithAnimation = useMemo<Edge[]>(() => {
    return layoutedEdges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isAnimating: !!animatingEdges[edge.id],
        severity: animatingEdges[edge.id]?.severity || 'HIGH',
      },
    }))
  }, [layoutedEdges, animatingEdges])

  return (
    <div className="w-full h-full bg-[#0a0a0f] rounded-lg border border-[#262630] overflow-hidden">
      <ReactFlow
        nodes={layoutedNodes}
        edges={edgesWithAnimation}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#262630" gap={16} size={1} />
        <Controls
          style={{
            backgroundColor: '#131318',
            borderColor: '#262630',
          }}
        />
        <MiniMap
          style={{
            backgroundColor: '#131318',
            borderColor: '#262630',
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  )
}
