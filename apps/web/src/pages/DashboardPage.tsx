import { useUser, useAuth } from "@clerk/react"
import {
  AlertCircle,
  PlayCircle,
  CheckSquare,
  Layers,
  ChevronRight,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Search,
  ExternalLink,
  Zap,
  Settings2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useDashboardStats } from "../hooks/useDashboard"
import { useRole } from "../hooks/useRole"
import { format } from "date-fns"
import { useState, useMemo } from "react"
import { EditProjectModal } from "../components/EditProjectModal"
import { Project } from "../api/projects.api"
import { Skeleton } from "../components/Skeleton"

export const DashboardPage = () => {
  const { user } = useUser()
  const { data, isLoading, error } = useDashboardStats()
  const { role } = useRole()
  const [projectSearch, setProjectSearch] = useState("")
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const isQA = role === "qa_engineer"
  const isDeveloper = role === "developer"

  const filteredProjects = useMemo(() => {
    if (!data?.all_projects) return []
    if (!projectSearch) return data.all_projects
    return data.all_projects.filter(
      (p) =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(projectSearch.toLowerCase()),
    )
  }, [data?.all_projects, projectSearch])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-12 px-4">
        <header className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </div>

        <section className="space-y-6">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-3xl" />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <Skeleton className="h-4 w-32" />
          <div className="bg-white border border-slate-100 rounded-3xl h-64 overflow-hidden relative">
             <Skeleton className="absolute inset-0" />
          </div>
        </section>
      </div>
    )
  }

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // ---------------------------------------------------------------------------
  // DEVELOPER VIEW
  // ---------------------------------------------------------------------------
  if (isDeveloper) {
    return (
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 px-4">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {getTimeGreeting()}, {user?.firstName || "Developer"}
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              You have{" "}
              <span className="text-indigo-600 font-bold">
                {data?.my_open_tasks ?? 0}
              </span>{" "}
              tasks assigned to you across projects.
            </p>
          </div>
          <Link
            to="/tasks"
            className="btn-unified-primary flex items-center gap-2 group"
          >
            <CheckSquare
              size={18}
              className="group-hover:scale-110 transition-transform"
            />
            View All Tasks
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-10">
            {/* 1. Pre-release Projects */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Pre-release Audits
                </h3>
              </div>

              {data?.pre_release_projects?.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-500 text-sm">
                  No pending pre-release projects.
                </div>
              ) : (
                <div className="flex overflow-x-auto pb-6 gap-5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  {data?.pre_release_projects?.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="bg-white border-2 border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-amber-400 transition-all group relative overflow-hidden min-w-[240px] flex-shrink-0 flex flex-col"
                    >
                      <div className="absolute top-0 right-0 p-2">
                        <Zap
                          size={14}
                          className="text-amber-500 fill-amber-500 opacity-20 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mb-0.5 group-hover:text-accent transition-colors leading-tight truncate">
                        {project.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mb-4 uppercase tracking-wider">
                        {project.client_name || "Internal"}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Open Issues
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {project.open_issues_count || 0}
                          </span>
                        </div>
                        <div className="bg-black text-accent p-1.5 rounded-lg group-hover:bg-accent group-hover:text-black transition-colors">
                          <ArrowUpRight size={14} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Post-release Projects */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Post-release Projects
                </h3>
              </div>

              {data?.post_release_projects?.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-500 text-sm">
                  No post-release projects found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data?.post_release_projects?.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group relative overflow-hidden"
                    >
                      <h4 className="font-black text-slate-900 text-xl mb-1 group-hover:text-accent transition-colors leading-tight">
                        {project.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">
                        {project.client_name || "Internal"}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Open Issues
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {project.open_issues_count || 0}
                          </span>
                        </div>
                        <div className="bg-slate-900 text-white p-2 rounded-xl group-hover:bg-accent group-hover:text-black transition-colors">
                          <ArrowUpRight size={18} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Your Active Tasks */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Your Active Tasks
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.my_tasks.length === 0 ? (
                  <div className="md:col-span-2 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="font-bold text-slate-900">All caught up!</h4>
                    <p className="text-slate-500 text-sm mt-1">
                      No open tasks currently assigned to you.
                    </p>
                  </div>
                ) : (
                  data?.my_tasks.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks?taskId=${task.id}`}
                      className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span
                          className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
                            task.severity === "critical"
                              ? "bg-red-50 text-red-600 border-red-100"
                              : task.severity === "high"
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : "bg-slate-50 text-slate-600 border-slate-100"
                          }`}
                        >
                          {task.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock size={12} />
                          {format(new Date(task.created_at), "MMM d")}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-2">
                        {(task as any).projects?.name}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-accent font-black text-[10px] uppercase tracking-widest">
                        <span>View Details</span>
                        <ChevronRight
                          size={14}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Clock className="w-4 h-4 text-slate-400" />
              Quick Stats
            </h3>
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-6 shadow-xl">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  Total Assigned
                </p>
                <p className="text-3xl font-black">
                  {data?.my_tasks.length ?? 0}
                </p>
              </div>
              <div className="pt-6 border-t border-white/10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  Open Issues Count
                </p>
                <p className="text-3xl font-black text-amber-400">
                  {data?.open_issues ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // QA ENGINEER VIEW
  // ---------------------------------------------------------------------------
  if (isQA) {
    return (
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 px-4">
        <header>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            QA Command Center
          </h1>
          <p className="text-slate-500 mt-2 font-medium italic">
            Welcome back. Prioritize pre-release audits or search for specific
            projects.
          </p>
        </header>

        {/* 1. Pre-release Projects */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Zap className="w-4 h-4 text-amber-500" />
              Pre-release Audits
            </h3>
          </div>

          {data?.pre_release_projects?.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-500 text-sm">
              No pending pre-release projects.
            </div>
          ) : (
            <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {data?.pre_release_projects?.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white border-2 border-amber-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all group relative overflow-hidden min-w-[300px] flex-shrink-0"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <Zap
                      size={16}
                      className="text-amber-500 fill-amber-500 opacity-20 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors truncate pr-2">
                    {project.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">
                    {project.client_name || "Internal"}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Active Runs
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {project.qa_runs?.filter(
                          (r: any) => r.status === "running",
                        ).length || 0}
                      </span>
                    </div>
                    <div className="bg-black text-accent p-2 rounded-xl group-hover:bg-accent group-hover:text-black transition-colors">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 2. Post-release Projects */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Layers className="w-4 h-4 text-emerald-500" />
              Post-release Projects
            </h3>
          </div>

          {data?.post_release_projects?.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-500 text-sm">
              No post-release projects found.
            </div>
          ) : (
            <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {data?.post_release_projects?.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group relative overflow-hidden min-w-[300px] flex-shrink-0"
                >
                  <h4 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors truncate pr-2">
                    {project.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">
                    {project.client_name || "Internal"}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Open Issues
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {project.open_issues_count || 0}
                      </span>
                    </div>
                    <div className="bg-slate-900 text-white p-2 rounded-xl group-hover:bg-accent group-hover:text-black transition-colors">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 3. Project Explorer */}
        <section className="space-y-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Search className="w-4 h-4 text-slate-400" />
              Project Explorer
            </h3>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search database..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Project Database
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Client
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Last Activity
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-8 py-12 text-center text-sm text-slate-400 font-medium italic"
                      >
                        No projects found matching "{projectSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${project.is_pre_release ? "bg-amber-400" : "bg-slate-300"}`}
                            />
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors truncate pr-2 group-hover:text-accent transition-colors"
                            >
                              {project.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-lg">
                            {project.client_name || "Internal"}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                          {project.qa_runs?.[0]
                            ? format(
                                new Date(project.qa_runs[0].created_at),
                                "MMM d, yyyy",
                              )
                            : "No runs yet"}
                        </td>
                        <td className="px-8 py-5">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-accent hover:text-black transition-colors"
                          >
                            <ExternalLink size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // SUPERADMIN / ADMIN VIEW (MANAGEMENT)
  // ---------------------------------------------------------------------------
  const stats = [
    {
      label: "Open Issues",
      value: data?.open_issues ?? 0,
      icon: AlertCircle,
      color: (data?.open_issues ?? 0) > 0 ? "text-red-600" : "text-slate-600",
      bg: (data?.open_issues ?? 0) > 0 ? "bg-red-50" : "bg-slate-50",
    },
    {
      label: "Runs (Week)",
      value: data?.runs_this_week ?? 0,
      icon: PlayCircle,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "My Tasks",
      value: data?.my_open_tasks ?? 0,
      icon: CheckSquare,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Projects",
      value: data?.projects_count ?? 0,
      icon: Layers,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-12 px-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Executive Overview
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Global intelligence across all organizational projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="btn-unified-secondary h-11 flex items-center gap-2"
          >
            <Layers size={18} />
            Browse Projects
          </Link>
        </div>
      </header>

      {/* 1. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-3 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div
              className={`text-4xl font-black ${stat.label === "Open Issues" && (data?.open_issues ?? 0) > 0 ? "text-red-600" : "text-slate-900"}`}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Pre-release Projects (Admin) */}
      <section className="space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
          <Zap className="w-4 h-4 text-amber-500" />
          Pre-release Projects
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.pre_release_projects?.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative flex flex-col"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => setEditingProject(project)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-accent transition-all"
                >
                  <Settings2 size={16} />
                </button>
              </div>
              <Link to={`/projects/${project.id}`} className="flex-1">
                <h4 className="font-black text-slate-900 text-lg mb-1 group-hover:text-accent transition-colors">
                  {project.name}
                </h4>
                <p className="text-xs text-slate-400 font-medium mb-6">
                  {project.client_name || "Internal"}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Active Runs:{" "}
                    {project.qa_runs?.filter((r: any) => r.status === "running")
                      .length || 0}
                  </span>
                  <ArrowUpRight size={18} className="text-accent" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Post-release Projects (Admin) */}
      <section className="space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
          <Layers className="w-4 h-4 text-emerald-500" />
          Post-release Projects
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.post_release_projects?.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative flex flex-col"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setEditingProject(project)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-accent transition-all"
                >
                  <Settings2 size={16} />
                </button>
              </div>
              <Link to={`/projects/${project.id}`} className="flex-1">
                <h4 className="font-black text-slate-900 text-lg mb-1 group-hover:text-accent transition-colors">
                  {project.name}
                </h4>
                <p className="text-xs text-slate-400 font-medium mb-6">
                  {project.client_name || "Internal"}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Open Issues: {project.open_issues_count || 0}
                  </span>
                  <ArrowUpRight size={18} className="text-emerald-500" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Real-time QA Activity */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
            <PlayCircle className="w-4 h-4 text-slate-400" />
            Real-time QA Activity
          </h3>
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Project
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.recent_runs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-8 py-12 text-center text-sm text-slate-400 font-medium italic"
                    >
                      No recent runs initiated
                    </td>
                  </tr>
                ) : (
                  data?.recent_runs.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <Link
                            to={`/projects/${run.project_id}/runs/${run.id}`}
                            className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors leading-tight"
                          >
                            {(run as any).projects?.name}
                          </Link>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {run.run_type.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-3 ${
                              run.status === "completed"
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                : run.status === "running"
                                  ? "bg-accent animate-pulse shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]"
                                  : run.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-slate-300"
                            }`}
                          />
                          <span className="text-xs font-black text-slate-600 uppercase tracking-tight">
                            {run.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                        {format(new Date(run.created_at), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Management Side Column */}
        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <CheckSquare className="w-4 h-4 text-slate-400" />
              Critical Assignments
            </h3>
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm divide-y divide-slate-50 overflow-hidden">
              {data?.my_tasks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-xs text-slate-400 font-medium italic">
                    No urgent tasks for you
                  </p>
                </div>
              ) : (
                data?.my_tasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks?taskId=${task.id}`}
                    className="p-6 hover:bg-slate-50 transition-colors block group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors leading-tight line-clamp-2">
                          {task.title}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                          {(task as any).projects?.name}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent transform group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pending Sign-offs */}
          <div className="space-y-6">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              Pending Global Sign-offs
            </h3>
            <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 space-y-4">
              {data?.pending_signoffs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-emerald-600 font-black uppercase tracking-widest">
                    All runs verified
                  </p>
                </div>
              ) : (
                data?.pending_signoffs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between bg-white p-4 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">
                        {(run as any).projects?.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">
                        Ready for review •{" "}
                        {format(new Date(run.completed_at!), "MMM d")}
                      </p>
                    </div>
                    <Link
                      to={`/projects/${run.project_id}/runs/${run.id}`}
                      className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProjectModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
      />
    </div>
  )
}
