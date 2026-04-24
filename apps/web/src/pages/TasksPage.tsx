import { useState } from "react"
import {
  CheckSquare,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Zap,
  Layers,
  Clock,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useDashboardStats } from "../hooks/useDashboard"
import { useRole } from "../hooks/useRole"
import { CreateTaskModal } from "../components/CreateTaskModal"
import { TasksTab } from "../components/TasksTab"
import { Skeleton } from "../components/Skeleton"
import { TaskDetailPanel } from "../components/TaskDetailPanel"
import { useUpdateTask } from "../hooks/useTasks"
import { TaskStatus } from "../api/tasks.api"

const ProjectCard = ({ project }: { project: any }) => (
  <Link
    to={`/projects/${project.id}`}
    className="flex-shrink-0 w-80 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group flex flex-col h-full"
  >
    <div className="flex justify-between items-start mb-4">
      <span
        className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
          project.is_pre_release
            ? "bg-amber-50 text-amber-600 border-amber-100"
            : "bg-emerald-50 text-emerald-600 border-emerald-100"
        }`}
      >
        {project.is_pre_release ? "Pre-release" : "Post-release"}
      </span>
      {project.open_issues_count > 0 && (
        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
          <Zap size={12} className="fill-red-500" />
          {project.open_issues_count} Issues
        </span>
      )}
    </div>
    <h4 className="font-black text-slate-900 text-lg mb-1 group-hover:text-accent transition-colors line-clamp-1 leading-tight">
      {project.name}
    </h4>
    <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">
      {project.client_name || "Internal"}
    </p>

    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-accent font-black text-[10px] uppercase tracking-widest">
      <span>View Dashboard</span>
      <ArrowUpRight
        size={14}
        className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
      />
    </div>
  </Link>
)

const HorizontalScroll = ({
  title,
  icon: Icon,
  projects,
  iconColor = "text-slate-400",
}: any) => {
  if (!projects || projects.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {projects.length} Total
        </span>
      </div>
      <div className="flex overflow-x-auto pb-6 gap-6 no-scrollbar -mx-2 px-2 mask-fade-right">
        {projects.map((project: any) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-600 border-red-100"
    case "high":
      return "bg-amber-50 text-amber-600 border-amber-100"
    case "medium":
      return "bg-amber-50 text-amber-600 border-amber-100"
    case "low":
      return "bg-yellow-50 text-yellow-600 border-yellow-100"
    default:
      return "bg-slate-50 text-slate-500 border-slate-200"
  }
}

const KanbanCard = ({ task, onClick }: { task: any; onClick: any }) => (
  <div
    onClick={() => onClick(task)}
    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative hover:border-accent/20"
  >
    <div className="flex items-center justify-between mb-2">
      <span
        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${getSeverityColor(task.severity)}`}
      >
        {task.severity}
      </span>
      {task.basecamp_url && (
        <div className="text-emerald-600" title="Synced with Basecamp">
          <CheckCircle2 size={12} />
        </div>
      )}
    </div>
    <h4 className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors leading-tight mb-4">
      {task.title}
    </h4>
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
      <div className="flex items-center space-x-3 text-slate-400">
        <div className="flex items-center space-x-1">
          <MessageSquare className="w-3 h-3" />
          <span className="text-[10px] font-bold">
            {task.comments?.length || 0}
          </span>
        </div>
        {task.basecamp_url && (
          <ExternalLink className="w-3 h-3 text-emerald-500" />
        )}
      </div>
      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border-2 border-white uppercase">
        {task.users?.full_name?.charAt(0) || "?"}
      </div>
    </div>
  </div>
)

const KanbanColumn = ({
  title,
  tasks,
  onTaskClick,
}: {
  title: string
  tasks: any[]
  onTaskClick: any
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between px-2">
      <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        {title}
      </h3>
      <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">
        {tasks.length}
      </span>
    </div>

    <div className="space-y-4 min-h-[200px] bg-slate-50/50 rounded-2xl p-2 border border-dashed border-slate-200/60">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center space-y-2 opacity-30 grayscale">
          <CheckSquare className="w-6 h-6 text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
            No tasks
          </p>
        </div>
      ) : (
        tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
        ))
      )}
    </div>
  </div>
)

