"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRunSchema = exports.RunStatusSchema = void 0;
const zod_1 = require("zod");
exports.RunStatusSchema = zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'timed_out', 'paused', 'cancelled']);
exports.CreateRunSchema = zod_1.z.object({
    project_id: zod_1.z.string().uuid(),
    run_type: zod_1.z.enum(['pre_release', 'post_release']),
    site_url: zod_1.z.string().url(),
    figma_url: zod_1.z.string().url().or(zod_1.z.literal('')).nullable().optional(),
    enabled_checks: zod_1.z.array(zod_1.z.string()).default(['visual', 'functionality', 'performance', 'accessibility', 'seo']),
    is_woocommerce: zod_1.z.boolean().default(false),
    device_matrix: zod_1.z.array(zod_1.z.enum(['desktop', 'tablet', 'mobile'])).default(['desktop', 'tablet', 'mobile']),
    selected_urls: zod_1.z.array(zod_1.z.string().url()).optional(),
});
//# sourceMappingURL=run.schema.js.map