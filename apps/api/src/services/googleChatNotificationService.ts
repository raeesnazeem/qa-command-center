import { supabase } from '../lib/supabase';
import { sendGoogleChatMessage, buildIssueNotificationCard } from '../lib/googleChatClient';
import { getProjectSettings } from '../lib/getDecryptedSettings';
import { logger } from '../lib/logger';

interface NotificationParams {
  taskId: string;
  projectId: string;
  issueNumber: number;
  projectName: string;
  issueHeading: string;
  findingsUrl: string;
  assignedUserIds: string[];
}

/**
 * Send Google Chat notification to assigned developers with @mentions
 */
export async function notifyOnGoogleChat(
  params: NotificationParams
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // 1. Get project-level webhook configuration
    const projectSettings = await getProjectSettings(params.projectId);

    const projectWebhookUrl = projectSettings?.google_chat_webhook_url;
    const notificationsEnabled = projectSettings?.google_chat_enabled ?? false;

    if (!notificationsEnabled || !projectWebhookUrl) {
      logger.info(`[GoogleChatNotification] Google Chat notifications disabled or no webhook for project ${params.projectId}`);
      return { success: true, errors: [] };
    }

    // 2. Get assigned users' Google Chat IDs for tagging
    if (!params.assignedUserIds || params.assignedUserIds.length === 0) {
      logger.warn(`[GoogleChatNotification] No assigned users for task ${params.taskId}, skipping tagging`);
      // We can still send the notification without tags if desired, or skip. 
      // The doc says "only if anyone's tagged", so let's send it anyway but without mentions.
    }

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, google_chat_user_id')
      .in('id', params.assignedUserIds);

    if (userError) {
      logger.error(`[GoogleChatNotification] Failed to fetch users: ${userError.message}`);
      // Non-blocking error, we continue with empty tag list
    }

    const tagIds = users
      ?.map(u => u.google_chat_user_id)
      .filter((id): id is string => !!id) || [];

    // 3. Build the notification card and message
    const message = buildIssueNotificationCard({
      issueNumber: params.issueNumber,
      projectName: params.projectName,
      issueHeading: params.issueHeading,
      findingsUrl: params.findingsUrl,
      tagIds: tagIds
    });

    // 4. Send to project webhook
    await sendGoogleChatMessage(projectWebhookUrl, message);

    logger.info(`[GoogleChatNotification] Sent notification for issue #${params.issueNumber} to project webhook`);

    return { success: true, errors: [] };

  } catch (error: any) {
    logger.error(`[GoogleChatNotification] Error: ${error.message}`);
    errors.push(error.message);
    return { success: false, errors };
  }
}
