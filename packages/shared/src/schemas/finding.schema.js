"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindingSchema = exports.FindingStatusSchema = exports.FindingSeveritySchema = void 0;
const zod_1 = require("zod");
exports.FindingSeveritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.FindingStatusSchema = zod_1.z.enum(['open', 'confirmed', 'false_positive']);
exports.FindingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    page_id: zod_1.z.string().uuid().optional(),
    run_id: zod_1.z.string().uuid().optional(),
    check_factor: zod_1.z.string(),
    severity: exports.FindingSeveritySchema,
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    context_text: zod_1.z.string().nullable().optional(),
    screenshot_url: zod_1.z.string().url().nullable().optional(),
    status: exports.FindingStatusSchema.default('open'),
    ai_generated: zod_1.z.boolean().default(false),
    created_at: zod_1.z.string().datetime().optional(),
    updated_at: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=finding.schema.js.map