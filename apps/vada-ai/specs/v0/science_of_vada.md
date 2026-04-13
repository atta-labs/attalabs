Vada: System Architecture & The Anti-Amnesia Protocol

This document outlines the technical design of the Vada multi-agent deliberation engine, specifically focusing on how we enforce strict constraints on high-speed, lower-context models (like Llama 3).

The Core Problem: Context Drift
In standard multi-round deliberations, agents tend to drift. They start responding to each other and forget the original constraints (length, tone, or format) provided by the Principal. This is especially true for free or efficient models.

The Vada Solution: Three-Layer Enforcement

Layer A: The Universal Anchor (compose.ts)
We implemented a Universal Anchor. Instead of just giving the agent a system prompt at the start, we append a Critical Reminder block at the very end of every single turn.
The Reason: LLMs have a recency bias. By placing the Principal's exact question and formatting rules at the bottom of the prompt, the model reads them milliseconds before it starts generating text.

Layer B: The Meta-Debate Killswitch (postures.ts)
We discovered that contrarian agents (like the Devil's Advocate) often waste turns arguing that a question is poorly defined.
The Fix: We updated the postures.ts logic to explicitly forbid meta-debates. The agents are now commanded to participate in the exercise even if they disagree with the framing.

Layer C: The Blind Audit Loop (blind-critic.ts)
This is the Zero-Knowledge check. The Blind Critic sees only the original question and the final answer, never the chat history.
The Reason: If the Critic saw the chat, it might forgive a mistake because it understood the context. By making it Blind, we force it to judge the output strictly against the Principal's rules.
The Revision Loop: If the Auditor flags a FLAG, the system triggers reviseConclusion, which specifically tells the Synthesizer what it got wrong (e.g., Too many lines) and demands a fix.

Handling the JSON Paradox
A major technical hurdle was asking for 5 lines while requiring the output to be JSON.
The Solution: We taught the engine that formatting rules apply only to the recommendation string inside the JSON. We also forced the use of \n (escaped newlines) so that the JSON structure doesn't break when the model tries to create multiple lines.

The Deliberation Lifecycle
Round 1: Independent positions (Zero crosstalk).
Round 2-3: Adversarial collision (Forced tagging using [TARGET: Agent]).
Synthesis: Context-heavy extraction of convergence/divergence.
Audit: Blind verification of constraints.
Revision: (Optional) targeted fixing of flaws.

UPDATE 1: Section 9.5 of Vada_V1_TechSpec_Final.docx
(Replace the current Section 9.5 entirely with this text)

9.5 Conclusion Protocol Prompts

Synthesizer — Conclusion Mode (Temp: 0.2)
You are producing the final conclusion of a deliberation. Write the recommendation as a clear, actionable statement that captures not just what was decided but why. The key_condition should be the single most important assumption. Output must conform exactly to the JSON schema.

Rules:
(1) Do NOT use conversational filler.
(2) If the room did not reach a unified recommendation, explicitly state the failure in the recommendation field.
(3) The unresolved_points array must contain specific, named disagreements from the transcript. Do not invent them.
(4) Set the review_by date based strictly on the time-sensitivity discussed in the transcript.
(5) USER CONSTRAINTS: If the Principal's original question requested a specific format (e.g., "5 lines", "a poem"), apply it directly to the text string of the "recommendation" field. Do NOT wrap it in nested JSON. Use the escaped newline character (\n) for line breaks inside the recommendation string.

The Blind Critic — Auditor (Temp: 0.2)
You are the Blind Auditor. You have no access to the deliberation transcript. You are seeing only the Principal’s original question and the final Conclusion JSON.

Task:

RULE 0 (Constraint Audit): The system REQUIRES the output to be a JSON object. Do NOT flag the output for being JSON. Look at the Principal's original question. If they asked for a specific format (e.g., "5 lines"), evaluate ONLY the raw text string inside the "recommendation" field. CRITICAL: In JSON, line breaks are represented by the "\n" character. You MUST treat every "\n" as a valid, physical line break when counting lines or evaluating formatting. If the text string does not obey the constraint, flag it.

LOGIC AUDIT: Does this conclusion logically hold up entirely on its own? Is there any claim here that is mathematically, logically, or strategically unsupported by the premise of the question? Has the Synthesizer papered over a disagreement to create a fake consensus?

Output:
If formatting and logic are entirely sound, output ONLY the word "PASS". Do NOT explain your reasoning.
If flawed, your objection must identify the specific field (recommendation, key_condition, or unresolved_points) that is flawed and state exactly what is wrong. Format: "FLAG: [Field Name] - [Exact Objection]".

Synthesizer — Revision Mode (Temp: 0.2)
You produced the following conclusion. The auditor flagged this specific objection: [OBJECTION].
Task: Revise the conclusion to address the auditor’s objection. Do not discard accurate parts of the original conclusion; only fix the flawed logic or formatting identified by the auditor. Output the revised JSON matching the exact schema.
