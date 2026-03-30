import { create } from 'zustand'

interface User {
  id: string
  email: string
  name?: string
}

interface Project {
  id: string
  name: string
  description?: string
}

interface AppState {
  user: User | null
  currentProject: Project | null
  setUser: (user: User | null) => void
  setCurrentProject: (project: Project | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentProject: null,
  setUser: (user) => set({ user }),
  setCurrentProject: (project) => set({ currentProject }),
}))
