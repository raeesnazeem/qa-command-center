import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { clerkAuth } from '../middleware/clerkAuth';
import { requireRole } from '../middleware/requireRole';
import { logger } from '../lib/logger';

const router: Router = Router();

/**
 * PATCH /api/findings/:id/status
 * Update the status of a finding (confirmed, false_positive, open).
 */
router.patch('/:id/status', clerkAuth, requireRole('qa_engineer'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['confirmed', 'false_positive', 'open'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { data, error } = await supabase
      .from('findings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Finding not found' });

    return res.json(data);
  } catch (error: any) {
    logger.error({ findingId: id, error: error.message }, 'Error updating finding status');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/findings/:id
 * Update finding severity.
 */
router.patch('/:id', clerkAuth, requireRole('qa_engineer'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { severity } = req.body;

  if (severity && !['critical', 'high', 'medium', 'low'].includes(severity)) {
    return res.status(400).json({ error: 'Invalid severity' });
  }

  try {
    const { data, error } = await supabase
      .from('findings')
      .update({ severity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Finding not found' });

    return res.json(data);
  } catch (error: any) {
    logger.error({ findingId: id, error: error.message }, 'Error updating finding severity');
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/spelling-allowlist
 * Add a word to the project's spelling allowlist.
 * Note: This endpoint is grouped here as requested, though it acts on projects.
 */
router.post('/projects/:id/spelling-allowlist', clerkAuth, requireRole('qa_engineer'), async (req: Request, res: Response) => {
  const { id: project_id } = req.params;
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    // 1. Get current settings
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('project_settings')
      .eq('id', project_id)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const settings = project.project_settings || {};
    const allowlist = settings.spelling_allowlist || [];

    if (!allowlist.includes(word)) {
      allowlist.push(word);
    }

    // 2. Update settings
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        project_settings: {
          ...settings,
          spelling_allowlist: allowlist
        }
      })
      .eq('id', project_id);

    if (updateError) throw updateError;

    return res.json({ success: true, word });
  } catch (error: any) {
    logger.error({ project_id, error: error.message }, 'Error adding word to spelling allowlist');
    return res.status(500).json({ error: error.message });
  }
});

export { router as findingsRouter };
