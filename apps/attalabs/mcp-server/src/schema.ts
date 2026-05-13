import { z } from 'zod'

export const CompileInputSchema = z.object({
  yaml: z.string().min(1, 'yaml must be a non-empty string'),
  customVars: z.record(z.string()).optional()
})

export type CompileInput = z.infer<typeof CompileInputSchema>

export const RunInputSchema = z.object({
  yaml: z.string().min(1, 'yaml must be a non-empty string'),
  question: z.string().min(1, 'question must be a non-empty string'),
  customVars: z.record(z.string()).optional(),
  modelOverrides: z.record(z.string()).optional()
})

export type RunInput = z.infer<typeof RunInputSchema>

export const ListCatalogInputSchema = z.object({
  prefix: z.string().optional()
})

export type ListCatalogInput = z.infer<typeof ListCatalogInputSchema>
