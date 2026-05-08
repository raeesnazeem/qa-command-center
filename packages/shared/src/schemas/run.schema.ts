import { z } from 'zod';

export const RunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'timed_out', 'paused', 'cancelled']);

export const CreateRunSchema = z.object({
  project_id: z.string().uuid(),
  run_type: z.enum(['pre_release', 'post_release']),
  site_url: z.string().url(),
  figma_url: z.string().url().or(z.literal('')).nullable().optional(),
  enabled_checks: z.array(z.string()).default(['visual', 'functionality', 'performance', 'accessibility', 'seo']),
  is_woocommerce: z.boolean().default(false),
  device_matrix: z.array(z.enum(['desktop', 'tablet', 'mobile'])).default(['desktop', 'tablet', 'mobile']),
  selected_urls: z.array(z.string().url()).optional(),
});

export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
