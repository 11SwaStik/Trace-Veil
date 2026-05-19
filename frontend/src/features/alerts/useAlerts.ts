import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { Alert } from '../../types/simulation'

export interface AlertsResponse {
  alerts: Alert[]
  total: number
}

export function useAlerts(simulationId?: string, acknowledgedFilter?: boolean, limit = 20, offset = 0) {
  const params = new URLSearchParams()
  if (simulationId) params.append('simulation_id', simulationId)
  if (acknowledgedFilter !== undefined) params.append('acknowledged', String(acknowledgedFilter))
  params.append('limit', String(limit))
  params.append('offset', String(offset))

  return useQuery<Alert[]>({
    queryKey: ['alerts', simulationId, acknowledgedFilter, limit, offset],
    queryFn: async () => {
      const response = await apiClient.get(`/api/alerts?${params.toString()}`)
      return response.data
    },
    staleTime: 10000, // Data is stale after 10 seconds
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}
