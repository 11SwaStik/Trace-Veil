import { useQuery } from '@tanstack/react-query'
import { replayClient } from '../../api/client'
import type { Replay } from '../../types/simulation'

export function useReplays() {
  return useQuery<Replay[]>({
    queryKey: ['replays'],
    queryFn: async () => {
      const response = await replayClient.get('/api/replays')
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Data is stale after 10 seconds
  })
}
