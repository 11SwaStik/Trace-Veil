import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CinematicAnimation, AnimationScene } from '../lib/animations/CinematicAnimation'

/**
 * Hook for managing GSAP animations with React lifecycle
 * Handles cleanup and timeline disposal
 */
export function useGSAPAnimation(
  ref: React.RefObject<HTMLElement>,
  setupAnimation: (element: HTMLElement) => gsap.core.Timeline | void,
  dependencies: any[] = []
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    if (!ref.current) return

    // Setup animation
    const result = setupAnimation(ref.current)
    if (result instanceof gsap.core.Timeline) {
      timelineRef.current = result
    }

    // Cleanup
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
        timelineRef.current = null
      }
    }
  }, dependencies)

  return timelineRef.current
}

/**
 * Hook for managing CinematicAnimation instances
 */
export function useCinematicAnimation(ref: React.RefObject<HTMLElement>) {
  const animationRef = useRef<CinematicAnimation | null>(null)

  useEffect(() => {
    if (!ref.current) return

    animationRef.current = new CinematicAnimation(ref.current)

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
        animationRef.current = null
      }
    }
  }, [ref])

  return animationRef.current
}

/**
 * Hook for managing AnimationScene instances
 */
export function useAnimationScene(name: string, duration: number) {
  const sceneRef = useRef<AnimationScene | null>(null)

  useEffect(() => {
    sceneRef.current = new AnimationScene(name, duration)

    return () => {
      if (sceneRef.current) {
        sceneRef.current.kill()
        sceneRef.current = null
      }
    }
  }, [name, duration])

  return sceneRef.current
}

/**
 * Hook for controlling animation playback
 */
export function useAnimationControls(timelineRef: React.RefObject<gsap.core.Timeline>) {
  return {
    play: () => timelineRef.current?.play(),
    pause: () => timelineRef.current?.pause(),
    resume: () => timelineRef.current?.play(),
    reverse: () => timelineRef.current?.reverse(),
    stop: () => timelineRef.current?.stop(),
    seek: (time: number) => timelineRef.current?.seek(time),
    timeScale: (scale: number) => {
      if (timelineRef.current) {
        timelineRef.current.timeScale(scale)
      }
    },
    progress: () => timelineRef.current?.progress() ?? 0,
  }
}

/**
 * Hook for managing animation state
 */
export function useAnimationState(initialState: 'idle' | 'playing' | 'paused' = 'idle') {
  const [state, setState_] = useState(initialState)
  return [state, setState_] as const
}
