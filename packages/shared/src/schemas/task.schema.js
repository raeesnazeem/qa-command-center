"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RebuttalSchema = exports.CreateCommentSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.TaskSeveritySchema = exports.TaskStatusSchema = void 0;
const zod_1 = require("zod");
exports.TaskStatusSchema = zod_1.z.enum(['open', 'in_progress', 'resolved', 'closed']);
exports.TaskSeveritySchema = zod_1.z.enum(['critical', 'high', 'medium', 'low']);
exports.CreateTaskSchema = zod_1.z.object({
    finding_id: zod_1.z.string().uuid().optional(),
    project_id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    severity: exports.TaskSeveritySchema,
    assigned_to: zod_1.z.string().uuid().optional(),
});
exports.UpdateTaskSchema = exports.CreateTaskSchema.partial().extend({
    status: exports.TaskStatusSchema.optional(),
});
exports.CreateCommentSchema = zod_1.z.object({
    task_id: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});
exports.RebuttalSchema = zod_1.z.object({
    task_id: zod_1.z.string().uuid(),
    text: zod_1.z.string().min(1, 'Rebuttal text is required'),
    screenshot_url: zod_1.z.string().url().optional(),
});
//# sourceMappingURL=task.schema.js.map