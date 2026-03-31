import { supabase } from './supabase';
import { decrypt } from './encryption';

export interface DecryptedSettings {
  project_id: string;
  figma_token: string | null;
  basecamp_token: string | null;
  basecamp_account_id: string | null;
  basecamp_project_id: string | null;
  basecamp_todolist_id: string | null;
  slack_webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches and decrypts all tokens for a project's settings.
 * This is intended for internal server use only.
 * @param projectId The UUID of the project
 * @returns A plain object with decrypted tokens
 */
export async function getProjectSettings(projectId: string): Promise<DecryptedSettings | null> {
  try {
    const { data, error } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No settings found
      }
      throw error;
    }

    if (!data) return null;

    // Decrypt figma_token if it exists
    let decryptedFigmaToken = data.figma_token;
    if (data.figma_token) {
      try {
        decryptedFigmaToken = decrypt(data.figma_token);
      } catch (e) {
        console.error(`Failed to decrypt figma_token for project ${projectId}:`, e);
        decryptedFigmaToken = null; // Or handle as error
      }
    }

    // Decrypt basecamp_token if it exists
    let decryptedBasecampToken = data.basecamp_token;
    if (data.basecamp_token) {
      try {
        decryptedBasecampToken = decrypt(data.basecamp_token);
      } catch (e) {
        console.error(`Failed to decrypt basecamp_token for project ${projectId}:`, e);
        decryptedBasecampToken = null; // Or handle as error
      }
    }

    return {
      ...data,
      figma_token: decryptedFigmaToken,
      basecamp_token: decryptedBasecampToken,
    };
  } catch (error) {
    console.error(`Error fetching decrypted settings for project ${projectId}:`, error);
    throw error;
  }
}
