import React from "react"
import { MonitorSmartphone, Square, CheckSquare, Check } from "lucide-react"
import { useRole } from "../hooks/useRole"
import { FindingSeverityEditor } from "./FindingSeverityEditor"
import { QAFinding } from "../api/runs.api"
import { useGalleryStore } from "../store/galleryStore"
import { FindingCardWithScreenshot } from "./FindingCardWithScreenshot"

interface FindingCardProps {
  finding: QAFinding
  onConfirm?: (id: string) => void
  onFalsePositive?: (id: string) => void
  onCreateTask?: (finding: QAFinding) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  assignedTaskIds?: string[]
  assignedUsers?: any[]
  isAssigned?: boolean
}

export const SocialShareHeadingFindingCard: React.FC<FindingCardProps> = ({
  finding,
  onConfirm,
  onFalsePositive,
  onCreateTask,
  isSelected,
  onToggleSelect,
  assignedTaskIds = [],
  assignedUsers = [],
  isAssigned = false,
}) => {
  const { canDo } = useRole()
  const canAction = canDo("qa_engineer")
  const { galleryImages: allGalleryImages } = useGalleryStore()
  const galleryImages = allGalleryImages[finding.id] || []

  const [localTitle, setLocalTitle] = React.useState(finding.title)
  const [isManuallyVerified, setIsManuallyVerified] = React.useState(false)

  React.useEffect(() => {
    setLocalTitle(finding.title)
  }, [finding.title])

  const hasTask = finding.tasks && finding.tasks.length > 0
  const isConfirmed = finding.status === "confirmed"
  const isFalsePositive = finding.status === "false_positive"

  const cardBorder =
    isConfirmed || isAssigned
      ? "border-emerald-500 ring-1 ring-emerald-500/20"
      : isFalsePositive
        ? "opacity-60 border-slate-200 dark:border-slate-700"
        : "border-slate-200 dark:border-slate-700 hover:border-accent/40"

  return (
    <div
      className={`group p-6 bg-slate-200/10 dark:bg-[#1D2A31] rounded-md border transition-all duration-300 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] hover:shadow-md relative overflow-hidden flex flex-col gap-6 ${cardBorder}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {canAction && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.(finding.id)
              }}
              className={`p-1 rounded transition-all ${isSelected ? "text-black scale-110" : "text-slate-300 hover:text-slate-400"}`}
            >
              {isSelected ? (
                <CheckSquare size={20} strokeWidth={2.5} />
              ) : (
                <Square size={20} strokeWidth={2} />
              )}
            </button>
          )}
          <FindingSeverityEditor
            findingId={finding.id}
            pageId={finding.page_id}
            currentSeverity={finding.severity}
            canEdit={canAction && !isFalsePositive}
            symbolOnly={true}
          />
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
            <MonitorSmartphone size={14} className="text-accent" />
            Social Share Heading Check
          </div>
        </div>
      </div>

      {canAction && (
        <div className="relative group/input">
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#131d22] border border-slate-200 dark:border-slate-600 rounded-md font-bold text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-accent/30 focus:border-accent/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
            placeholder="Social Share Heading Check Title"
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed break-words">
          {finding.description}
        </p>
      </div>

      {finding.screenshot_url && (
        <div className="pt-2 flex items-start gap-4">
          <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
            {finding.screenshot_url.split(",").map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="relative group cursor-pointer flex-shrink-0 w-[120px] h-[80px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#131d22] shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <img
                  src={url}
                  alt={`Social Share Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover object-top transition-transform group-hover:scale-110"
                />
              </a>
            ))}
          </div>

          <div className="flex-shrink-0 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group/verify bg-slate-50 dark:bg-[#1d2a31] p-2.5 rounded border border-slate-200 dark:border-slate-700">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isManuallyVerified ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#131d22] group-hover/verify:border-accent"}`}
              >
                {isManuallyVerified && <Check size={12} strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={isManuallyVerified}
                onChange={(e) => setIsManuallyVerified(e.target.checked)}
              />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">
                verify title
              </span>
            </label>
          </div>
        </div>
      )}

      {canAction && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700/50 mt-auto">
          <div className="flex items-center gap-2">
            {isFalsePositive ? (
              <button
                onClick={() => onConfirm?.(finding.id)}
                className="btn-unified"
              >
                Re-flag as genuine
              </button>
            ) : (
              <>
                {!(hasTask || isAssigned) && (
                  <button
                    onClick={() => onFalsePositive?.(finding.id)}
                    className="btn-unified"
                  >
                    False Positive
                  </button>
                )}
                <button
                  onClick={() =>
                    onCreateTask?.({
                      ...finding,
                      title: localTitle,
                      gallery_images: galleryImages,
                    })
                  }
                  disabled={hasTask || isAssigned}
                  className={`btn-unified ${hasTask || isAssigned ? "bg-accent text-white cursor-not-allowed" : ""}`}
                >
                  {hasTask || isAssigned ? "Task Linked" : "Add to Tasks"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
