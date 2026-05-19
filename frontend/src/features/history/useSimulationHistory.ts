import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { Simulation } from '../../types/simulation'

export function useSimulationHistory() {
  return useQuery<Simulation[]>({
    queryKey: ['simulations'],
    queryFn: async () => {
      const response = await apiClient.get('/api/simulations')
      return response.data
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 30000, // Data is stale after 30 seconds
  })
}
