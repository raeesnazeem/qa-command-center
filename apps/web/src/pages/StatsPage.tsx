import React, { useState } from "react"
import { useLeaderboardStats } from "../hooks/useStats"
import MonthYearFilter from "../components/Stats/MonthYearFilter"
import TopPerformerCard from "../components/Stats/TopPerformerCard"
import DeveloperLeaderboard from "../components/Stats/DeveloperLeaderboard"
import QALeaderboard from "../components/Stats/QALeaderboard"
import { Loader2, Award } from "lucide-react"

const StatsPage: React.FC = () => {
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString()

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)

  const { data, isLoading, isError } = useLeaderboardStats(year, month)

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Performance Leaderboard
          </h1>
          <p className="text-slate-500 text-sm">
            Track and compare engineering performance metrics across the
            organization.
          </p>
        </div>
        <MonthYearFilter
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
          <Loader2 size={40} className="animate-spin text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Calculating Rankings...
          </span>
        </div>
      ) : isError ? (
        <div className="h-64 flex items-center justify-center text-red-500 font-bold uppercase text-xs tracking-widest border border-slate-200 rounded-md bg-white shadow-sm">
          Failed to load statistics. Please try again.
        </div>
      ) : (
        <>
          {/* Spotlight Section */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Spotlight: Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data?.topPerformers.developer ? (
                <TopPerformerCard
                  name={data.topPerformers.developer.name}
                  role="developer"
                  genuineCount={data.topPerformers.developer.count}
                />
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-10 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  No Top Developer Found
                </div>
              )}
              {data?.topPerformers.qa ? (
                <TopPerformerCard
                  name={data.topPerformers.qa.name}
                  role="qa_engineer"
                  genuineCount={data.topPerformers.qa.count}
                />
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-10 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  No Top QA Found
                </div>
              )}
            </div>
          </div>

          {/* Rankings Section */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Developer Rankings
              </h2>
              <DeveloperLeaderboard
                data={data?.leaderboards.developers || []}
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                QA Rankings
              </h2>
              <QALeaderboard data={data?.leaderboards.qas || []} />
            </div>
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="pt-6 flex flex-col md:flex-row justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Metrics updated in real-time based on resolved tasks</span>
        </div>
        <span>
          Filter: {year === "all" ? "All Years" : year} /{" "}
          {month === "all" ? "All Months" : `Month ${month}`}
        </span>
      </div>
    </div>
  )
}

export default StatsPage
