import React from "react"
import { MonitorSmartphone, Square, CheckSquare, Check } from "lucide-react"
import { useRole } from "../hooks/useRole"
import { FindingSeverityEditor } from "./FindingSeverityEditor"
import { QAFinding } from "../api/runs.api"
import { useGalleryStore } from "../store/galleryStore"
import { FindingCardWithScreenshot } from "./FindingCardWithScreenshot"
import { useAuthAxios } from "../lib/useAuthAxios"

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

  const api = useAuthAxios()
  const [isPushing, setIsPushing] = React.useState(false)
  const [isPushed, setIsPushed] = React.useState(finding.status === "confirmed")
  const handlePushToBasecamp = async () => {
    setIsPushing(true)
    try {
      await api.post(`/api/findings/${finding.id}/push-basecamp`, {})
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

  const hasTask = finding.tasks && finding.tasks.length > 0
  const isConfirmed = finding.status === "confirmed"
  const isFalsePositive = finding.status === "false_positive"

  const cardBorder =
    isConfirmed || isAssigned
      ? "border-emerald-500 ring-1 ring-emerald-500/20"
      : isFalsePositive
        ? "opacity-60 border-slate-200 dark:border-slate-700"
        : "border-slate-200 dark:border-slate-700 hover:border-accent/40"

  const screenshotUrls = finding.screenshot_url
    ? finding.screenshot_url
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : []

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

      {screenshotUrls.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Screenshots
          </p>
          <div className="flex items-start justify-between w-full">
            <div className="w-[50%] flex">
              {screenshotUrls.slice(0, 4).map((url, idx) => (
                <div key={url} className="space-y-1 w-1/16 gap-1 flex-shrink-0">
                  <div className="w-full">
                    <FindingCardWithScreenshot
                      finding={{ ...finding, screenshot_url: url }}
                      pageScreenshots={{}}
                      hideTabs={true}
                    />
                  </div>
                  <p
                    className="font-bold text-slate-400 uppercase tracking-widest text-center text-[8px] truncate px-1"
                    title={
                      idx === 0
                        ? "Facebook"
                        : idx === 1
                          ? "X"
                          : idx === 2
                            ? "LinkedIn"
                            : "Meta Tags"
                    }
                  >
                    {idx === 0
                      ? "Facebook"
                      : idx === 1
                        ? "X"
                        : idx === 2
                          ? "LinkedIn"
                          : "Meta Tags"}
                  </p>
                </div>
              ))}
            </div>

            <div className="w-[25%] flex flex-col gap-2 pl-4 border-l border-slate-100 dark:border-slate-700/50 ml-5">
              <label className="flex items-center gap-2 group/cb">
                <input
                  type="checkbox"
                  checked={isManuallyVerified}
                  onChange={(e) => setIsManuallyVerified(e.target.checked)}
                  className="w-3 h-3 text-accent border-slate-300 dark:border-slate-600 dark:bg-[#131d22] rounded focus:ring-accent accent-accent cursor-pointer transition-all"
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover/cb:text-slate-900 dark:group-hover/cb:text-slate-200 transition-colors cursor-pointer truncate">
                  {isManuallyVerified ? "Title Verified" : "Verify Title"}
                </span>
              </label>
            </div>
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
                {isManuallyVerified && (
                  <button
                    onClick={handlePushToBasecamp}
                    disabled={isPushing || isPushed}
                    className={`btn-unified px-3 flex items-center justify-center transition-all active:scale-95 ${isPushed ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default" : "bg-[#0b1016] hover:bg-slate-800 text-white"}`}
                  >
                    {isPushing ? "..." : isPushed ? "Success" : "Push"}
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
