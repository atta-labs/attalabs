'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { FaceStyle } from '@vada/agents-ui'

interface UserPreferencesContextValue {
  faceStyle: FaceStyle
}

const UserPreferencesContext = createContext<UserPreferencesContextValue>({
  faceStyle: 'emblematic'
})

export function useUserPreferences(): UserPreferencesContextValue {
  return useContext(UserPreferencesContext)
}

export function UserPreferencesProvider({ faceStyle, children }: { faceStyle: FaceStyle; children: ReactNode }) {
  return <UserPreferencesContext.Provider value={{ faceStyle }}>{children}</UserPreferencesContext.Provider>
}
