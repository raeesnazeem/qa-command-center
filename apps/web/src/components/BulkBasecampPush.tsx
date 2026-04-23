import { useState } from "react"
import { ExternalLink, Loader2, CheckCircle2 } from "lucide-react"
import { useAuthAxios } from "../lib/useAuthAxios"
import { pushToBasecamp, bulkPushToBasecamp } from "../api/tasks.api"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { CanDo } from "./CanDo"

interface BulkBasecampPushProps {
  taskIds: string[]
  onComplete?: () => void
}

export const BulkBasecampPush = ({
  taskIds,
  onComplete,
}: BulkBasecampPushProps) => {
  const axios = useAuthAxios()
  const queryClient = useQueryClient()
  const [isPushing, setIsPushing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pushedCount, setPushedCount] = useState(0)

  const handleBulkPush = async () => {
    if (taskIds.length === 0) return

    setIsPushing(true)
    setCurrentIndex(0)
    setPushedCount(0)

    try {
      const result = await bulkPushToBasecamp(axios, taskIds)
      setPushedCount(result.count)
      
      toast.success(
        (t) => (
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <span className="font-bold text-sm">{result.count} tasks pushed to Basecamp</span>
              <a 
                href={result.basecampUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-[#F97316] hover:underline flex items-center mt-1"
                onClick={() => toast.dismiss(t.id)}
              >
                View To-do <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        ),
        {
          position: 'bottom-left',
          duration: 5000,
        }
      );
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      onComplete?.()
    } catch (error: any) {
      console.error(`Failed to push tasks:`, error)
      toast.error(
        `Failed to push tasks: ${error.response?.data?.error || error.message}`,
      )
    } finally {
      setIsPushing(false)
    }
  }

  if (taskIds.length === 0) return null

  return (
    <CanDo role="qa_engineer">
      <button
        onClick={handleBulkPush}
        disabled={isPushing}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 ${
          isPushing
            ? "bg-slate-100 text-slate-500 border border-slate-200"
            : "bg-[#F97316] text-white hover:bg-[#EA580C]"
        }`}
      >
        {isPushing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Pushing {currentIndex} of {taskIds.length}...
            </span>
          </>
        ) : pushedCount > 0 && !isPushing ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>{pushedCount} tasks pushed to Basecamp</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Push {taskIds.length} tasks to Basecamp</span>
          </>
        )}
      </button>
    </CanDo>
  )
}
