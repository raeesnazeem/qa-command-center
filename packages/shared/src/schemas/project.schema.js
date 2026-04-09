"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProjectSchema = exports.CreateProjectSchema = void 0;
const zod_1 = require("zod");
exports.CreateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    site_url: zod_1.z.string().url('Invalid site URL'),
    client_name: zod_1.z.string().optional(),
    is_woocommerce: zod_1.z.boolean().default(false),
    is_pre_release: zod_1.z.boolean().default(false),
});
exports.UpdateProjectSchema = exports.CreateProjectSchema.partial().extend({
    status: zod_1.z.enum(['active', 'archived']).optional(),
    figma_access_token: zod_1.z.string().optional(),
    basecamp_account_id: zod_1.z.string().optional(),
    basecamp_project_id: zod_1.z.string().optional(),
    basecamp_todo_list_id: zod_1.z.string().optional(),
    basecamp_api_token: zod_1.z.string().optional(),
});
//# sourceMappingURL=project.schema.js.map