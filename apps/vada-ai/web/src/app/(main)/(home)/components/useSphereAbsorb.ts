'use client'

import { useCallback, useRef } from 'react'

const ABSORB_DURATION_MS = 1100 // matches sphere-absorb keyframe duration

export function useSphereAbsorb() {
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map())

  const registerSphere = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(id, el)
    else elementsRef.current.delete(id)
  }, [])

  const onSphereAbsorb = useCallback((sphereId: string) => {
    const el = elementsRef.current.get(sphereId)
    if (!el) return
    el.classList.add('sphere-absorbing')
    setTimeout(() => el.classList.remove('sphere-absorbing'), ABSORB_DURATION_MS)
  }, [])

  return { registerSphere, onSphereAbsorb }
}
