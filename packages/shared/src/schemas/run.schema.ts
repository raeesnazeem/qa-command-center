import { z } from 'zod';

export const CreateRunSchema = z.object({
  project_id: z.string().uuid(),
  run_type: z.enum(['pre_release', 'post_release']),
  site_url: z.string().url(),
  figma_url: z.string().url().optional().nullable(),
  enabled_checks: z.array(z.string()).default([]),
  is_woocommerce: z.boolean().default(false),
});

export type CreateRunInput = z.infer<typeof CreateRunSchema>;
