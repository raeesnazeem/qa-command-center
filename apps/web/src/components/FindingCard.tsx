import React from "react"
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Plus,
  ExternalLink,
  Globe,
  Search,
  FileSearch,
  Layout,
  Eye,
  Monitor,
  Activity,
  User,
} from "lucide-react"
import { useRole } from "../hooks/useRole"
import { FindingSeverityEditor } from "./FindingSeverityEditor"
import { SpellingFindingCard } from "./SpellingFindingCard"
import { FindingCardWithScreenshot } from "./FindingCardWithScreenshot"
import { RebuttalVerdictCard } from "./RebuttalVerdictCard"
import { QAFinding } from "../api/runs.api"

interface FindingCardProps {
  finding: QAFinding
  pageScreenshots?: {
    desktop?: string | null
    tablet?: string | null
    mobile?: string | null
  }
  onConfirm?: (id: string) => void
  onFalsePositive?: (id: string) => void
  onCreateTask?: (finding: QAFinding) => void
  onAssign?: (id: string) => void
}

const CHECK_FACTOR_ICONS: Record<string, React.ReactNode> = {
  broken_links: <Globe size={14} />,
  external_links: <ExternalLink size={14} />,
  meta_tags: <Search size={14} />,
  console_errors: <FileSearch size={14} />,
  dummy_content: <Layout size={14} />,
  visual_regression: <Eye size={14} />,
  accessibility: <Monitor size={14} />,
  performance: <Info size={14} />,
  seo: <Search size={14} />,
  image_compliance: <Monitor size={14} />,
  ai_content_audit: <FileSearch size={14} className="text-accent" />,
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  pageScreenshots,
  onConfirm,
  onFalsePositive,
  onCreateTask,
  onAssign,
}) => {
  const { canDo } = useRole()
  const canAction = canDo("qa_engineer")

  const severityIcons = {
    critical: <ShieldAlert size={20} />,
    high: <AlertTriangle size={20} />,
    medium: <AlertCircle size={20} />,
    low: <Info size={20} />,
  }

  const isConfirmed = finding.status === "confirmed"
  const isFalsePositive = finding.status === "false_positive"
  const hasTask = finding.tasks && finding.tasks.length > 0
  const [isExpanded, setIsExpanded] = React.useState(false)

  if (finding.check_factor === "spelling") {
    return (
      <SpellingFindingCard
        finding={finding}
        pageScreenshots={pageScreenshots}
        onConfirm={onConfirm}
        onFalsePositive={onFalsePositive}
        onCreateTask={onCreateTask}
      />
    )
  }

  return (
    <div
      className={`group p-6 bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden ${
        isConfirmed
          ? "border-emerald-500 ring-1 ring-emerald-500/20"
          : isFalsePositive
            ? "opacity-60 border-slate-200"
            : "border-slate-100 hover:border-accent/40"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Severity Icon */}
        <div
          className={`mt-1 p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${
            isFalsePositive
              ? "bg-slate-100 text-slate-400"
              : finding.severity === "critical"
                ? "bg-red-50 text-red-600"
                : finding.severity === "high"
                  ? "bg-orange-50 text-orange-600"
                  : finding.severity === "medium"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-yellow-50 text-yellow-600"
          }`}
        >
          {isFalsePositive ? (
            <XCircle size={20} />
          ) : (
            severityIcons[finding.severity]
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header Info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FindingSeverityEditor
                findingId={finding.id}
                pageId={finding.page_id}
                currentSeverity={finding.severity}
                canEdit={canAction && !isFalsePositive}
              />
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {CHECK_FACTOR_ICONS[finding.check_factor] || (
                  <FileSearch size={14} />
                )}
                {finding.check_factor.replace(/_/g, " ")}
              </div>
            </div>
            <span className="text-[8px] font-bold text-slate-300 uppercase">
              {new Date(finding.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Title & Description */}
          <h4
            className={`font-black text-slate-900 text-base mb-2 group-hover:text-black transition-colors leading-tight ${
              isFalsePositive ? "line-through text-slate-400" : ""
            }`}
          >
            {finding.title}
          </h4>
          {finding.description && (
            <div className="mb-4">
              <p
                className={`text-[11px] text-slate-500 font-medium leading-relaxed ${
                  isFalsePositive ? "text-slate-400" : ""
                } ${!isExpanded ? "line-clamp-3" : ""}`}
              >
                {finding.description}
              </p>
              {finding.description.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] font-black text-accent uppercase tracking-widest mt-1 hover:text-black transition-colors"
                >
                  {isExpanded ? "See less" : "See more"}
                </button>
              )}
            </div>
          )}

          {/* Screenshot Thumbnail */}
          {(finding.screenshot_url || pageScreenshots?.desktop) && (
            <div className="mb-4">
              <FindingCardWithScreenshot
                finding={finding}
                pageScreenshots={pageScreenshots}
              />
              <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                {finding.screenshot_url
                  ? "Click to expand evidence"
                  : "Click to view page context"}
              </p>
            </div>
          )}

          {/* Context Text */}
          {finding.context_text && (
            <div className="mb-6">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">
                Contextual Data
              </p>
              <div className="h-[80px] p-3 bg-slate-900 rounded-[10px] border border-slate-800 font-mono text-[10px] text-slate-300 whitespace-pre-wrap break-words overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#93C0B1] [&::-webkit-scrollbar-track]:bg-transparent">
                {finding.context_text}
              </div>
            </div>
          )}

          {/* AI Rebuttal Verdict */}
          {finding.tasks?.[0]?.rebuttals?.[0] &&
            finding.tasks[0].rebuttals[0].ai_verdict && (
              <div className="mb-6">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                  AI Verdict on Rebuttal
                </p>
                <RebuttalVerdictCard
                  verdictData={{
                    verdict: finding.tasks[0].rebuttals[0].ai_verdict as
                      | "resolved"
                      | "disputed",
                    confidence:
                      finding.tasks[0].rebuttals[0].ai_confidence || 0,
                    reasoning: finding.tasks[0].rebuttals[0].ai_reasoning || "",
                  }}
                />
              </div>
            )}

          {finding.tasks?.[0]?.rebuttals?.[0] &&
            !finding.tasks[0].rebuttals[0].ai_verdict && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Activity size={16} className="text-blue-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                    AI Analysis Pending
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    Gemini is reviewing the developer's rebuttal...
                  </p>
                </div>
              </div>
            )}

          {isFalsePositive && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                Marked as False Positive
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
