// Handlebars template for all agent turns: rounds 0-2, terminal synthesis, and revision.
// Mirrors V1 Crucible's prompt construction:
//   - round 0 (falsy roundIndex): question only + round-1 modifier + universal anchor
//   - rounds 1-2 (truthy roundIndex): full prior-rounds transcript + round-N modifier + anchor
//   - isTerminal + !isRevision: buildSynthesizerUserPrompt equivalent
//   - isTerminal + isRevision: buildRevisionUserPrompt equivalent
export const roundMessageTemplate = `{{#if isTerminal}}
{{#if isRevision}}
The original question is: "{{question}}"

Participants in this deliberation: Strategist, Critic, Devil's Advocate, Synthesizer

Deliberation transcript:

{{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
{{this.content}}

---

{{/each}}{{/each}}
The Synthesizer's previous conclusion was audited and flagged. Here is what was produced:

{{lastOutputByAgent.ConclusionSynthesizer.content}}

The auditor's objection: {{auditOutputs.[0].content}}

---

CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. You MUST output valid JSON matching the conclusion schema. No markdown, no explanation, just the JSON object.

2. Regenerate the conclusion from the transcript above — do not simply patch the broken conclusion text. The transcript is ground truth. The previous conclusion may contain corruption or hallucination; trust the transcript, not the previous output.

3. The "recommendation" field MUST directly answer the Principal's question: "{{question}}"
   - If the objection says the recommendation "does not directly answer the question": rewrite it to START with "No," or "Yes," or "Not yet —" followed by the reasoning drawn from the transcript.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."

4. The "key_condition" field must state the single most important assumption, taken from the transcript.

5. The "unresolved_points" field must list specific disagreements from the transcript with the agents involved. Do not invent them. If the agents agreed on every substantive point, return an empty array.

GENERATE THE REVISED JSON NOW:
{{else}}
The original question is: "{{question}}"

Participants in this deliberation: Strategist, Critic, Devil's Advocate, Synthesizer

Deliberation transcript:

{{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
{{this.content}}

---

{{/each}}{{/each}}
CRITICAL INSTRUCTION — READ THIS BEFORE GENERATING:

1. You MUST output valid JSON matching the conclusion schema. No markdown, no explanation, just the JSON object.

2. The "recommendation" field MUST directly answer the Principal's question: "{{question}}"
   - If the question is "Should I...?", start with "No," or "Yes," or "Not yet —" followed by the reasoning.
   - Do NOT hedge. Do NOT say "it depends" or "further evaluation is needed."
   - The deliberation already happened. You are delivering the verdict, not asking more questions.

3. The "key_condition" field must state the single most important assumption.

4. The "unresolved_points" field must list specific disagreements from the transcript with the agents involved. Do not invent them.

5. Keep the "recommendation" field concise prose. No code blocks. No nested JSON. If the question asked for code, name the chosen approach in the recommendation — do not paste code into this field.

GENERATE THE JSON NOW:
{{/if}}
{{else}}
{{#if roundIndex}}
The following is the deliberation transcript so far:

{{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
{{this.content}}

---

{{/each}}{{/each}}
The original question is: {{question}}

You must read the transcript of the prior rounds. Address the friction generated in the room. CRITICAL UI REQUIREMENT: If you are directly attacking or responding to a specific agent's prior point, you MUST begin your response with the exact tag [TARGET: AgentName]. Example: [TARGET: Critic] You are assuming a frictionless market, but...

[CRITICAL REMINDER - THE PRINCIPAL'S EXACT QUESTION: "{{question}}"
Your current argument MUST directly serve this specific question and STRICTLY obey ANY constraints within it (whether formatting, length, tone, persona, or logic). Do not drift into the abstract.]
{{else}}
{{question}}

This is the first round. You are seeing this question for the first time. Respond ONLY to the Principal's prompt. Do not address or reference other agents, as they have not spoken yet.

[CRITICAL REMINDER - THE PRINCIPAL'S EXACT QUESTION: "{{question}}"
Your current argument MUST directly serve this specific question and STRICTLY obey ANY constraints within it (whether formatting, length, tone, persona, or logic). Do not drift into the abstract.]
{{/if}}
{{/if}}`
