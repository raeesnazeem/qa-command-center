import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"
import { clerkAuth } from "../middleware/clerkAuth"
import { requireRole } from "../middleware/requireRole"
import { getProjectSettings } from "../lib/getDecryptedSettings"
import { createBasecampTodo } from "../lib/basecampClient"
import { logger } from "../lib/logger"
import crypto from "crypto"

const router = Router()

/**
 * POST /api/tasks/:id/basecamp
 * Push a task to Basecamp as a to-do.
 */
router.post(
  "/:id/basecamp",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      // 1. Load task + finding + project settings + assignee Basecamp mapping
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select(
          `
          *,
          findings (*),
          basecamp_user_mappings (
            basecamp_person_id
          )
        `,
        )
        .eq("id", id)
        .single()

      if (taskError || !task) {
        return res.status(404).json({ error: "Task not found" })
      }

      const projectSettings = await getProjectSettings(task.project_id)
      if (
        !projectSettings ||
        !projectSettings.basecamp_token ||
        !projectSettings.basecamp_account_id ||
        !projectSettings.basecamp_project_id ||
        !projectSettings.basecamp_todolist_id
      ) {
        return res.status(400).json({
          error: "Basecamp integration not configured for this project",
        })
      }

      const finding = task.findings
      const severityBadge = severityToBadge(task.severity)

      // 2. Build rich description HTML
      const descriptionHtml = `
      <div>
        <p><strong>Severity:</strong> ${severityBadge}</p>
        <p><strong>Check Factor:</strong> ${finding?.check_factor || "N/A"}</p>
        <p><strong>Description:</strong> ${task.description}</p>
        <p><strong>Page URL:</strong> <a href="${finding?.url}">${finding?.url}</a></p>
        ${finding?.screenshot_url_desktop ? `<p><strong>Screenshot:</strong> <a href="${finding.screenshot_url_desktop}">View Screenshot</a></p>` : ""}
        <hr />
        <p><small>Created via QA Command Center</small></p>
      </div>
    `.trim()

      // Resolve Basecamp assignee ID from the mapping table
      const assigneeMapping = (task as any).basecamp_user_mappings?.[0]
      const assigneeId = assigneeMapping?.basecamp_person_id

      if (task.assigned_to && !assigneeId) {
        logger.warn(
          `Task ${id} is assigned to ${task.assigned_to}, but no Basecamp user mapping was found. Pushing without assignee.`,
        )
      }

      // 3. Call createBasecampTodo
      const { id: basecampTaskId, url: basecampUrl } = await createBasecampTodo({
        token: projectSettings.basecamp_token,
        accountId: projectSettings.basecamp_account_id,
        projectId: projectSettings.basecamp_project_id,
        todolistId: projectSettings.basecamp_todolist_id,
        title: task.title,
        description: descriptionHtml,
        assigneeId: assigneeId ? Number(assigneeId) : undefined,
      })

      // 4. Update task in Supabase
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          basecamp_task_id: basecampTaskId.toString(),
          basecamp_url: basecampUrl,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (updateError) throw updateError

      return res.json({ basecampUrl })
    } catch (error: any) {
      logger.error(error, `Error pushing task ${id} to Basecamp`)
      return res.status(500).json({ error: error.message })
    }
  },
)

/**
 * POST /webhooks/basecamp
 * Handle Basecamp webhooks.
 */
router.post("/basecamp", async (req: Request, res: Response) => {
  const signature = req.headers["x-basecamp-signature"] as string
  const secret = process.env.BASECAMP_WEBHOOK_SECRET

  if (!signature || !secret) {
    logger.warn("Basecamp webhook received without signature or secret")
    return res.status(401).json({ error: "Unauthorized" })
  }

  // req.body is a Buffer because we use express.raw for /webhooks in index.ts
  const hmac = crypto.createHmac("sha256", secret)
  const digest = hmac.update(req.body).digest("base64")

  if (digest !== signature) {
    logger.error("Basecamp webhook signature mismatch")
    return res.status(401).json({ error: "Invalid signature" })
  }

  try {
    const payload = JSON.parse(req.body.toString())
    const { kind, recording } = payload

    if (kind === "todo_completion") {
      const basecampTaskId = recording.id.toString()
      const userName = payload.creator?.name || "Unknown User"

      // 1. Find task by basecamp_task_id
      const { data: task, error: findError } = await supabase
        .from("tasks")
        .select("id")
        .eq("basecamp_task_id", basecampTaskId)
        .maybeSingle()

      if (findError || !task) {
        logger.info(
          `Basecamp todo completed, but no matching task found for ID: ${basecampTaskId}`,
        )
        return res.status(200).json({ received: true })
      }

      // 2. Update task status to 'resolved'
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id)

      if (updateError) throw updateError

      // 3. Add system comment
      await supabase.from("comments").insert({
        task_id: task.id,
        content: `Resolved via Basecamp by ${userName}`,
        author_id: null, // System comment
      })

      logger.info(`Task ${task.id} resolved via Basecamp webhook`)
    }

    return res.status(200).json({ received: true })
  } catch (error: any) {
    logger.error(error, "Error processing Basecamp webhook")
    return res.status(500).json({ error: "Internal server error" })
  }
})

function severityToBadge(severity: string): string {
  const colors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#3b82f6",
  }
  const color = colors[severity] || "#64748b"
  return `<span style="background-color: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${severity}</span>`
}

export const basecampIntegrationRouter: Router = router
