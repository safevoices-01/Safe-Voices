import { z } from 'zod';

export const apiErrorSchema = z.object({
    error: z.string(),
    code: z.string().optional(),
});

export const createCaseResponseSchema = z.object({
    caseId: z.string(),
    secret: z.string(),
    secretShownOnce: z.literal(true).optional(),
});

export const verifyCaseAccessRequestSchema = z.object({
    caseId: z.string().min(1),
    secret: z.string().min(1),
});

export const verifyCaseAccessResponseSchema = z.object({
    ok: z.literal(true),
    caseId: z.string(),
    expiresAt: z.string(),
});

export const postCaseChatMessageRequestSchema = z.object({
    messages: z.array(z.unknown()),
    clientRequestId: z.string().optional(),
});

export const extractionPatchSchema = z.object({
    schemaVersion: z.number(),
    fields: z.record(z.string(), z.unknown()),
});

export const postCaseChatMessageResponseMetaSchema = z.object({
    extraction: extractionPatchSchema.optional(),
    crisisTriggered: z.boolean().optional(),
});

export const submitCaseResponseSchema = z.object({
    ok: z.literal(true),
    caseId: z.string(),
    submittedAt: z.string(),
});

export const uploadRequestSchema = z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
});

export const uploadResponseSchema = z.object({
    signedUrl: z.string(),
    publicUrl: z.string(),
});

export const uploadConfirmRequestSchema = z.object({
    publicUrl: z.string().url(),
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
});

export const uploadConfirmResponseSchema = z.object({
    ok: z.literal(true),
    attachmentId: z.string(),
    publicUrl: z.string(),
});

export const partnerOtpRequestSchema = z.object({
    email: z.string().email(),
});

export const partnerOtpVerifySchema = z.object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/),
});

export const partnerCaseStatusPatchSchema = z.object({
    status: z.enum([
        'UNDER_REVIEW',
        'RESOLVED',
        'CLOSED',
    ]),
});

export const partnerCasesListResponseSchema = z.object({
    cases: z.array(
        z.object({
            caseId: z.string(),
            caseStatus: z.string(),
            submittedAt: z.string().nullable(),
            riskLevel: z.string().nullable(),
            incidentCategory: z.string().nullable(),
            createdAt: z.string(),
        }),
    ),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type CreateCaseResponse = z.infer<typeof createCaseResponseSchema>;
export type VerifyCaseAccessRequest = z.infer<
    typeof verifyCaseAccessRequestSchema
>;
export type VerifyCaseAccessResponse = z.infer<
    typeof verifyCaseAccessResponseSchema
>;
export type SubmitCaseResponse = z.infer<typeof submitCaseResponseSchema>;
