import React from 'react'

export { LoginPage } from './LoginPage'
export { RegisterPage } from './RegisterPage'
export { ProjectsPage } from './ProjectsPage'
export { TestPage } from './TestPage'

export const DashboardPage = () => (
  <div className="max-w-7xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
    <p className="text-slate-500 mt-1">Overview of your QA operations and metrics</p>
    
    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <div className="h-4 w-24 bg-slate-50 rounded mb-4" />
          <div className="h-8 w-16 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  </div>
)

export const ProjectDetailPage = () => (
  <div className="max-w-7xl mx-auto">
    <div className="flex items-center space-x-2 text-sm text-slate-500 mb-4">
      <span>Projects</span>
      <span>/</span>
      <span className="text-slate-900 font-medium">Project Name</span>
    </div>
    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Details</h1>
  </div>
)

export const RunDetailPage = () => (
  <div className="max-w-7xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Run Details</h1>
  </div>
)

export const SettingsPage = () => (
  <div className="max-w-7xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
    <p className="text-slate-500 mt-1">Manage your account and workspace preferences</p>
  </div>
)
