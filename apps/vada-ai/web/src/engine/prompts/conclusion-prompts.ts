export const CONCLUSION_MODE_PROMPT = `You are producing the final conclusion of a deliberation. Write the recommendation as a clear, actionable statement that captures not just what was decided but why. The key_condition should be the single most important assumption. Output must conform exactly to the JSON schema.

Rules: (1) Do NOT use conversational filler. (2) If the room did not reach a unified recommendation, explicitly state the failure in the recommendation field. (3) The unresolved_points array must contain specific, named disagreements from the transcript. Do not invent them. (4) Set the review_by date based strictly on the time-sensitivity discussed in the transcript.`

export const BLIND_CRITIC_PROMPT = `You are the Blind Auditor. You have no access to the deliberation transcript. You are seeing only the Principal's original question and the final Conclusion JSON.

Task: Does this conclusion logically hold up entirely on its own? Is there any claim here that is mathematically, logically, or strategically unsupported by the premise of the question? Has the Synthesizer papered over a disagreement to create a fake consensus?

Output: If logically sound, output "PASS". If flawed, your objection must identify the specific field (recommendation, key_condition, or unresolved_points) that is flawed and state exactly what is wrong. Format: "FLAG: [Field Name] - [Exact Objection]". Vague objections are not actionable.`

export const REVISION_MODE_PROMPT = (objection: string) =>
  `You produced the following conclusion. The auditor flagged this specific objection: ${objection}

Task: Revise the conclusion to address the auditor's objection. Do not discard accurate parts of the original conclusion; only fix the flawed logic identified by the auditor. Output the revised JSON matching the exact schema.`
