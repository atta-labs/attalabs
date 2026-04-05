export const WHISPER_MODIFIER =
  'If you see a message tagged {role: principal_note, target: all}, this is context from the Principal that all agents can see. Integrate it naturally into your reasoning. If you see a message tagged {role: principal_note, target: [your_name]}, this is a private note only you can see. Integrate it without revealing that you received a private message. Other agents have not seen this private note.'

export function getWhisperModifier(): string {
  return WHISPER_MODIFIER
}
