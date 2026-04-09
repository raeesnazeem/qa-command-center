import { z } from 'zod';
export declare const RunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "timed_out", "paused", "cancelled"]>;
export declare const CreateRunSchema: z.ZodObject<{
    project_id: z.ZodString;
    run_type: z.ZodEnum<["pre_release", "post_release"]>;
    site_url: z.ZodString;
    figma_url: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
    enabled_checks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    is_woocommerce: z.ZodDefault<z.ZodBoolean>;
    device_matrix: z.ZodDefault<z.ZodArray<z.ZodEnum<["desktop", "tablet", "mobile"]>, "many">>;
    selected_urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    site_url: string;
    is_woocommerce: boolean;
    project_id: string;
    run_type: "pre_release" | "post_release";
    enabled_checks: string[];
    device_matrix: ("desktop" | "tablet" | "mobile")[];
    figma_url?: string | null | undefined;
    selected_urls?: string[] | undefined;
}, {
    site_url: string;
    project_id: string;
    run_type: "pre_release" | "post_release";
    is_woocommerce?: boolean | undefined;
    figma_url?: string | null | undefined;
    enabled_checks?: string[] | undefined;
    device_matrix?: ("desktop" | "tablet" | "mobile")[] | undefined;
    selected_urls?: string[] | undefined;
}>;
export type CreateRunInput = z.infer<typeof CreateRunSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
//# sourceMappingURL=run.schema.d.ts.map