import { useState } from "react"
import { ExternalLink, Loader2, CheckCircle2, X } from "lucide-react"
import { useAuthAxios } from "../lib/useAuthAxios"
import { pushToBasecamp, bulkPushToBasecamp, bulkPushCommentsToBasecamp } from "../api/tasks.api"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { CanDo } from "./CanDo"

interface BulkBasecampPushProps {
  taskIds: string[]
  onComplete?: () => void
  mode?: 'todo' | 'comment'
}

export const BulkBasecampPush = ({
  taskIds,
  onComplete,
  mode = 'todo'
}: BulkBasecampPushProps) => {
  const axios = useAuthAxios()
  const queryClient = useQueryClient()
  const [isPushing, setIsPushing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pushedCount, setPushedCount] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'completed'>('pending')

  const handleButtonClick = () => {
    if (mode === 'comment') {
      setIsModalOpen(true)
    } else {
      handleBulkPush()
    }
  }

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

  const handleConfirmCommentPush = async () => {
    if (taskIds.length === 0) return

    setIsPushing(true)
    try {
      const result = await bulkPushCommentsToBasecamp(axios, taskIds, selectedStatus)
      toast.success(`Pushed ${result.count} updates to Basecamp as comments.`)
      if (result.skipped > 0) {
        toast.error(`${result.skipped} tasks were skipped as they are not synced with Basecamp yet.`, { duration: 4000 })
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      setIsModalOpen(false)
      onComplete?.()
    } catch (error: any) {
      console.error(`Failed to push comments:`, error)
      toast.error(
        `Failed to push comments: ${error.response?.data?.error || error.message}`,
      )
    } finally {
      setIsPushing(false)
    }
  }

  if (taskIds.length === 0) return null

  return (
    <>
      <CanDo role="qa_engineer">
        <button
          onClick={handleButtonClick}
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
                {mode === 'comment' ? 'Pushing comments...' : `Pushing ${currentIndex} of ${taskIds.length}...`}
              </span>
            </>
          ) : pushedCount > 0 && !isPushing && mode === 'todo' ? (
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

      {/* Status Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => !isPushing && setIsModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-[12px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-lg tracking-tight">Select Status</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Basecamp Comment Workflow</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={isPushing}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex justify-center items-center gap-6">
                <button
                  onClick={() => setSelectedStatus('pending')}
                  disabled={isPushing}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all group ${
                    selectedStatus === 'pending' 
                      ? 'bg-amber-50 border-amber-200 shadow-md scale-105' 
                      : 'bg-white border-slate-100 hover:border-slate-200 grayscale opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedStatus === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Loader2 className={`w-5 h-5 ${selectedStatus === 'pending' && !isPushing ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${selectedStatus === 'pending' ? 'text-amber-600' : 'text-slate-400'}`}>
                    Pending
                  </span>
                </button>

                <button
                  onClick={() => setSelectedStatus('completed')}
                  disabled={isPushing}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all group ${
                    selectedStatus === 'completed' 
                      ? 'bg-emerald-50 border-emerald-200 shadow-md scale-105' 
                      : 'bg-white border-slate-100 hover:border-slate-200 grayscale opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedStatus === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${selectedStatus === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    Completed
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmCommentPush}
                  disabled={isPushing}
                  className="w-full btn-unified flex items-center justify-center space-x-2 py-3"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Pushing Updates...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Push as Comment</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPushing}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
