import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/clerkAuth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { supabase } from '../lib/supabase';
import { TOOL_DEFINITIONS } from '@qacc/ai';
import * as queries from '../tools/queries';
import * as mutations from '../tools/mutations';
import * as ragSearch from '../tools/ragSearch';
import { chatWithFallback } from '../lib/aiProviders';

import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/chat
 * RAG-based chatbot using Gemini 1.5 Flash and Supabase vector search.
 */
router.post('/', clerkAuth, aiRateLimiter, async (req: Request, res: Response) => {
  const { message, history, project_id, run_id } = req.body;
  const { orgId } = req.auth!;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const executeToolCall = async (name: string, args: any) => {
      logger.info({ name, args }, 'Executing tool call');
      switch (name) {
        case 'find_project': return await queries.findProjectByName(args.project_name, orgId);
        case 'get_project_stats': return await queries.getProjectStats(args.project_id);
        case 'get_task_stats': return await queries.getTaskStats(args.project_id);
        case 'get_developers': return await queries.getDevelopersForProject(args.project_id);
        case 'get_qa_engineers': return await queries.getQAForProject(args.project_id);
        case 'get_project_members': return await queries.getProjectMembers(args.project_id);
        case 'get_project_status': return await queries.getProjectPreReleaseStatus(args.project_id);
        case 'get_basecamp_link': return await queries.getProjectBasecampLink(args.project_id);
        case 'get_issues_by_developer': return await queries.getIssueCountsByDeveloper(args.project_id);
        case 'get_issues_by_qa': return await queries.getIssueCountsByQA(args.project_id);
        case 'get_all_users': return await queries.getAllOrgUsers(orgId);
        case 'find_user': return await queries.getUserByEmail(args.email, orgId);
        case 'find_user_by_name': return await queries.findUserByName(args.name, orgId);
        case 'get_user_tasks': return await queries.getTasksByUserId(args.user_id);
        case 'get_user_task_stats': return await queries.getUserTaskStats(args.user_id);
        case 'get_org_task_stats': return await queries.getOrgTaskStats(orgId);
        case 'list_projects': return await queries.listProjects(orgId);
        
        case 'create_project': return await mutations.createProject(args, orgId);
        case 'update_project': return await mutations.updateProject(args, orgId);
        case 'add_project_member': return await mutations.addProjectMember(args);
        case 'remove_project_member': return await mutations.removeProjectMember(args);
        case 'create_task': return await mutations.createTask(args, orgId);
        case 'update_task': return await mutations.updateTask(args, orgId);
        case 'delete_task': return await mutations.deleteTask(args);
        case 'update_finding': return await mutations.updateFinding(args, orgId);
        case 'delete_finding': return await mutations.deleteFinding(args);
        case 'update_user_role': return await mutations.updateUserRole(args);
        case 'create_qa_run': return await mutations.createRun(args);
        case 'cancel_qa_run': return await mutations.cancelRun(args);
        
        case 'search_issues': return await ragSearch.semanticSearch(args.query, orgId, args.project_id, args.source_type);
        
        default: throw new Error(`Unknown tool: ${name}`);
      }
    };

    const systemPrompt = `You are a concise QA assistant.
IMPORTANT MAPPINGS:
- "issues" = tasks
- "tasks for [user]" = tasks assigned to that user (use find_user_by_name then get_user_tasks)
- "how many [status] tasks for [user]" = status counts for a user (use find_user_by_name then get_user_task_stats)
- "how many [status] tasks" = status counts for the organization (use get_org_task_stats)
- "working on issues" = tasks assigned to developers (use get_issues_by_developer for project-wide or get_user_tasks for specific user)
- "who is working on" = show developers with their task counts
- "resolved/to-do/in-progress/closed" = task statuses

ENTITY DISCOVERY:
- If a project name is mentioned, ALWAYS call find_project FIRST to get the project_id.
- If a person's name is mentioned, ALWAYS call find_user_by_name FIRST to get the user_id.
- If it's ambiguous whether a name refers to a project or a user, try find_project first. If it returns no results, try find_user_by_name.

RULES:
- After finding an entity (project or user), extract the id field and use it in subsequent tool calls.
- Once you have the data you need, STOP calling tools and write your final answer.
- Keep responses short and focused.`;

    const fullHistory = history || [];
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...fullHistory,
      { role: 'user', content: message }
    ];

    const result = await chatWithFallback(formattedMessages as any, TOOL_DEFINITIONS, executeToolCall);

    // Stream the final response using SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Simulate streaming for better UX
    const chunks = (result.content || '').split(' ');
    for (const chunk of chunks) {
      res.write(`data: ${chunk} \n\n`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    logger.error({ error: error.message }, 'Error in chat route');
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to process chat message' });
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});


export const chatRouter: Router = router;
