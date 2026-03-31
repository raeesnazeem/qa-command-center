import { z } from 'zod';

export const TaskStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const TaskSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  finding_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  severity: TaskSeveritySchema.default('medium'),
  status: TaskStatusSchema.default('open'),
  assigned_to: z.string().uuid().optional().nullable(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  severity: TaskSeveritySchema.optional(),
  status: TaskStatusSchema.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskSeverity = z.infer<typeof TaskSeveritySchema>;
