import React from "react"
import { LeaderboardEntry } from "../../hooks/useStats"

interface QALeaderboardProps {
  data: LeaderboardEntry[]
}

const QALeaderboard: React.FC<QALeaderboardProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Rank
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Name
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Total Reported
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Rebuttals Received
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Genuine Issues
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-slate-50/50 transition-colors ${
                  item.rank === 1 ? "bg-slate-50/50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-black ${
                      item.rank === 1
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                    {item.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium text-slate-600">
                    {item.issues}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium text-slate-600">
                    {item.rebuttals}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-black text-black">
                    {item.genuine}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest"
                >
                  No rankings available for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default QALeaderboard
