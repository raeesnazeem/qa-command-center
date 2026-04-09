import { z } from 'zod';
export declare const TaskStatusSchema: z.ZodEnum<["open", "in_progress", "resolved", "closed"]>;
export declare const TaskSeveritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export declare const CreateTaskSchema: z.ZodObject<{
    finding_id: z.ZodOptional<z.ZodString>;
    project_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
    assigned_to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project_id: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    finding_id?: string | undefined;
    assigned_to?: string | undefined;
}, {
    project_id: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    finding_id?: string | undefined;
    assigned_to?: string | undefined;
}>;
export declare const UpdateTaskSchema: z.ZodObject<{
    finding_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    project_id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    assigned_to: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["open", "in_progress", "resolved", "closed"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "open" | "in_progress" | "resolved" | "closed" | undefined;
    project_id?: string | undefined;
    finding_id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    severity?: "critical" | "high" | "medium" | "low" | undefined;
    assigned_to?: string | undefined;
}, {
    status?: "open" | "in_progress" | "resolved" | "closed" | undefined;
    project_id?: string | undefined;
    finding_id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    severity?: "critical" | "high" | "medium" | "low" | undefined;
    assigned_to?: string | undefined;
}>;
export declare const CreateCommentSchema: z.ZodObject<{
    task_id: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    task_id: string;
    content: string;
}, {
    task_id: string;
    content: string;
}>;
export declare const RebuttalSchema: z.ZodObject<{
    task_id: z.ZodString;
    text: z.ZodString;
    screenshot_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    task_id: string;
    screenshot_url?: string | undefined;
}, {
    text: string;
    task_id: string;
    screenshot_url?: string | undefined;
}>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type RebuttalInput = z.infer<typeof RebuttalSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskSeverity = z.infer<typeof TaskSeveritySchema>;
//# sourceMappingURL=task.schema.d.ts.map