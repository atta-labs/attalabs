const ROUND_1_MODIFIER = `This is Round 1. You are seeing this question for the first time. Respond ONLY to the Principal's prompt. Do not address or reference other agents, as they have not spoken yet.`

const ROUND_2_3_MODIFIER = (round: number) =>
  `This is Round ${round}. You must read the transcript of the prior rounds. Address the friction generated in the room. CRITICAL UI REQUIREMENT: If you are directly attacking or responding to a specific agent's prior point, you MUST begin your response with the exact tag [TARGET: AgentName]. Example: [TARGET: Critic] You are assuming a frictionless market, but...`

export function getRoundModifier(round: number): string {
  if (round === 1) return ROUND_1_MODIFIER
  return ROUND_2_3_MODIFIER(round)
}
