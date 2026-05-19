/* ============================================================
   OPERATOR DESIGN SYSTEM TYPES
   ============================================================ */

export type NodeState =
  | 'healthy'
  | 'scanned'
  | 'targeted'
  | 'compromising'
  | 'compromised'
  | 'exfiltrating'
  | 'c2_beaconing'
  | 'isolated'

export type EdgeState = 'rest' | 'attacked' | 'c2' | 'exfil' | 'dim'

export type EventType =
  | 'RECON'
  | 'INITIAL_ACCESS'
  | 'EXECUTION'
  | 'LATERAL_MOVEMENT'
  | 'PERSISTENCE'
  | 'PRIVILEGE_ESCALATION'
  | 'CREDENTIAL_ACCESS'
  | 'COLLECTION'
  | 'EXFILTRATION'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const STATE_RING: Record<NodeState, { stroke: string; width: number; dash: number }> = {
  healthy: { stroke: '#3DDBD9', width: 1.5, dash: 0 },
  scanned: { stroke: '#3DDBD9', width: 1.5, dash: 4 },
  targeted: { stroke: '#E0A663', width: 2, dash: 0 },
  compromising: { stroke: '#E0A663', width: 2.5, dash: 0 },
  compromised: { stroke: '#E5484D', width: 2, dash: 0 },
  exfiltrating: { stroke: '#B57BD3', width: 2, dash: 0 },
  c2_beaconing: { stroke: '#B57BD3', width: 1.5, dash: 4 },
  isolated: { stroke: '#989CA4', width: 1.5, dash: 2 },
}

export const STATE_FILL: Record<NodeState, string> = {
  healthy: '#0A1F1D',
  scanned: '#0A1F1D',
  targeted: '#1A1410',
  compromising: 'rgba(224, 166, 99, 0.25)',
  compromised: 'rgba(229, 72, 77, 0.25)',
  exfiltrating: 'rgba(181, 123, 211, 0.25)',
  c2_beaconing: 'rgba(181, 123, 211, 0.15)',
  isolated: 'rgba(152, 156, 164, 0.15)',
}

export const STATUS_TO_STATE: Record<string, NodeState> = {
  CLEAN: 'healthy',
  COMPROMISED: 'compromised',
  ELEVATED: 'compromised',
  EXFILTRATING: 'exfiltrating',
}

export const EVENT_TO_PACKET: Record<EventType, { color: string; ease: string }> = {
  RECON: { color: '#6EA8FE', ease: 'power1.inOut' },
  INITIAL_ACCESS: { color: '#3DDBD9', ease: 'power1.inOut' },
  EXECUTION: { color: '#3DDBD9', ease: 'power1.inOut' },
  LATERAL_MOVEMENT: { color: '#3DDBD9', ease: 'power1.inOut' },
  PERSISTENCE: { color: '#E0A663', ease: 'power1.inOut' },
  PRIVILEGE_ESCALATION: { color: '#E0A663', ease: 'power1.inOut' },
  CREDENTIAL_ACCESS: { color: '#E5484D', ease: 'power1.inOut' },
  COLLECTION: { color: '#B57BD3', ease: 'power1.inOut' },
  EXFILTRATION: { color: '#B57BD3', ease: 'power1.inOut' },
}

export const NODE_ZONE: Record<string, 'perimeter' | 'app' | 'data'> = {
  ATTACKER: 'perimeter',
  FIREWALL: 'perimeter',
  WORKSTATION: 'app',
  MAIL_SERVER: 'app',
  JUMP_SERVER: 'app',
  SERVER: 'app',
  DOMAIN_CONTROLLER: 'data',
  DATABASE: 'data',
}

export interface SimNode {
  id: string
  type: string
  label: string
  ip: string
  status: string
  state: NodeState
  zone: 'perimeter' | 'app' | 'data'
  eventCount: number
  lastTtp?: string
  lastSeen?: string
}

export interface SimEdge {
  id: string
  source: string
  target: string
  protocol: string
  edgeState: EdgeState
}

export type SimEvent = SimulationEvent & {
  event_id?: string
  description?: string
  timestamp?: string
}

export type SimAlert = Alert & {
  alert_id?: string
  rule_name?: string
}

/* ============================================================
   BACKEND API TYPES
   ============================================================ */

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

export interface SimulationEvent {
  id: string
  simulation_id: string
  sequence_number: number
  event_type: 'RECON' | 'INITIAL_ACCESS' | 'EXECUTION' | 'LATERAL_MOVEMENT' | 'PERSISTENCE' | 'PRIVILEGE_ESCALATION' | 'CREDENTIAL_ACCESS' | 'COLLECTION' | 'EXFILTRATION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  source_node_id: string
  target_node_id: string
  ttp_id: string
  payload?: Record<string, unknown>
  fired_at: string
}

export interface Alert {
  id: string
  simulation_id: string
  event_id: string
  rule_id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  affected_node_id: string
  created_at: string
  acknowledged: boolean
}

export interface Replay {
  id: string
  simulation_id: string
  name: string
  total_events: number
  duration_ms: number
  created_at: string
}
