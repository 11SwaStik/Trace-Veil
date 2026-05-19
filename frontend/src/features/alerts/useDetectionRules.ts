import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

export interface DetectionRule {
  id: string
  name: string
  event_type_filter: string
  severity_min: string
  alert_title: string
  alert_severity: string
  enabled: boolean
}

export function useDetectionRules() {
  return useQuery<DetectionRule[]>({
    queryKey: ['detection-rules'],
    queryFn: async () => {
      const response = await apiClient.get('/api/alerts/detection-rules')
      return response.data
    },
    staleTime: Infinity, // Static data
  })
}
