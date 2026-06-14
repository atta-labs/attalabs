// Shared parse contract for the Skeptical Auditor's JSON output.
// Bound to the auditor agent's system prompt at compileFlow time via {{schema}};
// also used by parseMatchReport's validation. Both sides must agree on this shape.

export const MATCH_REPORT_SCHEMA = `{
  "hard_requirements": [{ "requirement": string, "kind": "hard" | "soft", "met": boolean, "evidence": string }],
  "grade": "A" | "A-" | "B+" | "B" | "STRETCH" | "NO FIT",
  "recommendation": "Strong Fit" | "Good Fit" | "Borderline" | "Stretch" | "No Fit",
  "confidence_reasoning": string[],
  "signal": [{ "title": string, "observation": string, "interpretation": string, "confidence": "High" | "Medium" | "Low" }],
  "gaps": [{ "gap": string, "severity": "disqualifying" | "minor", "mitigation": string | null }],
  "interview_hooks": string[]
}`
