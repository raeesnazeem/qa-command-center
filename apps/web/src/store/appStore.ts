import { create } from 'zustand'

export type Role = 'developer' | 'qa_engineer' | 'project_manager' | 'sub_admin' | 'admin' | 'super_admin';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  org_id: string;
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
  setCurrentProject: (project) => set({ currentProject: project }),
}))
