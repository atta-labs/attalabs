import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadFlow } from '@atta/engine'
import { calculateCost } from './calculator'

const YAMLS_DIR = join(import.meta.dirname, '../../../yamls')

function loadYaml(id: string) {
  const yaml = readFileSync(join(YAMLS_DIR, `${id}.yaml`), 'utf-8')
  return loadFlow(yaml)
}

test('crucible costs more than vada-reviewers', () => {
  const crucible = calculateCost(loadYaml('crucible'), 'claude-sonnet-4-6')
  const reviewers = calculateCost(loadYaml('vada-reviewers'), 'claude-sonnet-4-6')
  expect(crucible.cost.low).toBeGreaterThan(reviewers.cost.low)
  expect(crucible.stepCount).toBeGreaterThan(reviewers.stepCount)
})

test('vada-reviewers-synthesis has more steps than vada-reviewers', () => {
  const withSynth = calculateCost(loadYaml('vada-reviewers-synthesis'), 'claude-sonnet-4-6')
  const withoutSynth = calculateCost(loadYaml('vada-reviewers'), 'claude-sonnet-4-6')
  expect(withSynth.stepCount).toBeGreaterThan(withoutSynth.stepCount)
})

test('cost is higher for opus than sonnet (same team)', () => {
  const spec = loadYaml('sparring')
  const sonnet = calculateCost(spec, 'claude-sonnet-4-6')
  const opus = calculateCost(spec, 'claude-opus-4-7')
  expect(opus.cost.low).toBeGreaterThan(sonnet.cost.low)
})

test('agentCount matches workflow shape for rounds spec', () => {
  const spec = loadYaml('sparring')
  const result = calculateCost(spec, 'claude-sonnet-4-6')
  // sparring has 2 agents per round
  expect(result.agentCount).toBe(2)
})

test('agentCount matches workflow shape for brokered spec', () => {
  const spec = loadYaml('vada-reviewers')
  const result = calculateCost(spec, 'claude-sonnet-4-6')
  // vada-reviewers has 3 reviewers, no synthesis
  expect(result.agentCount).toBe(3)
})
