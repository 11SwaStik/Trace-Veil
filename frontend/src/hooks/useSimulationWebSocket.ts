import { useEffect, useRef, useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import type { SimulationTopology, SimulationEvent, Alert } from '../types/simulation'

interface WebSocketMessage {
  type: 'STATE_SYNC' | 'ATTACK_EVENT' | 'NODE_STATE_CHANGE' | 'ALERT_FIRED' | 'SIMULATION_STATUS'
  simulation_id?: string
  topology?: SimulationTopology
  event_id?: string
  event_type?: string
  severity?: string
  source_node_id?: string
  target_node_id?: string
  ttp_id?: string
  description?: string
  timestamp?: string
  node_id?: string
  old_status?: string
  new_status?: string
  alert_id?: string
  rule_name?: string
  title?: string
  affected_node_id?: string
  created_at?: string
  status?: string
  payload?: Record<string, unknown>
}

interface UseSimulationWebSocketReturn {
  connected: boolean
  error: Error | null
  reconnectAttempts: number
}

const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 10000 // 10 seconds

export function useSimulationWebSocket(
  simulationId: string,
  accessToken: string,
  enabled = true
): UseSimulationWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY)
  const reconnectAttemptsRef = useRef(0)

  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const store = useSimulationStore()

  const connect = () => {
    if (!enabled || !simulationId || !accessToken) {
      return
    }

    try {
      const wsUrl = `ws://localhost:8001/ws/${simulationId}?token=${accessToken}`
      console.log('[WebSocket] Connecting to', wsUrl)

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err, event.data)
        }
      }

      ws.onerror = (event) => {
        const wsError = new Error('WebSocket connection error')
        console.error('[WebSocket] Error:', wsError, event)
        setError(wsError)
        setConnected(false)
      }

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        setConnected(false)
        wsRef.current = null
        attemptReconnect()
      }

      wsRef.current = ws
    } catch (err) {
      const connectError = new Error(`Failed to create WebSocket: ${err}`)
      console.error('[WebSocket] Connection failed:', connectError)
      setError(connectError)
      setConnected(false)
      attemptReconnect()
    }
  }

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      const maxAttemptsError = new Error(
        `WebSocket failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`
      )
      console.error('[WebSocket] Max reconnect attempts reached:', maxAttemptsError)
      setError(maxAttemptsError)
      return
    }

    reconnectAttemptsRef.current += 1
    setReconnectAttempts(reconnectAttemptsRef.current)

    const delay = Math.min(
      reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current - 1),
      MAX_RECONNECT_DELAY
    )

    console.log(
      `[WebSocket] Attempting reconnect ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  }

  const handleMessage = (message: WebSocketMessage) => {
    console.log('[WebSocket] Message received:', message.type)

    switch (message.type) {
      case 'STATE_SYNC':
        if (message.topology) {
          console.log('[WebSocket] Syncing topology with', message.topology.nodes.length, 'nodes')
          store.syncTopology(message.topology)
        }
        break

      case 'ATTACK_EVENT':
        if (
          message.event_id &&
          message.event_type &&
          message.severity &&
          message.source_node_id &&
          message.target_node_id
        ) {
          const event: SimulationEvent = {
            id: message.event_id,
            simulation_id: message.simulation_id || '',
            sequence_number: 0,
            event_type: message.event_type as any,
            severity: message.severity as any,
            source_node_id: message.source_node_id,
            target_node_id: message.target_node_id,
            ttp_id: message.ttp_id || '',
            payload: message.payload,
            fired_at: message.timestamp || new Date().toISOString(),
          }
          console.log('[WebSocket] Adding event:', event)
          store.addEvent(event)

          store.startEdgeAnimation(message.source_node_id, message.target_node_id, message.severity)

          setTimeout(() => {
            store.clearAnimatingEdge(`${message.source_node_id}-${message.target_node_id}`)
          }, 2000)
        }
        break

      case 'NODE_STATE_CHANGE':
        if (message.node_id && message.new_status) {
          console.log('[WebSocket] Node state change:', message.node_id, '->', message.new_status)
          store.updateNodeState(message.node_id, message.new_status)
        }
        break

      case 'ALERT_FIRED':
        if (message.alert_id && message.title) {
          const alert: Alert = {
            id: message.alert_id,
            simulation_id: message.simulation_id || '',
            event_id: '',
            rule_id: '',
            severity: (message.severity as any) || 'HIGH',
            title: message.title,
            affected_node_id: message.affected_node_id || '',
            created_at: message.created_at || new Date().toISOString(),
            acknowledged: false,
          }
          console.log('[WebSocket] Adding alert:', alert)
          store.addAlert(alert)
        }
        break

      case 'SIMULATION_STATUS':
        if (message.status) {
          console.log('[WebSocket] Status update:', message.status)
          store.updateStatus(message.status)
        }
        break

      default:
        console.warn('[WebSocket] Unknown message type:', message.type)
    }
  }

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        console.log('[WebSocket] Closing connection on unmount')
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [simulationId, accessToken, enabled])

  return { connected, error, reconnectAttempts }
}
