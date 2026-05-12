import axios from 'axios';
import { logger } from './logger';

const pkg = require('../../package.json');

interface GoogleChatCard {
  cardId: string;
  card: {
    header?: {
      title: string;
      subtitle?: string;
      imageUrl?: string;
      imageType?: 'CIRCLE' | 'SQUARE';
    };
    sections?: Array<{
      header?: string;
      widgets?: Array<any>;
    }>;
  };
}

interface GoogleChatMessage {
  cardsV2?: GoogleChatCard[];
  text?: string;
}

/**
 * Send a message to a Google Chat space via webhook
 */
export async function sendGoogleChatMessage(
  webhookUrl: string,
  message: GoogleChatMessage
): Promise<void> {
  if (!webhookUrl) {
    logger.warn('[GoogleChat] No webhook URL provided, skipping notification');
    return;
  }

  try {
    const response = await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Google Chat webhook failed: ${response.status}`);
    }

    logger.info('[GoogleChat] Message sent successfully');
  } catch (error: any) {
    logger.error(`[GoogleChat] Error sending message: ${error.message}`);
    throw error;
  }
}

/**
 * Build a formatted notification card for new issue assignment
 */
export function buildIssueNotificationCard(params: {
  issueNumber: number;
  projectName: string;
  issueHeading: string;
  findingsUrl: string;
  tagIds: string[];
}): GoogleChatMessage {
  const { issueNumber, projectName, issueHeading, findingsUrl, tagIds } = params;

  // Create mentions string: <users/12345> <users/67890>
  const mentions = tagIds.map(id => `<users/${id}>`).join(' ');

  return {
    // We include the text field for the @mentions to trigger notifications
    text: mentions ? `Attention: ${mentions}` : undefined,
    cardsV2: [
      {
        cardId: `issue-${issueNumber}-${Date.now()}`,
        card: {
          header: {
            title: '🔔 New Issue Assigned',
            subtitle: projectName,
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `<b>Issue #${issueNumber}</b><br>${issueHeading}`,
                  },
                },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'View in Tool',
                        onClick: {
                          openLink: {
                            url: findingsUrl,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}
