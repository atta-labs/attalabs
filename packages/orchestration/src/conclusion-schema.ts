import { z } from 'zod'

export const ConclusionSchema = z.object({
  recommendation: z.string(),
  key_condition: z.string(),
  unresolved_points: z.array(
    z.object({
      point: z.string(),
      agents_involved: z.array(z.string())
    })
  ),
  review_by: z.string(),
  participants: z.array(
    z.object({
      agent: z.string(),
      version: z.string()
    })
  )
})

export type Conclusion = z.infer<typeof ConclusionSchema>
