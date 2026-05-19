import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import type { Simulation, Scenario, CreateSimulationRequest } from '../../types/simulation'

export function useGetSimulations() {
  return useQuery({
    queryKey: ['simulations'],
    queryFn: async () => {
      const response = await apiClient.get<Simulation[]>('/api/simulations')
      return response.data
    },
  })
}

export function useGetScenarios() {
  return useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await apiClient.get<Scenario[]>('/api/scenarios')
      return response.data
    },
  })
}

export function useCreateSimulation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSimulationRequest) => {
      const response = await apiClient.post<Simulation>('/api/simulations', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
    },
  })
}

export function useStartSimulation() {
  return useMutation({
    mutationFn: async (simulationId: string) => {
      const response = await apiClient.post<Simulation>(`/api/simulations/${simulationId}/start`)
      return response.data
    },
  })
}
