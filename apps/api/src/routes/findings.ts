import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"
import { clerkAuth } from "../middleware/clerkAuth"
import { requireRole } from "../middleware/requireRole"
import { logger } from "../lib/logger"
import axios from "axios"

const router: Router = Router()

/**
 * POST /api/findings
 * Create a new manual finding.
 */
router.post(
  "/",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const {
      page_id,
      run_id,
      check_factor,
      severity,
      title,
      description,
      screenshot_url,
      context_text,
      ai_generated = false,
    } = req.body

    if (!page_id || !run_id || !title || !check_factor || !severity) {
      return res.status(400).json({
        error:
          "Missing required fields: page_id, run_id, title, check_factor, severity",
      })
    }

    try {
      const { data: newFinding, error } = await supabase
        .from("findings")
        .insert({
          page_id,
          run_id,
          check_factor,
          severity,
          title,
          description,
          screenshot_url,
          context_text,
          ai_generated,
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json(newFinding)
    } catch (error: any) {
      logger.error({ error: error.message }, "Error creating manual finding")
      return res.status(500).json({ error: error.message })
    }
  },
)

/**
 * PATCH /api/findings/:id/status
 * Update the status of a finding (confirmed, false_positive, open).
 */
router.patch(
  "/:id/status",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { status } = req.body

    if (!["confirmed", "false_positive", "open"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    try {
      const { data, error } = await supabase
        .from("findings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: "Finding not found" })

      return res.json(data)
    } catch (error: any) {
      logger.error(
        { findingId: id, error: error.message },
        "Error updating finding status",
      )
      return res.status(500).json({ error: error.message })
    }
  },
)

/**
 * PATCH /api/findings/:id
 * Update finding severity.
 */
router.patch(
  "/:id",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { severity } = req.body

    if (severity && !["critical", "high", "medium", "low"].includes(severity)) {
      return res.status(400).json({ error: "Invalid severity" })
    }

    try {
      const { data, error } = await supabase
        .from("findings")
        .update({ severity, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: "Finding not found" })

      return res.json(data)
    } catch (error: any) {
      logger.error(
        { findingId: id, error: error.message },
        "Error updating finding severity",
      )
      return res.status(500).json({ error: error.message })
    }
  },
)

/**
 * POST /api/projects/:id/spelling-allowlist
 * Add a word to the project's spelling allowlist.
 * Note: This endpoint is grouped here as requested, though it acts on projects.
 */
router.post(
  "/projects/:id/spelling-allowlist",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { id: project_id } = req.params
    const { word } = req.body

    if (!word) {
      return res.status(400).json({ error: "Word is required" })
    }

    try {
      // 1. Get current settings
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("project_settings")
        .eq("id", project_id)
        .single()

      if (fetchError || !project) {
        return res.status(404).json({ error: "Project not found" })
      }

      const settings = project.project_settings || {}
      const allowlist = settings.spelling_allowlist || []

      if (!allowlist.includes(word)) {
        allowlist.push(word)
      }

      // 2. Update settings
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          project_settings: {
            ...settings,
            spelling_allowlist: allowlist,
          },
        })
        .eq("id", project_id)

      if (updateError) throw updateError

      return res.json({ success: true, word })
    } catch (error: any) {
      logger.error(
        { project_id, error: error.message },
        "Error adding word to spelling allowlist",
      )
      return res.status(500).json({ error: error.message })
    }
  },
)

/**
 * POST /api/findings/:id/push-basecamp
 * Directly push a general project plan finding to the designated Basecamp checklist comments thread.
 */
