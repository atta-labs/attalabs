// Handlebars template for BlindCritic audit turns.
// {{conclusion}} contains the ConclusionSynthesizer's JSON output (structured via outputSchema).
// BlindCritic's system prompt (BLIND_CRITIC_PROMPT) handles JSON input — RULE 0 explicitly
// instructs it not to flag the JSON format itself.
export const auditMessageTemplate = `Principal's question: {{question}}

Conclusion to Review:
{{conclusion}}
`
