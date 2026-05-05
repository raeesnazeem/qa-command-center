import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"
import { clerkAuth } from "../middleware/clerkAuth"
import { requireRole } from "../middleware/requireRole"
import { getProjectSettings } from "../lib/getDecryptedSettings"
import { createBasecampTodo, getBasecampPeople, getBasecampPerson, formatBasecampMention, createBasecampComment } from "../lib/basecampClient"
import { logger } from "../lib/logger"
import crypto from "crypto"

const router = Router()

/**
 * GET /api/basecamp/people
 * Fetch all people from Basecamp for a specific project.
 */
router.get(
  "/people",
  clerkAuth,
  async (req: Request, res: Response) => {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    try {
      const projectSettings = await getProjectSettings(projectId as string);
      
      if (!projectSettings || !projectSettings.basecamp_token || !projectSettings.basecamp_account_id) {
        return res.status(400).json({ error: "Basecamp not configured for this project" });
      }

      const people = await getBasecampPeople(
        projectSettings.basecamp_token,
        projectSettings.basecamp_account_id
      );

      return res.json(people);
    } catch (error: any) {
      console.error('[BasecampPeople] Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

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

    console.log(`[BasecampPush] Starting push for task ${id}`);

    try {
      // 1. Load task + finding
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*, findings:finding_id (*)")
        .eq("id", id)
        .single()

      if (taskError || !task) {
        console.error(`[BasecampPush] Task ${id} fetch error:`, taskError);
        return res.status(404).json({ error: "Task not found" })
      }

      // 2. Load page URL separately
      let findingUrl = "N/A"
      if (task.findings?.page_id) {
        const { data: page } = await supabase
          .from("pages")
          .select("url")
          .eq("id", task.findings.page_id)
          .single()
        if (page) findingUrl = page.url
      }

      // 3. Load assignee Basecamp mapping separately
      let assigneeIds: number[] = []
      if (task.assigned_to) {
        const { data: user } = await supabase
          .from("users")
          .select("basecamp_person_id")
          .eq("id", task.assigned_to)
          .maybeSingle()
        if (user?.basecamp_person_id) {
          assigneeIds = [Number(user.basecamp_person_id)]
        }
      }

      // 4. Load project state and settings
      const { data: projectRecord, error: projectError } = await supabase
        .from("projects")
        .select("is_pre_release, is_post_release")
        .eq("id", task.project_id)
        .single();

      if (projectError || !projectRecord) {
        console.error(`[BasecampPush] Project ${task.project_id} fetch error:`, projectError);
        return res.status(404).json({ error: "Project not found" });
      }

      const projectSettings = await getProjectSettings(task.project_id)
      if (
        !projectSettings ||
        !projectSettings.basecamp_token ||
        !projectSettings.basecamp_account_id ||
        !projectSettings.basecamp_project_id
      ) {
        console.warn(`[BasecampPush] Integration not configured for project ${task.project_id}`);
        return res.status(400).json({
          error: "Basecamp integration not configured for this project",
        })
      }

      // Determine the correct to-do list based on project state
      let todolistId = projectSettings.basecamp_todolist_id;
      
      if (projectRecord.is_post_release) {
        if (!projectSettings.basecamp_post_todolist_id) {
          return res.status(400).json({ error: "Post-release to-do list not configured" });
        }
        todolistId = projectSettings.basecamp_post_todolist_id;
      } else if (projectRecord.is_pre_release) {
        if (!projectSettings.basecamp_todolist_id) {
          return res.status(400).json({ error: "Pre-release to-do list not configured" });
        }
        todolistId = projectSettings.basecamp_todolist_id;
      }

      if (!todolistId) {
        return res.status(400).json({ error: "Basecamp to-do list not configured" });
      }

      console.log(`[BasecampPush] Data resolved:`, {
        assigneeIds,
        findingUrl
      });

      // 3.5 Fetch Basecamp People for SGIDs
      const mentionsList = await Promise.all(assigneeIds.map(async (id: number) => {
        const person = await getBasecampPerson(projectSettings.basecamp_token, projectSettings.basecamp_account_id, id);
        if (person && person.attachable_sgid) {
          return formatBasecampMention(person.attachable_sgid, person.name);
        }
        return `@${id}`; // Fallback to plain text if not found
      }));
      const mentions = mentionsList.join(" ");

      const description = `<div>${mentions}</div>
<br/>
• ${task.title}, Severity: ${task.severity}, URL: ${findingUrl}
<br/><br/>
Created via QA Command Center`.trim();

      // 5. Call Basecamp (Push as comment to Command Center)
      console.log(`[BasecampPush] FINAL Description before POST:`, description);
      console.log(`[BasecampPush] Calling Basecamp API: Create Comment...`);
      
      await createBasecampComment({
        token: projectSettings.basecamp_token,
        accountId: projectSettings.basecamp_account_id,
        projectId: projectSettings.basecamp_project_id || task.project_id,
        recordingId: todolistId,
        content: description
      });

      const basecampUrl = `https://3.basecamp.com/${projectSettings.basecamp_account_id}/buckets/${projectSettings.basecamp_project_id}/todolists/${todolistId}`;

      // 6. Update task in Supabase
      console.log(`[BasecampPush] 6/6 Updating task ${id} in Supabase with Basecamp info...`);
      const { data: updatedRows, error: updateError } = await supabase
        .from("tasks")
        .update({
          basecamp_task_id: todolistId,
          basecamp_url: basecampUrl,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select('id');

      if (updateError) {
        console.error('[BasecampPush] Supabase Update Error:', updateError);
        return res.json({ basecampUrl, warning: "Supabase update failed but Basecamp todo created" })
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.error(`[BasecampPush] CRITICAL: Task ${id} not updated in Supabase!`);
        return res.status(500).json({ 
          error: "Failed to update local task with Basecamp info. Task not found.",
          taskId: id 
        });
      }

      console.log(`[BasecampPush] Successfully updated task ${id} in Supabase.`);

      return res.json({ basecampUrl })
    } catch (error: any) {
      console.error('--- Basecamp Push FAILED ---');
      console.error('Task ID:', id);
      console.error('Error Message:', error.message);
      if (error.status || error.response?.status) {
        console.error('Status Code:', error.status || error.response?.status);
      }
      if (error.data || error.response?.data) {
        console.error('Response Body:', JSON.stringify(error.data || error.response?.data, null, 2));
      }
      logger.error(error, `Error pushing task ${id} to Basecamp`)
      return res.status(500).json({ 
        error: error.message,
        details: error.data || error.response?.data 
      })
    }
  },
)

/**
 * POST /api/tasks/basecamp/bulk-push
 * Push multiple tasks to a single Basecamp to-do.
 */
router.post(
  "/basecamp/bulk-push",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { taskIds } = req.body

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      console.error(`[BasecampBulkPush] Error: No task IDs provided in request body`);
      return res.status(400).json({ error: "No task IDs provided" })
    }

    console.log(`[BasecampBulkPush] >>> STARTING bulk push for ${taskIds.length} tasks`);
    console.log(`[BasecampBulkPush] Task IDs:`, taskIds);

    try {
      // 1. Load tasks + findings
      console.log(`[BasecampBulkPush] 1/6 Fetching tasks and findings from Supabase...`);
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, findings:finding_id (*)")
        .in("id", taskIds)

      if (tasksError) {
        console.error(`[BasecampBulkPush] Supabase Fetch Error:`, tasksError);
        return res.status(500).json({ error: "Database fetch failed", details: tasksError });
      }

      if (!tasks || tasks.length === 0) {
        console.error(`[BasecampBulkPush] Error: No tasks found for the provided IDs`);
        return res.status(404).json({ error: "Tasks not found" })
      }

      console.log(`[BasecampBulkPush] Found ${tasks.length} tasks in database.`);

      // 2. Load page URLs for all findings
      console.log(`[BasecampBulkPush] 2/6 Resolving page URLs for findings...`);
      const pageIds = Array.from(new Set(tasks.map(t => t.findings?.page_id).filter(Boolean)))
      console.log(`[BasecampBulkPush] Unique page IDs to resolve:`, pageIds);
      
      const { data: pages, error: pagesError } = await supabase
        .from("pages")
        .select("id, url")
        .in("id", pageIds)
      
      if (pagesError) {
        console.warn(`[BasecampBulkPush] Warning: Could not fetch some page URLs:`, pagesError);
      }
      
      const pageUrlMap = new Map(pages?.map(p => [p.id, p.url]) || [])

      // 3. Load assignee mappings for all tasks
      console.log(`[BasecampBulkPush] 3/6 Resolving assignee Basecamp mappings...`);
      const userIds = Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean)))
      console.log(`[BasecampBulkPush] Unique user IDs to map:`, userIds);

      const { data: userList, error: mappingError } = await supabase
        .from("users")
        .select("id, basecamp_person_id")
        .in("id", userIds)
      
      if (mappingError) {
        console.warn(`[BasecampBulkPush] Warning: Could not fetch user mappings:`, mappingError);
      }
      
      const userMappingMap = new Map(userList?.map(u => [u.id, u.basecamp_person_id]) || [])

      const projectId = tasks[0].project_id
      console.log(`[BasecampBulkPush] Resolving settings for project: ${projectId}`);
      // 3.5 Load project state
      const { data: projectRecord, error: projectRecordError } = await supabase
        .from("projects")
        .select("is_pre_release, is_post_release")
        .eq("id", projectId)
        .single();

      if (projectRecordError || !projectRecord) {
        console.error(`[BasecampBulkPush] Project ${projectId} fetch error:`, projectRecordError);
        return res.status(404).json({ error: "Project not found" });
      }

      const projectSettings = await getProjectSettings(projectId)
      
      console.log(`[BasecampBulkPush] 3/6.5 Project settings retrieved:`, {
        projectId,
        hasToken: !!projectSettings?.basecamp_token,
        accountId: projectSettings?.basecamp_account_id,
        basecampProjectId: projectSettings?.basecamp_project_id,
        preReleaseList: projectSettings?.basecamp_todolist_id,
        postReleaseList: projectSettings?.basecamp_post_todolist_id,
        isPreRelease: projectRecord.is_pre_release,
        isPostRelease: projectRecord.is_post_release
      });
      
      if (!projectSettings) {
        console.error(`[BasecampBulkPush] Error: No settings found for project ${projectId}`);
        return res.status(400).json({ error: "Integration settings not found" });
      }

      if (
        !projectSettings.basecamp_token ||
        !projectSettings.basecamp_account_id ||
        !projectSettings.basecamp_project_id
      ) {
        console.error(`[BasecampBulkPush] Error: Incomplete Basecamp configuration`, {
          hasToken: !!projectSettings.basecamp_token,
          hasAccount: !!projectSettings.basecamp_account_id,
          hasProject: !!projectSettings.basecamp_project_id
        });
        return res.status(400).json({
          error: "Basecamp integration not configured for this project",
        })
      }

      // Determine the correct to-do list based on project state
      let todolistId = projectSettings.basecamp_todolist_id;
      
      if (projectRecord.is_post_release) {
        if (!projectSettings.basecamp_post_todolist_id) {
          return res.status(400).json({ error: "Post-release to-do list not configured" });
        }
        todolistId = projectSettings.basecamp_post_todolist_id;
      } else if (projectRecord.is_pre_release) {
        if (!projectSettings.basecamp_todolist_id) {
          return res.status(400).json({ error: "Pre-release to-do list not configured" });
        }
        todolistId = projectSettings.basecamp_todolist_id;
      }

      if (!todolistId) {
        return res.status(400).json({ error: "Basecamp to-do list not configured" });
      }

      // Collect all unique assignee Basecamp IDs
      const allAssigneeIds = new Set<number>()
      userIds.forEach(uid => {
        const bpId = userMappingMap.get(uid)
        if (bpId) allAssigneeIds.add(Number(bpId))
      })

      const assigneeIdsArray = Array.from(allAssigneeIds)
      console.log(`[BasecampBulkPush] Resolved ${assigneeIdsArray.length} Basecamp assignees.`);

      // 3.7 Fetch Basecamp People for SGIDs
      const mentionsList = await Promise.all(assigneeIdsArray.map(async (id: number) => {
        const person = await getBasecampPerson(projectSettings.basecamp_token, projectSettings.basecamp_account_id, id);
        if (person && person.attachable_sgid) {
          return formatBasecampMention(person.attachable_sgid, person.name);
        }
        return `@${id}`;
      }));
      const mentions = mentionsList.join(" ");

      const findingsList = tasks.map((t: any) => {
        const findingUrl = t.findings?.page_id ? pageUrlMap.get(t.findings.page_id) : "N/A"
        return `• ${t.title}, Severity: ${t.severity}, URL: ${findingUrl || "N/A"}`
      }).join("<br/>")

      // 5. Push as comments to the target to-do (Command Center)
      console.log(`[BasecampBulkPush] 5/6 Pushing ${tasks.length} tasks as comments to target: ${todolistId}`);
      
      let successCount = 0;
      for (const task of tasks) {
        // Load assignee mapping for this specific task
        const taskAssigneeId = task.assigned_to ? userMappingMap.get(task.assigned_to) : null;
        let taskMentions = "";
        if (taskAssigneeId) {
          const person = await getBasecampPerson(projectSettings.basecamp_token, projectSettings.basecamp_account_id, Number(taskAssigneeId));
          if (person?.attachable_sgid) {
            taskMentions = formatBasecampMention(person.attachable_sgid, person.name);
          }
        }

        const taskFindingUrl = task.findings?.page_id ? pageUrlMap.get(task.findings.page_id) : "N/A";
        const taskCommentContent = `
          <div>${taskMentions}</div><br/>
          <strong>[NEW PUSH]</strong> ${task.title}<br/>
          Severity: ${task.severity}<br/>
          URL: ${taskFindingUrl || "N/A"}<br/><br/>
          Created via QA Command Center
        `.trim();

        try {
          await createBasecampComment({
            token: projectSettings.basecamp_token,
            accountId: projectSettings.basecamp_account_id,
            projectId: projectSettings.basecamp_project_id || projectId,
            recordingId: todolistId,
            content: taskCommentContent
          });
          successCount++;
        } catch (err: any) {
          console.error(`[BasecampBulkPush] Individual comment failed for task ${task.id}:`, err.message);
        }
      }

      // 6. Update all tasks in Supabase
      console.log(`[BasecampBulkPush] 6/6 Updating ${tasks.length} tasks in Supabase with target Basecamp ID...`);
      // Note: Since we are pushing to a shared to-do, we use its ID.
      // We don't have a unique URL for the comment yet, so we point to the parent.
      const basecampUrl = `https://3.basecamp.com/${projectSettings.basecamp_account_id}/buckets/${projectSettings.basecamp_project_id}/todolists/${todolistId}`;
      
      const { data: updatedRows, error: updateError } = await supabase
        .from("tasks")
        .update({
          basecamp_task_id: todolistId,
          basecamp_url: basecampUrl,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .in("id", taskIds)
        .select('id');

      if (updateError) {
        console.error('[BasecampBulkPush] Supabase Update Error:', updateError);
        return res.json({ basecampUrl, count: successCount, warning: "Supabase update failed" })
      }

      console.log(`[BasecampBulkPush] Successfully updated ${updatedRows.length} tasks in Supabase.`);
      console.log(`[BasecampBulkPush] <<< FINISHED bulk push successfully.`);
      return res.json({ basecampUrl, count: successCount })
    } catch (error: any) {
      console.error('--- [BasecampBulkPush] CRITICAL FAILURE ---');
      console.error('Error:', error.message);
      if (error.response?.data) {
        console.error('Basecamp API Error Data:', JSON.stringify(error.response.data, null, 2));
      }
      logger.error(error, `Error bulk pushing tasks to Basecamp`)
      return res.status(500).json({ 
        error: error.message,
        details: error.response?.data
      })
    }
  }
)

/**
 * POST /api/tasks/basecamp/bulk-comment
 * Push multiple tasks to their respective Basecamp to-dos as comments.
 */
router.post(
  "/basecamp/bulk-comment",
  clerkAuth,
  requireRole("qa_engineer"),
  async (req: Request, res: Response) => {
    const { taskIds, status: pushStatus } = req.body

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "No task IDs provided" })
    }

    try {
      // 1. Load tasks + findings + comments
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          comments (
            content,
            created_at
          )
        `)
        .in("id", taskIds)

      if (tasksError || !tasks || tasks.length === 0) {
        return res.status(404).json({ error: "Tasks not found" })
      }

      const projectId = tasks[0].project_id
      const projectSettings = await getProjectSettings(projectId)
      
      if (!projectSettings || !projectSettings.basecamp_token || !projectSettings.basecamp_account_id) {
        return res.status(400).json({ error: "Basecamp not configured for this project" })
      }

      // 3.4 Load assignee mappings for all tasks
      const userIds = Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean)))
      const { data: userList } = await supabase
        .from("users")
        .select("id, basecamp_person_id")
        .in("id", userIds)
      
      const userMappingMap = new Map(userList?.map(u => [u.id, u.basecamp_person_id]) || [])

      // 3.5 Load project state to select target to-do
      const { data: projectRecord, error: projectRecordError } = await supabase
        .from("projects")
        .select("is_pre_release, is_post_release")
        .eq("id", projectId)
        .single();

      if (projectRecordError || !projectRecord) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Determine the target recording ID (the Command Center)
      let targetRecordingId = projectSettings.basecamp_todolist_id;
      if (projectRecord.is_post_release && projectSettings.basecamp_post_todolist_id) {
        targetRecordingId = projectSettings.basecamp_post_todolist_id;
      } else if (projectRecord.is_pre_release && projectSettings.basecamp_todolist_id) {
        targetRecordingId = projectSettings.basecamp_todolist_id;
      }

      if (!targetRecordingId) {
        return res.status(400).json({ error: "Basecamp integration not fully configured for this project state" });
      }

      let successCount = 0;
      let skippedCount = 0;

      for (const task of tasks) {
        // Use task's own ID if it's already synced, otherwise use the project's target ID
        const recordingId = task.basecamp_task_id || targetRecordingId;

        // Resolve assignee mention
        const taskAssigneeId = task.assigned_to ? userMappingMap.get(task.assigned_to) : null;
        let taskMentions = "";
        if (taskAssigneeId) {
          const person = await getBasecampPerson(projectSettings.basecamp_token, projectSettings.basecamp_account_id, Number(taskAssigneeId));
          if (person?.attachable_sgid) {
            taskMentions = formatBasecampMention(person.attachable_sgid, person.name);
          }
        }

        // Format content
        const sortedComments = (task.comments || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const commentContent = `
          <div>${taskMentions}</div><br/>
          <div><strong>[${pushStatus.toUpperCase()}]</strong></div>
          <br/>
          <strong>${task.title}</strong>
          <br/>
          <div>${task.description || "No description provided."}</div>
          <br/>
          <strong>Task Comments:</strong>
          <ul>
            ${sortedComments.length > 0 
              ? sortedComments.map((c: any) => `<li>${c.content}</li>`).join("") 
              : "<li>No comments</li>"}
          </ul>
          <br/>
          <em>Pushed via QA Command Center</em>
        `.trim();

        try {
          await createBasecampComment({
            token: projectSettings.basecamp_token,
            accountId: projectSettings.basecamp_account_id,
            projectId: projectSettings.basecamp_project_id || projectId,
            recordingId: recordingId,
            content: commentContent
          });

          // Update task in Supabase to mark as synced
          if (!task.basecamp_task_id) {
            const basecampUrl = `https://3.basecamp.com/${projectSettings.basecamp_account_id}/buckets/${projectSettings.basecamp_project_id}/todolists/${recordingId}`;
            await supabase
              .from("tasks")
              .update({
                basecamp_task_id: recordingId,
                basecamp_url: basecampUrl,
                status: "in_progress",
                updated_at: new Date().toISOString()
              })
              .eq("id", task.id);
          }

          successCount++;
        } catch (err: any) {
          console.error(`[BasecampBulkComment] Failed for task ${task.id}:`, err.message);
          skippedCount++;
        }
      }

      return res.json({ 
        success: true, 
        count: successCount, 
        skipped: skippedCount 
      });
    } catch (error: any) {
      logger.error(error, "Error bulk pushing comments to Basecamp")
      return res.status(500).json({ 
        error: error.message,
        details: error.response?.data
      })
    }
  }
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
