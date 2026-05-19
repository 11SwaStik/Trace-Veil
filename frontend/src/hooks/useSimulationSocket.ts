import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'
import { EVENT_TO_PACKET } from '../types/simulation'
import type { EventType, Severity } from '../types/simulation'

interface SocketOptions {
  simulationId: string
  wsBaseUrl?: string
  onPacket?: (opts: PacketOpts) => void
  onFirstCompromise?: () => void
  onFirstCritical?: () => void
}

export interface PacketOpts {
  fromId: string
  toId: string
  color: string
  ease: 'in' | 'linear'
}

export function useSimulationSocket({
  simulationId,
  wsBaseUrl = 'ws://localhost:8001',
  onPacket,
  onFirstCompromise,
  onFirstCritical,
}: SocketOptions) {
  const { initTopology, setNodeState, addEvent, addAlert } = useSimStore()
  const wsRef = useRef<WebSocket | null>(null)
  const firstCompromiseRef = useRef(false)
  const firstCriticalRef = useRef(false)

  useEffect(() => {
    if (!simulationId) return

    const token = localStorage.getItem('traceveil_access_token')
    if (!token) {
      console.error('No access token available for WebSocket')
      return
    }

    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 2000

    const connect = () => {
      const ws = new WebSocket(`${wsBaseUrl}/ws/${simulationId}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        let msg: any
        try {
          msg = JSON.parse(event.data)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
          return
        }

      switch (msg.type) {
        case 'STATE_SYNC':
          console.log('STATE_SYNC received', msg)
          initTopology(msg.simulation_id, msg.topology.nodes, msg.topology.edges)
          break

        case 'ATTACK_EVENT': {
          console.log('ATTACK_EVENT received', msg)
          addEvent({
            id: msg.event_id,
            simulation_id: msg.simulation_id,
            sequence_number: msg.sequence_number ?? 0,
            event_type: msg.event_type as EventType,
            severity: msg.severity as Severity,
            source_node_id: msg.source_node_id,
            target_node_id: msg.target_node_id,
            ttp_id: msg.ttp_id,
            payload: msg.payload ?? { description: msg.description },
            fired_at: msg.timestamp,
          })

          const packetCfg = EVENT_TO_PACKET[msg.event_type as EventType]
          if (packetCfg && onPacket && msg.source_node_id && msg.target_node_id) {
            const ease = packetCfg.ease === 'power1.in' ? 'in' : 'linear'
            onPacket({
              fromId: msg.source_node_id,
              toId: msg.target_node_id,
              color: packetCfg.color,
              ease,
            })
          }
          break
        }

        case 'NODE_STATE_CHANGE': {
          console.log('NODE_STATE_CHANGE received', msg)
          setNodeState(msg.node_id, msg.new_status)

          if (
            (msg.new_status === 'COMPROMISED' || msg.new_status === 'ELEVATED' || msg.new_status === 'EXFILTRATING') &&
            !firstCompromiseRef.current
          ) {
            firstCompromiseRef.current = true
            onFirstCompromise?.()
          }
          break
        }

        case 'ALERT_FIRED': {
          console.log('ALERT_FIRED received', msg)
          addAlert({
            id: msg.alert_id,
            simulation_id: msg.simulation_id,
            event_id: msg.event_id ?? '',
            rule_id: msg.rule_id ?? msg.rule_name ?? '',
            severity: msg.severity as Severity,
            title: msg.title,
            affected_node_id: msg.affected_node_id,
            created_at: msg.created_at,
            acknowledged: false,
          })

          if (msg.severity === 'CRITICAL' && !firstCriticalRef.current) {
            firstCriticalRef.current = true
            onFirstCritical?.()
          }
          break
        }

        case 'SIMULATION_STATUS': {
          console.log('SIMULATION_STATUS received', msg)
          break
        }

        default:
          console.warn('Unknown WebSocket message type:', msg.type)
      }
    }

      ws.onerror = (e) => {
        console.error('WebSocket error:', e)
      }

      ws.onclose = () => {
        console.log('WebSocket closed, attempting reconnect...')
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          console.log(`Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`)
          setTimeout(connect, reconnectDelay)
        }
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [simulationId, onPacket, onFirstCompromise, onFirstCritical, initTopology, setNodeState, addEvent, addAlert, wsBaseUrl])
}
