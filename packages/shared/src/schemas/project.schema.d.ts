import { z } from 'zod';
export declare const CreateProjectSchema: z.ZodObject<{
    name: z.ZodString;
    site_url: z.ZodString;
    client_name: z.ZodOptional<z.ZodString>;
    is_woocommerce: z.ZodDefault<z.ZodBoolean>;
    is_pre_release: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    site_url: string;
    is_woocommerce: boolean;
    is_pre_release: boolean;
    client_name?: string | undefined;
}, {
    name: string;
    site_url: string;
    client_name?: string | undefined;
    is_woocommerce?: boolean | undefined;
    is_pre_release?: boolean | undefined;
}>;
export declare const UpdateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    site_url: z.ZodOptional<z.ZodString>;
    client_name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    is_woocommerce: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    is_pre_release: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["active", "archived"]>>;
    figma_access_token: z.ZodOptional<z.ZodString>;
    basecamp_account_id: z.ZodOptional<z.ZodString>;
    basecamp_project_id: z.ZodOptional<z.ZodString>;
    basecamp_todo_list_id: z.ZodOptional<z.ZodString>;
    basecamp_api_token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    site_url?: string | undefined;
    client_name?: string | undefined;
    is_woocommerce?: boolean | undefined;
    is_pre_release?: boolean | undefined;
    status?: "active" | "archived" | undefined;
    figma_access_token?: string | undefined;
    basecamp_account_id?: string | undefined;
    basecamp_project_id?: string | undefined;
    basecamp_todo_list_id?: string | undefined;
    basecamp_api_token?: string | undefined;
}, {
    name?: string | undefined;
    site_url?: string | undefined;
    client_name?: string | undefined;
    is_woocommerce?: boolean | undefined;
    is_pre_release?: boolean | undefined;
    status?: "active" | "archived" | undefined;
    figma_access_token?: string | undefined;
    basecamp_account_id?: string | undefined;
    basecamp_project_id?: string | undefined;
    basecamp_todo_list_id?: string | undefined;
    basecamp_api_token?: string | undefined;
}>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
//# sourceMappingURL=project.schema.d.ts.map