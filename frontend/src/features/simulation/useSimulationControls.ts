import { useMutation } from '@tanstack/react-query'
import { useSimulationStore } from '../../store/simulationStore'
import { apiClient } from '../../api/client'

export function useSimulationControls(simulationId: string) {
  const updateStatus = useSimulationStore((s) => s.updateStatus)

  const pauseMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/simulations/${simulationId}/pause`)
    },
    onSuccess: () => {
      updateStatus('PAUSED')
      console.log('[SimulationControls] Simulation paused')
    },
    onError: (error) => {
      console.error('[SimulationControls] Pause failed:', error)
    },
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/simulations/${simulationId}/resume`)
    },
    onSuccess: () => {
      updateStatus('RUNNING')
      console.log('[SimulationControls] Simulation resumed')
    },
    onError: (error) => {
      console.error('[SimulationControls] Resume failed:', error)
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/simulations/${simulationId}/stop`)
    },
    onSuccess: () => {
      updateStatus('STOPPED')
      console.log('[SimulationControls] Simulation stopped')
    },
    onError: (error) => {
      console.error('[SimulationControls] Stop failed:', error)
    },
  })

  return {
    pause: () => pauseMutation.mutate(),
    resume: () => resumeMutation.mutate(),
    stop: () => stopMutation.mutate(),
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isStopping: stopMutation.isPending,
    pauseError: pauseMutation.error,
    resumeError: resumeMutation.error,
    stopError: stopMutation.error,
  }
}
