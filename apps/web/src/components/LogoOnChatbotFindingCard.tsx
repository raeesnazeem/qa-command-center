import React from "react"
import {
  CheckSquare,
  Square,
  MonitorSmartphone,
  Plus,
  ClipboardList,
} from "lucide-react"
import { useRole } from "../hooks/useRole"
import { useParams, Link } from "react-router-dom"
import { FindingSeverityEditor } from "./FindingSeverityEditor"
import { FindingCardWithScreenshot } from "./FindingCardWithScreenshot"
import { QAFinding } from "../api/runs.api"
import { useAuthAxios } from "../lib/useAuthAxios"

interface FindingCardProps {
  finding: QAFinding
  onConfirm?: (id: string) => void
  onCreateTask?: (finding: QAFinding) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  assignedTaskIds?: string[]
  isAssigned?: boolean
}

export const LogoOnChatbotFindingCard: React.FC<FindingCardProps> = ({
  finding,
  onConfirm,
  onCreateTask,
  isSelected,
  onToggleSelect,
  assignedTaskIds = [],
  isAssigned = false,
}) => {
  const api = useAuthAxios()
  const { id: projectId } = useParams<{ id: string }>()
  const { canDo } = useRole()
  const canAction = canDo("qa_engineer")

  const [localTitle, setLocalTitle] = React.useState(finding.title)
  const [isPushing, setIsPushing] = React.useState(false)
  const [isPushed, setIsPushed] = React.useState(finding.status === "confirmed")

  const [isLogoVerified, setIsLogoVerified] = React.useState(false)

  const hasTask = finding.tasks && finding.tasks.length > 0
  const isConfirmed = finding.status === "confirmed"
  const isFalsePositive = finding.status === "false_positive"

  const handlePushToBasecamp = async () => {
    setIsPushing(true)
    try {
      await api.post(`/api/findings/${finding.id}/push-basecamp`, {
        isLogoVerified,
        hasTask: hasTask || isAssigned,
      })
      setIsPushed(true)
      if (onConfirm) onConfirm(finding.id)
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to push finding to Basecamp.")
    } finally {
      setIsPushing(false)
    }
  }

  React.useEffect(() => {
    setLocalTitle(finding.title)
  }, [finding.title])

  if (!canAction) return null

  const screenshotUrls = finding.screenshot_url
    ? finding.screenshot_url
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : []

  const labels = ["Code Snippet", "Homepage View", "Open Chatbot"]

  return (
    <div
      className={`group p-6 bg-slate-200/10 dark:bg-[#1D2A31] rounded-md border transition-all duration-300 flex flex-col gap-6 ${isConfirmed || isAssigned ? "border-emerald-500 ring-1 ring-emerald-500/20" : isFalsePositive ? "opacity-60 border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 hover:border-accent/40"}`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggleSelect?.(finding.id)}
          className={`p-1 rounded transition-all ${isSelected ? "text-black scale-110" : "text-slate-300 hover:text-slate-400"}`}
        >
          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
        </button>
        <FindingSeverityEditor
          findingId={finding.id}
          pageId={finding.page_id}
          currentSeverity={finding.severity}
          canEdit={!isFalsePositive}
          symbolOnly={true}
        />
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
          <MonitorSmartphone size={14} className="text-accent" />
          {finding.check_factor.replace(/_/g, " ")}
        </div>
      </div>

      <div className="relative group/input">
        <input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-900 dark:text-slate-200 focus:outline-none"
          placeholder="Input Heading..."
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100">
          <Plus size={14} className="text-slate-300" />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[11px] text-slate-500 font-medium whitespace-pre-wrap">
          {finding.description}
        </p>

        {screenshotUrls.length > 0 && (
          <div className="flex items-center gap-6 pt-2">
            <div className="flex gap-4">
              {screenshotUrls.map((url, idx) => (
                <div key={url} className="space-y-1">
                  <FindingCardWithScreenshot
                    finding={{ ...finding, screenshot_url: url }}
                    hideTabs={true}
                  />
                  <p className="font-bold text-slate-400 uppercase text-center text-[8px]">
                    {labels[idx] || "Screenshot"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pl-4 border-l border-slate-100 dark:border-slate-700/50 h-full justify-center">
              <label className="flex items-center gap-2 group/cb cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isPushed}
                  checked={isLogoVerified}
                  onChange={(e) => setIsLogoVerified(e.target.checked)}
                  className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent accent-accent disabled:opacity-60"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover/cb:text-slate-900 dark:group-hover/cb:text-slate-200 transition-colors">
                  Verify Logo on Chatbot
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
          {isLogoVerified && (
            <button
              onClick={handlePushToBasecamp}
              disabled={isPushing || isPushed}
              className={`btn-unified px-3 flex items-center justify-center ${isPushed ? "bg-emerald-100 text-emerald-800" : "bg-[#0b1016] hover:bg-slate-800 text-white"}`}
            >
              {isPushing ? "..." : isPushed ? "Success" : "Push"}
            </button>
          )}

          {!isLogoVerified && (
            <button
              onClick={() =>
                onCreateTask?.({
                  ...finding,
                  title: localTitle,
                  description: `Task Linked. Verified? Logo:${isLogoVerified}`,
                })
              }
              disabled={hasTask || isAssigned}
              className={`btn-unified ${hasTask || isAssigned ? "bg-slate-100 text-slate-400 opacity-60" : ""}`}
            >
              {hasTask || isAssigned ? "Task Linked" : "Add to Tasks"}
            </button>
          )}

          {(hasTask || isAssigned) && assignedTaskIds?.[0] && (
            <Link
              to={`/projects/${projectId}?tab=tasks&taskId=${assignedTaskIds[0]}`}
              target="_blank"
              className="p-2 text-slate-400 hover:text-accent"
            >
              <ClipboardList size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
