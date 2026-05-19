import { useMutation, useQuery } from '@tanstack/react-query'
import { replayClient } from '../api/client'

export interface PlaybackState {
  status: 'PLAYING' | 'PAUSED' | 'STOPPED'
  sequence: number
  speed: number
  total_events: number
}

export function useReplayPlayback(replayId: string, isPlaying: boolean) {
  const playMutation = useMutation({
    mutationFn: async () => {
      await replayClient.post(`/api/replays/${replayId}/play`)
    },
    onError: (error) => {
      console.error('[ReplayPlayback] Play failed:', error)
    },
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      await replayClient.post(`/api/replays/${replayId}/pause`)
    },
    onError: (error) => {
      console.error('[ReplayPlayback] Pause failed:', error)
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      await replayClient.post(`/api/replays/${replayId}/stop`)
    },
    onError: (error) => {
      console.error('[ReplayPlayback] Stop failed:', error)
    },
  })

  const seekMutation = useMutation({
    mutationFn: async (position: number) => {
      const clampedPosition = Math.max(0, Math.min(1, position))
      await replayClient.post(`/api/replays/${replayId}/seek?position=${clampedPosition}`)
    },
    onError: (error) => {
      console.error('[ReplayPlayback] Seek failed:', error)
    },
  })

  const speedMutation = useMutation({
    mutationFn: async (multiplier: number) => {
      const clampedMultiplier = Math.max(0.1, Math.min(16, multiplier))
      await replayClient.post(`/api/replays/${replayId}/speed?multiplier=${clampedMultiplier}`)
    },
    onError: (error) => {
      console.error('[ReplayPlayback] Speed change failed:', error)
    },
  })

  const { data: playbackState, isLoading: isLoadingState } = useQuery<PlaybackState>({
    queryKey: ['replay-playback', replayId],
    queryFn: async () => {
      const response = await replayClient.get(`/api/replays/${replayId}/state`)
      return response.data
    },
    refetchInterval: isPlaying ? 500 : undefined, // Poll every 500ms while playing
    staleTime: 0,
  })

  return {
    play: () => playMutation.mutate(),
    pause: () => pauseMutation.mutate(),
    stop: () => stopMutation.mutate(),
    seek: (position: number) => seekMutation.mutate(position),
    setSpeed: (multiplier: number) => speedMutation.mutate(multiplier),
    playbackState,
    isLoadingState,
    isPlaying: playbackState?.status === 'PLAYING',
    isPaused: playbackState?.status === 'PAUSED',
    isStopped: playbackState?.status === 'STOPPED',
  }
}
