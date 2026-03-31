import { z } from 'zod';

export const RunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'timed_out']);

export const CreateRunSchema = z.object({
  project_id: z.string().uuid(),
  run_type: z.enum(['pre_release', 'post_release']),
  site_url: z.string().url(),
  figma_url: z.string().url().optional().nullable(),
  enabled_checks: z.array(z.string()).default(['visual', 'functionality', 'performance', 'accessibility', 'seo']),
  is_woocommerce: z.boolean().default(false),
  device_matrix: z.array(z.enum(['desktop', 'tablet', 'mobile'])).default(['desktop', 'tablet', 'mobile']),
});

export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
