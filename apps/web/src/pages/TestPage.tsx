import React, { useState, useEffect } from "react"
import { useAuth, useUser } from "@clerk/react"
import { useAuthAxios } from "@/lib/useAuthAxios"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

/**
 * DAY 1 INTEGRATION VERIFICATION CHECKLIST
 *
 * [ ] Clerk login page loads at /login
 * [ ] After login, redirected to /dashboard
 * [ ] /test page shows valid userId
 * [ ] JWT token shown (not empty)
 * [ ] /api/health returns { status: 'ok' } with JWT
 * [ ] /api/me returns user row with role: 'developer' (or 'super_admin' if first user)
 * [ ] User row exists in Supabase users table (check Supabase Dashboard)
 * [ ] RLS prevents access without JWT (test with curl without Authorization header — should get 401)
 */

export const TestPage = () => {
  const { isLoaded, userId, getToken } = useAuth()
  const { user } = useUser()
  const axios = useAuthAxios()

  const [token, setToken] = useState<string | null>(null)
  const [healthRes, setHealthRes] = useState<any>(null)
  const [meRes, setMeRes] = useState<any>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [loadingMe, setLoadingMe] = useState(false)

  useEffect(() => {
    const fetchToken = async () => {
      if (isLoaded && userId) {
        const t = await getToken()
        setToken(t)
      }
    }
    fetchToken()
  }, [isLoaded, userId, getToken])

  const testHealth = async () => {
    setLoadingHealth(true)
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/health`)
      setHealthRes({ success: true, data: res.data })
    } catch (err: any) {
      setHealthRes({ success: false, error: err.message })
    } finally {
      setLoadingHealth(false)
    }
  }

  const testMe = async () => {
    setLoadingMe(true)
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/me`)
      setMeRes({ success: true, data: res.data })
    } catch (err: any) {
      setMeRes({ success: false, error: err.message })
    } finally {
      setLoadingMe(false)
    }
  }

  const copyFullToken = async () => {
    const fullToken = await getToken()
    if (fullToken) {
      await navigator.clipboard.writeText(fullToken)
      alert("Full JWT copied to clipboard!")
    }
  }

  if (!isLoaded) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin" /> Loading Clerk...
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Day 1 Integration Test
        </h1>
        <p className="text-slate-500">
          Verify end-to-end connectivity between Web, Auth, API, and Database.
        </p>
      </header>

      {/* Clerk Info */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">1. Clerk Auth State</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border">
            <span className="font-medium">User ID:</span>
            <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
              {userId || "Not Logged In"}
            </code>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border">
            <span className="font-medium">JWT Token (First 50 chars):</span>
            <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded break-all">
              {token ? `${token.substring(0, 50)}...` : "No Token"}
            </code>
          </div>
          <div className="flex items-center gap-2">
            {userId ? (
              <CheckCircle2 className="text-green-500" />
            ) : (
              <XCircle className="text-red-500" />
            )}
            <span
              className={
                userId
                  ? "text-green-700 font-medium"
                  : "text-red-700 font-medium"
              }
            >
              {userId ? "Authenticated via Clerk" : "Not Authenticated"}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between items-center">
              <strong>JWT Token (First 50):</strong>
              <button
                onClick={copyFullToken}
                className="bg-navy text-white text-[10px] px-2 py-1 rounded"
              >
                Copy Full Token
              </button>
            </div>
            <code className="block bg-slate-100 p-2 mt-1 break-all rounded border text-xs">
              {token ? `${token.substring(0, 50)}...` : "No token found"}
            </code>
          </div>{" "}
        </div>
      </section>

      {/* API Health */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          2. API Connectivity (/health)
        </h2>
        <div className="space-y-4">
          <button
            onClick={testHealth}
            disabled={loadingHealth}
            className="bg-navy text-white px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingHealth && <Loader2 className="animate-spin size-4" />}
            Test API /health
          </button>

          {healthRes && (
            <div
              className={`p-4 rounded border flex items-start gap-3 ${healthRes.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              {healthRes.success ? (
                <CheckCircle2 className="text-green-500 shrink-0" />
              ) : (
                <XCircle className="text-red-500 shrink-0" />
              )}
              <div>
                <p
                  className={`font-bold ${healthRes.success ? "text-green-800" : "text-red-800"}`}
                >
                  {healthRes.success ? "Success" : "Failed"}
                </p>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(healthRes.data || healthRes.error, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Database Sync */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          3. Database Sync (/api/me)
        </h2>
        <div className="space-y-4">
          <button
            onClick={testMe}
            disabled={loadingMe}
            className="bg-navy text-white px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMe && <Loader2 className="animate-spin size-4" />}
            Test /api/me
          </button>

          {meRes && (
            <div
              className={`p-4 rounded border flex items-start gap-3 ${meRes.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              {meRes.success ? (
                <CheckCircle2 className="text-green-500 shrink-0" />
              ) : (
                <XCircle className="text-red-500 shrink-0" />
              )}
              <div>
                <p
                  className={`font-bold ${meRes.success ? "text-green-800" : "text-red-800"}`}
                >
                  {meRes.success
                    ? "Success - User Sync Verified"
                    : "Failed - Sync Issues"}
                </p>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(meRes.data || meRes.error, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
