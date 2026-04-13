Vāda: User Cases & "Stupid Model" Optimization

Vāda is designed to extract "Pro" performance from "Basic" models. This manual documents the 5 primary test cases we are using to verify the engine's intelligence.

The "5 Cases" Test Suite

1. The Extreme Brevity Test ("5 Lines")

The Goal: Force the model to be concise and stop "yapping."

Why it's hard: LLMs naturally want to explain their reasoning at length.

Vāda Solution: The STANDARD_HORIZON in task-horizons.ts and the Blind Critic audit.

2. The Structural Challenge ("Pirate / Persona")

The Goal: Ensure the "Universal Anchor" can enforce tone across all agents.

Test Prompt: "Describe the future of AI as a 17th-century pirate."

What to look for: Does the Synthesizer stay in character in the final JSON?

3. The Logic Trap ("The Wrong Question")

The Goal: Use the Devil's Advocate to find flaws in the Principal's thinking without derailing the app.

Test Prompt: A question with a false premise (e.g., "How do we stop AI from stealing our souls?").

Expected Outcome: The Advocate challenges the premise, but the Synthesizer still produces a structured JSON conclusion.

4. The Complex Format ("JSON-in-JSON")

The Goal: Test the regex and parsing logic.

Test Prompt: "Provide your answer in bullet points."

Vāda Solution: The \n escaping rule we added to conclusion-prompts.ts ensures the bullet points don't crash the JSON.parse function.

5. The Conflict Resolution ("Unresolved Points")

The Goal: Verify the Synthesizer doesn't "lie" to create a fake consensus.

Test Prompt: A highly controversial topic (e.g., "Is AI sentient?").

Expected Outcome: The unresolved_points array in the JSON should be full, proving the Synthesizer is mapping the friction, not smoothing it over.

Optimization for "Free" Models

When using Llama 3 or similar models, keep these "Rules of the Road" in mind:

Always use the Anchor: Never remove the question parameter from composeSystemPrompt.

Use the Forgiving Audit: Ensure blind-critic.ts looks for the word "PASS" rather than an exact string match, as smaller models often add extra "Here is your result" filler.

TPD Management: Monitor your Tokens Per Day. High-round deliberations (3 rounds + Audit + Revision) consume roughly 10k-15k tokens per run.
