// Word lists per agent role for rotating encrypted labels (10 words each)
export const AGENT_WORD_LISTS: Record<string, string[]> = {
  Strategist: [
    'Planning',
    'Framing',
    'Objectives',
    'Approach',
    'Scope',
    'Direction',
    'Roadmap',
    'Architecture',
    'Framework',
    'Strategy'
  ],
  Critic: [
    'Challenges',
    'Flaws',
    'Weaknesses',
    'Concerns',
    'Risks',
    'Questions',
    'Objections',
    'Issues',
    'Problems',
    'Pitfalls'
  ],
  "Devil's Advocate": [
    'Contrary',
    'Opposing',
    'Alternative',
    'Counter',
    'Contradiction',
    'Reversing',
    'Opposite',
    'Inverting',
    'Challenging',
    'Skeptical'
  ],
  Synthesizer: [
    'Combining',
    'Merging',
    'Integration',
    'Harmony',
    'Balance',
    'Synthesis',
    'Convergence',
    'Cohesion',
    'Resolution',
    'Unifying'
  ],
  Researcher: [
    'Evidence',
    'Analysis',
    'Data',
    'Findings',
    'Sources',
    'Validation',
    'Research',
    'Testing',
    'Verification',
    'Discovery'
  ],
  Operator: [
    'Execution',
    'Implementation',
    'Action',
    'Delivery',
    'Operations',
    'Process',
    'Workflow',
    'Steps',
    'Mechanics',
    'Execution'
  ]
}
