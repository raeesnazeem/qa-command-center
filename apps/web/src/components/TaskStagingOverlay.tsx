import React, { useState, useMemo } from "react"
import {
  X,
  UserPlus,
  Search,
  Check,
  AlertCircle,
  Loader2,
  ClipboardList,
  Trash2,
} from "lucide-react"
import { useTaskStageStore } from "../store/taskStageStore"
import { useProject } from "../hooks/useProjects"
import { useCreateTask, useBulkPushToBasecamp } from "../hooks/useTasks"
import toast from "react-hot-toast"

interface TaskStagingOverlayProps {
  projectId: string
}

export const TaskStagingOverlay: React.FC<TaskStagingOverlayProps> = ({
  projectId,
}) => {
  const { stagedFindings, isOpen, removeFromStage, clearStage, setIsOpen } =
    useTaskStageStore()
  const { data: project, isLoading: isLoadingProject } = useProject(projectId)
  const { mutateAsync: createTask, isPending: isCreatingTasks } =
    useCreateTask()
  const { mutateAsync: pushToBasecamp } = useBulkPushToBasecamp()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const projectMembers = useMemo(
    () => project?.project_members || [],
    [project],
  )

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return projectMembers
    return projectMembers.filter(
      (member) =>
        member.users.full_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        member.users.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [projectMembers, searchQuery])

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUserIds(newSelection)
  }

  const handleAssign = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("Please select at least one user to assign")
      return
    }

    const toastId = toast.loading("Initializing task creation...", {
      position: "bottom-left",
    })
    console.log("[TaskStage] handleAssign started")

    try {
      const userIds = Array.from(selectedUserIds)
      const totalTasks = stagedFindings.length * userIds.length
      let completedCount = 0
      const createdTaskIds: string[] = []

      console.log(
        `[TaskStage] Creating ${totalTasks} tasks for ${stagedFindings.length} findings and ${userIds.length} users`,
      )

      // Create a task for each finding for each user
      for (const finding of stagedFindings) {
        for (const userId of userIds) {
          console.log(`[TaskStage] Creating task for finding ${finding.id} assigned to user ${userId}`)
          toast.loading(
            `Creating task ${completedCount + 1}/${totalTasks}...`,
            { id: toastId },
          )

          const task = await createTask({
            project_id: projectId,
            finding_id: finding.id,
            title: finding.title,
            description: finding.description || "",
            severity: finding.severity,
            assigned_to: userId,
          })

          if (task?.id) {
            console.log(`[TaskStage] Task created successfully: ${task.id}`)
            createdTaskIds.push(task.id)
          } else {
            console.warn("[TaskStage] Task created but no ID returned")
          }
          completedCount++
        }
      }

      console.log(
        `[TaskStage] All ${completedCount} tasks created in database.`,
      )

      console.log("[BasecampDebug] Project Data:", {
        id: project?.id,
        account: project?.basecamp_account_id,
        project: project?.basecamp_project_id,
        list: project?.basecamp_todo_list_id,
      })

      // Automatically push to Basecamp if configured
      const basecampConfig = {
        hasBasecamp: Boolean(project?.basecamp_account_id),
        accountId: !!project?.basecamp_account_id,
        projectId: !!project?.basecamp_project_id,
        todoListId: !!project?.basecamp_todo_list_id
      }
      console.log("[TaskStage] Basecamp config detected:", basecampConfig)
      
      const isConfigured = 
        basecampConfig.accountId && 
        basecampConfig.projectId && 
        basecampConfig.todoListId;

      if (isConfigured && createdTaskIds.length > 0) {
        console.log(
          `[TaskStage] Triggering Basecamp bulk push for ${createdTaskIds.length} tasks...`,
        )
        console.log(`[TaskStage] IDs being sent:`, createdTaskIds)
        toast.loading("Pushing tasks to Basecamp...", { id: toastId })

        try {
          // The hook will handle its own toast, so we dismiss the current one
          toast.dismiss(toastId)
          await pushToBasecamp(createdTaskIds)
          console.log("[TaskStage] Basecamp push request completed")
        } catch (bcError) {
          console.error("[TaskStage] Basecamp push failed:", bcError)
          // Error is handled by the hook's toast
        }
      } else {
        console.log(
          "[TaskStage] Skipping Basecamp push (not configured or no tasks)",
        )
        toast.success(`Successfully created ${totalTasks} tasks`, {
          id: toastId,
        })
      }

      clearStage()
      setSelectedUserIds(new Set())
    } catch (error) {
      console.error("[TaskStage] Critical failure during assignment:", error)
      toast.error("Failed to create some tasks", { id: toastId })
    }
  }

  if (!isOpen || stagedFindings.length === 0) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[100] border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-none">
              Task Stage
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {stagedFindings.length} findings ready
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
        >
          <X size={20} />
        </button>
      </div>

      {/* Staged Findings List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Staged Findings
          </p>
          <div className="space-y-2">
            {stagedFindings.map((finding) => (
              <div
                key={finding.id}
                className="group p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {finding.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          finding.severity === "critical"
                            ? "bg-red-100 text-red-600"
                            : finding.severity === "high"
                              ? "bg-orange-100 text-orange-600"
                              : finding.severity === "medium"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {finding.severity}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromStage(finding.id)}
                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assign Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Assign User(s)
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Search and select team members for these tasks
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
            />
          </div>

          {/* Member List */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
            {isLoadingProject ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => toggleUserSelection(member.user_id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    selectedUserIds.has(member.user_id)
                      ? "bg-accent/5 border-accent/30 shadow-sm"
                      : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                        selectedUserIds.has(member.user_id)
                          ? "bg-accent text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.users.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 leading-none">
                        {member.users.full_name}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1">
                        {member.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  {selectedUserIds.has(member.user_id) && (
                    <Check size={16} className="text-accent" />
                  )}
                </button>
              ))
            ) : (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  No members found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-slate-50/80 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
          <span className="text-slate-500">Assignment Preview</span>
          <span className="text-slate-900">
            {stagedFindings.length} tasks × {selectedUserIds.size} users
          </span>
        </div>
        <button
          onClick={handleAssign}
          disabled={isCreatingTasks || selectedUserIds.size === 0}
          className="w-full flex items-center justify-center gap-2 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-900 transition-all shadow-xl disabled:bg-slate-300 disabled:shadow-none active:scale-95"
        >
          {isCreatingTasks ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating Tasks...
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Assign & Create Tasks (
              {stagedFindings.length * selectedUserIds.size})
            </>
          )}
        </button>
        <button
          onClick={clearStage}
          disabled={isCreatingTasks}
          className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
        >
          Clear Stage
        </button>
      </div>
    </div>
  )
}
