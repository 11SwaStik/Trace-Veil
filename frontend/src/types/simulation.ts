export type SimulationStatus = 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED'

export interface SimulationNode {
  id: string
  type: 'WORKSTATION' | 'SERVER' | 'DATABASE' | 'DOMAIN_CONTROLLER' | 'ATTACKER' | 'FIREWALL' | 'MAIL_SERVER' | 'JUMP_SERVER'
  label: string
  ip: string
  status: 'CLEAN' | 'COMPROMISED' | 'ELEVATED' | 'EXFILTRATING'
}

export interface SimulationEdge {
  source: string
  target: string
  protocol: string
}

export interface SimulationTopology {
  nodes: SimulationNode[]
  edges: SimulationEdge[]
}

export interface Simulation {
  id: string
  user_id: string
  scenario_id: string
  status: SimulationStatus
  attack_speed: number
  topology: SimulationTopology | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Scenario {
  id: string
  name: string
  description: string
  kill_chain_phases: string[]
  steps?: ScenarioStep[]
  created_at: string
}

export interface ScenarioStep {
  event_type: string
  source_node_type: string
  target_node_type: string
  ttp_id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  delay_ms: number
  probability: number
  description: string
}

export interface CreateSimulationRequest {
  scenario_id: string
  attack_speed: number
}

export interface CreateSimulationResponse extends Simulation {}
