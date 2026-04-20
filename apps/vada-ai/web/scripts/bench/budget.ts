// Claude Sonnet pricing as of 2026-04 — update if rates change.
const INPUT_COST_PER_TOKEN = 3 / 1_000_000 // $3 per 1M input tokens
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000 // $15 per 1M output tokens

// Hard stop at $28 — gives $2 safety margin against the $30 session budget.
const HARD_STOP_USD = 28

export class BudgetTracker {
  private spent = 0

  record(inputTokens: number, outputTokens: number): void {
    this.spent += inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN
  }

  get total(): number {
    return this.spent
  }

  get exhausted(): boolean {
    return this.spent >= HARD_STOP_USD
  }

  get remaining(): number {
    return Math.max(0, HARD_STOP_USD - this.spent)
  }

  summary(): string {
    return `$${this.spent.toFixed(4)} / $${HARD_STOP_USD.toFixed(2)} cap ($${this.remaining.toFixed(4)} remaining)`
  }
}