const ProjectKanban = ({
  project,
  tasks,
  onTaskClick,
}: {
  project: any
  tasks: any[]
  onTaskClick: any
}) => {
  const columns = [
    { id: "open", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "resolved", title: "Resolved" },
    { id: "closed", title: "Closed" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent rounded-full shadow-sm shadow-accent/20" />
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {project.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
              Project Workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
            {tasks.length} Total Assigned
          </span>
          <Link
            to={`/projects/${project.id}`}
            className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-accent hover:border-accent/20 transition-all shadow-sm"
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.id)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  )
}

export const TasksPage = () => {
  const { data, isLoading } = useDashboardStats()
  const { role } = useRole()
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showAllOther, setShowAllOther] = useState(false)
  const [qaExpanded, setQaExpanded] = useState(true)
  const [devExpanded, setDevExpanded] = useState(true)
  const { mutate: updateTask } = useUpdateTask()

  const isAdmin = role === "super_admin" || role === "admin"
  const isSubAdmin = role === "sub_admin"
  const isQA = role === "qa_engineer"
  const isDev = role === "developer"

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="bg-white border border-slate-100 rounded-3xl h-64 overflow-hidden relative">
                <Skeleton className="absolute inset-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-48 w-80 rounded-2xl flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getQAName = (project: any) => {
    const qaMember = project.project_members?.find(
      (m: any) => m.role === "qa_engineer",
    )
    return qaMember?.users?.full_name || "Unassigned"
  }

  const getDevNames = (project: any) => {
    // Identify developer names from project members to exclude QA engineers
    const devNames = new Set(
      project.project_members
        ?.filter((m: any) => m.role === "developer")
        .map((m: any) => m.users?.full_name),
    )

    // Filter only those tasks assigned to project developers
    const activeDevNames =
      project.tasks
        ?.filter((t: any) => devNames.has(t.users?.full_name))
        .map((t: any) => t.users?.full_name)
        .filter(Boolean) || []

    const uniqueDevs = Array.from(new Set(activeDevNames))

    if (uniqueDevs.length === 0) return "none"
    return uniqueDevs.join(", ")
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {isDev ? "Developer Task Flow" : "Real-time Tasks Monitor"}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {isDev
              ? "Consolidated view of all my current tasks"
              : "Check currently active workflows across all projects"}
          </p>
        </div>
        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="btn-unified flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      <div className="space-y-16">
        {/* ADMIN & SUB-ADMIN VIEW */}
        {(isAdmin || isSubAdmin) && (
          <div className="bg-white border border-slate-200 rounded-[8px] overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col animate-in slide-in-from-bottom-4 duration-700">
            {/* Unified Table Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">
                  Active Workflows
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Consolidated view of all project stages and assignments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  Real-time Tracking
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {/* QA Section */}
                <tbody className="border-b border-slate-100">
                  <tr
                    className="bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition-all group select-none"
                    onClick={() => setQaExpanded(!qaExpanded)}
                  >
                    <td colSpan={4} className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-1 rounded-md transition-all duration-300 ${qaExpanded ? "bg-[#93c0b1] text-white rotate-0" : "bg-slate-200 text-slate-500 -rotate-90"}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`${qaExpanded ? "text-[#93c0b1]" : "text-slate-400"} font-semibold uppercase text-[13px]`}
                          >
                            Current QA Tasks
                          </span>
                        </div>
                        <div className="ml-auto">
                          <span className="text-[10px] font-black text-slate-400 uppercase bg-white/80 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                            {data?.qa_projects?.length || 0} Total
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {qaExpanded && (
                    <>
                      <tr className="bg-white">
                        <th className="px-8 py-4 text-[10px] text-black-200 uppercase border-b border-slate-50">
                          Project Name
                        </th>
                        <th className="px-8 py-4 text-[10px] text-black-200 uppercase border-b border-slate-50 text-center">
                          Status
                        </th>
                        <th className="px-8 py-4 text-[10px]  text-black-200 uppercase border-b border-slate-50 text-center">
                          Issues
                        </th>
                        <th className="px-8 py-4 text-[10px]  text-black-200 uppercase border-b border-slate-50">
                          Assigned QA
                        </th>
                      </tr>
                      {data?.qa_projects?.map((project: any) => (
                        <tr
                          key={project.id}
                          className="hover:bg-slate-50/30 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-sm font-medium text-slate-500 hover:text-[#93c0b1] transition-colors flex items-center gap-1 group-hover:translate-x-0.25 transition-transform"
                            >
                              {project.name}
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-emerald-500" />
                            </Link>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                project.is_pre_release
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
                              }`}
                            >
                              {project.is_pre_release
                                ? "Pre-Release"
                                : "Post-Release"}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
                              {project.open_issues_count || 0}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              {getQAName(project)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!data?.qa_projects ||
                        data.qa_projects.length === 0) && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-8 py-16 text-center text-slate-400 text-xs font-medium italic"
                          >
                            No active QA tasks at the moment.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>

                {/* Developer Section */}
                <tbody>
                  <tr
                    className="bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition-all group select-none"
                    onClick={() => setDevExpanded(!devExpanded)}
                  >
                    <td colSpan={4} className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-1 rounded-md transition-all duration-300 ${devExpanded ? "bg-[#93c0b1] text-white rotate-0" : "bg-slate-200 text-slate-500 -rotate-90"}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`${devExpanded ? "text-[#93c0b1]" : "text-slate-400"} font-semibold uppercase text-[13px]`}
                          >
                            Current Developer Tasks
                          </span>
                        </div>
                        <div className="ml-auto">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/80 px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                            {data?.dev_projects?.length || 0} Total
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {devExpanded && (
                    <>
                      <tr className="bg-white">
                        <th className="px-8 py-4 text-[10px] text-black-200 uppercase border-b border-slate-50">
                          Project Name
                        </th>
                        <th
                          colSpan={3}
                          className="px-8 py-4 text-[10px] text-black-200 uppercase border-b border-slate-50"
                        >
                          Assigned Developers (Active on Tasks)
                        </th>
                      </tr>
                      {data?.dev_projects?.map((project: any) => (
                        <tr
                          key={project.id}
                          className="hover:bg-slate-50/30 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-sm font-medium text-slate-500 hover:text-[#93c0b1] transition-colors flex items-center gap-1 group-hover:translate-x-0.25 transition-transform"
                            >
                              {project.name}
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-[#93c0b1]" />
                            </Link>
                          </td>
                          <td colSpan={3} className="px-8 py-5">
                            <div className="flex flex-wrap gap-2">
                              {getDevNames(project)
                                .split(", ")
                                .map((name: string, i: number) => (
                                  <span
                                    key={i}
                                    className={
                                      name === "none"
                                        ? "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-600 border-amber-100"
                                        : "text-[10px] font-black text-[#93c0b1] bg-[#93c0b1]/10 px-2.5 py-1 rounded-lg border border-[#93c0b1]/10 uppercase tracking-wider"
                                    }
                                  >
                                    {name}
                                  </span>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!data?.dev_projects ||
                        data.dev_projects.length === 0) && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-8 py-16 text-center text-slate-400 text-xs font-medium italic"
                          >
                            No active developer tasks at the moment.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QA VIEW */}
        {isQA && (
          <div className="space-y-8">
            <TasksTab />
          </div>
        )}

        {/* DEVELOPER VIEW */}
        {isDev && (
          <div className="space-y-20">
            {(() => {
              const groupedTasks =
                data?.my_tasks?.reduce(
                  (acc: Record<string, any[]>, task: any) => {
                    const projectId = task.project_id
                    if (!acc[projectId]) acc[projectId] = []
                    acc[projectId].push(task)
                    return acc
                  },
                  {},
                ) || {}

              const projectIds = Object.keys(groupedTasks)

              if (projectIds.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-[40px] p-24 text-center space-y-6 shadow-xl shadow-slate-100/50 animate-in zoom-in-95 duration-700">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex items-center justify-center mx-auto border border-emerald-100">
                      <CheckSquare className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        All Caught Up!
                      </h3>
                      <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        You don't have any active tasks assigned to you right
                        now. Take a moment to breathe or check other projects.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => (window.location.href = "/projects")}
                        className="btn-unified-secondary"
                      >
                        Browse Projects
                      </button>
                    </div>
                  </div>
                )
              }

              return projectIds.map((projectId) => (
                <ProjectKanban
                  key={projectId}
                  project={{
                    id: projectId,
                    name:
                      groupedTasks[projectId][0]?.projects?.name ||
                      "Unknown Project",
                  }}
                  tasks={groupedTasks[projectId]}
                  onTaskClick={setSelectedTask}
                />
              ))
            })()}
          </div>
        )}
      </div>

      <TaskDetailPanel
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
