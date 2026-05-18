import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * Hook to initialize auth state from localStorage on app load.
 * Call this once in your root App component.
 */
export function useAuthInit() {
  useEffect(() => {
    useAuthStore.getState().hydrate()
  }, [])
}
