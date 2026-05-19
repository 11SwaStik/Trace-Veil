import { create } from 'zustand'
import type { SimNode, SimEdge, SimEvent, SimAlert } from '../types/simulation'
import { STATUS_TO_STATE } from '../types/simulation'

interface AnimatingEdge {
  sourceId: string
  targetId: string
  severity: string
  startTime: number
}

interface SimulationStoreState {
  simulationId: string | null
  nodes: Record<string, SimNode>
  edges: Record<string, SimEdge>
  events: SimEvent[]
  alerts: SimAlert[]
  integrity: number
  currentChapter: string
  firstCompromiseFired: boolean
  firstCriticalFired: boolean
  topology: any
  nodeStates: Record<string, string>
  animatingEdges: Record<string, AnimatingEdge>
  currentAttackSpeed: number
  status: string
}

interface SimulationStoreActions {
  initTopology: (simId: string, rawNodes: any[], rawEdges: any[]) => void
  syncTopology: (topology: any) => void
  setNodeState: (nodeId: string, newStatus: string) => void
  updateNodeState: (nodeId: string, newStatus: string) => void
  updateStatus: (status: string) => void
  addEvent: (event: SimEvent) => void
  addAlert: (alert: SimAlert) => void
  setChapter: (chapter: string) => void
  startEdgeAnimation: (sourceId: string, targetId: string, severity: string) => void
  clearAnimatingEdge: (edgeId: string) => void
  reset: () => void
}

const initialState: SimulationStoreState = {
  simulationId: null,
  nodes: {},
  edges: {},
  events: [],
  alerts: [],
  integrity: 100,
  currentChapter: 'Idle',
  firstCompromiseFired: false,
  firstCriticalFired: false,
  topology: null,
  nodeStates: {},
  animatingEdges: {},
  currentAttackSpeed: 1.0,
  status: 'INITIALIZING',
}

export const useSimulationStore = create<SimulationStoreState & SimulationStoreActions>((set) => ({
  ...initialState,

  initTopology: (simId: string, rawNodes: any[], rawEdges: any[]) => {
    set(() => {
      const nodes: Record<string, SimNode> = {}
      const edges: Record<string, SimEdge> = {}

      rawNodes.forEach((node: any) => {
        nodes[node.id] = {
          id: node.id,
          type: node.type,
          label: node.label,
          ip: node.ip,
          status: node.status,
          state: STATUS_TO_STATE[node.status] || 'healthy',
          zone: getNodeZone(node.type),
          eventCount: 0,
        }
      })

      rawEdges.forEach((edge: any, idx: number) => {
        const edgeId = `${edge.source}-${edge.target}-${idx}`
        edges[edgeId] = {
          id: edgeId,
          source: edge.source,
          target: edge.target,
          protocol: edge.protocol,
          edgeState: 'rest',
        }
      })

      return { simulationId: simId, nodes, edges }
    })
  },

  syncTopology: (topology: any) => {
    set(() => {
      const nodeStates: Record<string, string> = {}
      if (topology?.nodes) {
        topology.nodes.forEach((node: any) => {
          nodeStates[node.id] = node.status || 'CLEAN'
        })
      }
      return { topology, nodeStates }
    })
  },

  setNodeState: (nodeId: string, newStatus: string) => {
    set((state) => {
      const node = state.nodes[nodeId]
      if (!node) return state

      const newState = STATUS_TO_STATE[newStatus] || node.state
      const wasHealthy = node.state === 'healthy'
      const isNowCompromised = newStatus === 'COMPROMISED' || newStatus === 'ELEVATED'

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...node, status: newStatus, state: newState },
        },
        nodeStates: { ...state.nodeStates, [nodeId]: newStatus },
        integrity: isNowCompromised && wasHealthy ? Math.max(0, state.integrity - 12) : state.integrity,
        firstCompromiseFired: isNowCompromised ? true : state.firstCompromiseFired,
      }
    })
  },

  updateNodeState: (nodeId: string, newStatus: string) => {
    set((state) => ({
      nodeStates: { ...state.nodeStates, [nodeId]: newStatus },
    }))
  },

  addEvent: (event: SimEvent) => {
    set((state) => ({
      events: [event, ...state.events],
    }))
  },

  addAlert: (alert: SimAlert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      firstCriticalFired: alert.severity === 'CRITICAL' ? true : state.firstCriticalFired,
    }))
  },

  updateStatus: (status: string) => {
    set({ status })
  },

  setChapter: (chapter: string) => {
    set({ currentChapter: chapter })
  },

  startEdgeAnimation: (sourceId: string, targetId: string, severity: string) => {
    const edgeId = `${sourceId}-${targetId}`
    set((state) => ({
      animatingEdges: {
        ...state.animatingEdges,
        [edgeId]: {
          sourceId,
          targetId,
          severity,
          startTime: Date.now(),
        },
      },
    }))
  },

  clearAnimatingEdge: (edgeId: string) => {
    set((state) => {
      const { [edgeId]: _, ...rest } = state.animatingEdges
      return { animatingEdges: rest }
    })
  },

  reset: () => {
    set(initialState)
  },
}))

function getNodeZone(nodeType: string): 'perimeter' | 'app' | 'data' {
  const zoneMap: Record<string, 'perimeter' | 'app' | 'data'> = {
    ATTACKER: 'perimeter',
    FIREWALL: 'perimeter',
    WORKSTATION: 'app',
    MAIL_SERVER: 'app',
    JUMP_SERVER: 'app',
    SERVER: 'app',
    DOMAIN_CONTROLLER: 'data',
    DATABASE: 'data',
  }
  return zoneMap[nodeType] || 'app'
}

export const useSimStore = useSimulationStore