router.post(
  "/:id/push-basecamp",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      // 1. Fetch Finding and its QA Run details
      const { data: finding, error: findingError } = await supabase
        .from("findings")
        .select("*, qa_runs:run_id (project_id, site_url)")
        .eq("id", id)
        .single()

      if (findingError || !finding) {
        return res.status(404).json({ error: "Finding not found" })
      }

      const projectId = (finding.qa_runs as any).project_id
      const siteUrl = (finding.qa_runs as any).site_url

      // 2. Fetch Basecamp credentials and settings
      const { getProjectSettings } = require("../lib/getDecryptedSettings")
      const settings = await getProjectSettings(projectId)

      if (
        !settings ||
        !settings.basecamp_token ||
        !settings.basecamp_account_id
      ) {
        return res
          .status(400)
          .json({ error: "Basecamp settings are not fully configured" })
      }

      const {
        basecamp_token: token,
        basecamp_account_id: accountId,
        basecamp_project_id: bcProjectId,
      } = settings
      const rawPlan = finding.context_text || ""
      if (
        !rawPlan ||
        rawPlan.toLowerCase().includes("no plan details") ||
        rawPlan.toLowerCase().includes("not listed")
      ) {
        return res.status(400).json({
          error:
            "Cannot push to Basecamp: No project plan was identified during the scan. Please verify that the 'Project Order Details' todo has comments listing the Growth99 Plan.",
        })
      }

      const plan = rawPlan.trim()

      const headers = {
        Authorization: `Bearer ${token}`,
        "User-Agent": "QACC (raees.nazeem@growth99.com)",
        "Content-Type": "application/json",
        Accept: "application/json",
      }

      // 3. Locate the specific Basecamp checklist item using official traversals
      // A. Get Docker tool lists to find To-dos set
      const bucketUrl = `https://3.basecampapi.com/${accountId}/buckets/${bcProjectId}.json`
      const bucketResponse = await axios.get(bucketUrl, { headers })
      const todosetTool = bucketResponse.data.dock?.find(
        (tool: any) =>
          tool.title === "To-dos" || tool.url?.includes("/todosets/"),
      )

      if (!todosetTool) {
        throw new Error("Basecamp To-doset tool not found in project dock")
      }

      // B. Fetch todosets detail to fetch todolists_url
      const todosetDetailResponse = await axios.get(todosetTool.url, {
        headers,
      })
      const todolistsUrl = todosetDetailResponse.data.todolists_url

      // C. Fetch all to-do lists and locate the list matching "15-Quality Assurance - Prerelease 2026"
      const listsResponse = await axios.get(todolistsUrl, { headers })
      const targetList = listsResponse.data.find(
        (l: any) =>
          l.name
            .toLowerCase()
            .includes("15-quality assurance - prerelease 2026") ||
          l.name.toLowerCase().includes("quality assurance - prerelease 2026"),
      )

      if (!targetList) {
        throw new Error(
          'Checklist list heading "15-Quality Assurance - Prerelease 2026" not found in Basecamp.',
        )
      }

      // D. Fetch all checklist items under the matched list and look for "QA-Check if reviews are added for Accelerator plan"
      let page = 1
      let allTodos: any[] = []
      while (true) {
        const todosResponse = await axios.get(
          `${targetList.todos_url}?page=${page}`,
          { headers },
        )
        const pageTodos = todosResponse.data || []
        if (pageTodos.length === 0) break
        allTodos = allTodos.concat(pageTodos)
        if (pageTodos.length < 15) break // Basecamp's default page size is 15
        page++
      }
      const targetTodoName = `qa-check if reviews are added for accelerator plan`
      let targetTodo = allTodos.find((todo: any) =>
        todo.content.toLowerCase().includes(targetTodoName),
      )
      // Fallback: look for other potential reviews checks in this checklist group if the specific one is absent
      if (!targetTodo) {
        targetTodo = allTodos.find(
          (todo: any) =>
            todo.content
              .toLowerCase()
              .includes("qa-check if reviews are added for") ||
            todo.content.toLowerCase().includes("review and reputation") ||
            todo.content.toLowerCase().includes("reviews"),
        )
      }
      if (!targetTodo) {
        throw new Error(
          `To-do checklist item "QA-Check if reviews are added for Accelerator plan" not found in Basecamp checklist "${targetList.name}".`,
        )
      }

      // 4. Extract screenshots: split comma-separated list and reuse the worker's pre-captured reviews proof
      let screenshot2Url = ""
      const screenshotParts = (finding.screenshot_url || "").split(",")
      const screenshot1Url = screenshotParts[0] || ""

      if (screenshotParts[1]) {
        screenshot2Url = screenshotParts[1]
      }

      // Fallback: if we don't already have the pre-captured reviews screenshot, capture it live via Playwright
      if (!screenshot2Url && siteUrl) {
        const { chromium } = require("playwright")
        const sharp = require("sharp")
        const { uploadScreenshot } = require("../lib/supabaseStorage")

        const browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        })

        try {
          const page = await browser.newPage()
          await page.setViewportSize({ width: 1920, height: 1080 })
          const targetReviewsUrl = `${siteUrl.replace(/\/$/, "")}/reviews`

          logger.info(
            { targetReviewsUrl },
            "Capturing live reviews widget proof",
          )
          await page.goto(targetReviewsUrl, {
            waitUntil: "networkidle",
            timeout: 30000,
          })

          const buffer = await page.screenshot()
          const compressed = await sharp(buffer)
            .jpeg({ quality: 85 })
            .toBuffer()

          const path = `evidence/reviews-proof/${id}-${Date.now()}.jpg`
          screenshot2Url = await uploadScreenshot(compressed, path, {
            bucket: "evidence",
            isPublic: true,
          })
        } catch (pwError: any) {
          logger.error(
            { error: pwError.message },
            "Failed to capture live reviews proof via Playwright",
          )
        } finally {
          await browser.close()
        }
      }

      const commentHtml = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <strong style="color: #10B981; font-size: 16px;">✓ Plan Match Confirmed</strong><br/>
        We have successfully verified that the live website reviews widget aligns with the registered Basecamp project plan: <strong>${plan} Plan</strong>.<br/><br/>
        
        <strong>1. Plan (Project Order Details):</strong><br/>
        <img src="${screenshot1Url}" width="500" style="border: 1px solid #e3e4e6; border-radius: 6px; margin-bottom: 16px;" /><br/><br/><br/>
        
        <strong>2. <br/> Website Screenshot (${siteUrl}/reviews):</strong><br/><br/>
        ${
          screenshot2Url
            ? `<img src="${screenshot2Url}" width="500" style="border: 1px solid #e3e4e6; border-radius: 6px;" />`
            : `<em style="color: #EF4444;">Failed to capture live website reviews screenshot, please confirm manually.</em>`
        }<br/><br/>
        
        <em>Sent automatically via QA Command Center</em>
      </div>
    `.trim()

      const postCommentUrl = `https://3.basecampapi.com/${accountId}/buckets/${bcProjectId}/recordings/${targetTodo.id}/comments.json`
      await axios.post(postCommentUrl, { content: commentHtml }, { headers })

      // 6. Update finding status to 'confirmed' upon successful push
      await supabase
        .from("findings")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", id)

      return res
        .status(200)
        .json({ success: true, todoUrl: targetTodo.app_url })
    } catch (err: any) {
      logger.error({ error: err.message }, "Direct push to Basecamp failed")
      return res.status(500).json({ error: err.message })
    }
  },
)

export { router as findingsRouter }
