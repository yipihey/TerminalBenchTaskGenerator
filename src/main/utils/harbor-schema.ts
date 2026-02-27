import { z } from 'zod'

/**
 * Zod schema for task.toml validation.
 * Validates all Harbor task configuration fields.
 */

export const domainEnum = z.enum([
  'life-sciences',
  'physical-sciences',
  'earth-sciences'
])

export const difficultyEnum = z.enum(['easy', 'medium', 'hard', 'expert'])

export const taskSectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Task name is required')
    .max(200, 'Task name must be 200 characters or fewer'),
  description: z
    .string()
    .min(1, 'Task description is required')
    .max(5000, 'Task description must be 5000 characters or fewer'),
  domain: domainEnum,
  field: z.string().min(1, 'Field is required'),
  subfield: z.string().optional(),
  difficulty: difficultyEnum,
  tags: z.array(z.string()).optional(),
  canary_string: z
    .string()
    .regex(
      /^CANARY_[A-Z0-9_]+$/,
      'Canary string must match CANARY_[A-Z0-9_]+ pattern'
    )
    .optional()
})

export const environmentSectionSchema = z.object({
  base_image: z.string().optional().default('python:3.11-slim'),
  timeout_seconds: z
    .number()
    .int()
    .positive('Timeout must be a positive integer')
    .max(86400, 'Timeout cannot exceed 86400 seconds (24 hours)'),
  memory_limit_mb: z
    .number()
    .int()
    .positive('Memory limit must be a positive integer')
    .optional(),
  cpu_limit: z.number().positive('CPU limit must be positive').optional(),
  gpu: z.boolean().optional().default(false)
})

export const agentSectionSchema = z.object({
  model: z.string().optional(),
  max_tokens: z
    .number()
    .int()
    .positive('Max tokens must be a positive integer')
    .optional(),
  timeout_seconds: z
    .number()
    .int()
    .positive('Agent timeout must be a positive integer')
    .max(86400, 'Agent timeout cannot exceed 86400 seconds (24 hours)')
})

export const verifierSectionSchema = z.object({
  type: z.literal('script'),
  script: z
    .string()
    .min(1, 'Verifier script path is required')
})

export const harborTaskTomlSchema = z.object({
  task: taskSectionSchema,
  environment: environmentSectionSchema,
  agent: agentSectionSchema,
  verifier: verifierSectionSchema
})

export type HarborTaskTomlParsed = z.infer<typeof harborTaskTomlSchema>

/**
 * Validate a parsed TOML object against the Harbor task schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateHarborToml(data: unknown) {
  return harborTaskTomlSchema.safeParse(data)
}
