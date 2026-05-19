import type { SimulationNode, SimulationEdge } from '../types/simulation'

export const mockTopology = {
  nodes: [
    { id: 'attacker', type: 'ATTACKER', label: 'ATTACKER', ip: '1.2.3.4', status: 'COMPROMISED' },
    { id: 'fw', type: 'FIREWALL', label: 'FW-01', ip: '10.0.0.1', status: 'CLEAN' },
    { id: 'ws1', type: 'WORKSTATION', label: 'WS-01', ip: '10.0.1.10', status: 'CLEAN' },
    { id: 'srv1', type: 'SERVER', label: 'SRV-01', ip: '10.0.1.11', status: 'CLEAN' },
    { id: 'db1', type: 'DATABASE', label: 'DB-01', ip: '10.0.1.12', status: 'CLEAN' },
  ] as SimulationNode[],
  edges: [
    { source: 'attacker', target: 'fw', protocol: 'TCP' },
    { source: 'fw', target: 'ws1', protocol: 'HTTPS' },
    { source: 'ws1', target: 'srv1', protocol: 'SMB' },
    { source: 'srv1', target: 'db1', protocol: 'SQL' },
  ] as SimulationEdge[],
}

export const mockNodeStates = {
  attacker: 'COMPROMISED' as const,
  fw: 'CLEAN' as const,
  ws1: 'CLEAN' as const,
  srv1: 'CLEAN' as const,
  db1: 'CLEAN' as const,
}
